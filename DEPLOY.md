# Dokonchi — Serverga deploy qilish (Contabo VPS, Ubuntu)

> ℹ️ **Biz CapRover'dan foydalanyapmiz** — to'liq qo'llanma: [CAPROVER.md](./CAPROVER.md).
> Bu fayl (Docker Compose) — CapRover'siz oddiy muqobil variant.

Bitta serverda hammasi: **PostgreSQL + Backend (NestJS) + Frontend (Nginx)** — Docker Compose orqali.

- **Server IP:** `185.182.184.190`
- **Manzil:** `http://185.182.184.190`
- **Joylashuv:** `/opt/dokonchi`

---

## 1. Serverga ulanish

Mac terminalidan:

```bash
ssh root@185.182.184.190
```

Birinchi marta `yes` deysiz, keyin Contabo parolini kiritasiz.

---

## 2. Tizimni yangilash + asosiy xavfsizlik

```bash
apt update && apt upgrade -y

# Firewall — faqat SSH (22) va HTTP (80) ochiq
apt install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw --force enable
```

---

## 3. Docker o'rnatish

```bash
curl -fsSL https://get.docker.com | sh
docker --version
docker compose version
```

---

## 4. Loyihani yuklab olish

```bash
cd /opt
git clone -b feat/dokonchi-yaxshilanishlar https://github.com/zohiddev/dokonchi.git
cd /opt/dokonchi
```

---

## 5. Maxfiy sozlamalar (.env)

```bash
cp .env.prod.example .env
nano .env
```

Quyidagilarni o'zgartiring (`CHANGE_ME` larni):

- `POSTGRES_PASSWORD` — baza paroli (kuchli)
- `JWT_SECRET` — tasodifiy uzun satr. Generatsiya: `openssl rand -hex 32`
- `ADMIN_PASSWORD` — Dokonchi'ga kirish paroli
- `ADMIN_PHONE` — admin telefon raqami (login uchun, masalan `+998901234567`)
- `TELEGRAM_BOT_TOKEN` — (ixtiyoriy) @BotFather token. Bo'sh qolsa bot o'chiq.

Saqlash: `Ctrl+O`, `Enter`, `Ctrl+X`.

---

## 6. Ishga tushirish

```bash
cd /opt/dokonchi
docker compose -f docker-compose.prod.yml up -d --build
```

Birinchi build 3–6 daqiqa oladi. Holatni ko'rish:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

Migratsiyalar backend ishga tushganda avtomatik qo'llanadi.

---

## 7. Admin foydalanuvchi yaratish (bir marta)

```bash
docker compose -f docker-compose.prod.yml exec backend \
  npx ts-node --transpile-only prisma/seed-prod.ts
```

Endi `http://185.182.184.190` ga kiring va `.env` dagi **ADMIN_PHONE + ADMIN_PASSWORD** bilan login qiling.

---

## 8. Avtomatik kunlik backup

```bash
chmod +x /opt/dokonchi/scripts/backup.sh

# Har kuni soat 03:00 da backup (cron)
( crontab -l 2>/dev/null; echo "0 3 * * * /opt/dokonchi/scripts/backup.sh >> /var/log/dokonchi-backup.log 2>&1" ) | crontab -

# Sinab ko'rish:
/opt/dokonchi/scripts/backup.sh
```

Backuplar: `/opt/dokonchi-backups/` (oxirgi 14 kun).

---

## Kundalik amallar

```bash
cd /opt/dokonchi

# Yangilanish (kod o'zgargach)
git pull
docker compose -f docker-compose.prod.yml up -d --build

# Loglar
docker compose -f docker-compose.prod.yml logs -f

# To'xtatish / qayta ishga tushirish
docker compose -f docker-compose.prod.yml restart
docker compose -f docker-compose.prod.yml down
```

### Backupdan tiklash

```bash
gunzip -c /opt/dokonchi-backups/dokonchi_YYYY-MM-DD_HH-MM-SS.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U dokonchi -d dokonchi
```

---

## Keyingi qadam: domen + HTTPS

Domen olganingizdan keyin:
1. Domen A-record → `185.182.184.190`
2. Nginx'ga 443 + Let's Encrypt (certbot) qo'shamiz
3. PWA (telefonga "ilova" o'rnatish) ishlay boshlaydi

Domen tayyor bo'lganda menga ayting — bu qismni qo'shamiz.
