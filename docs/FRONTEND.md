# FRONTEND — End-to-End Documentation

Do'kon hisob-kitob tizimi · Frontend qismi
Stack: **React 18 + Vite + TypeScript + TanStack Query + React Router + Axios**
Mobil: **PWA** (boshida) → keyin React Native WebView qobiq

---

## 0. Maket tahlili (har bo'lim)

Yasalgan admin maketdagi har bo'lim → frontend sahifa va u iste'mol qiladigan API:

| Sahifa | Tarkibi | API hook |
|---|---|---|
| **Boshqaruv paneli** | 4 KPI karta, haftalik savdo grafigi, "Diqqat talab" ro'yxati, so'nggi sotuvlar | `useDashboard`, `useSalesTimeseries`, `useBatchAttention`, `useSales({limit:5})` |
| **Sotuvlar** | filtr (Naqd/Karta/Nasiya), jadval (summa, tannarx, foyda) | `useSales(filters)` |
| **Partiyalar** | filtr (joriy hafta / hammasi / tugagan), progress-bar, holat tegi | `useBatches(filters)` |
| **Ombor** | mahsulot bo'yicha qoldiq, FIFO izohi | `useInventory` |
| **Mahsulotlar** | toifa filtri, narx, holat | `useProducts(filters)` |
| **Nasiya** | qarzdorlar, "To'lov qabul qilish" | `useDebts`, `usePayDebt` |
| **Hisobotlar** | toifa foydasi, oylik xulosa | `useProfitByCategory`, `useMonthlySummary` |
| **Yangi sotuv (modal)** | mahsulot, miqdor, narx, to'lov; **FIFO preview** | `useSalePreview`, `useCreateSale` |

---

## 1. Loyiha strukturasi

```
frontend/
├─ src/
│  ├─ main.tsx                  # QueryClient, Router, AuthProvider
│  ├─ App.tsx                   # route'lar
│  ├─ styles/
│  │  └─ tokens.css             # dizayn o'zgaruvchilari (maketdan)
│  ├─ lib/
│  │  ├─ axios.ts               # JWT interceptor
│  │  └─ format.ts              # so'm/sana formatlash
│  ├─ auth/
│  │  ├─ AuthContext.tsx
│  │  └─ ProtectedRoute.tsx
│  ├─ api/                      # TanStack Query hook'lar (resource'lar bo'yicha)
│  │  ├─ products.ts  batches.ts  sales.ts  inventory.ts
│  │  ├─ debts.ts  customers.ts  reports.ts  auth.ts
│  ├─ components/               # qayta ishlatiluvchi UI
│  │  ├─ Layout/ (Sidebar, Topbar, AppLayout)
│  │  ├─ ui/ (Card, KpiCard, DataTable, Tag, StatusPill, StockBar,
│  │  │       Modal, BarChart, EmptyState, Spinner, FilterTabs, Button)
│  ├─ pages/
│  │  ├─ LoginPage.tsx
│  │  ├─ DashboardPage.tsx  SalesPage.tsx  BatchesPage.tsx
│  │  ├─ InventoryPage.tsx  ProductsPage.tsx  DebtsPage.tsx  ReportsPage.tsx
│  ├─ types/                    # backend bilan mos TS tiplar
│  └─ hooks/
└─ vite.config.ts               # vite-plugin-pwa
```

---

## 2. Dizayn tizimi (maketdan — `tokens.css`)

Ranglar ("raqamli daftar" — issiq, ishonchli):

```css
:root{
  --paper:#f3ede0;  --paper-2:#fbf8f1;  --card:#fefcf8;
  --ink:#2b2620;    --ink-soft:#7a7164; --ink-faint:#a89e8e;
  --line:#e4dccb;   --line-strong:#d6ccb6;
  --green:#3a5a40;  --green-2:#4f7a52;  --green-soft:#e7eee2;
  --amber:#c47a26;  --amber-soft:#f6e9d3;
  --brick:#a4493d;  --brick-soft:#f1ddd6;
  --radius:14px;
  --shadow:0 1px 2px rgba(43,38,32,.04),0 8px 24px rgba(43,38,32,.06);
}
```

Shriftlar (Google Fonts): **Fraunces** (sarlavhalar), **IBM Plex Sans** (matn/UI), **IBM Plex Mono** (raqamlar — `tabular-nums`).

Holat teglari: yashil = Faol/Sotilyapti/Naqd · amber = Sekin/Karta/Kam · brick = Eski/Nasiya/Qarz · gray = Tugagan.

---

## 3. Texnik qarorlar

- **Server-state:** TanStack Query (kesh, refetch, loading/error holatlari).
- **HTTP:** Axios; interceptor JWT token qo'shadi, 401 da loginga yo'naltiradi.
- **Marshrut:** React Router v6, `ProtectedRoute` bilan himoyalangan.
- **Formalar:** `react-hook-form` (modal va CRUD oynalari).
- **Pul:** `format.ts` — `1 250 000 so'm` ko'rinishi (bo'sh joy ajratuvchi).
- **Bildirishnoma:** kichik toast (sotuv saqlandi, xato va h.k.).
- **Har sahifa uchta holatni qo'llab-quvvatlaydi:** loading (skeleton), empty, error.

---

## 4. TASKLAR (sahifalar bo'yicha)

### TASK F0 — Loyiha skeleti
- [ ] `npm create vite@latest frontend -- --template react-ts`
- [ ] Bog'liqliklar: `@tanstack/react-query react-router-dom axios react-hook-form vite-plugin-pwa`
- [ ] `tokens.css` (yuqoridagi) va Google Fonts import
- [ ] `lib/axios.ts` — `baseURL` (.env `VITE_API_URL`), JWT interceptor, 401 handler
- [ ] `lib/format.ts` — `money()`, `date()`, `qty()`
- [ ] `main.tsx` — `QueryClientProvider`, `BrowserRouter`, `AuthProvider`

### TASK F1 — Auth
- [ ] `AuthContext` — token (localStorage), `login()`, `logout()`, `user`
- [ ] `api/auth.ts` — `useLogin`, `useMe`
- [ ] `ProtectedRoute` — token yo'q bo'lsa `/login`
- [ ] `LoginPage` — telefon + parol formasi (maket uslubida)

### TASK F2 — Layout shell
- [ ] `Sidebar` — maketdagi menyu (Boshqaruv, Sotuvlar, Partiyalar, Ombor, Mahsulotlar, Nasiya, Hisobotlar), faol holat, user-chip
- [ ] `Topbar` — sahifa sarlavhasi/izoh, qidiruv, "Yangi sotuv" tugmasi (global modal ochadi)
- [ ] `AppLayout` — sidebar + topbar + `<Outlet/>`
- [ ] Marshrutlarni `App.tsx` da ulash

### TASK F3 — Umumiy UI komponentlar (maketga aniq mos)
- [ ] `Card` + `CardHead`
- [ ] `KpiCard` (ikona, label, qiymat, delta)
- [ ] `DataTable` (ustun konfiguratsiyasi, hover, loading skeleton, empty holat)
- [ ] `Tag` / `StatusPill` (yashil/amber/brick/gray variantlari)
- [ ] `StockBar` (foiz + low/crit ranglar)
- [ ] `Modal` (overlay, yopish, footer tugmalar)
- [ ] `BarChart` (CSS bar, animatsion balandlik — maketdagi grafik)
- [ ] `FilterTabs` (filtr tugmalari)
- [ ] `Button` (primary/ghost), `Spinner`, `EmptyState`, toast

### TASK F4 — Boshqaruv paneli (Dashboard)
- [ ] `api/reports.ts`: `useDashboard`, `useSalesTimeseries`
- [ ] `api/batches.ts`: `useBatchAttention`
- [ ] KPI grid — `useDashboard` dan 4 karta
- [ ] Haftalik savdo `BarChart` — `useSalesTimeseries`
- [ ] "Diqqat talab" ro'yxati — `useBatchAttention` (eski + kam qolgan)
- [ ] "So'nggi sotuvlar" jadvali — `useSales({limit:5})`, "Barchasini ko'rish" → /sales

### TASK F5 — Mahsulotlar
- [ ] `api/products.ts`: `useProducts`, `useCreateProduct`, `useUpdateProduct`, `useDeleteProduct`, `useCategories`
- [ ] Toifa filtri (`FilterTabs`)
- [ ] Mahsulotlar jadvali (shtrix-kod ustuni — bo'sh bo'lsa "qo'shilmagan")
- [ ] "Yangi mahsulot" modal (react-hook-form: name, toifa, birlik, packSize?, narx, barcode?)
- [ ] Tahrirlash / o'chirish (soft delete)

### TASK F6 — Partiyalar (kirim)
- [ ] `api/batches.ts`: `useBatches`, `useCreateBatch`, `useSuppliers`
- [ ] Filtr: joriy hafta / barchasi / tugaganlar
- [ ] Jadval: partiya №, mahsulot, ta'minotchi, hafta, kirim narxi, `StockBar` (qolgan/kelgan), holat tegi
- [ ] "Yangi partiya" modal (mahsulot, ta'minotchi, sana, miqdor, kirim narxi, sotuv narxi)
- [ ] Holat tegini qoldiq+yoshdan hisoblash (Sotilyapti/Sekin/Eski/Tugagan)

### TASK F7 — Sotuvlar + Yangi sotuv modal (yadro)
- [ ] `api/sales.ts`: `useSales`, `useCreateSale`, `useSalePreview`
- [ ] Sotuvlar jadvali: vaqt, mahsulotlar, mijoz, to'lov tegi, summa, tannarx, foyda
- [ ] Filtr: Naqd/Karta/Nasiya, sana oralig'i
- [ ] **Yangi sotuv modal** (global, Topbar dan ham ochiladi):
  - [ ] Mahsulot tanlash (omborda mavjud miqdor ko'rinadi)
  - [ ] Miqdor + narx kiritish (bir nechta qator qo'shish imkoni)
  - [ ] To'lov turi; Nasiya tanlansa — mijoz tanlash majburiy
  - [ ] **FIFO preview** — `useSalePreview` chaqirib, qaysi partiyadan necha ketishi, tannarx va foydani jonli ko'rsatish (maketdagi yashil blok)
  - [ ] "Saqlash" → `useCreateSale`, keshni yangilash, toast

### TASK F8 — Ombor
- [ ] `api/inventory.ts`: `useInventory`
- [ ] Jadval: mahsulot, toifa, birlik, faol partiyalar, umumiy qoldiq, o'rtacha tannarx, sotuv narxi
- [ ] Yuqorida FIFO izohi

### TASK F9 — Nasiya
- [ ] `api/debts.ts`: `useDebts`, `usePayDebt`; `api/customers.ts`
- [ ] Qarzdorlar jadvali: mijoz, telefon, so'nggi nasiya, to'langan, qarz qoldig'i
- [ ] "To'lov qabul qilish" modal (mijoz, summa)
- [ ] "Tarix" — mijoz nasiya/to'lov tarixi

### TASK F10 — Hisobotlar
- [ ] `api/reports.ts`: `useProfitByCategory`, `useMonthlySummary`
- [ ] Toifa bo'yicha foyda (gorizontal bar)
- [ ] Oylik xulosa kartasi (savdo → tannarx → yalpi → xarajat → sof foyda)

### TASK F11 — PWA va yakuniy
- [ ] `vite-plugin-pwa` — manifest, ikona, "Bosh ekranga qo'shish"
- [ ] Telefon ekranida responsive tekshiruv (maket allaqachon moslashuvchan)
- [ ] Barcha sahifalarda loading/empty/error holatlari
- [ ] `.env.production` — API manzili

---

## 5. Definition of Done (frontend)
- Login → token saqlanadi → himoyalangan sahifalar ochiladi.
- Har sahifa real API'dan ma'lumot oladi (kesh + loading holati bilan).
- "Yangi sotuv" modal FIFO preview ko'rsatadi va sotuvni saqlaydi; dashboard yangilanadi.
- Telefonda "Bosh ekranga qo'shish" ishlaydi (PWA).
- Ko'rinish yasalgan maketga mos (ranglar, shriftlar, komponentlar).
