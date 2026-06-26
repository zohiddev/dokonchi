# Dokonchi — CapRover bilan deploy

CapRover = web-panel orqali boshqariladigan PaaS (Docker Swarm ustida). Deploy, loglar,
env, SSL — hammasi UI'dan.

**Arxitektura (3 ta CapRover app):**
- `dokonchi-db` — PostgreSQL (One-Click App, ichki, tashqariga ochilmaydi)
- `dokonchi-api` — backend (NestJS), ichki — `srv-captain--dokonchi-api:3000`
- `dokonchi` — frontend (nginx). Public. `/api` ni `srv-captain--dokonchi-api` ga uzatadi
  (same-origin → CORS yo'q). Foydalanuvchi shu app orqali kiradi.

- **Server:** `185.182.184.190`
- **Domensiz manzil (nip.io):** ilova `http://dokonchi.185.182.184.190.nip.io`,
  panel `http://185.182.184.190:3000`
- **Eslatma:** domensiz HTTPS yo'q → PWA "ilova o'rnatish" ishlamaydi. Domen olinganda
  CapRover'da 1 bosishda SSL yoqiladi.

---

## 1. Serverga ulanish + firewall

```bash
ssh root@185.182.184.190

apt update && apt upgrade -y
apt install -y ufw
ufw allow OpenSSH
ufw allow 80,443,3000,996,7946,4789,2377/tcp
ufw allow 7946,4789,2377/udp
ufw --force enable
```

## 2. CapRover o'rnatish

```bash
docker run -p 80:80 -p 443:443 -p 3000:3000 \
  -e ACCEPTED_TERMS=true \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /captain:/captain \
  caprover/caprover
```

~60 soniya kuting (ishga tushishi uchun).

## 3. Boshlang'ich sozlash (web-panel)

1. Brauzerda: `http://185.182.184.190:3000`
2. Parol: `captain42`
3. **Root domain** so'ralganda kiriting: `185.182.184.190.nip.io` → *Update Domain*
4. **Settings → Change Password** — parolni o'zgartiring
5. HTTPS'ni hozircha **yoqmang** (nip.io'da ishlamaydi)

## 4. PostgreSQL (One-Click App)

1. **Apps → One-Click Apps/Databases → "PostgreSQL"**
2. To'ldiring:
   - App Name: `dokonchi-db`
   - PostgreSQL Username: `dokonchi`
   - PostgreSQL Password: *(kuchli parol — eslab qoling)*
   - PostgreSQL Default Database: `dokonchi`
3. **Deploy** → ishga tushguncha kuting.

> Ichki manzili: `srv-captain--dokonchi-db:5432`

## 5. Mac'da CapRover CLI

```bash
npm install -g caprover
caprover login
#  CapRover machine URL: http://185.182.184.190:3000
#  Password: (3-qadamdagi yangi parol)
#  Name: dokonchi
```

## 6. Backend (`dokonchi-api`)

**Panelda:** Apps → *Create New App* → nomi `dokonchi-api`
(*Has Persistent Data* = OFF) → Create.

App'ni ochib **App Configs → Environmental Variables** ga quyidagilarni qo'ying
(*Save & Update*):

```
DATABASE_URL=postgresql://dokonchi:PG_PAROL@srv-captain--dokonchi-db:5432/dokonchi?schema=public
JWT_SECRET=<openssl rand -hex 32 natijasi>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
TELEGRAM_BOT_TOKEN=
SHOP_NAME=Dokonchi
PORT=3000
ADMIN_NAME=Admin
ADMIN_PHONE=+998901234567
ADMIN_PASSWORD=<dokonchiga kirish paroli>
```

> `PG_PAROL` — 4-qadamdagi PostgreSQL paroli. `JWT_SECRET` uchun Mac'da `openssl rand -hex 32`.

**Deploy (Mac terminalidan):**
```bash
cd /Users/zohidjon/Desktop/others/dokonchi/backend
caprover deploy
# machine: dokonchi, app: dokonchi-api
```

Build tugagach backend avtomatik: migratsiya → admin yaratish → ishga tushadi.
Backend'ga public domen SHART EMAS (ichki ishlaydi).

## 7. Frontend (`dokonchi`)

**Panelda:** Apps → *Create New App* → nomi `dokonchi` → Create.

**App Configs → Environmental Variables:**
```
BACKEND_HOST=srv-captain--dokonchi-api:3000
```
*Save & Update*. (*HTTP Settings* da Container HTTP Port = `80`, default.)

**Deploy (Mac'dan):**
```bash
cd /Users/zohidjon/Desktop/others/dokonchi/frontend
caprover deploy
# app: dokonchi
```

Deploy tugagach app avtomatik `http://dokonchi.185.182.184.190.nip.io` da ochiladi.

## 8. Tekshirish

`http://dokonchi.185.182.184.190.nip.io` ga kiring →
`ADMIN_PHONE` + `ADMIN_PASSWORD` bilan login.

Loglar: panelda app → *App Logs*, yoki serverda:
```bash
docker service logs srv-captain--dokonchi-api --tail 100 -f
```

## 9. Avtomatik kunlik backup

```bash
mkdir -p /opt/dokonchi/scripts
curl -fsSL https://raw.githubusercontent.com/zohiddev/dokonchi/feat/dokonchi-yaxshilanishlar/scripts/backup-caprover.sh \
  -o /opt/dokonchi/scripts/backup-caprover.sh
chmod +x /opt/dokonchi/scripts/backup-caprover.sh

( crontab -l 2>/dev/null; echo "0 3 * * * PG_APP=dokonchi-db /opt/dokonchi/scripts/backup-caprover.sh >> /var/log/dokonchi-backup.log 2>&1" ) | crontab -

# Sinash:
PG_APP=dokonchi-db /opt/dokonchi/scripts/backup-caprover.sh
```

Backuplar: `/opt/dokonchi-backups/` (14 kun).

---

## Kundalik amallar

- **Yangilash:** kod o'zgargach Mac'da tegishli papkada `caprover deploy`.
- **Env o'zgartirish / restart / loglar:** CapRover panelidan.
- **Backupdan tiklash:**
  ```bash
  CID=$(docker ps -q -f name=srv-captain--dokonchi-db | head -n1)
  gunzip -c /opt/dokonchi-backups/dokonchi_YYYY-...sql.gz | \
    docker exec -i "$CID" sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
  ```

## Domen + HTTPS (keyin)

Domen olganingizda:
1. Settings → root domain'ni haqiqiy domenga o'zgartiring (DNS A-record → 185.182.184.190)
2. `dokonchi` app → *Enable HTTPS* (1 bosish, Let's Encrypt)
3. PWA (telefonga "ilova") ishlay boshlaydi
