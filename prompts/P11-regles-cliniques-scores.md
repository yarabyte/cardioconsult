# P11 — Règles cliniques, scores et alertes

**Prérequis** : P10. Écrans de référence : `10-scores-contextuels.html`, `09-module-aorte-red-flag.html`. Règle : `06-regles-cliniques.mdc`.

## À livrer
- `lib/clinical` (pur, testé) :
  - `cha2ds2va`, `hasbled`, `rcri`, `timi` (si toutes les définitions sont vérifiables) ;
  - `bsa`, `bmi`, `ageAtDate`, `qtc` (Fridericia, Bazett) ;
  - `aorta` (par segment, croissance, surface/hauteur, niveaux d'alerte) ;
  - `ePhtProbability` (statut `incomplet` tant que les critères requis manquent).
- Scores officiels non implémentés (EuroSCORE II, STS, GRACE, HCM Risk-SCD, SCORE2/SCORE2-OP) : saisie externe avec lien et statut `saisi_externe`.
- Moteur de contexte : n'affiche que les familles de scores applicables, les autres en « non applicable » avec la raison.
- UI : critères à trois états, résultat en `aria-live`, panneaux « Pourquoi ce résultat ? » et « Données manquantes ».
- Alertes persistées (`clinical_alert`) : niveau, règle et version, entrées. Reconnaissance avec auteur et date. Liste « Alertes à revoir » sur le tableau de bord.
- Seuils configurables par tenant (Paramètres → Règles cliniques), versionnés et audités, avec la mention « à valider cliniquement ».
- Feature flags : `clinical.scores`, `clinical.alerts`, `clinical.aorta`. Désactivés par défaut en production, activables par tenant par le super admin seulement après un accord documenté.
- Fiches `docs/regles/<ruleId>.md` pour chaque règle.

## Sécurité (bloquant)
- Les règles ne produisent jamais de libellé décisionnel (« indication », « diagnostic », « traitement recommandé »). Un test vérifie l'absence de ces mots dans les sorties.

## Tests
- T-06 à T-15 du cahier des charges, couverture ≥ 95 % de `lib/clinical`. Changement puis retrait d'un critère → recalcul correct (pas d'état « collant »). Aorte ascendante 38 mm avec descendante 60 mm → pas d'alerte racine ou ascendante.
