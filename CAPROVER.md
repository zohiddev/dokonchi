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

**Deploy (Mac terminalidan).** `caprover deploy` faqat git-root'dan ishlaydi, shuning
uchun monorepo papkasini **tar** qilib `-t` bilan yuboramiz:
```bash
cd /Users/zohidjon/Desktop/others/dokonchi/backend
COPYFILE_DISABLE=1 tar -cf /tmp/dokonchi-api.tar \
  --exclude='./node_modules' --exclude='./node_modules/*' \
  --exclude='./dist' --exclude='./dist/*' --exclude='./.git' .
caprover deploy -n dokonchi -a dokonchi-api -t /tmp/dokonchi-api.tar
```

Build tugagach backend avtomatik: migratsiya → admin yaratish → ishga tushadi.
Backend'ga public domen SHART EMAS (ichki ishlaydi).

## 7. Frontend (`dokonchi-front`)

**Panelda:** Apps → *Create New App* → nomi `dokonchi-front` → Create.

**App Configs → Environmental Variables:**
```
BACKEND_HOST=srv-captain--dokonchi-api:3000
```
*Save & Update*. (*HTTP Settings* da Container HTTP Port = `80`, default.)

**Deploy (Mac'dan, tar usuli):**
```bash
cd /Users/zohidjon/Desktop/others/dokonchi/frontend
COPYFILE_DISABLE=1 tar -cf /tmp/dokonchi-web.tar \
  --exclude='./node_modules' --exclude='./node_modules/*' \
  --exclude='./dist' --exclude='./dist/*' --exclude='./.git' .
caprover deploy -n dokonchi -a dokonchi-front -t /tmp/dokonchi-web.tar
```

Deploy tugagach app `http://dokonchi-front.185.182.184.190.nip.io` da ochiladi.

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

## Avtomatik deploy (GitHub Actions)

`.github/workflows/deploy.yml` — push qilinganda o'zgargan app avtomatik deploy bo'ladi.
Yoqish uchun (bir martalik):

1. **App Token'lar** — CapRover panelida har app uchun:
   - `dokonchi-api` → *Deployment* tab → **Enable App Token** → tokenni nusxalang
   - `dokonchi-front` → *Deployment* tab → **Enable App Token** → tokenni nusxalang
2. **GitHub secrets** — repo → *Settings → Secrets and variables → Actions → New repository secret*:
   - `CAPROVER_APP_TOKEN_API` = backend tokeni
   - `CAPROVER_APP_TOKEN_FRONT` = frontend tokeni
3. Tayyor. Endi `backend/` yoki `frontend/` o'zgartirib push qilsangiz — o'sha app avtomatik
   qayta deploy bo'ladi (GitHub → tar → CapRover build).

> Server URL workflow ichida `CAPROVER_HOST` env'da. Domen olganda shu qatorni yangilang.

## Domen + HTTPS (`dokonchiapp.uz`)

**1. DNS** (domen registratorida, `185.182.184.190` ga):
```
A   @   185.182.184.190     # dokonchiapp.uz (apex)
A   *   185.182.184.190     # wildcard: captain.*, adminer.* ... hammasi
```
`*` (wildcard) yozuvi barcha CapRover subdomenlarini qoplaydi. Tekshirish:
`dig +short dokonchiapp.uz` va `dig +short captain.dokonchiapp.uz` → IP qaytishi kerak.

**2. CapRover root domain + HTTPS** (panel `http://185.182.184.190:3000`):
1. **Settings → root domain** → `dokonchiapp.uz` → *Update Domain*
2. **Enable HTTPS** → email kiriting (Let's Encrypt). `captain.dokonchiapp.uz` resolve bo'lishi shart (1-qadam DNS).
3. **Force HTTPS** ni yoqing. Endi panel: `https://captain.dokonchiapp.uz`.

**3. Frontend app** (`dokonchi-front`):
- **HTTP Settings → Add Domain** → `dokonchiapp.uz` (xohlasangiz `www.dokonchiapp.uz` ham) → *Enable HTTPS* → *Force HTTPS*.
- Endi `https://dokonchiapp.uz` ochiladi va **PWA "ilova o'rnatish" ishlaydi**.
- Eski `*.nip.io` domenini olib tashlasangiz bo'ladi.

**4. Workflow:** `.github/workflows/deploy.yml` dagi `CAPROVER_HOST` allaqachon
`https://captain.dokonchiapp.uz` (2-qadamdan KEYIN main'ga merge qiling, aks holda
auto-deploy eski/yangi panelni topolmay qoladi).

## Adminer — prod DB GUI (`adminer.dokonchiapp.uz`)

Delivro'dagidek doimiy DB-panel: URL'ga kirib login/parol bilan ishlaysiz.

1. **Apps → One-Click Apps/Databases → "Adminer"** → App Name: `dokonchi-adminer` → Deploy.
   (One-Click'da bo'lmasa: app yarating → *Deploy via ImageName* → `adminer:latest` →
   *HTTP Settings → Container HTTP Port = `8080`*.)
2. **Env Vars:** `ADMINER_DEFAULT_SERVER=srv-captain--dokonchi-db` (Server maydoni oldindan to'ladi).
3. **HTTP Settings → Add Domain** → `adminer.dokonchiapp.uz` → *Enable HTTPS* → *Force HTTPS*.
4. Kirish: System `PostgreSQL`, Server `srv-captain--dokonchi-db`, User `dokonchi`,
   Password *(prod PG paroli)*, Database `dokonchi`.

> ⚠️ Adminer butun internetga ochiq — kuchli PG parol shart. Imkon bo'lsa app'ga
> Basic Auth qo'shing yoki kerak bo'lmaganda to'xtatib qo'ying. HTTPS bo'lgani uchun
> parol endi shifrlanib ketadi (nip.io HTTP'dan farqli).
