# Sous-traitants et flux de données

> Placeholders tant que les prestataires ne sont pas choisis. **Aucune donnée de santé ne doit transiter par un sous-traitant non HDS.**

| Acteur                           | Rôle                                   | Données reçues                                   | Données **interdites**                           | HDS requis ?                                           | Statut choix                      |
| -------------------------------- | -------------------------------------- | ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------ | --------------------------------- |
| **Hébergeur infra**              | IaaS / PaaS Postgres, compute, backups | Bases control + tenant, volumes, snapshots       | — (héberge toute la prod santé)                  | **Oui**                                                | TBD                               |
| **Stockage objet S3-compatible** | Fichiers patients, PDF                 | Objets chiffrés liés patient                     | Accès public permanent                           | **Oui** (même périmètre)                               | TBD (souvent même hébergeur)      |
| **Gotenberg (self-host)**        | Génération PDF                         | HTML/JSON gabarit + données acte le temps du job | Persistance hors purge ; copie hors HDS          | **Oui** (déployé dans le périmètre)                    | Self-host prévu                   |
| **Antivirus (ClamAV)**           | Scan uploads                           | Contenu binaire fichier                          | Exfiltration vers cloud AV tiers non HDS         | **Oui** si voit le fichier                             | Self-host prévu                   |
| **KMS / Vault**                  | Enveloppement DEK                      | Clés, jamais le clair patient en API métier      | Contenu clinique                                 | Selon hébergement clés (UE)                            | TBD                               |
| **E-mail transactionnel**        | Invitations, reset MFA, factures       | E-mail pro, liens jetons                         | Nom patient, INS, clinique, pièces jointes santé | Non HDS acceptable **si** minimisation stricte         | TBD                               |
| **PSP (paiement)**               | Abonnements                            | Identité client cabinet, IBAN/carte tokenisés    | Toute donnée de santé / usage clinique           | Non (hors santé)                                       | TBD                               |
| **DNS / CDN**                    | Routage TLS                            | Hostname, IP                                     | Cookies session, corps réponses app tenant       | CDN sur app tenant : à éviter ou config zero-log santé | TBD                               |
| **Monitoring / APM**             | Dispo, erreurs                         | Métriques, `requestId`                           | PII, stack avec données patient                  | Si utilisé : **auto-hébergé HDS**, PII off             | Interdit SaaS hors HDS            |
| **LLM / IA cloud**               | —                                      | —                                                | **Tout** (identité, clinique, CR)                | —                                                      | **Interdit** pour données patient |

## Règles de conception

1. Templates e-mail : revue systématique (pas de `patientName`, pas d’extrait CR).
2. Jobs et workers : mêmes denylists de logs que l’app.
3. Nouveau sous-traitant : entrée ici + DPA + mise à jour questions ouvertes **avant** merge.
4. Super admin / support : pas d’export base tenant vers poste développeur (SEC-14).

## Alignement inventaire

Voir `docs/donnees/inventaire.md` pour le détail entité par entité.
