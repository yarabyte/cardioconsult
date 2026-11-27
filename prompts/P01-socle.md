# P01 — Socle technique

**Prérequis** : P00 validé. Si le front issu des templates existe déjà, l'intégrer. Sinon, créer le projet.

## À livrer
- Next.js (App Router), TypeScript strict, Tailwind v4, shadcn/ui, police auto-hébergée, structure de dossiers de la règle 01.
- `env.ts` : validation zod de toutes les variables, échec au démarrage si l'une est absente. `.env.example` documenté.
- `docker-compose.yml` de développement : PostgreSQL 16, MinIO (S3), Gotenberg, ClamAV, Mailpit. Aucune donnée réelle.
- Logger pino avec liste d'exclusion PII (`redact`) et `requestId` propagé (AsyncLocalStorage).
- En-têtes de sécurité (CSP avec nonce, HSTS en production, etc.) dans le middleware ou `next.config`. Test automatisé des en-têtes.
- Middleware de résolution d'hôte (racine / console / tenant) avec suppression des en-têtes internes entrants.
- ESLint (`eslint-plugin-security`, `no-console`), Prettier, Husky + lint-staged + gitleaks en pré-commit.
- CI complète (règle 08) dès ce lot, même avec peu de tests.
- `README.md` : démarrage local avec `dr-martin.localhost:3000` et `console.localhost:3000`.

## Sécurité (bloquant)
- Aucune dépendance de télémétrie tierce. `next telemetry disable` documenté.
- Le build échoue si un secret est détecté ou si `pnpm audit` remonte une faille haute ou critique.

## Critères d'acceptation
- `pnpm dev` démarre les trois hôtes. `pnpm build`, `pnpm lint`, `pnpm typecheck` et `pnpm test` passent en CI.
- Test E2E : les en-têtes CSP, HSTS (en production), `X-Content-Type-Options` et `Referrer-Policy` sont présents. Un en-tête `x-cc-tenant` envoyé par le client est ignoré.
