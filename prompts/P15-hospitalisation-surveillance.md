# P15 — Hospitalisation et surveillance infirmière

**Prérequis** : P14. Écrans de référence : `13-hospitalisation-vue-du-service.html`, `16-constantes-surveillance.html`.

## À livrer
- Module activable par tenant (offre « Clinique ») : services, chambres et lits paramétrables, séjours (entrée, motif, médecin référent, sortie prévue, sortie effective).
- Vue du service : grille des lits, filtres (sorties prévues, examens en attente, alertes), panneau de détail (point de staff, examens en attente, dernière transmission IDE).
- Surveillance :
  - saisie horodatée des constantes (TA, FC, SpO₂, T°, FR, poids, EVA) avec bornes d'alerte configurables (par défaut TAS < 90 ou > 180) ;
  - bilan entrées/sorties ;
  - diurèse ;
  - courbes sur 24 h ;
  - tableau des dernières mesures ;
  - transmissions ciblées.
- Le séjour est rattaché au dossier patient et visible dans sa chronologie.

## Sécurité (bloquant)
- Encadré dans `docs/conformite/questions-ouvertes.md` : en établissement, le responsable du traitement est l'établissement. L'activation du module exige la case « contrat établissement signé » côté super admin, et l'action est tracée.
- Les mesures saisies sont immuables : une correction crée une nouvelle mesure qui annule la précédente, avec un motif.

## Tests
- Alerte de borne affichée et persistée. Une correction de mesure conserve l'historique. Les filtres de la vue du service fonctionnent.
