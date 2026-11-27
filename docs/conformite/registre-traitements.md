# Registre des traitements — trame (éditeur & cabinets)

> Trame de travail. À faire valider par un DPO / juriste avant production. Ne pas présenter comme registre conforme.

## A. Traitements dont l’éditeur Cardio Soin est responsable

| #   | Finalité                                              | Base légale (à confirmer)     | Catégories de personnes           | Données                                                            | Destinataires                  | Durée                      | Transferts hors UE |
| --- | ----------------------------------------------------- | ----------------------------- | --------------------------------- | ------------------------------------------------------------------ | ------------------------------ | -------------------------- | ------------------ |
| A1  | Gestion des comptes utilisateurs plateforme / console | Contrat / intérêt légitime    | Personnels cabinets, super-admins | Identité pro, e-mail, logs auth                                    | Hébergeur HDS, support interne | Compte + obligation légale | Non (cible UE)     |
| A2  | Facturation et abonnements                            | Contrat                       | Clients (cabinets)                | Raison sociale, SIRET, e-mails admin, moyens de paiement tokenisés | PSP (paiement), comptabilité   | Obligations comptables     | Selon PSP          |
| A3  | Support technique (sans dossier patient)              | Contrat                       | Admins cabinet                    | Tickets, métadonnées techniques                                    | Outils support (sans santé)    | Politique support          | Non                |
| A4  | Sécurité (journaux techniques, détection abus)        | Intérêt légitime / obligation | Utilisateurs                      | IP tronquée, user-agent hash, requestId                            | Hébergeur                      | Politique logs             | Non                |

## B. Traitements dont le cabinet / établissement est responsable (éditeur = sous-traitant art. 28)

| #   | Finalité                                   | Base légale (cabinet)                | Personnes             | Données                                      | Sous-traitant                       | Durée                           | Mesures                              |
| --- | ------------------------------------------ | ------------------------------------ | --------------------- | -------------------------------------------- | ----------------------------------- | ------------------------------- | ------------------------------------ |
| B1  | Dossier médical cardiologique              | Soins / obligations professionnelles | Patients              | Identité, INS, clinique, documents, fichiers | Éditeur Cardio Soin + hébergeur HDS | Paramétrable tenant + archivage | Chiffrement, RBAC, audit             |
| B2  | Agenda et accueil                          | Soins / organisation                 | Patients, usagers     | RDV, motif                                   | Idem                                | Idem                            | Idem                                 |
| B3  | Hospitalisation / surveillance (si activé) | Soins                                | Patients hospitalisés | Séjour, constantes, notes IDE                | Idem                                | Idem                            | Validation établissement obligatoire |
| B4  | Exports / portabilité demandés par le RT   | Droits personnes / contrat           | Patients              | Export chiffré                               | Idem                                | Selon demande                   | Step-up, audit                       |

## C. Mentions à maintenir ailleurs

- Contrat de sous-traitance versionné + acceptation horodatée à l’inscription (P04).
- Mentions d’information patient : responsabilité du cabinet (modèles à fournir en P18, pas « déjà conformes »).
- Violations : procédure détection → registre → qualification → notification CNIL si requis (P18).
