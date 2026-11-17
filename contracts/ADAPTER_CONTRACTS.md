# ADAPTER_CONTRACTS.md — Contrats d'adaptateurs OPT

> **Statut :** Spécification implémentable directement.
> **Propriétaire :** Lead Backend / Intégration Partenaires
> **Dernière révision :** 2026-11-16
>
> Tous les adaptateurs suivent le même pattern : interface TypeScript stricte,
# DTOs normalisés internes, circuit breaker, retry exponentiel, cache Redis (TTL 1h),
> gestion d'erreur typée, audit trail sur chaque appel. Aucun appel API partenaire
> sans circuit breaker + retry + fallback.

---

## 1. Principes communs à tous les adaptateurs

### 1.1 Pattern d'implémentation

```typescript
abstract class BaseAdapter<Config, Credentials> {
  protected circuitBreaker: CircuitBreaker;
  protected retryPolicy: RetryPolicy;
  protected cache: RedisCache;
  protected auditLogger: AuditLogger;

  abstract connect(credentials: Credentials): Promise<ConnectionResult>;
  abstract healthCheck(): Promise<HealthResult>;

  // Template method : tous les appels passent par executeWithResilience
  protected async executeWithResilience<T>(
    operation: () => Promise<T>,
    context: AuditContext
  ): Promise<T> {
    // 1. Vérifier cache
    // 2. Circuit breaker (ouvert → échec rapide, fallback si configuré)
    // 3. Retry exponentiel (max 3 tentatives, backoff 1s/2s/4s)
    // 4. Log audit (entrée, sortie, durée, erreur)
    // 5. Mettre à jour cache si succès
  }
}
```

### 1.2 Codes d'erreur communs

| Code | Signification | Action client |
|------|---------------|---------------|
| `ADAPTER_AUTH_FAILED` | Authentification partenaire échouée | Rediriger utilisateur vers reconnexion OAuth |
| `ADAPTER_RATE_LIMITED` | Limite de débit partenaire atteinte | Attendre `retry_after`, retry |
| `ADAPTER_SERVICE_UNAVAILABLE` | Partenaire hors service | Activer fallback manuel, alerter |
| `ADAPTER_DATA_MALFORMED` | Données partenaire inutilisables | File humaine, alerter data team |
| `ADAPTER_TIMEOUT` | Timeout appel partenaire | Retry exponentiel, puis échec |
| `ADAPTER_PERMISSION_DENIED` | Scope OAuth insuffisant | Demander nouveaux scopes |
| `ADAPTER_ACCOUNT_CLOSED` | Compte clôturé côté partenaire | Marquer compte inactif, notifier utilisateur |
| `ADAPTER_UNKNOWN_ERROR` | Erreur non classée | Alerter, fallback manuel |

### 1.3 Circuit breaker (états)

```
Fermé (normal) → appel réussit → reste fermé
Fermé → N échecs consécutifs (seuil: 5) → Ouvert
Ouvert → échec immédiat pendant T (30s) → Half-ouvert après T
Half-ouvert → 1 succès → Fermé ; 1 échec → Ouvert (T recommence)
```

### 1.4 Audit trail sur chaque appel

Chaque appel adaptateur génère un `audit_event` :
- `event_type`: `adapter_call`
- `target_type`: `adapter`
- `target_id`: nom de l'adaptateur (ex: `powens`, `ibkr`)
- `event_data`: { operation, partner, duration_ms, success, error_code, request_id }
- Hash-chaining pour immutabilité

---

## 2. AggregatorAdapter — Agrégation de comptes bancaires (PSD2 AISP)

### 2.1 Interface TypeScript

```typescript
import { z } from 'zod';

// ============ DTOs internes (normalisés, indépendants du partenaire) ============

export interface BankAccountDTO {
  id: string;                    // ID interne OPT (généré)
  externalId: string;            // ID côté partenaire (référence pour re-sync)
  provider: 'powens' | 'budget_insight' | 'manual' | 'pdf';
  name: string;
  iban?: string;                 // chiffré applicative
  bic?: string;                  // chiffré
  currency: string;              // ISO 4217
  accountType: 'checking' | 'savings' | 'securities' | 'crypto' | 'other';
  balance: number;
  balanceDate: Date;
  isActive: boolean;
  lastSyncAt: Date;
  syncStatus: 'idle' | 'syncing' | 'error' | 'paused';
  lastError?: string;
  metadata: Record<string, unknown>; // extensions pays/actifs (JSONB)
}

export interface HoldingDTO {
  id: string;
  accountId: string;
  isin?: string;
  internalId?: string;           // si pas d'ISIN (non-coté)
  cfiCode?: string;              // ISO 20022 CFI
  assetClass: 'equity' | 'bond' | 'fund' | 'etf' | 'crypto' | 'real_estate' | 'private_equity' | 'other';
  quantity: number;
  currency: string;
  currentPrice?: number;
  currentPriceAt?: Date;
  costBasis?: number;
  taxType: 'ass_vie' | 'pea' | 'compte_ordinaire' | 'titre_nu' | 'assurance_vie_lux' | '401k' | 'ira' | 'isa' | 'pilier_3' | 'other';
  jurisdiction: string;          // ISO 3166-1 alpha-2
  metadata: Record<string, unknown>;
}

export interface TransactionDTO {
  id: string;
  accountId: string;
  holdingId?: string;
  transactionType: 'buy' | 'sell' | 'dividend' | 'interest' | 'fee' | 'deposit' | 'withdrawal' | 'transfer' | 'corporate_action';
  transactionDate: Date;
  settlementDate?: Date;
  quantity?: number;
  pricePerUnit?: number;
  grossAmount: number;           // devise du compte
  fees: number;
  taxWithheld: number;
  netAmount: number;
  currency: string;
  fxRate?: number;
  reference?: string;            // référence partenaire
  isReconciled: boolean;
  metadata: Record<string, unknown>;
}

export interface DocumentDTO {
  id: string;
  accountId: string;
  type: 'statement' | 'tax_form' | 'contract' | 'prospectus' | 'other';
  title: string;
  date: Date;
  url: string;                   // URL signée temporaire (stockage chiffré)
  mimeType: string;
  sizeBytes: number;
  checksum: string;              // SHA-256
  metadata: Record<string, unknown>;
}

export interface SyncResult {
  accountsSynced: number;
  holdingsSynced: number;
  transactionsSynced: number;
  documentsSynced: number;
  errors: SyncError[];
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
}

export interface SyncError {
  accountId?: string;
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
}

// ============ Interface de l'adaptateur ============

export interface AggregatorAdapterConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  webhookSecret: string;
  timeoutMs: number;
  maxRetries: number;
  cacheTtlSeconds: number;
}

export interface AggregatorAdapterCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  userId: string;                // ID utilisateur côté partenaire
}

export interface ConnectResult {
  success: boolean;
  authorizationUrl?: string;     // URL OAuth pour rediriger l'utilisateur
  credentials?: AggregatorAdapterCredentials;
  errorCode?: string;
  errorMessage?: string;
}

export interface HealthResult {
  healthy: boolean;
  latencyMs: number;
  errorCode?: string;
  timestamp: Date;
}

export interface AggregatorAdapter {
  // Cycle de vie
  connect(config: AggregatorAdapterConfig): Promise<ConnectResult>;
  handleOAuthCallback(code: string, state: string): Promise<AggregatorAdapterCredentials>;
  refreshCredentials(credentials: AggregatorAdapterCredentials): Promise<AggregatorAdapterCredentials>;
  revokeCredentials(credentials: AggregatorAdapterCredentials): Promise<void>;
  healthCheck(): Promise<HealthResult>;

  // Données
  fetchAccounts(credentials: AggregatorAdapterCredentials): Promise<BankAccountDTO[]>;
  fetchHoldings(accountId: string, credentials: AggregatorAdapterCredentials): Promise<HoldingDTO[]>;
  fetchTransactions(
    accountId: string,
    fromDate: Date,
    toDate: Date,
    credentials: AggregatorAdapterCredentials
  ): Promise<TransactionDTO[]>;
  fetchDocuments(accountId: string, credentials: AggregatorAdapterCredentials): Promise<DocumentDTO[]>;

  // Sync complète (orchestrée par le moteur de consolidation)
  syncAll(
    userId: string,
    credentials: AggregatorAdapterCredentials,
    options?: { fullHistory?: boolean; force?: boolean }
  ): Promise<SyncResult>;

  // Webhooks
  verifyWebhookSignature(payload: string, signature: string): Promise<boolean>;
  parseWebhookEvent(payload: string): Promise<WebhookEvent>;
}

export interface WebhookEvent {
  type: 'account_updated' | 'transaction_new' | 'consent_expired' | 'error';
  accountId?: string;
  data: Record<string, unknown>;
  timestamp: Date;
}
```

### 2.2 Implémentations prévues

| Adaptateur | Statut | Endpoint | Auth | Notes |
|------------|--------|----------|------|-------|
| `PowensAdapter` | Phase 1 | API Powens (PSD2 AISP) | OAuth 2.0 | Couverture FR/BE/LU |
| `BudgetInsightAdapter` | Phase 1 | API Budget Insight | OAuth 2.0 | Couverture FR |
| `ManualCSVAdapter` | Phase 1 | Import CSV utilisateur | N/A | Fallback manuel |
| `PDFParserAdapter` | Phase 1 | OCR + LLM extraction | N/A | Relevés PDF, score confiance |

### 2.3 SLA agrégateurs

| Indicateur | Cible | Mesure |
|------------|-------|--------|
| Disponibilité API partenaire | ≥ 99.5% | Mensuel |
| Latence P95 fetchAccounts | < 2s | Par appel |
| Taux de succès sync | ≥ 95% | Mensuel |
| Délai traitement webhook | < 5 min | 95% des événements |
| Fraîcheur données (liquides) | < 4h | Depuis dernière sync |

### 2.4 Gestion du consentement PSD2

- Consent utilisateur explicite avant chaque connexion (SCA strong customer authentication)
- Durée de consentement : 90 jours (re-consent obligatoire après)
- Révocation possible à tout moment par l'utilisateur
- Traçabilité complète (qui, quand, quel compte, quel consentement)

---

## 3. BrokerAdapter — Order routing et positions titres

### 3.1 Interface TypeScript

```typescript
export interface BrokerAccountDTO {
  id: string;
  externalId: string;
  provider: 'ibkr' | 'saxo' | 'swissquote';
  accountNumber: string;         // chiffré
  currency: string;
  balance: number;
  buyingPower: number;
  isActive: boolean;
  metadata: Record<string, unknown>;
}

export interface BrokerPositionDTO {
  id: string;
  accountId: string;
  symbol: string;
  isin?: string;
  quantity: number;
  averageCost: number;
  marketPrice: number;
  marketValue: number;
  unrealizedPL: number;
  currency: string;
  assetClass: string;
}

export interface BrokerOrderDTO {
  id: string;
  externalOrderId?: string;
  accountId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit' | 'stop';
  price?: number;
  currency: string;
  status: 'pending' | 'submitted' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected' | 'failed';
  filledQuantity: number;
  averageFillPrice?: number;
  fees: number;
  submittedAt?: Date;
  filledAt?: Date;
  metadata: Record<string, unknown>;
}

export interface OrderRoutingRequest {
  userId: string;
  accountId: string;
  broker: 'ibkr' | 'saxo' | 'swissquote';
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit';
  price?: number;
  currency: string;
  simulationId?: string;         // lien vers la simulation fiscale pré-exécution
  idempotencyKey: string;        // éviter les doubles soumissions
}

export interface OrderRoutingResult {
  success: boolean;
  orderId: string;
  externalOrderId?: string;
  status: BrokerOrderDTO['status'];
  estimatedFees: number;
  estimatedTaxImpact?: Record<string, number>; // par juridiction
  brokerAuthUrl?: string;        // si OAuth requis côté utilisateur
  errorCode?: string;
  errorMessage?: string;
}

export interface BrokerAdapterConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  environment: 'sandbox' | 'production';
  timeoutMs: number;
  maxRetries: number;
}

export interface BrokerAdapterCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  accountId: string;             // compte broker lié
}

export interface BrokerAdapter {
  connect(config: BrokerAdapterConfig): Promise<ConnectResult>;
  handleOAuthCallback(code: string, state: string): Promise<BrokerAdapterCredentials>;
  refreshCredentials(credentials: BrokerAdapterCredentials): Promise<BrokerAdapterCredentials>;
  revokeCredentials(credentials: BrokerAdapterCredentials): Promise<void>;
  healthCheck(): Promise<HealthResult>;

  // Comptes et positions
  fetchAccounts(credentials: BrokerAdapterCredentials): Promise<BrokerAccountDTO[]>;
  fetchPositions(accountId: string, credentials: BrokerAdapterCredentials): Promise<BrokerPositionDTO[]>;

  // Ordres (routing uniquement, nous ne détenons pas les fonds)
  placeOrder(request: OrderRoutingRequest, credentials: BrokerAdapterCredentials): Promise<OrderRoutingResult>;
  cancelOrder(orderId: string, credentials: BrokerAdapterCredentials): Promise<{ success: boolean; errorCode?: string }>;
  fetchOrderStatus(orderId: string, credentials: BrokerAdapterCredentials): Promise<BrokerOrderDTO>;
  fetchOrders(accountId: string, credentials: BrokerAdapterCredentials): Promise<BrokerOrderDTO[]>;

  // Webhooks d'exécution
  verifyWebhookSignature(payload: string, signature: string): Promise<boolean>;
  parseWebhookEvent(payload: string): Promise<ExecutionWebhookEvent>;
}

export interface ExecutionWebhookEvent {
  type: 'order_submitted' | 'order_filled' | 'order_partially_filled' | 'order_cancelled' | 'order_rejected';
  orderId: string;
  externalOrderId?: string;
  status: string;
  filledQuantity?: number;
  averageFillPrice?: number;
  timestamp: Date;
}
```

### 3.2 Règle d'or : nous ne touchons jamais aux fonds

```
┌─────────────┐     OAuth      ┌──────────────┐
│ Utilisateur │ ─────────────→ │  Interface   │
│  (OPT)      │                │  Broker      │
└─────────────┘                │  (IBKR,      │
                               │  Saxo, etc.) │
                               └──────┬───────┘
                                      │ ordre confirmé
                                      │ par l'utilisateur
                                      ▼
                               ┌──────▼───────┐
                               │   Broker     │
                               │  exécute     │
                               └──────┬───────┘
                                      │ webhook
                                      ▼
                               ┌──────▼───────┐
                               │   OPT        │
                               │ (réconciliation│
                               │  coût basis) │
                               └──────────────┘
```

- OPT ne stocke JAMAIS de clés API broker avec droits de retrait
- L'utilisateur confirme toujours l'ordre sur l'interface du broker
- OPT reçoit un webhook d'exécution et fait la réconciliation (broker = source de vérité)

### 3.3 Implémentations prévues

| Adaptateur | Statut | API | Auth | Notes |
|------------|--------|-----|------|-------|
| `IBKRAdapter` | Phase 6 | IBKR Client Portal API | OAuth 2.0 | Marchés mondiaux |
| `SaxoAdapter` | Phase 6 | Saxo OpenAPI | OAuth 2.0 | Europe |
| `SwissquoteAdapter` | Phase 6 | Swissquote API | OAuth 2.0 | CH |

### 3.4 SLA brokers

| Indicateur | Cible |
|------------|-------|
| Latence placeOrder P95 | < 1s |
| Taux de succès ordre | ≥ 99% |
| Délai webhook exécution | < 10 s |
| Réconciliation coût basis | < 5 min après fill |

---

## 4. KYCAdapter — Identité et LCB-FT

### 4.1 Interface TypeScript

```typescript
export interface KYCResult {
  userId: string;
  provider: 'sumsub' | 'complyadvantage';
  status: 'pending' | 'verified' | 'rejected' | 'expired' | 'manual_review';
  level: 'simplified' | 'standard' | 'enhanced'; // selon seuil 1k€/mois
  checks: KYCCheck[];
  riskScore: number; // 0-100
  riskFactors: string[];
  documentVerified: boolean;
  livenessVerified: boolean;
  sanctionScreening: 'clear' | 'hit' | 'pending';
  pepScreening: 'clear' | 'hit' | 'pending';
  adverseMedia: 'clear' | 'hit' | 'pending';
  expiresAt?: Date;
  metadata: Record<string, unknown>;
}

export interface KYCCheck {
  type: 'identity' | 'address' | 'sanction' | 'pep' | 'adverse_media' | 'tax_residency';
  status: 'passed' | 'failed' | 'pending' | 'manual_review';
  details: Record<string, unknown>;
  verifiedAt?: Date;
}

export interface KYCAdapterConfig {
  provider: 'sumsub' | 'complyadvantage';
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  webhookSecret: string;
  levelThresholds: { simplified: number; standard: number; enhanced: number }; // seuils en €/mois
}

export interface KYCAdapter {
  initiateVerification(userId: string, userData: KYCUserData): Promise<{ sessionId: string; verificationUrl: string }>;
  checkStatus(sessionId: string): Promise<KYCResult>;
  refreshVerification(userId: string): Promise<KYCResult>;
  handleWebhook(payload: string, signature: string): Promise<KYCWebhookEvent>;
}

export interface KYCUserData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth: Date;
  nationality: string;
  countryOfResidence: string;
  taxResidencies: string[]; // ISO country codes
}

export interface KYCWebhookEvent {
  type: 'verification_completed' | 'verification_failed' | 'document_expired' | 'risk_update';
  userId: string;
  status: KYCResult['status'];
  riskScore: number;
  timestamp: Date;
}
```

### 4.2 Seuils LCB-FT

| Type utilisateur | Seuil | Niveau KYC |
|------------------|-------|------------|
| B2C (particulier) | < 1 000 €/mois | Simplified (pièce d'identité + selfie) |
| B2C (particulier) | ≥ 1 000 €/mois | Standard (justificatif domicile + sanction screening) |
| B2B (conseiller) | Tous | Enhanced (PEP, adverse media, UBO) |

### 4.3 SLA KYC

| Indicateur | Cible |
|------------|-------|
| Temps vérification automatique | < 5 min (95%) |
| Taux passage automatique | ≥ 90% |
| Disponibilité API partenaire | ≥ 99.5% |

---

## 5. ReportingAdapter — Génération de rapports

### 5.1 Interface TypeScript

```typescript
export interface ReportTemplate {
  id: string;
  name: string;
  type: 'monthly' | 'quarterly' | 'annual' | 'tax_summary' | 'mifid_suitability' | 'custom';
  format: 'pdf' | 'excel' | 'json' | 'csv';
  templateId: string;            // Référence Typst/LaTeX
  whiteLabel: boolean;
  locales: string[];             // fr, en, de, it, es, pt, ar, zh
}

export interface ReportRequest {
  userId: string;
  organizationId?: string;
  templateId: string;
  parameters: Record<string, unknown>; // dates, portfolio scope, etc.
  locale: string;
  delivery: 'download' | 'email' | 'webhook';
  emailTo?: string;
}

export interface ReportResult {
  reportId: string;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  downloadUrl?: string;          // URL signée, expire après 24h
  fileSizeBytes?: number;
  checksum: string;
  generatedAt: Date;
  expiresAt: Date;
  errorCode?: string;
  errorMessage?: string;
}

export interface ReportingAdapterConfig {
  templateEngine: 'typst' | 'latex';
  storageBucket: string;         // stockage chiffré, URL signée
  emailProvider: 'resend' | 'sendgrid' | 'ses';
  retentionDays: number;         // 7 ans minimum (obligation réglementaire)
}

export interface ReportingAdapter {
  generateReport(request: ReportRequest): Promise<ReportResult>;
  getReportStatus(reportId: string): Promise<ReportResult>;
  listTemplates(locale?: string): Promise<ReportTemplate[]>;
  scheduleRecurringReport(request: ReportRequest, cronExpression: string): Promise<{ scheduleId: string }>;
  cancelRecurringReport(scheduleId: string): Promise<void>;
}
```

### 5.2 Types de rapports

| Rapport | Fréquence | Public | Contenu |
|---------|-----------|--------|---------|
| Mensuel (auto) | Mensuel | B2C | Synthèse patrimoine, allocation, performance, alertes |
| Trimestriel | Trimestriel | B2C + B2B | Détail par compte, impact fiscal estimé, drift allocation |
| Annuel fiscal | Annuel | B2C + B2B | IFU (FR), 1099 (US), DA-1 (CH), récapitulatif PV/plus-values |
| Note de synthèse simulation | À la demande | Utilisateur + expert | Trace complète règles fiscales, sources, incertitudes |
| MIFID suitability | À la demande | Conseiller | Knowledge client, adéquation, lettre de mission |
| PRIIPs KID | À la demande | Conseiller | Document d'informations clés (si applicable) |

### 5.3 SLA reporting

| Indicateur | Cible |
|------------|-------|
| Génération PDF mensuel | < 30 s (async, queue) |
| Génération rapport fiscal annuel | < 2 min |
| Disponibilité téléchargement | ≥ 99.9% |
| Conservation rapports | 7 ans |

---

## 6. DocumentAdapter — Parseur PDF/OCR

### 6.1 Interface TypeScript

```typescript
export interface DocumentExtractionResult {
  documentId: string;
  sourceFileUrl: string;
  documentType: 'bank_statement' | 'tax_form' | 'broker_statement' | 'property_deed' | 'other';
  confidenceScore: number; // 0-100, seuil 95 pour auto-validation
  extractedFields: ExtractedField[];
  lineItems: LineItem[];     // transactions relevées
  requiresHumanReview: boolean;
  reviewReason?: string;
  processingTimeMs: number;
  metadata: Record<string, unknown>;
}

export interface ExtractedField {
  name: string;
  value: string | number | Date;
  confidence: number;        // 0-100
  boundingBox?: { x: number; y: number; w: number; h: number }; // position dans le document
  source: 'regex' | 'llm' | 'hybrid';
  validated: boolean;
}

export interface LineItem {
  date: Date;
  description: string;
  amount: number;
  currency: string;
  type: 'debit' | 'credit' | 'fee' | 'interest' | 'dividend';
  confidence: number;
}

export interface DocumentAdapterConfig {
  ocrEngine: 'tesseract' | 'paddleocr';
  llmModel: string;          // fine-tuned Llama/Phi
  llmApiKey: string;
  llmBaseUrl: string;
  confidenceThreshold: number; // 95 par défaut
  humanReviewQueue: string;  // Label Studio ou équivalent
}

export interface DocumentAdapter {
  uploadDocument(file: Buffer, mimeType: string, userId: string): Promise<{ documentId: string }>;
  extract(documentId: string): Promise<DocumentExtractionResult>;
  validateExtraction(documentId: string, corrections: ExtractedField[]): Promise<void>;
  getExtractionStatus(documentId: string): Promise<{ status: 'pending' | 'processing' | 'completed' | 'failed' | 'human_review' }>;
  getConfidenceMetrics(): Promise<{ autoValidationRate: number; averageConfidence: number; documentsProcessed: number }>;
}
```

### 6.2 Pipeline OCR/LLM

```
PDF/Relevé bancaire
  → OCR (Tesseract/PaddleOCR) → texte brut
  → Layout analysis (détection tableaux, en-têtes, montants)
  → LLM extraction (fine-tuned sur 10k relevés) → champs + lignes
  → Validation croisée (regex par banque connue + LLM)
  → Score de confiance
  → Si < 0.95 → file humaine (Label Studio)
  → Apprentissage continu (fine-tuning itératif)
```

### 6.3 SLA document

| Indicateur | Cible |
|------------|-------|
| Taux auto-validation | ≥ 80% (après 1000 docs) |
| Confiance moyenne | ≥ 95% sur les validés auto |
| Temps traitement | < 2 min par document |
| Taux hallucination LLM | < 1% (montants) |

---

## 7. Gestion des dépendances uniques (interdite sans alternative)

Chaque catégorie de partenaire doit avoir ≥ 2 fournisseurs référencés :

| Catégorie | Fournisseur 1 | Fournisseur 2 | Fallback manuel |
|-----------|--------------|---------------|-----------------|
| Agrégation bancaire | Powens | Budget Insight | Import CSV + PDF |
| Broker execution | IBKR | Saxo | Swissquote (phase 2) |
| KYC/AML | Sumsub | ComplyAdvantage | Revue manuelle |
| Reporting | Typst/LaTeX (interne) | — | PDF généré côté serveur |
| Chiffrement/clés | Vault + HSM | — | Mode confort (serveur de confiance, opt-in) |
| Facturation | Stripe | — | Facturation manuelle (transitoire) |

---

## 8. Auto-audit de ce contrat

- [x] Interface TypeScript pour chaque type d'adaptateur (Aggregator, Broker, KYC, Reporting, Document)
- [x] DTOs normalisés internes (découplés des partenaires)
- [x] Codes d'erreur typés et documentés
- [x] Circuit breaker + retry + fallback spécifiés
- [x] SLA par catégorie de partenaire
- [x] Audit trail sur chaque appel
- [x] Règle "pas de custody" pour les brokers
- [x] Multi-sourcing documenté (≥ 2 fournisseurs par catégorie)
- [x] Consentement PSD2 spécifié
- [x] Seuils LCB-FT spécifiés

**Prochaine étape :** DEV_PLAN.md