# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN --mount=type=cache,target=/root/.npm npm ci
COPY frontend ./frontend
ARG VITE_API_URL=/api/v1
ARG VITE_DEMO_MODE=false
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_DEMO_MODE=${VITE_DEMO_MODE}
RUN npm run build --workspace @assetflow/frontend

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
