# Cardio Soin

SaaS multi-tenant de consultation en cardiologie (France). Données **100 % synthétiques** en local / CI. Sécurité et traçabilité avant la vitesse de livraison.

## Stack

- Next.js 16 (App Router, `proxy.ts`) · TypeScript strict (`noUncheckedIndexedAccess`) · Tailwind CSS v4 · shadcn/ui
- Validation : zod (`env.ts`) · Logs : pino (redact PII) · Qualité : ESLint security, Prettier, Vitest, Playwright
- Cible données : PostgreSQL 16 + Drizzle (P02), MinIO, Gotenberg, ClamAV, Mailpit

## Prérequis

- Node 22+, pnpm 9
- Postgres 16+ (Docker via `pnpm compose:up`, **ou** instance Homebrew locale)

```bash
pnpm install
pnpm telemetry:disable   # aucune télémétrie tierce Next.js
cp .env.example .env.local
pnpm compose:up          # Postgres, MinIO, Gotenberg, ClamAV, Mailpit (si Docker dispo)
pnpm db:migrate:control  # schéma control-plane
pnpm db:seed             # provisionne dr-martin + patients synthétiques + compte auth
pnpm dev
# optionnel : worker jobs
pnpm jobs:work
```

Sans Docker, sur Postgres Homebrew déjà lancé sur `:5432` :

```bash
psql -d postgres -c "CREATE ROLE cardioconsult LOGIN PASSWORD 'cardioconsult' SUPERUSER;"
psql -d postgres -c "CREATE DATABASE cc_control OWNER cardioconsult;"
psql -d postgres -c "CREATE DATABASE cc_control_test OWNER cardioconsult;"
```

Compte seed (synthétique) : `c.martin@cabinet-martin.fr` / `motdepasse-demo-12` — MFA TOTP à enrôler à la première connexion.

## Hôtes locaux

Les navigateurs résolvent `*.localhost` vers `127.0.0.1`.

| URL                             | Espace              |
| ------------------------------- | ------------------- |
| http://localhost:3000           | Site public         |
| http://dr-martin.localhost:3000 | Cabinet (tenant)    |
| http://console.localhost:3000   | Console super admin |
| http://localhost:8025           | Mailpit (UI)        |
| http://localhost:9001           | MinIO console       |

## Scripts

```bash
pnpm dev
pnpm build          # inclut pnpm audit --audit-level=high
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e       # Playwright (en-têtes sécurité en production)
pnpm format:check
```

## Structure (règle 01)

```text
app/                 routes App Router
components/          UI métier + shadcn
server/              actions / services / repositories (à venir P02+)
db/control|tenant    schémas Drizzle (P02)
lib/                 clinical, security, logging, rbac, tenant
env.ts               validation zod au démarrage (instrumentation)
proxy.ts             hôte → rewrite + CSP / strip x-cc-tenant
docker-compose.yml   dépendances locales
```

## Sécurité (rappel P01)

- En-têtes : CSP (nonce), HSTS (prod), `nosniff`, `Referrer-Policy`, etc.
- Les en-têtes internes (`x-cc-tenant`, …) fournis par le client sont **supprimés** puis recalculés depuis l’hôte.
- Pas de dépendance de télémétrie tierce. Secrets uniquement via `.env*` (non versionné, sauf `.env.example`).
- Pré-commit : lint-staged + gitleaks (si binaire disponible).

## Conformité

Les scores et alertes sont des aides à la documentation, pas des décisions médicales. Voir `docs/` et `DECISIONS.md`. Ne pas affirmer une conformité RGPD/HDS/DM sans preuves.
