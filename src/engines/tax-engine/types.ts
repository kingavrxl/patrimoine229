// src/engines/tax-engine/types.ts — Types complets du moteur fiscal OPT

export type Jurisdiction = 'FR' | 'CH' | 'US' | 'UK' | 'LU' | 'BE' | 'SG' | 'AE';

export type UncertaintyLevel = 'low' | 'medium' | 'high' | 'grey_zone';

export interface ExplanationTraceEntry {
  ruleId: string;
  ruleTitle: string;
  applied: boolean;
  legalReference: string;
  detail: string;
  sourceUrl?: string;
  uncertaintyLevel: UncertaintyLevel;
  taxableBase?: number;
  rate?: number;
  amountCalculated?: number;
}

export interface LotDetail {
  lotId: string;
  acquisitionDate: string;
  quantitySold: number;
  pricePerUnit: number;
  costBasis: number;
  salePrice: number;
  gain: number;
}

export interface TaxCalculationResult {
  scenarioType: string;
  currency: string;
  grossAmount: number;
  costBasis: number;
  capitalGain: number;
  totalTax: number;
  netAfterTax: number;
  effectiveTaxRate: number;
  taxesByJurisdiction: Record<string, number>;
  taxesBreakdown: {
    label: string;
    jurisdiction: string;
    rate: number;
    amount: number;
    legalReference: string;
  }[];
  explanationTrace: ExplanationTraceEntry[];
  lotDepletion?: LotDetail[];
  recommendations: string[];
}

export interface DSLRule {
  id: string;
  jurisdiction: Jurisdiction;
  taxYear: number;
  type: 'rate' | 'bracket' | 'exemption' | 'credit' | 'treaty' | 'timing';
  condition: any;
  effect: {
    type: string;
    base?: any;
    rate?: any;
    brackets?: { from: number; to: number | null; rate: number }[];
    amountOrRate?: any;
    resultField?: string;
  };
  explanation: {
    title: string;
    detail: string;
    sourceUrl?: string;
    uncertaintyLevel: UncertaintyLevel;
  };
  source: {
    reference: string;
    type: string;
  };
  priority?: number;
}

export interface EvaluationContext {
  user: {
    id?: string;
    email?: string;
    primaryTaxResidency: string;
    taxResidencies: { countryCode: string; isPrimary: boolean }[];
  };
  holding?: {
    id: string;
    assetName: string;
    isin?: string;
    assetClass: string;
    taxType: string;
    jurisdiction: string;
    currency: string;
    quantity: number;
    currentPrice: number;
    costBasis: number;
    lots?: {
      id: string;
      acquisitionDate: string;
      quantity: number;
      pricePerUnit: number;
      currency: string;
    }[];
  };
  event: {
    type: 'sale' | 'ifi' | 'exit_tax' | 'donation' | 'rebalancing';
    quantity?: number;
    salePrice?: number;
    realEstateNetWorth?: number;
    destinationCountry?: string;
    donationAmount?: number;
    recipientRelation?: string;
  };
  fxRates: Record<string, number>;
}
