# Image applicative Cardio Soin — multi-stage, non-root.
# À signer (cosign) et scanner (Trivy) dans le pipeline release (P19).

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_APP_ENV=development
ARG NEXT_PUBLIC_ROOT_DOMAIN=cardiosoins.com
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV
ENV NEXT_PUBLIC_ROOT_DOMAIN=$NEXT_PUBLIC_ROOT_DOMAIN
ENV APP_SECRET=ci-build-secret-32-characters-min!!
RUN pnpm exec next build

# Migrations, seed, worker pg-boss (sources + node_modules — pas l’image standalone).
FROM node:22-alpine AS tools
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
RUN addgroup -S cc && adduser -S cc -G cc
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN chown -R cc:cc /app
USER cc
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
CMD ["pnpm", "jobs:work"]

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S cc && adduser -S cc -G cc \
  && apk add --no-cache curl wget
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER cc
EXPOSE 3000
# Coolify UI healthcheck remplace celui-ci s’il est activé : path /api/health, port 3000.
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
