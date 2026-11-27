# Modèle de menaces — Cardio Soin (STRIDE)

Méthode : STRIDE sur les flux principaux. Chaque menace renvoie à une **mesure** et à un **test ou lot** (P01–P19 / T-xx / checklist).

Périmètre : SaaS multi-tenant France, données de santé, rôles MEDECIN / INFIRMIERE / SUPERADMIN.

## Flux analysés

```text
Navigateur ──HTTPS──► App Next.js ──► PostgreSQL (control + tenant)
                     ├──► S3 HDS (fichiers)
                     ├──► Gotenberg (PDF)
                     ├──► pg-boss (jobs)
Support délégué / Console super admin (sans accès bases tenant)
```

Légende STRIDE : **S** Spoofing · **T** Tampering · **R** Repudiation · **I** Information disclosure · **D** Denial of service · **E** Elevation of privilege.

---

## 1. Navigateur → application

| ID   | STRIDE | Scénario                               | Impact                 | Mesure                                                                                                                             | Vérification                                            |
| ---- | ------ | -------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| M-01 | S      | Vol de session (XSS, malware poste)    | Accès dossier patient  | Cookies `__Host-`, Secure, HttpOnly, SameSite=Lax ; CSP stricte nonce ; pas de données patient en storage navigateur ; idle 15 min | P03 ; checklist CSP ; T-16 ; test cookie flags          |
| M-02 | S      | Force brute login                      | Compromission compte   | Rate limit IP + compte ; messages identiques ; MFA TOTP obligatoire                                                                | P03 ; test rate-limit                                   |
| M-03 | T      | CSRF sur Server Action                 | Mutation non voulue    | Origin natif Server Actions + vérif Origin routes mutables                                                                         | P01/P03 ; test Origin                                   |
| M-04 | I      | XSS dans compte rendu riche            | Vol session / fuite UI | Contenu JSON Tiptap, rendu sans HTML brut ; pas de `dangerouslySetInnerHTML`                                                       | P12 ; revue checklist ; dette démo `contentHtml` connue |
| M-05 | I      | Données patient dans URL / logs client | Fuite                  | Interdit IDs sensibles en query ; logger pino avec denylist                                                                        | P06/P07 ; SEC-01/11                                     |
| M-06 | D      | Flood requêtes                         | Indispo cabinet        | Rate limit edge + app ; timeouts                                                                                                   | P19                                                     |

## 2. Application → PostgreSQL

| ID   | STRIDE | Scénario                                          | Impact                      | Mesure                                                                                | Vérification                      |
| ---- | ------ | ------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------- | --------------------------------- |
| M-07 | I      | Fuite inter-tenants (mauvais pool / header forgé) | Violation massive           | Tenant depuis hôte seul ; strip `x-cc-tenant` entrant ; `getTenantDb` ; rôle PG dédié | P02 ; test isolation cross-tenant |
| M-08 | I/E    | IDOR (UUID autre patient/tenant)                  | Lecture/écriture illicite   | `requireContext` + existence dans `ctx.db` → 404                                      | P07+ ; test IDOR checklist        |
| M-09 | T      | Injection SQL                                     | Lecture/écriture arbitraire | Drizzle seul ; `sql.raw` interdit                                                     | Semgrep/CI ; P01                  |
| M-10 | T      | Modification silencieuse CR signé                 | Intégrité médicale          | Immutabilité + version N+1 + audit                                                    | P12 ; SEC-08                      |
| M-11 | R      | Déni d’action (« je n’ai pas ouvert ce dossier ») | Conteste audit              | `audit_event` append-only, hash chaîné, même transaction                              | P06 ; tests audit                 |

## 3. Application → S3 (fichiers)

| ID   | STRIDE | Scénario                                | Impact                         | Mesure                                                 | Vérification              |
| ---- | ------ | --------------------------------------- | ------------------------------ | ------------------------------------------------------ | ------------------------- |
| M-12 | I      | URL présignée trop longue / fuitée      | Exfiltration fichier           | TTL ≤ 5 min ; auth préalable ; audit download          | P10                       |
| M-13 | T      | Fichier malveillant (malware, polyglot) | Exécution / ransomware latéral | MIME + magic bytes ; ClamAV fail-closed ; nom régénéré | P10 ; test upload infecté |
| M-14 | E      | Upload hors patient / sans permission   | Stockage abusif                | Permission `exam.write` + lien patient tenant          | P10                       |

## 4. Application → Gotenberg

| ID   | STRIDE | Scénario                        | Impact           | Mesure                                                   | Vérification |
| ---- | ------ | ------------------------------- | ---------------- | -------------------------------------------------------- | ------------ |
| M-15 | I      | Fuite PDF / fichiers temp       | Disclosure       | Réseau privé HDS ; purge temp ; stockage chiffré         | P12 ; SEC-10 |
| M-16 | T      | Injection HTML dans gabarit PDF | Contenu trompeur | Gabarit maîtrisé + données échappées / JSON→template sûr | P12          |

## 5. Jobs (pg-boss)

| ID   | STRIDE | Scénario                              | Impact                  | Mesure                                      | Vérification |
| ---- | ------ | ------------------------------------- | ----------------------- | ------------------------------------------- | ------------ |
| M-17 | E      | Job rejoué crée 2 bases tenant        | Incohérence / coût      | Provisioning idempotent par étapes          | P02          |
| M-18 | I      | Payload job avec PII dans logs worker | Fuite logs              | Denylist logger ; ids techniques seuls      | P06/P19      |
| M-19 | D      | Queue saturée                         | Retard PDF/provisioning | Monitoring profondeur queue ; DLQ ; alertes | P19          |

## 6. Support & super admin

| ID   | STRIDE | Scénario                                            | Impact                            | Mesure                                                                                                     | Vérification                              |
| ---- | ------ | --------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| M-20 | E      | Super admin malveillant lit dossiers                | Violation + confiance             | Aucun chemin code vers bases tenant ; support = session déléguée consentie, bornée, auditée des deux côtés | P17 ; P18 ; tests « no tenant db import » |
| M-21 | E      | Escalade infirmière → médecin (permission UI seule) | Signature / prescription illicite | Verrous codés en dur ; test E2E action directe refus + audit `access_denied`                               | P05 ; matrice RBAC                        |
| M-22 | S      | Usurpation session support                          | Accès prolongé                    | TTL courte ; révocabilité ; step-up consentement admin                                                     | P17                                       |

## 7. Disponibilité & intégrité des données

| ID   | STRIDE | Scénario                                 | Impact              | Mesure                                                                     | Vérification              |
| ---- | ------ | ---------------------------------------- | ------------------- | -------------------------------------------------------------------------- | ------------------------- |
| M-23 | D/T    | Perte de données / corruption            | Indispo soins       | PITR + dumps chiffrés HDS ; restore test mensuel                           | P02/P19 ; SEC-09/13       |
| M-24 | T      | Rançongiciel sur volume / S3             | Chiffrement hostile | Backups immuables / hors ligne logique ; moindre privilège ; scan malware  | P19 ; SEC-09              |
| M-25 | I      | Sous-traitant non HDS reçoit de la santé | Non-conformité      | Inventaire sous-traitants ; e-mails sans clinique ; pas d’analytics tenant | P00 docs ; P18 ; revue PR |

## 8. Couverture minimale exigée (P00)

| Exigence prompt         | Menaces    |
| ----------------------- | ---------- |
| Fuite entre tenants     | M-07       |
| IDOR                    | M-08       |
| Vol de session          | M-01       |
| Force brute             | M-02       |
| Escalade IDE → médecin  | M-21       |
| Injection               | M-09       |
| XSS comptes rendus      | M-04       |
| Fichier malveillant     | M-13       |
| Fuite par les logs      | M-05, M-18 |
| Super admin malveillant | M-20       |
| Perte de données        | M-23       |
| Rançongiciel            | M-24       |

## Hypothèses

- Poste soignant hors périmètre applicatif (chiffrement disque recommandé, SEC-03).
- Hébergeur HDS sous contrat avant données réelles (porte P19).
- Aucune intégration INSi / e-CPS / Vitale / MSSanté active : interfaces `NotAvailable` (`SesamVitaleAdapter` inclus, ADR-038).
