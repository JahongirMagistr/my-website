# Agricrowd.uz

Sabzavot yetishtiruvchi fermer va dehqon xo'jaliklarini investorlar mablag'i orqali moliyalashtirish (kraudfanding) platformasi.

**Fermer/dehqon** → loyiha va mahsulot · **Investor** → moliyaviy resurs · **Agricrowd.uz** → bog'lash, tekshirish, moliyalashtirishni tashkil etish va monitoring.

## Imkoniyatlar

| Bo'lim | Nima bor |
|---|---|
| Bosh sahifa | Platforma mazmuni, statistika, moliyalashtirilayotgan loyihalar, qanday ishlashi, kafolatlar |
| Loyihalar | Loyiha kartalari (nomi, mahsulot, hudud, kerakli/yig'ilgan mablag', %, muddat, hosil, qaytarish shartlari), qidiruv va filtrlar |
| Loyiha sahifasi | Loyiha haqida · Moliyaviy qism · Kafolat va risklar (garov, sug'urta, kafolat, fermer reytingi) · Foto/video monitoring · «Investitsiya kiritish» |
| Ro'yxatdan o'tish | Rol tanlash: Investor yoki Fermer/dehqon |
| Investor kabineti | Mavjud mablag', investitsiyalar, holati, ulush, kutilayotgan daromad, moliyalashtirish holati, monitoring, daromad taqsimoti, operatsiyalar |
| Fermer kabineti | Shaxsiy va xo'jalik ma'lumotlari, yangi loyiha, yuborilgan loyihalar va tekshiruv holati, moliyalashtirish holati, monitoring qo'shish (foto/video/holat) |
| Admin panel | Tahlil (KPI, grafiklar), loyihalarni tekshirish/tasdiqlash/rad etish, loyihalarni tahrirlash va qo'shish, holatni boshqarish, daromadni taqsimlash, foydalanuvchilar (rol, bloklash, verifikatsiya, reyting, balans), investitsiyalar, monitoring, moliya, sozlamalar (komissiya, hududlar, mahsulotlar, bosh sahifa matni), faoliyat jurnali, CSV (Excel) eksport |

### Asosiy qoidalar (kodda amalga oshirilgan)

- Fermer yuborgan loyiha **administrator tasdiqlamaguncha** investorlarga ko'rinmaydi.
- Loyiha **100%** yig'ilsa — avtomatik «moliyalashtirildi» holatiga o'tadi va mablag' fermer hisobiga ajratiladi.
- Moliyalashtirish muddati tugab, 100% yig'ilmasa — loyiha bekor qilinadi va **investorlar mablag'i avtomatik qaytariladi**.
- Yakunda: *Hosil → Sotish → Daromad → Taqsimlash*. Admin haqiqiy tushumni kiritadi; investorlar ulushi (loyihada belgilangan %) ularning kiritgan summasiga mos taqsimlanadi, platforma komissiyasi (sozlamalarda, standart 5%) investorlar ulushidan olinadi, qolgani — fermer ulushi.

## Texnik tuzilma

Build bosqichi yo'q — oddiy HTML/CSS/JS (ES modules).

```
public/              # sayt (Netlify publish papkasi)
  index.html
  css/style.css
  js/core.js         # biznes mantiq (server va brauzerda bir xil ishlaydi)
  js/store.js        # API mijozi (+ server bo'lmasa demo rejim)
  js/app.js          # sahifalar, kabinetlar
  js/admin.js        # admin panel
  js/forms.js, ui.js
netlify/functions/api.mjs   # /api — Netlify Function, ma'lumotlar Netlify Blobs'da
server/handler.mjs          # autentifikatsiya (scrypt + HMAC token), so'rovlarni qayta ishlash
dev-server.mjs              # lokal server (ma'lumotlar .data/db.json da)
tests/core.test.mjs         # biznes qoidalar testlari
```

Ma'lumotlar bazasi — **Netlify Blobs** (Netlify'ga ulanganda avtomatik ishlaydi, alohida DB kerak emas).

## Lokal ishga tushirish

```bash
npm install
npm run dev      # http://localhost:8888
npm test
```

Agar sayt serversiz (masalan, oddiy statik hosting) ochilsa, u **demo rejim**ga o'tadi: ma'lumotlar faqat shu brauzerda saqlanadi.

## Netlify'ga ulash

1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project** → GitHub → shu repozitoriyni tanlang.
2. Sozlamalar `netlify.toml` dan avtomatik olinadi (publish: `public`, functions: `netlify/functions`). Build command bo'sh qoladi.
3. **Site configuration → Environment variables** bo'limida qo'shing:

   | O'zgaruvchi | Qiymat |
   |---|---|
   | `ADMIN_EMAIL` | administrator emaili |
   | `ADMIN_PASSWORD` | kuchli parol (**albatta o'zgartiring**, standart: `Admin123!`) |
   | `AUTH_SECRET` | uzun tasodifiy satr (masalan, `openssl rand -hex 32`) |
   | `SEED_DEMO` | `false` — demo loyihalar va demo foydalanuvchilarsiz boshlash uchun |

   Admin hisobi birinchi so'rovda yaratiladi, shuning uchun o'zgaruvchilarni **birinchi deploydan oldin** qo'shing.
4. **Deploy** tugmasini bosing. Keyin **Domain management** orqali `agricrowd.uz` domenini ulang.

Admin panel: saytda `admin` hisobi bilan kiring → yuqoridagi «Admin panel».

## Ishga tushirishdan oldin

- **To'lov tizimi**: hozir investor hisobini to'ldirish va yechib olish soddalashtirilgan (haqiqiy pul o'tkazmasiz). Real foydalanish uchun Click / Payme / Uzcard / Humo integratsiyasi kerak.
- Demo hisoblar (`SEED_DEMO` yoqilgan bo'lsa): `investor@agricrowd.uz` / `demo123`, `fermer@agricrowd.uz` / `demo123`. Real ishga tushirishda `SEED_DEMO=false` qiling.
- Rasmlar siqilgan holda ma'lumotlar bazasida saqlanadi. Ko'p sonli foto uchun keyinchalik alohida fayl saqlash (Netlify Blobs store yoki CDN) qo'shish tavsiya etiladi.
