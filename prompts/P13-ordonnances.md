# P13 — Ordonnances

**Prérequis** : P12. Écran de référence : `12-ordonnance.html`.

## À livrer
- Ordonnance liée à la consultation. Lignes : DCI et dosage, forme, voie, posologie, durée, quantité, renouvellement, remarque. Mise en page bizone (ALD).
- Modèles qui insèrent des **DCI sans dose**. Recherche de DCI : liste locale de démonstration en attendant une base médicamenteuse certifiée (interface `DrugDatabase`, implémentation `NotAvailable` pour les interactions).
- Panneau de vérifications : allergies du patient, dernier DFG et dernière kaliémie **avec leur date**, grossesse renseignée, interactions « base non connectée ». Ce sont des rappels, pas des blocages.
- Validation (step-up) → ordonnance immuable et PDF A4 avec l'identité du prescripteur (RPPS) et du patient, la date et l'identifiant. Duplication contrôlée vers un nouveau brouillon.
- e-prescription : interface seulement, affichée « non disponible ».

## Sécurité (bloquant)
- `prescription.write` et `prescription.validate` réservés au rôle `MEDECIN` (verrou codé en dur). Une infirmière n'y a pas accès, même par surcharge.
- Aucune dose préremplie : test T-17.

## Tests
- T-17. Validation sans step-up refusée. Ordonnance validée non modifiable. Le rappel d'allergie s'affiche si le patient a une allergie renseignée.
