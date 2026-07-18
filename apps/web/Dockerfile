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

# ── Stage 2: Build the Next.js application ────────────────────────────────────
FROM deps AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build --workspace=apps/web

# ── Stage 3: Production runner (standalone) ───────────────────────────────────
# Next.js standalone output produces a self-contained server at
# apps/web/.next/standalone/server.js with only the minimal node_modules
# it needs. This avoids shipping the entire monorepo node_modules (~900MB)
# and instead produces an image of ~200-250MB.
FROM ${NODE_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/* && chown -R node:node /app

# Copy the standalone server and its minimal node_modules
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
# Copy static assets (CSS, JS chunks, images) — not included in standalone
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
# Copy public assets (favicon, SVGs, etc.)
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public

USER node
EXPOSE 3000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "const req=require('http').get('http://127.0.0.1:3000/health', r => { r.resume(); r.on('end', () => process.exit(r.statusCode === 200 ? 0 : 1)); }); req.on('error', () => process.exit(1));"
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/web/server.js"]
