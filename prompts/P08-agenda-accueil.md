# P08 — Agenda, accueil et préparation infirmière

**Prérequis** : P07. Écrans de référence : `05-agenda.html`, `04-tableau-de-bord-medecin.html` (agenda du jour), `15-tableau-de-bord-infirmiere.html`.

## À livrer
- Types de rendez-vous paramétrables (durée, couleur, rôle exécutant), plages, blocs administratifs.
- Vues jour, semaine et mois. Création, déplacement et annulation de RDV avec contrôle de chevauchement côté serveur.
- Liste d'attente.
- Statuts du parcours : `prevu → arrive → en_preparation → pret → en_consultation → termine`, avec `absent` et `annule`.
- Tableau de bord infirmière :
  - file d'accueil ;
  - cases constantes, ECG et poids ;
  - bouton « Marquer prêt » ;
  - tâches du jour ;
  - transmissions au médecin.
- Mise à jour en quasi temps réel entre le poste IDE et le poste médecin (polling court ou SSE, sans service tiers).
- Synchronisation agenda externe, prise de RDV en ligne et SMS : interfaces seulement, affichées « non disponible ».

## Sécurité (bloquant)
- Une infirmière ne voit que les agendas des médecins de son tenant. Les transmissions sont auditées.
- Un flux SSE est authentifié et limité au tenant, et ne pousse que des identifiants et des statuts (le client recharge le détail par requête autorisée).

## Tests
- Chevauchement refusé. Transitions de statut invalides refusées. L'E2E « IDE marque prêt → le médecin le voit » passe.
