# syntax=docker/dockerfile:1.7-labs
ARG NODE_IMAGE=node:20-bookworm-slim

# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
ENV CI=true \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_REGISTRY=https://registry.npmjs.org

COPY package.json package-lock.json ./
COPY apps/backend-api/package.json ./apps/backend-api/
COPY apps/web/package.json ./apps/web/

RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --progress=false

# ── Stage 2: Build the NestJS application ─────────────────────────────────────
FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run backend:build

# ── Stage 3: Prune to production-only dependencies ────────────────────────────
FROM deps AS prod-deps
WORKDIR /app
ENV NODE_ENV=production
RUN npm prune --omit=dev --ignore-scripts
RUN npm ls dompurify

# ── Stage 4: Production runner ────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS runner
LABEL maintainer="hyper-market-team" \
      org.opencontainers.image.title="hyper-market-backend" \
      org.opencontainers.image.description="Hyper Market NestJS API and BullMQ worker"

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001 \
    PRODUCT_IMAGE_UPLOAD_DIR=/app/uploads/product-images

RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/* && mkdir -p /app/uploads/product-images && chown -R node:node /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/apps/backend-api/node_modules ./apps/backend-api/node_modules
COPY --from=prod-deps --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=prod-deps --chown=node:node /app/apps/backend-api/package.json ./apps/backend-api/
COPY --from=build --chown=node:node /app/apps/backend-api/dist ./apps/backend-api/dist
COPY --from=build --chown=node:node /app/scripts ./scripts

USER node
EXPOSE 3001
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:3001/health/live', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
VOLUME ["/app/uploads/product-images"]
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/backend-api/dist/main.js"]
