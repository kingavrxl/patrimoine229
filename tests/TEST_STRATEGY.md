# TEST_STRATEGY.md — Stratégie de tests OPT

> **Statut :** Spécification implémentable directement.
> **Propriétaire :** Lead Backend + QA (à recruter)
> **Dernière révision :** 2026-11-16
>
> Règle absolue : aucun code sans tests. Couverture ≥ 80% sur le core, 100% sur le fisc.
> Chaque bug trouvé en audit reçoit un test qui l'empêche de revenir.

---

## 1. Pyramide de tests

```
                    /\
                   /  \  E2E (Playwright) — parcours critiques, < 5% du volume
                  /    \
                 /      \  Intégration (Vitest + Supertest) — API, adaptateurs, moteurs ~ 20%
                /        \
               /__________\  Unit (Vitest) — fonctions pures, logique fiscale, calculs ~ 75%
```

| Type | Outil | Couverture cible | Où |
|------|-------|------------------|-----|
| Unit | Vitest | ≥ 80% core, 100% fiscal | `src/**/*.test.ts` |
| Intégration | Vitest + Supertest | API routes, adaptateurs, DB | `tests/integration/` |
| Fiscal (scénarios YAML) | Framework custom + Hypothesis | 100% des règles DSL | `tests/fiscal/scenarios/*.yaml` |
| Chaos | Custom (pannes réseau, partenaires HS) | Résilience adaptateurs | `tests/chaos/` |
| Charge | k6 ou Artillery | P95 < 500ms, P99 < 2s | `tests/load/` |
| E2E | Playwright | Parcours onboarding, dashboard, simulation | `tests/e2e/` |
| Accessibilité | axe-core + axe-playwright | WCAG 2.1 AA | `tests/a11y/` |

---

## 2. Tests Unitaires

### 2.1 Domaines couverts

- **Moteur de règles fiscales (DSL)** : évaluation des expressions, application des règles, forward-chaining, point fixe
- **Lot tracking / cost basis** : FIFO, LIFO, Average par devise, compte, juridiction. Invariants : Σ lots = holding, Σ gains = PV réalisée
- **Valorisation & FX** : conversion devises, calcul de plus-values latentes/réalisées
- **Simulation what-if** : clone portfolio, application événement, recalcul, delta
- **Explanation trace** : génération de la trace, désérialisation, export
- **Adaptateurs** : mapping DTO partenaire → DTO interne, circuit breaker, retry, cache
- **Chiffrement** : dérivation clé Argon2id, Shamir Secret Sharing 2/3, rotation, récupération
- **Auth** : hachage mot de passe, JWT, MFA, session

### 2.2 Exemple de test unitaire (lot tracking)

```typescript
// tests/unit/lot-tracking.test.ts
import { calculateRealizedGain, Lot } from '@/services/lot-tracking';

test('FIFO: vente partielle utilise les lots les plus anciens', () => {
  const lots: Lot[] = [
    { id: 'L1', acquisitionDate: '2024-01-01', quantity: 100, quantityRemaining: 100, pricePerUnit: 100, currency: 'EUR' },
    { id: 'L2', acquisitionDate: '2024-06-01', quantity: 100, quantityRemaining: 100, pricePerUnit: 150, currency: 'EUR' },
  ];

  const result = calculateRealizedGain(lots, 150, 'FIFO', 'EUR');

  expect(result.realizedGain).toBe(5000); // 150 × (150 - 100) = 5000 sur L1
  expect(result.lotsConsumed).toEqual([
    { lotId: 'L1', quantity: 100, pricePerUnit: 100 },
  ]);
  expect(result.remainingLots).toHaveLength(1);
  expect(result.remainingLots[0].quantityRemaining).toBe(100);
});

test('Invariant: somme des quantités restantes = quantité du holding', () => {
  // ... test d'invariant
});
```

---

## 3. Tests d'Intégration

### 3.1 Domaines couverts

- API d'authentification (inscription, connexion, MFA, réinitialisation mot de passe)
- API de consolidation (sync agrégateur, import CSV, parseur PDF)
- API de Tax Engine (simulation what-if, calcul par juridiction)
- API d'Advisory (allocation, rééquilibrage, harvesting, projections)
- API d'ordres (routing broker, annulation, statut)
- Base de données (RLS, migrations, contraintes, index)
- Cache Redis (TTL, invalidation)
- File d'attente / événements (NATS/Kafka)

### 3.2 Exemple de test d'intégration (Tax Engine)

```typescript
// tests/integration/tax-engine.integration.test.ts
import { createTestApp } from '@/test-utils';
import { prisma } from '@/lib/prisma';

describe('Tax Engine — simulation what-if', () => {
  const app = createTestApp();

  beforeAll(async () => {
    // Créer un utilisateur avec résidence fiscale FR
    // Créer un portfolio avec des holdings compte ordinaire
    // Insérer les règles DSL FR 2026 en base
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('calcule le PFU sur une plus-value de compte ordinaire', async () => {
    const response = await app
      .post('/api/simulations')
      .send({
        userId: testUser.id,
        scenarioType: 'sale',
        inputData: {
          portfolio: { /* ... */ },
          event: { type: 'sale', details: { quantity: 100, salePricePerUnit: 200 } },
          taxYear: 2026,
          jurisdictions: ['FR'],
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.resultData.taxesByJurisdiction.FR).toBeCloseTo(1500, 0); // 5000 € gain × 30%
    expect(response.body.explanationTrace).toHaveLength(greaterThanOrEqual(2));
    expect(response.body.explanationTrace[0].ruleId).toBe('FR001');
    expect(response.body.explanationTrace[0].uncertaintyLevel).toBe('low');
  });
});
```

---

## 4. Tests Fiscaux (scénarios YAML) — 100% couverture

### 4.1 Format

Chaque règle DSL a un ou plusieurs scénarios de test YAML :

```yaml
# tests/fiscal/scenarios/fr_pfu_001.yaml
scenario_key: FR_PFU_001
jurisdiction: FR
tax_year: 2026
description: "Plus-value sur compte ordinaire — PFU 30%"
input:
  user:
    tax_residencies:
      - country_code: FR
        is_primary: true
        confidence_score: 1.0
  portfolio:
    holdings:
      - isin: "FR0000121014"
        asset_class: equity
        tax_type: compte_ordinaire
        jurisdiction: FR
        lots:
          - acquisition_date: "2024-01-15"
            quantity: 100
            price_per_unit: 150
            currency: EUR
    current_price: 200
    currency: EUR
  simulation_event:
    type: sale
    details:
      quantity: 100
      sale_price_per_unit: 200
  tax_year: 2026
  jurisdictions: [FR]
  fx_rates:
    EUR: 1.0
expected_output:
  taxes_by_jurisdiction:
    FR: 1500  # 5000 € × 30%
  net_wealth_after_tax: 18500
  explanation_trace_length:
    min_items: 2
  uncertainty_levels: [low]
tags: [boundary, regression]
```

### 4.2 Exécution CI/CD

```
À chaque push / PR :
  1. Lancer tous les tests unitaires (Vitest)
  2. Lancer tous les tests d'intégration (base de données de test)
  3. Lancer les 500+ scénarios fiscaux YAML
     → Si une régression (sortie différente de expected_output) : BLOQUER le déploiement
  4. Vérifier la couverture de code (≥ 80% core, 100% fiscal)
  5. Lancer l'analyse statique (ESLint, TypeScript strict)
  6. Si tout vert → déployer sur staging
```

### 4.3 Génération de cas limites

- Frontières de seuils (ex: 800 000 € IFI, 1 000 000 €, 2 000 000 $ US exit tax)
- Années bissextiles (29 février)
- Changements de loi (millésime fiscal)
- Multi-devises (conversion EUR/CHF/USD/GBP)
- Zéro holding, holding vide, quantité nulle
- Données manquantes (ISIN manquant, date d'acquisition inconnue)

### 4.4 Property-based testing (Hypothesis ou fast-check)

```typescript
// Exemple : invariants lot tracking
test('invariant: sum of lot quantities equals holding quantity', () => {
  fc.assert(
    fc.property(
      fc.array(lotGenerator(), { minLength: 1, maxLength: 20 }),
      (lots) => {
        const holding = mergeLotsIntoHolding(lots);
        const sumRemaining = lots.reduce((s, l) => s + l.quantityRemaining, 0);
        expect(sumRemaining).toBe(holding.quantity);
      }
    )
  );
});
```

---

## 5. Tests de Chaos (résilience)

### 5.1 Scénarios de chaos

| Scénario | Effet attendu |
|----------|---------------|
| Partenaire agrégateur HS (503) | Circuit breaker ouvert, fallback manuel, alerte |
| Partenaire agrégateur lent (> 5s) | Timeout, retry exponentiel, cache utilisé si disponible |
| Base de données indisponible | Message d'erreur utilisateur, pas de plantage silencieux |
| Clé de chiffrement indisponible (Vault HS) | Fallback : pas de déchiffrement, message "service indisponible" |
| Réseau coupé pendant sync | Reprise après interruption (idempotence), pas de doublons |
| Webhook broker en double | Idempotency key, pas d'exécution double |
| Clé API expirée | Redirection vers reconnexion OAuth |

### 5.2 Outils

- Chaos personnalisé (scripts qui simulent pannes)
- Test en environnement staging avec partenaires en mode "sandbox défaillant"

---

## 6. Tests de Charge (performance)

### 6.1 Cibles

| Indicateur | Cible | Outil |
|------------|-------|-------|
| Latence API P95 | < 500ms | k6 / Artillery |
| Latence API P99 | < 2s | k6 / Artillery |
| Simulation Tax Engine | < 2s | k6 |
| Disponibilité | ≥ 99.9% | Monitoring continu |
| Fraîcheur données liquides | < 4h | Monitoring sync |

### 6.2 Scénarios de charge

- 100 utilisateurs simultanés sur le dashboard
- 50 simulations what-if simultanées
- 10 synchronisations agrégateurs simultanées
- Pic de 1000 utilisateurs ( lancement produit )

### 6.3 Seuils d'alerte

- P95 > 500ms pendant 5 min → alerte
- Taux d'erreur > 1% → alerte critique
- Circuit breaker ouvert > 10 min → alerte critique

---

## 7. Tests E2E (Playwright)

### 7.1 Parcours critiques

1. **Onboarding B2C** : inscription → questionnaire résidence → connexion compte → simulation → abonnement (< 15 min)
2. **Dashboard** : chargement, affichage allocation, alertes, actions recommandées
3. **Simulation what-if** : sélection événement, calcul, affichage résultat + explanation trace
4. **Advisor Portal** : création organisation, invitation collaborateur, RBAC
5. **Embedded trading** : pré-remplissage ordre, validation sur interface broker (sandbox)

### 7.2 Accessibilité (axe-core)

- Contrastes WCAG AA sur tous les couples texte/fond
- Navigation clavier complète
- Labels sur tous les champs de formulaire
- Texte alternatif sur toutes les images
- Support lecteurs d'écran

---

## 8. Environnements de test

| Environnement | Données | Usage |
|---------------|---------|-------|
| local | SQLite + données synthétiques | Développement, tests unitaires |
| CI (GitHub Actions) | PostgreSQL Docker + données synthétiques | Tests unitaires + intégration à chaque PR |
| staging | PostgreSQL + échantillons réels anonymisés | Tests intégration, chaos, charge, revue fiscale externe |
| production | Données réelles chiffrées | Monitoring, alertes |

### 8.1 Données synthétiques

- Portefeuilles types (expat FR-CH, dirigeant US-UK, crypto-riche SG, héritier AE)
- Scénarios de vie (déménagement, donation, décès, vente d'actif)
- Données fiscales par juridiction (barèmes, seuils, taux)

---

## 9. CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Tests et qualité

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint          # ESLint Airbnb + TypeScript strict
      - run: npm run type-check    # tsc --noEmit
      - run: npm run test:unit     # Vitest, couverture ≥ 80%
      - run: npm run test:integration  # Base de données de test
      - run: npm run test:fiscal   # 500+ scénarios YAML, BLOQUANT si régression
      - run: npm run test:a11y     # axe-core, WCAG AA
      - run: npm run build         # Build Next.js
      - run: npm run test:e2e      # Playwright (staging uniquement)
```

### 9.1 Règles de blocage

- Régression fiscale (scénario YAML) → déploiement BLOQUÉ
- Couverture fiscale < 100% → déploiement BLOQUÉ
- Erreur ESLint / TypeScript → déploiement BLOQUÉ
- Test E2E critique échoué → déploiement BLOQUÉ

---

## 10. Gestion des régressions

```
Lorsqu'un bug est trouvé en audit ou en production :
  1. Créer un test qui reproduit le bug (test qui échoue avant correction)
  2. Corriger le bug
  3. Vérifier que le test passe maintenant
  4. Ajouter le test à la suite permanente (régression)
  5. Documenter dans AUDIT.md
```

Jamais de modification de test pour le faire passer sans corriger le vrai problème. Jamais de désactivation de vérification.

---

## 11. Couverture de code

| Domaine | Cible | Mesure |
|---------|-------|--------|
| Core (moteurs, adaptateurs, auth) | ≥ 80% | `npm run test:coverage` |
| Fiscal (DSL, règles, calculs) | 100% | Scénarios YAML + couverture |
| API routes principales | ≥ 90% | Tests d'intégration |
| UI composants critiques | ≥ 70% | Playwright + tests composants |

---

## 12. Auto-audit de la stratégie de tests

- [x] Tests unitaires sur la logique critique (auth, calculs fiscaux, lot tracking)
- [x] Tests d'intégration sur les routes principales (API, adaptateurs, DB)
- [x] 500+ scénarios fiscaux YAML codifiés
- [x] CI/CD bloque en cas de régression fiscale
- [x] Tests de chaos sur la résilience des adaptateurs
- [x] Tests de charge (P95 < 500ms, P99 < 2s)
- [x] Tests E2E sur les parcours critiques (onboarding, dashboard, simulation)
- [x] Tests d'accessibilité (WCAG 2.1 AA)
- [x] Règle : chaque bug trouvé en audit reçoit un test de régression
- [x] Règle : jamais de modification de test pour le faire passer sans corriger le problème

**Prochaine étape :** GTM_STRATEGY.md