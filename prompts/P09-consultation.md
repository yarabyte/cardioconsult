# P09 — Consultation guidée (20 rubriques)

**Prérequis** : P08. Écran de référence : `08-consultation-guidee-ett.html`. Registre des champs : cahier des charges §12.2.

## À livrer
- Entité `encounter` liée au patient (et éventuellement au séjour et au RDV), avec auteur, date de l'acte, motif et statut (`brouillon`, `cloturee`).
- Stepper des 20 rubriques avec état par rubrique : fait / courant / incomplet / alerte / vide. Barre de complétude calculée côté serveur.
- Rubriques de ce lot :
  - identité, motif et histoire ;
  - antécédents structurés (pathologie, statut, date, paramètres, commentaire) ;
  - facteurs de risque CV (trois états) ;
  - traitements et allergies ;
  - examen clinique (constantes avec unités, NYHA, signes, auscultation en texte libre **vide par défaut**).
- Constantes saisies par l'IDE reprises automatiquement, avec auteur et heure affichés.
- Calculs dérivés (âge à la date de l'acte, IMC, surface corporelle Mosteller) via `lib/clinical`, avec la formule affichée.
- Enregistrement automatique du brouillon **côté serveur** (debounce de 2 s, verrou optimiste, indicateur « enregistré à HH:MM », conflit signalé si deux postes éditent).
- Modèles de saisie (« ETT normale », etc.) applicables uniquement après confirmation dans un dialogue. La ligne d'audit précise que le modèle a été appliqué.

## Sécurité (bloquant)
- Aucune valeur « normale » par défaut. Test T-02 : rubriques vides → aucune phrase « normal » générée.
- Clôturer une consultation est réservé à `encounter.write`. Une infirmière ne peut saisir que constantes, ECG et notes.

## Tests
- T-01, T-02, T-04 du cahier des charges. Conflit d'édition détecté. Âge calculé à la date de l'acte pour une consultation antidatée.
