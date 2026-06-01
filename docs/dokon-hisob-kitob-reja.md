# Do'kon Hisob-Kitob Tizimi — Loyiha Rejasi

> Maqsad: amakining do'konidagi qog'oz hisob-kitobni avtomatlashtirish. Har haftalik tovar (partiya) bo'yicha aniq ombor va foyda hisobi, 50+ xil mahsulot, yengil nasiya kuzatuvi.

---

## 1. Texnik stack

| Qatlam | Texnologiya | Izoh |
|---|---|---|
| Backend | **NestJS + TypeScript** | Modulli, tartibli struktura |
| ORM | **Prisma** | Postgres bilan eng qulay, type-safe, oson migratsiya |
| DB | **PostgreSQL** | Asosiy ma'lumotlar bazasi |
| Frontend | **React (Vite) + TypeScript** | Responsive, telefonda ham qulay |
| Mobil | **PWA** (boshida) → keyin React Native WebView (kerak bo'lsa) | "Bosh ekranga qo'shish" bilan boshlanadi |

**Tavsiya:** boshida faqat web (PWA) qilamiz. RN WebView qobiqni faqat app-store yoki native barcode-skaner kerak bo'lganda qo'shamiz.

**Pul birligi:** so'mlarni `numeric(14,2)` ko'rinishida saqlaymiz (float ishlatmaymiz — aniqlik yo'qoladi).

---

## 2. Asosiy g'oya: Partiya (Batch) + FIFO

Har bir kelgan yuk = bitta **partiya**. Partiyada: mahsulot, kirim narxi, miqdori, kelgan sanasi, qolgan miqdori yoziladi.

Sotuvda **FIFO** (First In, First Out) ishlaydi:
- Mahsulotdan N miqdor sotilganda, tizim eng eski partiyadan boshlab ayiradi.
- Bitta sotuv bir nechta partiyadan olishi mumkin — har biri alohida yoziladi.
- Shu sabab har sotuvning aniq tannarxi (COGS) chiqadi → **foyda = sotuv summasi − tannarx**.

Bu bizga bir vaqtning o'zida beradi:
- **Qancha qoldi** (har partiya, har mahsulot bo'yicha)
- **Qaysi yukdan qancha foyda** chiqqani
- **Qaysi eski partiya sekin sotilayotgani** (asosiy muammoning yechimi)

---

## 3. Ma'lumotlar modeli (jadvallar)

**users** — tizim foydalanuvchilari
- id, name, phone, password_hash, role (`admin` | `sotuvchi`), created_at

**categories** — mahsulot turlari
- id, name (un, choy, makaron, paxta yog'i, ...)

**products** — mahsulotlar
- id, name, category_id → categories
- barcode (nullable — keyin to'ldirilsa bo'ladi)
- base_unit (`kg` | `dona` | `litr`) — sotuv birligi
- pack_size (nullable) — 1 qop/quti necha base_unit (masalan 1 qop = 50 kg)
- default_sale_price (nullable)
- is_active (boolean)

**suppliers** — ta'minotchilar (ishlab chiqaruvchilar)
- id, name, phone, notes

**batches** *(partiyalar — yadro jadvali)*
- id, product_id → products, supplier_id → suppliers
- received_date, week_label (masalan "2026-W22")
- quantity_received (base_unit'da)
- quantity_remaining (base_unit'da)
- cost_price_per_unit (kirim narxi)
- sale_price_per_unit (nullable — shu partiya uchun narx)
- notes

**sales** — sotuvlar
- id, sale_date, user_id → users (sotuvchi)
- customer_id (nullable) → customers
- payment_type (`naqd` | `karta` | `nasiya`)
- total_amount (sotuv summasi)
- total_cost (FIFO orqali hisoblangan tannarx)
- notes

**sale_items** — sotuvdagi qatorlar
- id, sale_id → sales, product_id → products
- quantity, unit_price, line_total

**sale_item_batches** *(FIFO taqsimoti)*
- id, sale_item_id → sale_items, batch_id → batches
- quantity (shu partiyadan olingan miqdor)
- cost_price (shu partiyaning kirim narxi)

**customers** — mijozlar (nasiya uchun)
- id, name, phone, notes

**debt_payments** — qarz to'lovlari
- id, customer_id → customers, amount, payment_date, notes
- > Mijoz qarzi = (uning `nasiya` sotuvlari summasi) − (uning to'lovlari summasi)

**expenses** — xarajatlar (ixtiyoriy, sof foyda uchun)
- id, expense_date, category (ijara, transport, ...), amount, notes

---

## 4. FIFO mantiqi (backend logikasi)

Mahsulot X dan Q miqdor sotilganda:
1. X ning `quantity_remaining > 0` bo'lgan partiyalarini `received_date` bo'yicha eskidan yangiga saralash.
2. Q miqdorni shu partiyalar bo'ylab ketma-ket ayirish.
3. Har bir bo'lakni `sale_item_batches` ga yozish (partiya + miqdor + kirim narxi).
4. Tegishli `batches.quantity_remaining` ni kamaytirish.
5. `sale.total_cost` = barcha taqsimotlarning tannarxlari yig'indisi.
6. Foyda = `total_amount − total_cost`.

> Bu tranzaksiya ichida (DB transaction) bajarilishi kerak — yarmida uzilib qolmasligi uchun.

---

## 5. Amaki ko'radigan hisobotlar

- **Ombor holati** — qaysi mahsulotdan, qaysi partiyadan qancha qoldi
- **Kunlik / haftalik / oylik savdo va foyda**
- **Partiya bo'yicha foyda** — qaysi yuk yaxshi/yomon sotildi
- **Sekin sotilayotgan / eski partiyalar** — sotilmay turgan tovar (asosiy muammo)
- **Eng ko'p / kam sotilgan mahsulotlar**
- **Nasiya ro'yxati** — kim qancha qarzdor

---

## 6. Bosqichma-bosqich yo'l xaritasi

**0. Tayyorgarlik**
Repo (frontend + backend), NestJS + Prisma sozlash, Postgres (local Docker), React (Vite) skeleti, auth (login) asosi.

**1. Asoslar**
Categories, Products, Suppliers CRUD. Login. Oddiy UI va navigatsiya.

**2. Partiya va ombor**
Tovar kirimi (partiya qo'shish, qop→kg konvertatsiya), ombor ko'rinishi, qolgan miqdor.

**3. Sotuv + FIFO**
Sotuv ekrani, FIFO ayirish, tannarx va foyda hisobi, to'lov turlari.

**4. Hisobotlar / Dashboard**
Kunlik/haftalik/oylik savdo, foyda, eski partiyalar hisoboti.

**5. Nasiya**
Mijozlar, qarz balansi, qarz to'lovlari.

**6. Xarajatlar + sayqal**
Xarajatlar, sof foyda, PWA (bosh ekranga qo'shish), interfeys sayqali.

**7. (Ixtiyoriy) RN WebView qobiq / barcode**
App-store uchun mobil qobiq, kamera-skaner (`react-native-vision-camera`).

---

## 7. Aniqlashtirilishi kerak bo'lgan farazlar

- Un **qopda keladi (masalan 50 kg) lekin kg-lab sotiladi** deb hisobladim → `pack_size` shu uchun. To'g'rimi?
- Bitta do'kon, asosan amaki o'zi ishlatadi (balki 1-2 sotuvchi) deb oldim.
- Do'konda internet bor deb oldim (offline rejim hozircha shart emas).

> Bu farazlardan birortasi noto'g'ri bo'lsa, ayt — modelni moslaymiz.
