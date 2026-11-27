# Matrice SEC-01 … SEC-14 — preuves

Référence cahier des charges. **Statut** : preuve technique partielle ≠ conformité.

| ID     | Exigence (résumé)           | Preuve actuelle                               | Manquant                 |
| ------ | --------------------------- | --------------------------------------------- | ------------------------ |
| SEC-01 | Auth nominative + MFA       | Better Auth + TOTP ; tests auth               | Passkeys console prod    |
| SEC-02 | Mots de passe robustes      | Config Better Auth / argon2                   | Revue paramètres prod    |
| SEC-03 | Anti force-brute            | Rate limit auth + signup                      | Tuning seuils prod       |
| SEC-04 | Cookies host-only / session | Middleware / auth cookies                     | Audit pentest            |
| SEC-05 | Idle / durée absolue        | `require-context` idle                        | Config par tenant        |
| SEC-06 | Isolation tenant            | Host + membership + IDOR 404                  | Pentest multi-tenant     |
| SEC-07 | Permissions serveur         | RBAC + Server Actions                         | Revue exhaustive         |
| SEC-08 | Super admin sans dossiers   | Console sans `getTenantDb` ; support consenti | Role PG RO réel          |
| SEC-09 | Validation entrées          | zod partout (cible)                           | Couverture SAST continue |
| SEC-10 | Uploads sûrs                | MIME + magic + ClamAV fail-closed             | Infra ClamAV sans egress |
| SEC-11 | CSP / headers               | `lib/security/headers.ts` + E2E               | —                        |
| SEC-12 | Secrets / env               | `env.ts` + gitleaks                           | KMS réel                 |
| SEC-13 | Logs sans PII               | pino denylist                                 | Revue templates e-mail   |
| SEC-14 | Pas de copie prod           | Règles + runbooks                             | Contrôle accès HDS       |

Mise à jour après chaque lot / pentest.
