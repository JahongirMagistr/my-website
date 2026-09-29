// Agricrowd.uz — platformaning biznes mantig'i.
// Bu fayl ham serverda (Netlify Function), ham brauzerda (demo rejim) ishlaydi.
// Barcha amallar `handle(db, action, payload, ctx)` orqali bajariladi.
// Xato va bildirishnoma matnlari o'zbekcha kalit sifatida yoziladi va mijozda tarjima qilinadi (i18n.js).

export const STATUSES = {
  pending: { label: "Tekshiruvda", tone: "warn" },
  rejected: { label: "Rad etilgan", tone: "bad" },
  funding: { label: "Mablag' yig'ilmoqda", tone: "info" },
  funded: { label: "100% moliyalashtirildi", tone: "good" },
  in_progress: { label: "Amalga oshirilmoqda", tone: "good" },
  harvest: { label: "Hosil yig'ilmoqda / sotilmoqda", tone: "good" },
  completed: { label: "Yakunlandi — daromad taqsimlandi", tone: "done" },
  refunded: { label: "Moliyalashtirilmadi — mablag' qaytarildi", tone: "bad" },
};

export const CONTRACT_STATUSES = {
  awaiting: { label: "Imzolash kutilmoqda", tone: "warn" },
  partial: { label: "Bir tomon imzoladi", tone: "info" },
  signed: { label: "Ikki tomon imzoladi — tekshiruvda", tone: "info" },
  verified: { label: "Tasdiqlangan", tone: "good" },
};

export const PAYMENT_STATUSES = {
  pending: { label: "To'lov kutilmoqda", tone: "warn" },
  review: { label: "Chek tekshiruvda", tone: "info" },
  paid: { label: "To'langan", tone: "good" },
  rejected: { label: "Rad etilgan", tone: "bad" },
  cancelled: { label: "Bekor qilingan", tone: "bad" },
};

export const WITHDRAWAL_STATUSES = {
  pending: { label: "Ko'rib chiqilmoqda", tone: "warn" },
  paid: { label: "O'tkazildi", tone: "good" },
  rejected: { label: "Rad etilgan", tone: "bad" },
};

// Investorlarga ko'rinadigan (e'lon qilingan) holatlar
export const PUBLIC_STATUSES = ["funding", "funded", "in_progress", "harvest", "completed", "refunded"];
// Monitoring qo'shish mumkin bo'lgan holatlar
export const MONITOR_STATUSES = ["funded", "in_progress", "harvest"];

export const COLLECTIONS = ["users", "projects", "investments", "updates", "transactions", "logs", "contracts", "notifications", "payments", "withdrawals", "news", "messages"];

export const DEFAULT_HERO_IMAGE = "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1920&q=70";

export const DEFAULT_SETTINGS = {
  commission: 5, // platforma komissiyasi, investorlar ulushidan %
  minInvestment: 500000,
  showStats: true, // bosh sahifada statistika ko'rsatilsinmi
  showDemoLogins: false, // kirish sahifasida demo hisob tugmalari
  testPayments: false, // test rejimida hisob darhol to'ldiriladi (haqiqiy pulsiz)
  regions: [
    "Andijon", "Buxoro", "Farg'ona", "Jizzax", "Xorazm", "Namangan", "Navoiy",
    "Qashqadaryo", "Qoraqalpog'iston Respublikasi", "Samarqand", "Sirdaryo",
    "Surxondaryo", "Toshkent viloyati", "Toshkent shahri",
  ],
  crops: [
    "Pomidor", "Bodring", "Kartoshka", "Piyoz", "Sabzi", "Karam", "Qalampir",
    "Baqlajon", "Sarimsoq", "Lavlagi", "Qovoq", "Boshqa sabzavot",
  ],
  contactPhone: "+998 71 200 00 00",
  contactEmail: "info@agricrowd.uz",
  address: "Toshkent, O'zbekiston",
  telegram: "",
  heroImage: "",
  // Platformaning bank rekvizitlari (bank o'tkazmasi orqali to'lov uchun)
  bank: { recipient: "", bankName: "", account: "", mfo: "", inn: "", purpose: "Agricrowd.uz hisobini to'ldirish, ID: {id}" },
  contractTemplate: null, // { path, name, size, uploadedAt }
  // Bosh sahifa va «Biz haqimizda» matnlari (tillar bo'yicha; uz-Cyrl avtomatik o'giriladi)
  content: {
    uz: {
      heroBadge: "Hoziroq investitsiya qiling!",
      heroTitle: "Agricrowd",
      heroSubtitle: "Qishloq xo'jaligini rivojlantirishga o'z hissangizni qo'shing!",
      about: "Agricrowd.uz — O'zbekistonda sabzavot yetishtiruvchi fermer va dehqon xo'jaliklarini investorlar mablag'i orqali moliyalashtirishga mo'ljallangan kraudfanding platformasi.\n\nBir tomonda mablag'ga ehtiyoj sezayotgan sabzavot yetishtiruvchilar, ikkinchi tomonda esa qishloq xo'jaligiga mablag' kiritishni istagan investorlar bir platformada birlashadi. Platforma loyihalarni tekshiradi, moliyalashtirishni tashkil etadi va loyiha bajarilishini foto/video monitoring orqali nazorat qiladi.",
    },
    ru: {
      heroBadge: "Инвестируйте прямо сейчас!",
      heroTitle: "Agricrowd",
      heroSubtitle: "Внесите свой вклад в развитие сельского хозяйства!",
      about: "Agricrowd.uz — краудфандинговая платформа для финансирования фермерских и дехканских хозяйств Узбекистана, выращивающих овощи, за счёт средств инвесторов.\n\nС одной стороны — производители овощей, которым нужны средства, с другой — инвесторы, желающие вкладывать в сельское хозяйство. Платформа проверяет проекты, организует финансирование и контролирует их реализацию с помощью фото- и видеомониторинга.",
    },
    en: {
      heroBadge: "Invest right now!",
      heroTitle: "Agricrowd",
      heroSubtitle: "Contribute to the development of agriculture!",
      about: "Agricrowd.uz is a crowdfunding platform that finances vegetable-growing farms and smallholders in Uzbekistan with funds from investors.\n\nOn one side are vegetable growers who need funding; on the other are investors who want to invest in agriculture. The platform verifies projects, organises the funding and monitors implementation through photo and video reports.",
    },
  },
};

const PROJECT_FIELDS = [
  "title", "crop", "region", "district", "area", "totalCost", "goal", "purpose",
  "usage", "plan", "expectedYield", "expectedPrice", "expectedRevenue",
  "investorShare", "returnTerms", "durationMonths", "fundingDeadline",
  "collateral", "insurance", "guarantee", "documents", "image", "summary",
];
const NUMERIC_FIELDS = ["area", "totalCost", "goal", "expectedYield", "expectedPrice", "expectedRevenue", "investorShare", "durationMonths"];

export class ApiError extends Error {
  constructor(message, status = 400, params = null) {
    super(message);
    this.status = status;
    this.params = params;
  }
}

const fail = (msg, status = 400, params = null) => { throw new ApiError(msg, status, params); };
const now = () => new Date().toISOString();
export const uid = (p = "") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const round = (n) => Math.round(Number(n) || 0);
const str = (v, max = 5000) => String(v ?? "").trim().slice(0, max);
const clone = (o) => JSON.parse(JSON.stringify(o));
// Rasm manzili faqat https:// yoki base64 rasm bo'lishi mumkin (CSS/HTML ichiga qo'yiladi)
const safeImg = (v, max = 1_500_000) => {
  const x = str(v, max);
  return /^(data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+|https:\/\/[^\s'"()<>\\]+)$/.test(x) ? x : "";
};

export function emptyDb() {
  const db = { version: 2, settings: clone(DEFAULT_SETTINGS) };
  for (const c of COLLECTIONS) db[c] = [];
  return db;
}

// Eski yoki to'liq bo'lmagan bazani joriy tuzilmaga keltiradi
export function normalizeDb(db) {
  for (const c of COLLECTIONS) if (!Array.isArray(db[c])) db[c] = [];
  const s = (db.settings = { ...clone(DEFAULT_SETTINGS), ...(db.settings || {}) });
  s.bank = { ...DEFAULT_SETTINGS.bank, ...(s.bank || {}) };
  s.content = s.content || {};
  for (const l of ["uz", "ru", "en"]) s.content[l] = { ...DEFAULT_SETTINGS.content[l], ...(s.content[l] || {}) };
  return db;
}

// ---------------------------------------------------------------------------
// Yordamchi funksiyalar

export function publicUser(u) {
  if (!u) return null;
  const { passHash, salt, resetHash, resetExp, resetRequestedAt, tgCode, tgCodeExp, telegramChatId, ...rest } = u;
  return { ...rest, telegramLinked: !!telegramChatId };
}

function log(db, userId, action, details = "") {
  db.logs.unshift({ id: uid("l"), userId, action, details, createdAt: now() });
}

function tx(db, userId, type, amount, projectId = null, note = "") {
  db.transactions.unshift({ id: uid("t"), userId, type, amount: round(amount), projectId, note, createdAt: now() });
}

// Bildirishnoma: title/body — tarjima kalitlari, params — o'rniga qo'yiladigan qiymatlar
function notify(db, ctx, userId, title, body, params = {}, link = "") {
  const user = findUser(db, userId);
  if (!user) return;
  db.notifications.unshift({ id: uid("n"), userId, title, body, params, link, read: false, createdAt: now() });
  ctx?.outbox?.push({ to: user.email, telegramChatId: user.telegramChatId || null, lang: user.lang || "uz", name: user.name, title, body, params, link });
}
const notifyAdmins = (db, ctx, title, body, params, link) =>
  db.users.filter((u) => u.role === "admin" && !u.blocked).forEach((a) => notify(db, ctx, a.id, title, body, params, link));

// Tasodifiy xavfsiz token (server va brauzerda)
const randomToken = (bytes = 24) => {
  const a = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const findUser = (db, id) => db.users.find((u) => u.id === id);
const findProject = (db, id) => db.projects.find((p) => p.id === id) || fail("Loyiha topilmadi", 404);
const findIn = (list, id, msg) => list.find((x) => x.id === id) || fail(msg, 404);

function requireUser(ctx, roles) {
  if (!ctx.user) fail("Tizimga kirish talab qilinadi", 401);
  if (ctx.user.blocked) fail("Hisobingiz bloklangan. Administrator bilan bog'laning", 403);
  if (roles && !roles.includes(ctx.user.role)) fail("Bu amal uchun ruxsat yo'q", 403);
  return ctx.user;
}

function projectStats(db, p) {
  const inv = db.investments.filter((i) => i.projectId === p.id && i.status !== "refunded");
  const investors = new Set(inv.map((i) => i.investorId)).size;
  const percent = p.goal > 0 ? Math.min(100, (p.raised / p.goal) * 100) : 0;
  const expectedReturn = p.goal > 0 ? ((p.expectedRevenue * (p.investorShare / 100)) / p.goal - 1) * 100 : 0;
  return { investors, percent: Math.round(percent * 10) / 10, expectedReturn: Math.round(expectedReturn * 10) / 10 };
}

function farmerCard(db, farmerId) {
  const f = findUser(db, farmerId);
  if (!f) return null;
  const projects = db.projects.filter((p) => p.farmerId === f.id);
  return {
    id: f.id,
    name: f.name,
    rating: f.rating ?? null,
    verified: !!f.verified,
    farm: f.farm || {},
    createdAt: f.createdAt,
    projectsTotal: projects.filter((p) => PUBLIC_STATUSES.includes(p.status)).length,
    projectsCompleted: projects.filter((p) => p.status === "completed").length,
  };
}

const stripHeavy = (p) => { const e = { ...p }; e.docsCount = (p.docs || []).length; delete e.docs; if (e.image?.startsWith("data:")) { delete e.image; e.hasImage = true; } return e; };

function enrich(db, p, { full = false } = {}) {
  const out = { ...p, ...projectStats(db, p) };
  out.farmer = farmerCard(db, p.farmerId);
  if (full) {
    out.updates = db.updates.filter((u) => u.projectId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return out;
}

function sanitizeProject(input) {
  const p = {};
  for (const k of PROJECT_FIELDS) if (k in input) p[k] = input[k];
  for (const k of NUMERIC_FIELDS) if (k in p) p[k] = Math.max(0, Number(p[k]) || 0);
  for (const k of ["totalCost", "goal", "expectedRevenue", "durationMonths"]) if (k in p) p[k] = round(p[k]);
  for (const k of ["title", "crop", "region", "district", "returnTerms", "fundingDeadline"]) if (k in p) p[k] = str(p[k], 200);
  for (const k of ["purpose", "plan", "collateral", "insurance", "guarantee", "documents", "summary"]) if (k in p) p[k] = str(p[k], 5000);
  if ("image" in p) p.image = safeImg(p.image, 600000);
  if ("usage" in p) {
    p.usage = (Array.isArray(p.usage) ? p.usage : [])
      .map((u) => ({ item: str(u.item, 200), amount: round(u.amount) }))
      .filter((u) => u.item && u.amount > 0)
      .slice(0, 30);
  }
  if ("investorShare" in p) p.investorShare = Math.min(100, p.investorShare);
  if (p.expectedYield && p.expectedPrice && !p.expectedRevenue) {
    p.expectedRevenue = round(p.expectedYield * 1000 * p.expectedPrice);
  }
  return p;
}

function validateProject(p, settings) {
  const req = { title: "Loyiha nomi", crop: "Mahsulot turi", region: "Hudud", goal: "Kerakli mablag'", durationMonths: "Loyiha muddati", fundingDeadline: "Moliyalashtirish muddati", investorShare: "Investor ulushi" };
  for (const [k, label] of Object.entries(req)) if (!p[k]) fail("«{field}» maydonini to'ldiring", 400, { field: label });
  if (p.totalCost && p.goal > p.totalCost) fail("Jalb qilinadigan mablag' loyiha umumiy qiymatidan oshmasligi kerak");
  if (p.goal < settings.minInvestment) fail("Kerakli mablag' juda kichik");
}

// Fayl havolasi: { path, name, size, uploadedAt } — yo'l kutilgan papkada bo'lishi shart
function fileRef(file, prefix) {
  if (!file || typeof file.path !== "string" || !file.path.startsWith(prefix) || file.path.includes("..")) fail("Fayl noto'g'ri");
  return { path: file.path, name: str(file.name, 200) || "fayl", size: round(file.size), uploadedAt: now() };
}

// ---------------------------------------------------------------------------
// Moliyalashtirish, shartnomalar, qaytarish

// 100% yig'ilganda: loyiha «moliyalashtirildi», har bir investor bilan shartnoma yaratiladi.
// Mablag' fermerga barcha shartnomalar imzolanib, administrator tasdiqlaganidan keyin ajratiladi.
function markFunded(db, p, ctx) {
  p.status = "funded";
  p.fundedAt = now();
  const byInvestor = {};
  for (const i of db.investments.filter((x) => x.projectId === p.id && x.status === "active")) {
    byInvestor[i.investorId] = (byInvestor[i.investorId] || 0) + i.amount;
  }
  const year = new Date().getFullYear();
  for (const [investorId, amount] of Object.entries(byInvestor)) {
    const seq = db.contracts.length + 1;
    const c = {
      id: uid("c"), number: `AC-${year}-${String(seq).padStart(4, "0")}`, projectId: p.id, investorId, farmerId: p.farmerId,
      amount, sharePercent: Math.round((amount / p.goal) * 10000) / 100, status: "awaiting",
      investorFile: null, farmerFile: null, adminNote: "", createdAt: now(), verifiedAt: null,
    };
    db.contracts.push(c);
    notify(db, ctx, investorId, "Shartnomani imzolash vaqti keldi", "«{project}» loyihasi 100% moliyalashtirildi. Shartnomani yuklab oling, imzolang va imzolangan nusxasini saytga joylang.", { project: p.title }, "/cabinet/contracts");
  }
  notify(db, ctx, p.farmerId, "Loyihangiz 100% moliyalashtirildi!", "«{project}» loyihasi to'liq moliyalashtirildi. Investorlar bilan shartnomalarni yuklab oling, imzolang (muhr bilan) va saytga joylang. Mablag' shartnomalar tasdiqlangach ajratiladi.", { project: p.title }, "/cabinet/contracts");
  notifyAdmins(db, ctx, "Loyiha 100% moliyalashtirildi", "«{project}» — shartnomalar imzolanishi kutilmoqda.", { project: p.title }, "/admin/contracts");
  log(db, null, "project_funded", `${p.title}: 100%`);
}

function releaseFunds(db, p, ctx) {
  if (p.disbursedAt) return;
  const farmer = findUser(db, p.farmerId);
  if (farmer) {
    farmer.balance = round((farmer.balance || 0) + p.raised);
    tx(db, farmer.id, "disbursement", p.raised, p.id, "Loyiha mablag'i fermerga ajratildi");
  }
  p.disbursedAt = now();
  notify(db, ctx, p.farmerId, "Mablag' hisobingizga ajratildi", "«{project}» loyihasi bo'yicha {amount} so'm hisobingizga o'tkazildi. Ishlab chiqarishni boshlashingiz mumkin.", { project: p.title, amount: p.raised }, "/cabinet/transactions");
  log(db, null, "funds_released", p.title);
}

function refundProject(db, p, reason, ctx) {
  for (const inv of db.investments.filter((i) => i.projectId === p.id && i.status === "active")) {
    const investor = findUser(db, inv.investorId);
    if (investor) {
      investor.balance = round((investor.balance || 0) + inv.amount);
      tx(db, investor.id, "refund", inv.amount, p.id, reason);
      notify(db, ctx, investor.id, "Mablag'ingiz qaytarildi", "«{project}» loyihasi 100% moliyalashtirilmadi. {amount} so'm hisobingizga qaytarildi.", { project: p.title, amount: inv.amount }, "/cabinet/transactions");
    }
    inv.status = "refunded";
  }
  p.status = "refunded";
  p.refundedAt = now();
  notify(db, ctx, p.farmerId, "Loyiha moliyalashtirilmadi", "«{project}» loyihasi belgilangan muddatda 100% moliyalashtirilmadi. Investorlar mablag'i qaytarildi.", { project: p.title }, "/cabinet/projects");
  log(db, null, "project_refunded", `${p.title}: ${reason}`);
}

function contractStatus(c) {
  if (c.status === "verified") return "verified";
  if (c.investorFile && c.farmerFile) return "signed";
  if (c.investorFile || c.farmerFile) return "partial";
  return "awaiting";
}

export function contractTemplate(db, projectId) {
  const p = db.projects.find((x) => x.id === projectId);
  return p?.contractTemplate || db.settings.contractTemplate || null;
}

function enrichContract(db, c) {
  const p = db.projects.find((x) => x.id === c.projectId);
  const inv = findUser(db, c.investorId);
  const f = findUser(db, c.farmerId);
  const party = (u) => u && { id: u.id, name: u.name, email: u.email, phone: u.phone, docs: u.docs || {}, bank: u.bank || {}, farm: u.farm || null };
  return {
    ...c,
    template: contractTemplate(db, c.projectId),
    project: p && { id: p.id, title: p.title, crop: p.crop, region: p.region, district: p.district, area: p.area, goal: p.goal, investorShare: p.investorShare, durationMonths: p.durationMonths, expectedRevenue: p.expectedRevenue, returnTerms: p.returnTerms, status: p.status, disbursedAt: p.disbursedAt || null },
    investor: party(inv),
    farmer: party(f),
  };
}

// Har bir so'rovda muddati o'tgan loyihalarni tekshiradi. O'zgarish bo'lsa true qaytaradi.
export function tick(db, ctx) {
  let changed = false;
  const today = new Date().toISOString().slice(0, 10);
  for (const p of db.projects) {
    if (p.status === "funding" && p.fundingDeadline && p.fundingDeadline < today && p.raised < p.goal) {
      refundProject(db, p, "Muddat ichida 100% moliyalashtirilmadi — mablag' qaytarildi", ctx);
      changed = true;
    }
  }
  return changed;
}

// Hisobni to'ldirish (to'lov tasdiqlanganda) — to'lov tizimlari callbacklari ham shu funksiyani chaqiradi
export function creditPayment(db, payment, ctx, note = "") {
  if (payment.status === "paid") return false;
  const u = findUser(db, payment.userId);
  if (!u) return false;
  payment.status = "paid";
  payment.paidAt = now();
  u.balance = round((u.balance || 0) + payment.amount);
  tx(db, u.id, "deposit", payment.amount, null, note || `To'lov: ${payment.method}`);
  notify(db, ctx, u.id, "Hisobingiz to'ldirildi", "{amount} so'm hisobingizga tushdi.", { amount: payment.amount }, "/cabinet/transactions");
  log(db, u.id, "deposit", `${payment.method}: ${payment.amount}`);
  return true;
}

function analytics(db) {
  const sum = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0);
  const byStatus = {};
  for (const k of Object.keys(STATUSES)) byStatus[k] = 0;
  for (const p of db.projects) byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  const group = (key) => {
    const m = {};
    for (const p of db.projects.filter((x) => PUBLIC_STATUSES.includes(x.status))) {
      const k = p[key] || "—";
      m[k] = m[k] || { name: k, projects: 0, raised: 0 };
      m[k].projects++;
      m[k].raised += p.raised || 0;
    }
    return Object.values(m).sort((a, b) => b.raised - a.raised);
  };
  const months = [];
  const d = new Date();
  for (let i = 11; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push({ key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`, amount: 0, count: 0 });
  }
  for (const inv of db.investments) {
    const mm = months.find((m) => inv.createdAt.startsWith(m.key));
    if (mm) { mm.amount += inv.amount; mm.count++; }
  }
  const activeInv = db.investments.filter((i) => i.status !== "refunded");
  return {
    users: db.users.length,
    investors: db.users.filter((u) => u.role === "investor").length,
    farmers: db.users.filter((u) => u.role === "farmer").length,
    projects: db.projects.length,
    pending: byStatus.pending || 0,
    totalRaised: sum(activeInv, (i) => i.amount),
    totalInvestments: activeInv.length,
    commissionEarned: sum(db.transactions.filter((t) => t.type === "commission"), (t) => t.amount),
    paidOut: sum(db.transactions.filter((t) => t.type === "payout"), (t) => t.amount),
    refunded: sum(db.transactions.filter((t) => t.type === "refund"), (t) => t.amount),
    successRate: (() => {
      const closed = db.projects.filter((p) => ["funded", "in_progress", "harvest", "completed", "refunded"].includes(p.status));
      return closed.length ? Math.round((closed.filter((p) => p.status !== "refunded").length / closed.length) * 100) : null;
    })(),
    contractsToVerify: db.contracts.filter((c) => contractStatus(c) === "signed").length,
    paymentsToReview: db.payments.filter((p) => p.status === "review" || (p.status === "pending" && p.method === "bank" && p.receipt)).length,
    withdrawalsPending: db.withdrawals.filter((w) => w.status === "pending").length,
    newMessages: db.messages.filter((m) => m.status === "new").length,
    byStatus,
    byRegion: group("region"),
    byCrop: group("crop"),
    byMonth: months,
  };
}

// ---------------------------------------------------------------------------
// Fayllar: kim qaysi faylni yuklashi / o'qishi mumkin

const DOC_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const IMG_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ext = (type) => ({ "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[type] || "bin");

// Yuklash uchun ruxsat va saqlash joyini aniqlaydi
export function authorizeUpload(db, user, { purpose, refId, contentType, size }) {
  if (!user) fail("Tizimga kirish talab qilinadi", 401);
  const rnd = uid();
  if (purpose === "image") {
    if (!["farmer", "admin"].includes(user.role)) fail("Bu amal uchun ruxsat yo'q", 403);
    if (!IMG_TYPES.includes(contentType)) fail("Faqat rasm fayllari");
    if (size > 5 * 1024 * 1024) fail("Fayl hajmi {max} MB dan oshmasligi kerak", 400, { max: 5 });
    return { bucket: "media", path: `images/${user.id}/${rnd}.${ext(contentType)}`, public: true };
  }
  if (!DOC_TYPES.includes(contentType)) fail("Faqat PDF, JPG yoki PNG fayl yuklang");
  if (size > 15 * 1024 * 1024) fail("Fayl hajmi {max} MB dan oshmasligi kerak", 400, { max: 15 });
  if (purpose === "contract-template") {
    if (user.role !== "admin") fail("Bu amal uchun ruxsat yo'q", 403);
    return { bucket: "documents", path: `templates/${refId || "global"}/${rnd}.${ext(contentType)}`, public: false };
  }
  if (purpose === "contract-signed") {
    const c = findIn(db.contracts, refId, "Shartnoma topilmadi");
    const side = c.investorId === user.id ? "investor" : c.farmerId === user.id ? "farmer" : null;
    if (!side) fail("Bu shartnoma sizga tegishli emas", 403);
    if (c.status === "verified") fail("Shartnoma allaqachon tasdiqlangan");
    return { bucket: "documents", path: `contracts/${c.id}/${side}-${rnd}.${ext(contentType)}`, public: false };
  }
  if (purpose === "project-doc") {
    const p = findProject(db, refId);
    if (!(user.role === "admin" || p.farmerId === user.id)) fail("Bu loyiha sizga tegishli emas", 403);
    return { bucket: "documents", path: `projects/${p.id}/${rnd}.${ext(contentType)}`, public: false };
  }
  if (purpose === "receipt") {
    const p = findIn(db.payments, refId, "To'lov topilmadi");
    if (p.userId !== user.id) fail("Bu amal uchun ruxsat yo'q", 403);
    return { bucket: "documents", path: `receipts/${p.id}/${rnd}.${ext(contentType)}`, public: false };
  }
  fail("Fayl noto'g'ri");
}

// Loyiha hujjatlarini kim ko'ra oladi: admin, loyiha egasi va loyihaga mablag' kiritgan investorlar
function canSeeProjectDocs(db, user, p) {
  if (!user) return false;
  return user.role === "admin" || p.farmerId === user.id || db.investments.some((i) => i.projectId === p.id && i.investorId === user.id && i.status !== "refunded");
}

// Maxfiy faylni o'qish huquqi
export function authorizeRead(db, user, path) {
  if (!user) fail("Tizimga kirish talab qilinadi", 401);
  if (typeof path !== "string" || path.includes("..")) fail("Fayl noto'g'ri");
  if (user.role === "admin") return true;
  const [folder, id] = path.split("/");
  if (folder === "templates") return true; // bo'sh shablonlar — barcha foydalanuvchilar uchun
  if (folder === "contracts") {
    const c = db.contracts.find((x) => x.id === id);
    if (c && (c.investorId === user.id || c.farmerId === user.id)) return true;
  }
  if (folder === "projects") {
    const p = db.projects.find((x) => x.id === id);
    if (p && canSeeProjectDocs(db, user, p)) return true;
  }
  if (folder === "receipts") {
    const p = db.payments.find((x) => x.id === id);
    if (p && p.userId === user.id) return true;
  }
  fail("Bu amal uchun ruxsat yo'q", 403);
}

// Telegram botiga kelgan xabar: /start <kod> — hisobni ulaydi, /stop — uzadi. Javob matnini qaytaradi.
export function telegramUpdate(db, update) {
  const msg = update?.message;
  const chatId = msg?.chat?.id;
  const text = String(msg?.text || "").trim();
  if (!chatId) return null;
  const chat = String(chatId);
  if (text.startsWith("/start")) {
    const code = text.split(/\s+/)[1];
    const u = code && db.users.find((x) => x.tgCode === code && x.tgCodeExp && Date.parse(x.tgCodeExp) > Date.now());
    if (!u) return { chatId: chat, key: "Agricrowd.uz botiga xush kelibsiz! Hisobingizni ulash uchun saytdagi Profil → «Telegram'ni ulash» tugmasini bosing." };
    for (const other of db.users) if (other.telegramChatId === chat) other.telegramChatId = null;
    u.telegramChatId = chat;
    u.tgCode = null;
    u.tgCodeExp = null;
    log(db, u.id, "telegram_link", chat);
    return { chatId: chat, key: "✅ Hisobingiz ulandi, {name}! Endi barcha bildirishnomalar shu yerga keladi. O'chirish uchun /stop yozing.", params: { name: u.name }, lang: u.lang };
  }
  if (text.startsWith("/stop")) {
    const u = db.users.find((x) => x.telegramChatId === chat);
    if (u) u.telegramChatId = null;
    return { chatId: chat, key: "Bildirishnomalar o'chirildi. Qayta ulash uchun saytdagi Profil bo'limiga kiring.", lang: u?.lang };
  }
  return { chatId: chat, key: "Bu bot faqat Agricrowd.uz bildirishnomalarini yuboradi. Savollar uchun saytdagi «Biz bilan bog'lanish» bo'limiga yozing." };
}

// ---------------------------------------------------------------------------
// Asosiy dispatcher. ctx = { user, hash, issueToken, outbox: [], payments?: { methods, checkoutUrl } }

export async function handle(db, action, payload = {}, ctx = {}) {
  const fn = ACTIONS[action];
  if (!fn) fail("Noma'lum amal", 404);
  return fn(db, payload || {}, ctx);
}

// Bazani o'zgartirmaydigan amallar
export const READ_ONLY = new Set(["ping", "bootstrap", "getProject", "me", "investorDashboard", "farmerDashboard", "adminData", "farmerProject", "notifications", "myContracts", "getNews", "myPayments", "uploadInit", "uploadInline", "fileUrl"]);

function paymentMethods(db, ctx) {
  const s = db.settings;
  return {
    payme: !!ctx.payments?.methods?.payme,
    click: !!ctx.payments?.methods?.click,
    uzum: !!ctx.payments?.methods?.uzum,
    bank: !!(s.bank?.account && s.bank?.recipient),
    test: !!s.testPayments,
  };
}

const ACTIONS = {
  ping: () => ({ ok: true }),

  // --- Fayllar ----------------------------------------------------------
  // ctx.files: { mode: "signed" | "inline", createSignedUpload, publicUrl, signedUrl, putInline, getInline }
  async uploadInit(db, payload, ctx) {
    const target = authorizeUpload(db, ctx.user, payload);
    if (ctx.files.mode === "signed") {
      const up = await ctx.files.createSignedUpload(target.bucket, target.path);
      return { mode: "signed", path: target.path, signedUrl: up.signedUrl, publicUrl: target.public ? ctx.files.publicUrl(target.bucket, target.path) : null };
    }
    return { mode: "inline", path: target.path, public: target.public, token: await ctx.signUpload(target.path) };
  },

  async uploadInline(db, { path, token, dataUrl }, ctx) {
    requireUser(ctx);
    if (!(await ctx.verifyUpload(path, token))) fail("Fayl noto'g'ri", 403);
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:") || dataUrl.length > 6_000_000) fail("Fayl hajmi {max} MB dan oshmasligi kerak", 400, { max: 4 });
    await ctx.files.putInline(path, dataUrl);
    return { ok: true, path };
  },

  async fileUrl(db, { path }, ctx) {
    authorizeRead(db, ctx.user, path);
    const url = ctx.files.mode === "signed" ? await ctx.files.signedUrl("documents", path) : await ctx.files.getInline(path);
    if (!url) fail("Fayl topilmadi", 404);
    return { url };
  },

  // Ommaviy ma'lumotlar: sozlamalar, e'lon qilingan loyihalar, yangiliklar va statistika
  bootstrap(db, _p, ctx) {
    const projects = db.projects
      .filter((p) => PUBLIC_STATUSES.includes(p.status))
      .map((p) => stripHeavy(enrich(db, p)))
      .sort((a, b) => (a.status === "funding" ? 0 : 1) - (b.status === "funding" ? 0 : 1) || b.createdAt.localeCompare(a.createdAt));
    const a = analytics(db);
    return {
      settings: db.settings,
      paymentMethods: paymentMethods(db, ctx),
      features: { telegram: !!ctx.telegram?.bot, email: !!ctx.features?.email },
      projects,
      news: db.news.filter((n) => n.published).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30).map((n) => ({ ...n, body: n.body.slice(0, 400) })),
      stats: { projects: projects.length, farmers: a.farmers, investors: a.investors, totalRaised: a.totalRaised, completed: a.byStatus.completed || 0 },
    };
  },

  getProject(db, { id }, ctx) {
    const p = findProject(db, id);
    const u = ctx.user;
    const allowed = PUBLIC_STATUSES.includes(p.status) || (u && (u.role === "admin" || u.id === p.farmerId));
    if (!allowed) fail("Loyiha hali e'lon qilinmagan", 404);
    const out = enrich(db, p, { full: true });
    if (!canSeeProjectDocs(db, u, p)) delete out.docs;
    if (u) out.myInvestments = db.investments.filter((i) => i.projectId === p.id && i.investorId === u.id);
    return out;
  },

  getNews(db, { id }) {
    const n = db.news.find((x) => x.id === id && x.published) || fail("Yangilik topilmadi", 404);
    return { news: n };
  },

  // --- Autentifikatsiya -------------------------------------------------
  async register(db, { role, name, email, phone, password, farm, lang }, ctx) {
    if (!["investor", "farmer"].includes(role)) fail("Rolni tanlang: Investor yoki Fermer/dehqon");
    name = str(name, 120);
    email = str(email, 120).toLowerCase();
    phone = str(phone, 40);
    if (!name) fail("Ism-familiyani kiriting");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Email manzil noto'g'ri");
    if (!password || String(password).length < 6) fail("Parol kamida 6 belgidan iborat bo'lishi kerak");
    if (db.users.some((u) => u.email === email)) fail("Bu email bilan foydalanuvchi allaqachon ro'yxatdan o'tgan");
    const salt = uid("s");
    const user = {
      id: uid("u"), role, name, email, phone, salt,
      passHash: await ctx.hash(String(password), salt),
      balance: 0, blocked: false, verified: false, rating: null, lang: str(lang, 10) || "uz",
      farm: null, bank: null, docs: null, createdAt: now(), lastLoginAt: null,
    };
    if (role === "farmer") {
      user.farm = {
        name: str(farm?.name, 200), type: str(farm?.type, 100) || "Fermer xo'jaligi",
        region: str(farm?.region, 100), district: str(farm?.district, 100),
        area: Number(farm?.area) || 0, experience: Number(farm?.experience) || 0, inn: str(farm?.inn, 30),
        about: str(farm?.about, 2000),
      };
    }
    db.users.push(user);
    log(db, user.id, "register", `${role}: ${email}`);
    notifyAdmins(db, ctx, "Yangi foydalanuvchi", "{name} ({role}) ro'yxatdan o'tdi.", { name, role: role === "farmer" ? "Fermer / dehqon" : "Investor" }, "/admin/users");
    return { user: publicUser(user), token: await ctx.issueToken(user) };
  },

  async login(db, { email, password }, ctx) {
    email = str(email, 120).toLowerCase();
    const user = db.users.find((u) => u.email === email);
    if (!user || (await ctx.hash(String(password || ""), user.salt)) !== user.passHash) fail("Email yoki parol noto'g'ri", 401);
    if (user.blocked) fail("Hisobingiz bloklangan. Administrator bilan bog'laning", 403);
    user.lastLoginAt = now();
    log(db, user.id, "login", email);
    return { user: publicUser(user), token: await ctx.issueToken(user) };
  },

  me(db, _p, ctx) {
    const u = requireUser(ctx);
    return { user: publicUser(u), unread: db.notifications.filter((n) => n.userId === u.id && !n.read).length };
  },

  updateProfile(db, { name, phone, farm, bank, docs, lang }, ctx) {
    const u = requireUser(ctx);
    if (name !== undefined) u.name = str(name, 120) || u.name;
    if (phone !== undefined) u.phone = str(phone, 40);
    if (lang !== undefined) u.lang = str(lang, 10);
    if (farm && u.role === "farmer") {
      const f = u.farm || {};
      u.farm = {
        name: str(farm.name ?? f.name, 200), type: str(farm.type ?? f.type, 100),
        region: str(farm.region ?? f.region, 100), district: str(farm.district ?? f.district, 100),
        area: Number(farm.area ?? f.area) || 0, experience: Number(farm.experience ?? f.experience) || 0,
        inn: str(farm.inn ?? f.inn, 30), about: str(farm.about ?? f.about, 2000), address: str(farm.address ?? f.address, 300),
      };
    }
    if (bank) {
      u.bank = { holder: str(bank.holder, 120), bankName: str(bank.bankName, 120), account: str(bank.account, 40).replace(/\s/g, ""), mfo: str(bank.mfo, 10), card: str(bank.card, 30).replace(/\s/g, "") };
    }
    if (docs) {
      u.docs = { passport: str(docs.passport, 20).toUpperCase(), pinfl: str(docs.pinfl, 20), address: str(docs.address, 300), birthDate: str(docs.birthDate, 10) };
    }
    log(db, u.id, "update_profile");
    return { user: publicUser(u) };
  },

  async changePassword(db, { oldPassword, newPassword }, ctx) {
    const u = requireUser(ctx);
    if ((await ctx.hash(String(oldPassword || ""), u.salt)) !== u.passHash) fail("Joriy parol noto'g'ri");
    if (!newPassword || String(newPassword).length < 6) fail("Yangi parol kamida 6 belgi");
    u.salt = uid("s");
    u.passHash = await ctx.hash(String(newPassword), u.salt);
    log(db, u.id, "change_password");
    return { ok: true };
  },

  // --- Parolni tiklash (email orqali) ---------------------------------------
  async forgotPassword(db, { email }, ctx) {
    email = str(email, 120).toLowerCase();
    const u = db.users.find((x) => x.email === email && !x.blocked);
    // Foydalanuvchi bor-yo'qligini oshkor qilmaslik uchun javob har doim bir xil
    if (u && (!u.resetRequestedAt || Date.now() - Date.parse(u.resetRequestedAt) > 60_000)) {
      const token = randomToken();
      u.resetHash = await ctx.hash(token, "reset:" + u.id);
      u.resetExp = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      u.resetRequestedAt = now();
      ctx.outbox?.push({
        to: u.email, telegramChatId: null, lang: u.lang || "uz", name: u.name, button: "Parolni tiklash",
        title: "Parolni tiklash", body: "Parolingizni tiklash uchun quyidagi tugmani bosing. Havola 1 soat amal qiladi. Agar siz so'ramagan bo'lsangiz, bu xatni e'tiborsiz qoldiring.",
        params: {}, link: `/reset?email=${encodeURIComponent(u.email)}&token=${token}`,
      });
      log(db, u.id, "password_reset_request", email);
    }
    return { ok: true };
  },

  async resetPassword(db, { email, token, password }, ctx) {
    email = str(email, 120).toLowerCase();
    const u = db.users.find((x) => x.email === email);
    const bad = () => fail("Havola noto'g'ri yoki muddati o'tgan. Qaytadan so'rov yuboring");
    if (!u || !u.resetHash || !token || !u.resetExp || Date.parse(u.resetExp) < Date.now()) bad();
    if ((await ctx.hash(String(token), "reset:" + u.id)) !== u.resetHash) bad();
    if (!password || String(password).length < 6) fail("Parol kamida 6 belgidan iborat bo'lishi kerak");
    u.salt = uid("s");
    u.passHash = await ctx.hash(String(password), u.salt);
    u.resetHash = null;
    u.resetExp = null;
    log(db, u.id, "password_reset", email);
    return { ok: true };
  },

  // --- Telegram ----------------------------------------------------------
  telegramLink(db, _p, ctx) {
    const u = requireUser(ctx);
    if (!ctx.telegram?.bot) fail("Telegram bot hali ulanmagan");
    u.tgCode = randomToken(12);
    u.tgCodeExp = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    return { url: `https://t.me/${ctx.telegram.bot}?start=${u.tgCode}` };
  },

  telegramUnlink(db, _p, ctx) {
    const u = requireUser(ctx);
    u.telegramChatId = null;
    return { user: publicUser(u) };
  },

  // --- Loyiha hujjatlari -------------------------------------------------
  addProjectDoc(db, { projectId, file, title }, ctx) {
    const u = requireUser(ctx, ["farmer", "admin"]);
    const p = findProject(db, projectId);
    if (u.role !== "admin" && p.farmerId !== u.id) fail("Bu loyiha sizga tegishli emas", 403);
    p.docs = Array.isArray(p.docs) ? p.docs : [];
    if (p.docs.length >= 20) fail("Hujjatlar soni 20 tadan oshmasligi kerak");
    const ref = fileRef(file, `projects/${p.id}/`);
    ref.title = str(title, 200) || ref.name;
    ref.uploadedBy = u.id;
    p.docs.push(ref);
    if (u.role === "farmer" && p.status === "pending") notifyAdmins(db, ctx, "Loyihaga hujjat qo'shildi", "«{project}»: {title}", { project: p.title, title: ref.title }, "/admin/review");
    log(db, u.id, "add_project_doc", `${p.title}: ${ref.title}`);
    return { docs: p.docs };
  },

  removeProjectDoc(db, { projectId, path }, ctx) {
    const u = requireUser(ctx, ["farmer", "admin"]);
    const p = findProject(db, projectId);
    if (u.role !== "admin" && (p.farmerId !== u.id || !["pending", "rejected"].includes(p.status))) fail("E'lon qilingan loyihani faqat administrator o'zgartira oladi");
    p.docs = (p.docs || []).filter((d) => d.path !== path);
    log(db, u.id, "remove_project_doc", p.title);
    return { docs: p.docs };
  },

  // --- Bildirishnomalar ---------------------------------------------------
  notifications(db, _p, ctx) {
    const u = requireUser(ctx);
    const list = db.notifications.filter((n) => n.userId === u.id).slice(0, 50);
    return { notifications: list, unread: list.filter((n) => !n.read).length };
  },

  markNotificationsRead(db, { ids }, ctx) {
    const u = requireUser(ctx);
    for (const n of db.notifications) if (n.userId === u.id && (!ids || ids.includes(n.id))) n.read = true;
    return { ok: true };
  },

  // --- To'lovlar (hisobni to'ldirish) --------------------------------------
  // method: bank | payme | click | test
  createPayment(db, { method, amount, returnUrl }, ctx) {
    const u = requireUser(ctx, ["investor"]);
    amount = round(amount);
    if (amount < 1000 || amount > 10_000_000_000) fail("Summa noto'g'ri");
    const methods = paymentMethods(db, ctx);
    if (!methods[method]) fail("Bu to'lov usuli hozircha mavjud emas");
    const p = { id: uid("pay"), userId: u.id, method, amount, status: "pending", receipt: null, provider: null, providerTxId: null, note: "", adminNote: "", createdAt: now(), paidAt: null };
    db.payments.unshift(p);
    if (method === "test") {
      creditPayment(db, p, ctx, "Test to'lov");
      return { payment: p, user: publicUser(u) };
    }
    const out = { payment: p };
    if (method === "payme" || method === "click" || method === "uzum") out.redirectUrl = ctx.payments.checkoutUrl(method, p, str(returnUrl, 500));
    if (method === "bank") out.bank = db.settings.bank;
    log(db, u.id, "create_payment", `${method}: ${amount}`);
    return out;
  },

  attachReceipt(db, { paymentId, file }, ctx) {
    const u = requireUser(ctx, ["investor"]);
    const p = findIn(db.payments, paymentId, "To'lov topilmadi");
    if (p.userId !== u.id) fail("Bu amal uchun ruxsat yo'q", 403);
    if (p.method !== "bank" || !["pending", "review", "rejected"].includes(p.status)) fail("Bu to'lovga chek biriktirib bo'lmaydi");
    p.receipt = fileRef(file, `receipts/${p.id}/`);
    p.status = "review";
    notifyAdmins(db, ctx, "Yangi to'lov cheki", "{name}: {amount} so'm — chekni tekshiring.", { name: u.name, amount: p.amount }, "/admin/payments");
    log(db, u.id, "attach_receipt", p.id);
    return { payment: p };
  },

  cancelPayment(db, { paymentId }, ctx) {
    const u = requireUser(ctx);
    const p = findIn(db.payments, paymentId, "To'lov topilmadi");
    if (p.userId !== u.id && u.role !== "admin") fail("Bu amal uchun ruxsat yo'q", 403);
    if (!["pending", "review"].includes(p.status)) fail("Bu to'lovni bekor qilib bo'lmaydi");
    if (p.provider?.state === 1) fail("To'lov tizimida jarayon davom etmoqda");
    p.status = "cancelled";
    return { payment: p };
  },

  myPayments(db, _p, ctx) {
    const u = requireUser(ctx);
    return {
      payments: db.payments.filter((p) => p.userId === u.id).slice(0, 50),
      withdrawals: db.withdrawals.filter((w) => w.userId === u.id).slice(0, 50),
    };
  },

  // --- Mablag' yechish (so'rov → administrator o'tkazadi) -----------------
  requestWithdrawal(db, { amount }, ctx) {
    const u = requireUser(ctx, ["investor", "farmer"]);
    amount = round(amount);
    if (amount < 1000) fail("Summa noto'g'ri");
    if (amount > (u.balance || 0)) fail("Hisobda mablag' yetarli emas");
    if (!u.bank?.card && !u.bank?.account) fail("Avval profilingizda bank rekvizitlari yoki karta raqamini kiriting");
    u.balance = round(u.balance - amount);
    const w = { id: uid("w"), userId: u.id, amount, status: "pending", bank: { ...u.bank }, adminNote: "", createdAt: now(), processedAt: null };
    db.withdrawals.unshift(w);
    tx(db, u.id, "withdraw", amount, null, "Mablag' yechish so'rovi");
    notifyAdmins(db, ctx, "Mablag' yechish so'rovi", "{name}: {amount} so'm", { name: u.name, amount }, "/admin/payments");
    log(db, u.id, "withdraw_request", String(amount));
    return { withdrawal: w, user: publicUser(u) };
  },

  // --- Investor ---------------------------------------------------------
  invest(db, { projectId, amount }, ctx) {
    const u = requireUser(ctx, ["investor"]);
    const p = findProject(db, projectId);
    if (p.status !== "funding") fail("Bu loyihaga hozir investitsiya qabul qilinmaydi");
    const today = new Date().toISOString().slice(0, 10);
    if (p.fundingDeadline && p.fundingDeadline < today) fail("Loyihaning moliyalashtirish muddati tugagan");
    amount = round(amount);
    const remaining = p.goal - p.raised;
    const min = Math.min(db.settings.minInvestment, remaining);
    if (amount < min) fail("Minimal investitsiya: {amount} so'm", 400, { amount: min });
    if (amount > remaining) fail("Loyihaga yana {amount} so'm kerak — undan ortiq kiritib bo'lmaydi", 400, { amount: remaining });
    if (amount > (u.balance || 0)) fail("Hisobingizda mablag' yetarli emas. Avval hisobni to'ldiring");
    u.balance = round(u.balance - amount);
    p.raised = round(p.raised + amount);
    const inv = { id: uid("i"), projectId: p.id, investorId: u.id, amount, status: "active", payout: 0, createdAt: now() };
    db.investments.push(inv);
    tx(db, u.id, "invest", amount, p.id, `Investitsiya: ${p.title}`);
    log(db, u.id, "invest", `${p.title}: ${amount}`);
    if (p.raised >= p.goal) markFunded(db, p, ctx);
    return { investment: inv, user: publicUser(u), project: stripHeavy(enrich(db, p)) };
  },

  investorDashboard(db, _p, ctx) {
    const u = requireUser(ctx, ["investor"]);
    const investments = db.investments
      .filter((i) => i.investorId === u.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((i) => {
        const p = db.projects.find((x) => x.id === i.projectId);
        if (!p) return { ...i, project: null };
        const share = p.goal ? i.amount / p.goal : 0;
        const expectedIncome = round(p.expectedRevenue * (p.investorShare / 100) * (1 - db.settings.commission / 100) * share);
        return { ...i, sharePercent: Math.round(share * 10000) / 100, expectedIncome, project: stripHeavy(enrich(db, p)) };
      });
    const active = investments.filter((i) => i.status === "active");
    const contracts = db.contracts.filter((c) => c.investorId === u.id);
    return {
      user: publicUser(u),
      investments,
      transactions: db.transactions.filter((t) => t.userId === u.id).slice(0, 100),
      contractsAction: contracts.filter((c) => !c.investorFile && c.status !== "verified").length,
      summary: {
        balance: u.balance || 0,
        invested: active.reduce((s, i) => s + i.amount, 0),
        expectedIncome: active.reduce((s, i) => s + i.expectedIncome, 0),
        received: investments.reduce((s, i) => s + (i.payout || 0), 0),
        projects: new Set(active.map((i) => i.projectId)).size,
      },
    };
  },

  // --- Shartnomalar -----------------------------------------------------
  myContracts(db, _p, ctx) {
    const u = requireUser(ctx, ["investor", "farmer"]);
    const list = db.contracts.filter((c) => c.investorId === u.id || c.farmerId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { contracts: list.map((c) => enrichContract(db, c)) };
  },

  submitContractFile(db, { contractId, file }, ctx) {
    const u = requireUser(ctx, ["investor", "farmer"]);
    const c = findIn(db.contracts, contractId, "Shartnoma topilmadi");
    const side = c.investorId === u.id ? "investor" : c.farmerId === u.id ? "farmer" : fail("Bu shartnoma sizga tegishli emas", 403);
    if (c.status === "verified") fail("Shartnoma allaqachon tasdiqlangan");
    c[`${side}File`] = fileRef(file, `contracts/${c.id}/${side}-`);
    c.status = contractStatus(c);
    const p = db.projects.find((x) => x.id === c.projectId);
    const other = side === "investor" ? c.farmerId : c.investorId;
    notify(db, ctx, other, "Shartnoma imzolandi", "{name} «{project}» bo'yicha {number}-sonli shartnomani imzoladi.", { name: u.name, project: p?.title, number: c.number }, "/cabinet/contracts");
    if (c.status === "signed") notifyAdmins(db, ctx, "Shartnoma tekshiruvga tayyor", "{number}-sonli shartnoma ikki tomon tomonidan imzolandi.", { number: c.number }, "/admin/contracts");
    log(db, u.id, "sign_contract", `${c.number} (${side})`);
    return { contract: enrichContract(db, c) };
  },

  // --- Fermer -----------------------------------------------------------
  createProject(db, payload, ctx) {
    const u = requireUser(ctx, ["farmer", "admin"]);
    const data = sanitizeProject(payload);
    validateProject(data, db.settings);
    let farmerId = u.id;
    if (u.role === "admin") {
      const f = findUser(db, payload.farmerId);
      if (!f || f.role !== "farmer") fail("Fermer topilmadi");
      farmerId = f.id;
    }
    const p = {
      id: uid("p"), farmerId, ...data, raised: 0,
      status: u.role === "admin" && payload.publish ? "funding" : "pending",
      adminNote: "", featured: false, contractTemplate: null, docs: [], distribution: null, actualRevenue: null,
      createdAt: now(), submittedAt: now(), approvedAt: null, fundedAt: null, disbursedAt: null, refundedAt: null, completedAt: null,
    };
    if (p.status === "funding") p.approvedAt = now();
    db.projects.push(p);
    log(db, u.id, "create_project", p.title);
    if (p.status === "pending") notifyAdmins(db, ctx, "Yangi loyiha tekshiruvga yuborildi", "«{project}» — {name}", { project: p.title, name: u.name }, "/admin/review");
    return { project: p };
  },

  updateProject(db, { id, ...payload }, ctx) {
    const u = requireUser(ctx, ["farmer"]);
    const p = findProject(db, id);
    if (p.farmerId !== u.id) fail("Bu loyiha sizga tegishli emas", 403);
    if (!["pending", "rejected"].includes(p.status)) fail("E'lon qilingan loyihani faqat administrator o'zgartira oladi");
    Object.assign(p, sanitizeProject(payload));
    validateProject(p, db.settings);
    p.status = "pending";
    p.submittedAt = now();
    log(db, u.id, "update_project", p.title);
    notifyAdmins(db, ctx, "Loyiha qayta yuborildi", "«{project}» — {name}", { project: p.title, name: u.name }, "/admin/review");
    return { project: p };
  },

  farmerDashboard(db, _p, ctx) {
    const u = requireUser(ctx, ["farmer"]);
    const projects = db.projects
      .filter((p) => p.farmerId === u.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => ({ ...stripHeavy(enrich(db, p, { full: true })), docs: p.docs || [] }));
    const contracts = db.contracts.filter((c) => c.farmerId === u.id);
    return {
      user: publicUser(u),
      projects,
      transactions: db.transactions.filter((t) => t.userId === u.id).slice(0, 100),
      contractsAction: contracts.filter((c) => !c.farmerFile && c.status !== "verified").length,
      summary: {
        balance: u.balance || 0,
        projects: projects.length,
        active: projects.filter((p) => ["funding", "funded", "in_progress", "harvest"].includes(p.status)).length,
        raised: projects.filter((p) => p.status !== "refunded").reduce((s, p) => s + p.raised, 0),
        pending: projects.filter((p) => p.status === "pending").length,
      },
    };
  },

  farmerProject(db, { id }, ctx) {
    const u = requireUser(ctx, ["farmer"]);
    const p = findProject(db, id);
    if (p.farmerId !== u.id) fail("Bu loyiha sizga tegishli emas", 403);
    return { project: p };
  },

  // Monitoring: foto / video / loyiha holati
  addUpdate(db, { projectId, title, text, stage, images, video }, ctx) {
    const u = requireUser(ctx, ["farmer", "admin"]);
    const p = findProject(db, projectId);
    if (u.role === "farmer" && p.farmerId !== u.id) fail("Bu loyiha sizga tegishli emas", 403);
    if (u.role === "farmer" && !MONITOR_STATUSES.includes(p.status)) fail("Monitoring faqat moliyalashtirilgan loyihalar uchun qo'shiladi");
    const upd = {
      id: uid("m"), projectId: p.id, authorId: u.id, authorRole: u.role,
      title: str(title, 200) || "Loyiha holati", text: str(text, 5000), stage: str(stage, 100),
      images: (Array.isArray(images) ? images : []).map((x) => safeImg(x, 600000)).filter(Boolean).slice(0, 6),
      video: str(video, 500), createdAt: now(),
    };
    if (!upd.text && !upd.images.length && !upd.video) fail("Matn, foto yoki video qo'shing");
    db.updates.push(upd);
    if (u.role === "farmer" && p.status === "funded") p.status = "in_progress";
    const investors = new Set(db.investments.filter((i) => i.projectId === p.id && i.status === "active").map((i) => i.investorId));
    investors.forEach((id) => notify(db, ctx, id, "Yangi monitoring ma'lumoti", "«{project}»: {title}", { project: p.title, title: upd.title }, `/project/${p.id}`));
    log(db, u.id, "add_update", `${p.title}: ${upd.title}`);
    return { update: upd };
  },

  // --- Aloqa ------------------------------------------------------------
  sendMessage(db, { name, email, phone, subject, body }, ctx) {
    const m = {
      id: uid("msg"), userId: ctx.user?.id || null, name: str(name, 120), email: str(email, 120), phone: str(phone, 40),
      subject: str(subject, 200), body: str(body, 5000), status: "new", adminNote: "", createdAt: now(),
    };
    if (!m.name || !m.body || (!m.email && !m.phone)) fail("Ism, aloqa ma'lumoti va xabar matnini kiriting");
    if (db.messages.filter((x) => x.createdAt > new Date(Date.now() - 36e5).toISOString() && x.email === m.email && m.email).length > 5) fail("Juda ko'p xabar yuborildi. Keyinroq urinib ko'ring", 429);
    db.messages.unshift(m);
    notifyAdmins(db, ctx, "Yangi xabar", "{name}: {subject}", { name: m.name, subject: m.subject || "—" }, "/admin/messages");
    return { ok: true };
  },

  // --- Administrator ----------------------------------------------------
  adminData(db, _p, ctx) {
    requireUser(ctx, ["admin"]);
    return {
      settings: db.settings,
      analytics: analytics(db),
      users: db.users.map(publicUser),
      projects: db.projects.map((p) => ({ ...stripHeavy(enrich(db, p)), docs: p.docs || [] })),
      investments: db.investments,
      updates: db.updates.map((u) => ({ ...u, images: u.images.length })),
      transactions: db.transactions.slice(0, 1000),
      logs: db.logs.slice(0, 500),
      contracts: db.contracts.map((c) => enrichContract(db, c)),
      payments: db.payments.slice(0, 1000),
      withdrawals: db.withdrawals.slice(0, 1000),
      news: db.news,
      messages: db.messages.slice(0, 500),
    };
  },

  reviewProject(db, { id, decision, note }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const p = findProject(db, id);
    if (!["pending", "rejected"].includes(p.status)) fail("Loyiha tekshiruv bosqichida emas");
    if (decision === "approve") {
      p.status = "funding";
      p.approvedAt = now();
      notify(db, ctx, p.farmerId, "Loyihangiz tasdiqlandi", "«{project}» tekshiruvdan o'tdi va investorlar uchun e'lon qilindi.", { project: p.title }, `/project/${p.id}`);
    } else if (decision === "reject") {
      p.status = "rejected";
      notify(db, ctx, p.farmerId, "Loyiha rad etildi", "«{project}»: {note}", { project: p.title, note: str(note, 500) }, "/cabinet/projects");
    } else fail("Qaror noto'g'ri");
    p.adminNote = str(note, 2000);
    log(db, a.id, "review_project", `${p.title}: ${decision}`);
    return { project: p };
  },

  adminUpdateProject(db, { id, ...payload }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const p = findProject(db, id);
    const data = sanitizeProject(payload);
    if ("goal" in data && data.goal < p.raised) fail("Kerakli mablag' yig'ilgan summadan kam bo'lishi mumkin emas");
    Object.assign(p, data);
    if ("adminNote" in payload) p.adminNote = str(payload.adminNote, 2000);
    if ("featured" in payload) p.featured = !!payload.featured;
    if (payload.farmerId && payload.farmerId !== p.farmerId) {
      if (p.raised > 0) fail("Mablag' kiritilgan loyihaning fermerini o'zgartirib bo'lmaydi");
      const f = findUser(db, payload.farmerId);
      if (!f || f.role !== "farmer") fail("Fermer topilmadi");
      p.farmerId = f.id;
    }
    if (p.status === "funding" && p.raised >= p.goal && p.goal > 0) markFunded(db, p, ctx);
    log(db, a.id, "admin_update_project", p.title);
    return { project: p };
  },

  setProjectStatus(db, { id, status }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const p = findProject(db, id);
    const allowed = { funded: ["in_progress"], in_progress: ["harvest"], rejected: ["pending"], pending: ["rejected"] };
    if (status === "refunded") {
      if (p.status !== "funding") fail("Faqat mablag' yig'ilayotgan loyihani bekor qilib, mablag'ni qaytarish mumkin");
      refundProject(db, p, "Administrator qarori bilan loyiha bekor qilindi — mablag' qaytarildi", ctx);
    } else {
      if (!(allowed[p.status] || []).includes(status)) fail("Loyiha holatini bunday o'zgartirib bo'lmaydi");
      p.status = status;
      if (["in_progress", "harvest"].includes(status)) {
        const investors = new Set(db.investments.filter((i) => i.projectId === p.id && i.status === "active").map((i) => i.investorId));
        investors.forEach((uid_) => notify(db, ctx, uid_, "Loyiha holati yangilandi", "«{project}»: {status}", { project: p.title, status: STATUSES[status].label }, `/project/${p.id}`));
      }
    }
    log(db, a.id, "set_status", `${p.title}: ${status}`);
    return { project: p };
  },

  setProjectTemplate(db, { id, file }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const p = findProject(db, id);
    p.contractTemplate = file ? fileRef(file, `templates/${p.id}/`) : null;
    log(db, a.id, "set_template", p.title);
    return { project: p };
  },

  setGlobalTemplate(db, { file }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    db.settings.contractTemplate = file ? fileRef(file, "templates/global/") : null;
    log(db, a.id, "set_template", "global");
    return { settings: db.settings };
  },

  // Administrator shartnomani tekshiradi: tasdiqlash yoki bir tomon faylini rad etish
  reviewContract(db, { id, decision, side, note }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const c = findIn(db.contracts, id, "Shartnoma topilmadi");
    const p = db.projects.find((x) => x.id === c.projectId);
    if (decision === "verify") {
      if (!c.investorFile || !c.farmerFile) fail("Ikkala tomon ham imzolangan nusxani yuklashi kerak");
      c.status = "verified";
      c.verifiedAt = now();
      c.adminNote = str(note, 1000);
      for (const uid_ of [c.investorId, c.farmerId]) notify(db, ctx, uid_, "Shartnoma tasdiqlandi", "{number}-sonli shartnoma administrator tomonidan tasdiqlandi.", { number: c.number }, "/cabinet/contracts");
      const all = db.contracts.filter((x) => x.projectId === c.projectId);
      if (p && all.every((x) => x.status === "verified")) releaseFunds(db, p, ctx);
    } else if (decision === "reject") {
      if (!["investor", "farmer", "both"].includes(side)) fail("Qaror noto'g'ri");
      if (!str(note)) fail("Rad etish sababini izohda yozing");
      const sides = side === "both" ? ["investor", "farmer"] : [side];
      for (const s of sides) {
        c[`${s}File`] = null;
        notify(db, ctx, c[`${s}Id`], "Shartnoma qayta yuklanishi kerak", "{number}-sonli shartnoma: {note}", { number: c.number, note: str(note, 500) }, "/cabinet/contracts");
      }
      c.status = "awaiting";
      c.status = contractStatus(c);
      c.adminNote = str(note, 1000);
    } else fail("Qaror noto'g'ri");
    log(db, a.id, "review_contract", `${c.number}: ${decision}`);
    return { contract: enrichContract(db, c) };
  },

  // Mablag'ni fermerga ajratish (odatda barcha shartnomalar tasdiqlanganda avtomatik)
  releaseFunds(db, { id, force }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const p = findProject(db, id);
    if (!["funded", "in_progress", "harvest"].includes(p.status)) fail("Loyiha moliyalashtirilmagan");
    if (p.disbursedAt) fail("Mablag' allaqachon ajratilgan");
    const pending = db.contracts.filter((x) => x.projectId === p.id && x.status !== "verified").length;
    if (pending && !force) fail("{count} ta shartnoma hali tasdiqlanmagan", 400, { count: pending });
    releaseFunds(db, p, ctx);
    log(db, a.id, "release_funds", `${p.title}${force ? " (force)" : ""}`);
    return { project: p };
  },

  // Hosil → Sotish → Daromad → Investorlar va fermer o'rtasida taqsimlash
  distribute(db, { id, actualRevenue, note }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const p = findProject(db, id);
    if (!["funded", "in_progress", "harvest"].includes(p.status)) fail("Daromad faqat amalga oshirilgan loyiha bo'yicha taqsimlanadi");
    if (!p.disbursedAt) fail("Avval loyiha mablag'i fermerga ajratilishi kerak");
    actualRevenue = round(actualRevenue);
    if (actualRevenue <= 0) fail("Hosil realizatsiyasidan tushgan daromadni kiriting");
    const investorPool = round(actualRevenue * (p.investorShare / 100));
    const commission = round(investorPool * (db.settings.commission / 100));
    const toInvestors = investorPool - commission;
    const farmerPart = actualRevenue - investorPool;
    const invs = db.investments.filter((i) => i.projectId === p.id && i.status === "active");
    const total = invs.reduce((s, i) => s + i.amount, 0) || 1;
    let distributed = 0;
    invs.forEach((inv, idx) => {
      const amt = idx === invs.length - 1 ? toInvestors - distributed : round((toInvestors * inv.amount) / total);
      distributed += amt;
      inv.payout = amt;
      inv.status = "paid";
      const investor = findUser(db, inv.investorId);
      if (investor) {
        investor.balance = round((investor.balance || 0) + amt);
        tx(db, investor.id, "payout", amt, p.id, `Daromad ulushi: ${p.title}`);
        notify(db, ctx, investor.id, "Daromad taqsimlandi", "«{project}» bo'yicha {amount} so'm hisobingizga o'tkazildi.", { project: p.title, amount: amt }, "/cabinet/transactions");
      }
    });
    tx(db, null, "commission", commission, p.id, `Platforma komissiyasi: ${p.title}`);
    p.actualRevenue = actualRevenue;
    p.distribution = { investorPool, commission, toInvestors, farmerPart, note: str(note, 1000), at: now() };
    p.status = "completed";
    p.completedAt = now();
    notify(db, ctx, p.farmerId, "Loyiha yakunlandi", "«{project}» bo'yicha daromad taqsimlandi.", { project: p.title }, "/cabinet/projects");
    log(db, a.id, "distribute", `${p.title}: ${actualRevenue}`);
    return { project: p };
  },

  deleteProject(db, { id }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const p = findProject(db, id);
    if (db.investments.some((i) => i.projectId === id)) fail("Investitsiyasi bor loyihani o'chirib bo'lmaydi");
    db.projects = db.projects.filter((x) => x.id !== id);
    db.updates = db.updates.filter((x) => x.projectId !== id);
    log(db, a.id, "delete_project", p.title);
    return { ok: true };
  },

  deleteUpdate(db, { id }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    db.updates = db.updates.filter((x) => x.id !== id);
    log(db, a.id, "delete_update", id);
    return { ok: true };
  },

  // To'lovni tasdiqlash / rad etish (bank o'tkazmasi)
  reviewPayment(db, { id, decision, note }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const p = findIn(db.payments, id, "To'lov topilmadi");
    if (!["pending", "review"].includes(p.status)) fail("Bu to'lov allaqachon ko'rib chiqilgan");
    if (p.method !== "bank") fail("Onlayn to'lovlar to'lov tizimi orqali avtomatik tasdiqlanadi");
    p.adminNote = str(note, 500);
    if (decision === "approve") creditPayment(db, p, ctx, "Bank o'tkazmasi tasdiqlandi");
    else if (decision === "reject") {
      p.status = "rejected";
      notify(db, ctx, p.userId, "To'lov tasdiqlanmadi", "{amount} so'm: {note}", { amount: p.amount, note: p.adminNote || "—" }, "/cabinet/transactions");
    } else fail("Qaror noto'g'ri");
    log(db, a.id, "review_payment", `${p.id}: ${decision}`);
    return { payment: p };
  },

  reviewWithdrawal(db, { id, decision, note }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const w = findIn(db.withdrawals, id, "So'rov topilmadi");
    if (w.status !== "pending") fail("Bu so'rov allaqachon ko'rib chiqilgan");
    w.adminNote = str(note, 500);
    w.processedAt = now();
    if (decision === "paid") {
      w.status = "paid";
      notify(db, ctx, w.userId, "Mablag' o'tkazildi", "{amount} so'm bank rekvizitlaringizga o'tkazildi.", { amount: w.amount }, "/cabinet/transactions");
    } else if (decision === "reject") {
      w.status = "rejected";
      const u = findUser(db, w.userId);
      if (u) {
        u.balance = round((u.balance || 0) + w.amount);
        tx(db, u.id, "refund", w.amount, null, "Yechish so'rovi rad etildi — mablag' qaytarildi");
      }
      notify(db, ctx, w.userId, "Yechish so'rovi rad etildi", "{amount} so'm: {note}", { amount: w.amount, note: w.adminNote || "—" }, "/cabinet/transactions");
    } else fail("Qaror noto'g'ri");
    log(db, a.id, "review_withdrawal", `${w.id}: ${decision}`);
    return { withdrawal: w };
  },

  async adminCreateUser(db, payload, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const role = payload.role;
    if (!["investor", "farmer", "admin"].includes(role)) fail("Rol noto'g'ri");
    const res = await ACTIONS.register(db, { ...payload, role: role === "admin" ? "investor" : role }, { ...ctx, outbox: [] });
    const u = findUser(db, res.user.id);
    u.role = role;
    u.verified = true;
    log(db, a.id, "admin_create_user", u.email);
    return { user: publicUser(u) };
  },

  async adminUpdateUser(db, { id, name, phone, role, blocked, verified, rating, balanceAdjust, note, password, farm }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const u = findUser(db, id) || fail("Foydalanuvchi topilmadi", 404);
    if (name !== undefined) u.name = str(name, 120) || u.name;
    if (phone !== undefined) u.phone = str(phone, 40);
    if (role !== undefined && role !== u.role) {
      if (u.id === a.id) fail("O'z rolingizni o'zgartira olmaysiz");
      if (!["investor", "farmer", "admin"].includes(role)) fail("Rol noto'g'ri");
      u.role = role;
    }
    if (blocked !== undefined) {
      if (u.id === a.id && blocked) fail("O'zingizni bloklay olmaysiz");
      u.blocked = !!blocked;
    }
    if (verified !== undefined) u.verified = !!verified;
    if (rating !== undefined) u.rating = rating === null || rating === "" ? null : Math.max(0, Math.min(5, Number(rating)));
    if (farm && u.role === "farmer") u.farm = { ...u.farm, ...farm, area: Number(farm.area ?? u.farm?.area) || 0, experience: Number(farm.experience ?? u.farm?.experience) || 0 };
    if (balanceAdjust) {
      const amt = round(balanceAdjust);
      if ((u.balance || 0) + amt < 0) fail("Balans manfiy bo'lib qolmaydi");
      u.balance = round((u.balance || 0) + amt);
      tx(db, u.id, "adjust", amt, null, str(note, 300) || "Administrator tuzatishi");
    }
    if (password) {
      if (String(password).length < 6) fail("Parol kamida 6 belgidan iborat bo'lishi kerak");
      u.salt = uid("s");
      u.passHash = await ctx.hash(String(password), u.salt);
    }
    log(db, a.id, "admin_update_user", u.email);
    return { user: publicUser(u) };
  },

  deleteUser(db, { id }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    if (id === a.id) fail("O'zingizni o'chira olmaysiz");
    const u = findUser(db, id) || fail("Foydalanuvchi topilmadi", 404);
    const busy = db.investments.some((i) => i.investorId === id) || db.projects.some((p) => p.farmerId === id) ||
      db.payments.some((p) => p.userId === id) || db.withdrawals.some((w) => w.userId === id) || db.transactions.some((t) => t.userId === id);
    if (busy) fail("Loyiha yoki moliyaviy operatsiyasi bor foydalanuvchini o'chirib bo'lmaydi — uni bloklang");
    db.users = db.users.filter((x) => x.id !== id);
    db.notifications = db.notifications.filter((n) => n.userId !== id);
    log(db, a.id, "delete_user", u.email);
    return { ok: true };
  },

  // Barcha demo ma'lumotlarni (seed) o'chirish — sayt haqiqiy ishga tushganda
  purgeDemo(db, _p, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const users = new Set(DEMO_USER_IDS);
    const projects = new Set(db.projects.filter((p) => DEMO_PROJECT_IDS.includes(p.id) || users.has(p.farmerId)).map((p) => p.id));
    const before = COLLECTIONS.reduce((s, c) => s + db[c].length, 0);
    const byUser = (x) => users.has(x.userId) || users.has(x.investorId) || users.has(x.farmerId);
    db.users = db.users.filter((u) => !users.has(u.id));
    db.projects = db.projects.filter((p) => !projects.has(p.id));
    for (const c of ["investments", "updates", "contracts", "transactions"]) db[c] = db[c].filter((x) => !projects.has(x.projectId) && !byUser(x));
    for (const c of ["payments", "withdrawals", "notifications", "messages"]) db[c] = db[c].filter((x) => !byUser(x));
    db.news = db.news.filter((n) => !DEMO_NEWS_TITLES.includes(n.title));
    db.logs = db.logs.filter((l) => !users.has(l.userId));
    db.settings.testPayments = false;
    db.settings.showDemoLogins = false;
    if (db.settings.bank?.account === DEMO_BANK.account) db.settings.bank = { ...DEFAULT_SETTINGS.bank };
    const removed = before - COLLECTIONS.reduce((s, c) => s + db[c].length, 0);
    log(db, a.id, "purge_demo", String(removed));
    return { removed };
  },

  // Yangiliklar
  saveNews(db, { id, title, body, image, published }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    title = str(title, 300);
    if (!title) fail("Sarlavhani kiriting");
    let n = id ? findIn(db.news, id, "Yangilik topilmadi") : null;
    if (!n) {
      n = { id: uid("news"), authorId: a.id, createdAt: now() };
      db.news.unshift(n);
    }
    Object.assign(n, { title, body: str(body, 20000), image: safeImg(image, 600000), published: !!published, updatedAt: now() });
    log(db, a.id, "save_news", title);
    return { news: n };
  },

  deleteNews(db, { id }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    db.news = db.news.filter((n) => n.id !== id);
    log(db, a.id, "delete_news", id);
    return { ok: true };
  },

  updateMessage(db, { id, status, adminNote }, ctx) {
    requireUser(ctx, ["admin"]);
    const m = findIn(db.messages, id, "Xabar topilmadi");
    if (status) m.status = ["new", "read", "answered"].includes(status) ? status : m.status;
    if (adminNote !== undefined) m.adminNote = str(adminNote, 2000);
    return { message: m };
  },

  // Bir nechta foydalanuvchiga xabar yuborish
  broadcast(db, { role, title, body }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    title = str(title, 200);
    body = str(body, 2000);
    if (!title) fail("Sarlavhani kiriting");
    const targets = db.users.filter((u) => !u.blocked && (!role || u.role === role));
    targets.forEach((u) => notify(db, ctx, u.id, "{title}", "{body}", { title, body }, ""));
    log(db, a.id, "broadcast", `${role || "all"}: ${title}`);
    return { count: targets.length };
  },

  updateSettings(db, payload, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const s = db.settings;
    if ("commission" in payload) s.commission = Math.max(0, Math.min(50, Number(payload.commission) || 0));
    if ("minInvestment" in payload) s.minInvestment = Math.max(1000, round(payload.minInvestment));
    if ("testPayments" in payload) s.testPayments = !!payload.testPayments;
    if ("showStats" in payload) s.showStats = !!payload.showStats;
    if ("showDemoLogins" in payload) s.showDemoLogins = !!payload.showDemoLogins;
    for (const k of ["contactPhone", "contactEmail", "address", "telegram"]) if (k in payload) s[k] = str(payload[k], 300);
    if ("heroImage" in payload) s.heroImage = safeImg(payload.heroImage);
    if (payload.bank) s.bank = { ...s.bank, ...Object.fromEntries(Object.entries(payload.bank).map(([k, v]) => [k, str(v, 300)])) };
    if (payload.content) {
      for (const l of ["uz", "ru", "en"]) {
        if (!payload.content[l]) continue;
        s.content[l] = { ...s.content[l] };
        for (const k of ["heroBadge", "heroTitle", "heroSubtitle", "about"]) if (k in payload.content[l]) s.content[l][k] = str(payload.content[l][k], 10000);
      }
    }
    for (const k of ["regions", "crops"]) {
      if (k in payload) {
        const list = (Array.isArray(payload[k]) ? payload[k] : String(payload[k]).split("\n")).map((x) => str(x, 100)).filter(Boolean);
        if (list.length) s[k] = [...new Set(list)];
      }
    }
    log(db, a.id, "update_settings");
    return { settings: s };
  },
};

// ---------------------------------------------------------------------------
// Boshlang'ich ma'lumotlar (birinchi ishga tushirishda)

export async function seed(db, { hash, adminEmail, adminPassword, demo = true }) {
  normalizeDb(db);
  const mkUser = async (u, password) => {
    const salt = uid("s");
    const user = { balance: 0, blocked: false, verified: true, rating: null, lang: "uz", farm: null, bank: null, docs: null, lastLoginAt: null, createdAt: now(), ...u, salt, passHash: await hash(password, salt) };
    db.users.push(user);
    return user;
  };
  await mkUser({ id: "u_admin", role: "admin", name: "Platforma administratori", email: adminEmail, phone: "" }, adminPassword);
  if (!demo) return db;
  db.settings.testPayments = true;
  db.settings.showDemoLogins = true;
  db.settings.bank = { ...db.settings.bank, ...DEMO_BANK };

  const inv1 = await mkUser({ id: "u_inv1", role: "investor", name: "Aziz Karimov", email: "investor@agricrowd.uz", phone: "+998 90 111 22 33", balance: 25_000_000, bank: { holder: "Aziz Karimov", bankName: "Kapitalbank", account: "", mfo: "", card: "8600123412341234" }, docs: { passport: "AA1234567", pinfl: "", address: "Toshkent sh.", birthDate: "" } }, "demo123");
  const inv2 = await mkUser({ id: "u_inv2", role: "investor", name: "Malika Yusupova", email: "malika@agricrowd.uz", phone: "+998 93 222 33 44", balance: 12_000_000 }, "demo123");
  const f1 = await mkUser({
    id: "u_farm1", role: "farmer", name: "Rustam Tursunov", email: "fermer@agricrowd.uz", phone: "+998 91 333 44 55", rating: 4.6,
    farm: { name: "«Tursunov Agro» fermer xo'jaligi", type: "Fermer xo'jaligi", region: "Samarqand", district: "Payariq tumani", area: 24, experience: 11, inn: "301234567", address: "Samarqand v., Payariq t.", about: "Issiqxona va ochiq maydonda pomidor, bodring yetishtirishga ixtisoslashgan. Tomchilatib sug'orish tizimi mavjud." },
  }, "demo123");
  const f2 = await mkUser({
    id: "u_farm2", role: "farmer", name: "Dilnoza Ergasheva", email: "dehqon@agricrowd.uz", phone: "+998 94 444 55 66", rating: 4.2,
    farm: { name: "«Ergash bog'i» dehqon xo'jaligi", type: "Dehqon xo'jaligi", region: "Farg'ona", district: "Quva tumani", area: 6, experience: 7, inn: "", address: "", about: "Oilaviy dehqon xo'jaligi. Kartoshka, piyoz va sabzi yetishtiradi." },
  }, "demo123");

  const days = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const ago = (n) => new Date(Date.now() - n * 864e5).toISOString();
  const base = {
    collateral: "Kelgusi hosil garovi (hosilni sotish shartnomasi asosida) hamda xo'jalik texnikasi garovi.",
    insurance: "Hosil tabiiy ofatlar (do'l, sovuq, suv toshqini) xavfidan sug'urtalangan. Sug'urta polisi administratorga taqdim etilgan.",
    guarantee: "Fermer xo'jaligi rahbarining shaxsiy kafilligi. Mablag' bosqichma-bosqich, monitoring natijasiga ko'ra sarflanadi.",
    documents: "Yer ijarasi shartnomasi, xo'jalik guvohnomasi, sug'urta polisi, xaridor bilan oldindan tuzilgan shartnoma.",
    featured: false, contractTemplate: null, adminNote: "", distribution: null, actualRevenue: null,
    submittedAt: null, approvedAt: null, fundedAt: null, disbursedAt: null, refundedAt: null, completedAt: null, image: "",
  };
  const projects = [
    {
      ...base, id: "p_tomato", farmerId: f1.id, title: "Issiqxonada erta pomidor yetishtirish", crop: "Pomidor", region: "Samarqand", district: "Payariq tumani",
      area: 1.5, totalCost: 180_000_000, goal: 120_000_000, raised: 78_500_000, expectedYield: 90, expectedPrice: 3200, expectedRevenue: 288_000_000,
      investorShare: 50, durationMonths: 8, fundingDeadline: days(35), status: "funding", createdAt: ago(20), approvedAt: ago(18), featured: true,
      summary: "1,5 gektar zamonaviy issiqxonada eksportbop erta pomidor yetishtirish.",
      purpose: "Ko'chat, mineral o'g'it, issiqxona isitish uchun yoqilg'i va tomchilatib sug'orish tizimini yangilash.",
      usage: [{ item: "Ko'chat va urug'", amount: 28_000_000 }, { item: "O'g'it va o'simlik himoyasi", amount: 32_000_000 }, { item: "Isitish (yoqilg'i)", amount: 40_000_000 }, { item: "Sug'orish tizimi", amount: 20_000_000 }],
      plan: "Yanvar — ko'chat ekish; fevral–mart — parvarish; aprel–iyun — hosil yig'ish va eksport/ichki bozorga realizatsiya.",
      returnTerms: "Hosil sotilgandan so'ng tushumning 50% investorlar o'rtasida ulushiga mos taqsimlanadi",
    },
    {
      ...base, id: "p_potato", farmerId: f2.id, title: "Urug'lik kartoshka yetishtirish", crop: "Kartoshka", region: "Farg'ona", district: "Quva tumani",
      area: 4, totalCost: 95_000_000, goal: 60_000_000, raised: 21_000_000, expectedYield: 110, expectedPrice: 1500, expectedRevenue: 165_000_000,
      investorShare: 45, durationMonths: 6, fundingDeadline: days(50), status: "funding", createdAt: ago(10), approvedAt: ago(9),
      summary: "4 gektar maydonda yuqori hosilli urug'lik kartoshka.",
      purpose: "Elita urug'lik, o'g'it, yerga ishlov berish va terish xarajatlari.",
      usage: [{ item: "Elita urug'lik", amount: 35_000_000 }, { item: "O'g'itlar", amount: 12_000_000 }, { item: "Yerga ishlov berish va terim", amount: 13_000_000 }],
      plan: "Mart — ekish; aprel–iyun — parvarish; iyul — hosil yig'ish va sotish.",
      returnTerms: "Hosil realizatsiyasidan tushgan daromadning 45% investorlarga",
    },
    {
      ...base, id: "p_cucumber", farmerId: f1.id, title: "Bodring — ikkinchi hosil (issiqxona)", crop: "Bodring", region: "Samarqand", district: "Payariq tumani",
      area: 0.8, totalCost: 70_000_000, goal: 45_000_000, raised: 45_000_000, expectedYield: 60, expectedPrice: 2800, expectedRevenue: 168_000_000,
      investorShare: 40, durationMonths: 5, fundingDeadline: days(-5), status: "in_progress", createdAt: ago(60), approvedAt: ago(58), fundedAt: ago(30), disbursedAt: ago(25),
      summary: "Kuzgi-qishki mavsumda issiqxona bodringi.",
      purpose: "Ko'chat, o'g'it, isitish va qadoqlash xarajatlari.",
      usage: [{ item: "Ko'chat", amount: 12_000_000 }, { item: "O'g'it", amount: 13_000_000 }, { item: "Isitish", amount: 20_000_000 }],
      plan: "Sentyabr — ekish; oktyabr–yanvar — hosil yig'ish.",
      returnTerms: "Tushumning 40% investorlarga ulushiga mos",
    },
    {
      ...base, id: "p_onion", farmerId: f2.id, title: "Piyoz yetishtirish va saqlash", crop: "Piyoz", region: "Farg'ona", district: "Quva tumani",
      area: 3, totalCost: 50_000_000, goal: 30_000_000, raised: 30_000_000, expectedYield: 120, expectedPrice: 1100, expectedRevenue: 132_000_000,
      investorShare: 30, durationMonths: 7, fundingDeadline: days(-200), status: "completed", createdAt: ago(260), approvedAt: ago(255), fundedAt: ago(230), disbursedAt: ago(225), completedAt: ago(15),
      actualRevenue: 140_000_000,
      distribution: { investorPool: 42_000_000, commission: 2_100_000, toInvestors: 39_900_000, farmerPart: 98_000_000, note: "Hosil to'liq sotildi", at: ago(15) },
      summary: "3 gektarda piyoz yetishtirish va omborda saqlab, qishda sotish.",
      purpose: "Urug', o'g'it, sug'orish va ombor ijarasi.",
      usage: [{ item: "Urug'", amount: 8_000_000 }, { item: "O'g'it va sug'orish", amount: 12_000_000 }, { item: "Ombor ijarasi", amount: 10_000_000 }],
      plan: "Mart — ekish; avgust — yig'ish; noyabr–dekabr — sotish.",
      returnTerms: "Tushumning 30% investorlarga",
    },
    {
      ...base, id: "p_carrot", farmerId: f2.id, title: "Sabzi yetishtirish (kuzgi)", crop: "Sabzi", region: "Farg'ona", district: "Quva tumani",
      area: 2, totalCost: 40_000_000, goal: 25_000_000, raised: 0, expectedYield: 70, expectedPrice: 1300, expectedRevenue: 91_000_000,
      investorShare: 40, durationMonths: 5, fundingDeadline: days(60), status: "pending", createdAt: ago(1), submittedAt: ago(1),
      summary: "2 gektarda kuzgi sabzi.", purpose: "Urug', o'g'it va terim.",
      usage: [{ item: "Urug'", amount: 7_000_000 }, { item: "O'g'it", amount: 8_000_000 }, { item: "Terim", amount: 10_000_000 }],
      plan: "Iyul — ekish; noyabr — yig'ish va sotish.", returnTerms: "Tushumning 40% investorlarga",
    },
  ];
  db.projects.push(...projects);

  const addInv = (projectId, investorId, amount, daysAgo, status = "active", payout = 0) =>
    db.investments.push({ id: uid("i"), projectId, investorId, amount, status, payout, createdAt: ago(daysAgo) });
  addInv("p_tomato", inv1.id, 50_000_000, 15); addInv("p_tomato", inv2.id, 28_500_000, 12);
  addInv("p_potato", inv2.id, 21_000_000, 7);
  addInv("p_cucumber", inv1.id, 30_000_000, 40); addInv("p_cucumber", inv2.id, 15_000_000, 32);
  addInv("p_onion", inv1.id, 20_000_000, 240, "paid", 26_600_000); addInv("p_onion", inv2.id, 10_000_000, 235, "paid", 13_300_000);

  const contract = (n, projectId, investorId, farmerId, amount, goal, daysAgo) => ({
    id: uid("c"), number: `AC-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`, projectId, investorId, farmerId, amount,
    sharePercent: Math.round((amount / goal) * 10000) / 100, status: "verified", adminNote: "", createdAt: ago(daysAgo), verifiedAt: ago(daysAgo - 3),
    investorFile: { path: `contracts/demo/investor.pdf`, name: "shartnoma-imzolangan.pdf", size: 0, uploadedAt: ago(daysAgo - 1) },
    farmerFile: { path: `contracts/demo/farmer.pdf`, name: "shartnoma-muhr.pdf", size: 0, uploadedAt: ago(daysAgo - 2) },
  });
  db.contracts.push(
    contract(1, "p_onion", inv1.id, f2.id, 20_000_000, 30_000_000, 230), contract(2, "p_onion", inv2.id, f2.id, 10_000_000, 30_000_000, 230),
    contract(3, "p_cucumber", inv1.id, f1.id, 30_000_000, 45_000_000, 30), contract(4, "p_cucumber", inv2.id, f1.id, 15_000_000, 45_000_000, 30),
  );
  db.transactions.push(
    { id: uid("t"), userId: f1.id, type: "disbursement", amount: 45_000_000, projectId: "p_cucumber", note: "Loyiha mablag'i fermerga ajratildi", createdAt: ago(25) },
    { id: uid("t"), userId: inv1.id, type: "payout", amount: 26_600_000, projectId: "p_onion", note: "Daromad ulushi: Piyoz yetishtirish va saqlash", createdAt: ago(15) },
    { id: uid("t"), userId: inv2.id, type: "payout", amount: 13_300_000, projectId: "p_onion", note: "Daromad ulushi: Piyoz yetishtirish va saqlash", createdAt: ago(15) },
    { id: uid("t"), userId: null, type: "commission", amount: 2_100_000, projectId: "p_onion", note: "Platforma komissiyasi", createdAt: ago(15) },
  );
  db.updates.push(
    { id: uid("m"), projectId: "p_cucumber", authorId: f1.id, authorRole: "farmer", title: "Ko'chatlar ekildi", stage: "Ekish", text: "Issiqxonaga 12 000 tup bodring ko'chati ekildi. Tomchilatib sug'orish ishga tushirildi.", images: [], video: "", createdAt: ago(25) },
    { id: uid("m"), projectId: "p_cucumber", authorId: f1.id, authorRole: "farmer", title: "Birinchi gullash", stage: "Parvarish", text: "O'simliklar gullash bosqichida. Harorat 24–26°C darajasida ushlab turilmoqda.", images: [], video: "", createdAt: ago(8) },
    { id: uid("m"), projectId: "p_onion", authorId: "u_admin", authorRole: "admin", title: "Daromad taqsimlandi", stage: "Yakun", text: "Hosil 140 mln so'mga sotildi. Investorlar ulushi hisoblarga o'tkazildi.", images: [], video: "", createdAt: ago(15) },
  );
  db.news.push(
    { id: uid("news"), authorId: "u_admin", title: "Agricrowd.uz platformasi ishga tushdi", body: "Sabzavot yetishtiruvchi fermer va dehqon xo'jaliklari endi o'z loyihalarini platformaga joylashtirib, investorlar mablag'ini jalb qilishlari mumkin. Investorlar esa tekshirilgan loyihalarga mablag' kiritib, hosildan daromad olishadi.", image: "", published: true, createdAt: ago(3), updatedAt: ago(3) },
    { id: uid("news"), authorId: "u_admin", title: "«Piyoz yetishtirish va saqlash» loyihasi muvaffaqiyatli yakunlandi", body: "Farg'ona viloyatidagi loyiha bo'yicha hosil 140 mln so'mga sotildi. Investorlar kiritgan mablag'iga nisbatan 33% daromad oldi.", image: "", published: true, createdAt: ago(14), updatedAt: ago(14) },
  );
  return db;
}

// Demo (seed) yozuvlarini aniqlash uchun
const DEMO_USER_IDS = ["u_inv1", "u_inv2", "u_farm1", "u_farm2"];
const DEMO_PROJECT_IDS = ["p_tomato", "p_potato", "p_cucumber", "p_onion", "p_carrot"];
const DEMO_NEWS_TITLES = ["Agricrowd.uz platformasi ishga tushdi", "«Piyoz yetishtirish va saqlash» loyihasi muvaffaqiyatli yakunlandi"];
const DEMO_BANK = { recipient: "«Agricrowd» MChJ", bankName: "«Agrobank» ATB", account: "20208000900000000001", mfo: "00394", inn: "300000000" };
