# Décisions techniques — CardioConsult

## Phase 1 — Socle

- **Next.js 16.4** : le fichier de réécriture multi-tenant est `proxy.ts` (remplace `middleware.ts` déprécié). Export nommé `proxy`.
- **Cache Components / Partial Prefetching** (activés par create-next-app) : les layouts/pages qui lisent `cookies` / `headers` / `params` exportent `instant = false` pour autoriser un rendu bloquant.
- **shadcn « base-nova »** : CLI actuelle (Radix Base UI). Les triggers utilisent souvent la prop `render` plutôt que `asChild`.
- **Tokens** : couleurs hex de la charte (§5 du prompt) mappées dans `app/globals.css` via `@theme`, y compris `--primary-soft`, `--brand-red`, `--warning*`, `--success*`.
- **Séparation tenant** : logique pure d’hôte dans `lib/tenant-host.ts` (importable depuis le proxy) ; helpers serveur `getTenant` / `getHostKind` dans `lib/tenant.ts`.
- **Console** : rewrite de `console.*` vers `/console` (`app/(console)/console`), pour éviter le conflit de route `/` avec le marketing.
- **Démo** : cookie `demo-role` + `NEXT_PUBLIC_DEMO=true` pour basculer MEDECIN / INFIRMIERE / SUPERADMIN.
- **Données** : couche `Mock*Repository` uniquement ; bandeau « Données fictives » tant que `MOCK_ACTIVE`.

## Phase 2–6 — Écrans

- Graphiques via Recharts encapsulés (`TrendChart`, `BarTrendChart`, `DonutChart`) plutôt que de modifier `components/ui/chart.tsx`.
- Les interactions riches (filtres patients, MFA, scores, ordonnance, lits, permissions) sont en Client Components ; chargement initial en Server Components.
- Verrous réglementaires (`document.sign`, `prescription.validate`) appliqués dans `lib/rbac.ts` et non accordables à l’infirmière.

## Écarts connus vs maquettes HTML

- Certains écrans cliniques (ETT 20 rubriques, CR A4) sont fonctionnels mais moins densément peaufinés pixel-perfect que les HTML 1440 px.
- Sparkline KPI du tableau de bord médecin : composant présent ; toutes les cartes n’affichent pas encore une sparkline individuelle.
- Formulaire shadcn `form` : non fourni tel quel par le registry base-nova ; usage direct de `react-hook-form` + Label/Input.
