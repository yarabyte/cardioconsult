# Recette locale — module par module

Document de **test manuel** en local (données **synthétiques uniquement**).  
Renseigner les colonnes **Résultat**, **Date**, **Testeur**, **Notes** au fur et à mesure.

> Ne jamais coller de données patients réelles dans ce fichier, les tickets ou les captures.

---

## Comment remplir

| Valeur    | Signification                                |
| --------- | -------------------------------------------- |
| `OK`      | Critère vérifié                              |
| `KO`      | Échec (décrire dans Notes)                   |
| `N/A`     | Hors périmètre / non testé aujourd’hui       |
| `PARTIEL` | Fonctionne avec réserve (Notes obligatoires) |

**Environnement attendu :** Postgres `cc_control` joignable, `NEXT_PUBLIC_APP_ENV=development`, puis `pnpm db:migrate:control` + `pnpm db:seed`. Compte : `c.martin@cabinet-martin.fr` / `motdepasse-demo-12` (MFA TOTP à enrôler).

**Hôtes :**

| URL                             | Rôle                  |
| ------------------------------- | --------------------- |
| http://localhost:3000           | Site public           |
| http://dr-martin.localhost:3000 | Cabinet (tenant démo) |
| http://console.localhost:3000   | Console plateforme    |
| http://localhost:8025           | Mailpit               |
| http://localhost:9001           | MinIO                 |

---

## 0. Préparation machine

| #   | Contrôle                                                                  | Résultat | Date | Testeur | Notes |
| --- | ------------------------------------------------------------------------- | -------- | ---- | ------- | ----- |
| 0.1 | Node 22+, pnpm 9 installés                                                |          |      |         |       |
| 0.2 | `cp .env.example .env.local` puis secrets ≥ 32 car. pour `APP_SECRET`     |          |      |         |       |
| 0.3 | `pnpm install` OK                                                         |          |      |         |       |
| 0.4 | `pnpm compose:up` (Postgres, MinIO, Gotenberg, ClamAV, Mailpit)           |          |      |         |       |
| 0.5 | `pnpm db:migrate:control` OK                                              |          |      |         |       |
| 0.6 | `pnpm db:seed` (tenant dr-martin + patients fictifs)                      |          |      |         |       |
| 0.7 | `pnpm dev` démarre sans erreur                                            |          |      |         |       |
| 0.8 | `pnpm lint` / `pnpm typecheck` / `pnpm test` (optionnel avant recette UI) |          |      |         |       |

---

## P01 — Socle

| #   | Contrôle                                                     | Résultat | Date | Testeur | Notes |
| --- | ------------------------------------------------------------ | -------- | ---- | ------- | ----- |
| 1.1 | http://localhost:3000 charge le site public                  |          |      |         |       |
| 1.2 | http://dr-martin.localhost:3000 résout le cabinet            |          |      |         |       |
| 1.3 | http://console.localhost:3000 résout la console              |          |      |         |       |
| 1.4 | En-têtes sécurité présents (CSP, nosniff) — DevTools Network |          |      |         |       |
| 1.5 | Pas de secret dans le dépôt (`.env.local` non versionné)     |          |      |         |       |

---

## P02 — Bases & provisioning

| #   | Contrôle                                              | Résultat | Date | Testeur | Notes |
| --- | ----------------------------------------------------- | -------- | ---- | ------- | ----- |
| 2.1 | Postgres joignable (compose)                          |          |      |         |       |
| 2.2 | Seed : patients synthétiques visibles après démarrage |          |      |         |       |
| 2.3 | MinIO accessible (9001)                               |          |      |         |       |
| 2.4 | Aucune donnée nominative réelle dans les seeds        |          |      |         |       |

---

## P03 — Authentification

| #   | Contrôle                                                      | Résultat | Date | Testeur | Notes |
| --- | ------------------------------------------------------------- | -------- | ---- | ------- | ----- |
| 3.1 | Page `/connexion` accessible sur le tenant                    |          |      |         |       |
| 3.2 | Mode démo : changement de rôle sans MFA réelle (si sélecteur) |          |      |         |       |
| 3.3 | Pro Santé Connect affiché désactivé / non simulé              |          |      |         |       |
| 3.4 | Mot de passe oublié : parcours visible (Mailpit si e-mail)    |          |      |         |       |

---

## P04 — Inscription tenant

| #   | Contrôle                                  | Résultat | Date | Testeur | Notes |
| --- | ----------------------------------------- | -------- | ---- | ------- | ----- |
| 4.1 | `/inscription` : assistant multi-étapes   |          |      |         |       |
| 4.2 | CGU / DPA versionnées affichées           |          |      |         |       |
| 4.3 | Captcha / anti-abus présent               |          |      |         |       |
| 4.4 | Page attente provisioning (si flux lancé) |          |      |         |       |

---

## P05 — Équipe & RBAC

| #   | Contrôle                                                 | Résultat | Date | Testeur | Notes |
| --- | -------------------------------------------------------- | -------- | ---- | ------- | ----- |
| 5.1 | MEDECIN : menu patients / consultation / stats           |          |      |         |       |
| 5.2 | INFIRMIERE : pas d’accès écriture ordonnance / signature |          |      |         |       |
| 5.3 | SUPERADMIN console : pas d’accès dossier patient tenant  |          |      |         |       |
| 5.4 | `/parametres/equipe` : liste / invitations (si admin)    |          |      |         |       |

**URLs :** `/parametres/equipe`

---

## P06 — Journal d’audit

| #   | Contrôle                                             | Résultat | Date | Testeur | Notes |
| --- | ---------------------------------------------------- | -------- | ---- | ------- | ----- |
| 6.1 | Ouverture d’un patient → événement audit (ou outbox) |          |      |         |       |
| 6.2 | `/parametres/securite` : filtres / liste             |          |      |         |       |
| 6.3 | Export audit (step-up ou confirmation démo)          |          |      |         |       |
| 6.4 | `pnpm audit:verify --tenant=…` (si scripté)          |          |      |         |       |

**URL :** `/parametres/securite`

---

## P07 — Patients

| #   | Contrôle                                                                     | Résultat | Date | Testeur | Notes |
| --- | ---------------------------------------------------------------------------- | -------- | ---- | ------- | ----- |
| 7.1 | Liste `/patients` paginée                                                    |          |      |         |       |
| 7.2 | Recherche fonctionne                                                         |          |      |         |       |
| 7.3 | Création `/patients/nouveau` — champs vides (pas de préremplissage clinique) |          |      |         |       |
| 7.4 | Badge / message **INS non qualifiée** (INSi NotAvailable)                    |          |      |         |       |
| 7.5 | Doublon détecté si même identité (ou confirmation)                           |          |      |         |       |
| 7.6 | Archivage logique avec motif                                                 |          |      |         |       |
| 7.7 | Bandeau allergies si présentes                                               |          |      |         |       |
| 7.8 | IDOR : URL patient autre tenant → 404 / refus                                |          |      |         |       |

**URLs :** `/patients`, `/patients/nouveau`, `/patients/[id]`

---

## Carte Vitale (cadre T-18) — hors lot P, post-P19

| #   | Contrôle                                                     | Résultat | Date | Testeur | Notes |
| --- | ------------------------------------------------------------ | -------- | ---- | ------- | ----- |
| V.1 | Création patient : bloc « Carte Vitale / télétransmission »  |          |      |         |       |
| V.2 | Bouton « Lire la Carte Vitale » → message **non disponible** |          |      |         |       |
| V.3 | Accueil IDE : même message T-18                              |          |      |         |       |
| V.4 | Consultation rubrique Identité : même message T-18           |          |      |         |       |
| V.5 | Aucun NIR / FSE inventé                                      |          |      |         |       |

---

## P08 — Agenda & accueil IDE

| #   | Contrôle                                               | Résultat | Date | Testeur | Notes |
| --- | ------------------------------------------------------ | -------- | ---- | ------- | ----- |
| 8.1 | Agenda jour / semaine / mois                           |          |      |         |       |
| 8.2 | Création RDV ; refus chevauchement si testé            |          |      |         |       |
| 8.3 | Machine d’états (prévu → arrivé → préparation → prêt…) |          |      |         |       |
| 8.4 | Rôle INFIRMIERE : `/infirmiere` file du jour           |          |      |         |       |
| 8.5 | Cases constantes / ECG / poids ; « Marquer prêt »      |          |      |         |       |
| 8.6 | Transmission audité                                    |          |      |         |       |
| 8.7 | Sync externe / SMS / RDV en ligne = **non disponible** |          |      |         |       |

**URLs :** `/agenda`, `/infirmiere`

---

## P09 — Consultation

| #   | Contrôle                                              | Résultat | Date | Testeur | Notes                                                                |
| --- | ----------------------------------------------------- | -------- | ---- | ------- | -------------------------------------------------------------------- |
| 9.1 | Ouverture consultation depuis patient / agenda        | PARTIEL  |      |         | Dossier : Démarrer / Reprendre OK. Agenda → consultation hors scope. |
| 9.2 | Stepper rubriques ; navigation                        |          |      |         |                                                                      |
| 9.3 | Autosave (brouillon) sans crash                       |          |      |         |                                                                      |
| 9.4 | Champs cliniques vides par défaut (pas de « normal ») |          |      |         |                                                                      |
| 9.5 | IMC / BSA calculés seulement si taille/poids saisis   |          |      |         |                                                                      |
| 9.6 | Clôture consultation                                  |          |      |         | Rubrique Clôture → confirm → dossier patient ; lecture seule après.  |

**URL type :** `/consultations/[id]/[rubrique]`

---

## P10 — Examens & fichiers

| #    | Contrôle                                                      | Résultat | Date | Testeur | Notes |
| ---- | ------------------------------------------------------------- | -------- | ---- | ------- | ----- |
| 10.1 | Biologie datée ; plages / unités visibles                     |          |      |         |       |
| 10.2 | ECG : QTc + méthode explicite                                 |          |      |         |       |
| 10.3 | ETT / aorte segmentaire ; segment non visualisé possible      |          |      |         |       |
| 10.4 | Upload fichier : rejet MIME incorrect (si testé)              |          |      |         |       |
| 10.5 | Scan / statut fichier (disponible / rejeté) — selon ClamAV up |          |      |         |       |

---

## P11 — Règles cliniques / scores / alertes

| #     | Contrôle                                                                                      | Résultat | Date | Testeur | Notes |
| ----- | --------------------------------------------------------------------------------------------- | -------- | ---- | ------- | ----- |
| 11.1  | `/consultations/.../scores` accessible si flag on (démo)                                      |          |      |         |       |
| 11.2  | **T-06** : score incomplet ≠ « faible risque / 0 »                                            |          |      |         |       |
| 11.3  | CHA₂ : recalcul après correction critère                                                      |          |      |         |       |
| 11.4  | Score saisi externe clairement marqué « saisi »                                               |          |      |         |       |
| 11.5  | **T-10** : aorte ascendante 60 mm → alerte mesure / discussion, **pas** décision chirurgicale |          |      |         |       |
| 11.6  | **T-11** : segment distinct (descendante vs ascendante)                                       |          |      |         |       |
| 11.7  | **T-12** : aucune mesure → « non renseigné », pas « normal »                                  |          |      |         |       |
| 11.8  | **T-13** : diamètre sans taille → pas de surface/hauteur                                      |          |      |         |       |
| 11.9  | Reconnaissance d’alerte audité                                                                |          |      |         |       |
| 11.10 | `/parametres/regles-cliniques`                                                                |          |      |         |       |

**URLs :** `/consultations/[id]/scores`, `/consultations/[id]/aorte`, `/parametres/regles-cliniques`

---

## P12 — Comptes rendus

| #    | Contrôle                                                               | Résultat | Date | Testeur | Notes |
| ---- | ---------------------------------------------------------------------- | -------- | ---- | ------- | ----- |
| 12.1 | Génération CR depuis consultation                                      |          |      |         |       |
| 12.2 | Édition médecin ; filigrane brouillon si prévu                         |          |      |         |       |
| 12.3 | Cycle brouillon → validé                                               |          |      |         |       |
| 12.4 | Signature e-CPS : **NotAvailable** → reste validé (pas faux « signé ») |          |      |         |       |
| 12.5 | Amendement version N+1 motivé (pas d’écrasement silencieux)            |          |      |         |       |
| 12.6 | Aperçu / PDF sans HTML brut dangereux                                  |          |      |         |       |
| 12.7 | Liste documents à valider                                              |          |      |         |       |

**URL type :** `/comptes-rendus/[documentId]`

---

## P13 — Ordonnances

| #    | Contrôle                                        | Résultat | Date | Testeur | Notes |
| ---- | ----------------------------------------------- | -------- | ---- | ------- | ----- |
| 13.1 | **T-17** : aucune molécule / dose préremplie    |          |      |         |       |
| 13.2 | Lignes DCI, posologie, bizone ALD               |          |      |         |       |
| 13.3 | Rappels allergies / DFG (si données)            |          |      |         |       |
| 13.4 | Interactions médicamenteuses = **NotAvailable** |          |      |         |       |
| 13.5 | Validation MEDECIN ; infirmière refusée         |          |      |         |       |
| 13.6 | PDF A4 / duplication brouillon                  |          |      |         |       |

**URL type :** `/ordonnances/[ordonnanceId]`

---

## P14 — Dossier longitudinal & statistiques

| #    | Contrôle                                              | Résultat | Date | Testeur | Notes |
| ---- | ----------------------------------------------------- | -------- | ---- | ------- | ----- |
| 14.1 | Dossier patient : chronologie, problèmes, traitements |          |      |         |       |
| 14.2 | Courbes filtrées par période                          |          |      |         |       |
| 14.3 | Comparaison multi-dates (si UI)                       |          |      |         |       |
| 14.4 | `/statistiques` : agrégats sans PII                   |          |      |         |       |
| 14.5 | Export CSV step-up / confirmation                     |          |      |         |       |

**URLs :** `/patients/[id]`, `/statistiques`

---

## P15 — Hospitalisation & surveillance

| #    | Contrôle                                                    | Résultat | Date | Testeur | Notes |
| ---- | ----------------------------------------------------------- | -------- | ---- | ------- | ----- |
| 15.1 | Module visible selon offre / flag (sinon message désactivé) |          |      |         |       |
| 15.2 | Vue service `/hospitalisation`                              |          |      |         |       |
| 15.3 | Constantes immuables ; correction = nouvelle mesure + motif |          |      |         |       |
| 15.4 | Surveillance IDE `/infirmiere/surveillance/[patientId]`     |          |      |         |       |
| 15.5 | Alertes TAS hors seuils persistées                          |          |      |         |       |

**URLs :** `/hospitalisation`, `/infirmiere/surveillance/[patientId]`

---

## P16 — Abonnements

| #    | Contrôle                                                    | Résultat | Date | Testeur | Notes |
| ---- | ----------------------------------------------------------- | -------- | ---- | ------- | ----- |
| 16.1 | `/parametres/abonnement` : offres Solo / Cabinet / Clinique |          |      |         |       |
| 16.2 | Checkout démo ou Stripe (selon env)                         |          |      |         |       |
| 16.3 | Aucune donnée patient envoyée au PSP                        |          |      |         |       |

**URL :** `/parametres/abonnement`

---

## P17 — Console super admin

| #    | Contrôle                                                          | Résultat | Date | Testeur | Notes |
| ---- | ----------------------------------------------------------------- | -------- | ---- | ------- | ----- |
| 17.1 | http://console.localhost:3000 : KPIs / tenants                    |          |      |         |       |
| 17.2 | Suspendre / provisioning / flags (avec justificatif si demandé)   |          |      |         |       |
| 17.3 | Session support : consentement, durée, bandeau (si testé)         |          |      |         |       |
| 17.4 | Console **sans** ouverture directe base tenant / dossier clinique |          |      |         |       |

---

## P18 — RGPD opérationnel

| #    | Contrôle                                                           | Résultat | Date | Testeur | Notes |
| ---- | ------------------------------------------------------------------ | -------- | ---- | ------- | ----- |
| 18.1 | `/parametres/donnees-rgpd` : conservation (alerte, pas purge auto) |          |      |         |       |
| 18.2 | Export tenant / portabilité (chiffré / TTL)                        |          |      |         |       |
| 18.3 | Notice patient / registre violations (lien CNIL)                   |          |      |         |       |
| 18.4 | Pages légales marketing (marqueurs juriste visibles)               |          |      |         |       |

**URL :** `/parametres/donnees-rgpd`

---

## P19 — Durcissement (contrôles locaux)

| #    | Contrôle                                                        | Résultat | Date | Testeur | Notes |
| ---- | --------------------------------------------------------------- | -------- | ---- | ------- | ----- |
| 19.1 | `Dockerfile` build local (optionnel)                            |          |      |         |       |
| 19.2 | Gardes : en `production` mock/demo interdits (lire code / test) |          |      |         |       |
| 19.3 | Runbooks présents sous `docs/exploitation/`                     |          |      |         |       |
| 19.4 | Checklist portes prod **non cochée** sans preuve HDS            |          |      |         |       |
| 19.5 | `pnpm restore:drill --report` (simulation locale)               |          |      |         |       |

---

## Transversal — critères CDC T-16 à T-20

| #    | Critère                                                 | Résultat | Date | Testeur | Notes |
| ---- | ------------------------------------------------------- | -------- | ---- | ------- | ----- |
| T-16 | Démo utilisable sans vraie identité ; pas d’envoi tiers |          |      |         |       |
| T-17 | Ordonnance sans médicament/dose par défaut              |          |      |         |       |
| T-18 | Carte Vitale clairement non disponible                  |          |      |         |       |
| T-19 | Au moins un test limites / manquants par règle (CI)     |          |      |         |       |
| T-20 | Dossier `legacy/` intact si présent                     |          |      |         |       |

---

## Synthèse session

| Champ            | Valeur |
| ---------------- | ------ |
| Date session     |        |
| Testeur          |        |
| Commit / branche |        |
| Modules OK       |        |
| Modules KO       |        |
| Bloquants        |        |
| À retester       |        |

---

## Ordre de passage recommandé

1. Préparation (0)
2. P01 → P03 (socle, accès)
3. P07 Patients + **Vitale T-18**
4. P08 Agenda / IDE
5. P09 → P11 Consultation / examens / scores
6. P12 → P13 Documents
7. P14 → P15 Dossier / hospit
8. P16 → P18 Paramètres / console / RGPD
9. P19 + synthèse

Une session = un module ou une demi-journée max ; recopier la **Synthèse session** à chaque fois (ou dupliquer ce fichier en `recette-locale-YYYY-MM-DD.md`).
