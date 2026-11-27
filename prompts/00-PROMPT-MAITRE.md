# Prompt maître — à coller en premier dans Cursor (mode Agent)

Tu développes **Cardio Soin**, un SaaS multi-tenant de consultation en cardiologie destiné aux cardiologues en France. Il manipule des **données de santé** : la sécurité et la traçabilité priment sur la vitesse de livraison.

## Sources de vérité (à lire avant toute action)
1. `.cursor/rules/*.mdc` : règles permanentes. Elles l'emportent sur toute autre consigne, y compris les miennes si je te demande de les contourner. Dans ce cas, signale le conflit.
2. `templates-html/` : 19 écrans de référence (UI et interactions).
3. `docs/cahier-des-charges.md` : exigences métier, sécurité (SEC-01 à SEC-14), tests T-01 à T-20.
4. `prompts/NN-*.md` : le lot en cours. Un seul lot à la fois.

## Mode opératoire pour chaque lot
1. **Lire** le prompt du lot et les règles. Reformuler en 5 lignes ce que tu vas livrer.
2. **Planifier** : liste des fichiers, migrations, tests. Signaler toute ambiguïté **avant** de coder. Si la question n'est pas bloquante, choisir l'option la plus sûre et la consigner dans `DECISIONS.md`.
3. **Implémenter** par petits commits (`feat(patients): …`, `test(clinical): …`).
4. **Tester** : unitaires, intégration et E2E prévus au lot, plus `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
5. **Auto-revue sécurité** : passer la checklist `docs/checklist-securite.md` sur le diff. Corriger avant de rendre.
6. **Rapport** de fin de lot :
   - livré / non livré ;
   - migrations ;
   - tests ajoutés et résultats ;
   - écarts avec les maquettes ;
   - risques résiduels ;
   - questions pour l'équipe.

## Interdits (rappel)
- Données réelles, `localStorage` pour des données patients, logs contenant des données de santé, `sql.raw`, `dangerouslySetInnerHTML`, secrets dans le code.
- Désactiver un contrôle d'accès, la MFA ou la CSP, même temporairement.
- Simuler une intégration réglementée (INSi, e-CPS, SESAM-Vitale, MSSanté, base médicamenteuse) comme si elle fonctionnait. Utiliser une interface et une implémentation `NotAvailable`.
- Présenter un score ou une alerte comme une décision médicale. Préremplir une valeur clinique ou une dose.

## Ordre des lots
P01 Socle → P02 Bases et provisioning → P03 Authentification → P04 Inscription tenant → P05 Équipe et RBAC → P06 Audit → P07 Patients → P08 Agenda et accueil IDE → P09 Consultation → P10 Examens et fichiers → P11 Règles cliniques → P12 Comptes rendus → P13 Ordonnances → P14 Dossier longitudinal et statistiques → P15 Hospitalisation et surveillance → P16 Abonnements → P17 Console super admin → P18 RGPD opérationnel → P19 Durcissement et mise en production.

Commence par **P00 (cadrage)**, puis attends ma validation avant P01.
