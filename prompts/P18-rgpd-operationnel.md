# P18 — RGPD opérationnel

**Prérequis** : P17.

## À livrer
- Paramètres → Données et RGPD (administrateur du cabinet) :
  - politique de conservation paramétrable, avec alerte des dossiers arrivés à échéance mais **sans purge automatique** : la décision appartient au responsable de traitement ;
  - export complet du tenant (JSON documenté + PDF des documents, archive chiffrée, step-up, lien de 24 h, audité) ;
  - export d'un dossier patient (droit d'accès ou portabilité) ;
  - modèle de notice d'information patient à personnaliser et imprimer.
- Rectification par addendum : historique des versions visible, motif obligatoire.
- Registre des violations (côté plateforme et côté cabinet) : déclaration, qualification, actions, notification. Un lien vers la procédure CNIL est affiché, sans automatiser la notification.
- Pages légales du site public : mentions légales, CGU, politique de confidentialité, contrat de sous-traitance, liste des sous-traitants. Contenus avec des marqueurs `[À COMPLÉTER PAR LE JURISTE]`, sans texte juridique inventé.
- Gestion des cookies : aucun cookie non essentiel dans l'application, donc aucun bandeau côté app. Côté site public, bandeau seulement si une mesure d'audience non exemptée est ajoutée.

## Sécurité (bloquant)
- Les exports sont chiffrés, à usage limité, audités, et le fichier est supprimé du stockage après expiration.
- Suppression définitive d'un tenant résilié : double validation (administrateur du cabinet et plateforme), délai de grâce, effacement de la base, des fichiers, des sauvegardes selon le contrat et de la clé DEK (crypto-effacement), puis certificat de suppression.

## Tests
- Export complet → réimport dans un tenant de test sans perte. Lien expiré inutilisable. Crypto-effacement → données de sauvegarde illisibles.
