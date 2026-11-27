# R1 — Prompt de revue de sécurité (à lancer à la fin de chaque lot ou sur une PR)

Agis comme un auditeur de sécurité applicative spécialisé santé. Analyse **le diff du lot courant** (ou la branche indiquée) au regard de `.cursor/rules/02-securite.mdc`, `03-donnees-sante-rgpd-hds.mdc`, `04-multitenant-postgres.mdc`, `05-auth-rbac.mdc`, `07-documents-audit.mdc` et `docs/checklist-securite.md`.

Pour chaque fichier modifié, vérifie au minimum :
1. **Isolation des tenants** : la base vient-elle de `ctx.db` ? Un ID reçu du client est-il vérifié dans le tenant courant ? Existe-t-il un test IDOR ?
2. **Autorisation** : `requireContext({ permission })` est-il présent dans chaque action ou chargement ? Les verrous réglementaires sont-ils respectés ?
3. **Entrées** : schéma zod `.strict()` avec bornes ? Pas de `sql.raw`, pas de HTML brut ?
4. **Données de santé** : rien dans les logs, le stockage navigateur, les URL, les e-mails, ni chez un tiers ? Chiffrement applicatif sur les champs sensibles ?
5. **Audit** : un événement par mutation et par ouverture de dossier, dans la transaction, sans contenu clinique ?
6. **Session et step-up** : actions sensibles protégées ?
7. **Fichiers** : MIME + magic bytes, antivirus en fail-closed, URL présignée courte ?
8. **Clinique** : aucune valeur par défaut, trois états respectés, aucun libellé décisionnel, feature flag en place ?
9. **Secrets et dépendances** : aucun secret, aucune dépendance nouvelle non justifiée ou vulnérable ?
10. **Tests** : les tests de sécurité attendus par le prompt du lot existent-ils et passent-ils ?

Livrable : un tableau `Sévérité (critique / haute / moyenne / basse) | Fichier:ligne | Problème | Scénario d'exploitation | Correction proposée`, puis applique les corrections critiques et hautes et relance les tests. Ne signale pas de faux positifs sans scénario concret.
