# Agricrowd.uz

Sabzavot yetishtiruvchi fermer va dehqon xo'jaliklarini investorlar mablag'i orqali moliyalashtirish (kraudfanding) platformasi.

**Fermer/dehqon** → loyiha va mahsulot · **Investor** → moliyaviy resurs · **Agricrowd.uz** → bog'lash, tekshirish, moliyalashtirishni tashkil etish va monitoring.

Tillar: O'zbekcha (lotin), Ўзбекча (кирилл — avtomatik), Русский, English.

---

# 📋 SIZ BAJARADIGAN BOSQICHLAR

Quyidagi bosqichlarni tartib bilan bajaring. Har bir bosqich oxirida **✅ Tekshirish** bor — u o'tmasa, keyingisiga o'tmang.

| № | Bosqich | Majburiymi? | Vaqt |
|---|---|---|---|
| 1 | Kodni GitHub'ga yuklash | ✅ majburiy | 10 daq |
| 2 | Supabase (ma'lumotlar bazasi) | ✅ majburiy | 15 daq |
| 3 | Netlify'ni GitHub'ga ulash va domen | ✅ majburiy | 20 daq |
| 4 | Saytni tekshirish | ✅ majburiy | 5 daq |
| 5 | Admin panelda birinchi sozlash | ✅ majburiy | 20 daq |
| 6 | Email (parolni tiklash, xabarlar) — Resend | tavsiya | 30 daq + DNS kutish |
| 7 | Telegram bot bildirishnomalari | tavsiya | 15 daq |
| 8 | Payme va Click to'lovlari | real pul uchun majburiy | shartnoma: 1–3 hafta |
| 9 | Ishga tushirishdan oldingi yakuniy tekshiruv | ✅ majburiy | 15 daq |

> ⚠️ **Muhim:** saytni Netlify'ga **zip yoki papkani sudrab tashlash (drag & drop) bilan joylamang.** Bu usulda server qismi (`/api`) ishlamaydi va sayt «Sayt vaqtincha ishlamayapti» deb ko'rsatadi. Faqat **GitHub orqali** ulang (3-bosqich).

---

## 1-bosqich. Kodni GitHub'ga yuklash

1. [github.com](https://github.com) ga kiring → `my-website` repozitoriyasini oching.
2. **Add file → Upload files** ni bosing.
3. `agricrowd-uz.zip` faylini kompyuteringizda oching (unzip). Ichidagi **hamma narsani** — `public`, `server`, `netlify`, `supabase`, `tests`, `scripts` papkalari va `package.json`, `package-lock.json`, `netlify.toml`, `dev-server.mjs`, `README.md`, `.gitignore` fayllarini — sahifaga sudrab tashlang.
4. Pastdagi **Commit changes** tugmasini bosing.

✅ **Tekshirish:** repozitoriya bosh sahifasida `netlify.toml` va `public` papkasi ko'rinadi.

> Kelajakda yangilanishlarni men o'zim yuklashim uchun: [github.com/apps/claude/installations/select_target](https://github.com/apps/claude/installations/select_target) → `my-website` ga ruxsat bering.

## 2-bosqich. Supabase (ma'lumotlar bazasi)

1. [supabase.com](https://supabase.com) → **Start your project** → GitHub yoki email bilan ro'yxatdan o'ting.
2. **Organization:** nomi `Agricrowd`, turi **Company**, tarif **Free**.
3. **New project:** nomi `agricrowd`, **Database Password** → *Generate* (parolni saqlab qo'ying), **Region: Central EU (Frankfurt)** → *Create new project* (1–2 daqiqa kuting).
4. Chap menyu → **SQL Editor → New query** → `supabase/schema.sql` faylining **to'liq matnini** joylang → **Run**.
   - Bu fayl qayta ishga tushirilsa xavfsiz: eski bazani ham yangi versiyaga moslaydi. **Har safar sayt yangilanganda uni qayta Run qiling.**
5. **Project Settings → API Keys** (yoki *Data API*) bo'limidan ikkita qiymatni ko'chirib oling:
   - **Project URL** — `https://xxxx.supabase.co`
   - **Secret key** (`sb_secret_...`) yoki *Legacy* bo'limidagi **service_role** kaliti. ⚠️ Bu kalitni hech kimga bermang.

✅ **Tekshirish:** **Table Editor** da `users`, `projects`, `contracts`, `payments` jadvallari, **Storage** da `media` va `documents` papkalari bor.

## 3-bosqich. Netlify'ni GitHub'ga ulash va domen

1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project → GitHub** → `my-website` ni tanlang.
2. Branch: fayllarni yuklagan branch (odatda `main`). Build command — **bo'sh**. Publish directory — `public`. → **Deploy**.
3. **Site configuration → Environment variables → Add a variable** — quyidagilarni kiriting:

   | O'zgaruvchi | Qiymat |
   |---|---|
   | `SUPABASE_URL` | 2-bosqichdagi Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | 2-bosqichdagi maxfiy kalit |
   | `ADMIN_EMAIL` | sizning emailingiz |
   | `ADMIN_PASSWORD` | kuchli parol (kamida 10 belgi) |
   | `AUTH_SECRET` | 40+ belgili tasodifiy matn (masalan, parol generatoridan) |
   | `SEED_DEMO` | `false` |
   | `SITE_URL` | `https://agricrowd.uz` |

4. **Deploys → Trigger deploy → Deploy site**.
5. **Domain management → Add a domain** → `agricrowd.uz`. Netlify ko'rsatgan DNS yozuvlarini domen sotib olingan joyda (registrator) kiriting yoki Netlify DNS'ga o'tkazing. Agar domen oldingi (drag & drop) saytga ulangan bo'lsa — avval o'sha eski saytdan olib tashlang, keyin eski saytni o'chiring.

✅ **Tekshirish:** Deploy holati **Published**; *Functions* bo'limida `api`, `payme`, `click`, `telegram` funksiyalari ko'rinadi.

## 4-bosqich. Saytni tekshirish

1. Brauzerda `https://agricrowd.uz/api` ni oching → **«Faqat POST so'rovlar qabul qilinadi»** yozuvi chiqishi kerak. (*Page not found* chiqsa — 3-bosqich noto'g'ri, funksiyalar ulanmagan.)
2. `https://agricrowd.uz` → sariq «Demo» yozuvi **yo'q**, «Sayt vaqtincha ishlamayapti» xabari **yo'q**.
3. Boshqa brauzer yoki telefondan ochib ko'ring — hammada bir xil ko'rinishi kerak.

## 5-bosqich. Admin panelda birinchi sozlash

1. **Kirish** → `ADMIN_EMAIL` va `ADMIN_PASSWORD` bilan kiring → avtomatik **Admin panel** ochiladi.
2. Agar bosh sahifada demo loyihalar ko'rinsa: **Sozlamalar → «Demo ma'lumotlarni o'chirish»**.
3. **Sozlamalar** bo'limida:
   - **Bosh sahifa rasmi** — asl suratingizni yuklang.
   - **Matnlar** — o'zbek, rus, ingliz tillarida (kirill avtomatik).
   - **Shartnoma shabloni (PDF)** — albatta yuklang, busiz investor va fermer shartnoma yuklab ololmaydi.
   - **Bank o'tkazmasi rekvizitlari** — kompaniya hisob raqami.
   - **Test to'lov rejimi** — ❌ o'chiq bo'lsin.
   - **Kirish sahifasida demo tugmalar** — ❌ o'chiq.
   - **Bosh sahifada statistika** — boshida o'chirib qo'yishingiz mumkin, loyihalar ko'paygach yoqasiz.
   - **Aloqa** — telefon, email, manzil, Telegram.
   - → **Saqlash**.
4. **Yangiliklar** — birinchi yangilikni qo'shing (masalan, «Platforma ishga tushdi»).

✅ **Tekshirish:** boshqa brauzerda saytni ochganingizda o'zgarishlaringiz ko'rinadi.

## 6-bosqich. Email (Resend) — parolni tiklash va xabarlar

Busiz ham sayt ishlaydi, lekin foydalanuvchilar parolni o'zlari tiklay olmaydi va email bildirishnomalar ketmaydi.

1. [resend.com](https://resend.com) → ro'yxatdan o'ting (bepul tarif: kuniga 100 ta xat).
2. **Domains → Add Domain** → `agricrowd.uz`. Resend bir nechta **DNS yozuvlarini** (TXT/MX) ko'rsatadi.
3. Bu yozuvlarni domeningiz DNS sozlamalariga kiriting (Netlify DNS ishlatsangiz: Netlify → **Domains → agricrowd.uz → DNS records → Add new record**).
4. Resend'da domen holati **Verified** bo'lguncha kuting (10 daqiqadan bir necha soatgacha).
5. **API Keys → Create API Key** → nusxalang.
6. Netlify'ga qo'shing: `RESEND_API_KEY` = kalit, `MAIL_FROM` = `Agricrowd.uz <noreply@agricrowd.uz>` → **Trigger deploy**.

✅ **Tekshirish:** Admin → Sozlamalar → Telegram bot kartasida «Email: **ulangan**». Kirish sahifasida *Parolni unutdingizmi?* → emailingizni kiriting → xat keladi (Spam papkasini ham tekshiring).

## 7-bosqich. Telegram bot bildirishnomalari

1. Telegram'da **@BotFather** ni oching → `/newbot`.
2. Bot nomi: `Agricrowd.uz`; foydalanuvchi nomi: masalan `agricrowd_uz_bot` (oxiri `bot` bilan tugashi shart).
3. BotFather bergan **token**ni (`123456:ABC...`) nusxalang. ⚠️ Hech kimga bermang.
4. Netlify'ga qo'shing:
   - `TELEGRAM_BOT_TOKEN` = token
   - `TELEGRAM_BOT_USERNAME` = `agricrowd_uz_bot` (@ belgisisiz)
   - `TELEGRAM_WEBHOOK_SECRET` = 30+ belgili tasodifiy matn (faqat harf va raqamlar)
   → **Trigger deploy**.
5. Admin → **Sozlamalar → Telegram bot → «Telegram webhook'ni o'rnatish»** ni bosing (bir marta).
6. Ixtiyoriy: BotFather'da `/setuserpic` (logotip), `/setdescription` (tavsif).

✅ **Tekshirish:** o'z profilingizda **«Telegram'ni ulash»** → botda **Start** → sahifani yangilang → «Ulangan». Botga «✅ Hisobingiz ulandi» xabari keladi.

## 8-bosqich. Payme va Click (real to'lovlar)

To'lov tizimlari faqat **yuridik shaxs** (MChJ) yoki YaTT bilan shartnoma tuzadi. Ularga odatda kerak bo'ladi: guvohnoma, STIR, bank hisob raqami, ishlaydigan sayt, **ommaviy oferta** (foydalanish shartlari) sahifasi va to'lov qaytarish tartibi.

**Payme** ([business.payme.uz](https://business.payme.uz) yoki payme.uz → Biznes uchun):
1. Ariza qoldiring, shartnoma tuzing.
2. Payme kabinetida kassa (merchant) yarating. Sozlamalarda:
   - **Endpoint URL:** `https://agricrowd.uz/api/payme`
   - **Hisob (account) maydoni:** `order_id`
3. Payme bergan **Merchant ID** va **kalitni (key)** Netlify'ga kiriting: `PAYME_MERCHANT_ID`, `PAYME_KEY`.
4. Avval test kassa bilan sinang: `PAYME_TEST` = `true`. Payme «sandbox» testidan o'tgach, haqiqiy kalitni qo'yib, `PAYME_TEST` ni o'chiring.

**Click** ([click.uz](https://click.uz) → Biznes uchun / merchant.click.uz):
1. Ariza, shartnoma.
2. Merchant kabinetida servis yarating. **Prepare URL** va **Complete URL**: `https://agricrowd.uz/api/click`
3. Netlify'ga: `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY` → **Trigger deploy**.

**Uzum Bank** — merchant hujjatlari olingach, menga yozing, ulayman.

✅ **Tekshirish:** Admin → **To'lovlar** — Payme/Click «ulangan». Investor kabineti → Hamyon → Hisobni to'ldirish → kichik summa (1 000 so'm) bilan sinab ko'ring. Admin panelda **To'lovlar → «Payme / Click ulash uchun ma'lumot»** bo'limida kerakli manzillar ko'rsatilgan.

Shartnoma tuzilguncha to'lovlar **bank o'tkazmasi + chek** orqali ishlaydi (5-bosqichda rekvizitlar kiritiladi).

## 9-bosqich. Ishga tushirishdan oldingi yakuniy tekshiruv

- [ ] `https://agricrowd.uz/api` → «Faqat POST so'rovlar qabul qilinadi»
- [ ] Demo ma'lumotlar o'chirilgan, `SEED_DEMO=false`
- [ ] Test to'lov rejimi **o'chiq**
- [ ] `ADMIN_PASSWORD` standart `Admin123!` emas
- [ ] Shartnoma shabloni (PDF) yuklangan
- [ ] Bank rekvizitlari to'g'ri
- [ ] Sinov: yangi investor ro'yxatdan o'tadi → bank o'tkazmasi bilan hisob to'ldiradi → admin tasdiqlaydi
- [ ] Sinov: yangi fermer loyiha yuboradi → hujjat yuklaydi → admin tasdiqlaydi → loyiha saytda ko'rinadi
- [ ] Supabase **Pro** tarifi (oyiga ~$25) — tavsiya: bepul tarifda loyiha 7 kun faolsiz qolsa to'xtatiladi va zaxira nusxa yo'q

## Sayt yangilanganda (keyingi versiyalar)

1. Yangi fayllarni GitHub'ga yuklang (yoki menga ruxsat bering — o'zim yuklayman). Netlify avtomatik yangilaydi.
2. Supabase → SQL Editor → `supabase/schema.sql` ni **qayta Run** qiling (yangi ustunlar qo'shiladi, ma'lumotlar saqlanadi).

---

# Imkoniyatlar

| Bo'lim | Nima bor |
|---|---|
| Bosh sahifa | Maket bo'yicha dizayn, statistika (yoqish/o'chirish), loyihalar, qanday ishlaydi, kafolatlar, yangiliklar |
| Loyihalar | Kartalar, qidiruv, filtrlar; loyiha sahifasi: tafsilotlar, moliya, kafolat va risklar, monitoring, hujjatlar |
| Investor kabineti | Investitsiyalar, daromad, **shartnomalar**, monitoring, **hamyon** (to'ldirish, yechish), profil, Telegram |
| Fermer kabineti | Loyiha joylashtirish, **hujjatlar yuklash**, tekshiruv holati, shartnomalar, monitoring, hamyon |
| Parol | Email orqali tiklash (1 soatlik bir martalik havola) |
| Bildirishnomalar | Saytda 🔔, email (Resend) va Telegram bot |
| Admin panel | Tahlil, tekshiruv, loyihalar, shartnomalar, to'lovlar, foydalanuvchilar, investitsiyalar, monitoring, yangiliklar, xabarlar, moliya, sozlamalar, jurnal, CSV eksport, demo ma'lumotlarni o'chirish |

### Asosiy qoidalar (kodda amalga oshirilgan va testlangan)
1. Fermer yuborgan loyiha admin tasdiqlamaguncha investorlarga ko'rinmaydi.
2. 100% yig'ilsa — har bir investor bilan shartnoma yaratiladi, tomonlarga xabar yuboriladi.
3. Investor va fermer imzolangan nusxani yuklaydi, admin tasdiqlaydi.
4. Barcha shartnomalar tasdiqlangach mablag' fermerga ajratiladi.
5. Muddatda 100% yig'ilmasa — mablag' investorlarga avtomatik qaytariladi.
6. Hosil sotilgach daromad ulushlarga mos taqsimlanadi, platforma komissiyasi investorlar ulushidan olinadi.

### Loyiha hujjatlari kimga ko'rinadi
Fermer (egasi), administrator va shu loyihaga mablag' kiritgan investorlar. Boshqalar faqat hujjatlar ro'yxati mavjudligini ko'radi.

# Texnik ma'lumot

```
public/                       # sayt (Netlify publish papkasi)
  js/core.js                  # biznes mantiq (server va brauzerda bir xil)
  js/i18n*.js                 # tillar
  js/app.js, cabinet.js, admin.js, forms.js, ui.js, store.js, state.js
netlify/functions/            # api, payme, click, telegram
server/handler.mjs            # autentifikatsiya, tranzaksiyalar
server/supabase.mjs           # Supabase: PostgreSQL + Storage
server/payments.mjs           # Payme va Click protokollari
server/mailer.mjs             # email (Resend) va Telegram xabarlari
supabase/schema.sql           # jadvallar, funksiyalar, bucketlar (qayta Run qilish xavfsiz)
supabase/reset-data.sql       # BARCHA ma'lumotni o'chirish (faqat ishga tushirishdan oldin)
tests/                        # testlar
```

Barcha muhit o'zgaruvchilari:

| O'zgaruvchi | Bosqich |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | 2–3 |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_SECRET`, `SEED_DEMO`, `SITE_URL` | 3 |
| `RESEND_API_KEY`, `MAIL_FROM` | 6 |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` | 7 |
| `PAYME_MERCHANT_ID`, `PAYME_KEY`, `PAYME_TEST` | 8 |
| `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY` | 8 |

Dasturchilar uchun:
```bash
npm install
npm run dev              # http://localhost:8888 (ma'lumotlar .data/ da; ?demo=1 — brauzer demo rejimi)
npm test                 # TEST_DATABASE_URL=postgres://... — PostgreSQL testlari ham
npm run i18n:check       # tarjimasi yo'q matnlar
```
Yangi matn: kodda `t("O'zbekcha matn")`, tarjimasini `public/js/i18n-ru.js` va `i18n-en.js` ga qo'shing.

## Keyingi rivojlantirish takliflari
- **E-IMZO** — shartnomani elektron raqamli imzo bilan imzolash.
- **Uzum Bank** to'lovlari.
- SMS orqali tasdiqlash (Eskiz.uz yoki Playmobile).
