FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json

RUN npm ci

COPY apps/web ./apps/web

ARG VITE_API_BASE_URL
ARG VITE_WS_BASE_URL
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_STRIPE_PUBLISHABLE_KEY

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_WS_BASE_URL=${VITE_WS_BASE_URL} \
    VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY} \
    VITE_STRIPE_PUBLISHABLE_KEY=${VITE_STRIPE_PUBLISHABLE_KEY}

RUN npm run build --workspace=web


FROM nginx:1.27-alpine AS runtime

ENV NGINX_ENVSUBST_FILTER="^(BACKEND_URL|BACKEND_HOST)$"

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

COPY apps/web/nginx.conf \
     /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
