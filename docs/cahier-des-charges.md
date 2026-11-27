# CARDIOCONSULT HOSPITALISATION — ÉDITION CODEx POUR USAGE CLINIQUE RÉEL

**Version du cahier des charges : 18 novembre 2026**  
**Destinataire : Codex / développeur de logiciel médical**  
**Statut : exigences de développement, PAS un certificat de conformité ni une autorisation de mise en production.**

> **IMPORTANT — Ce document précise et supplante, sur ce point uniquement, les sections de l'ancien cahier des charges qui donnaient la priorité à une « démonstration ». Le produit final visé est une application indépendante et téléchargeable, destinée d'abord à enregistrer et suivre les VRAIS PATIENTS du médecin, puis éventuellement à être distribuée à d'autres professionnels de santé.** Les premiers essais techniques restent réalisés avec des dossiers synthétiques ; l'utilisation de données réelles n'est admise qu'après les contrôles de sécurité, de gouvernance, de validation clinique et de conformité exposés ci-dessous. Ne pas lier le projet à un autre logiciel hospitalier sans nouvelle demande expresse.

## A. Décisions de produit actées

1. **Nom :** Cardio Soin Hospitalisation (famille Cardio Soin V3/V4/V5).
2. **Public initial :** médecin concepteur, pour le suivi de sa propre activité clinique, avec dossiers identifiants et réels.
3. **Public futur :** d'autres médecins / établissements, si le produit satisfait les conditions de mise à disposition.
4. **Distribution :** application installable, indépendante. Cible initiale recommandée : ordinateur Windows/macOS ; adaptations tablette/mobile ultérieures, après sécurisation.
5. **Stockage initial recommandé à instruire :** stockage local chiffré sur un poste professionnel sécurisé, avec sauvegardes protégées, sans synchronisation externe ni collecte de télémétrie patient par défaut. Le choix final dépend du contexte juridique réel (cabinet ou établissement).
6. **Fonctionnalités prioritaires :** portefeuille de patients hospitalisés (vue de service, environ 22 patients dans le scénario d'usage), dossier longitudinal, consultation, ATCD structurés, ECG, ETT, biologie, médicaments, scores, alertes à valider, notes quotidiennes, compte rendu et prescription selon cadre réglementaire.
7. **Non-objectifs initiaux :** aucune connexion imposée à un logiciel tiers, aucun entraînement IA à partir de dossiers réels, aucune fonction de transmission à un serveur externe sans validation distincte.

## B. Gouvernance juridique : NE PAS CONSIDÉRER TOUS LES PATIENTS « PERSONNELS » COMME JURIDIQUEMENT IDENTIQUES

- **Patients du cabinet médical exerçant à titre indépendant :** le professionnel / cabinet est normalement responsable du traitement, sous réserve de l'organisation effective. Il doit documenter le traitement et assurer la conformité RGPD.
- **Patients hospitalisés dans un établissement :** l'établissement est normalement responsable du dossier patient de l'établissement. Le médecin ne peut pas, du seul fait qu'il soigne ces patients, exporter des dossiers nominaux vers une application personnelle indépendante, un ordinateur privé, un compte cloud ou un dépôt Codex. Avant tout usage : faire valider le nouveau traitement, son architecture, les habilitations, le périmètre des données et les modalités de conservation par le responsable compétent, avec DPO/RSSI/DSI selon l'organisation. **La suppression de toute intégration à un logiciel tiers ne supprime pas cette exigence.**
- Pour le suivi médical, le consentement RGPD spécifique du patient n'est généralement pas la base nécessaire ; choisir une base juridique appropriée à l'article 6 RGPD et l'exception applicable de l'article 9(2)(h), assurer l'information des patients et ne pas confondre cela avec le consentement aux actes de soin.
- Le produit doit pouvoir identifier son responsable de traitement, son éventuel sous-traitant, ses finalités, destinataires, durées, localisation du stockage et flux éventuels.

## C. Exigences de sécurité logicielle prioritaires (P0, bloquantes pour les vrais patients)

| ID | Exigence | Critère d'acceptation contrôlable |
|---|---|---|
| SEC-01 | **Supprimer la persistance des dossiers en `localStorage`** actuellement utilisée par la V5 | Aucun nom, diagnostic, compte rendu ou donnée de santé n'est enregistré dans `localStorage`, `sessionStorage` ou une console de débogage. |
| SEC-02 | Base de données locale professionnelle | Base structurée avec dossiers multiples, contraintes d'intégrité, migrations versionnées, transactions atomiques, séparations patients/séjours/visites/notes/ordonnances. |
| SEC-03 | **Chiffrement** au repos et du poste | Base de données et sauvegardes chiffrées avec clés non codées en dur, stockées dans un coffre OS ; recommandation de chiffrement intégral du poste. |
| SEC-04 | Authentification unique par utilisateur | Comptes nominatifs, mot de passe robuste ou système professionnel adapté, MFA si contexte le nécessite, protection contre force brute. Pas de compte partagé. |
| SEC-05 | Autorisations par rôle et contexte | L'accès par défaut est interdit ; les habilitations donnent accès seulement aux dossiers et fonctions nécessaires. Mode multi-utilisateur **désactivé** si non implémenté/testé. |
| SEC-06 | Session | Verrouillage automatique, fermeture sécurisée, revalidation à l'ouverture de dossiers après session expirée, protection des écrans laissés ouverts. |
| SEC-07 | Journal d'audit | Journal horodaté et protégé des connexions, ouvertures de dossiers, créations, modifications, suppressions, exports et impressions, avec acteur et identifiants pertinents. Le contenu sensible n'est pas dupliqué dans les logs. |
| SEC-08 | Historisation médicale | Les observations et comptes rendus validés sont versionnés ; modification avec auteur, date, ancien/nouveau statut ; pas de modification silencieuse d'une note signée. |
| SEC-09 | Sauvegarde et restauration | Sauvegardes chiffrées, protégées contre l'accès non autorisé ; tests de restauration réguliers ; gestion des pertes/corruptions. Vérifier HDS si sauvegarde externalisée. |
| SEC-10 | Confidentialité des exports | Export PDF et impression avec identification patient et auteur ; protection des fichiers temporaires et suppression contrôlée ; pas de partage automatique. |
| SEC-11 | Aucune fuite vers outils de développement | Aucun nom, numéro, date, note ou document réel dans prompts Codex, dépôts publics, tickets, crash reports, télémétrie ou outils tiers non autorisés. |
| SEC-12 | Dépendances & distribution | Verrouillage des versions, tests SAST/DAST appropriés, scan de dépendances, gestion des secrets, signature des binaires/installeurs, mise à jour vérifiée et politique de correctifs. |
| SEC-13 | Résilience | Tests de panne de courant, corruption disque, interruption d'enregistrement, perte/oubli de mot de passe, restauration et migration ; pas de perte silencieuse. |
| SEC-14 | Séparation environnements | Données synthétiques en développement et CI ; données réelles uniquement en environnement autorisé, sans copier la base clinique en support ou chez le développeur. |

**Important :** Une base SQLite, même chiffrée, **ne suffit pas à elle seule** à rendre l'application RGPD conforme. Nécessité de mesures techniques *et* organisationnelles, audit, maintenance, gestion des incidents et documentation.

## D. Dossier patient hospitalisation : périmètre métier

- Liste des patients en cours, tri par chambre/lit, identité, date d'entrée, motif, statut ; possibilité d'afficher une vingtaine de dossiers, cliquer et parcourir sans fuite inter-patient.
- Fiche patient : identités nécessaires, sexe, date de naissance, identifiant interne, médecin référent, allergies, antécédents, traitements, diagnostics, constantes, examens, documents, séjour et sortie.
- Rubrique **antécédents structurés** selon la nomenclature clinique fournie dans le projet, avec colonnes pathologie, statut, date, paramètres pertinents et commentaires ; les éventuels acronymes sont configurables.
- Évolution chronologique : observations horodatées, notes de visite, événements, actes et résultats, surveillance diurèse/poids/TA/FC/SpO₂, synthèse clinique et plan de soins.
- ECG, ETT, biologie : unités explicites, plages de saisie, date de prélèvement/examen, provenance, distinction des valeurs mesurées et inférées.
- Scores et alertes : bibliographie, version de recommandation, formule validée, justification visible, bornes d'utilisation, gestion des données manquantes, revue par cardiologue, bouton de reconnaissance de l'alerte.
- Production de compte rendu et ordonnance : identifiants patient, identité du prescripteur, date, traçabilité, séparation brouillon/signature/validation et exports fiables.
- Pas de suppression définitive directe des dossiers utilisés en soins sans règles de conservation/archivage spécifiques.

## E. Qualification éventuelle comme dispositif médical (distincte du RGPD)

Le simple stockage de dossiers ou leur mise en page n'est pas automatiquement un dispositif médical. En revanche, **les scores interprétés, alertes aortiques, recommandations de traitement ou triage individualisé** peuvent entraîner une qualification comme **logiciel dispositif médical** au sens du règlement (UE) 2017/745, en particulier selon la **règle 11** et la finalité revendiquée.

Avant la mise en service clinique de ces fonctions, réaliser une analyse de qualification/classification documentée avec le référentiel **MDCG 2019-11 rev.1 (juin 2025)**. Si le produit est qualifié de dispositif médical, il faut déterminer les obligations de conformité et de marquage CE pertinentes avant mise en service/mise sur le marché, sauf exception légalement applicable et documentée. **Un bandeau « aide à la décision seulement » n'annule pas la qualification réglementaire.**

Stratégie de développement : isoler les modules à finalité médicale sous feature flags ; ne pas activer des conseils individualisés non qualifiés/validés sur dossiers réels. D'abord dossier médical sûr et documentation, ensuite calculs/alertes sous processus qualité et validation clinique.

## F. RGPD opérationnel pour la première mise en production

1. Documenter le **responsable du traitement**, les personnes habilitées, les bases de licéité et le traitement des données de santé (art. 9).
2. Tenir le **registre des activités de traitement**.
3. Établir et communiquer une **notice d'information** patients (finalités, destinataires, droits, conservation, contact et éventuels transferts).
4. Déterminer une **politique de conservation et d'archivage** adaptée au cabinet ou à l'établissement. Les référentiels diffèrent ; ne pas supprimer automatiquement les dossiers à une date arbitraire.
5. Évaluer la nécessité d'une **AIPD** selon les risques et l'échelle : pas systématique pour tous les exercices individuels ; potentiellement obligatoire pour de larges traitements hospitaliers. Faire l'analyse avec DPO si établissement.
6. Définir la procédure de gestion des droits des personnes et de rectification par addendum avec traçabilité.
7. Formaliser les contrats art. 28 RGPD pour les prestataires qui traitent des données : maintenance, support avec accès, hébergement, sauvegardes, infrastructure.
8. Si un prestataire externe héberge les données de santé, vérifier une prestation **certifiée HDS** dans le périmètre correspondant. Le professionnel ou établissement hébergeant ses propres données n'est pas automatiquement tenu d'être certifié HDS ; cela ne supprime pas les obligations RGPD.
9. Mettre en place gestion de violation de données : qualification, registre, mesures correctives et notification CNIL en principe dans les 72h lorsqu'un risque pour les droits/libertés justifie la notification, et information des personnes si risque élevé.
10. Réaliser recette métier et audit de sécurité **avant premier dossier réel** ; désigner un responsable maintenance/patchs et un protocole de continuité d'activité.

## G. Feuille de route avec portes de sortie explicites

### G0 — Reprise du prototype
- Auditer V5, inventorier tous les champs et règles ; supprimer `localStorage` comme mécanisme de dossiers ; conserver V3/V4/V5 en références uniquement.

### G1 — Application fonctionnelle installable, testée en données synthétiques
- Multi-patient, séjour, timeline, documents, prescriptions et comptes rendus ; sécurité P0 ; tests automatisés, installation/désinstallation, récupération et migration.

### G2 — Prêt pour évaluation d'usage clinique (pas encore autorisé aux vrais patients)
- Évaluation cyber et privacy, contrôles d'accès, procédures de sauvegarde, tests de restauration, validation des modules médicaux, qualification MDR, documentation RGPD, accord du responsable de traitement.

### G3 — Usage réel de Cardio Soin par son concepteur
- **Autoriser les données réelles uniquement si tous les critères G2 sont satisfaits et que le contexte d'exercice (cabinet/hôpital) le permet.** Déployer avec suivi d'incidents, maintenance, contrôle des journaux, sauvegardes et audits périodiques.

### G4 — Distribution à d'autres médecins (phase ultérieure)
- Installer proprement chez chaque utilisateur, versionner/mettre à jour, assistance sécurisée, conditions d'utilisation et politique de confidentialité, responsabilités contractuelles, isolation forte entre utilisateurs/structures, HDS si hébergement confié à un tiers, analyse CE si logiciel DM, gestion de signalements et maintenance/surveillance appropriées.

## H. Instruction prioritaire à fournir à Codex

> **Je veux utiliser Cardio Soin Hospitalisation avec de vrais patients, après mise en conformité, puis éventuellement le diffuser à d'autres médecins.** Reprends le prototype V5 et l'historique V3/V4. Ne construis pas une simple démo navigateur : réalise une application installable, hors ligne par défaut, multi-patient, avec base locale chiffrée, comptes personnels, permissions minimales, journal d'audit, versionnage des notes, sauvegardes/restauration et tests automatisés. La V5 utilise `localStorage` et ne doit jamais stocker des patients réels en l'état. Aucun dossier réel ne doit être exposé à Codex ni à un service de développement. Produis d'abord un audit du prototype et un plan d'architecture, puis un MVP exécuté et testé. Prévois un dossier de conformité RGPD, une analyse de qualification MDR pour les scores/alertes, une procédure de validation métier et les critères bloquants de mise en production. Ne prétends pas que le logiciel est conforme ou certifié sans audit/preuves. Le logiciel reste indépendant et ne nécessite aucune connexion à un outil tiers.

## I. Références normatives officielles (pour vérification régulièrement actualisée)

- CNIL, RGPD et professionnels de santé libéraux : https://www.cnil.fr/fr/rgpd-et-professionnels-de-sante-liberaux-ce-que-vous-devez-savoir
- CNIL, applications mobiles en santé : https://www.cnil.fr/fr/applications-mobiles-en-sante-et-protection-des-donnees-personnelles-les-questions-se-poser
- CNIL, développer en conformité RGPD : https://www.cnil.fr/fr/developper-en-conformite-avec-le-rgpd
- CNIL, guide RGPD du développeur : https://www.cnil.fr/fr/technologies/guide-rgpd-du-developpeur
- CNIL, AIPD : https://www.cnil.fr/fr/RGPD-analyse-impact-protection-des-donnees-aipd
- CNIL, informer les personnes concernées : https://www.cnil.fr/fr/traitement-de-donnees-de-sante-comment-informer-les-personnes-concernees
- ANS, champ HDS : https://esante.gouv.fr/faq/quel-est-le-champ-dapplication-de-la-legislation-relative-lhebergement-de-donnees-de-sante-caractere-personnel
- ANS, HDS : https://esante.gouv.fr/labels-certifications/hebergement-des-donnees-de-sante
- Commission européenne, MDCG 2019-11 rev.1 : https://health.ec.europa.eu/latest-updates/update-mdcg-2019-11-rev1-qualification-and-classification-software-regulation-eu-2017745-and-2025-06-17_en

---

# DOCUMENT HISTORIQUE COMPLÉMENTAIRE — ÉDITION ORIGINALE

**Attention :** Dans le texte historique qui suit, les références à une *première livraison uniquement de démonstration* sont supplantées par les objectifs et portes de validation clinique ci-dessus. Les modules de démonstration demeurent des étapes intermédiaires de développement, pas la finalité produit.

# Cardio Soin — cahier des charges de reprise et d'amélioration pour Codex

> **Document de transmission au développeur / à Codex**  
> Version du cahier des charges : **1.0 — 16 novembre 2026**  
> Langue de l'interface : **français** · Contexte : **consultation de cardiologie en France**  
> Référence technique à reprendre : **`Cardio Soin_V5_Aorte_RedFlag.html`**  
> Anciennes versions disponibles pour comparaison : `Cardio Soin_V4_Consultation_Complete.html`, `Cardio Soin_V3_Scores_Risque.html`.

## 0. Mission à exécuter par Codex — À LIRE EN PREMIER

**Tu es Codex, chargé de faire évoluer un prototype existant, pas de créer un produit différent.**

1. **Inspecte et exécute** les trois prototypes HTML fournis. Prends **V5 comme base fonctionnelle principale** et V3/V4 comme historique des fonctionnalités. Conserve les données, les parcours et les comportements utiles.
2. Effectue un **audit du code, des calculs, des alertes médicales, de la persistance, de la confidentialité et de l'ergonomie**. Répertorie les anomalies trouvées et corrige-les.
3. Livre un **logiciel utilisable en démonstration avec des données fictives**, simple à ouvrir sur ordinateur, compatible Chrome/Safari, prioritairement en français et capable de fonctionner **hors connexion** pour les fonctionnalités locales.
4. **Ne prétends jamais que le prototype est prêt pour de vraies données de santé.** Un mode « démonstration » doit rester distinct d'une éventuelle version de production répondant aux exigences techniques, juridiques, sécuritaires et de validation clinique.
5. Intègre progressivement les fonctions déjà demandées : **consultation → ECG/ETT/biologie → scores → compte rendu → ordonnance**. Prépare l'architecture des futures intégrations **Carte Vitale / SESAM-Vitale**, sans simuler une télétransmission réelle.
6. Documente chaque fonction, crée des tests automatiques et fournis une procédure simple pour lancer, utiliser et construire l'application.
7. **Fais des choix techniques raisonnables et avance sans attendre de nouvelles précisions** : si une dépendance médicale, réglementaire ou d'intégration n'est pas validée, conserve un champ manuel ou un indicateur « à valider » au lieu de fabriquer un résultat.
8. Ne modifie pas les trois fichiers sources originaux : dépose les changements dans le nouveau projet et conserve un dossier `legacy/`.

**Livrables attendus de Codex :** code source fonctionnel, interface améliorée, jeu de données fictives, tests, `README.md` d'installation, journal des modifications, matrice des fonctionnalités et risques résiduels. Ne pas s'arrêter à une maquette visuelle.

---

## 1. Vision et historique du projet

### 1.1 Objectif métier

**Cardio Soin** est un logiciel destiné à accompagner le déroulement **d'une consultation cardiologique complète** : recueillir les données du patient, renseigner l'examen clinique et les examens, calculer ou saisir les scores adaptés au contexte, produire un **compte rendu structuré et modifiable**, préparer une ordonnance et faciliter le suivi longitudinal.

Le médecin doit pouvoir enchaîner les écrans sans ressaisir les mêmes informations. Le logiciel est un **outil d'aide au travail et au raisonnement**, sous responsabilité du clinicien : il ne pose pas automatiquement de diagnostic et ne remplace ni les recommandations professionnelles ni le jugement médical.

### 1.2 Ce qui a effectivement été discuté / construit

| Étape | Demande / réalisation connue | Statut de référence |
|---|---|---|
| Juin 2026, V1 | Prototype de **consultation cardiologique en un seul fichier HTML**, fonctionnement local/hors ligne dans Safari/Chrome ; données patient, FDRCV, ECG/ETT, calcul de l'âge/IMC, scores CHA₂DS₂-VASc et HAS-BLED, compte rendu, copie/impression/PDF/export texte. | Historique discuté ; fichier V1 non joint ici. |
| Juin 2026, V2 | **Module ordonnance** : allergies, DFG, modèles de prescriptions cardiologiques, document texte ; préparation de l'idée **Carte Vitale et télétransmission**. | Historique discuté ; vérifier la récupération du code V2 si disponible ; ne pas prétendre que V5 le contient. |
| Septembre 2026, V3 | Écran de **scores de risque cardiologiques** : prévention, coronarien/SCA, rythmologie/anticoagulation, valvulopathies/chirurgie, IC/HTP/CMH/préopératoire et compte rendu. | Source HTML fournie. |
| Septembre 2026, V4 | **Consultation complète** avec clinique, biologie, ECG, ETT, scores et compte rendu. | Source HTML fournie. |
| Septembre 2026, V5 | Ajout du **module Aorte** : mesures segmentaires, indexation, vitesse de croissance, facteurs de risque et **RED FLAG**, notamment pour un diamètre d'aorte ascendante à 60 mm. | **Base source fournie**, règles médicales à auditer. |
| Novembre 2026 | Reprise du développement par **Codex**, amélioration du prototype, souhait de conserver l'identité **Cardio Soin**. | Objet du présent document. |

**Attention :** un projet distinct, « Score Coronaire Pro », a aussi été évoqué dans nos échanges. **Ne pas fusionner automatiquement ses éléments visuels ou son nom avec Cardio Soin**. Des thèmes communs peuvent être intégrés dans les modules médicaux lorsque leur périmètre est clairement identifié.

### 1.3 Ce qui n'est PAS établi

- Aucune identité graphique définitive ou fichier de **logo Cardio Soin** validé n'a été retrouvé dans les sources HTML. Prévoir un logo SVG provisoire réversible, par exemple typographie « Cardio Soin » et motif ECG discret ; **ne pas présenter cette création comme le logo historique**.
- Il n'existe aucune preuve de raccordement opérationnel au lecteur Carte Vitale, à la CPS/e-CPS, à la facturation ou à un service cloud de patients.
- Les formules et seuils du prototype **n'ont pas été cliniquement validés**. Les conserver comme point de départ d'audit, pas comme règles médicales officiellement approuvées.

---

## 2. Périmètre et priorités

**P0 — indispensable avant d'utiliser la nouvelle démonstration :**

- Reprise du périmètre V5 ; saisie clinique, biologie, ECG, ETT, aorte et scores.
- UI moderne, lisible, responsive (ordinateur prioritaire ; tablette et téléphone utiles), parcours fluide.
- Génération et édition du compte rendu, impression et export PDF/texte.
- Vérification et correction des calculs, valeurs manquantes, règles de cohérence et RED FLAG aortiques.
- Mode démo sécurisé **sans données de vrais patients** ; données synthétiques uniquement ; tests.

**P1 — évolution directement issue des discussions :**

- **Ordonnance cardiologique** avec médicaments, posologies, allergies, DFG, avertissements et modèles paramétrables. La validation et la signature restent du ressort du médecin.
- Dossiers patients et **historique des consultations** en environnement adapté à la protection des données, avec recherche, duplication contrôlée et comparaisons chronologiques.
- Personnalisation en-tête/signature, modèles de courriers, export structuré, graphiques de suivi et ergonomie accélérée.

**P2 — intégrations ou approfondissements, à ne pas présenter comme déjà livrés :**

- Interfaces Carte Vitale / CPS ou e-CPS / **SESAM-Vitale, facturation et télétransmission**, via parcours agréé/homologué ou partenaire conforme.
- Imports ECG, comptes rendus d'ETT, Holter, épreuve d'effort, documents d'imagerie, PDF ; interfaces médicales selon standards pertinents lorsque disponibles.
- Moteurs de scores supplémentaires et aides spécialisées, après validation des références et des jeux de tests.
- Export vers systèmes externes, interopérabilité et hébergement conforme si passage en production.

L'objectif immédiat est un **socle fiable**. Ne pas tenter de développer de manière fictive toutes les intégrations P2 dans la première livraison.

---

## 3. Parcours utilisateur cible

1. Ouvrir Cardio Soin ; voir un accueil clair avec **« Nouvelle consultation »**, **« Ouvrir un dossier »** (mode sécurisé futur), **« Démonstration »**, **« Paramètres »**.
2. Créer/sélectionner le patient puis saisir le **motif de consultation**, les ATCD, FDRCV, traitement actuel, allergies.
3. Renseigner l'**examen clinique** et les symptômes ; visualiser une synthèse immédiate.
4. Compléter la **biologie**, l'**ECG**, l'**ETT** et, si pertinent, l'**aorte thoracique**.
5. Faire apparaître uniquement les **scores et alertes pertinents pour le contexte**, les données manquantes et les sources de calcul. Les scores non applicables doivent être masqués ou explicitement indiqués comme « non applicable ».
6. Vérifier puis **rédiger/modifier la conclusion et la conduite à tenir**. Les propositions automatiques ne doivent pas être signées sans validation.
7. Générer le compte rendu ; corriger son texte ; enregistrer un brouillon, prévisualiser, **imprimer / exporter en PDF**, copier/exporter en texte ; créer une ordonnance séparée.
8. En mode autorisé de production seulement : conserver le dossier, retrouver une consultation, comparer les paramètres dans le temps, tracer auteur/date/édition et état de validation.

**Principes UX :** navigation gauche par étapes, indicateur de complétude, recherche rapide, « retour à la synthèse », sauvegarde de brouillon seulement dans un stockage adéquat, possibilité de réutiliser des modèles sans inventer des signes cliniques normaux. La conclusion médicale doit rester facilement éditable.

---

## 4. Modules fonctionnels détaillés

### 4.1 Identité du patient et contexte

**Déjà dans V5 :** nom, prénom, date de naissance, âge dérivé, sexe tel qu'utilisé dans le formulaire historique, poids, taille, surface corporelle, date de consultation, médecin traitant, motif et histoire clinique.

**Améliorations :**

- Identifiant de dossier interne, protection contre la confusion entre patients, vérification des doublons lors d'une future base sécurisée.
- Ne pas mélanger **date de naissance**, **âge actuel** et **âge à la date de la consultation** ; calculer ce dernier à la date de l'acte, y compris pour les consultations historiques.
- Dates locales françaises stables (ne pas utiliser naïvement `toISOString().split('T')[0]`).
- Calcul **IMC** et **surface corporelle** affichant formule, unités, valeurs sources et limites : BSA Mosteller, `sqrt(poids_kg × taille_cm / 3600)` ; ne pas calculer sur valeurs absentes ou impossibles.
- Champs contextuels facultatifs (contact, correspondant, antécédents familiaux, allergies, implantation d'appareillage), sans bloquer la démo si inutiles.

### 4.2 Interrogatoire, antécédents et traitements

Reprendre les cases **HTA, diabète, dyslipidémie, tabagisme, coronaropathie, AVC/AIT, AOMI, insuffisance cardiaque, FA/flutter, insuffisance rénale**, autres ATCD et traitements.

Ajouter champs structurés utiles au cabinet : symptômes (douleur thoracique, dyspnée, palpitations, syncope, œdèmes), chronologie, facteurs de risque familiaux, interventions (stent, chirurgie valvulaire, PM/DAI), traitements en cours (nom, dose, fréquence), allergies et effets indésirables, contre-indications. Ne pas remplir automatiquement les champs vides par des réponses rassurantes.

### 4.3 Examen clinique

**V5 :** TAS/TAD, fréquence cardiaque, SpO₂, température, NYHA ; œdèmes MI, crépitants, turgescence jugulaire, reflux hépato-jugulaire, souffle, cyanose ; auscultation cardiaque, pulmonaire, conclusion.

**À améliorer :** constantes avec unités et dates ; statut `non renseigné` distinct de `normal` ; champs jugulaires, poids sec, signes d'hypoperfusion selon contexte ; texte libre et dictée externe éventuelle non prioritaire. Le prototype préremplit trois textes « normaux » : **supprimer cette pratique**, car une auscultation non effectuée ne doit jamais apparaître comme normale.

### 4.4 Biologie

**V5 :** Hb, plaquettes, créatinine, DFG, K+, Na+, NT-proBNP, troponine, CRP, TSH, LDL-c, HbA1c, commentaire.

**À améliorer :** date/prélèvement, unités normalisées, évolution temporelle, import manuel, contrôles de plages et de cohérence, distinction résultat mesuré vs commentaire interprétatif ; calculs liés au rein seulement si équations et variables validées. Toute prescription nécessitant l'examen de la fonction rénale, de la kaliémie ou d'allergies doit afficher un rappel, sans décider seule.

### 4.5 ECG

**V5 :** rythme sinusal/FA/flutter/tachycardie atriale/stimulation, FC, PR, QRS, QTc, axe, HVG, conduction (BAV, BBD, BBG, hémiblocs), ST+/ST−, T négatives, ESV/ESSV, onde Q, interprétation libre.

**À améliorer :** plusieurs troubles conductifs possibles simultanément, nature du rythme, fréquence, durée et dérivations concernées ; QT/QTc avec méthode explicite si calcul futur (Fridericia/Bazett selon contexte) et source de mesure ; possibilité d'indiquer **stimulation ventriculaire**, dispositif PM/CRT et traceur. L'analyse d'ECG à partir d'une image n'est pas requise en P0. Ne jamais transformer automatiquement une case cochée en diagnostic confirmé.

### 4.6 Échocardiographie transthoracique (ETT)

**V5 :** FEVG, DTDVG, septum, paroi postérieure, OG qualitative, E/e′, TAPSE, S′ VD, PAPS, Vmax IT, VCI, péricarde, IM/IA/RAo/IT qualitatives, mécanismes valvulaires, conclusion libre.

**Améliorations demandées et cohérentes avec l'activité clinique :**

- VG : volumes et diamètres, FEVG (méthode), HVG, cinétique, diastole ; OG : volume indexé ; VD : taille, TAPSE, S′, FAC si renseignée ; VCI et pression atriale droite estimée.
- HTP/cœur droit : **probabilité échographique d'HTP** basée sur des critères validés, pas sur la PAPS isolée ; Vmax IT, signes VD/OD, VCI ; distinguer probabilité HTP et diagnostic d'HTAP ; TAPSE/PAPS comme indicateur complémentaire si validé.
- Valves : modules quantitatifs optionnels **IM (EROA/SOR, volume régurgitant, vena contracta, PISA), RAo (Vmax, gradient moyen, SVA, indexation, débit), IA, IT**, avec affichage des **discordances** plutôt qu'un grade auto fondé sur un seul paramètre.
- HFpEF : E/e′, VRT, VOG indexé, autres variables ; rendre les critères explicites et conditionnels.
- Préparer modèles ETT / ETO sans imposer un générateur d'images ni un diagnostic automatique.
- Pouvoir saisir un **compte rendu échographique normal** uniquement si l'utilisateur a effectivement choisi/validé ce modèle.

**Note de périmètre :** la quantification avancée et l'ETO font partie de l'extension P2 ; les champs et la structure peuvent être anticipés dès P1.

### 4.7 Module Aorte thoracique — priorité particulière

La V5 comporte les champs : **anneau**, **sinus de Valsalva**, **jonction sino-tubulaire**, **aorte ascendante tubulaire**, **crosse**, **aorte descendante**, croissance en mm/an, **surface aortique/hauteur** en cm²/m, bicuspidie, syndrome génétique aortique, histoire familiale, coarctation, symptômes, chirurgie valvulaire concomitante, HTA mal contrôlée, examen TDM/IRM réalisé, conclusion.

**Exigences :**

1. Conserver l'affichage par **segment anatomique**, chaque mesure en mm, la méthode et la date ; indiquer lorsque l'ETT ne visualise pas correctement un segment.
2. Afficher le **diamètre maximal mesuré et sa localisation**, mais ne jamais appliquer indistinctement les mêmes seuils opératoires à l'anneau, à la racine/ascendante, à la crosse et à la descendante.
3. Calculer/indexer avec unités contrôlées. Pour le rapport surface/hauteur : préciser **quel segment est utilisé**, la formule, les données d'entrée et les conditions d'applicabilité.
4. Comparer avec une mesure **antérieure datée** avant de calculer la vitesse de croissance. Ne pas confondre mesure saisie et calcul réellement vérifié.
5. Maintenir un **RED FLAG visuel** pour une aorte ascendante de **60 mm** (cas déclencheur de l'ancienne demande), tout en revalidant **tous les seuils selon segment, étiologie, BAV, syndrome génétique, symptômes, taille corporelle, croissance, projet de chirurgie concomitante et référentiel applicable**.
6. Distinguer clairement **« alerte de mesure »**, **« discussion spécialisée »**, **« situation potentiellement urgente »** et **« indication chirurgicale confirmée par spécialiste »**. Le logiciel ne doit pas annoncer de décision opératoire automatique.
7. Intégrer un texte type : « Dilatation aortique significative : confirmer par imagerie de référence et discuter avec une équipe spécialisée selon le contexte » lorsque pertinent, mais sans transformer un critère isolé en ordre opératoire.
8. Toutes les règles doivent avoir un **identifiant, une source/version, les entrées requises, des tests unitaires, un comportement si données insuffisantes et un libellé prudent**.

### 4.8 Scores cardiologiques — moteur contextuel

Retenir les groupes de la V3, intégrés à V4/V5 :

| Famille | Scores / données évoqués dans le projet | Reprise attendue |
|---|---|---|
| Prévention | SCORE2, SCORE2-OP, risque CV, objectifs LDL, facteurs de risque | Saisie manuelle des scores officiels au départ ; calcul intégré seulement après validation des tables et populations d'application. |
| Coronarien / SCA | TIMI NSTEMI, GRACE, Killip, CAD-RADS, plaque burden P1–P4, Agatston, SYNTAX I, stratégie invasive | Mise en relation **avec le bon contexte clinique** ; les champs composites et risques ont besoin de sources et d'indications. |
| Rythmologie | CHA₂DS₂-VASc, CHA₂DS₂-VA, HAS-BLED | Calcul transparent à partir des critères ; éviter double comptage âge/sexes et ne pas transformer un score hémorragique élevé en interdiction d'anticoaguler. |
| Valvulopathies / chirurgie | TRI-SCORE, EuroSCORE II, STS-PROM, score de Wilkins, calcium valvulaire aortique | EuroSCORE/STS et autres outils officiels peuvent rester **saisie externe manuelle**, avec référence au calculateur pertinent. |
| IC / HTP / EP | HFA-PEFF, H₂FPEF, sPESI, Bova ; FEVG, E/e′, TAPSE/PAPS | Ne montrer que selon indication. Probabilité HTP échographique ≠ diagnostic d'HTAP. |
| CMH / préopératoire | HCM Risk-SCD, marqueurs de risque, RCRI/Lee | Marqueurs CMH et variables ; calcul officiel / modèle externe si non validé. |

**Règles moteur essentielles :**

- Chaque score possède : nom, version, référentiel, population d'application, entrées/ unités, formule ou mode « saisie officielle externe », résultat, plage, interprétation, avertissements et tests.
- **Ne pas remplir les points de critères absents en considérant implicitement qu'ils sont négatifs** ; différencier « non », « oui » et « inconnu ».
- Pas de résultat « 0 » lorsqu'aucune donnée requise n'a été documentée. Indiquer « calcul impossible — données manquantes ».
- Si critères incompatibles, signaler l'anomalie (ex. deux classes d'âge cochées, FA et rythme sinusal non expliqués), et ne pas poursuivre un calcul trompeur.
- Une alerte et un score doivent fournir **« pourquoi ce résultat ? »** et **« quelles données manquent ? »**.
- La **classification du risque** varie selon l'âge, la population et les recommandations : proscrire les bandes codées en dur génériques lorsqu'elles ne sont pas applicables.
- Journaliser les versions de règles dans les comptes rendus signés ; permettre un mode manuel si le référentiel change.
- Valeurs extrêmes, formules invalides ou critères inconnus ⇒ **aucune interprétation péremptoire**.

### 4.9 Compte rendu de consultation

**Existant V5 :** génération d'un texte synthétique regroupant identité, histoire, FDRCV/ATCD, examen, biologie, ECG, ETT, aorte, scores, conclusion et en-tête de service ; boutons **Actualiser, Copier, Exporter TXT, Imprimer/PDF**.

**Cible améliorée :**

- En-tête paramétrable, selon le libellé institutionnel déjà souhaité **« Cardiologie Groupe Hospitalier Sud Île-de-France »** (sans ajout automatique du mot « Cardiologue ») ; identité, titre et coordonnées du médecin personnalisables. Prévoir une rubrique optionnelle de diplômes déjà évoqués : **Diplôme de pathologie cardiovasculaire ; Diplôme HTA et complications rénales et métaboliques ; Diplôme francophone de prévention et réadaptation cardiovasculaire ; Diplôme d’échocardiographie ; Capacité de médecine d’urgence**. L’utilisateur choisit lesquels afficher, et le logiciel ne présente aucun diplôme comme vérifié sans validation.
- Document **daté, auteur identifié, type de document, version et état** (`brouillon`, `validé`, `signé` si une signature réelle existe).
- Sections configurables : motif, ATCD, traitement, examen, ECG, ETT, biologie, scores pertinents, **synthèse diagnostique**, **conduite à tenir**, traitements proposés, examens complémentaires, surveillance et correspondants.
- Un champ vide est omis ou marqué « non renseigné » ; **aucune négation clinique automatique**.
- Permettre de **corriger le texte** sans qu'une nouvelle génération efface silencieusement les modifications : différencier les données sources, le brouillon régénéré et l'édition finale ; avertir en cas de remplacement.
- Prévisualisation propre **A4 imprimable**, marges, pagination, place pour signature, export **PDF**, copie, texte ; export structuré ultérieur.
- Ajouter des modèles personnalisables de consultation de prévention, SCA/post-SCA, FA, IC, valvulopathie, CMH, HTP, contrôle PM, bilan préopératoire, avec champs optionnels.
- **Conclusions rédigées et validées par le médecin**, pas de traitement prescrit automatiquement.

### 4.10 Ordonnances (déjà demandées à l'époque de V2)

- Créer une **ordonnance séparée du compte rendu** : identité patient, date, prescripteur paramétrable, médicaments avec DCI/nom, dosage, voie, fréquence, durée, quantité/renouvellement et remarques.
- Vérifier **allergies**, fonction rénale, grossesse et interactions **seulement si les informations fiables et une source médicamenteuse validée sont disponibles** ; sinon montrer « vérification clinique nécessaire ».
- Modèles de prescriptions cardiologiques **modifiables et vides par défaut pour la délivrance** : ne pas préremplir automatiquement d'antiarythmique, d'anticoagulant ni de dose.
- Export PDF/print, distinction brouillon et ordonnance validée ; historiser les modifications en mode sécurisé.
- Une future e-prescription et une base médicamenteuse sont des **intégrations spécifiques**, pas un simple formulaire de texte.

### 4.11 Dossier longitudinal et activité du cabinet

P1 après sécurisation : plusieurs consultations du même patient, liste chronologique, évolution TA/FC/poids/FEVG/DFG/NT-proBNP/QTc/aorte et scores, consultations récentes, filtre par pathologie, édition de courrier au correspondant, duplications de documents contrôlées, recherche patient et export médical.

**Pour la première démonstration :** utiliser uniquement des **patients fictifs** générés et ne jamais proposer de « sauvegarde patient sécurisée » tant qu'elle n'existe pas effectivement.

### 4.12 Carte Vitale, CPS, facturation et télétransmission — futur encadré

Ces fonctions ont été envisagées dès les discussions de V2, **mais ne sont pas implémentées dans V5** :

- Réserver des interfaces techniques séparées (`identityAdapter`, `billingAdapter`, `sesamVitaleAdapter`) ; afficher **« intégration non disponible »** tant que la solution n'est pas branchée.
- Ne pas « émuler » une Carte Vitale réelle, ne pas produire de fausses FSE transmises, ne pas inventer un système d'agrément.
- Définir avec un industriel/partenaire habilité le périmètre, les composants GIE SESAM-Vitale, les lecteurs et flux carte/appli Vitale, CPS/e-CPS et les tests d'agrément ou d'homologation nécessaires.
- Une simple application HTML de démonstration ne remplace **pas** un logiciel de facturation homologué.

---

## 5. Interface, identité graphique et impression

- Nom du produit à conserver : **Cardio Soin** ; sous-titre « Consultation cardiologique ».
- Style de la V4/V5 : **bleu médical** / bleu foncé et blanc, interfaces claires, cartes sobres, badges limités aux alertes pertinentes. Améliorer sans rompre la reconnaissance visuelle.
- **Logo :** aucun fichier officiel retrouvé. Créer un composant logo provisoire **SVG éditable** (cœur stylisé et/ou onde ECG, sobre, lisible de 24 à 256 px) et permettre son remplacement par le vrai logo ultérieurement. Ne pas affirmer avoir retrouvé le logo historique.
- Navigation clavier, libellés associés aux champs, contrastes suffisants, unités toujours visibles, tailles adaptées aux consultations prolongées et écran 13–27 pouces.
- Alertes rouge/orange en priorité selon gravité : **texte explicatif obligatoire**, pas seulement couleur ; ne pas empiler des dizaines de faux indicateurs.
- PDF/print A4 : aperçu identique au document exporté, bonnes coupures de page, signature et identité du médecin.
- Éviter les animations inutiles et garantir une utilisation fluide sans connexion.

---

## 6. Architecture technique recommandée (adaptable après audit)

**Priorité : améliorer l'existant**, pas réécrire aveuglément.

### 6.1 Première livraison, hors ligne et démonstration

- Option A : nettoyer et modulariser le **HTML/CSS/JavaScript** existant, si cela permet une livraison rapide fiable.
- Option B : migrer vers **TypeScript + React/Vite** (ou autre stack maintenable argumentée) avec architecture en modules (`patients`, `consultations`, `examens`, `scores`, `aorte`, `documents`, `prescriptions`, `settings`, `security`).
- Dans tous les cas : livrer un **mode de lancement local explicite** ; rappeler qu'un PWA nécessite un contexte de navigation adapté et n'est pas équivalent à ouvrir arbitrairement un fichier `file://`.
- Séparer **formulaires / état**, **règles de calcul**, **interprétation**, **génération documentaire** et **stockage**. Aucun calcul médical important directement dans un composant visuel.
- Paramètres : langue FR, en-tête institutionnel configurable, unités, modèles et options de présentation.

### 6.2 Modèle de données logique

Concevoir des types ou schémas pour :

```text
Patient { id, identité, dateNaissance, ... }
Encounter { id, patientId, dateActe, motif, symptomes, antecedents, traitements, auteurId, statut }
Vitals { encounterId, taS, taD, fc, spo2, poids, taille, nyha, ... }
LabResult { encounterId, code, valeur, unite, datePrelevement, source, ... }
ECGStudy { encounterId, rythme, prMs, qrsMs, qtcMs, interpretation, ... }
EchoStudy { encounterId, fevgPct, vOGi, tAPSE, vit, valves, ... }
AorticMeasurement { echoId, segment, diametreMm, methode, date, qualite }
ClinicalScore { encounterId, code, version, inputs, result, statutCalcul, reference }
ClinicalAlert { code, niveau, message, provenance, conditions, reconnuPar }
Document { id, patientId, encounterId, type, version, contenu, auteurId, statut }
Prescription { id, encounterId, lignes, allergiesVerifiees, dfgVerifie, statut }
AuditEvent { date, utilisateurId, action, entite, resultat }
```

Les données cliniques absentes doivent être représentées par `null` / `unknown`, **jamais par une valeur normale implicite**. Un résultat calculé doit stocker ses **entrées**, unités, formule/version, date et auteur de validation.

### 6.3 Qualité technique

- TypeScript strict si utilisé, validation côté logique (ex. Zod ou schéma équivalent), tests unitaires et d'intégration, lint/format, documentation des commandes.
- Tests de copie, impression, export texte/PDF, enregistrement/réouverture fictifs, compatibilité Chrome/Safari et affichage mobile.
- Gestion explicite des erreurs : pas de bouton inerte ; pas d'échec silencieux du presse-papiers ou du PDF.
- Versionnement et **migrations de données** si un stockage réel est ajouté ; sauvegardes et restauration testées en environnement autorisé.
- Utiliser des **données fictives** dans les exemples et le dépôt ; aucune information personnelle provenant de consultations antérieures.

---

## 7. Sécurité, confidentialité, réglementaire — NON NÉGOCIABLE

**Le prototype V5 stocke actuellement les champs, dont l'identité et la clinique, dans `localStorage` sous `Cardio SoinV5` : ce n'est pas un coffre-fort médical.** La V3/V4 ont une logique analogue. On ne doit pas réutiliser cette persistance telle quelle pour de vrais patients.

### 7.1 Deux modes distincts

| Mode | Autorisé | Interdit |
|---|---|---|
| **Démonstration** (P0) | Dossiers **100 % fictifs**, données volatiles ou stockage clairement identifié comme non adapté aux données sensibles ; calculs, documents fictifs. | Présenter le mode comme « RGPD/HDS conforme », stocker des patients réels en `localStorage`, envoyer des données à un service externe. |
| **Production** (projet ultérieur) | Données réelles **uniquement après** analyse de conformité, architecture et sécurité adéquates, contrôles d'accès, contrats nécessaires, vérifications et recette clinique. | Activer par simple bouton ou simple changement de libellé sans contrôles réels. |

### 7.2 Critères préparatoires à la production

- Respect du **RGPD**, de la confidentialité et du secret médical ; minimisation, registre des traitements, information patients, politiques de conservation, droits et gestion des incidents.
- Authentification forte selon le contexte, autorisations par rôle, confidentialité par défaut et **journal d'audit** des accès et modifications sans divulguer de données sensibles dans les logs.
- Chiffrement des données au repos/en transit si applicable, gestion des clés, sauvegarde sécurisée, restauration, mises à jour, gestion de vulnérabilités et revue de sécurité.
- Étude **HDS** en cas d'hébergement de données de santé pour le compte d'autrui ; choisir un prestataire certifié pour le périmètre pertinent si nécessaire. Ne pas prétendre qu'un logiciel local doit « devenir HDS » par lui-même ; déterminer le rôle de chaque acteur et la situation réelle.
- Vérifier les obligations d'**interopérabilité / identité patient**, de facturation et l'éventuel statut de dispositif médical logiciel selon la finalité réelle (support de documentation vs aide à décision / calculs) avec les spécialistes compétents.
- Aucune saisie réelle, synchronisation cloud ou appel à un modèle externe à partir de données identifiantes sans bases légales, contrat, sécurité et accord adéquats.

### 7.3 Références officielles utiles au développement

- CNIL, référentiel cabinets médicaux : https://www.cnil.fr/sites/default/files/atoms/files/referentiel_-_cabinet.pdf
- CNIL, guide CNOM / protection des données : https://www.cnil.fr/sites/cnil/files/atoms/files/guide-cnom-cnil.pdf
- ANS, hébergement HDS : https://esante.gouv.fr/produits-services/hds/procedure-de-certification-hebergeur-de-donnees-de-sante
- GIE SESAM-Vitale, lecture Vitale/CPS et parcours de développement : https://sesam-vitale.fr/web/sesam-vitale/lire-la-carte-vitale-et-cps

**Les sources juridiques et les versions de référentiels doivent être revérifiées avant tout déploiement réel.**

---

## 8. Audit obligatoire du prototype V5 : défauts et précautions déjà repérés

Ces points proviennent de la lecture du fichier V5 ; ce sont **des points à vérifier/corriger**, pas une certification exhaustive du code.

| ID | Risque observé | Correction attendue |
|---|---|---|
| AUD-01 | Données de consultation stockées en clair dans **`localStorage`** (`Cardio SoinV5`). | Mode fictif en P0 ; aucune prétention à stocker des données de santé réelles ; architecture sécurisée séparée en P1/production. |
| AUD-02 | Textes d'auscultation, clinique et ECG **normaux préremplis**. | Enlever ces valeurs par défaut ; utiliser `non renseigné` / modèles volontairement sélectionnés et confirmés. |
| AUD-03 | `maxAorta()` prend le **maximum de tous les segments**, y compris crosse/descendante/anneau ; `calcAorta()` le réutilise dans des branches de seuils pouvant concerner spécifiquement racine/ascendante. | Règles **par segment**, avec conditions d'éligibilité et distinction des alertes. |
| AUD-04 | Codes de seuils aortiques **45/50/55/60 mm**, de vitesse **3/5 mm/an**, surface/hauteur **10 cm²/m**, parfois présentés comme « indication chirurgicale » automatique. | Relecture experte à partir de recommandations datées ; gradation et décision spécialisée ; tests par étiologie et segment. |
| AUD-05 | `calcAorta()` utilise `asc || sinus || max` pour la surface/hauteur, sans choix clinique explicite du segment ; si plusieurs valeurs, le choix n'est pas nécessairement le segment pertinent. | Afficher le segment choisi ; vérifier formule, conditions et cas limites. |
| AUD-06 | Certaines cases dérivées par `sync()` sont cochées si un facteur existe mais ne sont pas forcément réinitialisées quand le facteur disparaît (troponine, anomalie ST, DFG, etc.). | Calculs purement dérivés de l'état actuel ; éviter les états « collants » ; tests de changement et effacement. |
| AUD-07 | `calcTIMI`, `calcTRI` et d'autres scores reposent sur des cases simplifiées, parfois synchronisées à des **proxys** et sont susceptibles d'être inapplicables ou incomplets. | Contrôler **tous les items** contre les définitions officielles ; gérer les critères inconnus ; distinguer vrais calculs et approximations. |
| AUD-08 | Interprétations par **bornes codées en dur** (SCORE2, QTc, FEVG, PAPS, EuroSCORE, HCM Risk-SCD...). | Vérifier contexte/sexe/âge, recommandations et version, rendre règles testables ; sinon lecture prudente ou seule valeur brute. |
| AUD-09 | `new Date().toISOString().split('T')[0]` utilise UTC pour la date du jour ; risque de décalage local. | Utiliser date locale à l'acte et formats `Europe/Paris` dans l'interface. |
| AUD-10 | Rapport entièrement reconstruit à la demande ; un nouveau clic peut **effacer les corrections manuelles du texte**. | Conserver brouillon et éditions, avertissement avant écrasement, snapshots. |
| AUD-11 | `window.print()` est appelé « PDF » : l'utilisateur dépend de la boîte d'impression du navigateur. | Impression A4 fiable ; export PDF véritable si faisable, ou libellé exact « Imprimer / Enregistrer en PDF ». |
| AUD-12 | Calculs/alertes pouvant apparaître même sans indication ou données suffisamment complètes ; exemple aorte sans valeur avec statut de surveillance ordinaire. | Statuts `non applicable`, `incomplet`, `à confirmer`, `calculé`, jamais de « normal » par absence de saisie. |
| AUD-13 | Sexe/âge/risques recopiés dans des cases manuelles synchronisées ; risques de double comptage, incohérences ou perte d'informations de suivi. | Source unique de vérité ; tests de score et clarté de la donnée demandée. |
| AUD-14 | Copier/ouvrir hors ligne, impression et persistance peuvent se comporter différemment selon Safari/Chrome et contexte `file://`. | Tests croisés, gestion d'erreur et guide d'utilisation local. |

Ces corrections sont **plus prioritaires** que tout ajout cosmétique.

---

## 9. Cas d'acceptation / tests minimaux pour Codex

Utiliser exclusivement des **patients fictifs**, anonymes et générés à la demande.

### 9.1 Parcours de consultation

- **T-01 :** nouvelle consultation, saisir identité fictive, motif, TA, traitements, ECG, ETT ; générer un compte rendu contenant les valeurs dans les **bonnes unités** et sans champ trompeur.
- **T-02 :** laisser auscultation et échographie vides ; le rapport n'affiche **aucune phrase « normal » non documentée**.
- **T-03 :** modifier une valeur après génération ; afficher que le compte rendu est à actualiser, préserver l'édition finale ou demander confirmation de remplacement.
- **T-04 :** une saisie du poids et de la taille produit IMC/BSA corrects et affichage adéquat ; une taille de 0, un âge incohérent ou une valeur négative bloque les calculs.
- **T-05 :** édition, export, impression et bouton copier fonctionnent ou affichent une **erreur claire**.

### 9.2 Scores

- **T-06 :** aucun score calculé comme « faible risque / 0 » si les entrées nécessaires sont inconnues.
- **T-07 :** calcul CHA₂DS₂-VASc/CHA₂DS₂-VA sur jeux de référence **validés** ; mise à jour correcte lorsque l'utilisateur corrige sexe/âge/ATCD.
- **T-08 :** changer puis retirer « troponine positive », « anomalies ECG » et DFG altéré : les critères dépendants sont recalculés et la sélection ne reste pas activée à tort.
- **T-09 :** un score officiel saisi manuellement est marqué « saisi », sans être présenté comme calcul automatique ni interprété hors contexte.

### 9.3 Aorte

- **T-10 :** aorte ascendante **60 mm**, chez patient fictif : alerte visuelle visible + recommandation d'évaluation spécialisée / imagerie de confirmation ; **pas de décision chirurgicale automatisée**.
- **T-11 :** aorte ascendante 38 mm avec **aorte descendante 60 mm** : ne pas déclencher faussement les seuils **spécifiques à la racine/ascendante** ; déclencher la logique distincte du segment concerné si elle est validée.
- **T-12 :** aucune mesure aortique : pas de niveau de risque « normal », seulement « non renseigné ».
- **T-13 :** diamètre aortique sans taille renseignée : aucun calcul surface/hauteur artificiel ; afficher « taille nécessaire ».
- **T-14 :** croissance sans mesure/date antérieure documentée : ne pas la présenter comme « calculée automatiquement ».
- **T-15 :** bicuspidie, maladie génétique, symptômes, antécédents familiaux, chirurgie concomitante : règles conditionnelles séparées et référencées.

### 9.4 Sécurité et fonctionnalités à venir

- **T-16 :** la démonstration est utilisable sans vraie identité et sans réseau ; aucune donnée n'est envoyée à un tiers.
- **T-17 :** l'ordonnance ne comporte pas de médicament ni dose par défaut ; la génération et la modification d'un modèle sont explicites.
- **T-18 :** « Carte Vitale / télétransmission » indique clairement **non disponible** tant qu'aucun connecteur homologué n'est utilisé.
- **T-19 :** chaque règle médicale dispose d'au moins un test de valeurs limites et de données manquantes.
- **T-20 :** les versions V3/V4/V5 restent présentes **intactes** dans le dossier `legacy/`.

---

## 10. Plan d'exécution proposé à Codex

### Sprint A — Stabiliser le prototype (P0)

- Importer les HTML V3/V4/V5 ; vérifier leur fonctionnement dans Safari/Chrome ; créer une matrice « fonction existante / anomalie / cible ».
- Conserver l'interface et les données V5 ; refaire les contrôles, séparer les fonctions médicales testées et éliminer les valeurs préremplies trompeuses.
- Remplacer `localStorage` nominatif par **mode démo fictif** et stockage explicitement limité ; fiabiliser les dates, validations, signalement d'erreurs.
- Tester les scores et le module aortique, produire document A4.

### Sprint B — Produit utilisable en démonstration avancée (P1)

- Ordonnances, modèles, meilleur compte rendu éditable, navigation, historique fictif, export, branding paramétrable.
- Améliorer modules ECG/ETT et visibilité des alertes de contexte.
- Guide d'installation, tests automatiques, documentation complète.

### Sprint C — Préparer une production (P2 sous décisions externes)

- Architecture sécurité/dossier réel, responsabilités RGPD, éventuel hébergement HDS, rôles, audit et exploitation.
- Connecteurs externes réellement documentés ; étude Carte Vitale/SESAM-Vitale, interopérabilité, référentiels de médicaments, imports de dispositifs.
- Évaluation de conformité et **recette clinique** avant diffusion auprès de patients.

**Définition du « terminé » :** code qui démarre, démonstration cliquable sans Internet une fois installée/configurée selon la stack, tests passants, livrables documentés, limites médicales et sécuritaires visibles, aucune fonctionnalité simulée présentée comme réellement intégrée.

---

## 11. Extensions métier envisageables (non engagées pour la première version)

Elles découlent de travaux pédagogiques/consultations cardiologiques déjà abordés, mais **ne doivent pas retarder le socle** :

- **Rythmologie** : FA paroxystique/persistante/permanente, flutter, tachycardie atriale, Holter, PM/CRT, contrôles des seuils de stimulation, EEP, QTc et gestion des antiarythmiques.
- **Insuffisance cardiaque** : HFrEF/HFmrEF/HFpEF, congestion/décongestion, DFG et diurétiques, facteurs de décompensation, réhospitalisations.
- **Valvulopathies** : évaluation multiparamétrique IA, IM, RA, RM, IT, discordances, régurgitations massives/torrentielles, suites de réparation/prothèse.
- **HTP et VD** : probabilité échographique, groupes étiologiques, probabilité vs diagnostic, remodelage du cœur droit.
- **Coronarien / imagerie** : test d'effort, pré-test, CAD-RADS, plaques P1–P4, Agatston, évaluation du scanner coronaire, post-stent.
- **CMH / amylose** : hypertrophie, strain, scintigraphie, IRM, critères d'orientation, sans automatiser des diagnostics complexes.
- **Endocardite et chirurgie** : valvulopathie et prothèses, scores et décisions multidisciplinaires.
- **Format pédagogique** séparé de la production : schéma de raisonnement à **quatre dimensions** (mécanisme, temporalité, profil clinique/ECG/ETT, décision et suivi), cas cliniques fictifs, QCM ; **ne jamais mélanger patients réels et banque pédagogique**.

---

## 12. Sources techniques et consignes de reprise

Les fichiers sources **doivent être remis à Codex en plus de ce Markdown** :

```text
cardioconsult/
├── CARDIOCONSULT_CAHIER_DES_CHARGES_CODEX.md   # ce document
├── legacy/
│   ├── Cardio Soin_V3_Scores_Risque.html
│   ├── Cardio Soin_V4_Consultation_Complete.html
│   └── Cardio Soin_V5_Aorte_RedFlag.html
├── src/                                  # à créer par Codex
├── tests/                                # à créer par Codex
├── README.md                             # à créer par Codex
└── CHANGELOG.md                          # à créer par Codex
```

**Méthode :**

1. Démarrer par la V5. Inspecter tous les `id`, `<select>`, fonctions `calc...`, `sync`, `generateReport`, `save/load` et les règles de CSS/print.
2. Construire une **table de migration** des champs et sections du formulaire vers le nouveau modèle de données ; conserver les noms historiques comme alias si utile.
3. Transformer les calculs en fonctions **pures** prenant des données validées, renvoyant `{status, value, rationale, source, missingInputs}`.
4. Utiliser tests à cas limites et scénarios spécifiques, relire toute règle médicale qui formule une action clinique.
5. Écrire la documentation d'utilisation **à destination du cardiologue**, distincte du guide technique.

### 12.1 Résumé très précis des sources

- **V3** : formulaire patient, contexte, onglets de scores, résultats, rapport, export ; 23 Ko environ.
- **V4** : ajoute clinique + biologie + ECG + ETT aux scores ; 36 Ko environ.
- **V5** : reprend V4, ajoute dimensions aortiques et RED FLAG, indexation BSA, vitesse de croissance et facteurs de risque ; 44 Ko environ.
- **Aucune version n'est à considérer comme un produit de soin validé** : elles constituent du code de démonstration et un historique de besoins.

### 12.2 Registre des champs existants dans V5

L'annexe ci-dessous est extraite des champs HTML (`id`) du prototype et destinée à **éviter de perdre des fonctions pendant la migration**. Le libellé suit celui du prototype. Les catégories et options reflètent l'existant, pas une validation clinique.


#### 1. Patient

| ID HTML | Libellé historique | Type |
|---|---|---|
| `nom` | Nom | texte |
| `prenom` | Prénom | texte |
| `dob` | Date naissance | date |
| `age` | Âge | number |
| `sexe` | Sexe | liste (2 options) |
| `poids` | Poids kg | number |
| `taille` | Taille cm | number |
| `bsa` | SC auto m² | texte |
| `dateConsult` | Date consultation | date |
| `medecin` | Médecin traitant | texte |
| `motif` | Motif | liste (17 options) |
| `histoire` | Résumé clinique | texte long |

#### 2. Antécédents / FDRCV / traitements

| ID HTML | Libellé historique | Type |
|---|---|---|
| `hta` | HTA | case à cocher |
| `diab` | Diabète | case à cocher |
| `dyslip` | Dyslipidémie | case à cocher |
| `tabac` | Tabac | case à cocher |
| `coronaire` | Coronaropathie | case à cocher |
| `avc` | AVC/AIT | case à cocher |
| `aomi` | AOMI | case à cocher |
| `ic_atcd` | Insuffisance cardiaque | case à cocher |
| `fa_atcd` | FA/flutter | case à cocher |
| `irc` | IRC | case à cocher |
| `atcd` | Autres antécédents | texte long |
| `traitements` | Traitements | texte long |

#### 3. Examen clinique

| ID HTML | Libellé historique | Type |
|---|---|---|
| `tas` | TAS | number |
| `tad` | TAD | number |
| `fc` | FC | number |
| `spo2` | SpO₂ | number |
| `temp` | Température | number |
| `nyha` | NYHA | liste (4 options) |
| `cl_oedemes` | Œdèmes MI | case à cocher |
| `cl_crepitants` | Crépitants | case à cocher |
| `cl_turgescence` | Turgescence jugulaire | case à cocher |
| `cl_reflux` | Reflux hépato-jugulaire | case à cocher |
| `cl_souffle` | Souffle cardiaque | case à cocher |
| `cl_cyanose` | Cyanose / hypoxémie | case à cocher |
| `ausc_card` | Auscultation cardiaque | texte long |
| `ausc_pulm` | Auscultation pulmonaire / état congestif | texte long |
| `clinique` | Conclusion examen clinique | texte long |

#### 4. Biologie

| ID HTML | Libellé historique | Type |
|---|---|---|
| `hb` | Hb g/dL | number |
| `plaq` | Plaquettes G/L | number |
| `creat` | Créatinine µmol/L | number |
| `dfg` | DFG ml/min | number |
| `kaliemie` | K+ mmol/L | number |
| `natremie` | Na+ mmol/L | number |
| `ntprobnp` | NT-proBNP pg/mL | number |
| `tropo` | Troponine | liste (3 options) |
| `crp` | CRP mg/L | number |
| `tsh` | TSH mUI/L | number |
| `ldl` | LDL-c g/L | number |
| `hba1c` | HbA1c % | number |
| `bio_comment` | Commentaire biologie | texte long |

#### 5. ECG

| ID HTML | Libellé historique | Type |
|---|---|---|
| `ecg_rythme` | Rythme | liste (8 options) |
| `ecg_fc` | FC ECG | number |
| `pr` | PR ms | number |
| `qrs` | QRS ms | number |
| `qtc` | QTc ms | number |
| `axe` | Axe | texte |
| `hvg_ecg` | HVG ECG | liste (3 options) |
| `conduction` | Conduction | liste (8 options) |
| `ecg_stplus` | Sus-décalage ST | case à cocher |
| `ecg_stmoins` | Sous-décalage ST | case à cocher |
| `ecg_tneg` | Ondes T négatives | case à cocher |
| `ecg_esv` | ESV | case à cocher |
| `ecg_essa` | ESSV | case à cocher |
| `ecg_q` | Onde Q séquellaire | case à cocher |
| `ecg_comment` | Analyse ECG libre | texte long |

#### 6. Échographie cardiaque — VG/VD/valves

| ID HTML | Libellé historique | Type |
|---|---|---|
| `fevg` | FEVG % | number |
| `dtdvg` | DTD VG mm | number |
| `septum` | Septum mm | number |
| `pp` | PP mm | number |
| `og` | OG | liste (3 options) |
| `ee` | E/e' | number |
| `tapse` | TAPSE mm | number |
| `sprime_vd` | S' VD cm/s | number |
| `paps` | PAPS mmHg | number |
| `vmaxit` | Vmax IT m/s | number |
| `vci` | VCI | liste (3 options) |
| `pericarde` | Péricarde | liste (4 options) |
| `im` | IM | liste (4 options) |
| `ia` | IA | liste (4 options) |
| `rao` | RAo | liste (4 options) |
| `it` | IT | liste (5 options) |
| `valves` | Valves / mécanismes | texte long |
| `ett_comment` | Conclusion ETT | texte long |

#### 7. Module Aorte — dimensions et red flag

| ID HTML | Libellé historique | Type |
|---|---|---|
| `ao_anneau` | Anneau aortique mm | number |
| `ao_sinus` | Sinus de Valsalva mm | number |
| `ao_jst` | Jonction sino-tubulaire mm | number |
| `ao_asc` | Aorte ascendante tubulaire mm | number |
| `ao_crosse` | Crosse aortique mm | number |
| `ao_desc` | Aorte descendante mm | number |
| `ao_growth` | Croissance mm/an | number |
| `ao_area_height` | Surface/hauteur auto cm²/m | texte |
| `ao_bav` | Valve aortique bicuspide | case à cocher |
| `ao_marfan` | Marfan / TGFBR / Loeys-Dietz / maladie génétique | case à cocher |
| `ao_fam` | ATCD familial dissection/mort subite aortique | case à cocher |
| `ao_coarc` | Coarctation | case à cocher |
| `ao_sympt` | Symptômes attribuables à l’anévrisme | case à cocher |
| `ao_valve_surg` | Chirurgie valve aortique concomitante prévue | case à cocher |
| `ao_htad` | HTA mal contrôlée | case à cocher |
| `ao_ctdone` | TDM/IRM aortique déjà réalisée | case à cocher |
| `aorte_conclusion` | Conclusion automatique aorte | texte long |

#### 8. Scores cardiologiques

| ID HTML | Libellé historique | Type |
|---|---|---|
| `score2` | SCORE2/SCORE2-OP % | number |
| `risque_cv` | Risque CV global manuel | liste (3 options) |
| `ldl_goal` | Objectif LDL souhaité | texte |
| `timi_age` | Âge ≥65 | case à cocher |
| `timi_fdr` | ≥3 FDRCV | case à cocher |
| `timi_cor` | Sténose ≥50% | case à cocher |
| `timi_st` | Déviation ST | case à cocher |
| `timi_angor` | ≥2 angors/24h | case à cocher |
| `timi_asa` | Aspirine <7j | case à cocher |
| `timi_tropo` | Troponine + | case à cocher |
| `grace` | Score GRACE officiel | number |
| `killip` | Killip | liste (4 options) |
| `gr_arret` | Arrêt cardiaque admission | liste (2 options) |
| `strategie_sca` | Stratégie invasive | liste (4 options) |
| `cad` | CAD-RADS | liste (8 options) |
| `pscore` | P-score | liste (4 options) |
| `agat` | Agatston | number |
| `syntax` | SYNTAX I | number |
| `ch_ic` | IC/VG | case à cocher |
| `ch_hta` | HTA | case à cocher |
| `ch_75` | Âge ≥75 | case à cocher |
| `ch_diab` | Diabète | case à cocher |
| `ch_avc` | AVC/AIT/embolie | case à cocher |
| `ch_vasc` | Vasculaire | case à cocher |
| `ch_65` | Âge 65-74 | case à cocher |
| `ch_f` | Sexe féminin | case à cocher |
| `hb_hta` | HTA non contrôlée | case à cocher |
| `hb_rein` | Rein | case à cocher |
| `hb_foie` | Foie | case à cocher |
| `hb_avc` | AVC | case à cocher |
| `hb_saign` | Saignement | case à cocher |
| `hb_inr` | INR labile | case à cocher |
| `hb_age` | Âge >65 | case à cocher |
| `hb_med` | AINS/antiagrégant | case à cocher |
| `hb_alcool` | Alcool | case à cocher |
| `tri_age` | Âge ≥70 | case à cocher |
| `tri_nyha` | NYHA III-IV | case à cocher |
| `tri_droite` | IC droite | case à cocher |
| `tri_furo` | Furosémide ≥125 mg/j | case à cocher |
| `tri_dfg` | DFG <30 | case à cocher |
| `tri_bili` | Bilirubine élevée | case à cocher |
| `tri_fevg` | FEVG <60% | case à cocher |
| `tri_vd` | Dysfonction VD | case à cocher |
| `euro` | EuroSCORE II % | number |
| `sts` | STS-PROM % | number |
| `wilkins` | Wilkins | number |
| `calvao` | Calcium valve Ao UA | number |
| `spesi` | sPESI | number |
| `bova` | Bova | number |
| `hfapeff` | HFA-PEFF manuel | number |
| `h2fpef` | H₂FPEF manuel | number |
| `hcm` | HCM Risk-SCD officiel % | number |
| `hcm_wall` | Épaisseur max mm | number |
| `hcm_og` | OG mm | number |
| `hcm_lvot` | Gradient LVOT | number |
| `hcm_sync` | Syncope | case à cocher |
| `hcm_fam` | Mort subite familiale | case à cocher |
| `hcm_tvns` | TVNS | case à cocher |
| `hcm_lge` | LGE étendu | case à cocher |
| `rcri_chir` | Chirurgie haut risque | case à cocher |
| `rcri_cor` | Cardiopathie ischémique | case à cocher |
| `rcri_ic` | IC | case à cocher |
| `rcri_avc` | AVC/AIT | case à cocher |
| `rcri_ins` | Diabète insuline | case à cocher |
| `rcri_creat` | Créat >177 | case à cocher |

---

## 13. Prompt opérationnel à donner à Codex

> Lis **entièrement** `CARDIOCONSULT_CAHIER_DES_CHARGES_CODEX.md`, puis inspecte les trois fichiers `legacy/`. Reprends **Cardio Soin V5** comme base. Commence par une courte synthèse des fonctions et défauts repérés, puis modifie réellement le code pour produire une version fonctionnelle **hors ligne en démonstration**, en français, avec parcours consultation/ECG/ETT/aorte/scores/compte rendu, contrôles de validité, alertes cliniquement prudentes et tests. Restaure ensuite l'ordonnance prévue en V2. **Ne jamais stocker de données patients réelles en `localStorage`**, ne jamais inventer une intégration SESAM-Vitale et ne jamais présenter une alerte comme décision médicale définitive. Préserve les sources, indique les limites et écris les instructions de lancement. Ne fournis pas uniquement du pseudo-code ou des maquettes.

## 14. Points à faire arbitrer par le médecin ultérieurement — pas bloquants pour la démo

- Choix du **logo définitif** et des éventuelles coordonnées complètes d'en-tête.
- Modèles et formulations finales des **courriers et ordonnances**.
- Hiérarchie des scores affichés pour chaque motif, valeurs de référence selon les recommandations applicables et validation clinique des règles.
- Stockage réel, lieu d'hébergement, rôles utilisateurs, système de facturation, intégrations médicales.

**Fin du cahier des charges.**
