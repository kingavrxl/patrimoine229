# INCIDENT_RESPONSE_PLAN.md — Plan de réponse aux incidents OPT

> **Statut :** Spécification implémentable directement.
> **Propriétaire :** DevOps / SecOps (Responsable Sécurité des Systèmes d'Information - RSSI)
> **Dernière révision :** 2026-11-16
>
> Objectif : détecter, contenir, éradiquer, récupérer et communiquer sur tout incident
> de sécurité ou de disponibilité, en minimisant l'impact client et réglementaire.
> Testé régulièrement (game day mensuel).

---

## 1. Classification des incidents

| Niveau | Critère | Exemples | Temps de réponse | Escalade |
|--------|---------|----------|------------------|----------|
| **P1 — Critique** | Impact client majeur, données sensibles compromises, indisponibilité > 1h, tentative d'intrusion avérée | Fuite de données KYC, compromission clés de chiffrement, indisponibilité API > 1h, accès non autorisé aux données d'un autre utilisateur | Détection < 15 min, containment < 1h | CTO + RSSI + CEO immédiat + DPO si données perso |
| **P2 — Majeure** | Impact fonctionnel important, dégradation de performance, erreur fiscale détectée | Erreur moteur fiscal sur un calcul, latence P95 > 2s, partenaire agrégateur HS > 4h, erreur de synchronisation données | Détection < 30 min, containment < 4h | Lead Backend + CTO |
| **P3 — Mineure** | Bug fonctionnel, dégradation limitée, alerte de sécurité bloquée | Bug affichage dashboard, erreur d'un adaptateur partenaire (fallback fonctionne), avertissement de sécurité sans exploitation | Détection < 2h, containment < 8h | Lead Backend |
| **P4 — Informationnel** | Événement de sécurité sans impact, test de charge, audit de routine | Tentative de connexion échouée répétée, alerte WAF bloquée, scan de vulnérabilité sans faille | Documentation uniquement | DevOps |

---

## 2. Rôles et responsabilités

| Rôle | Responsabilités | Contact |
|------|-----------------|---------|
| **Incident Commander (IC)** | Coordination de la réponse, décision d'escalade, communication interne/externe | CTO (ou délégué) |
| **RSSI / Security Lead** | Analyse technique de l'incident de sécurité, containment, éradication | DevOps/SecOps |
| **Lead Backend** | Correction technique, restauration des services, vérification des données | Lead Backend |
| **Fiscaliste en chef** | Évaluation de l'impact fiscal si le Tax Engine est concerné | Fiscaliste |
| **DPO (Data Protection Officer)** | Évaluation RGPD, notification CNIL si nécessaire, communication aux personnes concernées | Juriste/RGPD |
| **CEO** | Communication externe (clients, partenaires, régulateurs), décisions business | CEO |
| **Communication** | Rédaction des communiqués, mises à jour statut, support client | PM |

---

## 3. Processus de réponse aux incidents (6 étapes)

### Étape 1 — Détection

Sources de détection :
- Monitoring (Grafana/Prometheus) : alertes sur disponibilité, latence, erreurs
- SIEM (Loki/Tempo) : détection d'intrusion, accès anormaux
- Audit trail (hash-chaining) : détection de modification non autorisée
- Support client : signalement d'un problème
- Partenaires : notification d'incident de leur côté
- Bug bounty / recherche externe : vulnérabilité signalée

**Tout employé qui suspecte un incident doit l'escalader immédiatement à l'IC.**

### Étape 2 — Triage et classification

L'IC classe l'incident (P1-P4) dans les 15 minutes de la détection.
- Si données personnelles potentiellement compromises → DPO impliqué immédiatement.
- Si règles fiscales potentiellement erronées → Fiscaliste impliqué immédiatement.

### Étape 3 — Containment (confinement)

Objectif : stopper la propagation, préserver les preuves.

Actions selon le type d'incident :

| Type d'incident | Action de containment |
|-----------------|----------------------|
| Compte utilisateur compromis | Désactiver le compte, révoquer les sessions, réinitialiser le mot de passe |
| Clé de chiffrement compromise | Révoquer la clé, générer une nouvelle clé, re-chiffrer les données concernées |
| Fuite de données | Isoler la base de données ou le service concerné, couper l'accès externe |
| Indisponibilité service | Basculer sur l'instance de secours, activer le cache dégradé |
| Erreur moteur fiscal | Désactiver la règle concernée, afficher un message "indisponible temporairement" |
| Partenaire compromis | Couper l'intégration avec le partenaire, activer le fallback manuel |

### Étape 4 — Éradication

- Supprimer la cause profonde (malware, accès non autorisé, code défectueux)
- Appliquer les correctifs (patch, rollback, nouvelle version)
- Vérifier que la vulnérabilité est corrigée sur tous les environnements
- Pour les incidents fiscaux : corriger la règle DSL, ajouter un test de régression, revue externe si impact client

### Étape 5 — Récupération (recovery)

- Restaurer les services à partir de sauvegardes si nécessaire (RPO < 1h, RTO < 4h)
- Vérifier l'intégrité des données (hash-chaining de l'audit trail)
- Valider que les services fonctionnent correctement (tests de fumée)
- Reprendre le service normal progressivement

### Étape 6 — Post-mortem

Dans les 48 heures après résolution :

| Élément | Contenu |
|---------|---------|
| Chronologie | Détection, triage, containment, éradication, récupération (timestamps) |
| Cause profonde | Analyse des 5 pourquoi |
| Impact | Clients concernés, données exposées, durée d'indisponibilité, impact financier estimé |
| Actions correctives | Correctifs immédiats + actions à long terme (process, technique, organisation) |
| Leçons apprises | Ce qui a bien fonctionné, ce qui peut être amélioré |
| Communication | Ce qui a été communiqué, à qui, quand |

Le post-mortem est archivé et partagé avec toute l'équipe. Un ticket est créé pour chaque action corrective avec propriétaire et échéance.

---

## 4. Communication en cas d'incident

### 4.1 Communication interne

- Canal dédié Slack : `#incidents`
- Réunion de synchronisation toutes les heures pour un P1/P2
- Compte-rendu écrit à la résolution

### 4.2 Communication externe (clients)

| Niveau | Canal | Contenu | Délai |
|--------|-------|---------|-------|
| P1 | Email + notification in-app | Nature de l'incident, impact, mesures prises, délai de résolution estimé | < 2h après détection |
| P2 | Notification in-app + email si impact client | Nature, impact, délai de résolution | < 4h après détection |
| P3 | Aucun (documenté uniquement) | — | — |

**Règle : jamais de détails techniques exposés aux clients.** Messages clairs, sans jargon, avec excuse si impact client.

### 4.3 Communication réglementaire

| Obligation | Délai | Destinataire | Contenu |
|------------|-------|--------------|---------|
| Notification CNIL (RGPD, violation de données personnelles) | 72 heures | CNIL (FR) | Nature de la violation, catégories de données, nombre de personnes concernées, mesures prises |
| Communication aux personnes concernées (RGPD) | Sans délai excessif | Utilisateurs concernés | Si risque élevé pour leurs droits et libertés |
| Notification AMF/ACPR (si requalification ou incident lié à l'activité financière) | Selon réglementation | Régulateur | Nature de l'incident, impact, mesures correctives |
| Notification partenaires | Selon contrat | Powens, IBKR, Sumsub, etc. | Si l'impact concerne leur intégration |

### 4.4 Porte-parole

Seul le CEO (ou son délégué désigné) est autorisé à communiquer officiellement à l'externe. Aucun employé ne doit communiquer sur un incident sans validation de l'IC et du CEO.

---

## 5. Données personnelles et RGPD

### 5.1 Violation de données personnelles

Si des données personnelles sont compromises :

1. **Évaluer le risque** : nature des données, nombre de personnes, probabilité de préjudice.
2. **Notifier la CNIL** dans les 72 heures si risque pour les droits et libertés des personnes.
3. **Notifier les personnes concernées** sans délai excessif si risque élevé.
4. **Documenter** la violation et les mesures prises (registre des violations).

### 5.2 Données dans les logs

**Interdit :** jamais de données personnelles (nom, email, téléphone, IBAN, numéro de compte, données fiscales) dans les logs, métriques ou traces. Si une fuite de logs se produit, elle n'expose pas de données personnelles.

---

## 6. Erreur fiscale — procédure spécifique

Si une erreur est détectée dans le Tax Engine (via test, audit, ou signalement client) :

1. **Désactiver immédiatement** la règle concernée (ou afficher un message "indisponible").
2. **Évaluer l'impact** : quels utilisateurs ont utilisé cette règle, quelles simulations sont concernées.
3. **Corriger la règle DSL** et ajouter un test de régression.
4. **Revue externe** : si l'erreur a eu un impact client, la correction doit être revue par le cabinet fiscal externe avant redéploiement.
5. **Communiquer aux utilisateurs concernés** : transparence totale sur l'erreur, l'impact et la correction.
6. **RC Pro** : évaluer si une déclaration à l'assurance RC Pro est nécessaire (impact financier potentiel).

**Signal d'alerte :** 1 réclamation client fondée sur une erreur fiscale par trimestre = révision du processus de validation des règles.

---

## 7. Récupération après incident (RPO / RTO)

| Indicateur | Cible | Mesure |
|------------|-------|--------|
| RPO (Point de récupération) | < 1 heure | Backups PITR PostgreSQL, WAL archiving continu |
| RTO (Temps de récupération) | < 4 heures | Restauration depuis backup + tests de fumée |
| Tests de restauration | Mensuel | Game day : restauration sur environnement de test |
| Disponibilité cible | ≥ 99.9% | Monitoring mensuel |

---

## 8. Plan de continuité d'activité (PCA) et reprise (PRA)

### 8.1 Scénarios de panne majeure

| Scénario | Mesure |
|----------|--------|
| Perte d'un centre de données (OVH EU) | Bascule sur Exoscale CH ou seconde zone AZ |
| Compromission complète des clés de chiffrement | Génération de nouvelles clés, re-chiffrement depuis sauvegardes, notification utilisateurs |
| Partenaire clé (agrégateur/broker) indisponible > 24h | Activation du fournisseur secondaire, fallback manuel CSV |
| Erreur fiscale systémique | Désactivation du moteur fiscal, message d'indisponibilité, revue externe avant réactivation |

### 8.2 Sauvegardes

- Backups PostgreSQL quotidiens + PITR continu (WAL archiving)
- Stockage des backups dans une région différente (EU-FR + EU-CH)
- Test de restauration mensuel (game day)
- Rétention des backups : 30 jours minimums, archives mensuelles 1 an

---

## 9. Rétrospective et amélioration continue

Après chaque incident P1/P2 :

1. Post-mortem dans les 48h.
2. Actions correctives créées comme tickets avec propriétaire et échéance.
3. Mise à jour des runbooks si nécessaire.
4. Ajout de tests de régression (chaos, unitaires, intégration) pour empêcher la récurrence.
5. Revue du plan de réponse aux incidents trimestriellement.

---

## 10. Auto-audit du plan de réponse aux incidents

- [x] Classification des incidents (P1-P4) avec critères et temps de réponse
- [x] Rôles et responsabilités définis (IC, RSSI, Lead Backend, Fiscaliste, DPO, CEO, Communication)
- [x] Processus en 6 étapes (détection, triage, containment, éradication, récupération, post-mortem)
- [x] Plan de containment par type d'incident (compte compromis, clé compromise, fuite, indisponibilité, erreur fiscale, partenaire)
- [x] Plan de communication (interne, externe clients, réglementaire CNIL/AMF/ACPR)
- [x] Délai de notification CNIL (72h) et communication aux personnes concernées
- [x] Procédure spécifique erreur fiscale (désactiver, corriger, revue externe, communiquer, RC Pro)
- [x] RPO < 1h, RTO < 4h, tests de restauration mensuels
- [x] Scénarios de panne majeure et mesures associées
- [x] Règle : pas de données personnelles dans les logs/métriques/traces
- [x] Amélioration continue (post-mortem, tickets correctifs, revue trimestrielle du plan)

**Prochaine étape :** FINANCIAL_MODEL.xlsx