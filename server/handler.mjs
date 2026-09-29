// Umumiy API so'rov ishlovchisi: Netlify Functions va lokal dev-server uchun.
import crypto from "node:crypto";
import { handle, tick, seed, emptyDb, normalizeDb, ApiError, READ_ONLY, telegramUpdate } from "../public/js/core.js";
import { paymentConfig, checkoutUrl, paymeRpc, clickCallback } from "./payments.mjs";
import { sendOutbox, telegramSend, siteUrl } from "./mailer.mjs";

const SECRET = process.env.AUTH_SECRET || "agricrowd-dev-secret-change-me";
const TOKEN_TTL = 1000 * 60 * 60 * 24 * 7; // 7 kun

export const hash = async (password, salt) => crypto.scryptSync(password, salt, 32).toString("hex");

const b64 = (s) => Buffer.from(s).toString("base64url");
const sign = (data) => crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
const safeEq = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function issueToken(user) {
  const body = b64(JSON.stringify({ uid: user.id, exp: Date.now() + TOKEN_TTL }));
  return `${body}.${sign(body)}`;
}

function readToken(token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!safeEq(sig, sign(body))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    return data.exp > Date.now() ? data.uid : null;
  } catch {
    return null;
  }
}

// Inline rejimda fayl yuklash uchun qisqa muddatli imzo
const signUpload = async (path) => { const exp = Date.now() + 15 * 60e3; return `${exp}.${sign("upload:" + path + ":" + exp)}`; };
const verifyUpload = async (path, token) => {
  const [exp, sig] = String(token || "").split(".");
  return Number(exp) > Date.now() && !!sig && safeEq(sig, sign("upload:" + path + ":" + exp));
};

async function initialDb() {
  const db = emptyDb();
  await seed(db, {
    hash,
    adminEmail: (process.env.ADMIN_EMAIL || "admin@agricrowd.uz").toLowerCase(),
    adminPassword: process.env.ADMIN_PASSWORD || "Admin123!",
    demo: process.env.SEED_DEMO !== "false",
  });
  return db;
}

export const json = (status, data) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

// Bazani yuklab, `fn` ni bajaradi va o'zgarishlarni saqlaydi.
// Boshqa so'rov bazani parallel o'zgartirgan bo'lsa (optimistik blok), qayta urinadi.
// storage: { load(): {db, etag}, save(db, etag): boolean, files }
export async function withDb(storage, fn, { readOnly = false } = {}) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const loaded = (await storage.load()) || { db: null, etag: null };
    let db = loaded.db;
    let isNew = false;
    if (!db) {
      db = await initialDb();
      isNew = true;
    }
    normalizeDb(db);
    const outbox = [];
    const ticked = tick(db, { outbox });
    const before = isNew || ticked ? JSON.stringify(db) : null;
    const tickMail = outbox.length;
    let result, error;
    try {
      result = await fn(db, outbox);
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      error = e;
      // Xato bo'lgan amalning qisman o'zgarishlarini saqlamaymiz
      if (before) db = JSON.parse(before);
      outbox.length = tickMail;
    }
    const mutated = isNew || ticked || (!error && !readOnly);
    if (mutated && !(await storage.save(db, loaded.etag))) {
      await new Promise((r) => setTimeout(r, 30 + Math.random() * 120 * (attempt + 1)));
      continue;
    }
    // Netlify funksiyasi javobdan keyin to'xtatiladi — xabarlar javobdan oldin yuboriladi
    if (mutated) await sendOutbox(outbox).catch((e) => console.error("notify", e));
    if (error) throw error;
    return result;
  }
  throw new ApiError("Server band, qayta urinib ko'ring", 409);
}

function baseCtx(storage, db, outbox, user) {
  return {
    user, hash, issueToken, outbox, signUpload, verifyUpload, files: storage.files,
    payments: { methods: paymentConfig().methods, checkoutUrl },
    telegram: process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME ? { bot: process.env.TELEGRAM_BOT_USERNAME.replace(/^@/, "") } : null,
    features: { email: !!process.env.RESEND_API_KEY },
  };
}

// Asosiy JSON API: POST /api { action, payload }
export async function handleRequest(req, storage) {
  if (req.method !== "POST") return json(405, { error: "Faqat POST so'rovlar qabul qilinadi" });
  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "So'rov noto'g'ri" });
  }
  const { action, payload } = body || {};
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const uid = readToken(token);
  try {
    if (action === "telegramSetup") return json(200, await telegramSetup(storage, uid));
    const result = await withDb(storage, async (db, outbox) => {
      const user = uid ? db.users.find((u) => u.id === uid) || null : null;
      return handle(db, action, payload, baseCtx(storage, db, outbox, user));
    }, { readOnly: READ_ONLY.has(action) });
    return json(200, result);
  } catch (e) {
    if (e instanceof ApiError) return json(e.status, { error: e.message, params: e.params });
    console.error(e);
    return json(500, { error: "Serverda xatolik yuz berdi" });
  }
}

// Payme Merchant API (JSON-RPC): POST /api/payme
export async function handlePayme(req, storage) {
  let body = {};
  try { body = await req.json(); } catch { /* bo'sh */ }
  try {
    const out = await withDb(storage, (db, outbox) => paymeRpc(db, body, req.headers.get("authorization") || "", { outbox }));
    return json(200, out);
  } catch (e) {
    console.error(e);
    return json(200, { id: body.id ?? null, error: { code: -32400, message: { ru: "Системная ошибка", uz: "Tizim xatosi", en: "System error" } } });
  }
}

// Click SHOP API (prepare/complete): POST /api/click (application/x-www-form-urlencoded)
export async function handleClick(req, storage) {
  const text = await req.text();
  const params = Object.fromEntries(new URLSearchParams(text));
  try {
    const out = await withDb(storage, (db, outbox) => clickCallback(db, params, { outbox }));
    return json(200, out);
  } catch (e) {
    console.error(e);
    return json(200, { error: -8, error_note: "Error in request" });
  }
}

// Telegram webhook: POST /api/telegram (Telegram serverlari chaqiradi)
export async function handleTelegram(req, storage) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
  if (!process.env.TELEGRAM_BOT_TOKEN || !secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) return json(403, { ok: false });
  let update = {};
  try { update = await req.json(); } catch { return json(200, { ok: true }); }
  try {
    const reply = await withDb(storage, async (db) => telegramUpdate(db, update));
    if (reply) await telegramSend(reply.chatId, reply.key, reply.params, reply.lang);
  } catch (e) {
    console.error("telegram", e);
  }
  return json(200, { ok: true });
}

// Admin paneldagi «Telegram botni ulash» tugmasi: webhook manzilini Telegram'ga ro'yxatdan o'tkazadi
async function telegramSetup(storage, uid) {
  const loaded = await storage.load();
  const user = loaded?.db?.users?.find((u) => u.id === uid);
  if (!user || user.role !== "admin") throw new ApiError("Bu amal uchun ruxsat yo'q", 403);
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret || !process.env.TELEGRAM_BOT_USERNAME) throw new ApiError("Telegram bot hali ulanmagan");
  const url = `${siteUrl()}/api/telegram`;
  const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url, secret_token: secret, allowed_updates: ["message"] }),
  });
  const data = await r.json().catch(() => ({}));
  if (!data.ok) throw new ApiError("Telegram xatosi: {msg}", 400, { msg: data.description || r.status });
  return { ok: true, url };
}
