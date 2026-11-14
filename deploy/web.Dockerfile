# Gera o build dos dois sites Angular e serve tudo com Nginx.
#   /        -> site do cliente (progest/)
#   /erp/    -> painel de gestao (erp/)
#   /api/    -> encaminhado para o backend (ver deploy/nginx.conf)
# Contexto de build: raiz do repositorio (ver docker-compose.yml).

FROM node:24-alpine AS site
WORKDIR /app
COPY progest/package.json progest/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY progest/ ./
RUN npx ng build --configuration production

FROM node:24-alpine AS erp
WORKDIR /app
COPY erp/package.json erp/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY erp/ ./
RUN npx ng build --configuration production --base-href /erp/

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/proxy-backend.inc /etc/nginx/conf.d/proxy-backend.inc
COPY --from=site /app/dist/progest/browser /usr/share/nginx/html
COPY --from=erp /app/dist/erp/browser /usr/share/nginx/html/erp
