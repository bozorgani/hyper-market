ARG NODE_VERSION=20-bookworm-slim

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
ENV CI=true
COPY package.json package-lock.json ./
COPY apps/backend-api/package.json apps/backend-api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run backend:build

FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/backend-api/package.json apps/backend-api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001 \
    PRODUCT_IMAGE_UPLOAD_DIR=/app/uploads/product-images

RUN apt-get update \
  && apt-get install -y --no-install-recommends dumb-init \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/uploads/product-images \
  && chown -R node:node /app

COPY --from=prod-deps --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=prod-deps --chown=node:node /app/apps/backend-api/package.json apps/backend-api/package.json
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/backend-api/dist apps/backend-api/dist
COPY --from=build --chown=node:node /app/scripts scripts

USER node
EXPOSE 3001
VOLUME ["/app/uploads/product-images"]

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/backend-api/dist/src/main.js"]
