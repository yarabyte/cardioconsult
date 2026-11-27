# P16 — Abonnements et facturation de la plateforme

**Prérequis** : P15. Écran de référence : section Tarifs de `01-site-public…html`.

## À livrer
- Offres Solo, Cabinet et Clinique (sièges, modules activés) dans le control-plane. Les prix sont un paramètre, aucune valeur en dur dans le code.
- Paiement via Stripe Checkout et le Customer Portal : TVA française, factures conformes, moyens SEPA et carte. Webhooks signés et idempotents (table `processed_event`).
- Cycle : essai de 30 jours (plan Solo forcé à l’inscription) → Solo payant (upgrade Cabinet/Clinique possible) → actif → impayé (période de grâce) → suspendu (lecture seule et export possibles) → résilié (réversibilité : export complet proposé, puis suppression selon le contrat).
- Rappels e-mail transactionnels J-7 et J-1 avant fin d’essai (SMTP, sans donnée clinique) ; scan quotidien `billing.trial_scan` ; fin d’essai sans paiement → `past_due` + grâce (ADR-059).
- Paramètres → Abonnement : offre, sièges, factures, changement d'offre / upgrade (réservé à `billing.manage`, step-up).

## Sécurité (bloquant)
- **Aucune donnée de santé ni nom de patient** envoyé à Stripe. Seuls le cabinet (raison sociale, adresse de facturation) et l'e-mail de l'administrateur sont transmis.
- Jamais de saisie de carte dans l'application : uniquement les pages hébergées par Stripe.
- La vérification de signature des webhooks est obligatoire, et la clé secrète se trouve uniquement dans l'environnement.
- Un tenant suspendu garde l'accès en lecture à ses dossiers pour la continuité des soins.

## Tests
- Webhook rejoué → idempotent. Signature invalide → 400. Passage en impayé puis suspendu → lecture seule effective, export toujours possible.
