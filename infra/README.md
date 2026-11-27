# Infrastructure as code (OpenTofu / Terraform)

Squelette P19 — à adapter à l’hébergeur **certifié HDS** retenu.

## Modules prévus

| Module           | Contenu                                       |
| ---------------- | --------------------------------------------- |
| `network`        | VPC / réseau privé, pas d’exposition Postgres |
| `postgres`       | Instance managée chiffrée, PITR, backups      |
| `object_storage` | Bucket S3-compatible chiffré                  |
| `kms`            | KEK pour enveloppe DEK applicatives           |
| `app`            | Conteneurs applicatifs (image signée)         |
| `workers`        | Gotenberg + ClamAV **sans egress Internet**   |
| `bastion`        | Accès admin MFA, journalisé                   |
| `envs`           | Séparation dev / préprod synthétique / prod   |

## Principes

- Aucune donnée réelle hors prod.
- Sortie réseau workers PDF/AV : deny-all sauf destinations internes.
- State Terraform/OpenTofu chiffré, accès nominatif.

Exemple minimal : `opentofu/main.tf.example` (non applicable tant que le provider HDS n’est pas choisi).
