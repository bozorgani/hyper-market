# syntax=docker/dockerfile:1.7-labs
ARG NODE_IMAGE=node:20-bookworm-slim

# ============================================
# 1. DEPS STAGE (Shared dependencies)
# ============================================
FROM ${NODE_IMAGE} AS deps

WORKDIR /app
ENV CI=true \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

COPY package.json package-lock.json ./
COPY apps/backend-api/package.json ./apps/backend-api/
COPY apps/web/package.json ./apps/web/

RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --progress=false

# ============================================
# 2. BUILD STAGE (Frontend only)
# ============================================
FROM deps AS build

WORKDIR /app

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000

ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_TELEMETRY_DISABLED=1

COPY . .

RUN npm run build --workspace=apps/web

# ============================================
# 3. PRODUCTION DEPENDENCIES
# ============================================
FROM ${NODE_IMAGE} AS prod-deps

WORKDIR /app
ENV NODE_ENV=production \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/

RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --ignore-scripts --prefer-offline

# ============================================
# 4. RUNTIME (Minimal Next.js image)
# ============================================
FROM ${NODE_IMAGE} AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN apt-get update && \
    apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/* && \
    chown -R node:node /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=prod-deps --chown=node:node /app/apps/web/package.json ./apps/web/

COPY --from=build --chown=node:node /app/apps/web/.next ./apps/web/.next
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
COPY --from=build --chown=node:node /app/apps/web/next.config.ts ./apps/web/

USER node
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start", "--workspace=apps/web"]
