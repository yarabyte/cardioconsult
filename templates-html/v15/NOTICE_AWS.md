# Notice technique AWS — Démonstration V15

- Le fichier `index.html` est autonome et peut être servi comme site statique HTTPS. Aucun déploiement backend ou base de données n'est nécessaire pour montrer la démo.
- Pour une mise en ligne protégée, utiliser un hébergement statique à origine privée (par exemple S3 privé + CloudFront/OAC), **avec véritable authentification en amont**. Une URL difficile à deviner n'est pas une protection suffisante.
- Préserver l'accès limité au webmaster et au porteur du projet. Activer HTTPS. Ne jamais mettre de vrais dossiers patients dans le prototype.
- Ne pas exposer de secrets AWS dans les fichiers web et ne pas communiquer de clés d'administration au développeur.
- Préparer un devis et un plan distinct pour le système clinique : backend, PostgreSQL privé, TLS, chiffrement, IAM minimal, journalisation, sauvegardes et tests de restauration, isolations des environnements, conformité RGPD/HDS à analyser en fonction des prestations et contrats.
- Évaluer séparément les intégrations de prescription, le moteur SESAM-Vitale agréé et la qualification réglementaire des aides à la décision.
- Ne pas transformer cette démo en application réelle par simple ajout d'une base de données.
