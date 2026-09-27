// API mijozi. Netlify'da /api funksiyasiga murojaat qiladi.
// Agar server mavjud bo'lmasa (oddiy statik hosting), "demo rejim"ga o'tadi —
// ma'lumotlar brauzer xotirasida (localStorage) saqlanadi.
import { handle, tick, seed, emptyDb, normalizeDb, ApiError, READ_ONLY } from "./core.js";
import { t } from "./i18n.js";

const TOKEN_KEY = "agricrowd_token";
const DEMO_DB_KEY = "agricrowd_demo_db";
const DEMO_FILE = "agricrowd_file:";

let mode = null; // "server" | "demo"
let token = safeGet(TOKEN_KEY);

function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* ignore */ } }

export const getMode = () => mode;
export const setToken = (tk) => { token = tk; safeSet(TOKEN_KEY, tk); };
export const hasToken = () => !!token;

async function detectMode() {
  if (mode) return mode;
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

const demoFiles = {
  mode: "inline",
  putInline(path, dataUrl) {
    try { localStorage.setItem(DEMO_FILE + path, dataUrl); } catch { throw new ApiError("Brauzer xotirasi to'ldi — kichikroq fayl yuklang"); }
  },
  getInline: (path) => safeGet(DEMO_FILE + path),
};

async function demoCall(action, payload) {
  let db;
  try { db = JSON.parse(safeGet(DEMO_DB_KEY)); } catch { db = null; }
  if (!db) db = await seed(emptyDb(), { hash: demoHash, adminEmail: "admin@agricrowd.uz", adminPassword: "Admin123!", demo: true });
  normalizeDb(db);
  const user = token ? db.users.find((u) => u.id === token) || null : null;
  tick(db, { outbox: [] });
  const ctx = {
    user, hash: demoHash, issueToken: async (u) => u.id, outbox: [], files: demoFiles,
    signUpload: async (p) => "demo:" + p, verifyUpload: async (p, tk) => tk === "demo:" + p,
    payments: { methods: {}, checkoutUrl: () => "" },
  };
  const result = await handle(db, action, payload, ctx).catch((e) => {
    safeSet(DEMO_DB_KEY, JSON.stringify(db)); // tick() o'zgarishlarini saqlaymiz
    throw e;
  });
  if (!READ_ONLY.has(action) || !safeGet(DEMO_DB_KEY)) {
    try {
      localStorage.setItem(DEMO_DB_KEY, JSON.stringify(db));
    } catch {
      throw new ApiError("Brauzer xotirasi to'ldi — kichikroq fayl yuklang");
    }
  }
  return result;
}

export function resetDemo() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(DEMO_FILE) || k === DEMO_DB_KEY).forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
  setToken(null);
}

// --- Umumiy chaqiruv -------------------------------------------------------
const translated = (e) => new ApiError(t(e.message, e.params), e.status, e.params);

export async function api(action, payload = {}) {
  await detectMode();
  if (mode === "demo") {
    try {
      return await demoCall(action, payload);
    } catch (e) {
      if (e.status === 401) setToken(null);
      throw translated(e);
    }
  }
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = "Bearer " + token;
  let r;
  try {
    r = await fetch("/api", { method: "POST", headers, body: JSON.stringify({ action, payload }) });
  } catch {
    throw new ApiError(t("Server bilan aloqa yo'q. Internetni tekshiring"), 0);
  }
  const data = await r.json().catch(() => ({ error: "Server javobi noto'g'ri" }));
  if (!r.ok) {
    if (r.status === 401) setToken(null);
    throw translated(new ApiError(data.error || "Xatolik", r.status, data.params));
  }
  return data;
}

// --- Fayllar -----------------------------------------------------------------
export const readAsDataUrl = (file) => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => res(fr.result);
  fr.onerror = () => rej(new Error(t("Faylni o'qib bo'lmadi")));
  fr.readAsDataURL(file);
});
const dataUrlToBlob = async (dataUrl) => (await fetch(dataUrl)).blob();

// Faylni yuklaydi. source: File yoki data URL. Natija: { path, url, name, size }
export async function uploadFile(source, { purpose, refId, name } = {}) {
  const isFile = typeof source !== "string";
  const blob = isFile ? source : await dataUrlToBlob(source);
  const meta = { purpose, refId, contentType: blob.type, size: blob.size };
  const init = await api("uploadInit", meta);
  const fileName = name || (isFile ? source.name : "rasm.jpg");
  if (init.mode === "signed") {
    const fd = new FormData();
    fd.append("cacheControl", "3600");
    fd.append("", blob, fileName);
    const r = await fetch(init.signedUrl, { method: "PUT", body: fd, headers: { "x-upsert": "false" } });
    if (!r.ok) throw new ApiError(t("Faylni yuklashda xatolik"), r.status);
    return { path: init.path, url: init.publicUrl, name: fileName, size: blob.size };
  }
  const dataUrl = isFile ? await readAsDataUrl(source) : source;
  if (init.public) return { path: init.path, url: dataUrl, name: fileName, size: blob.size }; // rasm bazada saqlanadi
  await api("uploadInline", { path: init.path, token: init.token, dataUrl });
  return { path: init.path, url: null, name: fileName, size: blob.size };
}

// Maxfiy faylni (shartnoma, chek) ochish / yuklab olish
export async function openFile(path, name = "fayl") {
  const win = window.open("", "_blank");
  try {
    const { url } = await api("fileUrl", { path });
    if (url.startsWith("data:")) {
      const blobUrl = URL.createObjectURL(await dataUrlToBlob(url));
      if (win) win.location = blobUrl;
      else Object.assign(document.createElement("a"), { href: blobUrl, download: name }).click();
    } else if (win) win.location = url;
    else location.href = url;
  } catch (e) {
    win?.close();
    throw e;
  }
}
