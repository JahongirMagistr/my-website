// Saqlash joyini tanlash: SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY bo'lsa — Supabase,
// aks holda Netlify Blobs (Netlify'da) yoki lokal fayllar (dev-server).
import { supabaseStorage } from "./supabase.mjs";

export function supabaseFromEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? supabaseStorage(url, key) : null;
}

let cached;
export async function netlifyStorage() {
  if (cached) return cached;
  const sb = supabaseFromEnv();
  if (sb) return (cached = sb);
  const { getStore } = await import("@netlify/blobs");
  const store = getStore({ name: "agricrowd", consistency: "strong" });
  const files = getStore({ name: "agricrowd-files", consistency: "strong" });
  return {
    async load() {
      const res = await store.getWithMetadata("db", { type: "json" });
      return res ? { db: res.data, etag: res.etag } : { db: null, etag: null };
    },
    async save(db, etag) {
      if (db.logs.length > 3000) db.logs.length = 3000;
      const { modified } = await store.setJSON("db", db, etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
      return modified;
    },
    files: {
      mode: "inline",
      putInline: (path, dataUrl) => files.set(path, dataUrl),
      getInline: (path) => files.get(path, { type: "text" }),
    },
  };
}
