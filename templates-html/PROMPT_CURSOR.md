# Prompt Cursor — Conversion du template Cardio Soin en projet Next.js + Tailwind + shadcn/ui

> À coller dans Cursor (mode Agent) à la racine d'un dépôt vide, après avoir copié le dossier `templates-html/` (ce ZIP) à la racine du dépôt.

---

## 1. Rôle et objectif

Tu es un développeur front-end senior Next.js / TypeScript / Tailwind / shadcn/ui.

Convertis la maquette HTML de **Cardio Soin** (SaaS de consultation en cardiologie, commercialisé en France) en une **application Next.js prête à recevoir un backend**. Le dossier `templates-html/` contient 19 écrans HTML autonomes qui font foi pour le **contenu, la mise en page, les couleurs et les interactions**. Ouvre-les dans un navigateur et lis leur source avant de coder chaque écran.

Le résultat attendu est un front-end **fidèle aux maquettes**, découpé en composants réutilisables, typé, accessible, responsive, avec des **données fictives** derrière une couche d'accès remplaçable. Aucun backend réel n'est demandé à cette étape.

## 2. Stack imposée

- **Next.js** dernière version stable, **App Router**, Server Components par défaut, `"use client"` seulement si nécessaire.
- **TypeScript** en mode `strict`.
- **Tailwind CSS v4** (configuration CSS-first via `@theme` dans `app/globals.css`).
- **shadcn/ui** (CLI officielle, composants copiés dans `components/ui`), icônes **lucide-react**.
- Graphiques : composant **`chart` de shadcn** (Recharts).
- Formulaires : **react-hook-form + zod**. Dates : **date-fns** avec la locale `fr`, fuseau `Europe/Paris`.
- Police : **Plus Jakarta Sans** via `next/font/google`.
- Gestionnaire de paquets : **pnpm**. Qualité : ESLint et Prettier (avec `prettier-plugin-tailwindcss`).

N'ajoute aucune autre dépendance sans le justifier dans `DECISIONS.md`.

## 3. Correspondance des écrans et des routes

Multi-tenant par **sous-domaine** : chaque cabinet a son espace `<tenant>.cardiosoins.com`, et la console plateforme est sur `console.cardiosoins.com`.

| Fichier HTML | Route Next.js | Hôte |
|---|---|---|
| `00-identite-visuelle.html` | `/design` (page interne de référence, non indexée) | racine |
| `01-site-public-cardioconsult-fr.html` | `/` | `cardiosoins.com` |
| `02-inscription-creation-du-tenant.html` | `/inscription` (assistant en 4 étapes, étape 3 = sous-domaine) | racine |
| `03-connexion-a-l-espace-cabinet.html` | `/connexion` (+ étape MFA) | tenant |
| `04-tableau-de-bord-medecin.html` | `/tableau-de-bord` | tenant |
| `05-agenda.html` | `/agenda` | tenant |
| `06-liste-des-patients.html` | `/patients` | tenant |
| `07-dossier-patient-courbes.html` | `/patients/[patientId]` | tenant |
| `08-consultation-guidee-ett.html` | `/consultations/[consultationId]/[rubrique]` (ici `echocardiographie`) | tenant |
| `09-module-aorte-red-flag.html` | `/consultations/[consultationId]/aorte` | tenant |
| `10-scores-contextuels.html` | `/consultations/[consultationId]/scores` | tenant |
| `11-compte-rendu.html` | `/comptes-rendus/[documentId]` | tenant |
| `12-ordonnance.html` | `/ordonnances/[ordonnanceId]` | tenant |
| `13-hospitalisation-vue-du-service.html` | `/hospitalisation` | tenant |
| `14-statistiques-indicateurs.html` | `/statistiques` | tenant |
| `15-tableau-de-bord-infirmiere.html` | `/infirmiere` | tenant |
| `16-constantes-surveillance.html` | `/infirmiere/surveillance/[patientId]` | tenant |
| `17-parametres-equipe-roles.html` | `/parametres/equipe` (+ sous-pages listées dans le menu des paramètres) | tenant |
| `18-console-super-admin.html` | `/` | `console.` |

### Résolution du tenant

- Crée un **middleware** (fichier `middleware.ts`, ou `proxy.ts` si la version installée de Next.js l'impose) qui lit l'hôte et réécrit les URL :
  - hôte racine → groupe `app/(marketing)` ;
  - `console.*` → `app/(console)` ;
  - `<tenant>.*` → `app/t/[tenant]/(app)/...`.
- Sous-domaines réservés : `www`, `app`, `api`, `admin`, `console`, `support`, `demo`, `cardio`.
- En local, prends en charge `dr-martin.localhost:3000` et `console.localhost:3000`.
- Expose un helper `getTenant()` côté serveur. Le slug doit respecter `^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$`, comme le valide l'écran 02.

## 4. Arborescence attendue

```text
app/
  (marketing)/page.tsx, inscription/, design/
  (console)/page.tsx
  t/[tenant]/(auth)/connexion/
  t/[tenant]/(app)/layout.tsx          ← AppShell (sidebar selon le rôle + topbar)
  t/[tenant]/(app)/tableau-de-bord/ … (une route par écran, voir §3)
components/
  ui/                 ← shadcn (ne pas modifier, sauf variantes déclarées)
  layout/             ← AppShell, AppSidebar, Topbar, CommandSearch (Ctrl K)
  clinical/           ← StatusBadge, AlertCard, ScoreCard, TriStateCriterion, AorticDiagram, RubricStepper, VitalsForm
  charts/             ← TrendChart, BarTrendChart, DonutChart, Sparkline, HorizontalProgressChart
  documents/          ← A4Preview, ValidationStepper, PrescriptionLines
  admin/              ← PermissionMatrix, MembersTable, TenantsTable
lib/
  tenant.ts, rbac.ts, format.ts (dates/nombres FR)
  clinical/           ← règles pures : cha2ds2va.ts, hasbled.ts, rcri.ts, aorta.ts, bsa.ts (+ tests)
  data/               ← interfaces Repository + implémentation mock
  mock/               ← jeux de données fictifs (repris des maquettes)
types/domain.ts       ← Patient, Encounter, Vitals, LabResult, EcgStudy, EchoStudy, AorticMeasurement,
                        ClinicalScore, ClinicalAlert, Document, Prescription, AuditEvent, Tenant, Member, Role
```

## 5. Design system : tokens à reproduire à l'identique

Mappe la charte (écran 00) sur les variables shadcn dans `globals.css` :

| Token | Valeur | Usage |
|---|---|---|
| `--background` | `#F4F7FC` | fond des pages applicatives |
| `--card` / `--popover` | `#FFFFFF` | cartes |
| `--foreground` | `#0A1F44` | texte (bleu nuit) |
| `--muted-foreground` | `#52627F` | texte secondaire (contraste AA validé) |
| `--primary` | `#0B4FB3` (hover `#083A85`) | actions, liens, éléments actifs |
| `--primary-soft` | `#EAF1FD` | fond de l'élément de navigation actif, badges « calculé » |
| `--destructive` | `#D42A35` | **alertes uniquement** |
| `--brand-red` | `#E0313B` | marque (logo, accents marketing) |
| `--warning` / `--warning-soft` | `#B45309` / `#FFF4E0` | incomplet, à confirmer |
| `--success` / `--success-soft` | `#0F7A4D` / `#E6F5EE` | validé |
| `--border` | `#DCE4F2` ; séparateurs `#E3E9F4` / `#EEF2F8` | |
| `--radius` | `0.75rem` | cartes 16 px, boutons et champs 10 px, pastilles 999 px |

Typographie : titres en 800 avec un léger interlettrage négatif, texte courant en 15 px, libellés en 12–13 px gras. Les valeurs cliniques utilisent `tabular-nums`.

Logos : copie `templates-html/assets/*` dans `public/brand/`. Crée un composant `<Logo variant="clair|sombre|icone" />`. Favicons dans `app/` (`icon.png`, `apple-icon.png`).

**Badge de statut clinique** (composant unique, 6 variantes, écran 00) : `non-renseigne`, `calcule`, `incomplet`, `valide`, `alerte`, `red-flag`.

## 6. Rôles et permissions (RBAC)

- Rôles : `SUPERADMIN` (plateforme), `MEDECIN` (avec le drapeau `isTenantAdmin`), `INFIRMIERE`.
- `lib/rbac.ts` : constantes de permissions, `can(user, permission)`, et une matrice par défaut identique à l'écran 17.
- **Verrous réglementaires** : `document.sign` et `prescription.validate` sont réservés au rôle `MEDECIN` et ne doivent pas pouvoir être accordés à l'infirmière.
- La sidebar est filtrée par rôle (menus médecin, infirmière et super admin tels que dans les maquettes). Les routes non autorisées sont refusées par défaut (`notFound()` ou redirection).
- La console super admin n'accède à **aucune** donnée patient.
- Ajoute un sélecteur de rôle **de démonstration** (cookie `demo-role`, visible seulement si `NEXT_PUBLIC_DEMO=true`) pour parcourir les trois espaces.

## 7. Données fictives et couche d'accès

- Reprends **exactement** les patients, valeurs et séries des maquettes (Jeanne Dupont, Robert Lefèvre, Annie Girard, etc.) dans `lib/mock`.
- Accède aux données uniquement via des interfaces `PatientRepository`, `EncounterRepository`, `DocumentRepository`, `TenantRepository`, etc., appelées depuis des Server Components ou des Server Actions. Implémentation `Mock*`, avec un délai simulé facultatif.
- **Interdits** : stocker des données patients dans `localStorage`, `sessionStorage` ou des cookies. Écrire des noms de patients dans les logs ou la console.
- Affiche un bandeau discret « Données fictives » dans l'application tant que la couche mock est active.

## 8. Règles cliniques (fonctions pures et testées)

Chaque règle renvoie `{ status: 'non_applicable' | 'incomplet' | 'calcule', value, range?, rationale: string[], missingInputs: string[], source: { id, version } }`.

- **Critères à trois états** : `oui` / `non` / `inconnu`. Un critère inconnu ne vaut jamais 0 : afficher l'intervalle `min à max` et les données manquantes, comme sur l'écran 10.
- `cha2ds2va` (sans critère de sexe), `hasbled`, `rcri`. L'âge est **calculé à la date de l'acte** à partir de la date de naissance, jamais saisi deux fois.
- `aorta` : seuils évalués **par segment**, jamais sur le maximum global. Niveaux : `alerte_mesure` → `discussion_specialisee` → `potentiellement_urgent`. Le niveau « indication confirmée » est saisi par le médecin uniquement. La croissance se calcule seulement s'il existe une mesure antérieure datée. Seuils configurables, signalés « à valider cliniquement ».
- `bsa` : formule de Mosteller, refus des valeurs absentes ou impossibles.
- Tests unitaires (Vitest) avec cas limites et données manquantes pour chaque règle.

## 9. Graphiques à reproduire (shadcn `chart` / Recharts)

`TrendChart` générique : lignes multiples, points, étiquette de la dernière valeur, **lignes de seuil pointillées étiquetées**, **zones colorées** (`ReferenceArea`), tooltip en français avec unité.

| Écran | Graphique | Spécificités |
|---|---|---|
| 01, 07 | FEVG | zones < 40 rouge clair, 40–49 orange clair, ≥ 50 vert clair, aire sous la courbe |
| 01, 07 | TA (TAS/TAD) | seuil « Cible TAS 140 » |
| 07 | FC, poids, NT-proBNP, DFG (seuil 45), QTc (Fridericia), LDL (objectif 0,55 g/L) | petits multiples sur une grille responsive |
| 01, 09 | Aorte ascendante et sinus | ascendante en trait plein rouge, sinus en pointillé bleu, seuils 50 et 55 mm |
| 04 | Consultations par semaine | barres, semaine en cours en rouge + sparklines dans les cartes KPI |
| 04 | Motifs | anneau + légende avec pourcentages |
| 14 | Distribution FEVG, CHA₂DS₂-VA, cohorte IC, atteinte des objectifs | barres colorées par classe, barres horizontales de progression |
| 16 | TA, FC/SpO₂ sur 24 h, diurèse par tranche de 4 h | |
| 18 | MRR (aire), nouveaux cabinets (barres), abonnements (anneau) | |

Chaque graphique a un `aria-label`, une légende textuelle et des couleurs qui se distinguent aussi par la luminosité.

## 10. Interactions à reproduire

- 02 : validation en direct du sous-domaine (disponible / trop court / réservé / déjà pris), aperçu de l'URL, bouton « Créer <slug>.cardiosoins.com ». Formulaire zod.
- 03 : connexion → étape MFA (code à 6 chiffres) → tableau de bord. Bouton « Pro Santé Connect » présent mais marqué « à venir ».
- 06 : recherche et puces de pathologie filtrent le tableau. État vide géré.
- 07 : onglets du dossier, sélecteur de période (6 mois / 1 an / tout) qui filtre réellement les séries.
- 08 : stepper des 20 rubriques avec états (fait / courant / incomplet / alerte / vide), barre de complétude, synthèse en direct. Le modèle « ETT normale » ne s'applique qu'après confirmation dans un dialogue.
- 09 : bouton « Reconnaître l'alerte » (horodatage et auteur affichés ensuite), panneau « Pourquoi ce résultat ? ».
- 10 : critères à trois états qui recalculent le score en direct.
- 11 : cycle brouillon → validé → signé (signature e-CPS simulée), filigrane BROUILLON, avertissement « données sources modifiées » avec régénération qui crée une nouvelle version sans écraser les éditions.
- 12 : ajout et suppression de lignes, **aucune dose préremplie**, panneau de vérifications (allergies, DFG/K⁺, interactions « base non connectée »).
- 13 : filtres des lits, sélection d'un lit → panneau de détail.
- 15 : bouton « Marquer prêt » par patient, compteurs mis à jour.
- 16 : saisie des constantes avec alerte si TAS < 90 ou > 180.
- 17 : matrice des permissions modifiable pour le rôle Infirmière (sauf cases verrouillées), invitation par e-mail.
- 18 : recherche de tenants, badges de statut.
- Topbar : recherche patient en palette de commandes (`Ctrl/⌘ K`), notifications, bouton d'action principal adapté au rôle.

## 11. Exigences transverses

- **Responsive** : la sidebar devient un `Sheet` sous 1024 px. Les tableaux larges défilent horizontalement. Rien ne déborde à 375 px.
- **Accessibilité WCAG 2.1 AA** : vrais `<button>`/`<a>`, labels associés, `aria-current`, `aria-pressed`, focus visible, contrastes ≥ 4,5:1, navigation clavier complète.
- **Français partout** (libellés, dates `23 novembre 2026`, nombres `1 284`, décimales à virgule). Centralise les libellés récurrents.
- États de chargement (`loading.tsx` + Skeleton), `error.tsx`, `not-found.tsx` par segment.
- Aucun lorem ipsum. Les tarifs restent `[PRIX]`. Mentions conformité telles que dans la maquette (« hébergeur certifié HDS à contractualiser »). Ne jamais présenter une alerte comme une décision médicale.

## 12. Plan de travail (une phase = un commit, rapport à chaque fin de phase)

1. **Socle** : création du projet, Tailwind v4, init shadcn, tokens §5, police, logos, middleware tenant, `types/domain.ts`, `lib/rbac.ts`, mocks.
2. **Design system** : page `/design` qui reproduit l'écran 00 avec les composants réels (boutons, badges de statut, cartes, graphiques de démonstration).
3. **Public et accès** : écrans 01, 02, 03.
4. **Espace médecin** : AppShell, puis écrans 04 → 14 dans l'ordre.
5. **Espace infirmière** : écrans 15, 16.
6. **Administration** : écrans 17, 18.
7. **Qualité** : tests des règles cliniques, `pnpm lint`, `pnpm typecheck`, `pnpm build` sans erreur, audit d'accessibilité, comparaison visuelle écran par écran avec les fichiers HTML.

À la fin de chaque phase, liste les écarts par rapport aux maquettes et les décisions prises dans `DECISIONS.md`. N'avance pas à la phase suivante si le build échoue.

## 13. Critères d'acceptation

- [ ] Les 19 écrans sont accessibles via leurs routes, avec les bons hôtes (racine / tenant / console).
- [ ] Rendu visuellement fidèle aux HTML à 1440 px, et utilisable à 375 px.
- [ ] Toutes les interactions du §10 fonctionnent.
- [ ] Les trois rôles voient uniquement leurs menus et leurs routes. Les verrous réglementaires ne peuvent pas être contournés.
- [ ] Les règles cliniques sont pures, testées, et ne renvoient jamais 0 sur des données inconnues.
- [ ] Aucune donnée patient dans le stockage navigateur. Bandeau « Données fictives » présent.
- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` et `pnpm test` passent.
- [ ] README : lancement local (sous-domaines `*.localhost`), variables d'environnement, structure, procédure pour brancher un vrai backend.
