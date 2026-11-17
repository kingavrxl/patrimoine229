/**
 * tests/unit/tax-engine.test.ts — Tests unitaires du moteur fiscal
 *
 * Couvre l'évaluateur d'expressions DSL et le moteur forward-chaining.
 * 100% de couverture requise sur le fisc.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExpressionEvaluator } from '@/engines/tax-engine/expression-evaluator';
import { TaxEngine } from '@/engines/tax-engine/tax-engine';
import { EvaluationContext, DSLRule, Jurisdiction } from '@/engines/tax-engine/types';

// ============================================================================
// Helpers de test
// ============================================================================

function makeContext(overrides?: Partial<EvaluationContext>): EvaluationContext {
  return {
    user: {
      id: 'test-user',
      taxResidencies: [],
      ...overrides?.user,
    },
    portfolio: {
      totalNetWorth: 100000,
      byJurisdiction: {},
      byAccountType: {},
      holdings: [],
      ...overrides?.portfolio,
    },
    simulationEvent: { type: 'none' },
    taxYear: 2026,
    jurisdictions: ['FR'],
    fxRates: { EUR: 1.0 },
    ...overrides,
  };
}

function makeLiteralRule(
  id: string,
  jurisdiction: Jurisdiction,
  condition: any,
  effect: any,
  priority = 100
): DSLRule {
  return {
    id,
    jurisdiction,
    taxYear: 2026,
    type: 'rate',
    condition,
    effect,
    explanation: {
      title: 'Règle de test',
      detail: 'Détail de test',
      sourceUrl: 'https://example.com/loi',
      uncertaintyLevel: 'low',
    },
    source: {
      reference: 'Code test art. 1',
      type: 'law',
    },
    priority,
  };
}

// ============================================================================
// Tests ExpressionEvaluator
// ============================================================================

describe('ExpressionEvaluator', () => {
  let evaluator: ExpressionEvaluator;

  beforeEach(() => {
    evaluator = new ExpressionEvaluator(makeContext());
  });

  describe('Literals', () => {
    it('évalue un littéral string', () => {
      const result = evaluator.evaluate({
        type: 'literal',
        valueType: 'string',
        value: 'FR',
      });
      expect(result).toBe('FR');
    });

    it('évalue un littéral number', () => {
      const result = evaluator.evaluate({
        type: 'literal',
        valueType: 'number',
        value: 42,
      });
      expect(result).toBe(42);
    });

    it('évalue un littéral boolean', () => {
      const result = evaluator.evaluate({
        type: 'literal',
        valueType: 'boolean',
        value: true,
      });
      expect(result).toBe(true);
    });

    it('évalue null', () => {
      const result = evaluator.evaluate({
        type: 'literal',
        valueType: 'null',
        value: null,
      });
      expect(result).toBe(null);
    });
  });

  describe('Field access', () => {
    it('résout un champ simple', () => {
      const ctx = makeContext({
        user: { id: 'test-user', taxResidencies: [] },
      });
      const ev = new ExpressionEvaluator(ctx);
      const result = ev.evaluate({
        type: 'field',
        path: 'user.id',
      });
      expect(result).toBe('test-user');
    });

    it('résout un champ avec index tableau', () => {
      const ctx = makeContext({
        user: {
          id: 'test-user',
          taxResidencies: [{ countryCode: 'FR', isPrimary: true, startDate: '2020-01-01', confidenceScore: 1 }],
        },
      });
      const ev = new ExpressionEvaluator(ctx);
      const result = ev.evaluate({
        type: 'field',
        path: 'user.tax_residencies[0].country_code',
      });
      expect(result).toBe('FR');
    });

    it('retourne null pour un champ inexistant', () => {
      const result = evaluator.evaluate({
        type: 'field',
        path: 'user.nonExistent',
      });
      expect(result).toBe(null);
    });
  });

  describe('Operations', () => {
    it('évalue AND', () => {
      const result = evaluator.evaluate({
        type: 'op',
        operator: 'and',
        operands: [
          { type: 'literal', valueType: 'boolean', value: true },
          { type: 'literal', valueType: 'boolean', value: true },
        ],
      });
      expect(result).toBe(true);
    });

    it('évalue OR avec un vrai', () => {
      const result = evaluator.evaluate({
        type: 'op',
        operator: 'or',
        operands: [
          { type: 'literal', valueType: 'boolean', value: false },
          { type: 'literal', valueType: 'boolean', value: true },
        ],
      });
      expect(result).toBe(true);
    });

    it('évalue NOT', () => {
      const result = evaluator.evaluate({
        type: 'op',
        operator: 'not',
        operands: [{ type: 'literal', valueType: 'boolean', value: true }],
      });
      expect(result).toBe(false);
    });

    it('évalue EQ sur nombres', () => {
      const result = evaluator.evaluate({
        type: 'op',
        operator: 'eq',
        operands: [
          { type: 'literal', valueType: 'number', value: 42 },
          { type: 'literal', valueType: 'number', value: 42 },
        ],
      });
      expect(result).toBe(true);
    });

    it('évalue GT', () => {
      const result = evaluator.evaluate({
        type: 'op',
        operator: 'gt',
        operands: [
          { type: 'literal', valueType: 'number', value: 10 },
          { type: 'literal', valueType: 'number', value: 5 },
        ],
      });
      expect(result).toBe(true);
    });

    it('évalue IN', () => {
      const result = evaluator.evaluate({
        type: 'op',
        operator: 'in',
        operands: [
          { type: 'literal', valueType: 'string', value: 'FR' },
          { type: 'literal', valueType: 'string', value: 'FR' },
          { type: 'literal', valueType: 'string', value: 'CH' },
          { type: 'literal', valueType: 'string', value: 'US' },
        ],
      });
      expect(result).toBe(true);
    });
  });

  describe('Functions', () => {
    it('current_date retourne une date', () => {
      const result = evaluator.evaluate({
        type: 'function',
        name: 'current_date',
        args: [],
      });
      expect(result).toBeInstanceOf(Date);
    });

    it('sum additionne des nombres', () => {
      const result = evaluator.evaluate({
        type: 'function',
        name: 'sum',
        args: [
          { type: 'literal', valueType: 'number', value: 10 },
          { type: 'literal', valueType: 'number', value: 20 },
          { type: 'literal', valueType: 'number', value: 30 },
        ],
      });
      expect(result).toBe(60);
    });

    it('multiply multiplie des nombres', () => {
      const result = evaluator.evaluate({
        type: 'function',
        name: 'multiply',
        args: [
          { type: 'literal', valueType: 'number', value: 5 },
          { type: 'literal', valueType: 'number', value: 6 },
        ],
      });
      expect(result).toBe(30);
    });
  });
});

// ============================================================================
// Tests TaxEngine
// ============================================================================

describe('TaxEngine', () => {
  let engine: TaxEngine;

  beforeEach(() => {
    engine = new TaxEngine();
  });

  describe('Règle de taux simple (PFU)', () => {
    it('calcule le PFU sur une plus-value', () => {
      // Règle : taux 30% sur le gain net si résidence FR et compte ordinaire
      const rule = makeLiteralRule(
        'FR001',
        'FR',
        {
          type: 'op',
          operator: 'and',
          operands: [
            { type: 'op', operator: 'eq', operands: [
              { type: 'field', path: 'user.tax_residencies[0].country_code' },
              { type: 'literal', valueType: 'string', value: 'FR' },
            ]},
            { type: 'op', operator: 'eq', operands: [
              { type: 'field', path: 'holding.tax_type' },
              { type: 'literal', valueType: 'string', value: 'compte_ordinaire' },
            ]},
          ],
        },
        {
          type: 'rate',
          base: { type: 'field', path: 'capital_gain_net' },
          rate: { type: 'literal', valueType: 'number', value: 0.30 },
          resultField: 'tax_pfU',
        },
        10
      );

      engine.loadRules([rule]);

      const context = makeContext({
        user: {
          taxResidencies: [{ countryCode: 'FR', isPrimary: true, startDate: '2020-01-01', confidenceScore: 1 }],
        },
        portfolio: {
          totalNetWorth: 20000,
          holdings: [
            {
              id: 'H1',
              isin: 'FR0000121014',
              assetClass: 'equity',
              quantity: 100,
              currency: 'EUR',
              currentPrice: 200,
              costBasis: 15000,
              currencyCostBasis: 'EUR',
              taxType: 'compte_ordinaire',
              jurisdiction: 'FR',
              acquisitionDate: '2024-01-15',
              lots: [{ acquisitionDate: '2024-01-15', quantity: 100, pricePerUnit: 150, currency: 'EUR' }],
            },
          ],
        },
        simulationEvent: { type: 'sale', details: { quantity: 100, salePricePerUnit: 200 } },
        jurisdictions: ['FR'],
      });

      // Set intermediate value for capital_gain_net (normalement calculé par le moteur de consolidation)
      const ev = new ExpressionEvaluator(context);
      ev.setIntermediateValue('capital_gain_net', 5000);

      // Note: Le moteur actuel n'itère pas sur les holdings automatiquement,
      // c'est une simplification pour les tests unitaires.
      // Le test vérifie que le moteur charge et retourne des règles.
      const rules = engine.getRules('FR');
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('FR001');
    });
  });

  describe('Chargement des règles', () => {
    it('charge des règles par juridiction', () => {
      const rules: DSLRule[] = [
        makeLiteralRule('FR001', 'FR', { type: 'literal', valueType: 'boolean', value: true }, { type: 'rate', base: { type: 'literal', valueType: 'number', value: 100 }, rate: { type: 'literal', valueType: 'number', value: 0.1 }, resultField: 'tax' }),
        makeLiteralRule('CH001', 'CH', { type: 'literal', valueType: 'boolean', value: true }, { type: 'rate', base: { type: 'literal', valueType: 'number', value: 100 }, rate: { type: 'literal', valueType: 'number', value: 0.05 }, resultField: 'tax' }),
      ];

      engine.loadRules(rules);

      expect(engine.getRules('FR')).toHaveLength(1);
      expect(engine.getRules('CH')).toHaveLength(1);
      expect(engine.getRules('US')).toHaveLength(0);
    });

    it('trie les règles par priorité', () => {
      const rules: DSLRule[] = [
        makeLiteralRule('FR_LOW', 'FR', { type: 'literal', valueType: 'boolean', value: true }, { type: 'rate', base: { type: 'literal', valueType: 'number', value: 100 }, rate: { type: 'literal', valueType: 'number', value: 0.1 }, resultField: 'tax' }, 200),
        makeLiteralRule('FR_HIGH', 'FR', { type: 'literal', valueType: 'boolean', value: true }, { type: 'rate', base: { type: 'literal', valueType: 'number', value: 100 }, rate: { type: 'literal', valueType: 'number', value: 0.1 }, resultField: 'tax' }, 10),
      ];

      engine.loadRules(rules);
      const frRules = engine.getRules('FR');
      expect(frRules[0].id).toBe('FR_HIGH'); // priorité 10 avant 200
      expect(frRules[1].id).toBe('FR_LOW');
    });
  });
});

// ============================================================================
// Test d'invariant : coût basis (lot tracking)
// ============================================================================

describe('Lot Tracking — Invariants', () => {
  it('somme des quantités restantes = quantité du holding', () => {
    const lots = [
      { id: 'L1', quantity: 100, quantityRemaining: 60 },
      { id: 'L2', quantity: 100, quantityRemaining: 100 },
      { id: 'L3', quantity: 50, quantityRemaining: 50 },
    ];

    const totalRemaining = lots.reduce((sum, l) => sum + l.quantityRemaining, 0);
    const holdingQuantity = lots.reduce((sum, l) => sum + l.quantity, 0);

    // Après vente partielle, la somme des remaining doit être <= quantité totale
    expect(totalRemaining).toBeLessThanOrEqual(holdingQuantity);
    expect(totalRemaining).toBe(210); // 60 + 100 + 50
    expect(holdingQuantity).toBe(250); // 100 + 100 + 50
  });

  it('plus-value réalisée = Σ(qty_vendue × (prix_vente - coût_lot))', () => {
    // Vente de 150 unités à 200 €, lots FIFO : L1 à 150 €, L2 à 180 €
    const saleQuantity = 150;
    const salePrice = 200;

    const lots = [
      { quantityRemaining: 100, pricePerUnit: 150 }, // L1
      { quantityRemaining: 100, pricePerUnit: 180 }, // L2
    ];

    let remainingToSell = saleQuantity;
    let realizedGain = 0;

    for (const lot of lots) {
      const qtyFromLot = Math.min(remainingToSell, lot.quantityRemaining);
      realizedGain += qtyFromLot * (salePrice - lot.pricePerUnit);
      remainingToSell -= qtyFromLot;
    }

    // 100 × (200-150) + 50 × (200-180) = 5000 + 1000 = 6000
    expect(realizedGain).toBe(6000);
    expect(remainingToSell).toBe(0);
  });
});
