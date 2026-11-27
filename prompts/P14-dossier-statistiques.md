# P14 — Dossier longitudinal, courbes et statistiques

**Prérequis** : P13. Écrans de référence : `07-dossier-patient-courbes.html`, `04-tableau-de-bord-medecin.html`, `14-statistiques-indicateurs.html`.

## À livrer
- Dossier :
  - problèmes actifs ;
  - traitement en cours (avec auteur et date de mise à jour) ;
  - chronologie (consultations, examens, hospitalisations) ;
  - onglets ;
  - historique des accès au dossier (vue filtrée de l'audit pour `audit.read`).
- Courbes (shadcn `chart`) : TA, FC, poids, FEVG (zones), NT-proBNP, DFG, QTc, LDL (objectif), diamètres aortiques par segment. Sélecteur de période réellement filtrant, seuils et cibles configurables, infobulles avec date, valeur, unité et source.
- Tableau de comparaison chronologique (valeurs à 3 dates et évolution).
- Tableau de bord : KPI, agenda du jour, alertes, documents à valider, activité hebdomadaire, motifs.
- Statistiques du cabinet : file active, distributions FEVG et CHA₂DS₂-VA (scores complets uniquement, nombre d'incomplets affiché), atteinte des objectifs, cohorte IC, liste de patients à rappeler.

## Sécurité (bloquant)
- Les agrégats sont calculés côté serveur. Aucune extraction de données nominatives vers le client au-delà de ce qui est affiché.
- Export statistique **agrégé** uniquement (CSV), step-up, audité, avec un **seuil de petits effectifs** (cellules < 5 masquées).
- `stats.read` est nécessaire. La liste de rappel est visible uniquement par le médecin référent ou un administrateur.

## Tests
- Les séries correspondent aux données sources (tests de requêtes). Un export avec un effectif < 5 est masqué. Accessibilité des graphiques (`aria-label` et tableau alternatif).
