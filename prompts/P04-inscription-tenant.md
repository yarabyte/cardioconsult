# P04 — Inscription d'un cabinet et création du tenant

**Prérequis** : P03. Écrans de référence : `01-site-public…html`, `02-inscription-creation-du-tenant.html`.

## À livrer
- Assistant en 4 étapes sur le domaine racine :
  1. Compte : identité, e-mail professionnel vérifié, mot de passe et MFA.
  2. Cabinet et RPPS : numéro RPPS (11 chiffres, clé de contrôle), adresse. Vérification via `RppsVerifier` (`ManualReview` : le tenant fonctionne en essai, mais l'export et le passage en abonnement payant sont bloqués tant que le RPPS n'est pas validé par le support).
  3. Espace : sous-domaine avec validation en direct (format, liste réservée, unicité, anti-homoglyphes), nom affiché, hébergement « France — HDS » non modifiable.
  4. Essai 30 jours (offre Solo forcée, sans choix d’offre) : confirmation d’essai, données démo optionnelles, captcha ; CGU et contrat de sous-traitance (art. 28) déjà acceptés à l’étape espace. Aucun paiement. Après essai → Solo avec upgrade possible. Rappels e-mail J-7 et J-1 (ADR-059).
- À la soumission : création du tenant `provisioning`, job `tenant.provision`, page d'attente avec suivi d'état, puis redirection vers `https://<slug>.cardiosoins.com/connexion`.
- Création des rôles par défaut (médecin administrateur, infirmière) et d'un jeu de données de démonstration **synthétique**, activable ou désactivable et clairement étiqueté.

## Sécurité (bloquant)
- Anti-abus : limitation de débit par IP et par e-mail, captcha accessible respectueux de la vie privée **auto-hébergé** (pas de reCAPTCHA), domaines d'e-mail jetables refusés.
- Vérification d'unicité du sous-domaine côté serveur, dans une transaction avec contrainte `UNIQUE` (pas seulement côté client).
- Aucune donnée de santé collectée à l'inscription.

## Tests
- E2E inscription complète → tenant actif → connexion. Sous-domaine réservé ou pris refusé. Double soumission idempotente. Échec simulé du provisioning → état `provisioning_failed` et reprise.
