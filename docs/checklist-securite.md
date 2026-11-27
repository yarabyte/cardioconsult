# Checklist de revue de PR — Cardio Soin

À cocher sur chaque PR (règles 02–07). **≤ 40 points.** Non applicable = N/A avec justification courte.

## Accès et isolation (8)

1. [ ] `requireContext({ permission })` sur chaque Server Action, route handler et page protégée.
2. [ ] Accès DB via `ctx.db` uniquement (pas de client global ni tenant fourni par le client).
3. [ ] IDs vérifiés dans le tenant ; IDOR → 404 ; test IDOR présent ou N/A motivé.
4. [ ] Tenant résolu depuis l’hôte ; en-têtes `x-cc-tenant` entrants rejetés.
5. [ ] `document.sign`, `document.validate`, `prescription.validate` réservés médecin (non attribuables).
6. [ ] Actions sensibles : step-up (signature, export, rôles, MFA).
7. [ ] Super admin : aucun accès base tenant dans le diff.
8. [ ] Session support / élévation : TTL, consentement, audit (si concerné).

## Entrées, sorties, injection (6)

9. [ ] Zod `.strict()` : longueurs, plages, enums.
10. [ ] Pas de `sql.raw`, `dangerouslySetInnerHTML`, `eval`, redirection ouverte.
11. [ ] Erreurs client : message générique + `requestId` (pas de stack / PII).
12. [ ] Upload : MIME + magic bytes, taille ≤ 20 Mo, antivirus fail-closed, nom régénéré, URL présignée ≤ 5 min.
13. [ ] Contenu riche : JSON structuré / rendu sûr (pas HTML patient brut).
14. [ ] CSRF / Origin respecté sur mutations non Server-Action.

## Données de santé (7)

15. [ ] Aucune donnée patient dans logs, `localStorage`, `sessionStorage`, URL, cookies, e-mails, outils tiers.
16. [ ] Identité et textes libres cliniques : chiffrement enveloppe ; recherche via index aveugle (si lecture/écriture concernée).
17. [ ] Pas de valeur clinique par défaut ; trois états ; « non renseigné » ≠ « normal ».
18. [ ] Libellés non décisionnels ; modules médicaux derrière feature flag.
19. [ ] Seeds / fixtures / captures : données synthétiques uniquement.
20. [ ] Intégrations réglementées absentes → `NotAvailable` (pas de simulation « ça marche »).
21. [ ] Sous-traitant du flux : aucun envoi de santé hors périmètre HDS déclaré.

## Traçabilité et intégrité (6)

22. [ ] Audit de chaque mutation dans la même transaction (sans contenu clinique).
23. [ ] Ouverture de dossier auditée (outbox OK).
24. [ ] Verrou optimiste `version` sur entités co-éditées.
25. [ ] Documents / ordonnances validés immuables ; correction = version N+1 + motif.
26. [ ] Suppression logique uniquement (`archived_at`).
27. [ ] Accès refusé journalisé (`access_denied`) si testé.

## Base de données (4)

28. [ ] Migration additive, compatible N-1, testée sur tenant existant (si migration).
29. [ ] Contraintes FK / CHECK / UNIQUE alignées zod.
30. [ ] Pas de `DROP` / renommage destructif dans la même release.
31. [ ] Rôle / grants tenant non élargis par inadvertance.

## Config et chaîne d’approvisionnement (4)

32. [ ] Pas de secret dans le code ; `env.ts` + `.env.example` à jour.
33. [ ] Nouvelle dépendance justifiée dans `DECISIONS.md` ; `pnpm audit` sans critique non traitée.
34. [ ] CSP non affaiblie ; aucun script tiers ajouté dans l’app tenant.
35. [ ] Logger : denylist identité / clinique / secrets respectée.

## Qualité et clinique (5)

36. [ ] Tests unitaires / intégration / E2E du lot verts.
37. [ ] `lib/clinical` : couverture ≥ 95 % si touché ; cas manquants / incohérents.
38. [ ] Accessibilité : pas de violation axe sérieuse ; UI en français.
39. [ ] `DECISIONS.md` / changelog à jour si décision ou écart maquette.
40. [ ] Auto-revue croisée avec menaces touchées (`docs/securite/modele-menaces.md`).
