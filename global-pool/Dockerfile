# syntax=docker/dockerfile:1.7
# GLOBAL POOL — one Dockerfile, two targets (DEMO / testnet only):
#   docker build --target api -t globalpool-api .
#   docker build --target web -t globalpool-web .
# Script contract: apps/api provides `build` + `start:prod` (+ optional `db:migrate:deploy`),
#                  apps/web provides `build` + `start`.
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true \
    NEXT_TELEMETRY_DISABLED=1
# Prisma's query engine (debian-openssl-3.0.x) needs OpenSSL; the slim image does not ship it.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

# Fetch every dependency from the lockfile only (cache-friendly), then install offline.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm fetch
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --offline --frozen-lockfile
RUN pnpm build:packages

FROM deps AS api-build
RUN pnpm --filter @gp/api build

FROM deps AS web-build
# NEXT_PUBLIC_* values are inlined at build time.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_WS_URL=ws://localhost:4000
ARG NEXT_PUBLIC_DEMO_MODE=true
ARG NEXT_PUBLIC_PRIVY_APP_ID=
ARG NEXT_PUBLIC_PRIVY_MOCK=true
ARG NEXT_PUBLIC_CHAIN_ID=421614
ARG NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE \
    NEXT_PUBLIC_PRIVY_APP_ID=$NEXT_PUBLIC_PRIVY_APP_ID \
    NEXT_PUBLIC_PRIVY_MOCK=$NEXT_PUBLIC_PRIVY_MOCK \
    NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID \
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
# A web built with the mock off needs a Privy app id (else it would silently fall back to the DEV MOCK provider).
RUN if [ "$NEXT_PUBLIC_PRIVY_MOCK" = "false" ] && [ -z "$NEXT_PUBLIC_PRIVY_APP_ID" ]; then \
      echo "NEXT_PUBLIC_PRIVY_MOCK=false needs NEXT_PUBLIC_PRIVY_APP_ID (set it in .env for the prod profile)" >&2; \
      exit 1; \
    fi
RUN pnpm --filter @gp/web build

FROM api-build AS api
ENV NODE_ENV=production \
    API_PORT=4000 \
    REAL_MONEY_ENABLED=false
# DEV / DEMO credential files (DEMO seed, dev xpub) are written here — owned by the runtime user (compose volume).
RUN mkdir -p apps/api/.dev && chown node:node apps/api/.dev
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=10 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
USER node
CMD ["sh", "-c", "pnpm --filter @gp/api run --if-present db:migrate:deploy && pnpm --filter @gp/api start:prod"]

FROM web-build AS web
ENV NODE_ENV=production \
    PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=10 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.status<500?0:1),()=>process.exit(1))"
USER node
CMD ["pnpm", "--filter", "@gp/web", "start"]
