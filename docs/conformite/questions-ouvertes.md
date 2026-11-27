# Questions ouvertes — conformité

À trancher avec DPO, RSSI, juriste, et le cas échéant organisme notifié. Aucune de ces lignes n’est « résolue » par le code seul.

## Hébergement HDS

- [ ] Quel hébergeur certifié HDS (périmètre infra vs infogérance) et localisation des données / sauvegardes ?
- [ ] Les journaux applicatifs, file pg-boss, Gotenberg et S3 sont-ils tous dans le même périmètre certifié ?
- [ ] Contrat art. 28 + annexes techniques signés avant tout patient réel ?

## Dispositif médical (UE) 2017/745

- [ ] Les scores interprétés et alertes aorte ont-ils une finalité médicale au sens de la règle 11 ?
- [ ] Si oui : classification, organisme notifié, validation clinique, PMS — planning ?
- [ ] Feature flags off en prod jusqu’à quelle preuve écrite ?

## Conservation et archivage

- [ ] Durées minimales / maximales par type de document selon le type d’établissement (libéral vs GHT) ?
- [ ] Qui décide de la purge (jamais automatique sans décision RT) — outillage P18 : alerte échéance sans purge auto ; textes juridiques et délais contractuels à valider ?
- [x] Runbook violation documenté (`docs/exploitation/violation-donnees.md`) — modèles de notification CNIL / information personnes : toujours `[À COMPLÉTER PAR LE JURISTE / DPO]`.
- [ ] Exécution réelle du drill de restauration mensuel dans le périmètre HDS (preuve porte #3).
- [ ] Format d’archivage légal vs export de réversibilité ?

## Identité patient (INS / INSi)

- [ ] Intégration homologuée INSi : prestataire, calendrier, environnement de test ?
- [ ] En attendant : affichage « INS non qualifiée » uniquement — validé métier ?
- [ ] Politique de rapprochement doublons (homonymes) acceptée par les cabinets ?

## Signature électronique

- [ ] e-CPS / signature qualifiée requise pour quels actes (CR, ordonnance) ?
- [ ] Tant que `SignatureProvider = NotAvailable`, le statut plafond est-il `valide` (sans `signe`) — accepté contractuellement ?

## Interopérabilité & facturation

- [x] SESAM-Vitale : module cadre `SesamVitaleAdapter` = NotAvailable (ADR-038, T-18) — **pas** d’intégration opérationnelle.
- [ ] SESAM-Vitale : partenaire / industriel habilité GIE, lecteurs, calendrier d’agrément ou d’homologation ?
- [ ] MSSanté, Pro Santé Connect : priorisation et homologations ?
- [ ] Base médicamenteuse certifiée pour interactions : choix et licence ?

## Prescription d’examens complémentaires (V15)

- [ ] Revue médicale documentée des 24 protocoles (sources ESC / Endocrine Society = aides au cadrage uniquement) avant activation prod ?
- [ ] Circuit brouillon → validation → signature → émission labo : formats (LOINC / CR-BIO) et contrats laboratoires ?
- [ ] Le catalogue versionné + suggestions de bilans qualifie-t-il un logiciel DM (règle 11) — même avec flag `clinical.examOrders` off par défaut ?
- [x] ADR-057 : incrément actuel = brouillon documentaire dans le draft consultation, **sans** envoi labo ni ordonnance exécutoire.

## Organisation responsable de traitement

- [ ] Pour un usage hospitalier : validation DPO/RSSI/DSI de l’établissement avant tout déploiement ?
- [ ] Clarifier les cas cabinet libéral vs établissement (deux modèles RT).
- [ ] **Module hospitalisation (P15)** : en établissement, le responsable du traitement est l’établissement (pas l’éditeur). L’activation exige la case « contrat établissement signé » côté super admin (action tracée). Modèle contractuel art. 28 / avenant établissement à valider avant prod réelle.

## Transferts et sous-traitance

- [ ] PSP paiement : données strictement hors santé — DPA signé ?
- [ ] E-mail transactionnel : confirmation qu’aucun nom patient / contenu clinique n’est inclus (revue templates P03/P05) ?

## Journal des décisions liées

Voir `DECISIONS.md` (ADR-001 à ADR-009) et portes de sortie P19.
