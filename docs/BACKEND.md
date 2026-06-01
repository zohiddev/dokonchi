# BACKEND — End-to-End Documentation

Do'kon hisob-kitob tizimi · Backend qismi
Stack: **NestJS + Prisma + PostgreSQL + TypeScript**

---

## 0. Umumiy g'oya va dashboard tahlili

Bu backend yuqorida ko'rilgan admin maketdagi har bir bo'limni ma'lumot bilan ta'minlaydi. Quyida har bir UI bo'lagi qaysi endpointdan oziqlanishi ko'rsatilgan — bu butun API yuzasini belgilaydi:

| Dashboard bo'lagi | Ma'lumot manbai (endpoint) |
|---|---|
| KPI "Bugungi savdo" | `GET /reports/dashboard` |
| KPI "Bu hafta foyda" | `GET /reports/dashboard` |
| KPI "Jami nasiya" | `GET /reports/dashboard` (+ `GET /debts/summary`) |
| KPI "Ombor qiymati" | `GET /reports/dashboard` (+ `GET /inventory/valuation`) |
| "Haftalik savdo" grafigi | `GET /reports/sales-timeseries?period=week` |
| "Diqqat talab" (eski partiyalar) | `GET /batches/attention` |
| "So'nggi sotuvlar" jadvali | `GET /sales?limit=5` |
| Sotuvlar sahifasi | `GET /sales` (filter: payment, sana) |
| Partiyalar sahifasi | `GET /batches` (filter: hafta, holat) |
| Ombor sahifasi | `GET /inventory` |
| Mahsulotlar sahifasi | `GET /products` |
| Nasiya sahifasi | `GET /debts` / `GET /customers` |
| Hisobotlar (toifa foydasi) | `GET /reports/profit-by-category` |
| Hisobotlar (oylik xulosa) | `GET /reports/monthly-summary` |

**Asosiy mantiq — FIFO:** har sotuv eng eski partiyadan ayiriladi. Shu sabab har sotuvning aniq tannarxi (COGS) va foydasi chiqadi, hamda har partiyadan qancha qolgani aniq bo'ladi.

---

## 1. Loyiha strukturasi

```
backend/
├─ src/
│  ├─ main.ts                 # bootstrap, ValidationPipe, CORS, Swagger
│  ├─ app.module.ts
│  ├─ prisma/
│  │  ├─ prisma.module.ts
│  │  └─ prisma.service.ts
│  ├─ common/
│  │  ├─ guards/jwt-auth.guard.ts
│  │  ├─ guards/roles.guard.ts
│  │  ├─ decorators/roles.decorator.ts
│  │  ├─ decorators/current-user.decorator.ts
│  │  └─ filters/http-exception.filter.ts
│  ├─ auth/                   # login, JWT
│  ├─ users/
│  ├─ categories/
│  ├─ products/
│  ├─ suppliers/
│  ├─ batches/               # kirim (partiyalar) — yadro
│  ├─ sales/                 # sotuv + FIFO service — yadro
│  ├─ inventory/             # hosilaviy (derived) qoldiq
│  ├─ customers/
│  ├─ debts/                 # nasiya to'lovlari
│  ├─ expenses/
│  └─ reports/               # dashboard, statistika
└─ prisma/
   ├─ schema.prisma
   └─ seed.ts                # namuna ma'lumotlar
```

Har modul standart NestJS shaklida: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`.

---

## 2. Texnik qarorlar

- **ORM:** Prisma (migratsiya + type-safe client).
- **Auth:** JWT access token, parol `bcrypt` bilan hashlanadi.
- **Validatsiya:** `class-validator` + global `ValidationPipe({ whitelist:true, transform:true })`.
- **Pul/miqdor:** Prisma `Decimal` (`@db.Decimal`). Float **ishlatilmaydi** (yaxlitlash xatosi).
- **Tranzaksiya:** FIFO va sotuv yozish `prisma.$transaction` ichida (yarmida uzilmasligi uchun).
- **Hujjat:** Swagger `/api/docs`.
- **Sana:** `receivedDate`/`saleDate` — `DateTime`; `weekLabel` — ISO hafta (`2026-W22`).

---

## 3. Ma'lumotlar bazasi (`prisma/schema.prisma`)

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role        { ADMIN  SOTUVCHI }
enum Unit        { KG  DONA  LITR  QOP  QUTI }
enum PaymentType { NAQD  KARTA  NASIYA }

model User {
  id           Int      @id @default(autoincrement())
  name         String
  phone        String   @unique
  passwordHash String
  role         Role     @default(SOTUVCHI)
  sales        Sale[]
  createdAt    DateTime @default(now())
}

model Category {
  id       Int       @id @default(autoincrement())
  name     String    @unique
  products Product[]
}

model Product {
  id               Int       @id @default(autoincrement())
  name             String
  categoryId       Int
  category         Category  @relation(fields: [categoryId], references: [id])
  barcode          String?   @unique          // ixtiyoriy — keyin to'ldiriladi
  baseUnit         Unit                         // sotuv birligi
  packSize         Decimal?  @db.Decimal(12,3)  // 1 qop = packSize kg (ixtiyoriy)
  defaultSalePrice Decimal?  @db.Decimal(14,2)
  isActive         Boolean   @default(true)
  batches          Batch[]
  saleItems        SaleItem[]
  createdAt        DateTime  @default(now())
}

model Supplier {
  id      Int      @id @default(autoincrement())
  name    String
  phone   String?
  notes   String?
  batches Batch[]
}

model Batch {                                   // PARTIYA — yadro
  id                Int             @id @default(autoincrement())
  productId         Int
  product           Product         @relation(fields: [productId], references: [id])
  supplierId        Int?
  supplier          Supplier?       @relation(fields: [supplierId], references: [id])
  receivedDate      DateTime
  weekLabel         String                       // "2026-W22"
  quantityReceived  Decimal         @db.Decimal(14,3)
  quantityRemaining Decimal         @db.Decimal(14,3)
  costPricePerUnit  Decimal         @db.Decimal(14,2)
  salePricePerUnit  Decimal?        @db.Decimal(14,2)
  notes             String?
  allocations       SaleItemBatch[]
  createdAt         DateTime        @default(now())
  @@index([productId, receivedDate])
}

model Customer {
  id       Int           @id @default(autoincrement())
  name     String
  phone    String?
  notes    String?
  sales    Sale[]
  payments DebtPayment[]
}

model Sale {
  id          Int         @id @default(autoincrement())
  saleDate    DateTime    @default(now())
  userId      Int
  user        User        @relation(fields: [userId], references: [id])
  customerId  Int?
  customer    Customer?   @relation(fields: [customerId], references: [id])
  paymentType PaymentType
  totalAmount Decimal     @db.Decimal(14,2)
  totalCost   Decimal     @db.Decimal(14,2)      // FIFO tannarx
  notes       String?
  items       SaleItem[]
  @@index([saleDate])
}

model SaleItem {
  id        Int             @id @default(autoincrement())
  saleId    Int
  sale      Sale            @relation(fields: [saleId], references: [id], onDelete: Cascade)
  productId Int
  product   Product         @relation(fields: [productId], references: [id])
  quantity  Decimal         @db.Decimal(14,3)
  unitPrice Decimal         @db.Decimal(14,2)
  lineTotal Decimal         @db.Decimal(14,2)
  batches   SaleItemBatch[]
}

model SaleItemBatch {                            // FIFO taqsimoti
  id         Int      @id @default(autoincrement())
  saleItemId Int
  saleItem   SaleItem @relation(fields: [saleItemId], references: [id], onDelete: Cascade)
  batchId    Int
  batch      Batch    @relation(fields: [batchId], references: [id])
  quantity   Decimal  @db.Decimal(14,3)
  costPrice  Decimal  @db.Decimal(14,2)
}

model DebtPayment {
  id          Int       @id @default(autoincrement())
  customerId  Int
  customer    Customer  @relation(fields: [customerId], references: [id])
  amount      Decimal   @db.Decimal(14,2)
  paymentDate DateTime  @default(now())
  notes       String?
}

model Expense {
  id          Int      @id @default(autoincrement())
  expenseDate DateTime @default(now())
  category    String
  amount      Decimal  @db.Decimal(14,2)
  notes       String?
}
```

> Mijoz qarzi = (uning `NASIYA` sotuvlari `totalAmount` yig'indisi) − (`DebtPayment` yig'indisi). Alohida balans ustuni saqlanmaydi — hosilaviy hisoblanadi.

---

## 4. TASKLAR (modullar bo'yicha)

Har task — bitta modul/bo'lim. Mini-tasklar checkbox ko'rinishida; Claude Code shularni ketma-ket bajaradi.

### TASK B0 — Loyiha skeleti
- [ ] `nest new backend` (npm, strict TS)
- [ ] Bog'liqliklar: `@prisma/client prisma @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer @nestjs/swagger`
- [ ] `prisma init`, `DATABASE_URL` ni `.env` ga yozish
- [ ] `docker-compose.yml` — local PostgreSQL 16
- [ ] `main.ts`: global `ValidationPipe`, CORS, Swagger `/api/docs`
- [ ] Global `HttpExceptionFilter` (bir xil xato formati)

### TASK B1 — Prisma schema va migratsiya
- [ ] `schema.prisma` ga yuqoridagi barcha modellarni yozish
- [ ] `npx prisma migrate dev --name init`
- [ ] `prisma generate`
- [ ] `PrismaService` + global `PrismaModule`
- [ ] `seed.ts`: 1 admin user, ~6 toifa, ~12 mahsulot, ~3 ta'minotchi, ~6 partiya, ~10 sotuv, 3 mijoz/qarz, bir nechta xarajat. Maketdagi raqamlarga yaqin bo'lsin.

### TASK B2 — Auth moduli
- [ ] `LoginDto` (phone, password)
- [ ] `AuthService.validateUser()` — bcrypt taqqoslash
- [ ] `AuthService.login()` — JWT imzolash (`sub`, `role`)
- [ ] `JwtStrategy` + `JwtAuthGuard`
- [ ] `RolesGuard` + `@Roles()` dekorator
- [ ] `@CurrentUser()` param dekorator
- [ ] `POST /auth/login`
- [ ] `GET /auth/me` (joriy foydalanuvchi)

### TASK B3 — Users moduli
- [ ] `CreateUserDto`, `UpdateUserDto` (parol bcrypt bilan hashlanadi)
- [ ] `GET /users` (faqat ADMIN)
- [ ] `POST /users` (ADMIN)
- [ ] `PATCH /users/:id`, `DELETE /users/:id` (ADMIN)

### TASK B4 — Categories moduli
- [ ] `CreateCategoryDto`, `UpdateCategoryDto`
- [ ] `GET /categories`
- [ ] `POST /categories`
- [ ] `PATCH /categories/:id`, `DELETE /categories/:id` (ishlatilayotgan bo'lsa, taqiq)

### TASK B5 — Products moduli
- [ ] `CreateProductDto` (name, categoryId, baseUnit, packSize?, barcode?, defaultSalePrice?)
- [ ] `UpdateProductDto`
- [ ] `GET /products` (filter: `categoryId`, `q` qidiruv, `isActive`)
- [ ] `GET /products/:id`
- [ ] `POST /products`
- [ ] `PATCH /products/:id`
- [ ] `DELETE /products/:id` → aslida `isActive=false` (soft delete)

### TASK B6 — Suppliers moduli
- [ ] `CreateSupplierDto`, `UpdateSupplierDto`
- [ ] `GET /suppliers`, `POST /suppliers`, `PATCH /suppliers/:id`, `DELETE /suppliers/:id`

### TASK B7 — Batches moduli (PARTIYA / kirim — yadro)
- [ ] `CreateBatchDto` (productId, supplierId?, receivedDate, quantityReceived, costPricePerUnit, salePricePerUnit?, notes?)
- [ ] `BatchesService.create()` — `weekLabel` ni `receivedDate` dan avtomatik hisoblash (ISO hafta), `quantityRemaining = quantityReceived`
- [ ] `GET /batches` (filter: `productId`, `weekLabel`, `status=active|finished`)
- [ ] `GET /batches/:id` (allocations bilan)
- [ ] `GET /batches/attention` — qoldig'i bor, lekin **14+ kun** eski partiyalar **VA** kam qolgan (`quantityRemaining < 15%` of received) — dashboard "Diqqat talab" uchun
- [ ] `POST /batches`
- [ ] `PATCH /batches/:id` (narx/notes tahrir; sotilgan miqdorga tegmaslik)

### TASK B8 — Sales moduli + FIFO service (yadro)
- [ ] `CreateSaleDto` (paymentType, customerId?, notes?, `items: {productId, quantity, unitPrice}[]`)
- [ ] **`FifoService.allocate()`** — quyidagi algoritm (mini-tasklar):
  - [ ] Mahsulotning ochiq partiyalarini `receivedDate ASC, id ASC` tartibda olish
  - [ ] Jami qoldiq < so'ralgan miqdor bo'lsa → `BadRequestException("Omborda yetarli emas")`
  - [ ] Miqdorni partiyalar bo'ylab ketma-ket bo'lish, har bo'lakni `{batchId, quantity, costPrice}` ga yozish
  - [ ] Har partiyaning `quantityRemaining` ni kamaytirish
  - [ ] Qatordagi tannarx = Σ(bo'lak.quantity × bo'lak.costPrice)
- [ ] `SalesService.create()` — `prisma.$transaction` ichida: har item uchun FIFO, `SaleItem` + `SaleItemBatch` yozish, `totalAmount`/`totalCost` yig'ish, `Sale` yaratish
- [ ] `POST /sales`
- [ ] `POST /sales/preview` — saqlamasdan FIFO natijasini qaytaradi (modal'dagi "FIFO avtomatik hisoblaydi" bloki uchun)
- [ ] `GET /sales` (filter: `paymentType`, `from`, `to`, `limit`)
- [ ] `GET /sales/:id` (itemlar + batch taqsimoti bilan)

### TASK B9 — Inventory moduli (hosilaviy)
- [ ] `GET /inventory` — mahsulot bo'yicha guruhlangan: faol partiyalar soni, umumiy qoldiq, o'rtacha tannarx, joriy sotuv narxi
- [ ] `GET /inventory/valuation` — Σ(qoldiq × tannarx) = ombor qiymati (KPI uchun)

### TASK B10 — Customers va Debts modullari
- [ ] `customers`: CRUD (`GET/POST/PATCH/DELETE /customers`)
- [ ] `GET /customers/:id/balance` — nasiya sotuvlari − to'lovlar
- [ ] `GET /debts` — qarzdor mijozlar ro'yxati (balans > 0)
- [ ] `GET /debts/summary` — jami qarz va qarzdorlar soni
- [ ] `POST /debts/payments` (`CreateDebtPaymentDto`: customerId, amount, notes?)

### TASK B11 — Expenses moduli
- [ ] `CreateExpenseDto`, `GET /expenses` (filter: oy), `POST /expenses`, `DELETE /expenses/:id`

### TASK B12 — Reports moduli (dashboard)
- [ ] `GET /reports/dashboard` — bugungi savdo, bu hafta foyda (totalAmount−totalCost), jami nasiya, ombor qiymati, mahsulotlar soni
- [ ] `GET /reports/sales-timeseries?period=week|month` — grafik uchun [{label, total}]
- [ ] `GET /reports/profit-by-category?period=month` — toifa bo'yicha foyda
- [ ] `GET /reports/monthly-summary?month=YYYY-MM` — savdo, tannarx, yalpi foyda, xarajat, sof foyda

### TASK B13 — Yakuniy
- [ ] Barcha endpointlarga `JwtAuthGuard` (auth/login dan tashqari)
- [ ] Swagger taglar va misollar
- [ ] `npm run seed` ishlashini tekshirish
- [ ] Asosiy oqim qo'lda test: login → partiya qo'shish → sotuv (FIFO) → dashboard

---

## 5. Definition of Done (backend)
- `docker compose up` + `prisma migrate` + `seed` → ishlaydigan DB.
- `npm run start:dev` → `/api/docs` ochiladi.
- Sotuv yaratganda FIFO ishlaydi, partiya qoldig'i kamayadi, foyda to'g'ri hisoblanadi.
- Dashboard endpointi maketdagi kabi raqamlarni qaytaradi.
