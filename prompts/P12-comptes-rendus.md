# P12 — Comptes rendus et documents

**Prérequis** : P11. Écran de référence : `11-compte-rendu.html`. Règle : `07-documents-audit.mdc`.

## À livrer
- Modèles par motif (prévention, IC, FA, post-SCA, valvulopathie, CMH, HTP, contrôle PM, préopératoire) avec sections configurables. En-tête du cabinet paramétrable (identité, titres et diplômes affichés au choix, sans les présenter comme vérifiés).
- Génération : snapshot des données sources → brouillon structuré (Tiptap). Les champs vides sont omis ou marqués « non renseigné », sans aucune négation automatique.
- Éditeur avec régénération non destructive (nouvelle version + vue des différences + avertissement « données sources modifiées »).
- Cycle `brouillon → valide → signe` (signature via `SignatureProvider` `NotAvailable`), immutabilité, versions N+1 motivées.
- PDF A4 côté serveur (Gotenberg) identique à l'aperçu : en-tête, identité, version, statut, pagination, zone de signature. Impression et copie du texte.
- Liste « Documents à valider » sur le tableau de bord.

## Sécurité (bloquant)
- Rendu du contenu structuré sans HTML brut (pas de `dangerouslySetInnerHTML`). Test XSS : un `<script>` saisi dans le texte n'est jamais exécuté, ni dans l'aperçu ni dans le PDF.
- Gotenberg isolé du réseau (pas d'accès Internet, pas de ressource distante) et entrées passées par un gabarit contrôlé.
- Validation réservée à `document.validate`, step-up exigé pour la signature. Téléchargements et impressions audités.

## Tests
- T-03 (édition préservée après modification des sources), T-05. PDF généré conforme (snapshot visuel). Document signé non modifiable.
