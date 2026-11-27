# P07 — Patients

**Prérequis** : P06. Écrans de référence : `06-liste-des-patients.html`, en-tête de `07-dossier-patient-courbes.html`.

## À livrer
- Création et édition d'un patient :
  - nom de naissance, nom d'usage, prénom(s), sexe (tel que requis pour les calculs), date de naissance, coordonnées optionnelles ;
  - médecin traitant ;
  - allergies structurées (substance, réaction, sévérité, source) ;
  - dispositifs implantés ;
  - numéro de dossier interne `CC-000184` auto-incrémenté par tenant.
- Statut INS : `non_qualifiee` par défaut, interface `InsProvider` avec une implémentation `NotAvailable`. Aucune qualification simulée.
- Détection de doublons à la création, sur index aveugle (nom normalisé + date de naissance), avec écran de confirmation.
- Liste paginée côté serveur : recherche par index aveugle, filtres par pathologie, tri, état vide.
- Archivage logique (`patient.archive`, motif obligatoire) et restauration. **Aucune suppression physique.**
- Bandeau « Allergie » visible partout où le patient est affiché.

## Sécurité (bloquant)
- Identité stockée chiffrée (P02). Recherche uniquement par index aveugle : pas de `ILIKE` sur du texte clair.
- Ouvrir un dossier génère l'audit `patient.open`. Les URL ne contiennent que l'UUID, jamais le nom.
- Test IDOR : un UUID de patient d'un autre tenant renvoie 404 (et non 403, pour ne pas révéler son existence).

## Tests
- Doublon détecté. Archivage audité. Pagination et filtres. Accessibilité de la liste (axe).
