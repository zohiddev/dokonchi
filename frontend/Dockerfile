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
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
