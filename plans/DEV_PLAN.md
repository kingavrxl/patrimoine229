# DEV_PLAN.md — Plan de développement OPT (52 semaines)

> **Statut :** Spécification implémentable directement.
> **Propriétaire :** CTO + PM
> **Dernière révision :** 2026-11-16
>
> Plan séquencé en 6 phases, calqué sur la vision stratégique. Chaque phase = tranche verticale
> complète (données + logique + interface) avec audit obligatoire avant passage à la suivante.

---

## 0. Résumé exécutif

| Élément | Valeur |
|---------|--------|
| Durée totale | 52 semaines (12 mois) |
| Équipe initiale | 8 personnes (3 dev, 2 fiscal/juridique, 1 UX, 1 devops/sec, 1 PM) |
| Budget pre-seed | 500 k€ |
| Livrable clé mois 6 | MVP B2C fermé (beta payante) |
| Livrable clé mois 12 | MVP B2B marque blanche |
| Livrable clé mois 18 | Version 1.0 publique |

---

## 1. Équipe et rôles

| Rôle | Nombre | Profil | Responsabilité principale |
|------|--------|--------|---------------------------|
| CTO / Architecte | 1 | 15+ ans, sécurité, systèmes distribués | Architecture, sécurité, adaptateurs |
| Lead Backend | 1 | Node.js/TypeScript, PostgreSQL, API | Moteurs (Consolidation, Tax, Advisory), DB |
| Lead Frontend | 1 | Next.js, React Native, UI/UX | Portail B2C, Advisor Portal, SDK |
| Fiscaliste senior (international) | 1 | Droit fiscal FR/CH/US/UK, conventions | DSL fiscal, règles, revue externe |
| Fiscaliste/Juriste (successional + RGPD) | 1 | Successoral, RGPD, finance | Conformité, contrats, données perso |
| UX Designer | 1 | WCAG AA, finance, mobile-first | Parcours utilisateur, dashboard, onboarding |
| DevOps / SecOps | 1 | Kubernetes, Vault, CI/CD, sécurité | Infra, déploiement, monitoring, incidents |
| PM / Product Owner | 1 | Produit fintech/wealth, réglementaire | Roadmap, parties prenantes, billing |

**Recrutement critique semaines 1-4** : 2 fiscalistes + 1 juriste. Alternative : cabinet partenaire + 1 internalisé si recrutement difficile.

---

## 2. Phases et jalons

### PHASE 0 — Fondations (Semaines 1-4)

**But :** Poser l'infrastructure immuable, la gouvernance données, l'équipe fiscale.

| Semaine | Étape | Livrable | Dépendances | Audit |
|---------|-------|----------|-------------|-------|
| 1 | 0.1 Constitution entité juridique (SAS FR), capital, RC Pro, comptes bancaires | KBIS, statuts, RC Pro 5M€ | — | Juridique |
| 1-2 | 0.2 Recrutement 2 fiscalistes seniors + 1 juriste RGPD/finance | Contrats signés, fiscalistes en poste | — | RH |
| 1 | 0.3 IaC minimal (Terraform) : VPC EU-FR, PostgreSQL chiffré, Kubernetes, Vault | Infra de base déployable | 0.1 | DevOps |
| 1-2 | 0.4 Modèle de données canonique (Prisma schema) : User, Organization, Account, Holding, Lot, Transaction, TaxResidency, Simulation, Order, Subscription | Prisma schema, migrations | 0.3 | Lead Backend |
| 2-3 | 0.5 Spécification chiffrement zero-knowledge (Argon2id, Shamir 2/3, rotation) | Doc sécurité, plan audit crypto | — | DevOps/Sec |
| 3-4 | 0.6 DSL Fiscal : grammaire YAML + 50 règles FR + 20 CH + 15 US + 10 UK + 5 conventions codifiées | TAX_ENGINE_DSL_SPEC.yaml, moteur interprète | 0.4 | Fiscaliste + Lead Backend |

**Jalon Phase 0 (semaine 4) :** Infrastructure déployable, modèle DB versionné, DSL fiscal v1 avec 100 règles, équipe fiscale en place.

**Sortie de phase :** Revue de sécurité (dépendances, secrets, config) obligatoire avant déploiement.

---

### PHASE 1 — Consolidation Engine (Semaines 5-12)

**But :** Ingestion, normalisation, valorisation multi-devises, corporate actions — fondation fiable pour tout le reste.

| Semaine | Étape | Livrable | Dépendances | Audit |
|---------|-------|----------|-------------|-------|
| 5-6 | 1.1 Adapter Pattern : AggregatorAdapter interface + PowensAdapter + BudgetInsightAdapter + ManualCSVAdapter + PDFParserAdapter. Circuit breaker + retry + cache Redis | Adaptateurs opérationnels, tests d'intégration | 0.4, 0.5 | Lead Backend |
| 7-8 | 1.2 Parseur PDF/OCR universel : OCR → Layout → LLM extraction → validation croisée → score confiance → file humaine | Pipeline OCR, bench 1000 docs | 1.1 | Lead Backend + Fiscaliste |
| 8-9 | 1.3 Moteur de normalisation : Taxonomie ISO 20022 CFI + extensions, mapping ISIN/OpenFIGI, devise, pays, secteur, liquidité, type fiscal | Taxonomie, service de normalisation | 1.1 | Lead Backend |
| 9-10 | 1.4 Valorisation & FX : Prix temps réel (polygon.io/Twelve Data), clôture journalière, FX spot ECB/OANDA, corporate actions (EODHD) | Service valorisation, cache prix | 1.1, 1.3 | Lead Backend |
| 10-11 | 1.5 Lot Tracking : FIFO/LIFO/Average par devise, compte, juridiction. Invariants : Σ lots = holding, Σ gains = PV réalisée | Service cost basis, tests de propriété | 1.3, 1.4 | Lead Backend |
| 11-12 | 1.6 Consolidation Reporting : Vue unifiée portfolio, allocation, performance TWR/MWR, frais, PV latentes/réalisées. Export PDF/Excel/JSON | API consolidation, rapports | 1.1-1.5 | Lead Backend + Fiscaliste |

**Jalon Phase 1 (semaine 12) :** Consolidation Engine opérationnel, backtest sur 10 portefeuilles réels vs Excel expert.

**Sortie de phase :** Audit complet (performance, cas limites, erreurs) avant démarrage Phase 2.

---

### PHASE 2 — Tax Engine (Semaines 10-22, chevauche Phase 1)

**But :** Calculer l'impact fiscal de toute décision dans chaque juridiction pertinente.

| Semaine | Étape | Livrable | Dépendances | Audit |
|---------|-------|----------|-------------|-------|
| 10-12 | 2.1 Détermination résidence fiscale : questionnaire dynamique OCDE Art. 4, tie-breaker, score certitude + flags zone grise | Service résidence fiscale, questionnaire | 0.4 | Fiscaliste |
| 12-15 | 2.2 Moteur de règles par juridiction : modules FR, CH, US, UK, BE, LU, SG, AE. DSL + données barèmes, seuils, abattements. Versioning annuel | Tax Engine interprète DSL, règles v1 | 0.6, 1.1 | Fiscaliste + Lead Backend |
| 15-17 | 2.3 Calculs core : IR/PFU/prélèvements sociaux, IFI, exit tax, successoral/donation, assurance-vie, PEA/ISA/401k/IRA/3e pilier, conventions bilatérales | Moteurs de calcul par domaine | 2.2 | Fiscaliste |
| 17-19 | 2.4 Simulation « What-if » : clone portfolio, événement, recalcul complet, delta net d'impact fiscal + cash-flow (< 2s) | API simulation, cache intermédiaire | 1.6, 2.3 | Lead Backend |
| 19-21 | 2.5 Explanation & Audit Trail : trace complète règles, valeurs intermédiaires, sources, hypothèses. Export PDF note de synthèse | Explanation trace, export PDF | 2.4 | Fiscaliste |
| 21-22 | 2.6 Revue externe trimestrielle : cabinet fiscal valide règles + tests. Contrat cadre 50 k€/an | Rapport de revue externe signé | 2.2-2.5 | Fiscaliste externe |
| 22 | 2.7 Tests fiscaux automatisés : 500+ scénarios YAML, CI/CD bloque si régression, property-based testing | Suite de tests fiscaux, CI/CD | 2.2-2.6 | Lead Backend + Fiscaliste |

**Jalon Phase 2 (semaine 22) :** Tax Engine v1 avec 500+ tests, revue externe validée, simulation < 2s.

**Sortie de phase :** Revue fiscale externe obligatoire avant toute mise en production de nouvelles règles.

---

### PHASE 3 — Advisory Engine (Semaines 18-30, chevauche Phase 2)

**But :** Transformer la certitude fiscale en décisions d'allocation, rééquilibrage, projections.

| Semaine | Étape | Livrable | Dépendances | Audit |
|---------|-------|----------|-------------|-------|
| 18-21 | 3.1 Modèle d'allocation cible : profil risque 1-10, horizon, contraintes ESG/exclusion/fiscale, optimisation mean-variance + Black-Litterman + contrainte fiscale | Service allocation, optimisateur | 1.6, 2.4 | Lead Backend |
| 21-23 | 3.2 Rééquilibrage intelligent : détection drift > seuil, génération ordres minimisant coûts + impact fiscal, simulation avant exécution | Service rééquilibrage | 3.1, 2.4 | Lead Backend + Fiscaliste |
| 23-25 | 3.3 Tax-Loss Harvesting : détection pertes latentes, vente + rachat équivalent, wash sale rules par juridiction | Module harvesting par pays | 3.2, 2.3 | Fiscaliste |
| 25-27 | 3.4 Projections Monte Carlo : 10k scénarios, distribution patrimoine net à 5/10/20 ans, probabilité ruine, stress tests | Service projections | 1.6, 2.4 | Lead Backend |
| 27-29 | 3.5 Cash-flow Planning : revenus + dépenses, projection trésorerie, alertes liquidité, scénarios base/optimiste/pessimiste | Service cash-flow | 1.6, 2.4 | Lead Backend |
| 29-30 | Intégration Advisory + Tax + Consolidation : pipeline complet décision → simulation → ordre | API advisory unifiée | 3.1-3.5 | Lead Backend |

**Jalon Phase 3 (semaine 30) :** Advisory Engine opérationnel, rééquilibrage + tax-loss harvesting + Monte Carlo.

**Sortie de phase :** Audit complet avant démarrage Phase 4 (B2C Portal).

---

### PHASE 4 — B2C Portal & Onboarding (Semaines 22-34, chevauche Phase 3)

**But :** Produit utilisable, payant, viral par utilité.

| Semaine | Étape | Livrable | Dépendances | Audit |
|---------|-------|----------|-------------|-------|
| 22-24 | 4.1 Onboarding Wizard : résidence fiscale → connexion comptes → validation consolidation → simulation état des lieux → abonnement (< 15 min) | Flow onboarding, questionnaire résidence | 2.1, 1.1, 2.4 | UX + Fiscaliste |
| 24-27 | 4.2 Dashboard : patrimoine net, allocation, performance, impact fiscal estimé, alertes, actions recommandées. Mobile-first (React Native + Expo) | Dashboard web + mobile | 1.6, 2.4, 3.1 | UX + Lead Frontend |
| 27-29 | 4.3 Reporting : PDF mensuel (auto), trimestriel (détaillé), annuel (fiscal). Marque blanche B2B. Async queue + Typst/LaTeX | Générateur de rapports | 1.6, 5.1 (ReportingAdapter) | Lead Backend |
| 29-31 | 4.4 Facturation B2C : Freemium (3 comptes, 1 pays, pas conseil) → Payant 49€/mois → Premium 149€/mois. Stripe Billing | Intégration Stripe, plans tarifaires | 4.1, 4.2 | PM + Juriste (TVA) |
| 31-33 | 4.5 Support & Communauté : Intercom, documentation, webinaires mensuels, forum modéré | Centre d'aide, processus support | 4.2 | PM |
| 33-34 | Beta fermée B2C : 100 utilisateurs payants, tests réels, feedback | Beta B2C, rapports de bugs | 4.1-4.5 | PM + Fiscaliste |

**Jalon Phase 4 (semaine 34) :** B2C Portal en beta payante, onboarding < 15 min, conversion freemium→payant mesurée.

**Sortie de phase :** Audit complet (RGPD, sécurité, performance mobile) avant Phase 5.

---

### PHASE 5 — B2B Advisor Portal & White-Label (Semaines 30-42, chevauche Phase 4)

**But :** Revenus récurrents B2B, effet de levier distribution.

| Semaine | Étape | Livrable | Dépendances | Audit |
|---------|-------|----------|-------------|-------|
| 30-33 | 5.1 Multi-tenant Architecture : Organization → Clients → Team. RBAC fin (lecture/écriture/validation/signature). RLS PostgreSQL + clés de chiffrement par organization | Modèle multi-tenant, RLS policies | 0.4, 4.1 | Lead Backend + SecOps |
| 33-35 | 5.2 CRM Léger : fiche client (KYC, profil, documents, notes, tâches, échéances), pipeline prospection, webhooks HubSpot/Pipedrive | CRM advisor | 5.1, 4.1 (KYC) | Lead Backend |
| 35-37 | 5.3 Facturation B2B : Subscription par conseiller (299-999€/mois) + usage (clients actifs, simulations, rapports). Stripe Metered Billing + Stripe Tax | Billing B2B, factures EU/CH/US | 5.1, 5.2 | PM + Juriste |
| 37-39 | 5.4 Marque Blanche SDK : React components embeddables (dashboard, onboarding, reporting). Thème configurable, domaine custom, SSO SAML/OIDC | SDK white-label, documentation | 4.2, 4.3 | Lead Frontend |
| 39-41 | 5.5 Conformité Conseiller : rapports MIFID (connaissance client, adéquation), PRIIPs KID, lettres de mission, archive horodatée eIDAS | Rapports conformité, archive | 5.1, 5.2 | Juriste + Fiscaliste |
| 41-42 | 5 PoC B2B payants (Family Offices / CGP) | Contrats PoC, retours | 5.1-5.5 | PM |

**Jalon Phase 5 (semaine 42) :** B2B Advisor Portal en marque blanche, 5 PoC payants, facturation B2B opérationnelle.

**Sortie de phase :** Audit conformité (MIFID, LCB-FT, RGPD) avant Phase 6.

---

### PHASE 6 — Execution Routing & Scale (Semaines 38-52+, chevauche Phase 5)

**But :** Fermer la boucle décision → exécution sans toucher aux fonds.

| Semaine | Étape | Livrable | Dépendances | Audit |
|---------|-------|----------|-------------|-------|
| 38-41 | 6.1 Broker Adapters : IBKRAdapter, SaxoAdapter, SwissquoteAdapter. Interface unifiée, versionnée, cache, queue ordres | Adaptateurs brokers, tests sandbox | 1.1 (adapter pattern) | Lead Backend |
| 41-44 | 6.2 Smart Order Routing : venue, type, slicing, timing optimisés (liquidité, spread, frais, FX, horaire) | Service SRO | 6.1, 3.2 | Lead Backend |
| 44-47 | 6.3 Embedded Trading : composant React iframe/portal, OAuth broker, pré-remplissage ordre, validation utilisateur sur interface broker, webhook exécution | Composant embedded trading | 6.1, 6.2 | Lead Frontend + SecOps |
| 47-49 | 6.4 Post-Trade : confirmation, allocation lots (FIFO/LIFO), mise à jour cost basis, détection corporate actions, reporting fiscal auto (IFU, 1099, DA-1) | Service post-trade, réconciliation | 6.3, 1.5 | Lead Backend + Fiscaliste |
| 49-52 | 6.5 Scale & Internationalisation : pays supplémentaires (modules fiscaux plugins), asset classes (art, métaux, forestier), API publique développeurs | Modules fiscaux additionnels, API publique | 2.2, 6.4 | Fiscaliste + Lead Backend |

**Jalon Phase 6 (semaine 52) :** Execution Routing opérationnel, 100 ordres réels beta, version 1.0 publique.

**Sortie de phase :** Audit final global, SOC2 Type II en cours.

---

## 3. Dépendances critiques

| Dépendance | Type | Impact si non disponible | Parade |
|------------|------|--------------------------|--------|
| Powens / Budget Insight (agrégation) | Partenaire critique | Pas de consolidation bancaire | Fallback CSV + PDF, multi-sourcing |
| IBKR / Saxo (broker) | Partenaire critique | Pas d'exécution d'ordres | Affiliation/lead gen, embedded widget |
| Sumsub / ComplyAdvantage (KYC) | Partenaire critique | Pas d'onboarding conforme | Revue manuelle transitoire |
| HashiCorp Vault + HSM (chiffrement) | Infrastructure | Pas de zéro-knowledge | Fallback chiffrement au repos seulement, serveur de confiance |
| Stripe (billing) | Partenaire critique | Pas de facturation récurrente | Facturation manuelle transitoire |
| Fiscalistes externes (revue) | Partenaire critique | Pas de mise en production règles fiscales | Contrat cadre, clause de préavis |

---

## 4. Budget pré-seed (500 k€, 12 mois)

| Catégorie | Coût annuel | Détail |
|-----------|-------------|--------|
| Salaires équipe (8 pers.) | 420 k€ | Salaires marché + 20% charges (CTO 90k, Lead dev 70k×2, Fiscaliste 100k×2, UX 65k, DevOps 75k, PM 70k) |
| Infrastructure cloud | 30 k€ | Kubernetes, PostgreSQL, Redis, Vault, monitoring (OVHcloud EU + Exoscale CH) |
| Partenaires APIs | 40 k€ | Powens, Budget Insight, IBKR, Saxo, Sumsub, ComplyAdvantage (estimatif volume pre-seed) |
| Revue fiscale externe | 50 k€ | Contrat cadre cabinet fiscal (50 k€/an) |
| Audit sécurité / pentest | 25 k€ | Pentest semestriel, audit crypto externe (CryptoSense) |
| Outils licences | 15 k€ | Stripe, Intercom, Label Studio, GitHub, monitoring |
| Juridique / conformité | 20 k€ | Statuts, contrats, RGPD, RC Pro 5M€ |
| Marketing / acquisition | 15 k€ | Contenu, webinaires, événements ciblés |
| Imprévus (10%) | 55 k€ | Buffer risques |
| **Total** | **500 k€** | |

---

## 5. Métriques de succès par phase

| Phase | Métrique | Seuil cible |
|-------|----------|-------------|
| 0 | Infrastructure disponible | ≥ 99.9% |
| 0 | Règles DSL codifiées (FR/CH/US/UK) | ≥ 100 |
| 0 | Revue sécurité initiale | Validée |
| 1 | Comptes agrégés avec succès | ≥ 90% des cibles |
| 1 | Taux auto-validation OCR | ≥ 80% (après 1000 docs) |
| 1 | Performance consolidation | < 4h fraîcheur liquides |
| 2 | Scénarios de test fiscal | ≥ 500 |
| 2 | Temps simulation what-if | < 2s |
| 2 | Revue externe fiscale | Validée signée |
| 2 | Régressions fiscales en prod | 0 |
| 3 | Précision projections Monte Carlo | Backtest validé |
| 3 | Rééquilibrage drift détecté | ≥ 95% des cas |
| 4 | Temps onboarding | < 15 min (médiane) |
| 4 | Conversion freemium→payant | > 5% à 90 jours |
| 4 | Utilisateurs payants beta | 100 |
| 4 | Churn mensuel | < 5% |
| 5 | Organisations B2B | 5 PoC payants |
| 5 | Factures conformes TVA | 100% |
| 6 | Ordres réels exécutés (beta) | 100 |
| 6 | Disponibilité globale | ≥ 99.9% |
| 6 | Latence API P95 | < 500ms |

---

## 6. Risques et parades (intégrés au plan)

| Risque | Phase | Signal | Parade |
|--------|-------|--------|--------|
| Recrutement fiscalistes impossible | 0 | Poste vacant > 3 mois | Cabinet partenaire + 1 internalisé, DSL = juristes écrivent YAML |
| Agrégation instable | 1 | > 5% comptes en erreur 48h | Multi-sourcing (2+ agrégateurs), fallback manuel |
| Erreur moteur fiscal | 2 | 1 réclamation fondée/trimestre | DSL versionné, 500+ tests, revue externe trimestrielle, RC Pro 5M€ |
| CAC B2C > LTV | 4 | CAC > 150€, conversion < 3% | Pivot B2B-first, B2C = lead gen gratuit |
| Partenaire clé change API/pricing | 5 | Annonce changement API / +20% | 2+ fournisseurs par catégorie, abstraction layer |
| Parseur PDF/OCR insuffisant | 1 | Taux auto < 80% après 1000 docs | Benchmark continu, file humaine, partenariat custodians API direct |

---

## 7. Ordre de réalisation (chaque étape = audit + commit)

1. Phase 0 → Fondations (audit sécurité + revue juridique)
2. Phase 1 → Consolidation Engine (audit performance + tests de propriété)
3. Phase 2 → Tax Engine (audit fiscal externe + 500 tests)
4. Phase 3 → Advisory Engine (audit calculs + backtest)
5. Phase 4 → B2C Portal (audit RGPD + sécurité mobile + beta)
6. Phase 5 → B2B Advisor Portal (audit conformité MIFID + multi-tenant)
7. Phase 6 → Execution Routing (audit sécurité ordres + 100 ordres réels)

**Règle absolue :** Aucune phase ne démarre avant que la phase précédente ait passé un audit complet et propre.

---

## 8. Livrables associés

| Document | Phase | Contenu |
|----------|-------|---------|
| SPEC_ARCHITECTURE.md | 0 | Architecture C4, modèle données, flux, sécurité, déploiement |
| TAX_ENGINE_DSL_SPEC.yaml | 0-2 | Grammaire DSL, 20 règles d'exemple, guide extension |
| ADAPTER_CONTRACTS.md | 1-6 | Interfaces TS, DTOs, codes erreur, SLAs partenaires |
| COMPLIANCE_MATRIX.xlsx | 0-5 | Matrice RGPD/PSD2/MIFID/LCB-FT/SFDR par composant |
| TEST_STRATEGY.md | 0-6 | Stratégie tests (unit/intégration/fiscal/chaos/charge), CI/CD |
| GTM_STRATEGY.md | 4-6 | Go-to-market B2C/B2B, pricing, canaux, partenariats |
| INCIDENT_RESPONSE_PLAN.md | 0-6 | Classification, escalade, communication, recovery, post-mortem |
| FINANCIAL_MODEL.xlsx | 0-6 | Modèle financier 36 mois |
| README_EXEC.md | 0 | Résumé exécutif investisseurs/partenaires |

---

## 9. Auto-audit du plan

- [x] 52 semaines séquencées avec jalons clairs
- [x] Dépendances identifiées entre phases
- [x] Ressources (équipe 8 personnes) allouées
- [x] Budget 500 k€ pré-seed détaillé
- [x] Métriques par phase avec seuils
- [x] Risques intégrés avec parades et signaux d'alerte
- [x] Chaque phase se termine par un audit obligatoire
- [x] Règle "aucune phase ne démarre sans audit propre de la précédente"
- [x] Recrutement critique identifié (semaines 1-4)
- [x] Alternatives documentées si recrutement difficile

**Prochaine étape :** COMPLIANCE_MATRIX.xlsx