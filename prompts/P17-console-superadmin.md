# P17 — Console super admin

**Prérequis** : P16. Écran de référence : `18-console-super-admin.html`.

## À livrer
- Application sur `console.cardiosoins.com` : authentification distincte (comptes plateforme, MFA par **passkey ou clé matérielle obligatoire**), liste blanche d'IP optionnelle.
- Indicateurs (cabinets actifs, MRR, essais, utilisateurs, churn), graphiques, liste des tenants (recherche, offre, statut, stockage, dernière activité).
- Actions sur un tenant :
  - suspendre ou réactiver ;
  - relancer le provisioning ;
  - activer un module ou un feature flag (avec justificatif obligatoire) ;
  - valider le RPPS (revue manuelle) ;
  - déclencher un export de réversibilité.
- Session support : demande → consentement de l'administrateur du cabinet dans son espace → session déléguée **en lecture seule par défaut**, limitée à 60 min, bandeau visible chez le cabinet, journalisée dans les deux audits, révocable à tout moment.
- Supervision : état des migrations par tenant, jobs en échec, dernières sauvegardes et derniers tests de restauration, expiration des certificats.

## Sécurité (bloquant)
- La console **n'a aucune connexion** aux bases tenant, hors session support consentie (connexion via un rôle en lecture seule créé à la volée et détruit à la fin).
- Rôles plateforme distincts : `PLATFORM_ADMIN`, `PLATFORM_SUPPORT`, `PLATFORM_BILLING`, avec moindre privilège.
- Toute action est auditée dans l'audit plateforme, avec un justificatif texte obligatoire pour les actions sensibles.

## Tests
- Un super admin ne peut lire aucune donnée clinique sans consentement. Une session support expire et devient inutilisable. Le cabinet voit le bandeau et peut révoquer.
