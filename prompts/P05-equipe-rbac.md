# P05 — Équipe, rôles et matrice de permissions

**Prérequis** : P04. Écran de référence : `17-parametres-equipe-roles.html`.

## À livrer
- `lib/rbac.ts` conforme à la règle 05 (permissions, matrice par défaut, verrous, surcharges par tenant, `can()`).
- Paramètres → Équipe :
  - liste des membres (rôle, état de la MFA, dernière connexion) ;
  - invitation par e-mail (jeton haché, 72 h, usage unique) ;
  - relance et révocation d'invitation ;
  - changement de rôle ;
  - désactivation ;
  - réinitialisation de la MFA d'un membre (il devra se réenrôler).
- Matrice de permissions modifiable pour le rôle infirmière (cases verrouillées non modifiables), avec aperçu des effets.
- Navigation et actions filtrées par `can()` côté serveur (les menus sont calculés dans le Server Component du layout).
- Limite de sièges selon l'offre (contrôle serveur).

## Sécurité (bloquant)
- Step-up exigé pour : rôle, permissions, désactivation, réinitialisation de MFA. Audit de chaque changement (avant/après, sans donnée sensible).
- Impossible de retirer ou désactiver le dernier administrateur. Un membre désactivé voit ses sessions révoquées immédiatement.
- Accepter une invitation exige que l'e-mail connecté soit celui de l'invitation.

## Tests
- Table de vérité complète de `can()`. E2E : une infirmière appelle directement les Server Actions `document.sign` et `prescription.validate` et obtient un refus avec audit ; un membre désactivé est déconnecté à sa requête suivante.
