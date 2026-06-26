# ===== Build bosqichi =====
FROM node:22 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# API manzili build vaqtida "qotib qoladi" (Vite env build-time).
# Same-origin: nginx /api ni backendga uzatadi -> CORS muammosi yo'q.
ARG VITE_API_URL=/api
RUN echo "VITE_API_URL=$VITE_API_URL" > .env.production.local && npm run build

# ===== Serve bosqichi (nginx) =====
FROM nginx:alpine
# Backend ichki manzili runtime'da beriladi (compose default / CapRover override).
ENV BACKEND_HOST=backend:3000
# envsubst faqat BACKEND_HOST ni almashtirsin (nginx $host, $uri ... saqlanadi).
ENV NGINX_ENVSUBST_FILTER=BACKEND_HOST
# nginx:alpine entrypoint'i /etc/nginx/templates/*.template ni avtomatik to'ldiradi
COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
