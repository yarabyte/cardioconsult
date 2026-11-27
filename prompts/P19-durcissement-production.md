# P19 — Durcissement et préparation de la mise en production

**Prérequis** : P01 à P18.

## À livrer
- Infrastructure as code (Terraform ou OpenTofu, ou les outils de l'hébergeur HDS) : réseau privé, PostgreSQL managé chiffré et PITR, stockage S3 chiffré, KMS, conteneurs applicatifs, Gotenberg et ClamAV sans accès Internet sortant, bastion avec MFA, environnements séparés (développement / préproduction synthétique / production).
- Pipeline de déploiement : image signée (cosign), SBOM, scan Trivy, migrations contrôlées (control puis tenants par lots), déploiement progressif et retour arrière documenté.
- Observabilité dans le périmètre HDS (OpenTelemetry, métriques, logs sans données de santé), alertes (erreurs 5xx, échecs de connexion anormaux, jobs en échec, latence, espace disque, certificats).
- Sauvegardes : PITR et dumps chiffrés, **test de restauration automatisé mensuel** avec rapport, objectifs RPO ≤ 15 min et RTO ≤ 4 h documentés.
- Runbooks `docs/exploitation/` : incident de sécurité, violation de données, restauration, rotation des clés, perte d'accès d'un administrateur de cabinet, compromission d'un compte.
- Préparation de l'audit externe : rapport de tests, matrice d'exigences SEC-01 à SEC-14 avec la preuve associée, liste des risques résiduels. **Test d'intrusion par un prestataire externe** avant le premier cabinet réel.
- `SECURITY.md` : politique de divulgation des vulnérabilités et contact.

## Sécurité (bloquant) : portes de mise en production
- [ ] Contrat signé avec l'hébergeur certifié HDS, périmètre vérifié.
- [ ] Test d'intrusion réalisé, vulnérabilités critiques et hautes corrigées.
- [ ] Restauration testée avec succès sur la production (tenant de test).
- [ ] Analyse de qualification dispositif médical documentée. Les modules cliniques restent désactivés tant qu'elle n'est pas conclue.
- [ ] Documents RGPD finalisés par un juriste (CGU, contrat de sous-traitance, politique de confidentialité, registre).
- [ ] Aucune donnée réelle en dehors de la production. Accès à la production limités et nominatifs.

Ne déclare jamais le produit « conforme » ou « certifié ». Le rapport final liste les preuves et ce qui reste à obtenir.
