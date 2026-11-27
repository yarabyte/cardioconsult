# Décisions techniques — Cardio Soin

Journal ADR court. Les décisions Phase 1–6 (socle démo) sont conservées en bas ; les ADR P00 cadrent la cible production.

## ADR — Essai & facturation

### ADR-059 — Inscription = essai 30 j Solo + rappels J-7 / J-1

- **Statut** : retenu
- **Contexte** : l’étape « Offre » proposait Solo / Cabinet / Clinique (défaut Cabinet) alors que le produit commercialise un essai unique puis Solo avec upgrade.
- **Décision** :
  - Aucun choix d’offre à l’inscription ; le serveur force `plan = solo` et `trialEndsAt = now + 30 j`.
  - Après essai : Solo par défaut ; upgrade Cabinet / Clinique via Paramètres → Abonnement.
  - Deux e-mails transactionnels (SMTP, sans donnée clinique) : J-7 et J-1 avant expiration ; idempotence `trial_reminder_sends`.
  - Jobs pg-boss `billing.trial_reminder` (retardés) + `billing.trial_scan` (quotidien) ; fin d’essai sans paiement → `trial.elapsed` → `past_due` + grâce.
- **SMTP** : `SMTP_HOST` / `PORT` / `FROM` / `USER` / `PASS` / `SECURE` (cardiosoins.com:465 SSL typique). Mot de passe uniquement en env, jamais en dépôt. Vérif : `pnpm mail:verify`.
- **Preuves manquantes** : hébergement mail / sous-traitant documenté HDS si données de santé transitent (ici : e-mails sans contenu clinique) ; Stripe Checkout/Portal toujours stub.

## ADR — Identité marque

### ADR-058 — Renommage CardioConsult → Cardio Soin / cardiosoins.com

- **Statut** : retenu
- **Décision** : marque affichée `Cardio Soin` ; domaine public `cardiosoins.com` (`NEXT_PUBLIC_ROOT_DOMAIN`, sous-domaines tenant et `console.`). Source unique : `lib/brand.ts`.
- **Conservé (technique local)** : utilisateur / bases PostgreSQL Docker `cardioconsult`, nom de package npm `cardioconsult`, chemin dépôt — pour ne pas casser l’environnement de développement.
- **Logos** : wordmark SVG régénéré en texte « Cardio Soin » (icône cœur inchangée).

## ADR — Examens complémentaires V15

### ADR-057 — Brouillon d’examens complémentaires (catalogue V15), non exécutoire

- **Statut** : retenu
- **Contexte** : livrable client V15 (`templates-html/v15/`) — 24 bilans (infectiologie, endocrinologie, HTA secondaire, cardiologie, autres).
- **Décision** :
  - Catalogue versionné `lib/exam-orders/` (`EXAM_ORDER_CATALOG_VERSION = v15.0.0`).
  - Rubrique consultation `examens-complementaires` ; persistance dans le brouillon d’encounter (`examOrders`), pas de table `exam_order` ni PDF signé dans cet incrément.
  - Feature flag tenant `clinical.examOrders` (off hors démo / sans activation explicite).
  - Libellés prudents : brouillon documentaire uniquement — pas de connecteur laboratoire, pas de signature exécutoire, pas d’arrêt automatique de traitements.
- **Conséquences** : revue médicale documentée des protocoles avant usage clinique ; qualification DM / interop labo hors scope jusqu’à ADR dédiée.

## ADR — UX médecin Phase 1 (quick wins)

### ADR-056 — Ergonomie Phase 1 sans refonte ETT/aorte/scores

- **Statut** : retenu
- **Décision** : livrer des quick wins (complétude live, autosave visible, contexte patient sticky, navigation rubriques, Cmd+K serveur, dossier sans UUID, stubs synthèse/transmissions) sans alignement complet sur `templates-html`.
- **Hors scope (backlog)** :
  - ETT / valves structurées (template 08)
  - Module aorte RED FLAG + reconnaissance d’alerte persistée
  - Persistance des scores + préremplissage depuis le brouillon
  - Shell unifié ordonnance / compte rendu dans le stepper consultation
  - Cmd+K INS avancé si index dédié absent
  - Refonte visuelle / marketing

## ADR — P19 (durcissement)

### ADR-052 — Production applicative fail-closed (mocks/démo)

- **Statut** : retenu (mocks applicatifs retirés — Vague 6)
- **Décision** : plus de couche mock ni de flags `MOCK_ACTIVE` / `NEXT_PUBLIC_DEMO` ; en production, secrets par défaut interdits. CI/E2E restent en `development`/`test`.

### ADR-053 — Image signée + SBOM + Trivy

- **Statut** : retenu
- **Décision** : `Dockerfile` multi-stage non-root ; workflow `release.yml` (CycloneDX, Trivy, cosign keyless à activer sur registry HDS). Clôture partielle ADR-012.

### ADR-054 — RPO ≤ 15 min / RTO ≤ 4 h + drill mensuel

- **Statut** : retenu
- **Décision** : objectifs documentés ; `scripts/restore-drill.ts` pour rapport ; PITR chez hébergeur HDS (hors code).

### ADR-055 — Portes go-live non auto-déclarées

- **Statut** : retenu
- **Décision** : checklist six portes + matrice SEC + risques résiduels ; jamais « conforme / certifié » sans preuve tiers.

## ADR — P18 (RGPD opérationnel)

### ADR-048 — Conservation sans purge automatique

- **Statut** : retenu
- **Décision** : `retentionYears` paramétrable ; alerte dossiers échus ; aucune suppression automatique — décision RT uniquement.

### ADR-049 — Exports chiffrés, TTL 24 h, purge objet

- **Statut** : retenu
- **Décision** : archive AES-GCM, step-up, jeton opaque, audit ; lien expiré → 410 ; fichier vidé après expiration ; format `docs/donnees/format-export-tenant.md`.

### ADR-050 — Crypto-effacement DEK + double validation wipe

- **Statut** : retenu
- **Décision** : suppression tenant = admin + plateforme + grâce ; destruction DEK ; certificat ; sauvegardes contractuelles hors code.

### ADR-051 — Violations : registre sans notification auto

- **Statut** : retenu
- **Décision** : déclaration / qualification / actions ; lien procédure CNIL affiché ; jamais d'envoi automatique.

## ADR — P17 (console plateforme)

### ADR-045 — Rôles plateforme distincts (moindre privilège)

- **Statut** : retenu
- **Décision** : `PLATFORM_ADMIN` / `PLATFORM_SUPPORT` / `PLATFORM_BILLING` ; démo mappe `SUPERADMIN` → ADMIN ; aucune permission clinique.

### ADR-046 — Session support consentie, RO, 60 min

- **Statut** : retenu
- **Décision** : demande → consentement admin cabinet → rôle PG RO éphémère ; bandeau + révocation ; double audit ; expiration = jeton inutilisable. SUPERADMIN sans session = accès clinique interdit.

### ADR-047 — Actions console = audit plateforme + justificatif

- **Statut** : retenu
- **Décision** : pas de `getTenantDb` / `recordAuditEvent` tenant depuis la console ; `writePlatformAudit` + justificatif ≥ 10 car. pour actions sensibles.

## ADR — P16 (abonnements)

### ADR-042 — Prix hors code + BillingProvider démo/Stripe

- **Statut** : retenu
- **Décision** : montants HT et price IDs uniquement via `env` ; `DemoBillingProvider` si pas de clé Stripe ; Checkout/Portal jamais de saisie carte in-app ; payload limité à l'identité cabinet.

### ADR-043 — Tenant suspendu = lecture seule + export

- **Statut** : retenu
- **Décision** : plus de rejet total ; `canMutateWhile` / `READ_ONLY_ALLOWED` ; DB tenant encore accessible ; `export.data` et `billing.manage` conservés pour continuité et régularisation.

### ADR-044 — Webhooks idempotents (`processed_events`)

- **Statut** : retenu
- **Décision** : signature obligatoire (400 sinon) ; rejeu no-op ; table control-plane + miroir démo en mémoire.

## ADR — P15 (hospitalisation / surveillance)

### ADR-040 — Module hospitalisation derrière offre Clinique + contrat établissement

- **Statut** : retenu
- **Décision** : `activateHospitalisationModule` réservé SUPERADMIN ; case `establishmentContractSigned` obligatoire ; RT = établissement (cf. questions-ouvertes). Démo : tenant Martin pré-activé.

### ADR-041 — Constantes immuables (correction versionnée)

- **Statut** : retenu
- **Décision** : saisie crée une mesure ; correction annule l’ancienne (`cancelledAt` + motif) et crée une nouvelle ligne `supersedesId` ; alertes de borne persistées sur la mesure (`alertLabels`).

## ADR — P14 (dossier / stats)

### ADR-038 — Agrégats serveur + seuil petits effectifs

- **Statut** : retenu
- **Décision** : `computeCabinetStats` / `maskSmallCells` (< 5) ; export CSV step-up audité ; liste de rappel filtrée référent/admin.

### ADR-039 — Séries longitudinales filtrées côté serveur

- **Statut** : retenu
- **Décision** : `getLongitudinalDossier(period)` ; UI ne reçoit que la fenêtre demandée ; tableaux alternatifs pour a11y.

## ADR — P13 (ordonnances)

### ADR-036 — prescription.write/validate verrouillés MEDECIN

- **Statut** : retenu
- **Décision** : ajoutés à `REGULATORY_LOCKED` ; retirés de `NURSE_GRANTABLE` (P13).

### ADR-037 — DrugDatabase NotAvailable + catalogue DCI démo

- **Statut** : retenu
- **Décision** : recherche locale ; interactions toujours « base non connectée » ; modèles = DCI sans dose.

## ADR — P12 (comptes rendus)

### ADR-034 — Contenu TipDoc + rendu sans HTML brut

- **Statut** : retenu
- **Décision** : stockage JSON TipTap-like ; `StructuredDocView` React (échappement) ; PDF via gabarit contrôlé échappé + Gotenberg isolé (fallback démo).

### ADR-035 — SignatureProvider NotAvailable

- **Statut** : retenu
- **Décision** : plafond `valide` ; `document.sign` tente le provider puis reste validé ; step-up requis hors démo.

## ADR — P11 (règles cliniques)

### ADR-032 — Feature flags cliniques off en prod

- **Statut** : retenu
- **Décision** : `clinical.scores|alerts|aorta` désactivés hors démo ; activation SUPERADMIN seulement.
- **Conséquences** : UI scores/alertes gateée ; seuils aorte versionnés (édition audité à durcir P17).

### ADR-033 — Libellés non décisionnels + saisie externe

- **Statut** : retenu
- **Décision** : tests interdisent « indication / diagnostic confirmé / traitement recommandé » ; EuroSCORE/STS/GRACE/HCM/SCORE2 = `saisi_externe`.

## ADR — P10 (examens / fichiers)

### ADR-030 — Upload : magic bytes + ClamAV fail-closed + jeton HMAC 5 min

- **Statut** : retenu
- **Décision** : validation MIME côté serveur ; antivirus injoignable → rejet ; pas d'accès bucket public ; jetons liés à l'utilisateur (`lib/files/presign`).
- **Conséquences** : démo en mémoire ; prod = PUT S3 présigné + job scan ClamAV / pg-boss.

### ADR-031 — QTc sans méthode et aorte « non visualisé »

- **Statut** : retenu
- **Décision** : schéma zod refuse QTc sans Fridericia/Bazett ; segment non visualisé → diamètre `null` (jamais 0).

## ADR — P09 (consultation)

### ADR-028 — Autosave serveur debounce 2 s + version optimiste

- **Statut** : retenu
- **Décision** : `saveEncounterDraftAction` avec `version` ; conflit → rechargement côté client.
- **Conséquences** : store démo en mémoire ; table encounter DB dès provisioning réel.

### ADR-029 — Modèles ETT uniquement après confirm + audit

- **Statut** : retenu
- **Décision** : `confirmed: true` obligatoire ; événement `encounter.template_applied`.

## ADR — P08 (agenda / accueil)

### ADR-026 — Temps réel SSE sans service tiers

- **Statut** : retenu
- **Contexte** : IDE ↔ médecin ; pas de Pusher/Ably hors HDS.
- **Décision** : `EventSource` `/api/agenda/stream` pousse `{appointmentId,status}` ; le client recharge le détail via Server Action.
- **Conséquences** : auth démo cookie ; prod = session Better Auth à durcir ; polling 8 s en secours IDE.

### ADR-027 — Sync externe / SMS / RDV en ligne = NotAvailable

- **Statut** : retenu
- **Décision** : interfaces affichées « non disponible », jamais simulées comme actives.

## ADR — P07 (patients)

### ADR-024 — InsProvider NotAvailable (pas de qualification simulée)

- **Statut** : retenu
- **Contexte** : téléservice INSi homologué non branché.
- **Décision** : statut toujours `non_qualifiee` / message unavailable ; jamais `qualifiee` sans intégration réelle.
- **Conséquences** : bandeau INS non qualifiée partout ; qualification différée.

### ADR-038 — SesamVitaleAdapter NotAvailable (lecture Carte Vitale)

- **Statut** : retenu
- **Contexte** : CDC §4.12 / T-18 ; aucun connecteur GIE SESAM-Vitale homologué.
- **Décision** : interface `SesamVitaleAdapter.readCard()` + implémentation `NotAvailable` uniquement ; UI via `CarteVitalePanel` (création patient, rubrique identité consultation, accueil IDE). Action `readCarteVitaleAction` gated par `patient.read` (tentative de lecture sans écriture). Interdiction d’émuler une lecture, un NIR ou une FSE.
- **Conséquences** : saisie manuelle obligatoire ; branchement futur via partenaire habilité uniquement (pas de flag qui simule un succès). Un préremplissage réel exigera une action d’écriture séparée (`patient.write`).

### ADR-025 — N° dossier `CC-######` auto-incrémenté par tenant

- **Statut** : retenu
- **Contexte** : maquettes utilisent `CC-000184` ; UUID en PK DB.
- **Décision** : compteur `tenant_counter` + `dossier_number` ; en démo l'id UI = n° dossier.
- **Conséquences** : URLs portent l'id technique (UUID en prod), jamais le nom.

## ADR — P06 (journal d'audit)

### ADR-022 — Outbox pour lectures + chaîne SHA-256

- **Statut** : retenu
- **Contexte** : lectures (patient.open) ne doivent pas bloquer la TX métier ; mutations dans la même TX.
- **Décision** : `audit_outbox` → flush vers `audit_event` append-only ; hash `sha256` chaîné (`prevHash`).
- **Conséquences** : worker/flush requis ; `pnpm audit:verify --tenant=` pour contrôle d'intégrité.

### ADR-023 — Export CSV signé HMAC(APP_SECRET)

- **Statut** : retenu
- **Contexte** : export journal avec step-up ; pas de KMS dédié encore.
- **Décision** : signature HMAC-SHA256 du CSV + horodatage ; événement `audit.export` lui-même audité.
- **Conséquences** : rotation APP_SECRET invalide les signatures passées (acceptable pour exports ponctuels).

## ADR — P05 (équipe / RBAC)

### ADR-020 — Overrides infirmière en control-plane

- **Statut** : retenu
- **Contexte** : surcharges `role_permission_override` sans PHI.
- **Décision** : table `role_permission_overrides` sur control-plane ; `can()` accepte `nurseExtra`.
- **Conséquences** : pas d'accès tenant DB pour la matrice ; verrous toujours en dur dans `can()`.

### ADR-021 — Step-up assoupli en mode démo

- **Statut** : **obsolète / retiré** (Vague 6 — plus de `isDemoMode()`)
- **Contexte** : UI équipe testable sans mot de passe step-up.
- **Décision** : ~~`requireStepUp` / step-up dans `requireContext` no-op si `isDemoMode()`~~.
- **Conséquences** : step-up toujours exigé pour les actions sensibles.

## ADR — P04 (inscription tenant)

### ADR-017 — RppsVerifier ManualReview (pas d'annuaire santé)

- **Statut** : temporaire
- **Contexte** : intégration homologuée annuaire RPPS non disponible.
- **Décision** : checksum local + statut `pending_manual_review` ; essai autorisé ; export / abonnement payant bloqués tant que non `verified` (garde-fous à brancher P16).
- **Conséquences** : pas de simulation d'annuaire ; revue support manuelle.

### ADR-018 — Captcha arithmétique auto-hébergé (HMAC)

- **Statut** : retenu
- **Contexte** : anti-abus sans reCAPTCHA / tiers hors HDS.
- **Décision** : défi `a + b` signé HMAC(`APP_SECRET`), TTL 10 min, WCAG texte.
- **Conséquences** : résistance faible vs bots sophistiqués ; acceptable pour inscription B2B ; à renforcer (PoW / file d'attente) si abus.

### ADR-019 — Inscription MOCK_ACTIVE sans écriture control-plane

- **Statut** : **obsolète / retiré** (Vague 6)
- **Contexte** : démo locale sans Docker Postgres.
- **Décision** : ~~inscription simulée sans Postgres~~ — provisioning toujours via control-plane.
- **Conséquences** : E2E inscription sur Postgres seedé.

## ADR — P03 (auth)

### ADR-015 — Cookies `__Host-` uniquement en production HTTPS

- **Statut** : retenu
- **Contexte** : `__Host-` exige Secure ; incompatible avec `http://*.localhost`.
- **Décision** : préfixe `__Host-` si `NODE_ENV=production`, sinon préfixe `cc` en local.
- **Conséquences** : tests E2E locaux sans HTTPS ; prod HSTS + Secure.

### ADR-016 — Pont démo `requireContext` tant que seeds auth incomplets

- **Statut** : **obsolète / retiré** (Vague 6)
- **Contexte** : UI cabinet utilisable sans Postgres/auth seed ; `isDemoMode()` hors prod.
- **Décision** : ~~cookie `demo-role`~~ — Better Auth + MFA obligatoires.
- **Conséquences** : E2E auth sur compte seed + TOTP.

## ADR — R1 P02

### Correctif haut — DDL provisioning via `format(%I/%L)`

- Plus d'interpolation du mot de passe PG dans une chaîne SQL brute.

## ADR — P02 (bases)

### ADR-013 — Tests d’intégration Postgres auto-skip sans Docker

- **Statut** : retenu
- **Contexte** : environnement agent sans binaire `docker` ; CI GitHub fournit Postgres.
- **Décision** : `server/db/integration.provision.test.ts` s’auto-désactive si `DATABASE_URL` injoignable ; crypto/audit hash/pool couverts en unitaire toujours verts.
- **Conséquences** : la preuve d’isolation A↛B et trigger append-only doit passer en CI avec service Postgres.

### ADR-014 — Mot de passe rôle PG chiffré via KEK dérivée (pas DEK tenant)

- **Statut** : retenu
- **Contexte** : les secrets DB sont dans le control-plane ; la DEK tenant sert aux données cliniques.
- **Décision** : `password_enc` = AES-GCM avec clé HKDF(`APP_SECRET`, info `cc-db-password`).
- **Conséquences** : rotation APP_SECRET impose re-chiffrement des secrets DB (script à prévoir P19).

## ADR — P01 (socle)

### ADR-010 — CSP : `style-src 'unsafe-inline'`, scripts avec nonce uniquement

- **Statut** : retenu
- **Contexte** : Tailwind v4 / next/font injectent du CSS inline ; interdiction stricte de `unsafe-inline` sur les scripts. React / Next.js (Turbopack) appellent `eval()` en mode développement pour reconstruire les callstacks.
- **Décision** : nonce + `strict-dynamic` pour `script-src` ; `unsafe-inline` limité à `style-src` jusqu’à hashes/nonces CSS stables ; `'unsafe-eval'` uniquement lorsque `NODE_ENV !== 'production'` (jamais en production).
- **Conséquences** : surface XSS CSS résiduelle ; à revoir si un pipeline de styles noncé est viable. En dev, `eval` reste une surface locale acceptable pour le debug React.

### ADR-011 — `env.ts` avec défauts docker-compose

- **Statut** : retenu
- **Contexte** : P01 exige l’échec si une variable du schéma est absente, mais le mode mock doit démarrer sans saisie manuelle.
- **Décision** : toutes les clés sont déclarées ; valeurs par défaut = stack `docker-compose.yml` ; `.env.example` documente le jeu complet.
- **Conséquences** : production devra surcharger `APP_SECRET` et secrets S3/DB (pas les défauts dev).

### ADR-012 — SBOM CycloneDX reporté à P19

- **Statut** : différé
- **Contexte** : règle 08 demande un SBOM à chaque release ; P01 pose la CI bloquante (lint, tests, build, audit, gitleaks, Semgrep, E2E en-têtes).
- **Décision** : SBOM + scan image Trivy sur Dockerfile dès qu’un Dockerfile existe ; pas de SBOM release tant que P19.
- **Conséquences** : dette documentée ; CI déjà bloquante sur le reste.

## ADR — P00 (cadrage)

### ADR-001 — Base PostgreSQL dédiée par tenant

- **Statut** : retenu
- **Contexte** : isolation stricte des données de santé multi-cabinet (SEC, HDS).
- **Décision** : control-plane `cc_control` + une base `cc_t_<id>` par tenant, rôle PG dédié, provisioning via job idempotent.
- **Conséquences** : migrations tenant N×N, pools LRU, coût ops ; isolation plus forte qu’un schéma unique. Lots P02, P19.

### ADR-002 — Better Auth

- **Statut** : retenu
- **Contexte** : sessions serveur, MFA TOTP obligatoire, passkeys optionnels, OIDC générique (Pro Santé Connect) plus tard.
- **Décision** : Better Auth + adaptateur Drizzle sur le control-plane ; cookies host-only ; MFA avant accès données.
- **Conséquences** : pas de cookie partagé `.cardiosoins.com` ; PSC derrière flag, jamais simulé. Lot P03.

### ADR-003 — Drizzle ORM (node-postgres)

- **Statut** : retenu
- **Contexte** : TypeScript strict, deux schémas (control / tenant), pas de `sql.raw`.
- **Décision** : Drizzle Kit, migrations additives séparées `db/control` et `db/tenant`.
- **Conséquences** : discipline expand/migrate/contract ; tests IDOR sur `ctx.db`. Lots P01–P02.

### ADR-004 — pg-boss

- **Statut** : retenu
- **Contexte** : provisioning, antivirus, PDF, outbox d’audit, exports — file d’attente durable sur PostgreSQL HDS.
- **Décision** : pg-boss sur le control-plane (jobs plateforme) et/ou file tenant selon le job ; pas de broker tiers hors HDS pour données de santé.
- **Conséquences** : dépendance au même Postgres ; retries idempotents obligatoires. Lots P02, P10, P12, P18.

### ADR-005 — Gotenberg (PDF)

- **Statut** : retenu
- **Contexte** : PDF A4 comptes rendus / ordonnances côté serveur.
- **Décision** : service Gotenberg isolé dans le périmètre HDS ; gabarits maîtrisés ; fichiers chiffrés + URL présignées courtes.
- **Conséquences** : aucun envoi automatique MSSanté tant que non intégré. Lot P12.

### ADR-006 — Chiffrement applicatif par enveloppe

- **Statut** : retenu
- **Contexte** : volumes hébergeur chiffrés insuffisants seuls pour identité et textes libres.
- **Décision** : DEK par tenant, enveloppée par KEK KMS/Vault ; index aveugle HMAC pour recherche ; champs concernés listés dans `docs/donnees/inventaire.md`.
- **Conséquences** : rotation de clés et perf recherche à concevoir en P02/P07. Pas de données patient en clair dans les logs.

### ADR-007 — Feature flags modules médicaux

- **Statut** : retenu
- **Contexte** : scores interprétés / alertes peuvent relever du règlement (UE) 2017/745.
- **Décision** : flags par tenant (`scoresInterpreted`, `aorticAlerts`, `clinicalSuggestions`), **off** par défaut en production jusqu’à qualification documentée ; libellés non décisionnels.
- **Conséquences** : UI et calculs derrière flags ; questions ouvertes dans `docs/conformite/`. Lots P11, P19.

### ADR-008 — TriState en français dans le code UI

- **Statut** : retenu
- **Contexte** : la règle 06 cite `yes | no | unknown` ; l’UI et les mocks utilisent déjà `oui | non | inconnu`.
- **Décision** : conserver `TriState = "oui" | "non" | "inconnu"` dans `types/domain.ts` et l’UI ; documenter l’équivalence.
- **Conséquences** : une seule convention FR, pas de double mapping.

### ADR-009 — Contenu documents : JSON structuré (cible) vs HTML démo

- **Statut** : retenu (cible) / mitigé en R1
- **Contexte** : interdiction de `dangerouslySetInnerHTML` ; le socle démo avait un aperçu HTML.
- **Décision** : modèle cible = `contentJson` (Tiptap) ; en attendant P12, aperçu **texte échappé**. Signature e-CPS = NotAvailable (plafond `valide`).
- **Conséquences** : P12 branchera le rendu structuré ; pas de simulation e-CPS.

---

## Phase 1 — Socle

- **Next.js 16.4** : le fichier de réécriture multi-tenant est `proxy.ts` (remplace `middleware.ts` déprécié). Export nommé `proxy`.
- **Cache Components / Partial Prefetching** : désactivés dans `next.config.ts`. Avec multi-tenant (`proxy` + headers), cookie `demo-role` et RBAC dans le layout, Next 16 loguait des erreurs « Could not validate instant » / `params` hors Suspense à chaque navigation. Inadapté à ce socle pour l’instant.
- **RBAC layout** : un rôle hors périmètre est `redirect()` vers son accueil (pas `notFound()`), et `x-pathname` porte le chemin **après** rewrite.
- **shadcn « base-nova »** : CLI actuelle (Radix Base UI). Les triggers utilisent souvent la prop `render` plutôt que `asChild`.
- **Tokens** : couleurs hex de la charte (§5 du prompt) mappées dans `app/globals.css` via `@theme`, y compris `--primary-soft`, `--brand-red`, `--warning*`, `--success*`.
- **Séparation tenant** : logique pure d’hôte dans `lib/tenant-host.ts` (importable depuis le proxy) ; helpers serveur `getTenant` / `getHostKind` dans `lib/tenant.ts`.
- **Console** : rewrite de `console.*` vers `/console` (`app/(console)/console`), pour éviter le conflit de route `/` avec le marketing.
- **Auth cabinet** : Better Auth + MFA (seed `pnpm db:seed`) ; plus de cookie `demo-role` ni de `Mock*Repository`.
- **Données** : Postgres tenant + control-plane uniquement ; courbes marketing isolées dans `lib/marketing/chart-fixtures.ts`.

## Phase 2–6 — Écrans

- Graphiques via Recharts encapsulés (`TrendChart`, `BarTrendChart`, `DonutChart`) plutôt que de modifier `components/ui/chart.tsx`.
- Les interactions riches (filtres patients, MFA, scores, ordonnance, lits, permissions) sont en Client Components ; chargement initial en Server Components.
- Verrous réglementaires (`document.sign`, `prescription.validate`) appliqués dans `lib/rbac.ts` et non accordables à l’infirmière.

## Écarts connus vs maquettes HTML

- Certains écrans cliniques (ETT 20 rubriques, CR A4) sont fonctionnels mais moins densément peaufinés pixel-perfect que les HTML 1440 px.
- Sparkline KPI du tableau de bord médecin : composant présent ; toutes les cartes n’affichent pas encore une sparkline individuelle.
- Formulaire shadcn `form` : non fourni tel quel par le registry base-nova ; usage direct de `react-hook-form` + Label/Input.
