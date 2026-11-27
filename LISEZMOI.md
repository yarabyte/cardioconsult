# Kit Cursor — Cardio Soin (règles + prompts de développement sécurisé)

## Contenu

```text
.cursor/rules/          10 règles permanentes (format MDC), chargées automatiquement par Cursor
  00-projet             contexte, stack, principes (toujours actif)
  01-architecture       couches, Server Actions, conventions
  02-securite           OWASP ASVS niveau 2, sessions, CSP, secrets, logs (toujours actif)
  03-donnees-sante…     RGPD, HDS, chiffrement, dispositif médical (toujours actif)
  04-multitenant…       base PostgreSQL par cabinet, migrations, provisioning
  05-auth-rbac          Better Auth, MFA, matrice des permissions
  06-regles-cliniques   scores et alertes purs, versionnés, testés
  07-documents-audit    comptes rendus, ordonnances, journal d'audit
  08-tests-qualite-ci   pyramide de tests, CI bloquante, définition du « terminé »
  09-ui-accessibilite   tokens, shadcn, WCAG AA, français
prompts/
  00-PROMPT-MAITRE.md   à coller en premier
  P00 … P19             un prompt par lot de fonctionnalités (dans l'ordre)
  R1-revue-securite.md  revue de sécurité à lancer à la fin de chaque lot
docs/
  checklist-securite.md checklist de revue de PR (point de départ)
  cahier-des-charges.md cahier des charges du client
```

## Mode d'emploi

1. À la racine du dépôt : copier `.cursor/`, `prompts/` et `docs/` de ce kit, et `templates-html/` du ZIP précédent.
2. Cursor → mode Agent → coller `prompts/00-PROMPT-MAITRE.md`. Cursor commence par P00 (cadrage, modèle de menaces), puis attend votre validation.
3. Pour chaque lot : « Exécute `prompts/P0X-….md` ». À la fin du lot : « Exécute `prompts/R1-revue-securite.md` sur ce lot ». Relire, puis fusionner.
4. Un lot n'est terminé que si la CI est verte et que le rapport de fin de lot est fourni.

## Points de vigilance

- Ce kit traduit des exigences en consignes de développement. Il ne remplace pas l'avis d'un juriste, d'un DPO ou d'un auditeur.
- Avant tout patient réel, plusieurs portes sont prévues en P19 : hébergeur HDS sous contrat, test d'intrusion externe, analyse de qualification dispositif médical, documents RGPD validés.
