# P00 — Cadrage, inventaire des données et modèle de menaces

**Objectif** : produire les documents de référence **avant d'écrire du code applicatif**.

## À livrer
- `DECISIONS.md` : journal de décisions (format ADR court). Premières entrées :
  - base dédiée par tenant ;
  - Better Auth ;
  - Drizzle ;
  - pg-boss ;
  - Gotenberg ;
  - chiffrement par enveloppe ;
  - feature flags pour les modules médicaux.
- `docs/donnees/inventaire.md` : chaque entité de `types/domain.ts` avec ses champs, sa sensibilité (identité / santé / technique), sa finalité, sa base (control ou tenant), son chiffrement applicatif (oui/non) et sa conservation (paramètre tenant).
- `docs/securite/modele-menaces.md` : méthode STRIDE sur les flux principaux (navigateur → app, app → PostgreSQL, app → S3, app → Gotenberg, jobs, support, super admin). Pour chaque menace : scénario, impact, mesure, test qui la vérifie.
  - Couvrir au minimum : fuite entre tenants, IDOR, vol de session, force brute, escalade infirmière → médecin, injection, XSS dans les comptes rendus, fichier malveillant, fuite par les logs, super admin malveillant, perte de données, rançongiciel.
- `docs/checklist-securite.md` : checklist de revue de PR (≤ 40 points, tirée des règles 02 à 07).
- `docs/conformite/` : `registre-traitements.md` (trame), `questions-ouvertes.md` (HDS, qualification dispositif médical, conservation, INS, signature), `sous-traitants.md` (hébergeur HDS, e-mail, paiement : quelles données chacun reçoit).
- `types/domain.ts` : types métier complets (inspirés du §6.2 du cahier des charges, avec les états à trois valeurs et les `null`).

## Critères d'acceptation
- Chaque menace du modèle renvoie à au moins un test ou une tâche d'un lot P01 à P19.
- Aucune donnée de santé ne transite par un sous-traitant non HDS dans les flux décrits.
- Je valide les documents avant que tu ne passes à P01.
