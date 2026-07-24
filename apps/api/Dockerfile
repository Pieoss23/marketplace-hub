# syntax=docker/dockerfile:1
#
# Multi-stage build for @marketplace-hub/api. Build context MUST be the repo
# root (the build needs the workspace lockfile and the packages/* it depends
# on): from the repo root run
#   docker build -f apps/api/Dockerfile -t marketplace-hub-api .

# ---- base: pnpm on Node 20 (matches engines.node) ----
FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
# Prisma's query engine needs OpenSSL present at runtime and at generate time.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace

# ---- build: install deps, compile the api + its workspace packages,
#      generate the Prisma client, and emit a pruned production bundle ----
FROM base AS build
# Every workspace manifest is needed for pnpm to resolve the workspace and
# validate the frozen lockfile, even though we only install the api subtree.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/extension/package.json apps/extension/
COPY packages/contracts/package.json packages/contracts/
COPY packages/domain/package.json packages/domain/
COPY packages/connector-sdk/package.json packages/connector-sdk/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile --filter @marketplace-hub/api...

# Sources for the api and the packages it depends on (web/extension excluded
# via .dockerignore — they are not part of this image).
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/

# Generate the Prisma client first: the TypeScript build depends on its
# generated types (model delegates, PrismaClient), so it must exist before tsc.
RUN pnpm --filter @marketplace-hub/api exec prisma generate
# Build the api and only the workspace packages it depends on.
RUN pnpm --filter @marketplace-hub/api... build

# Self-contained production bundle: workspace deps copied in, dev deps pruned.
# The `files` field on apps/api/package.json carries dist + prisma into it.
RUN pnpm --filter @marketplace-hub/api deploy --prod --legacy /app
# `prisma generate` wrote the client to the pnpm store's sibling `.prisma`
# directory, which `deploy` does not copy. Move it into the bundle next to the
# deployed `@prisma/client` (path globbed so it survives a version bump).
RUN set -eu; \
  src="$(find /workspace/node_modules/.pnpm -type d -path '*@prisma+client*/node_modules/.prisma' | head -n1)"; \
  client="$(find /app/node_modules/.pnpm -type d -path '*@prisma+client*/node_modules/@prisma/client' | head -n1)"; \
  dst_nm="$(dirname "$(dirname "$client")")"; \
  cp -r "$src" "$dst_nm/.prisma"

# ---- runner: minimal runtime image ----
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3000
# Liveness/readiness are exposed at /api/health and /api/health/ready.
# The slim image has no curl/wget, so probe with Node's global fetch; hitting
# /ready means the container is reported healthy only when it can reach the DB.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:3000/api/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "dist/main.js"]
