// Agricrowd.uz — platformaning biznes mantig'i.
// Bu fayl ham serverda (Netlify Function), ham brauzerda (demo rejim) ishlaydi.
// Barcha amallar `handle(db, action, payload, ctx)` orqali bajariladi.

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

// Investorlarga ko'rinadigan (e'lon qilingan) holatlar
export const PUBLIC_STATUSES = ["funding", "funded", "in_progress", "harvest", "completed", "refunded"];
// Monitoring qo'shish mumkin bo'lgan holatlar
export const MONITOR_STATUSES = ["funded", "in_progress", "harvest"];

export const DEFAULT_SETTINGS = {
  commission: 5, // platforma komissiyasi, daromaddan %
  minInvestment: 500000,
  regions: [
    "Andijon", "Buxoro", "Farg'ona", "Jizzax", "Xorazm", "Namangan", "Navoiy",
    "Qashqadaryo", "Qoraqalpog'iston Respublikasi", "Samarqand", "Sirdaryo",
    "Surxondaryo", "Toshkent viloyati",
  ],
  crops: [
    "Pomidor", "Bodring", "Kartoshka", "Piyoz", "Sabzi", "Karam", "Qalampir",
    "Baqlajon", "Sarimsoq", "Lavlagi", "Qovoq", "Boshqa sabzavot",
  ],
  contactPhone: "+998 71 200 00 00",
  contactEmail: "info@agricrowd.uz",
  heroTitle: "Sabzavot yetishtirish loyihalarini birgalikda moliyalashtiramiz",
  heroText:
    "Agricrowd.uz — mablag'ga ehtiyoj sezayotgan fermer va dehqon xo'jaliklarini qishloq xo'jaligiga mablag' kiritishni istagan investorlar bilan bir platformada birlashtiradi.",
};

const PROJECT_FIELDS = [
  "title", "crop", "region", "district", "area", "totalCost", "goal", "purpose",
  "usage", "plan", "expectedYield", "expectedPrice", "expectedRevenue",
  "investorShare", "returnTerms", "durationMonths", "fundingDeadline",
  "collateral", "insurance", "guarantee", "documents", "image", "summary",
];
const NUMERIC_FIELDS = ["area", "totalCost", "goal", "expectedYield", "expectedPrice", "expectedRevenue", "investorShare", "durationMonths"];

export class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const fail = (msg, status) => { throw new ApiError(msg, status); };
const now = () => new Date().toISOString();
export const uid = (p = "") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const round = (n) => Math.round(Number(n) || 0);
const str = (v, max = 5000) => String(v ?? "").trim().slice(0, max);
const clone = (o) => JSON.parse(JSON.stringify(o));

export function emptyDb() {
  return {
    version: 1,
    settings: clone(DEFAULT_SETTINGS),
    users: [],
    projects: [],
    investments: [],
    updates: [],
    transactions: [],
    logs: [],
  };
}

// ---------------------------------------------------------------------------
// Yordamchi funksiyalar

export function publicUser(u) {
  if (!u) return null;
  const { passHash, salt, ...rest } = u;
  return rest;
}

function log(db, userId, action, details = "") {
  db.logs.unshift({ id: uid("l"), userId, action, details, createdAt: now() });
  if (db.logs.length > 2000) db.logs.length = 2000;
}

function tx(db, userId, type, amount, projectId = null, note = "") {
  db.transactions.unshift({ id: uid("t"), userId, type, amount: round(amount), projectId, note, createdAt: now() });
}

const findUser = (db, id) => db.users.find((u) => u.id === id);
const findProject = (db, id) => db.projects.find((p) => p.id === id) || fail("Loyiha topilmadi", 404);

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

function enrich(db, p, { full = false } = {}) {
  const out = { ...p, ...projectStats(db, p) };
  out.farmer = farmerCard(db, p.farmerId);
  if (full) {
    out.updates = db.updates.filter((u) => u.projectId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return out;
}

function sanitizeProject(input, settings) {
  const p = {};
  for (const k of PROJECT_FIELDS) if (k in input) p[k] = input[k];
  for (const k of NUMERIC_FIELDS) if (k in p) p[k] = Math.max(0, Number(p[k]) || 0);
  for (const k of ["title", "crop", "region", "district", "returnTerms", "fundingDeadline"]) if (k in p) p[k] = str(p[k], 200);
  for (const k of ["purpose", "plan", "collateral", "insurance", "guarantee", "documents", "summary"]) if (k in p) p[k] = str(p[k], 5000);
  if ("image" in p) p.image = str(p.image, 600000);
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
  for (const [k, label] of Object.entries(req)) if (!p[k]) fail(`«${label}» maydonini to'ldiring`);
  if (p.totalCost && p.goal > p.totalCost) fail("Jalb qilinadigan mablag' loyiha umumiy qiymatidan oshmasligi kerak");
  if (p.goal < settings.minInvestment) fail("Kerakli mablag' juda kichik");
}

// Moliyalashtirish sharti: 100% yig'ilsa — loyiha ishga tushadi,
// muddat tugaguncha yig'ilmasa — investorlar mablag'i qaytariladi.
function markFunded(db, p) {
  p.status = "funded";
  p.fundedAt = now();
  const farmer = findUser(db, p.farmerId);
  if (farmer) {
    farmer.balance = round((farmer.balance || 0) + p.raised);
    tx(db, farmer.id, "disbursement", p.raised, p.id, "Loyiha 100% moliyalashtirildi — mablag' fermerga ajratildi");
  }
  log(db, null, "project_funded", `${p.title}: 100% moliyalashtirildi`);
}

function refundProject(db, p, reason) {
  for (const inv of db.investments.filter((i) => i.projectId === p.id && i.status === "active")) {
    const investor = findUser(db, inv.investorId);
    if (investor) {
      investor.balance = round((investor.balance || 0) + inv.amount);
      tx(db, investor.id, "refund", inv.amount, p.id, reason);
    }
    inv.status = "refunded";
  }
  p.status = "refunded";
  p.refundedAt = now();
  log(db, null, "project_refunded", `${p.title}: ${reason}`);
}

// Har bir so'rovda muddati o'tgan loyihalarni tekshiradi. O'zgarish bo'lsa true qaytaradi.
export function tick(db) {
  let changed = false;
  const today = new Date().toISOString().slice(0, 10);
  for (const p of db.projects) {
    if (p.status === "funding" && p.fundingDeadline && p.fundingDeadline < today && p.raised < p.goal) {
      refundProject(db, p, "Muddat ichida 100% moliyalashtirilmadi — mablag' qaytarildi");
      changed = true;
    }
  }
  return changed;
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
  // So'nggi 12 oy bo'yicha investitsiyalar
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
    byStatus,
    byRegion: group("region"),
    byCrop: group("crop"),
    byMonth: months,
  };
}

// ---------------------------------------------------------------------------
// Asosiy dispatcher. ctx = { user, hash(password, salt) => Promise<string>, issueToken(user) => Promise<string> }

export async function handle(db, action, payload = {}, ctx = {}) {
  const fn = ACTIONS[action];
  if (!fn) fail("Noma'lum amal: " + action, 404);
  return fn(db, payload || {}, ctx);
}

// Amallar ro'yxati. `mutates: false` bo'lganlar bazani o'zgartirmaydi.
export const READ_ONLY = new Set(["ping", "bootstrap", "getProject", "me", "investorDashboard", "farmerDashboard", "adminData", "farmerProject"]);

const ACTIONS = {
  ping: () => ({ ok: true }),

  // Ommaviy ma'lumotlar: sozlamalar, e'lon qilingan loyihalar va statistika
  bootstrap(db) {
    const projects = db.projects
      .filter((p) => PUBLIC_STATUSES.includes(p.status))
      .map((p) => { const e = enrich(db, p); delete e.image; e.hasImage = !!p.image; return e; })
      .sort((a, b) => (a.status === "funding" ? 0 : 1) - (b.status === "funding" ? 0 : 1) || b.createdAt.localeCompare(a.createdAt));
    const a = analytics(db);
    return {
      settings: db.settings,
      projects,
      stats: {
        projects: projects.length,
        farmers: a.farmers,
        investors: a.investors,
        totalRaised: a.totalRaised,
        completed: a.byStatus.completed || 0,
      },
    };
  },

  getProject(db, { id }, ctx) {
    const p = findProject(db, id);
    const u = ctx.user;
    const allowed = PUBLIC_STATUSES.includes(p.status) || (u && (u.role === "admin" || u.id === p.farmerId));
    if (!allowed) fail("Loyiha hali e'lon qilinmagan", 404);
    const out = enrich(db, p, { full: true });
    if (u) {
      out.myInvestments = db.investments.filter((i) => i.projectId === p.id && i.investorId === u.id);
    }
    return out;
  },

  // --- Autentifikatsiya -------------------------------------------------
  async register(db, { role, name, email, phone, password, farm }, ctx) {
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
      balance: 0, blocked: false, verified: false, createdAt: now(),
    };
    if (role === "farmer") {
      user.farm = {
        name: str(farm?.name, 200), type: str(farm?.type, 100) || "Fermer xo'jaligi",
        region: str(farm?.region, 100), district: str(farm?.district, 100),
        area: Number(farm?.area) || 0, experience: Number(farm?.experience) || 0, inn: str(farm?.inn, 30),
        about: str(farm?.about, 2000),
      };
      user.rating = null;
    }
    db.users.push(user);
    log(db, user.id, "register", `${role}: ${email}`);
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
    return { user: publicUser(requireUser(ctx)) };
  },

  updateProfile(db, { name, phone, farm }, ctx) {
    const u = requireUser(ctx);
    if (name !== undefined) u.name = str(name, 120) || u.name;
    if (phone !== undefined) u.phone = str(phone, 40);
    if (farm && u.role === "farmer") {
      u.farm = {
        ...u.farm,
        name: str(farm.name ?? u.farm?.name, 200), type: str(farm.type ?? u.farm?.type, 100),
        region: str(farm.region ?? u.farm?.region, 100), district: str(farm.district ?? u.farm?.district, 100),
        area: Number(farm.area ?? u.farm?.area) || 0, experience: Number(farm.experience ?? u.farm?.experience) || 0,
        inn: str(farm.inn ?? u.farm?.inn, 30), about: str(farm.about ?? u.farm?.about, 2000),
      };
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

  // Hisobni to'ldirish (to'lov tizimi — Click/Payme — ulanguncha soddalashtirilgan)
  deposit(db, { amount }, ctx) {
    const u = requireUser(ctx, ["investor"]);
    amount = round(amount);
    if (amount < 10000 || amount > 10_000_000_000) fail("Summa noto'g'ri");
    u.balance = round((u.balance || 0) + amount);
    tx(db, u.id, "deposit", amount, null, "Hisob to'ldirildi");
    log(db, u.id, "deposit", String(amount));
    return { user: publicUser(u) };
  },

  withdraw(db, { amount }, ctx) {
    const u = requireUser(ctx, ["investor", "farmer"]);
    amount = round(amount);
    if (amount <= 0) fail("Summa noto'g'ri");
    if (amount > (u.balance || 0)) fail("Hisobda mablag' yetarli emas");
    u.balance = round(u.balance - amount);
    tx(db, u.id, "withdraw", amount, null, "Mablag' yechib olindi");
    log(db, u.id, "withdraw", String(amount));
    return { user: publicUser(u) };
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
    if (amount < min) fail(`Minimal investitsiya: ${min.toLocaleString("ru-RU")} so'm`);
    if (amount > remaining) fail(`Loyihaga yana ${remaining.toLocaleString("ru-RU")} so'm kerak — undan ortiq kiritib bo'lmaydi`);
    if (amount > (u.balance || 0)) fail("Hisobingizda mablag' yetarli emas. Avval hisobni to'ldiring");
    u.balance = round(u.balance - amount);
    p.raised = round(p.raised + amount);
    const inv = { id: uid("i"), projectId: p.id, investorId: u.id, amount, status: "active", payout: 0, createdAt: now() };
    db.investments.push(inv);
    tx(db, u.id, "invest", amount, p.id, `Investitsiya: ${p.title}`);
    log(db, u.id, "invest", `${p.title}: ${amount}`);
    if (p.raised >= p.goal) markFunded(db, p);
    return { investment: inv, user: publicUser(u), project: enrich(db, p) };
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
        const lastUpdate = db.updates.filter((x) => x.projectId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
        const e = enrich(db, p); delete e.image;
        return { ...i, sharePercent: Math.round(share * 10000) / 100, expectedIncome, project: e, lastUpdate };
      });
    const transactions = db.transactions.filter((t) => t.userId === u.id).slice(0, 100);
    const active = investments.filter((i) => i.status === "active");
    return {
      user: publicUser(u),
      investments,
      transactions,
      summary: {
        balance: u.balance || 0,
        invested: active.reduce((s, i) => s + i.amount, 0),
        expectedIncome: active.reduce((s, i) => s + i.expectedIncome, 0),
        received: investments.reduce((s, i) => s + (i.payout || 0), 0),
        projects: new Set(active.map((i) => i.projectId)).size,
      },
    };
  },

  // --- Fermer -----------------------------------------------------------
  createProject(db, payload, ctx) {
    const u = requireUser(ctx, ["farmer", "admin"]);
    const data = sanitizeProject(payload, db.settings);
    validateProject(data, db.settings);
    let farmerId = u.id;
    if (u.role === "admin" && payload.farmerId) {
      const f = findUser(db, payload.farmerId);
      if (!f || f.role !== "farmer") fail("Fermer topilmadi");
      farmerId = f.id;
    }
    const p = {
      id: uid("p"), farmerId, ...data, raised: 0,
      status: u.role === "admin" && payload.publish ? "funding" : "pending",
      adminNote: "", createdAt: now(), submittedAt: now(),
    };
    if (p.status === "funding") p.approvedAt = now();
    db.projects.push(p);
    log(db, u.id, "create_project", p.title);
    return { project: p };
  },

  updateProject(db, { id, ...payload }, ctx) {
    const u = requireUser(ctx, ["farmer"]);
    const p = findProject(db, id);
    if (p.farmerId !== u.id) fail("Bu loyiha sizga tegishli emas", 403);
    if (!["pending", "rejected"].includes(p.status)) fail("E'lon qilingan loyihani faqat administrator o'zgartira oladi");
    Object.assign(p, sanitizeProject(payload, db.settings));
    validateProject(p, db.settings);
    p.status = "pending";
    p.submittedAt = now();
    log(db, u.id, "update_project", p.title);
    return { project: p };
  },

  farmerDashboard(db, _p, ctx) {
    const u = requireUser(ctx, ["farmer"]);
    const projects = db.projects
      .filter((p) => p.farmerId === u.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => {
        const e = enrich(db, p, { full: true });
        delete e.image;
        return e;
      });
    return {
      user: publicUser(u),
      projects,
      transactions: db.transactions.filter((t) => t.userId === u.id).slice(0, 100),
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
      images: (Array.isArray(images) ? images : []).map((x) => str(x, 600000)).filter(Boolean).slice(0, 6),
      video: str(video, 500), createdAt: now(),
    };
    if (!upd.text && !upd.images.length && !upd.video) fail("Matn, foto yoki video qo'shing");
    db.updates.push(upd);
    if (u.role === "farmer" && p.status === "funded") p.status = "in_progress";
    log(db, u.id, "add_update", `${p.title}: ${upd.title}`);
    return { update: upd };
  },

  // --- Administrator ----------------------------------------------------
  adminData(db, _p, ctx) {
    requireUser(ctx, ["admin"]);
    return {
      settings: db.settings,
      analytics: analytics(db),
      users: db.users.map(publicUser),
      projects: db.projects.map((p) => { const e = enrich(db, p); delete e.image; e.hasImage = !!p.image; return e; }),
      investments: db.investments,
      updates: db.updates.map((u) => ({ ...u, images: u.images.length })),
      transactions: db.transactions.slice(0, 1000),
      logs: db.logs.slice(0, 500),
    };
  },

  reviewProject(db, { id, decision, note }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const p = findProject(db, id);
    if (!["pending", "rejected"].includes(p.status)) fail("Loyiha tekshiruv bosqichida emas");
    if (decision === "approve") {
      p.status = "funding";
      p.approvedAt = now();
    } else if (decision === "reject") {
      p.status = "rejected";
    } else fail("Qaror noto'g'ri");
    p.adminNote = str(note, 2000);
    log(db, a.id, "review_project", `${p.title}: ${decision}`);
    return { project: p };
  },

  adminUpdateProject(db, { id, ...payload }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const p = findProject(db, id);
    const data = sanitizeProject(payload, db.settings);
    if ("goal" in data && data.goal < p.raised) fail("Kerakli mablag' yig'ilgan summadan kam bo'lishi mumkin emas");
    Object.assign(p, data);
    if ("adminNote" in payload) p.adminNote = str(payload.adminNote, 2000);
    if ("featured" in payload) p.featured = !!payload.featured;
    if (payload.farmerId && payload.farmerId !== p.farmerId) {
      const f = findUser(db, payload.farmerId);
      if (!f || f.role !== "farmer") fail("Fermer topilmadi");
      p.farmerId = f.id;
    }
    if (p.status === "funding" && p.raised >= p.goal && p.goal > 0) markFunded(db, p);
    log(db, a.id, "admin_update_project", p.title);
    return { project: p };
  },

  setProjectStatus(db, { id, status }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const p = findProject(db, id);
    const allowed = {
      funded: ["in_progress"],
      in_progress: ["harvest"],
      funding: ["pending"],
      rejected: ["pending"],
      pending: ["rejected"],
    };
    if (status === "refunded") {
      if (p.status !== "funding") fail("Faqat mablag' yig'ilayotgan loyihani bekor qilib, mablag'ni qaytarish mumkin");
      refundProject(db, p, "Administrator qarori bilan loyiha bekor qilindi — mablag' qaytarildi");
    } else {
      if (!(allowed[p.status] || []).includes(status)) fail(`«${STATUSES[p.status].label}» holatidan «${STATUSES[status]?.label || status}» holatiga o'tkazib bo'lmaydi`);
      if (status === "pending" && p.raised > 0) fail("Mablag' kiritilgan loyihani qayta tekshiruvga qaytarib bo'lmaydi");
      p.status = status;
    }
    log(db, a.id, "set_status", `${p.title}: ${status}`);
    return { project: p };
  },

  // Hosil → Sotish → Daromad → Investorlar va fermer o'rtasida taqsimlash
  distribute(db, { id, actualRevenue, note }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const p = findProject(db, id);
    if (!["funded", "in_progress", "harvest"].includes(p.status)) fail("Daromad faqat amalga oshirilgan loyiha bo'yicha taqsimlanadi");
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
      }
    });
    tx(db, null, "commission", commission, p.id, `Platforma komissiyasi: ${p.title}`);
    p.actualRevenue = actualRevenue;
    p.distribution = { investorPool, commission, toInvestors, farmerPart, note: str(note, 1000), at: now() };
    p.status = "completed";
    p.completedAt = now();
    log(db, a.id, "distribute", `${p.title}: ${actualRevenue}`);
    return { project: p };
  },

  deleteProject(db, { id }, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const p = findProject(db, id);
    if (db.investments.some((i) => i.projectId === id && i.status === "active")) fail("Faol investitsiyasi bor loyihani o'chirib bo'lmaydi. Avval mablag'ni qaytaring");
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

  async adminCreateUser(db, payload, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const role = payload.role;
    if (!["investor", "farmer", "admin"].includes(role)) fail("Rol noto'g'ri");
    const res = await ACTIONS.register(db, { ...payload, role: role === "admin" ? "investor" : role }, ctx);
    const u = findUser(db, res.user.id);
    u.role = role;
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
      if (String(password).length < 6) fail("Parol kamida 6 belgi");
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
    if (db.investments.some((i) => i.investorId === id) || db.projects.some((p) => p.farmerId === id)) {
      fail("Loyiha yoki investitsiyasi bor foydalanuvchini o'chirib bo'lmaydi — uni bloklang");
    }
    db.users = db.users.filter((x) => x.id !== id);
    log(db, a.id, "delete_user", u.email);
    return { ok: true };
  },

  updateSettings(db, payload, ctx) {
    const a = requireUser(ctx, ["admin"]);
    const s = db.settings;
    if ("commission" in payload) s.commission = Math.max(0, Math.min(50, Number(payload.commission) || 0));
    if ("minInvestment" in payload) s.minInvestment = Math.max(1000, round(payload.minInvestment));
    for (const k of ["contactPhone", "contactEmail", "heroTitle", "heroText"]) if (k in payload) s[k] = str(payload[k], 1000);
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
  const mkUser = async (u, password) => {
    const salt = uid("s");
    const user = { balance: 0, blocked: false, verified: true, createdAt: now(), ...u, salt, passHash: await hash(password, salt) };
    db.users.push(user);
    return user;
  };
  await mkUser({ id: "u_admin", role: "admin", name: "Platforma administratori", email: adminEmail, phone: "" }, adminPassword);
  if (!demo) return db;

  const inv1 = await mkUser({ id: "u_inv1", role: "investor", name: "Aziz Karimov", email: "investor@agricrowd.uz", phone: "+998 90 111 22 33", balance: 25_000_000 }, "demo123");
  const inv2 = await mkUser({ id: "u_inv2", role: "investor", name: "Malika Yusupova", email: "malika@agricrowd.uz", phone: "+998 93 222 33 44", balance: 12_000_000 }, "demo123");
  const f1 = await mkUser({
    id: "u_farm1", role: "farmer", name: "Rustam Tursunov", email: "fermer@agricrowd.uz", phone: "+998 91 333 44 55", rating: 4.6,
    farm: { name: "«Tursunov Agro» fermer xo'jaligi", type: "Fermer xo'jaligi", region: "Samarqand", district: "Payariq tumani", area: 24, experience: 11, inn: "301234567", about: "Issiqxona va ochiq maydonda pomidor, bodring yetishtirishga ixtisoslashgan. Tomchilatib sug'orish tizimi mavjud." },
  }, "demo123");
  const f2 = await mkUser({
    id: "u_farm2", role: "farmer", name: "Dilnoza Ergasheva", email: "dehqon@agricrowd.uz", phone: "+998 94 444 55 66", rating: 4.2,
    farm: { name: "«Ergash bog'i» dehqon xo'jaligi", type: "Dehqon xo'jaligi", region: "Farg'ona", district: "Quva tumani", area: 6, experience: 7, inn: "", about: "Oilaviy dehqon xo'jaligi. Kartoshka, piyoz va sabzi yetishtiradi." },
  }, "demo123");

  const days = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const ago = (n) => new Date(Date.now() - n * 864e5).toISOString();
  const base = {
    collateral: "Kelgusi hosil garovi (hosilni sotish shartnomasi asosida) hamda xo'jalik texnikasi garovi.",
    insurance: "Hosil tabiiy ofatlar (do'l, sovuq, suv toshqini) xavfidan sug'urtalangan. Sug'urta polisi administratorga taqdim etilgan.",
    guarantee: "Fermer xo'jaligi rahbarining shaxsiy kafilligi. Mablag' bosqichma-bosqich, monitoring natijasiga ko'ra sarflanadi.",
    documents: "Yer ijarasi shartnomasi, xo'jalik guvohnomasi, sug'urta polisi, xaridor bilan oldindan tuzilgan shartnoma.",
  };
  const projects = [
    {
      id: "p_tomato", farmerId: f1.id, title: "Issiqxonada erta pomidor yetishtirish", crop: "Pomidor", region: "Samarqand", district: "Payariq tumani",
      area: 1.5, totalCost: 180_000_000, goal: 120_000_000, raised: 78_500_000, expectedYield: 90, expectedPrice: 3200, expectedRevenue: 288_000_000,
      investorShare: 50, durationMonths: 8, fundingDeadline: days(35), status: "funding", createdAt: ago(20), approvedAt: ago(18),
      summary: "1,5 gektar zamonaviy issiqxonada eksportbop erta pomidor yetishtirish.",
      purpose: "Ko'chat, mineral o'g'it, issiqxona isitish uchun yoqilg'i va tomchilatib sug'orish tizimini yangilash.",
      usage: [{ item: "Ko'chat va urug'", amount: 28_000_000 }, { item: "O'g'it va o'simlik himoyasi", amount: 32_000_000 }, { item: "Isitish (yoqilg'i)", amount: 40_000_000 }, { item: "Sug'orish tizimi", amount: 20_000_000 }],
      plan: "Yanvar — ko'chat ekish; fevral–mart — parvarish; aprel–iyun — hosil yig'ish va eksport/ichki bozorga realizatsiya.",
      returnTerms: "Hosil sotilgandan so'ng tushumning 50% investorlar o'rtasida ulushiga mos taqsimlanadi", ...base,
    },
    {
      id: "p_potato", farmerId: f2.id, title: "Urug'lik kartoshka yetishtirish", crop: "Kartoshka", region: "Farg'ona", district: "Quva tumani",
      area: 4, totalCost: 95_000_000, goal: 60_000_000, raised: 21_000_000, expectedYield: 110, expectedPrice: 1500, expectedRevenue: 165_000_000,
      investorShare: 45, durationMonths: 6, fundingDeadline: days(50), status: "funding", createdAt: ago(10), approvedAt: ago(9),
      summary: "4 gektar maydonda yuqori hosilli urug'lik kartoshka.",
      purpose: "Elita urug'lik, o'g'it, yerga ishlov berish va terish xarajatlari.",
      usage: [{ item: "Elita urug'lik", amount: 35_000_000 }, { item: "O'g'itlar", amount: 12_000_000 }, { item: "Yerga ishlov berish va terim", amount: 13_000_000 }],
      plan: "Mart — ekish; aprel–iyun — parvarish; iyul — hosil yig'ish va sotish.",
      returnTerms: "Hosil realizatsiyasidan tushgan daromadning 45% investorlarga", ...base,
    },
    {
      id: "p_cucumber", farmerId: f1.id, title: "Bodring — ikkinchi hosil (issiqxona)", crop: "Bodring", region: "Samarqand", district: "Payariq tumani",
      area: 0.8, totalCost: 70_000_000, goal: 45_000_000, raised: 45_000_000, expectedYield: 60, expectedPrice: 2800, expectedRevenue: 168_000_000,
      investorShare: 40, durationMonths: 5, fundingDeadline: days(-5), status: "in_progress", createdAt: ago(60), approvedAt: ago(58), fundedAt: ago(30),
      summary: "Kuzgi-qishki mavsumda issiqxona bodringi.",
      purpose: "Ko'chat, o'g'it, isitish va qadoqlash xarajatlari.",
      usage: [{ item: "Ko'chat", amount: 12_000_000 }, { item: "O'g'it", amount: 13_000_000 }, { item: "Isitish", amount: 20_000_000 }],
      plan: "Sentyabr — ekish; oktyabr–yanvar — hosil yig'ish.",
      returnTerms: "Tushumning 40% investorlarga ulushiga mos", ...base,
    },
    {
      id: "p_onion", farmerId: f2.id, title: "Piyoz yetishtirish va saqlash", crop: "Piyoz", region: "Farg'ona", district: "Quva tumani",
      area: 3, totalCost: 50_000_000, goal: 30_000_000, raised: 30_000_000, expectedYield: 120, expectedPrice: 1100, expectedRevenue: 132_000_000,
      investorShare: 30, durationMonths: 7, fundingDeadline: days(-200), status: "completed", createdAt: ago(260), approvedAt: ago(255), fundedAt: ago(230), completedAt: ago(15),
      actualRevenue: 140_000_000,
      summary: "3 gektarda piyoz yetishtirish va omborda saqlab, qishda sotish.",
      purpose: "Urug', o'g'it, sug'orish va ombor ijarasi.",
      usage: [{ item: "Urug'", amount: 8_000_000 }, { item: "O'g'it va sug'orish", amount: 12_000_000 }, { item: "Ombor ijarasi", amount: 10_000_000 }],
      plan: "Mart — ekish; avgust — yig'ish; noyabr–dekabr — sotish.",
      returnTerms: "Tushumning 30% investorlarga", ...base,
    },
    {
      id: "p_carrot", farmerId: f2.id, title: "Sabzi yetishtirish (kuzgi)", crop: "Sabzi", region: "Farg'ona", district: "Quva tumani",
      area: 2, totalCost: 40_000_000, goal: 25_000_000, raised: 0, expectedYield: 70, expectedPrice: 1300, expectedRevenue: 91_000_000,
      investorShare: 40, durationMonths: 5, fundingDeadline: days(60), status: "pending", createdAt: ago(1),
      summary: "2 gektarda kuzgi sabzi.", purpose: "Urug', o'g'it va terim.",
      usage: [{ item: "Urug'", amount: 7_000_000 }, { item: "O'g'it", amount: 8_000_000 }, { item: "Terim", amount: 10_000_000 }],
      plan: "Iyul — ekish; noyabr — yig'ish va sotish.", returnTerms: "Tushumning 40% investorlarga", ...base,
    },
  ];
  db.projects.push(...projects);

  const addInv = (projectId, investorId, amount, daysAgo, status = "active", payout = 0) =>
    db.investments.push({ id: uid("i"), projectId, investorId, amount, status, payout, createdAt: ago(daysAgo) });
  addInv("p_tomato", inv1.id, 50_000_000, 15); addInv("p_tomato", inv2.id, 28_500_000, 12);
  addInv("p_potato", inv2.id, 21_000_000, 7);
  addInv("p_cucumber", inv1.id, 30_000_000, 40); addInv("p_cucumber", inv2.id, 15_000_000, 32);
  addInv("p_onion", inv1.id, 20_000_000, 240, "paid", 26_600_000); addInv("p_onion", inv2.id, 10_000_000, 235, "paid", 13_300_000);
  const onion = db.projects.find((p) => p.id === "p_onion");
  onion.distribution = { investorPool: 42_000_000, commission: 2_100_000, toInvestors: 39_900_000, farmerPart: 98_000_000, note: "Hosil to'liq sotildi", at: ago(15) };
  db.transactions.push(
    { id: uid("t"), userId: inv1.id, type: "payout", amount: 26_600_000, projectId: "p_onion", note: "Daromad ulushi: Piyoz yetishtirish va saqlash", createdAt: ago(15) },
    { id: uid("t"), userId: inv2.id, type: "payout", amount: 13_300_000, projectId: "p_onion", note: "Daromad ulushi: Piyoz yetishtirish va saqlash", createdAt: ago(15) },
    { id: uid("t"), userId: null, type: "commission", amount: 2_100_000, projectId: "p_onion", note: "Platforma komissiyasi", createdAt: ago(15) },
  );
  db.updates.push(
    { id: uid("m"), projectId: "p_cucumber", authorId: f1.id, authorRole: "farmer", title: "Ko'chatlar ekildi", stage: "Ekish", text: "Issiqxonaga 12 000 tup bodring ko'chati ekildi. Tomchilatib sug'orish ishga tushirildi.", images: [], video: "", createdAt: ago(25) },
    { id: uid("m"), projectId: "p_cucumber", authorId: f1.id, authorRole: "farmer", title: "Birinchi gullash", stage: "Parvarish", text: "O'simliklar gullash bosqichida. Harorat 24–26°C darajasida ushlab turilmoqda.", images: [], video: "", createdAt: ago(8) },
    { id: uid("m"), projectId: "p_onion", authorId: "u_admin", authorRole: "admin", title: "Daromad taqsimlandi", stage: "Yakun", text: "Hosil 140 mln so'mga sotildi. Investorlar ulushi hisoblarga o'tkazildi.", images: [], video: "", createdAt: ago(15) },
  );
  return db;
}
