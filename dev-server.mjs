// Lokal ishga tushirish: `npm run dev` → http://localhost:8888
// Saqlash: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY bo'lsa — Supabase;
// DATABASE_URL bo'lsa — to'g'ridan-to'g'ri PostgreSQL (supabase/schema.sql bilan);
// aks holda .data/ papkasidagi fayllar.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { handleRequest, handlePayme, handleClick, handleTelegram } from "./server/handler.mjs";
import { supabaseFromEnv } from "./server/storage.mjs";
import { createDbAdapter } from "./server/supabase.mjs";

const PORT = Number(process.env.PORT) || 8888;
const ROOT = path.resolve("public");
const DATA = path.resolve(".data");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".json": "application/json", ".pdf": "application/pdf" };

const localFiles = {
  mode: "inline",
  async putInline(p, dataUrl) {
    const file = path.join(DATA, "files", p);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, dataUrl);
  },
  async getInline(p) {
    try { return await fs.readFile(path.join(DATA, "files", p), "utf8"); } catch { return null; }
  },
};

async function makeStorage() {
  const sb = supabaseFromEnv();
  if (sb) return sb;
  if (process.env.DATABASE_URL) {
    const { default: pg } = await import("pg");
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const rpc = async (name, args) => {
      const sql = name === "agri_load" ? "select public.agri_load($1) as r" : "select public.agri_apply($1, $2, $3) as r";
      const params = name === "agri_load" ? [args.log_limit] : [args.expected_version, JSON.stringify(args.changes), args.new_settings == null ? null : JSON.stringify(args.new_settings)];
      return (await pool.query(sql, params)).rows[0].r;
    };
    console.log("Saqlash: PostgreSQL");
    return { ...createDbAdapter(rpc), files: localFiles };
  }
  let version = 0;
  return {
    async load() {
      try {
        return { db: JSON.parse(await fs.readFile(path.join(DATA, "db.json"), "utf8")), etag: String(version) };
      } catch {
        return { db: null, etag: null };
      }
    },
    async save(db, etag) {
      if (etag !== null && etag !== String(version)) return false;
      await fs.mkdir(DATA, { recursive: true });
      await fs.writeFile(path.join(DATA, "db.json"), JSON.stringify(db));
      version++;
      return true;
    },
    files: localFiles,
  };
}

const storage = await makeStorage();
const ROUTES = { "/api": handleRequest, "/api/payme": handlePayme, "/api/click": handleClick, "/api/telegram": handleTelegram };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const handler = ROUTES[url.pathname];
  if (handler) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request(url, { method: req.method, headers: req.headers, body: req.method === "POST" ? Buffer.concat(chunks) : undefined });
    try {
      const response = await handler(request, storage);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      return res.end(await response.text());
    } catch (e) {
      console.error(e);
      res.writeHead(500);
      return res.end("error");
    }
  }
  let file = path.join(ROOT, path.normalize(url.pathname));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  try {
    if ((await fs.stat(file)).isDirectory()) file = path.join(file, "index.html");
    const data = await fs.readFile(file);
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  }
}).listen(PORT, () => console.log(`Agricrowd.uz: http://localhost:${PORT}`));
