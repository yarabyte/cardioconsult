# P10 — Examens (biologie, ECG, ETT, aorte, imagerie) et fichiers

**Prérequis** : P09. Écrans de référence : `08-…ett.html`, `09-module-aorte-red-flag.html`, `16-constantes-surveillance.html` (dépôt d'ECG).

## À livrer
- Biologie : résultats datés (prélèvement), unités normalisées, provenance, contrôle de plages larges, distinction mesuré / interprété. Saisie multiple par date.
- ECG : rythme, FC, PR, QRS, QTc **avec méthode**, axe, troubles de conduction **multiples**, ST/T par dérivation, stimulation et dispositif, interprétation libre.
- ETT : VG (méthode FEVG), OG indexée, VD, pressions, VCI, péricarde, valves qualitatives et modules quantitatifs optionnels (IM, RAo, IA, IT) avec affichage des discordances, conclusion libre.
- Aorte : une mesure par segment (anneau, sinus, JST, ascendante, crosse, descendante), avec méthode, date, qualité et « non visualisé ».
- Épreuve d'effort, coronaires et imagerie, rythmologie et PM : formulaires structurés minimaux.
- Fichiers : PDF ou images d'ECG, comptes rendus externes. Téléversement direct vers S3 par URL présignée, file d'attente antivirus, statut `en_analyse → disponible | rejete`, aperçu sécurisé.

## Sécurité (bloquant)
- Fichiers : liste blanche MIME + magic bytes, 20 Mo maximum, ClamAV, renommage UUID, chiffrement côté serveur (SSE-KMS ou équivalent HDS), URL présignée de 5 min liée à l'utilisateur, aucun accès public au bucket.
- Les métadonnées EXIF ou PDF sont nettoyées avant mise à disposition.
- Upload interdit tant que l'antivirus n'est pas joignable (fail closed).

## Tests
- Fichier EICAR rejeté. Faux PDF (MIME incohérent) rejeté. URL expirée refusée. Un QTc sans méthode est refusé. Une mesure aortique « non visualisée » n'est jamais traitée comme 0.
