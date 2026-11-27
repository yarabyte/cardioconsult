# Examens complémentaires V15 — note conformité

**Statut :** prévu pour une démonstration / recette technique — **pas** une affirmation de conformité clinique, HDS ou dispositif médical.

## Périmètre livré (ADR-057)

- Catalogue de 24 bilans (`lib/exam-orders/`, version `v15.0.0`), issu du prototype client archivé dans `templates-html/v15/`.
- Rubrique consultation `examens-complementaires` : sélection, déduplication, indication, consignes, aperçu texte.
- Persistance dans le brouillon d’encounter uniquement.
- Flag `clinical.examOrders` (désactivé hors démo / sans activation super-admin).

## Exclusions explicites

- Aucun connecteur laboratoire, aucun accusé de réception.
- Aucune signature électronique ni document exécutoire.
- Aucune décision médicale automatique (pas d’arrêt d’antihypertenseurs, pas d’ajout forcé de panels infectieux / tests dynamiques).
- Aucune donnée patient réelle dans le prototype HTML ni dans les seeds.

## Preuves manquantes avant usage clinique

Voir `docs/conformite/questions-ouvertes.md` § « Prescription d’examens complémentaires (V15) ».
