# Cardio Soin V15 — Cahier des charges Codex

**Version :** 15 (prototype de démonstration, 24 modèles d'examens)  
**Date :** 24 novembre 2026  
**Base :** `Cardio Soin_V14_Examens_Complementaires_DEMO.html`  
**Livrable :** `Cardio Soin_V15_Infectiologie_Endocrinologie_HTA_DEMO.html`

## 0. Mission

Faire évoluer Cardio Soin **sans recommencer de zéro**, en préservant les modules précédents, notamment les dossiers d'hospitalisation, la consultation, la prescription structurée, la biologie connectée, le télésuivi IC, l'ordonnance de sortie assistée et le module de facturation SESAM-Vitale (actuellement simulé).

La nouvelle bibliothèque d'ordonnances d'examens complémentaires est dans la rubrique **25**. Elle comporte 24 protocoles, dont 11 déjà présents dans la V14 et 13 nouveaux. Un filtre de groupes permet une navigation par spécialité : Cardiologie, Infectiologie, Endocrinologie, HTA secondaire et Autres.

**Statut : démonstration, patients fictifs exclusivement.** Les résultats ni les ordonnances ne sont transmis à des laboratoires. L'HTML local ne doit pas contenir de données de vrais patients : pas d'authentification réelle, de stockage sécurisé, de connexion laboratoire ou de signature qualifiée.

## 1. Protocoles ajoutés en V15

### A. Infectiologie

| Modèle | Tronc commun et options | Principes de sécurité |
| --- | --- | --- |
| Infectiologie — orientation | NFS, CRP, créatinine/DFG ; puis PCT, lactate, hémocultures, ECBU, PCR selon contexte | Pas de panel indifférencié ni de délai de prise en charge d'un sepsis |
| Endocardite infectieuse | **Trois séries d'hémocultures avant antibiothérapie lorsque possible**, NFS, CRP, DFG ; selon situation sérologies Coxiella/Bartonella/Brucella, PCR ciblée, ETT/ETO | Équipe d'endocardite, microbiologie ; ne pas retarder antibiothérapie chez le patient instable |
| Bactériologie ciblée | Hémocultures si bactériémie probable ; cultures respiratoires, urinaires, selles, plaies profondes / PCR ciblée | Prélèvement selon le foyer, antibiogramme selon culture |
| ECBU / infection urinaire | ECBU + antibiogramme selon indications ; NFS/CRP/DFG/hémocultures si infection systémique | Pas de recherche de bactériurie asymptomatique systématique |
| Virologie ciblée | PCR grippe/SARS-CoV-2/VRS selon clinique ; VIH, HBV, HCV, EBV, CMV, parvovirus selon indication | Pas de panels viraux de routine ; conditions d'information patient |
| Mycologie ciblée | Culture mycologique, hémocultures appropriées, β-D-glucane, galactomannane, PCR Aspergillus, antigène cryptococcique | Réserver à des situations évocatrices, valider avec infectiologie/microbiologie ; risque de faux positifs |

### B. Endocrinologie

| Modèle | Principaux examens | Remarques |
| --- | --- | --- |
| Endocrinologie — orientation | TSH, T4 libre si indiquée, calcémie, PTH, HbA1c, cortisol/ACTH, aldostérone/rénine, métanéphrines, selon syndrome | Aucun panel hormonal global systématique |
| Thyroïde | **Bilan thyroïdien V14 préservé** : TSH puis T4L/T3L et autoanticorps si pertinents | Ne pas répéter inutilement TSH/T4/T3 systématiquement |
| Parathyroïdes | Calcémie totale + albumine, **PTH intacte**, phosphore, 25-OH vitamine D, DFG ; calciurie 24 h si indiquée | Interprétation calcium/PTH/DFG couplée ; ne pas confondre hyperparathyroïdie primaire et secondaire |
| Pancréatite aiguë | **Lipasémie**, NFS, ions, créatinine/DFG, glycémie, calcémie, bilan hépatique, CRP ; triglycérides selon contexte | Pancréatite = situation clinique potentiellement urgente ; lipase répétée non systématique ; échographie biliaire si indiquée |
| Surrénales — bilan basal | Cortisol 8 h + ACTH si suspicion d'insuffisance, électrolytes, glycémie ; selon suspicion ARR, métanéphrines, cortisol salivaire ou libre urinaire | En crise surrénalienne suspectée : ne pas retarder traitement urgent |
| Test de stimulation à l'ACTH (Synacthène) | Demande de protocole spécialisé, cortisol T0, T30 et/ou T60, ACTH de base si indiquée | Pas d'administration médicamenteuse automatisée ; horaires et seuils propres au laboratoire |
| Test de freinage par dexaméthasone | Demande de protocole de freinage minute, cortisol 8–9 h après dexaméthasone selon protocole, dosage de dexaméthasone si disponible | Médicament, horaires, interactions, grossesse, traitements interférents : validation endocrinologue/protocole local |

### C. Hypertension artérielle secondaire

- Tronc initial proposé : sodium, potassium, créatinine/DFG, rapport albumine-créatinine urinaire, aldostérone + rénine + **ratio ARR**.
- Selon les signes évocateurs : métanéphrines plasmatiques libres ou urinaires fractionnées, TSH, calcémie, exploration du cortisol, Doppler artères rénales, MAPA, exploration apnées du sommeil.
- Obligatoire : consigner les médicaments antihypertenseurs et les conditions de prélèvement car la rénine, l'aldostérone et leur rapport peuvent être fortement influencés par les traitements ; l'hypokaliémie peut fausser l'interprétation. Ne **jamais** arrêter automatiquement les antihypertenseurs.

## 2. Fonctionnement réalisé dans le prototype

- Un bouton de filtre par spécialité, puis choix d'un bilan.
- Bilans de base / examens additionnels sur indication explicite.
- Cases à cocher individuelles ; bouton « Ajouter le bilan de base » ; ajout d'examens libres.
- Filtre/recherche textuelle d'examens.
- Déduplication des items communs à plusieurs modèles.
- Conservation des sélections **par patient fictif** selon le mécanisme existant de la V14.
- Prévisualisation d'un brouillon comprenant indication, priorité, date, consignes et examens.
- Copie, export TXT, impression d'un brouillon non signé.
- Absence de connecteur labos, signature, transmission ou ordonnance exécutoire.

## 3. Exigences pour la future version clinique — priorité haute

1. **Modèles stockés en base et versionnés**, avec identifiant stable, nom normalisé, indication, contraintes de prélèvement, unité/format attendu, protocole scientifique et date de validation médicale.
2. Privilégier des **codes LOINC** / nomenclatures compatibles avec la biologie structurée (CR-BIO) ; différencier clairement les examens biologiques et les actes d'imagerie ou d'exploration externe.
3. Authentification individuelle et permissions ; identitovigilance/INS si applicable, association explicite à un patient/séjour/consultation ; journal d'audit.
4. Construire un circuit **brouillon → revue → validation médicale → signature → émission → accusé de réception → suivi des résultats**.
5. Interopérabilité avec des laboratoires uniquement selon contrats et formats réellement disponibles ; ne pas simuler un envoi comme un envoi réel.
6. Alertes conditionnelles (résultats critiques, non-réception, résultats incohérents) uniquement avec règles validées, provenance et unités, résultats vérifiés, responsabilité des notifications et journalisation.
7. Personnalisation du protocole par le médecin ; pas d'examens universels imposés ni de validation automatique d'un test dynamique.
8. Ne jamais injecter des données réelles dans le prototype HTML. Pour la production : hébergement des données de santé adapté, RGPD, contrôle d'accès, chiffrement, traçabilité, sauvegardes, conformité réglementaire des éventuelles aides à la décision.

## 4. Tests demandés à Codex

- Vérifier les **24 catégories** et les **6 filtres** (Toutes, Cardiologie, Infectiologie, Endocrinologie, HTA secondaire, Autres).
- Tester les 22 dossiers fictifs : aucun mélange de sélection lorsque le patient change.
- Contrôler le socle endocardite : 3 séries d'hémocultures, avec avertissement sur l'antibiothérapie.
- Vérifier que mycologie, virologie, ECBU et tests dynamiques surrénaliens **ne sont pas ajoutés en bloc par défaut**.
- Vérifier que l'HTA secondaire ne propose **aucun arrêt automatique de médicament**.
- Vérifier export TXT, brouillon impression, absence de connexion réelle et absence de données patients réelles.
- Vérifier sécurité HTML/JS (utilisation de textContent pour les noms personnalisés, pas d'injection HTML), saisies longues, mobile, accès clavier.
- Réaliser des tests de non-régression sur les modules 1–24 (V13 et V14).

## 5. Sources et validation clinique

- ESC 2023, endocardite infectieuse : https://academic.oup.com/eurheartj/article/44/39/3948/7243107
- ESC 2024, HTA et HTA secondaire : https://academic.oup.com/eurheartj/article/45/38/3912/7741010
- Endocrine Society 2025, hyperaldostéronisme primaire : https://www.endocrine.org/clinical-practice-guidelines/primary-aldosteronism-2
- ESE 2023, incidentalomes et exploration surrénalienne : https://academic.oup.com/ejendo/article/189/1/G1/7198474
- Endocrine Society, insuffisance surrénalienne : https://academic.oup.com/jcem/article/101/2/364/2810222
- Fifth International Workshop, hyperparathyroïdie : https://asbmr.onlinelibrary.wiley.com/doi/full/10.1002/jbmr.4677
- Référentiel CeMIR 2026, pancréatite aiguë : https://www.ce-mir.fr/enseignements/dfasm-edn/livre-referentiel-deuxieme-cycle-r2c-8eme-edition/chapitre-52-pancreatite-aigue-severe

**Note :** Ces références sont des aides au cadrage. Chaque protocole doit faire l'objet d'une revue médicale documentée et d'une adaptation aux recommandations et possibilités du laboratoire au moment de la mise en service.
