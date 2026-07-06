# syntax=docker/dockerfile:1.7-labs
ARG NODE_IMAGE=node:20-bookworm-slim

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

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run backend:build

FROM deps AS prod-deps
WORKDIR /app
ENV NODE_ENV=production
RUN npm prune --omit=dev --ignore-scripts

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001 \
    PRODUCT_IMAGE_UPLOAD_DIR=/app/uploads/product-images

RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/* && mkdir -p /app/uploads/product-images && chown -R node:node /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=prod-deps --chown=node:node /app/apps/backend-api/package.json ./apps/backend-api/
COPY --from=build --chown=node:node /app/apps/backend-api/dist ./apps/backend-api/dist
COPY --from=build --chown=node:node /app/scripts ./scripts

USER node
EXPOSE 3001
VOLUME ["/app/uploads/product-images"]
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/backend-api/dist/src/main.js"]
