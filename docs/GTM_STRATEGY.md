# GTM_STRATEGY.md — Go-to-Market OPT

> **Statut :** Spécification implémentable directement.
> **Propriétaire :** PM / Chief Revenue Officer (à recruter)
> **Dernière révision :** 2026-11-16
>
> Positionnement : la couche d'intelligence fiscale au-dessus des custodians et brokers.
> Pas « agréger des comptes » — « produire de la certitude fiscale actionnable ».

---

## 1. Positionnement

### 1.1 Proposition de valeur

| Cible | Problème | Solution OPT | Bénéfice |
|-------|----------|--------------|----------|
| Expatriés / HNWI | Incertitude fiscale multi-pays, décisions prises à l'aveugle | Simulation fiscale avant chaque décision (vente, donation, déménagement) | Certitude, moins d'impôts, moins de stress |
| CGP / Family Offices | Pas d'outil fiscal transfrontalier pour leurs clients | Marque blanche + moteur fiscal + rapports conformes | Différenciation, rétention clients, nouveau revenu |
| Banques Privées / Courtiers | Pas de couche conseil fiscal intégrée | SDK embeddable, routing d'ordres sans custody | Plus de flux, plus de données |

### 1.2 Moat asymétrique

- **Tax Engine codifié en DSL** : 500+ scénarios de test, revue externe trimestrielle. 3-5 ans d'avance sur les brokers et apps B2C qui ignorent la fiscalité.
- **Flywheel** : certitude fiscale → confiance → flux → données → amélioration du moteur.
- **Zéro conflit d'intérêt** : pas de rétrocommission, pas de vente de données, pas de custody.

### 1.3 Pays cibles initiaux (85% de la cible)

FR, CH, US, UK, BE, LU, SG, AE — couverts par le Tax Engine v1.

---

## 2. Pricing

### 2.1 B2C — Freemium à payant

| Plan | Prix | Fonctionnalités | Cible |
|------|------|-----------------|-------|
| Freemium | 0 € | 3 comptes max, 1 pays, pas de conseil fiscal, pas de projections | Découverte |
| Payant | 49 €/mois | Comptes illimités, tous pays cibles, conseil fiscal (simulation), projections Monte Carlo, reporting mensuel | Expatriés, dirigeants |
| Premium | 149 €/mois | Payant + expert humain (réview fiscale), API personnelle, family sharing (5 utilisateurs), support prioritaire | HNWI, crypto-riches, héritiers |

**Facturation :** Stripe Billing (recurring, metered pour usage avancé).

**Test de conversion :** freemium → payant > 5% à 90 jours.

### 2.2 B2B — Marque blanche

| Plan | Prix | Fonctionnalités | Cible |
|------|------|-----------------|-------|
| Starter | 299 €/mois | 10 clients, dashboard conseiller, rapports mensuels, marque blanche de base | CGP indépendants |
| Pro | 599 €/mois | 50 clients, rééquilibrage intelligent, tax-loss harvesting, rapports MIFID, SSO | CGP, Family Offices |
| Enterprise | 999 €/mois | Clients illimités, API publique, domaine custom, support dédié, SLA | Banques Privées, Courtiers |

**Usage additionnel (metered) :** clients actifs au-delà du forfait, simulations supplémentaires, rapports additionnels.

**Facturation :** Stripe Metered Billing + Stripe Tax (TVA EU/CH/US).

**Objectif :** 50 organisations à 24 mois, ARR > 2M€, NRR > 110%.

---

## 3. Canaux d'acquisition B2C

### 3.1 Contenu et SEO

- **Webinaires mensuels** : « Fiscalité des expatriés », « Exit tax France », « Donation transfrontalière » — animés par les fiscalistes OPT.
- **Articles de blog** : guides pratiques par pays (FR, CH, US, UK…), cas concrets, simulations commentées.
- **SEO local/international** : mots-clés « fiscalité expatrié », « déclaration impôts expatrié », « plus-values mobilier international ».
- **Newsletter** : actualité fiscale transfrontalière, simulations du mois.

### 3.2 Partenaires de prescription

- **CGP et Family Offices** : ils conseillent déjà les expatriés/HNWI → OPT comme outil de démonstration de leur expertise.
- **Avocats fiscalistes** : renvoient leurs clients vers OPT pour la simulation avant décision.
- **Comptables internationaux** : même logique.

### 3.3 Publicité ciblée

- LinkedIn (CGP, dirigeants, expatriés)
- Google Ads (mots-clés fiscalité internationale)
- Publicité dans les médias expatriés (lepetitjournal.com, etc.)

### 3.4 Viralité par utilité

- Partage d'une simulation « état des lieux » avec son conseiller
- Invitation de membres de la famille (family sharing Premium)
- Témoignages clients (réels, pas de faux)

---

## 4. Canaux d'acquisition B2B

### 4.1 PoC payants (mois 3-6)

- 5 Family Offices / CGP sélectionnés
- Offre : 3 mois gratuits puis tarif préférentiel
- Objectif : valider l'appétence marque blanche, recueillir des témoignages

### 4.2 Événements professionnels

- Salons gestion de patrimoine (Patrimoine 2026, etc.)
- Conférences fiscalistes internationaux
- Webinaires pour conseillers

### 4.3 Partenaires distributeurs

- Banques Privées : marque blanche pour leurs clients expatriés
- Courtiers en ligne : intégration SDK embedded
- Plateformes de Family Office : intégration API

### 4.4 Vente directe

- Équipe commerciale B2B (à recruter mois 12)
- Ciblage : CGP avec > 50 clients, Family Offices > 50M€ AUM

---

## 5. Contenu et éditorial

### 5.1 Règles éditoriales

- Aucun lorem ipsum, aucun faux témoignage, aucun faux chiffre présenté comme réel.
- Textes concrets, spécifiques à l'activité expatrié/HNWI.
- Transparence totale : hypothèses, sources, incertitudes affichées sur chaque simulation.
- Clause « indicatif » sur chaque simulation fiscale : non opposable à l'administration fiscale.
- Langue : 8 langues (FR, EN, DE, IT, ES, PT, AR, ZH) — WCAG 2.1 AA.

### 5.2 Calendrier éditorial (premiers 6 mois)

| Mois | Thème | Format | Cible |
|------|-------|--------|-------|
| 1 | Lancement OPT, présentation du moteur fiscal | Communiqué, article blog | B2C + B2B |
| 2 | Fiscalité des expatriés FR → CH | Webinaire + article | B2C |
| 3 | Exit tax France (Art. 167 bis) | Guide pratique + simulation | B2C |
| 4 | Donation transfrontalière | Webinaire + article | B2C + B2B |
| 5 | Fiscalité crypto pour expatriés | Article + webinaire | B2C |
| 6 | Offre B2B marque blanche | Communiqué, événements | B2B |

---

## 6. Partenariats

### 6.1 Partenaires techniques (déjà identifiés dans la mission)

| Partenaire | Rôle | Statut |
|------------|------|--------|
| Powens / Budget Insight | Agrégation bancaire (PSD2 AISP) | À contracter |
| IBKR / Saxo / Swissquote | Order routing broker | À contracter |
| Sumsub / ComplyAdvantage | KYC/AML | À contracter |
| SteelEye | RegTech, surveillance transactions | À contracter |
| Stripe | Facturation, TVA transfrontalière | À contracter |
| OVHcloud / Exoscale CH | Infrastructure EU | À contracter |
| HashiCorp Vault + HSM | Gestion des clés | À contracter |

### 6.2 Partenaires de prescription (à développer)

- Cabinets de conseil en gestion de patrimoine
- Avocats fiscalistes internationaux
- Comptables spécialisés expatriés
- Banques Privées (canal de distribution)

### 6.3 Partenaires de contenu

- Médias expatriés
- Associations de Français à l'étranger
- Écoles de commerce / universités (recherche fiscalité internationale)

---

## 7. Métriques de suivi GTM

### 7.1 B2C

| Métrique | Seuil cible | Fréquence |
|----------|-------------|-----------|
| Utilisateurs payants à 18 mois | 10 000 | Mensuel |
| MRR à 18 mois | > 500 k€ | Mensuel |
| Churn mensuel | < 5% | Mensuel |
| NPS | > 50 | Trimestriel |
| Conversion freemium → payant (90 jours) | > 5% | Mensuel |
| Temps onboarding (médiane) | < 15 min | Mensuel |
| Taux de couverture agrégation | > 90% comptes cibles | Mensuel |

### 7.2 B2B

| Métrique | Seuil cible | Fréquence |
|----------|-------------|-----------|
| Organisations B2B à 24 mois | 50 | Mensuel |
| ARR B2B à 24 mois | > 2M€ | Mensuel |
| NRR (Net Revenue Retention) | > 110% | Trimestriel |
| PoC payants (mois 3-6) | 5 | Mensuel |

### 7.3 Réglementaire

| Métrique | Seuil cible | Fréquence |
|----------|-------------|-----------|
| Sanctions / mises en demeure | 0 | Continu |
| SOC2 Type II | Obtenu mois 12 | Mensuel (suivi) |
| Revue fiscale externe | Trimestrielle, validée | Trimestriel |
| RC Pro 5M€ | Maintenue | Annuel |

---

## 8. Calendrier de lancement

| Mois | Jalon B2C | Jalon B2B |
|------|-----------|-----------|
| 3-6 | Beta fermée B2C (100 utilisateurs payants) | 5 PoC B2B payants |
| 6 | Lancement B2C ouvert (freemium + payant) | — |
| 12 | — | MVP B2B marque blanche |
| 18 | Version 1.0 publique B2C | — |
| 24 | — | 50 organisations B2B, ARR > 2M€ |

---

## 9. Risques GTM et parades

| Risque | Signal | Parade |
|--------|--------|--------|
| CAC B2C > LTV | CAC > 150€, conversion < 3% | Pivot B2B-first, B2C = lead gen gratuit |
| Adoption B2B lente | < 3 PoC à mois 6 | Renforcer partenaires de prescription, baisser le prix d'entrée |
| Confiance clients faible | NPS < 30, churn > 8% | Revue fiscale externe visible, transparence totale, support expert |
| Concurrence gros acteur | Lancement concurrent avec moteur fiscal | Moat fiscal 3-5 ans, focus niche expatriés/HNWI, partenaires conseillers |

---

## 10. Ce que nous ne faisons pas (anti-GTM)

- ❌ Pas de vente de données utilisateurs
- ❌ Pas de rétrocommission sur produits financiers
- ❌ Pas de recommandation de produit spécifique (pas d'agrément CIF)
- ❌ Pas de paiement en ligne sur le site B2C (pas de custody)
- ❌ Pas de faux témoignages ni de faux chiffres
- ❌ Pas de dark patterns (compteur de stock faux, urgence inventée)

**Prochaine étape :** INCIDENT_RESPONSE_PLAN.md