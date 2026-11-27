# Checklist — portes de mise en production (P19)

> Ne jamais cocher une porte sans preuve jointe. Ne jamais écrire « conforme » ou « certifié » sans document tiers.

## Portes bloquantes

| #   | Porte                                                                         | Statut | Preuve                               |
| --- | ----------------------------------------------------------------------------- | ------ | ------------------------------------ |
| 1   | Contrat hébergeur certifié HDS, périmètre vérifié                             | [ ]    | Contrat + annexe périmètre           |
| 2   | Test d’intrusion externe ; vulnérabilités critiques/hautes corrigées          | [ ]    | Rapport pentest + plan de correction |
| 3   | Restauration testée avec succès (tenant de test en prod)                      | [ ]    | Rapport drill mensuel                |
| 4   | Analyse qualification dispositif médical documentée ; modules cliniques off   | [ ]    | Mémo réglementaire + flags off       |
| 5   | Documents RGPD finalisés par un juriste (CGU, DPA, confidentialité, registre) | [ ]    | Versions signées                     |
| 6   | Aucune donnée réelle hors production ; accès prod nominatifs                  | [ ]    | Inventaire accès + attestation       |

## Contrôles techniques associés

- [ ] `NEXT_PUBLIC_APP_ENV=production` (aucun mode mock/démo — retirés du socle)
- [ ] Image signée (cosign), SBOM, scan Trivy sans HIGH/CRITICAL non acceptés
- [ ] Migrations control puis tenants par lots ; rollback documenté
- [ ] Alertes 5xx / auth / jobs / disque / certificats dans le périmètre HDS
- [ ] RPO ≤ 15 min, RTO ≤ 4 h documentés et mesurés au dernier drill

## Risques résiduels

Voir `docs/securite/risques-residuels.md`.
