# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN --mount=type=cache,target=/root/.npm npm ci

FROM dependencies AS build
COPY backend/prisma ./backend/prisma
COPY backend/tsconfig.json backend/nest-cli.json ./backend/
COPY backend/src ./backend/src
RUN npm run build --workspace @assetflow/backend
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
RUN apk add --no-cache tini \
    && addgroup -S assetflow \
    && adduser -S -G assetflow assetflow
COPY --from=build --chown=assetflow:assetflow /app/node_modules ./node_modules
COPY --from=build --chown=assetflow:assetflow /app/backend/dist ./backend/dist
COPY --from=build --chown=assetflow:assetflow /app/backend/prisma ./backend/prisma
COPY --from=build --chown=assetflow:assetflow /app/backend/package.json ./backend/package.json
COPY --chown=assetflow:assetflow backend/docker-entrypoint.sh ./backend/docker-entrypoint.sh
RUN chmod 0555 ./backend/docker-entrypoint.sh
USER assetflow
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/v1/health/live" >/dev/null || exit 1
ENTRYPOINT ["/sbin/tini","--","/app/backend/docker-entrypoint.sh"]
