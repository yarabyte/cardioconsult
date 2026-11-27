# Risques résiduels (préparation mise en production)

Liste non exhaustive — à tenir à jour. **Pas une attestation de conformité.**

| Risque                            | Niveau | Mitigation actuelle       | Action restante         |
| --------------------------------- | ------ | ------------------------- | ----------------------- |
| Hébergeur HDS non contractualisé  | Élevé  | Règles + checklist portes | Signature contrat       |
| KMS non branché (DEK)             | Élevé  | Stub + crypto locale démo | Intégration Vault/KMS   |
| Modules cliniques = DM potentiel  | Élevé  | Flags off hors démo       | Analyse qualification   |
| Textes juridiques placeholders    | Moyen  | Marqueurs juriste         | Revue avocat            |
| Pas de pentest externe            | Élevé  | SAST/CI                   | Prestataire externe     |
| Restore drill non exécuté en prod | Moyen  | Script + runbook          | Drill mensuel planifié  |
| OTel non déployé HDS              | Moyen  | Spec observabilité        | Collecteur auto-hébergé |
| Stripe Checkout stub              | Moyen  | DemoBilling               | Branchement PSP         |
