/**
 * src/adapters/index.ts — Interfaces des adaptateurs OPT
 *
 * Conforme à ADAPTER_CONTRACTS.md
 * Tous les adaptateurs suivent le même pattern :
 * - Interface TypeScript stricte
 * - DTOs normalisés internes
 * - Circuit breaker + retry + cache
 * - Audit trail sur chaque appel
 * - Aucun appel sans circuit breaker + retry + fallback
 */

// ============================================================================
// Types communs
// ============================================================================

export interface AuditContext {
  userId: string;
  operation: string;
  partner: string;
  timestamp: Date;
}

export interface HealthResult {
  healthy: boolean;
  latencyMs: number;
  errorCode?: string;
  timestamp: Date;
}

export interface ConnectResult {
  success: boolean;
  authorizationUrl?: string;
  credentials?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
}

export interface AdapterError {
  code: string;
  message: string;
  retryable: boolean;
}

// Codes d'erreur communs
export const ADAPTER_ERRORS = {
  AUTH_FAILED: 'ADAPTER_AUTH_FAILED',
  RATE_LIMITED: 'ADAPTER_RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'ADAPTER_SERVICE_UNAVAILABLE',
  DATA_MALFORMED: 'ADAPTER_DATA_MALFORMED',
  TIMEOUT: 'ADAPTER_TIMEOUT',
  PERMISSION_DENIED: 'ADAPTER_PERMISSION_DENIED',
  ACCOUNT_CLOSED: 'ADAPTER_ACCOUNT_CLOSED',
  UNKNOWN_ERROR: 'ADAPTER_UNKNOWN_ERROR',
} as const;

// ============================================================================
// DTOs normalisés (indépendants du partenaire)
// ============================================================================

export interface BankAccountDTO {
  id: string;
  externalId: string;
  provider: string;
  name: string;
  iban?: string;
  bic?: string;
  currency: string;
  accountType: 'checking' | 'savings' | 'securities' | 'crypto' | 'other';
  balance: number;
  balanceDate: Date;
  isActive: boolean;
  lastSyncAt: Date;
  syncStatus: 'idle' | 'syncing' | 'error' | 'paused';
  lastError?: string;
  metadata: Record<string, unknown>;
}

export interface HoldingDTO {
  id: string;
  accountId: string;
  isin?: string;
  internalId?: string;
  cfiCode?: string;
  assetClass: 'equity' | 'bond' | 'fund' | 'etf' | 'crypto' | 'real_estate' | 'private_equity' | 'other';
  quantity: number;
  currency: string;
  currentPrice?: number;
  currentPriceAt?: Date;
  costBasis?: number;
  taxType: 'ass_vie' | 'pea' | 'compte_ordinaire' | 'titre_nu' | 'assurance_vie_lux' | '401k' | 'ira' | 'isa' | 'pilier_3' | 'other';
  jurisdiction: string;
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
  grossAmount: number;
  fees: number;
  taxWithheld: number;
  netAmount: number;
  currency: string;
  fxRate?: number;
  reference?: string;
  isReconciled: boolean;
  metadata: Record<string, unknown>;
}

export interface DocumentDTO {
  id: string;
  accountId: string;
  type: 'statement' | 'tax_form' | 'contract' | 'prospectus' | 'other';
  title: string;
  date: Date;
  url: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
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

// ============================================================================
// Interface AggregatorAdapter
// ============================================================================

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
  userId: string;
}

export interface AggregatorAdapter {
  connect(config: AggregatorAdapterConfig): Promise<ConnectResult>;
  handleOAuthCallback(code: string, state: string): Promise<AggregatorAdapterCredentials>;
  refreshCredentials(credentials: AggregatorAdapterCredentials): Promise<AggregatorAdapterCredentials>;
  revokeCredentials(credentials: AggregatorAdapterCredentials): Promise<void>;
  healthCheck(): Promise<HealthResult>;

  fetchAccounts(credentials: AggregatorAdapterCredentials): Promise<BankAccountDTO[]>;
  fetchHoldings(accountId: string, credentials: AggregatorAdapterCredentials): Promise<HoldingDTO[]>;
  fetchTransactions(
    accountId: string,
    fromDate: Date,
    toDate: Date,
    credentials: AggregatorAdapterCredentials
  ): Promise<TransactionDTO[]>;
  fetchDocuments(accountId: string, credentials: AggregatorAdapterCredentials): Promise<DocumentDTO[]>;

  syncAll(
    userId: string,
    credentials: AggregatorAdapterCredentials,
    options?: { fullHistory?: boolean; force?: boolean }
  ): Promise<SyncResult>;

  verifyWebhookSignature(payload: string, signature: string): Promise<boolean>;
  parseWebhookEvent(payload: string): Promise<{
    type: string;
    accountId?: string;
    data: Record<string, unknown>;
    timestamp: Date;
  }>;
}

// ============================================================================
// Interface BrokerAdapter
// ============================================================================

export interface BrokerAccountDTO {
  id: string;
  externalId: string;
  provider: 'ibkr' | 'saxo' | 'swissquote';
  accountNumber: string;
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
  simulationId?: string;
  idempotencyKey: string;
}

export interface OrderRoutingResult {
  success: boolean;
  orderId: string;
  externalOrderId?: string;
  status: BrokerOrderDTO['status'];
  estimatedFees: number;
  estimatedTaxImpact?: Record<string, number>;
  brokerAuthUrl?: string;
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
  accountId: string;
}

export interface BrokerAdapter {
  connect(config: BrokerAdapterConfig): Promise<ConnectResult>;
  handleOAuthCallback(code: string, state: string): Promise<BrokerAdapterCredentials>;
  refreshCredentials(credentials: BrokerAdapterCredentials): Promise<BrokerAdapterCredentials>;
  revokeCredentials(credentials: BrokerAdapterCredentials): Promise<void>;
  healthCheck(): Promise<HealthResult>;

  fetchAccounts(credentials: BrokerAdapterCredentials): Promise<BrokerAccountDTO[]>;
  fetchPositions(accountId: string, credentials: BrokerAdapterCredentials): Promise<BrokerPositionDTO[]>;

  placeOrder(request: OrderRoutingRequest, credentials: BrokerAdapterCredentials): Promise<OrderRoutingResult>;
  cancelOrder(orderId: string, credentials: BrokerAdapterCredentials): Promise<{ success: boolean; errorCode?: string }>;
  fetchOrderStatus(orderId: string, credentials: BrokerAdapterCredentials): Promise<BrokerOrderDTO>;
  fetchOrders(accountId: string, credentials: BrokerAdapterCredentials): Promise<BrokerOrderDTO[]>;

  verifyWebhookSignature(payload: string, signature: string): Promise<boolean>;
  parseWebhookEvent(payload: string): Promise<{
    type: string;
    orderId: string;
    externalOrderId?: string;
    status: string;
    filledQuantity?: number;
    averageFillPrice?: number;
    timestamp: Date;
  }>;
}

// ============================================================================
// Interface KYCAdapter
// ============================================================================

export interface KYCResult {
  userId: string;
  provider: 'sumsub' | 'complyadvantage';
  status: 'pending' | 'verified' | 'rejected' | 'expired' | 'manual_review';
  level: 'simplified' | 'standard' | 'enhanced';
  checks: Array<{
    type: string;
    status: 'passed' | 'failed' | 'pending' | 'manual_review';
    details: Record<string, unknown>;
    verifiedAt?: Date;
  }>;
  riskScore: number;
  riskFactors: string[];
  documentVerified: boolean;
  livenessVerified: boolean;
  sanctionScreening: 'clear' | 'hit' | 'pending';
  pepScreening: 'clear' | 'hit' | 'pending';
  adverseMedia: 'clear' | 'hit' | 'pending';
  expiresAt?: Date;
  metadata: Record<string, unknown>;
}

export interface KYCAdapterConfig {
  provider: 'sumsub' | 'complyadvantage';
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  webhookSecret: string;
}

export interface KYCAdapter {
  initiateVerification(userId: string, userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dateOfBirth: Date;
    nationality: string;
    countryOfResidence: string;
    taxResidencies: string[];
  }): Promise<{ sessionId: string; verificationUrl: string }>;

  checkStatus(sessionId: string): Promise<KYCResult>;
  refreshVerification(userId: string): Promise<KYCResult>;
  handleWebhook(payload: string, signature: string): Promise<{
    type: string;
    userId: string;
    status: KYCResult['status'];
    riskScore: number;
    timestamp: Date;
  }>;
}

// ============================================================================
// Interface ReportingAdapter
// ============================================================================

export interface ReportRequest {
  userId: string;
  organizationId?: string;
  templateId: string;
  parameters: Record<string, unknown>;
  locale: string;
  delivery: 'download' | 'email' | 'webhook';
  emailTo?: string;
}

export interface ReportResult {
  reportId: string;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  downloadUrl?: string;
  fileSizeBytes?: number;
  checksum: string;
  generatedAt: Date;
  expiresAt: Date;
  errorCode?: string;
  errorMessage?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  type: 'monthly' | 'quarterly' | 'annual' | 'tax_summary' | 'mifid_suitability' | 'custom';
  format: 'pdf' | 'excel' | 'json' | 'csv';
  templateId: string;
  whiteLabel: boolean;
  locales: string[];
}

export interface ReportingAdapterConfig {
  templateEngine: 'typst' | 'latex';
  storageBucket: string;
  emailProvider: 'resend' | 'sendgrid' | 'ses';
  retentionDays: number;
}

export interface ReportingAdapter {
  generateReport(request: ReportRequest): Promise<ReportResult>;
  getReportStatus(reportId: string): Promise<ReportResult>;
  listTemplates(locale?: string): Promise<ReportTemplate[]>;
  scheduleRecurringReport(request: ReportRequest, cronExpression: string): Promise<{ scheduleId: string }>;
  cancelRecurringReport(scheduleId: string): Promise<void>;
}

// ============================================================================
// Interface DocumentAdapter (OCR/PDF)
// ============================================================================

export interface DocumentExtractionResult {
  documentId: string;
  sourceFileUrl: string;
  documentType: 'bank_statement' | 'tax_form' | 'broker_statement' | 'property_deed' | 'other';
  confidenceScore: number;
  extractedFields: Array<{
    name: string;
    value: string | number | Date;
    confidence: number;
    source: 'regex' | 'llm' | 'hybrid';
    validated: boolean;
  }>;
  lineItems: Array<{
    date: Date;
    description: string;
    amount: number;
    currency: string;
    type: 'debit' | 'credit' | 'fee' | 'interest' | 'dividend';
    confidence: number;
  }>;
  requiresHumanReview: boolean;
  reviewReason?: string;
  processingTimeMs: number;
  metadata: Record<string, unknown>;
}

export interface DocumentAdapterConfig {
  ocrEngine: 'tesseract' | 'paddleocr';
  llmModel: string;
  llmApiKey: string;
  llmBaseUrl: string;
  confidenceThreshold: number;
}

export interface DocumentAdapter {
  uploadDocument(file: Buffer, mimeType: string, userId: string): Promise<{ documentId: string }>;
  extract(documentId: string): Promise<DocumentExtractionResult>;
  validateExtraction(documentId: string, corrections: Array<{ name: string; value: string | number | Date }>): Promise<void>;
  getExtractionStatus(documentId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'human_review';
  }>;
}
