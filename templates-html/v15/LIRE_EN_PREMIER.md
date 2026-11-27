# Cardio Soin V15 — Dossier de présentation au webmaster

**Contenu :** `index.html` (prototype V15 interactif), `SPECIFICATIONS_V15_CODEX.md` (détail des derniers bilans), `NOTICE_AWS.md` (déploiement et sécurité).

## Présentation du projet

Cardio Soin Hospitalisation/Consultation est un logiciel médical en développement, destiné à gérer les dossiers cardiologiques, consultations et séjours, antécédents, ECG, ETT, scores, comptes rendus et prescriptions. Il prévoit aussi le suivi de l’insuffisance cardiaque après hospitalisation, la réception future de résultats biologiques, des alertes médicales et un parcours carte Vitale/FSE. **Ces intégrations ne sont pas opérationnelles pour un usage réel.**

La V15 comprend une bibliothèque de prescriptions d'examens complémentaires, notamment infectiologie (hémocultures, ECBU, bactérien, viral, fongique), endocrinologie, surrénales et HTA secondaire.

## Ce que doit faire le webmaster

1. Ouvrir `index.html` pour découvrir la version V15.
2. Préparer une **URL de démonstration** sous HTTPS, avec accès protégé (authentification) et fichier `index.html` comme point d'entrée.
3. Vérifier l'infrastructure AWS existante : compte, région, EC2/Lightsail/autre, coûts et accès administrateurs.
4. Proposer **séparément** un environnement de production sécurisé : API, base PostgreSQL privée, sauvegardes, chiffrement, identité, journalisation, supervision.
5. Documenter le périmètre HDS des services AWS retenus, les contrats, les responsabilités et les exigences RGPD avant tout traitement de données de santé réelles.
6. Fournir l'URL de démonstration, le schéma technique et le coût prévisionnel.

## Mise en garde impérative

Cette V15 est **un prototype de démonstration** : **aucune vraie donnée de patient** ne doit y être saisie, importée ou stockée. Ni la lecture réelle des cartes Vitale, ni la télétransmission SESAM-Vitale, ni la connexion aux laboratoires ne sont prêtes. La mise en ligne de ce fichier HTML sur AWS ne signifie pas que Cardio Soin est conforme pour l'usage clinique.

**Objectif :** préparer progressivement une version clinique validée pour 2027, sans confondre démonstration et production.
