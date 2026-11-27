# P03 — Authentification, MFA et sessions

**Prérequis** : P02. Écran de référence : `templates-html/03-connexion-a-l-espace-cabinet.html`.

## À livrer
- Better Auth sur le control-plane : e-mail et mot de passe, **2FA TOTP obligatoire** (enrôlement forcé, codes de secours hachés), passkeys en option.
- Écrans :
  - connexion (sur l'hôte du tenant) ;
  - enrôlement MFA (QR code + saisie de vérification) ;
  - code MFA ;
  - mot de passe oublié et réinitialisation ;
  - vérification d'e-mail.
- `requireContext({ permission })` : session valide, MFA satisfaite, appartenance active au tenant de l'hôte, permission accordée. Sinon redirection ou refus, avec audit `access_denied`.
- Expiration après inactivité (15 min par défaut, réglage tenant, 30 min maximum) avec avertissement à 1 min, durée absolue de 12 h, verrouillage d'écran qui demande le mot de passe sans perdre le brouillon serveur.
- Ré-authentification « step-up » (moins de 5 min) exigée pour signer, exporter, changer un rôle ou désactiver la MFA.
- Bouton « Pro Santé Connect » visible mais désactivé (« bientôt disponible »), avec un fournisseur OIDC préparé derrière `PSC_ENABLED`.

## Sécurité (bloquant)
- Cookies `__Host-`, host-only, `Secure`, `HttpOnly`, `SameSite=Lax`.
- Limitation de débit : 5 essais par 15 min et par compte, 20 par IP, puis délai exponentiel. Message d'erreur unique.
- Liens de réinitialisation : jeton haché, usage unique, 30 min. L'e-mail ne contient aucune donnée personnelle hormis le prénom de l'utilisateur.
- Un utilisateur membre de deux tenants a deux sessions distinctes : aucune session n'est valable sur un autre sous-domaine.

## Tests
- E2E : connexion + MFA réussie ; mauvais code MFA ; force brute bloquée ; session expirée ; cookie copié vers un autre sous-domaine refusé ; une action de signature sans step-up est refusée.
