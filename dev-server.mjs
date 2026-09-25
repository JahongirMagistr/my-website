// Lokal ishga tushirish: `npm run dev` → http://localhost:8888
// Ma'lumotlar .data/db.json faylida saqlanadi (Netlify'da esa Netlify Blobs'da).
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { handleRequest } from "./server/handler.mjs";

const PORT = Number(process.env.PORT) || 8888;
const ROOT = path.resolve("public");
const DATA = path.resolve(".data/db.json");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json", ".webmanifest": "application/manifest+json" };

let version = 0;
const storage = {
  async load() {
    try {
      return { db: JSON.parse(await fs.readFile(DATA, "utf8")), etag: String(version) };
    } catch {
      return null;
    }
  },
  async save(db, etag) {
    if (etag !== null && etag !== String(version)) return false;
    await fs.mkdir(path.dirname(DATA), { recursive: true });
    await fs.writeFile(DATA, JSON.stringify(db));
    version++;
    return true;
  },
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/api") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request(url, { method: req.method, headers: req.headers, body: req.method === "POST" ? Buffer.concat(chunks) : undefined });
    const response = await handleRequest(request, storage);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    return res.end(await response.text());
  }
  let file = path.join(ROOT, path.normalize(url.pathname));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  try {
    if ((await fs.stat(file)).isDirectory()) file = path.join(file, "index.html");
    const data = await fs.readFile(file);
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(200, { "content-type": TYPES[".html"] });
    res.end(await fs.readFile(path.join(ROOT, "index.html")));
  }
}).listen(PORT, () => console.log(`Agricrowd.uz: http://localhost:${PORT}`));
