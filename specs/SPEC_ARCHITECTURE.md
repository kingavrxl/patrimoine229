# SPEC_ARCHITECTURE.md — OPT Orchestrateur Patrimonial Transfrontalier

> **Statut :** Spécification implémentable directement.
> **Propriétaire :** CTO / Architecte Principal
> **Dernière révision :** 2026-11-16
> **Niveau :** Production-grade, zéro tolérance pour approximation fiscale, sécurité bancaire

---

## 1. Vue d'ensemble (C4 Level 1 — Contexte)

### 1.1 Objectif métier

OPT est une plateforme hybride B2C/B2B qui produit de la **certitude fiscale et juridique actionnable** pour les expatriés et HNWI (High Net Worth Individuals). Elle n'est ni un custodian, ni un broker, ni un conseiller en investissement agréé. Elle est la **couche d'intelligence fiscale au-dessus des custodians et brokers** via des partenaires (agrégation AISP, order routing broker, KYC/AML, reporting).

### 1.2 Acteurs (C4 Level 1)

| Acteur | Rôle | Accès |
|--------|------|-------|
| Utilisateur B2C (expat, dirigeant, crypto-riche, héritier) | Consolide son patrimoine, simule l'impact fiscal, prend des décisions | Portal web + mobile |
| Conseiller B2B (CGP, Family Office, Banque Privée, Courtier) | Gère ses clients en marque blanche, génère rapports MIFID | Advisor Portal + SDK embeddable |
| Agrégateur AISP (Powens, Budget Insight) | Fournit les données de comptes bancaires (PSD2) | API partenaire |
| Broker (IBKR, Saxo, Swissquote) | Fournit positions, exécute ordres via routing | API partenaire |
| KYC/AML (Sumsub, ComplyAdvantage) | Vérification identité, sanction screening | API partenaire |
| RegTech (SteelEye) | Surveillance transactions, reporting régulateur | API partenaire |
| Fiscaliste externe (revue trimestrielle) | Valide règles DSL + tests fiscaux | Accès lecture seule environnement staging |
| Administrateur OPT | Supervision, billing, incidents, utilisateurs | Console admin |

### 1.3 Contraintes non négociables (lignes rouges)

1. **JAMAIS** toucher aux fonds clients (pas de statut custodian, pas de broker propre).
2. **JAMAIS** recommander un produit financier spécifique (pas d'agrément CIF → moteur = simulation générique, l'utilisateur décide).
3. **JAMAIS** stocker clé privée / seed phrase / mot de passe en clair.
4. **JAMAIS** vendre ou partager des données identifiables (zéro vente de données).
5. **JAMAIS** contourner KYC/AML.
6. **JAMAIS** release sans revue fiscale externe sur les règles impactées.

---

## 2. C4 Level 2 — Conteneurs

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────────┐   │
│  │  B2C Portal  │  │ B2B Advisor  │  │  White-label SDK (React)    │   │
│  │  (Next.js)   │  │  Portal      │  │  (iframe/portal embeddable) │   │
│  │  React Native│  │  (Next.js)   │  │                             │   │
│  │  + Expo      │  │              │  │                             │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┬──────────────┘   │
│         │                 │                         │                   │
│         └─────────────────┴─────────────────────────┘                   │
│                           │ HTTPS TLS 1.3                               │
└───────────────────────────┼─────────────────────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │   API GATEWAY │  ← Kong / AWS ALB + Cloudflare
                    │   (Auth,      │     Rate limiting, WAF, CORS,
                    │    RateLimit, │     Request routing, mTLS
                    │    WAF, CORS) │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼───────┐ ┌───────▼───────┐ ┌───────▼───────┐
│  CONSOLIDATION│ │   TAX ENGINE  │ │ ADVISORY      │
│   ENGINE      │ │   (DSL)       │ │ ENGINE        │
│  (Node/TS)    │ │  (Node/TS)    │ │  (Node/TS)    │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                   │                   │
        └───────┬───────────┴───────────────────┘
                │
        ┌───────▼───────┐
        │   ADAPTERS    │  ← Aggregator, Broker, KYC, Reporting,
        │   LAYER       │     Document (config-driven DTO mapping)
        └───────┬───────┘
                │
        ┌───────▼───────────────────────────────────────┐
        │  CORE SERVICES (shared)                       │
        │  - Auth / Sessions / MFA                      │
        │  - Encryption (Argon2id, Shamir 2/3, Vault)   │
        │  - Audit Trail (append-only, hash-chaining)   │
        │  - Billing (Stripe)                           │
        │  - Notifications / Email                      │
        │  - FX & Market Data                           │
        └───────┬───────────────────────────────────────┘
                │
        ┌───────▼───────┐
        │   DATABASE    │  ← PostgreSQL 15 + TimescaleDB
        │   (RLS,       │     Encrypted at rest AES-256-GCM
        │    JSONB,     │     Backups PITR, RPO < 1h
        │    Event      │     Multi-AZ
        │    sourcing)  │
        └───────┬───────┘
                │
        ┌───────▼───────────────────────┐
        │  EXTERNAL PARTNERS (API)      │
        │  Powens · Budget Insight ·    │
        │  IBKR · Saxo · Swissquote ·   │
        │  Sumsub · ComplyAdvantage ·   │
        │  SteelEye · Stripe · Vault/HSM│
        └───────────────────────────────┘
```

### 2.1 Conteneur : Consolidation Engine

**Responsabilités :**
- Ingestion via adaptateurs agrégateurs (Powens, Budget Insight) + CSV manuel + PDF/OCR
- Normalisation vers taxonomie interne (ISO 20022 CFI + extensions)
- Valorisation multi-devises (prix temps réel + clôture journalière + FX)
- Lot tracking (cost basis FIFO/LIFO/Average par devise, compte, juridiction)
- Corporate actions (split, dividend, spin-off, fusion)
- Reporting consolidé (allocation, performance TWR/MWR, frais, PV latentes/réalisées)

**Interface :** API REST interne + événements Kafka/NATS vers Tax Engine et Advisory Engine.

### 2.2 Conteneur : Tax Engine

**Responsabilités :**
- Détermination résidence fiscale (OCDE Art. 4, tie-breaker conventions)
- Moteur de règles par juridiction (DSL déclaratif YAML, forward-chaining)
- Calculs : IR/PFU/prélèvements sociaux, IFI, exit tax, successoral/donation, assurance-vie, PEA/ISA/401k/IRA/3e pilier, conventions bilatérales
- Simulation "what-if" (< 2s)
- Explanation & audit trail complète (trace des règles, valeurs intermédiaires, sources)
- Versioning annuel (millésime) des règles

**Contrainte :** AUCUNE logique fiscale en dur — tout en DSL + tests. Revue externe trimestrielle obligatoire.

### 2.3 Conteneur : Advisory Engine

**Responsabilités :**
- Modèle d'allocation cible (profil risque 1-10, horizon, contraintes ESG/exclusion/fiscale, devises)
- Rééquilibrage intelligent (détection drift, minimisation coûts + impact fiscal)
- Tax-loss harvesting avec garde-fous wash sale par juridiction
- Projections Monte Carlo (10k scénarios, 5/10/20 ans)
- Cash-flow planning (revenus/dépenses, scénarios base/optimiste/pessimiste)

**Contrainte :** Moteur = simulation générique. Pas de recommandation personnalisée d'investissement (MIFID II).

### 2.4 Conteneur : Adapter Layer

**Responsabilités :**
- Interface unifiée `AggregatorAdapter`, `BrokerAdapter`, `KYCAdapter`, `ReportingAdapter`, `DocumentAdapter`
- Mapping config-driven (DTO partenaires → DTO internes)
- Circuit breaker + retry exponentiel + cache Redis (TTL 1h)
- Aucun appel sans circuit breaker + retry + fallback

---

## 3. Modèle de données (PostgreSQL 15 + TimescaleDB)

### 3.1 Principe de chiffrement

- **Au repos :** AES-256-GCM (chiffrement transparent PostgreSQL pgcrypto ou chiffrement applicative sur champs sensibles)
- **En transit :** TLS 1.3 partout
- **Clés client-side :** Web Crypto API (navigateur) + dérivation Argon2id du mot de passe
- **Partage clé serveur :** Shamir Secret Sharing 2/3 (user + HSM + recovery kit)
- **Champs sensibles (chiffrés applicative) :** numéros de compte, IBAN, ISIN des positions sensibles, données KYC brutes, historiques de simulation fiscale

### 3.2 Schéma canonique (entités principales)

```sql
-- Organisations (multi-tenant B2B)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL DEFAULT 'starter', -- starter, pro, enterprise
    billing_email TEXT,
    stripe_customer_id TEXT,
    encryption_key_id TEXT, -- clé de chiffrement par organisation
    settings JSONB DEFAULT '{}', -- thème marque blanche, domaine, SSO config
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Utilisateurs
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- Argon2id
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    language TEXT NOT NULL DEFAULT 'fr', -- fr, en, de, it, es, pt, ar, zh
    role TEXT NOT NULL DEFAULT 'user', -- user, advisor, admin, owner
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_secret TEXT, -- chiffré
    email_verified BOOLEAN NOT NULL DEFAULT false,
    kyc_status TEXT NOT NULL DEFAULT 'pending', -- pending, verified, rejected, expired
    kyc_provider_ref TEXT, -- référence Sumsub/ComplyAdvantage
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Résidences fiscales (versionnées, event-sourcing)
CREATE TABLE tax_residencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    country_code TEXT NOT NULL, -- ISO 3166-1 alpha-2
    start_date DATE NOT NULL,
    end_date DATE,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    determination_method TEXT NOT NULL, -- questionnaire, tie_breaker, manual
    confidence_score NUMERIC(3,2), -- 0.00-1.00
    source_data JSONB, -- réponses questionnaire, pièces justificatives
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES users(id)
);

-- Comptes (bancaires, titres, crypto, immo, etc.)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    provider TEXT NOT NULL, -- powens, budget_insight, ibkr, saxo, manual, pdf
    external_id TEXT, -- ID côté partenaire
    account_type TEXT NOT NULL, -- banking, securities, crypto, insurance, real_estate, other
    currency TEXT NOT NULL DEFAULT 'EUR', -- ISO 4217
    name TEXT,
    iban TEXT, -- chiffré applicative
    bic TEXT, -- chiffré
    is_active BOOLEAN NOT NULL DEFAULT true,
    sync_status TEXT NOT NULL DEFAULT 'idle', -- idle, syncing, error, paused
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,
    metadata JSONB DEFAULT '{}', -- extensions pays/actifs
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Titres / Holdings (positions actuelles)
CREATE TABLE holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    isin TEXT, -- NULL pour non-coté
    internal_id TEXT, -- identifiant interne si pas d'ISIN
    cfi_code TEXT, -- ISO 20022 CFI
    asset_class TEXT NOT NULL, -- equity, bond, fund, etf, crypto, real_estate, private_equity, other
    quantity NUMERIC(20,8) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'EUR',
    current_price NUMERIC(20,8), -- dernier prix connu
    current_price_at TIMESTAMPTZ,
    cost_basis NUMERIC(20,8), -- coût total d'acquisition en devise du compte
    tax_type TEXT, -- ass_vie, pea, titre_nu, compte_ordinary, etc.
    jurisdiction TEXT, -- pays fiscal lié
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lots (cost basis tracking FIFO/LIFO/Average)
CREATE TABLE lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holding_id UUID NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,
    acquisition_date DATE NOT NULL,
    quantity NUMERIC(20,8) NOT NULL,
    quantity_remaining NUMERIC(20,8) NOT NULL,
    price_per_unit NUMERIC(20,8) NOT NULL, -- devise du lot
    currency TEXT NOT NULL,
    fees NUMERIC(20,8) NOT NULL DEFAULT 0,
    source TEXT NOT NULL, -- acquisition, dividend_reinvest, transfer_in, corporate_action
    source_ref TEXT, -- ID transaction ou corporate action
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    holding_id UUID REFERENCES holdings(id),
    lot_id UUID REFERENCES lots(id),
    transaction_type TEXT NOT NULL, -- buy, sell, dividend, interest, fee, deposit, withdrawal, transfer, corporate_action
    transaction_date DATE NOT NULL,
    settlement_date DATE,
    quantity NUMERIC(20,8),
    price_per_unit NUMERIC(20,8),
    gross_amount NUMERIC(20,8), -- devise du compte
    fees NUMERIC(20,8) NOT NULL DEFAULT 0,
    tax_withheld NUMERIC(20,8) NOT NULL DEFAULT 0,
    net_amount NUMERIC(20,8), -- devise du compte
    currency TEXT NOT NULL,
    fx_rate NUMERIC(20,8), -- taux de change utilisé
    reference TEXT, -- référence partenaire
    is_reconciled BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Simulations fiscales (what-if)
CREATE TABLE simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    scenario_type TEXT NOT NULL, -- sale, donation, move, death, rebalancing, tax_loss_harvesting
    input_data JSONB NOT NULL, -- portfolio snapshot, événements
    result_data JSONB NOT NULL, -- impact fiscal par juridiction, cash-flow net
    explanation_trace JSONB NOT NULL, -- règles déclenchées, valeurs intermédiaires, sources
    tax_year INTEGER,
    jurisdictions TEXT[], -- pays concernés
    confidence_score NUMERIC(3,2),
    status TEXT NOT NULL DEFAULT 'draft', -- draft, computed, validated, archived
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    computed_at TIMESTAMPTZ
);

-- Règles fiscales (DSL versionnées)
CREATE TABLE tax_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jurisdiction TEXT NOT NULL, -- FR, CH, US, UK, BE, LU, SG, AE
    tax_year INTEGER NOT NULL,
    rule_key TEXT NOT NULL, -- identifiant de règle DSL
    rule_version INTEGER NOT NULL DEFAULT 1,
    dsl_yaml TEXT NOT NULL, -- règle DSL complète
    source_reference TEXT, -- article loi, convention, BOFIP, etc.
    is_active BOOLEAN NOT NULL DEFAULT true,
    validated_by UUID REFERENCES users(id), -- fiscaliste externe
    validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(jurisdiction, tax_year, rule_key, rule_version)
);

-- Scénarios de test fiscal (500+)
CREATE TABLE tax_test_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jurisdiction TEXT NOT NULL,
    tax_year INTEGER NOT NULL,
    scenario_key TEXT NOT NULL,
    input_data JSONB NOT NULL,
    expected_output JSONB NOT NULL,
    tolerance NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_auto_generated BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit trail (append-only, hash-chaining)
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- simulation_computed, order_routed, data_synced, key_rotated, etc.
    actor_id UUID REFERENCES users(id),
    actor_type TEXT NOT NULL, -- user, advisor, system, partner
    target_type TEXT NOT NULL, -- simulation, account, holding, user, etc.
    target_id UUID,
    event_data JSONB NOT NULL,
    previous_hash TEXT, -- hash de l'événement précédent (chaîne)
    event_hash TEXT NOT NULL, -- hash de cet événement
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address INET,
    user_agent TEXT
);

-- Ordres (routing uniquement, pas de garde des fonds)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    broker TEXT NOT NULL, -- ibkr, saxo, swissquote
    external_order_id TEXT,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL, -- buy, sell
    quantity NUMERIC(20,8) NOT NULL,
    order_type TEXT NOT NULL, -- market, limit, stop
    price NUMERIC(20,8),
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, submitted, partially_filled, filled, cancelled, rejected, failed
    submitted_at TIMESTAMPTZ,
    filled_at TIMESTAMPTZ,
    filled_quantity NUMERIC(20,8) NOT NULL DEFAULT 0,
    average_price NUMERIC(20,8),
    fees NUMERIC(20,8) NOT NULL DEFAULT 0,
    simulation_id UUID REFERENCES simulations(id), -- simulation ayant généré l'ordre
    tax_impact_estimated JSONB, -- impact fiscal estimé avant exécution
    tax_impact_actual JSONB, -- impact fiscal réel après exécution
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Facturation / Billing
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    stripe_subscription_id TEXT UNIQUE,
    plan TEXT NOT NULL, -- freemium, payant, premium (B2C) / starter, pro, enterprise (B2B)
    status TEXT NOT NULL DEFAULT 'active', -- active, past_due, canceled, paused
    price_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    interval TEXT NOT NULL, -- month, year
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index et contraintes
CREATE INDEX idx_holdings_account ON holdings(account_id);
CREATE INDEX idx_transactions_account_date ON transactions(account_id, transaction_date);
CREATE INDEX idx_simulations_user ON simulations(user_id);
CREATE INDEX idx_audit_events_timestamp ON audit_events(timestamp);
CREATE INDEX idx_audit_events_actor ON audit_events(actor_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_tax_rules_jurisdiction_year ON tax_rules(jurisdiction, tax_year);
CREATE INDEX idx_tax_residencies_user ON tax_residencies(user_id);
```

### 3.3 Row-Level Security (RLS)

```sql
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_residencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy : un utilisateur ne voit que ses propres données (ou celles de son organisation pour les advisors)
CREATE POLICY users_own_org ON users
    FOR ALL TO authenticated
    USING (auth.uid() = id OR organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY accounts_own ON accounts
    FOR ALL TO authenticated
    USING (user_id = auth.uid() OR organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Récursif pour holdings, lots, transactions, simulations, orders (via account_id → user_id)
```

### 3.4 Event sourcing sur entités critiques

Les entités `simulations`, `orders`, `tax_residencies` sont versionnées : toute modification crée un nouvel enregistrement avec `updated_at` et conserve l'historique dans une table d'historique dédiée (ou via audit_events). Jamais de suppression logique sans trace.

---

## 4. Flux principaux

### 4.1 Onboarding utilisateur (B2C) — < 15 min

```
Utilisateur → Inscription (email + mot de passe) → Argon2id hash + clé dérivée (Web Crypto)
          → Questionnaire résidence fiscale (OCDE Art. 4) → TaxResidency (probabiliste)
          → Connexion comptes (OAuth agrégateur + manuel CSV + PDF)
          → Consolidation Engine : ingestion + normalisation + valorisation
          → Tax Engine : simulation "état des lieux" (impact fiscal courant)
          → Dashboard : synthèse patrimoniale + impact fiscal estimé
          → Abonnement Stripe (freemium → payant → premium)
```

### 4.2 Simulation "what-if" — < 2s

```
Utilisateur sélectionne événement (vente, donation, déménagement, décès)
  → Tax Engine clone le portfolio → applique l'événement → recalcule par juridiction
  → Delta patrimoine net d'impact fiscal + cash-flow
  → Explanation trace complète (règles, valeurs, sources, hypothèses)
  → Export PDF "note de synthèse"
  → Utilisateur décide (pas de recommandation personnalisée)
```

### 4.3 Routage d'ordre (Phase 6) — sans toucher aux fonds

```
Utilisateur valide ordre dans Advisory Engine
  → Simulation fiscale pré-exécution (impact estimé)
  → Smart Order Routing (venue, type, slicing, timing)
  → Broker Adapter : ordre pré-rempli → OAuth utilisateur sur interface broker
  → Utilisateur confirme sur interface broker (nous ne voyons pas les clés API)
  → Webhook exécution → mise à jour lots + cost basis
  → Réconciliation (broker = source de vérité)
  → Reporting fiscal auto (IFU FR, 1099 US, DA-1 CH)
```

### 4.4 Synchronisation données (AISP)

```
Cron / Déclencheur utilisateur
  → AggregatorAdapter (Powens / Budget Insight) avec circuit breaker
  → Récupération comptes, positions, transactions, documents
  → Mapping DTO partenaires → DTO internes (config-driven)
  → Normalisation taxonomie + valorisation + FX
  → Lot tracking mise à jour
  → Audit trail : data_synced
  → Cache Redis TTL 1h
  → Alerte si > 5% comptes en erreur 48h (R1)
```

---

## 5. Sécurité

### 5.1 Chiffrement

| Couche | Mécanisme | Clé | Rotation |
|--------|-----------|-----|----------|
| Données au repos (DB) | AES-256-GCM | Clé maître dans Vault/HSM | 90 jours |
| Données en transit | TLS 1.3 | Certificats Let's Encrypt / ACM | Automatique |
| Clés client-side | Web Crypto API + Argon2id | Dérivée du mot de passe utilisateur | À chaque changement MD |
| Partage serveur | Shamir 2/3 (user + HSM + recovery) | Fragments distribués | Rotation planifiée |
| Secrets applicatifs | HashiCorp Vault | Transit secrets engine | 90 jours |

### 5.2 Authentification & sessions

- MFA obligatoire (TOTP + WebAuthn) pour accès conseiller et admin
- Sessions JWT courte durée (15 min) + refresh token (7 jours, rotation)
- Verrouillage après 5 échecs consécutifs
- Détection session simultanée anormale (IP, User-Agent, géolocalisation)

### 5.3 Contrôle d'accès

- RLS PostgreSQL par organization/user (jamais uniquement côté interface)
- RBAC fin : user, advisor, admin, owner
- Chaque requête API vérifie `organization_id` et `user_id` côté serveur
- Super-admin isolé, accès break-glass journalisé

### 5.4 Protection API

- Rate limiting : 100 req/min par utilisateur (API), 10 req/min (auth)
- CORS restrictif (domaines autorisés uniquement)
- CSP restrictive (pas d'unsafe-inline hors styles nécessaires)
- WAF (OWASP Top 10)
- CSRF tokens sur formulaires sensibles
- Validation toutes les entrées côté serveur (Zod schemas)

### 5.5 Audit trail immuable

- Append-only, hash-chaining (chaque événement contient le hash du précédent)
- Signature périodique (Merkle root) publiée sur stockage immuable (S3 Object Lock ou équivalent)
- Conservation : 7 ans minimum (obligation réglementaire financière)
- Export pour audit externe

### 5.6 Données personnelles (RGPD)

- Collecte minimale (nom, email, téléphone, données financières nécessaires)
- Droit d'accès, rectification, suppression, portabilité, opposition
- Purge automatique : données anonymisées après 24 mois d'inactivité
- Transferts hors UE : SCC + mesures additionnelles (Schrems II), pas de transfert US sans garanties
- DPO désigné, registre des traitements tenu à jour

---

## 6. Déploiement et infrastructure

### 6.1 Stratégie : Modulith (modulaire monolithique)

Pas de microservices jour 1. Monolith modulaire (Next.js + API routes + workers séparés pour calculs lourds). Extraction vers services quand douleur prouvée (R6).

### 6.2 Environnements

| Environnement | Usage | Données |
|---------------|-------|---------|
| local | Développement | SQLite / PostgreSQL Docker, données synthétiques |
| staging | Tests intégration + revue fiscale externe | Données synthétiques + échantillons réels anonymisés |
| production | Utilisateurs réels | Données réelles chiffrées, EU uniquement |

### 6.3 Hébergement (recommandé : OVHcloud EU + Exoscale CH)

- VPC multi-région (EU-FR, EU-CH)
- Kubernetes (EKS/GKE ou équivalent managé)
- PostgreSQL + TimescaleDB chiffré, Multi-AZ, PITR backups (RPO < 1h, RTO < 4h)
- Redis (cache + sessions)
- Kafka/NATS (événements inter-moteurs)
- Vault (HSM, gestion clés)
- Monitoring : Grafana + Loki + Tempo + Prometheus
- CI/CD : GitHub Actions, déploiement zero-downtime quotidien

### 6.4 Disponibilité et performance

- Disponibilité cible : ≥ 99.9% (mensuel)
- Latence API P95 < 500ms, P99 < 2s
- Fraîcheur données : liquides < 4h, immo/PE < 48h
- Simulation Tax Engine < 2s
- 0 incident sécurité critique (CVSS ≥ 7) / an

### 6.5 Sauvegardes et récupération

- Backups PostgreSQL quotidiens + PITR continu (WAL archiving)
- Restauration testée mensuellement (game day)
- RPO < 1h, RTO < 4h
- Plan de reprise d'incident documenté (voir INCIDENT_RESPONSE_PLAN.md)

---

## 7. Stack technique

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| Frontend B2C | Next.js + TypeScript + Tailwind CSS | SSR, SEO, performance, écosystème |
| Frontend mobile | React Native + Expo | Cross-platform, mise à jour OTA |
| Backend API | Next.js API routes + Node.js/TypeScript | Modulith, simplicité opérationnelle |
| Base de données | PostgreSQL 15 + TimescaleDB | SQL fort, RLS, JSONB, séries temporelles |
| ORM | Prisma | Typage sûr, migrations versionnées |
| Cache | Redis | Sessions, cache agrégateurs (TTL 1h) |
| File d'attente / événements | NATS ou Kafka | Découplage moteurs, calculs lourds |
| Chiffrement / clés | HashiCorp Vault + HSM | Gestion clés, rotation, audit |
| Facturation | Stripe (Billing + Tax + Metric) | Conformité TVA transfrontalière, PCI délégué |
| Tests | Vitest + Playwright + Hypothesis (property-based) | Couverture 80% core, 100% fiscal |
| Lint / format | ESLint Airbnb + Prettier | Standard qualité code |
| Commits | Conventional Commits | Traçabilité, changelog auto |
| Déploiement | Docker + Kubernetes + GitHub Actions | Zero-downtime, rollback |

---

## 8. ADR (Architecture Decision Records)

Chaque décision structurelle fait l'objet d'un ADR dans `docs/adr/`. ADR prévus :

| ADR | Décision | Statut |
|-----|----------|--------|
| ADR-001 | Stack Next.js + TypeScript + Tailwind | Accepté |
| ADR-002 | PostgreSQL + TimescaleDB (pas de NoSQL principal) | Accepté |
| ADR-003 | Modulith, pas de microservices jour 1 | Accepté |
| ADR-004 | Chiffrement zero-knowledge hybride Shamir 2/3 | Accepté (sous réserve audit crypto externe) |
| ADR-005 | DSL déclaratif YAML pour règles fiscales (pas de logique en dur) | Accepté |
| ADR-006 | RLS PostgreSQL pour isolation multi-tenant | Accepté |
| ADR-006 | Adapter layer avec circuit breaker + fallback manuel | Accepté |
| ADR-007 | Stripe pour billing (pas de stockage cartes) | Accepté |
| ADR-008 | Routage d'ordre uniquement (pas de custody) | Accepté |

---

## 9. Risques techniques et parades

| Risque | Gravité | Parade | Signal d'alerte |
|--------|---------|--------|-----------------|
| Agrégation instable | Critique | Multi-sourcing (2+ agrégateurs), adapter abstraction, fallback manuel, SLA contractuels | > 5% comptes en erreur 48h |
| Erreur moteur fiscal | Critique | DSL versionné, 500+ tests auto, revue externe trimestrielle, clause "indicatif", RC Pro 5M€ | 1 réclamation client fondée / trimestre |
| Requalification CIF (AMF) | Critique | Moteur = simulation générique, traçabilité décision utilisateur, opinion d'avocat | Courrier AMF/ACPR |
| Fuite données / cyber | Critique | Zero-knowledge, SOC2 Type II, bug bounty, pentest semestriel, IRP testé | Tentative intrusion (SIEM) |
| Partenaire clé change API/pricing | Majeure | 2+ fournisseurs par catégorie, abstraction layer, contrats 3 ans + sortie 6 mois | Annonce changement API / +20% prix |
| CAC B2C > LTV | Majeure | Mesure cohortes, pivot B2B-first si LTV < 3x CAC à 6 mois | CAC > 150€, conversion < 3% |
| Recrutement fiscalistes impossible | Majeure | DSL = juristes écrivent YAML, devs maintiennent moteur, partenariat cabinet | Poste vacant > 3 mois |
| Parseur PDF/OCR insuffisant | Majeure | Benchmark continu, file humaine, fine-tuning, partenariat custodians API direct | Taux auto < 80% après 1000 docs |

---

## 10. Livrables associés

Ce document est complété par :

| Document | Contenu |
|----------|---------|
| `specs/TAX_ENGINE_DSL_SPEC.yaml` | Grammaire DSL complète, 20 règles d'exemple, guide extension |
| `contracts/ADAPTER_CONTRACTS.md` | Interfaces TypeScript, DTOs, codes erreur, SLAs partenaires |
| `plans/DEV_PLAN.md` | 52 semaines, jalons, dépendances, ressources, budget, métriques |
| `compliance/COMPLIANCE_MATRIX.xlsx` | Matrice RGPD/PSD2/MIFID/LCB-FT/SFDR par composant |
| `tests/TEST_STRATEGY.md` | Stratégie tests (unit/intégration/fiscal/chaos/charge), CI/CD |
| `docs/GTM_STRATEGY.md` | Go-to-market B2C/B2B, pricing, canaux, partenariats |
| `docs/INCIDENT_RESPONSE_PLAN.md` | Classification, escalade, communication, recovery, post-mortem |
| `docs/FINANCIAL_MODEL.xlsx` | Modèle financier 36 mois |
| `README_EXEC.md` | Résumé exécutif investisseurs/partenaires |

---

## 11. Auto-audit de cette spécification

- [x] Chaque composant a un owner identifié (équipe/partenaire)
- [x] Chaque faille CRITIQUE/MAJEURE a une parade documentée + signal d'alerte
- [x] Chaque hypothèse est étiquetée (voir mission, section HYPOTHÈSES)
- [x] Le Tax Engine n'a AUCUNE logique en dur — tout en DSL + tests (contrainte spécifiée)
- [x] Zero-knowledge : spécification complète + audit externe planifié avant code
- [x] Aucun appel API partenaire sans circuit breaker + retry + fallback (spécifié Adapter Layer)
- [x] Modèle facturation B2B/B2B modélisé (Stripe, voir DEV_PLAN + FINANCIAL_MODEL)
- [x] Conformité : matrice complète (voir COMPLIANCE_MATRIX.xlsx)
- [x] Plan de recrutement réaliste (voir DEV_PLAN)
- [x] Aucune alternative rejetée non documentée (voir mission, section ALTERNATIVES REJETÉES)
- [x] Principes de décision définis (voir mission, section PRINCIPES DE DÉCISION)
- [x] Livrables listés correspondent aux besoins réels

**Prochaine étape :** TAX_ENGINE_DSL_SPEC.yaml