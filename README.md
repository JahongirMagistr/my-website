# Agricrowd.uz

Sabzavot yetishtiruvchi fermer va dehqon xo'jaliklarini investorlar mablag'i orqali moliyalashtirish (kraudfanding) platformasi.

**Fermer/dehqon** → loyiha va mahsulot · **Investor** → moliyaviy resurs · **Agricrowd.uz** → bog'lash, tekshirish, moliyalashtirishni tashkil etish va monitoring.

Tillar: **O'zbekcha (lotin)**, **Ўзбекча (кирилл)** — lotinchadan avtomatik o'giriladi, **Русский**, **English**.

## Imkoniyatlar

| Bo'lim | Nima bor |
|---|---|
| Bosh sahifa | Maket bo'yicha: yashil yuqori panel, qidiruv, «Biz bilan bog'lanish», surat fonidagi «Agricrowd» bloki; statistika, loyihalar, qanday ishlaydi, kafolatlar, yangiliklar |
| Loyihalar | Kartalar (nomi, mahsulot, hudud, kerakli/yig'ilgan mablag', %, muddat, hosil, qaytarish shartlari), qidiruv va filtrlar |
| Loyiha sahifasi | Loyiha haqida · Moliyaviy qism · Kafolat va risklar · Foto/video monitoring · «Investitsiya kiritish» |
| Yangiliklar, Biz haqimizda, Aloqa | Admin boshqaradigan yangiliklar; ko'p tilli «Biz haqimizda»; aloqa formasi → admin paneldagi «Xabarlar» |
| Investor kabineti | Mablag', investitsiyalar, kutilayotgan/olingan daromad, **shartnomalar**, monitoring, **hamyon** (to'ldirish, yechish, operatsiyalar), profil |
| Fermer kabineti | Loyiha joylashtirish va tahrirlash, tekshiruv holati, **shartnomalar**, monitoring qo'shish, hamyon, xo'jalik va bank rekvizitlari |
| Bildirishnomalar | Qo'ng'iroqcha (🔔) va sahifa; ixtiyoriy ravishda email (Resend) |
| Admin panel | Tahlil, loyiha tekshiruvi, loyihalar, **shartnomalar**, **to'lovlar va yechish so'rovlari**, foydalanuvchilar, investitsiyalar, monitoring, yangiliklar, xabarlar, ommaviy xabar yuborish, moliya, sozlamalar, jurnal, CSV (Excel) eksport |

### Asosiy qoidalar (kodda amalga oshirilgan va testlangan)

1. Fermer yuborgan loyiha **administrator tasdiqlamaguncha** investorlarga ko'rinmaydi.
2. Loyiha **100%** yig'ilsa — «moliyalashtirildi» holatiga o'tadi va **har bir investor bilan shartnoma** avtomatik yaratiladi; investor, fermer va adminga bildirishnoma yuboriladi.
3. Investor va fermer shartnoma shablonini (PDF) yuklab oladi, imzolaydi (fermer muhr bosadi) va **imzolangan nusxani saytga yuklaydi**.
4. Administrator ikkala nusxani tekshirib tasdiqlaydi (yoki sababini yozib, bir tomonni qayta yuklashga qaytaradi).
5. Loyihaning **barcha shartnomalari tasdiqlangach**, mablag' fermer hisobiga avtomatik ajratiladi (admin zarurat bo'lsa qo'lda ham ajrata oladi).
6. Muddat tugab, 100% yig'ilmasa — investorlar mablag'i avtomatik qaytariladi.
7. Yakunda: *Hosil → Sotish → Daromad → Taqsimlash*. Investorlar ulushi kiritgan summasiga mos taqsimlanadi, platforma komissiyasi (standart 5%) investorlar ulushidan olinadi.

## To'lovlar

| Usul | Holat | Nima kerak |
|---|---|---|
| **Payme** | Kod tayyor (Merchant API) | Payme bilan merchant shartnomasi → `PAYME_MERCHANT_ID`, `PAYME_KEY`. Kabinetda endpoint: `https://<sayt>/api/payme`, hisob maydoni: `order_id` |
| **Click** | Kod tayyor (SHOP API) | Click bilan shartnoma → `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY`. Prepare va Complete URL: `https://<sayt>/api/click` |
| **Uzum Bank** | «Tez orada» | Uzum merchant hujjatlari olingach ulanadi |
| **Bank o'tkazmasi** | Ishlaydi | Admin → Sozlamalar → rekvizitlar. Investor pul o'tkazib, chek yuklaydi, admin tasdiqlaydi |
| Test to'lov | Faqat sinov uchun | Admin → Sozlamalar → «Test to'lov rejimi». **Real ishga tushirishda o'chiring** |

Uzcard / Humo kartalari Payme va Click orqali qabul qilinadi. Mablag' yechish — so'rov asosida: foydalanuvchi profilida karta/hisob raqamini kiritadi, admin pulni o'tkazib «O'tkazildi» deb belgilaydi.

## Texnik tuzilma

Build bosqichi yo'q — oddiy HTML/CSS/JS (ES modules).

```
public/                       # sayt (Netlify publish papkasi)
  js/core.js                  # biznes mantiq (server va brauzerda bir xil)
  js/i18n.js, i18n-ru.js, i18n-en.js   # tillar
  js/app.js, cabinet.js, admin.js, forms.js, ui.js, store.js, state.js
netlify/functions/api.mjs     # /api — asosiy API
netlify/functions/payme.mjs   # /api/payme — Payme callback
netlify/functions/click.mjs   # /api/click — Click callback
server/handler.mjs            # autentifikatsiya, tranzaksiyalar, so'rovlar
server/supabase.mjs           # Supabase: PostgreSQL + Storage
server/payments.mjs           # Payme va Click protokollari
server/mailer.mjs             # email bildirishnomalar (ixtiyoriy)
supabase/schema.sql           # jadvallar, funksiyalar, storage bucketlar
tests/                        # biznes qoidalar, to'lovlar, PostgreSQL testlari
```

Ma'lumotlar Supabase'da oddiy jadvallarda saqlanadi (`users`, `projects`, `investments`, `contracts`, `payments`, `withdrawals`, `notifications`, `monitoring_updates`, `transactions`, `activity_logs`, `news`, `messages`) — ularni Supabase → **Table Editor**da ko'rish, filtrlash va SQL bilan tahlil qilish mumkin. Brauzer bazaga to'g'ridan-to'g'ri ulanmaydi: barcha so'rovlar Netlify Function orqali, `service_role` kaliti bilan o'tadi (RLS yoqilgan, ochiq siyosat yo'q). Fayllar: rasmlar — ochiq `media` bucket, shartnoma va cheklar — yopiq `documents` bucket (faqat tomonlar va admin ko'ra oladi, havola 10 daqiqa amal qiladi).

Supabase ulanmagan bo'lsa, Netlify'da Netlify Blobs ishlatiladi; server umuman bo'lmasa — brauzerdagi demo rejim.

## Ishga tushirish

### 1. Supabase
1. [supabase.com](https://supabase.com) → **New project** (region: yaqinroq, masalan Frankfurt).
2. **SQL Editor** → `supabase/schema.sql` faylining to'liq matnini joylab **Run** bosing (jadvallar, funksiyalar va `media`/`documents` bucketlari yaratiladi).
3. **Project Settings → API**: `Project URL` va `service_role` kalitini nusxalang (service_role kalitni hech kimga bermang va brauzer kodiga qo'ymang).

### 2. Netlify
1. **Add new site → Import an existing project** → GitHub → shu repozitoriy.
2. **Site configuration → Environment variables** (birinchi deploydan **oldin**):

   | O'zgaruvchi | Qiymat |
   |---|---|
   | `SUPABASE_URL` | Supabase Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role kaliti |
   | `ADMIN_EMAIL` | administrator emaili |
   | `ADMIN_PASSWORD` | kuchli parol (standart `Admin123!` — **albatta o'zgartiring**) |
   | `AUTH_SECRET` | uzun tasodifiy satr (`openssl rand -hex 32`) |
   | `SEED_DEMO` | `false` — demo loyiha va hisoblarsiz boshlash |
   | `PAYME_MERCHANT_ID`, `PAYME_KEY` | Payme ulanganda (`PAYME_TEST=true` — test kassa) |
   | `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY` | Click ulanganda |
   | `RESEND_API_KEY`, `MAIL_FROM` | ixtiyoriy: email bildirishnomalar ([resend.com](https://resend.com)) |

3. **Deploy** → **Domain management** orqali `agricrowd.uz`ni ulang.
4. Admin sifatida kiring → **Sozlamalar**: bosh sahifa rasmini yuklang, **shartnoma shablonini (PDF)** yuklang, bank rekvizitlarini kiriting.

### Lokal
```bash
npm install
npm run dev                      # http://localhost:8888 (ma'lumotlar .data/ da)
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run dev   # haqiqiy Supabase bilan
npm test                         # TEST_DATABASE_URL=postgres://... — PostgreSQL testi ham
npm run i18n:check               # tarjimasi yo'q matnlarni ko'rsatadi
```

Yangi matn qo'shganda: kodda `t("O'zbekcha matn")` yozing va `public/js/i18n-ru.js`, `i18n-en.js`ga tarjimasini qo'shing (kirill avtomatik).

## Keyingi qadamlar (tavsiya)

- **E-IMZO** (elektron raqamli imzo) — shartnomani qog'ozsiz imzolash; hozirgi skan yuklash usuli bilan birga ishlashi mumkin.
- Parolni email orqali tiklash — email xizmati (Resend yoki SMTP) ulangach.
- Uzum Bank merchant integratsiyasi.
