# OPT — Orchestrateur Patrimonial Transfrontalier

> **Résumé exécutif — 2 pages** — Pour investisseurs, partenaires et régulateurs.
> Version : 1.0 — 16 novembre 2026

---

## 1. Le problème

Les expatriés, dirigeants, crypto-riches et héritiers (HNWI) détiennent des actifs dans plusieurs pays (banques, titres, assurance-vie, immo, crypto). Aucun outil ne leur donne une **certitude fiscale et juridique** avant qu'ils prennent une décision (vente, donation, déménagement, décès).

Les brokers agrégent des comptes. Les apps B2C affichent un solde. Les RegTechs font de la conformité. Personne ne calcule l'impact fiscal *avant* l'ordre.

**Résultat :** des décisions prises à l'aveugle, des erreurs coûteuses, des optimisations manquées, une insécurité juridique permanente.

---

## 2. La solution : OPT

OPT est une plateforme hybride B2C/B2B qui produit de la **certitude fiscale et juridique actionnable**.

### Ce qu'OPT fait

- **Consolide** le patrimoine multi-devises, multi-comptes, multi-pays (via partenaires agrégateurs PSD2).
- **Calcule l'impact fiscal** de toute décision dans chaque juridiction (FR, CH, US, UK, BE, LU, SG, AE) via un **moteur de règles fiscales codifié en DSL** (YAML), testé par 500+ scénarios et révisé trimestriellement par un cabinet fiscal externe.
- **Simule "what-if"** : vente, donation, déménagement, décès, rééquilibrage — delta patrimonial net d'impact fiscal en < 2 secondes.
- **Routage d'ordres** via partenaires brokers (IBKR, Saxo, Swissquote) — **OPT ne touche jamais aux fonds** (modèle routing only, pas d'agrément PSI/PSAN requis).
- **Rapports conformes** : IFU (FR), 1099 (US), DA-1 (CH), MIFID, PRIIPs, archive horodatée eIDAS.

### Ce qu'OPT ne fait pas (lignes rouges)

- ❌ Pas de custody (pas de statut PSI/PSAN, pas de fonds clients).
- ❌ Pas de conseil en investissement personnalisé (pas d'agrément CIF — moteur = simulation générique, l'utilisateur décide).
- ❌ Pas de stockage de mots de passe, clés privées, ou données de carte bancaire en clair.
- ❌ Pas de vente de données utilisateurs. Zéro conflit d'intérêt.
- ❌ Pas de recommandation de produit financier spécifique.

---

## 3. Le moat : Tax Engine

Le cœur de la valeur est un **moteur de règles fiscales transfrontalières** codifié en DSL déclaratif (YAML), interprété — pas de logique fiscale en dur dans le code.

- 100+ règles codifiées (FR, CH, US, UK, BE, LU, SG, AE + conventions bilatérales).
- 500+ scénarios de test automatisés, CI/CD bloque en cas de régression.
- Revue externe trimestrielle par un cabinet fiscal (contrat cadre 50 k€/an).
- Explication complète de chaque résultat (règles déclenchées, sources, incertitudes).

**Avantage :** impossible à copier sans équipe juridique + dev dédiée. Les brokers n'en ont pas. Les apps B2C l'ignorent.

---

## 4. Marché et modèle économique

### Cibles

| Segment | Cible | Prix |
|---------|-------|------|
| B2C — Expatriés, dirigeants, crypto-riches, héritiers | 10 000 utilisateurs payants à 18 mois | 49 €/mois (payant), 149 €/mois (premium) |
| B2B — CGP, Family Offices, Banques Privées, Courtiers | 50 organisations à 24 mois | 299–999 €/mois + usage |

### Prévisions financières (36 mois)

| Indicateur | Valeur |
|------------|--------|
| Revenus année 3 | ~27,7 M€ |
| Trésorerie fin année 3 | ~34,2 M€ |
| Break-even | Mois 24 |
| Churn B2C ciblé | < 5% / mois |
| NRR B2B ciblé | > 110% |

### Besoin de financement

- **Pre-seed : 500 k€** — 12 mois, équipe 8 personnes, MVP B2C beta (mois 6).
- **Seed : 3 M€** — mois 18, scale B2C + B2B, version 1.0 publique (mois 18).

---

## 5. Traction et roadmap

| Jalons | Date |
|--------|------|
| MVP B2C fermé (beta payante) | Mois 6 |
| MVP B2B marque blanche | Mois 12 |
| Version 1.0 publique | Mois 18 |
| SOC2 Type II | Mois 12 |
| 10 000 utilisateurs B2C payants | Mois 18 |
| 50 organisations B2B | Mois 24 |
| Break-even | Mois 24 |

---

## 6. Conformité et sécurité

- **RGPD** : données stockées EU uniquement (OVHcloud EU / Exoscale CH), pas de transfert US sans SCC + mesures.
- **PSD2** : statut AISP via partenaire (Pas d'agrément propre).
- **MIFID II** : moteur = simulation générique, pas de conseil personnalisé.
- **LCB-FT** : KYC/AML via Sumsub / ComplyAdvantage (seuil 1 k€/mois B2C).
- **RC Pro** : 5 M€ minimum.
- **Sécurité** : chiffrement AES-256-GCM au repos, TLS 1.3 en transit, clés client-side (Web Crypto API) + HSM (Shamir 2/3), audit trail immuable (hash-chaining), SOC2 Type II visé mois 12.

---

## 7. Équipe

8 personnes : CTO/Architecte, 2 Lead Dev, 2 Fiscalistes seniors (international + successoral/RGPD), UX Designer, DevOps/SecOps, PM.

Recrutement critique semaines 1–4. Alternative : cabinet fiscal partenaire + 1 fiscaliste internalisé si recrutement difficile.

---

## 8. Pourquoi investir dans OPT

1. **Moat asymétrique** : Tax Engine codifié, testé, révisé externement — 3–5 ans d'avance.
2. **Modèle light** : pas de custody, pas d'agrément PSI/PSAN, pas de CIF — risque régulateur minimal.
3. **Flywheel** : certitude fiscale → confiance → flux → données → amélioration du moteur.
4. **Marché sous-servi** : expatriés/HNWI multi-pays, aucun acteur ne couvre la fiscalité transfrontalière de bout en bout.
5. **Éthique alignée** : zéro vente de données, zéro rétrocommission, transparence totale.

---

## 9. Contact

**OPT — Orchestrateur Patrimonial Transfrontalier**
SAS — Siège : France
Contact : [À COMPLÉTER]
Site : [À COMPLÉTER]

---

*Ce document est un résumé exécutif. Les spécifications détaillées sont disponibles dans le dépôt : SPEC_ARCHITECTURE.md, TAX_ENGINE_DSL_SPEC.yaml, ADAPTER_CONTRACTS.md, DEV_PLAN.md, TEST_STRATEGY.md, GTM_STRATEGY.md, COMPLIANCE_MATRIX.csv, FINANCIAL_MODEL.csv, INCIDENT_RESPONSE_PLAN.md.*