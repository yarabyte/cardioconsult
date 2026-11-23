# CardioConsult

Front-end Next.js (App Router) du SaaS de consultation en cardiologie — converti depuis les maquettes HTML de `templates-html/`. Données 100 % fictives ; prêt à brancher un backend via les interfaces `*Repository`.

## Stack

- Next.js 16 · TypeScript strict · Tailwind CSS v4 · shadcn/ui · lucide-react
- Formulaires : react-hook-form + zod · Dates : date-fns (`fr`, Europe/Paris)
- Graphiques : Recharts (composants `components/charts`)
- Qualité : ESLint, Prettier (+ plugin Tailwind), Vitest

## Démarrage local

```bash
pnpm install
pnpm dev
```

Ouvrir :

| URL | Espace |
|---|---|
| http://localhost:3000 | Site public |
| http://dr-martin.localhost:3000 | Cabinet (tenant) |
| http://console.localhost:3000 | Console super admin |
| http://localhost:3000/design | Identité visuelle |
| http://localhost:3000/inscription | Création de tenant |

Les navigateurs modernes résolvent `*.localhost` vers `127.0.0.1`.

### Variables d’environnement

Copier `.env.example` → `.env.local` :

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_DEMO=true` | Affiche le sélecteur de rôle de démonstration |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Domaine racine (défaut `cardioconsult.fr`) |
| `MOCK_DELAY=0` | Désactive la latence simulée des mocks |

## Scripts

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

## Structure

```text
app/(marketing)/     Site public, inscription, /design
app/(console)/       Console plateforme
app/t/[tenant]/     Auth + application cabinet
components/          UI, layout, clinical, charts, documents, admin
lib/clinical/        Règles pures testées (CHA₂DS₂-VA, HAS-BLED, RCRI, aorte, BSA)
lib/data/            Interfaces Repository + Mock*
lib/mock/            Jeux de données repris des maquettes
proxy.ts             Réécriture multi-tenant (hôte → routes)
```

## Brancher un vrai backend

1. Implémenter les interfaces de `lib/data/repositories.ts` (API / ORM).
2. Remplacer les exports `Mock*` par les adaptateurs réels (injection ou module swap).
3. Passer `MOCK_ACTIVE` à `false` dans `lib/data/delay.ts` pour retirer le bandeau.
4. Brancher l’auth réelle (session) à la place du cookie `demo-role`.

## Conformité

Les alertes et scores sont des aides à la décision — jamais une décision médicale. Mentions HDS telles que dans les maquettes (« hébergeur certifié HDS à contractualiser »).
