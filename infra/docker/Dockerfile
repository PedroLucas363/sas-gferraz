# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS tools
# Optional build-only trust certificate for managed corporate/cloud proxies.
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    npm install -g pnpm@10.34.8
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
FROM tools AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN --mount=type=secret,id=build_ca --mount=type=cache,id=gferraz-pnpm,target=/pnpm/store \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    pnpm install --frozen-lockfile --store-dir /pnpm/store
COPY packages ./packages
COPY apps ./apps
RUN DATABASE_URL=postgresql://unused:unused@127.0.0.1:5432/unused pnpm db:generate
RUN pnpm build
RUN --mount=type=secret,id=build_ca --mount=type=cache,id=gferraz-pnpm,target=/pnpm/store \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    PRISMA_SKIP_POSTINSTALL_GENERATE=1 pnpm --store-dir /pnpm/store --filter @gferraz/api deploy --legacy --prod /out/api
FROM node:24-bookworm-slim AS api
WORKDIR /app
COPY --from=builder --chown=node:node /out/api ./
RUN mkdir -p /app/media && chown node:node /app/media
ENV NODE_ENV=production API_HOST=0.0.0.0 MEDIA_ROOT=/app/media
USER node
CMD ["sh","-c","node dist/migrate.js && node dist/main.js"]
FROM node:24-bookworm-slim AS web
WORKDIR /app
COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
ENV NODE_ENV=production HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
USER node
CMD ["node","apps/web/server.js"]
