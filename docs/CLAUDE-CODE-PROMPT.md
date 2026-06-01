# Claude Code CLI — Tayyor Prompt

> Quyidagi matnni `BACKEND.md` va `FRONTEND.md` fayllari turgan papkada Claude Code CLI ga to'liq nusxalab tashlang.
> Maslahat: bosqichlarni **birma-bir** yuboring (hammasini birvarakayiga emas) — har bosqich oxirida tekshirib, keyingisiga o'ting.

---

## 📋 KONTEKST PROMPTI (eng boshida bir marta yuboring)

```
Sen do'kon hisob-kitob tizimini quryapsan. Bu un/oziq-ovqat do'koni uchun:
ishlab chiqaruvchidan tovar olib, do'konda sotadi. Har hafta yangi tovar
("partiya") keladi, eski tovar sotilmay qolishi mumkin — shuning uchun har
partiya alohida hisoblanadi va sotuvda FIFO (eng eski partiyadan) ishlaydi.

Stack:
- Backend: NestJS + Prisma + PostgreSQL + TypeScript
- Frontend: React + Vite + TypeScript + TanStack Query + React Router + Axios
- Mobil: keyinroq React Native WebView (hozir shart emas)

Loyiha tuzilishi: ildizda `backend/` va `frontend/` ikki papka.

To'liq spetsifikatsiya ikki faylda:
- BACKEND.md  — ma'lumotlar modeli (Prisma schema), barcha endpointlar,
  modul-bo'yicha tasklar va mini-tasklar.
- FRONTEND.md — dizayn tizimi, komponentlar, sahifalar, tasklar va mini-tasklar.

QOIDALAR:
1. Avval BACKEND.md va FRONTEND.md ni to'liq o'qib chiq.
2. Aniq belgilangan tartibda, task-task ishla. Har task ichidagi
   mini-tasklarni (checkbox) ketma-ket bajar.
3. Pul va miqdorlar uchun Prisma Decimal ishlat — float emas.
4. Sotuvda FIFO mantiqi prisma.$transaction ichida bo'lsin.
5. Har task tugagach: nima qilganingni qisqa xulosa qil, kod kompilyatsiya
   bo'lishini tekshir, keyin to'xta va mendan tasdiq so'ra.
6. Mavjud spetsifikatsiyadan chetga chiqma; noaniqlik bo'lsa — savol ber.

Hozircha hech narsa yozma. Avval ikkala faylni o'qi va menga:
(a) tushunganingni 5-6 qatorda xulosa qil,
(b) qaysi bosqichdan boshlashni taklif qil.
```

---

## 🔧 BOSQICH 1 — Backend skeleti va baza

```
BACKEND.md dagi TASK B0 va TASK B1 ni bajar:
- backend/ papkada NestJS loyihasi, kerakli bog'liqliklar
- docker-compose.yml (PostgreSQL), .env
- main.ts: ValidationPipe, CORS, Swagger
- prisma/schema.prisma — BACKEND.md §3 dagi BARCHA modellar aynan shunday
- migratsiya + prisma generate
- seed.ts — namuna ma'lumotlar (1 admin, ~6 toifa, ~12 mahsulot,
  ~3 ta'minotchi, ~6 partiya, ~10 sotuv, 3 nasiya, bir nechta xarajat)

Tugagach kompilyatsiyani tekshir va to'xta.
```

## 🔧 BOSQICH 2 — Auth va asosiy CRUD modullari

```
BACKEND.md dagi TASK B2–B6 ni bajar:
Auth (JWT, bcrypt, guard'lar), Users, Categories, Products, Suppliers.
Har endpoint DTO + class-validator validatsiyasi bilan.
auth/login dan tashqari barcha endpointlar JwtAuthGuard ostida.
Tugagach to'xta.
```

## 🔧 BOSQICH 3 — Partiya, Sotuv (FIFO), Ombor — YADRO

```
BACKEND.md dagi TASK B7, B8, B9 ni bajar. Bu eng muhim qism:
- Batches: kirim, weekLabel avtomatik, /batches/attention
- FifoService.allocate() — algoritmni B8 dagi mini-tasklar bo'yicha aniq yoz
- SalesService.create() — prisma.$transaction ichida FIFO, SaleItem +
  SaleItemBatch, totalAmount/totalCost
- /sales/preview (saqlamasdan FIFO natijasi)
- Inventory: /inventory va /inventory/valuation

FIFO ni qo'lda test qil: 2 partiyali mahsulotdan ko'p miqdor sot,
ikkala partiyadan to'g'ri ayrilganini va tannarx to'g'ri yig'ilganini tekshir.
Tugagach to'xta.
```

## 🔧 BOSQICH 4 — Nasiya, Xarajat, Hisobotlar

```
BACKEND.md dagi TASK B10, B11, B12, B13 ni bajar:
Customers/Debts (balans = nasiya − to'lovlar), Expenses,
Reports (/dashboard, /sales-timeseries, /profit-by-category, /monthly-summary).
Swagger to'liq. Asosiy oqimni qo'lda test qil. Tugagach to'xta.
```

## 🎨 BOSQICH 5 — Frontend skeleti va dizayn tizimi

```
FRONTEND.md dagi TASK F0, F1, F2, F3 ni bajar:
- Vite + React + TS loyihasi, tokens.css (§2 dagi ranglar/shriftlar aynan)
- axios JWT interceptor, format.ts
- AuthContext + ProtectedRoute + LoginPage
- Layout: Sidebar, Topbar, AppLayout + marshrutlar
- Umumiy UI: Card, KpiCard, DataTable, Tag/StatusPill, StockBar, Modal,
  BarChart, FilterTabs, Button, Spinner, EmptyState, toast

Ko'rinish yasalgan maketga mos bo'lsin. Tugagach to'xta.
```

## 🎨 BOSQICH 6 — Sahifalar (ma'lumotga ulangan)

```
FRONTEND.md dagi TASK F4–F10 ni ketma-ket bajar:
Dashboard, Mahsulotlar, Partiyalar, Sotuvlar (+ Yangi sotuv modal va FIFO
preview), Ombor, Nasiya, Hisobotlar.
Har sahifa TanStack Query hook orqali real API'dan ma'lumot olsin;
loading/empty/error holatlari bo'lsin.
Har 2-3 sahifadan keyin to'xtab ko'rsat.
```

## 🎨 BOSQICH 7 — PWA va yakuniy sayqal

```
FRONTEND.md dagi TASK F11 ni bajar: vite-plugin-pwa (manifest, "Bosh ekranga
qo'shish"), telefon ekranida responsive tekshiruv, .env.production.
Oxirida butun oqimni test qil: login → partiya qo'shish → sotuv (FIFO) →
dashboard yangilanishi. Topilgan kamchiliklarni ro'yxat qilib ber.
```

---

## ✅ Maslahatlar
- Har bosqichdan keyin `git commit` qil (Claude Code'dan so'ra).
- Backend tayyor bo'lmay turib frontendni real ma'lumotga ulamang —
  shuning uchun avval 1–4 (backend), keyin 5–7 (frontend) bosqichlari.
- Biror narsa noaniq bo'lsa, Claude Code'ga "BACKEND.md / FRONTEND.md dagi
  tegishli taskni qaytadan o'qib, spetsifikatsiyaga amal qil" deb eslat.
