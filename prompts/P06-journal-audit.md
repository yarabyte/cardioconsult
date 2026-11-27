# P06 — Journal d'audit

**Prérequis** : P05.

## À livrer
- `server/services/audit` :
  - `audit.record(ctx, event)` dans la transaction courante ;
  - outbox pour les événements de lecture ;
  - calcul de la chaîne de hachage ;
  - vérification d'intégrité (`pnpm audit:verify --tenant`).
- Wrapper `withAudit` pour les Server Actions et hook d'audit `patient.open` dans le chargement du dossier.
- Écran Paramètres → Sécurité et journal :
  - filtres (période, acteur, action, entité) ;
  - export CSV signé (step-up) ;
  - indicateur d'intégrité de la chaîne.
- Audit plateforme côté control-plane : connexions, inscriptions, actions du super admin, sessions support.

## Sécurité (bloquant)
- Aucun nom, aucune donnée clinique dans les événements : uniquement des identifiants. Test qui échoue si une colonne d'audit contient une valeur présente dans `patient_identity`.
- Journal en lecture seule pour tous, y compris l'administrateur du cabinet. Aucun endpoint de suppression.

## Tests
- Chaque mutation existante produit exactement un événement. Une chaîne altérée est détectée. L'export exige le step-up et est lui-même audité.
