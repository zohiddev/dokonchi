# ===== Build bosqichi =====
FROM node:22 AS builder
WORKDIR /app

# Bog'liqliklarni o'rnatish (layer cache uchun avval lockfile)
COPY package*.json ./
RUN npm ci

# Manba kod + Prisma client generatsiya + Nest build
COPY . .
RUN npx prisma generate && npm run build

# ===== Runtime bosqichi =====
FROM node:22-slim
WORKDIR /app

# Prisma engine uchun OpenSSL kerak
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Build natijalari (node_modules ichida prisma CLI + ts-node ham bor —
# migrate deploy va seed-prod uchun)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/tsconfig*.json ./
COPY --from=builder /app/package*.json ./

EXPOSE 3000

# Har ishga tushganda: migratsiyalar -> admin seed (idempotent) -> server.
# seed-prod admin mavjud bo'lsa o'tkazib yuboradi; xato bo'lsa ham ilova ishlayveradi.
CMD ["sh", "-c", "npx prisma migrate deploy && (npx ts-node --transpile-only prisma/seed-prod.ts || true) && node dist/main"]
