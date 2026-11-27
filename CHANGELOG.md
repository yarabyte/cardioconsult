# Changelog

## Unreleased

### Technique

- Suppression totale des mocks applicatifs — Postgres + Better Auth only.

### Correctifs

- CSP : `'unsafe-eval'` autorisé uniquement hors production (React / Next.js Turbopack en dev).
- CSP dév : pas d'`upgrade-insecure-requests` + `connect-src` ws/localhost (évite boucle de rechargement HTTP).
- Proxy : `/api/*` non réécrit vers `/t/<slug>` (404 Better Auth corrigé).
- Seed / provisioning : `members.user_id` aligné sur l’id Better Auth (corrige `member.missing` → boucle `/connexion`).
- Pages d’erreur FR (404 / error / global-error) avec marque Cardio Soin ; redirect SUPERADMIN vers l’origine console (évite 404 `/console` sur hôte tenant).
- Postgres local branché (Homebrew) : migrations control 0000–0007, seed `dr-martin` + compte Better Auth pour tests réels.

### Carte Vitale / SESAM-Vitale (cadre)

- `SesamVitaleAdapter` + `NotAvailable` ; action `readCarteVitaleAction` (`patient.read`) ; composant `CarteVitalePanel`.
- UI T-18 : création patient, rubrique identité consultation, accueil IDE.
- Aucune lecture réelle, NIR ni FSE — branchement homologué futur uniquement (ADR-038).

### P19 — Durcissement & mise en production

- Gardes `NEXT_PUBLIC_APP_ENV=production` (pas de MOCK/DEMO) ; `Dockerfile` standalone ; CI Trivy image + workflow release (SBOM/cosign).
- Runbooks `docs/exploitation/*`, RPO/RTO, checklist portes, matrice SEC-01…14, risques résiduels, `SECURITY.md`.
- Squelette OpenTofu `infra/` ; script `restore:drill` ; stub OTel ; flags cliniques off hors démo (test).

### P18 — RGPD opérationnel

- Paramètres → Données et RGPD : conservation (alerte sans purge auto), exports chiffrés 24 h, notice patient, registre violations (lien CNIL).
- Addendum identité versionné ; suppression tenant (double OK + crypto-effacement DEK + certificat).
- Pages légales marketing (marqueurs juriste) ; format export documenté ; migration `0006_rgpd`.

### P17 — Console super admin

- Console plateforme : KPIs, tenants, actions (suspendre, provisioning, flags+justificatif, RPPS, export), supervision.
- Rôles `PLATFORM_*`, sessions support consenties (RO 60 min, bandeau, révocation, double audit).
- Aucun accès base tenant depuis la console hors session support ; activation hospit → audit plateforme.
- Migration control-plane `0005_support_sessions` ; IP allowlist / passkey (env).

### P16 — Abonnements & facturation

- Catalogue Solo/Cabinet/Clinique (prix HT via env) ; Checkout / Portal via BillingProvider (démo ou Stripe).
- Webhooks signés + `processed_events` ; cycle essai→actif→impayé→suspendu (lecture seule + export)→résilié.
- Paramètres → Abonnement (`billing.manage` + step-up) ; aucune donnée patient vers le PSP.
- Migration control-plane `0004_billing`.

### P15 — Hospitalisation & surveillance

- Module Clinique + case « contrat établissement signé » (activation SUPERADMIN tracée) ; vue service (filtres, staff, examens, transmissions).
- Constantes immuables (correction = nouvelle mesure + motif), alertes TAS 90–180 persistées, bilan E/S, diurèse, courbes 24 h, transmissions ciblées.
- Séjours rattachés à la chronologie dossier.

### P14 — Dossier longitudinal & statistiques

- Dossier : problèmes, traitements datés, chronologie, courbes filtrées, comparaison 3 dates, accès audit.
- Stats serveur : FEVG/CHA₂ complets + incomplets, cohorte IC, rappels filtrés, export CSV step-up avec seuil < 5.

### P13 — Ordonnances

- Lignes DCI/dosage/forme/voie/posologie/durée/quantité/renouvellement, bizone ALD, modèles sans dose (T-17).
- Vérifications rappels (allergies, DFG/K+ datés, grossesse, interactions NotAvailable).
- Validation step-up → immuable, PDF A4, duplication brouillon ; `prescription.*` verrouillé MEDECIN.

### P12 — Comptes rendus

- Modèles par motif, génération TipDoc depuis snapshot, édition médecin, régénération non destructive + diff.
- Cycle brouillon→valide→signe (SignatureProvider NotAvailable), immutabilité, amendement N+1 motivé.
- PDF gabarit A4 (Gotenberg ou démo), aperçu sans HTML brut, liste « Documents à valider ».

### P11 — Règles cliniques / scores / alertes

- lib/clinical : QTc, TIMI, ePHT, surface/hauteur aorte, moteur de contexte, saisie externe.
- Alertes persistées (démo) + reconnaissance audité ; liste tableau de bord ; feature flags `clinical.*`.
- Fiches `docs/regles/*` ; page Paramètres → Règles cliniques ; aorte `non_renseigne` / segments indépendants.

### P10 — Examens et fichiers

- Biologie datée (plages larges, mesuré/interprété), ECG (QTc+méthode, conductions multiples), ETT enrichie, aorte segmentaire « non visualisé », formulaires minimaux effort/coronaires/rythmologie/imagerie.
- Pipeline fichiers : MIME+magic bytes, ClamAV fail-closed, lifecycle `en_analyse|disponible|rejete`, jetons présignés 5 min.
- Migration tenant `0004_examens_fichiers`.

### P09 — Consultation guidée

- Encounter brouillon / clôture, stepper 20 rubriques, rubriques P09 (identité→examen), autosave 2 s + conflit.
- IMC / BSA Mosteller, âge à la date de l'acte, modèles ETT confirmés + audit, pas de « normal » par défaut.

### P08 — Agenda et accueil IDE

- Types RDV, vues jour/semaine/mois, chevauchement serveur, liste d'attente, machine d'états parcours.
- Tableau IDE : constantes/ECG/poids, marquer prêt, transmissions auditées, SSE + polling.
- Intégrations externes NotAvailable ; migration `0003_agenda`.

### P07 — Patients

- Création / liste paginée / doublons (index aveugle) / archivage logique / bandeau allergies.
- `InsProvider` NotAvailable ; n° dossier `CC-######` ; IDOR → 404.
- Migration tenant `0002_patients` (allergies, dispositifs, compteur).

### P06 — Journal d'audit

- `server/services/audit` : record, outbox lectures, chaîne de hash, `withAudit`, export CSV signé.
- Écran `/parametres/securite` (filtres, intégrité, export step-up).
- Hook `patient.open` sur ouverture dossier ; `pnpm audit:verify --tenant=`.
- Migration tenant `0001_audit_outbox`.

### P05 — Équipe et RBAC

- `can()` + table de vérité ; nav filtrée par permission ; sièges par offre.
- Invitations (jeton haché 72 h), rôle, désactivation, reset MFA, overrides infirmière.
- Gates `document.sign` / `prescription.validate` avec audit `access_denied`.
- Migration control `0003_equipe`.

### P04 — Inscription tenant

- Assistant 4 étapes `/inscription` branché sur `submitInscription` (CGU/DPA versionnées, captcha, RPPS ManualReview).
- Page `/inscription/attente/[tenantId]` + poll statut provisioning → redirection tenant `/connexion`.
- Migration control `0002_inscription` (RPPS, essai, acceptances, rate-limit).
- Seed démo synthétique optionnel post-provision ; captcha math HMAC auto-hébergé.

### P03 — Authentification

- Better Auth (control-plane) + plugin TOTP, route `/api/auth/*`.
- Écrans connexion / MFA / enrôlement / mot de passe oublié ; PSC désactivé.
- `requireContext({ permission })` + step-up ; matrice RBAC alignée règle 05.
- Cookies host-only (`__Host-` en prod).

### R1 P02

- Provisioning SQL : `format(%I/%L)` pour rôles/bases/mots de passe.

### P02 — Bases, chiffrement, provisioning

- Schémas Drizzle control/tenant + migrations SQL initiales.
- `getControlDb` / `withTenantDb` + cache de pools LRU.
- Chiffrement enveloppe AES-GCM, index aveugle, `LocalDevKeyManager`.
- Job `tenant.provision` (pg-boss) idempotent ; `pnpm db:migrate:tenants` ; seeds synthétiques.
- `audit_event` append-only (trigger) + chaîne de hash.

### R1 — Revue sécurité (post-P01)

- Suppression XSS aperçu CR (`dangerouslySetInnerHTML`) → texte échappé.
- Cookie `demo-role` inactif en production applicative.
- Secret `APP_SECRET` par défaut refusé en prod app ; strip en-têtes internes sur tous les chemins proxy.
- Signature e-CPS : NotAvailable (plus de simulation).

### P01 — Socle technique

- Validation `env.ts` (zod), `.env.example`, `docker-compose.yml` (Postgres 16, MinIO, Gotenberg, ClamAV, Mailpit).
- Logger pino + AsyncLocalStorage `requestId`, redact PII.
- En-têtes de sécurité (CSP nonce, HSTS prod) via `proxy.ts` ; strip des en-têtes internes client.
- ESLint security / no-console, Husky + lint-staged + gitleaks, CI GitHub Actions.
- Tests unitaires en-têtes + E2E Playwright sécurité.
