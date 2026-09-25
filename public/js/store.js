// API mijozi. Netlify'da /api funksiyasiga murojaat qiladi.
// Agar server mavjud bo'lmasa (masalan, faylni to'g'ridan-to'g'ri ochganda),
// "demo rejim"ga o'tadi — ma'lumotlar brauzer xotirasida (localStorage) saqlanadi.
import { handle, tick, seed, emptyDb, ApiError, READ_ONLY } from "./core.js";

const TOKEN_KEY = "agricrowd_token";
const DEMO_DB_KEY = "agricrowd_demo_db";

let mode = null; // "server" | "demo"
let token = safeGet(TOKEN_KEY);

function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* ignore */ } }

export const getMode = () => mode;
export const setToken = (t) => { token = t; safeSet(TOKEN_KEY, t); };
export const hasToken = () => !!token;

async function detectMode() {
  if (mode) return mode;
  if (location.protocol === "file:") return (mode = "demo");
  try {
    const r = await fetch("/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "ping" }) });
    const data = await r.json();
    mode = r.ok && data.ok ? "server" : "demo";
  } catch {
    mode = "demo";
  }
  return mode;
}

// --- Demo rejim -----------------------------------------------------------
async function demoHash(password, salt) {
  const data = new TextEncoder().encode(salt + ":" + password);
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 5381;
  for (const b of data) h = ((h << 5) + h + b) | 0;
  return String(h);
}

async function demoCall(action, payload) {
  let db;
  try { db = JSON.parse(safeGet(DEMO_DB_KEY)); } catch { db = null; }
  if (!db) {
    db = await seed(emptyDb(), { hash: demoHash, adminEmail: "admin@agricrowd.uz", adminPassword: "Admin123!", demo: true });
  }
  const user = token ? db.users.find((u) => u.id === token) || null : null;
  tick(db);
  const ctx = { user, hash: demoHash, issueToken: async (u) => u.id };
  const result = await handle(db, action, payload, ctx).catch((e) => {
    safeSet(DEMO_DB_KEY, JSON.stringify(db)); // tick() o'zgarishlarini saqlaymiz
    throw e;
  });
  if (!READ_ONLY.has(action) || !safeGet(DEMO_DB_KEY)) {
    try {
      localStorage.setItem(DEMO_DB_KEY, JSON.stringify(db));
    } catch {
      throw new ApiError("Brauzer xotirasi to'ldi — rasm hajmini kamaytiring");
    }
  }
  return result;
}

export function resetDemo() { safeSet(DEMO_DB_KEY, null); setToken(null); }

// --- Umumiy chaqiruv -------------------------------------------------------
export async function api(action, payload = {}) {
  await detectMode();
  if (mode === "demo") {
    try {
      return await demoCall(action, payload);
    } catch (e) {
      if (e.status === 401) setToken(null);
      throw e;
    }
  }
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = "Bearer " + token;
  let r;
  try {
    r = await fetch("/api", { method: "POST", headers, body: JSON.stringify({ action, payload }) });
  } catch {
    throw new ApiError("Server bilan aloqa yo'q. Internetni tekshiring", 0);
  }
  const data = await r.json().catch(() => ({ error: "Server javobi noto'g'ri" }));
  if (!r.ok) {
    if (r.status === 401) setToken(null);
    throw new ApiError(data.error || "Xatolik", r.status);
  }
  return data;
}
