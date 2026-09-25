// Umumiy API so'rov ishlovchisi: Netlify Function va lokal dev-server uchun.
import crypto from "node:crypto";
import { handle, tick, seed, emptyDb, ApiError, READ_ONLY } from "../public/js/core.js";

const SECRET = process.env.AUTH_SECRET || "agricrowd-dev-secret-change-me";
const TOKEN_TTL = 1000 * 60 * 60 * 24 * 7; // 7 kun

export const hash = async (password, salt) =>
  crypto.scryptSync(password, salt, 32).toString("hex");

const b64 = (s) => Buffer.from(s).toString("base64url");
const sign = (data) => crypto.createHmac("sha256", SECRET).update(data).digest("base64url");

export async function issueToken(user) {
  const body = b64(JSON.stringify({ uid: user.id, exp: Date.now() + TOKEN_TTL }));
  return `${body}.${sign(body)}`;
}

function readToken(token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = sign(body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    return data.exp > Date.now() ? data.uid : null;
  } catch {
    return null;
  }
}

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

const json = (status, data) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

// storage: { load(): Promise<{db, etag}|null>, save(db, etag): Promise<boolean> }
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

  // Optimistik parallellik: boshqa so'rov bazani o'zgartirgan bo'lsa, qayta urinamiz
  for (let attempt = 0; attempt < 5; attempt++) {
    let loaded = await storage.load();
    let isNew = false;
    if (!loaded) {
      loaded = { db: await initialDb(), etag: null };
      isNew = true;
    }
    const { db, etag } = loaded;
    const uidFromToken = readToken(token);
    const user = uidFromToken ? db.users.find((u) => u.id === uidFromToken) || null : null;
    const ticked = tick(db);
    try {
      const result = await handle(db, action, payload, { user, hash, issueToken });
      const mutated = isNew || ticked || !READ_ONLY.has(action);
      if (mutated && !(await storage.save(db, etag))) continue; // konflikt — qayta
      return json(200, result);
    } catch (e) {
      if (e instanceof ApiError) {
        if ((isNew || ticked) && !(await storage.save(db, etag))) continue;
        return json(e.status, { error: e.message });
      }
      console.error(e);
      return json(500, { error: "Serverda xatolik yuz berdi" });
    }
  }
  return json(409, { error: "Server band, qayta urinib ko'ring" });
}
