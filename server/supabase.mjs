// Supabase saqlash adapteri: ma'lumotlar PostgreSQL jadvallarida, fayllar Supabase Storage'da.
import { createClient } from "@supabase/supabase-js";
import { COLLECTIONS } from "../public/js/core.js";

// JS to'plami → jadval nomi
export const TABLES = {
  users: "users", projects: "projects", investments: "investments", updates: "monitoring_updates",
  transactions: "transactions", logs: "activity_logs", contracts: "contracts", notifications: "notifications",
  payments: "payments", withdrawals: "withdrawals", news: "news", messages: "messages",
};

const toSnake = (k) => k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const toCamel = (k) => k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const ISO_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
// Kalitlar tartibiga bog'liq bo'lmagan JSON (sozlamalarni solishtirish uchun)
const stable = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));

// Faqat yuqori darajadagi kalitlar o'giriladi (jsonb ichidagilar o'zgarmaydi)
export function rowFromDb(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) out[toCamel(k)] = typeof v === "string" && ISO_TS.test(v) ? new Date(v).toISOString() : v;
  return out;
}
export function rowToDb(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[toSnake(k)] = v;
  return out;
}

// rpc(name, args) → data; sinovlarda to'g'ridan-to'g'ri PostgreSQL bilan almashtiriladi
export function createDbAdapter(rpc) {
  return {
    async load() {
      const data = await rpc("agri_load", { log_limit: 1000 });
      const snap = {};
      const db = { settings: data.settings || null };
      let empty = true;
      for (const c of COLLECTIONS) {
        db[c] = (data[TABLES[c]] || []).map(rowFromDb);
        snap[c] = new Map(db[c].map((r) => [r.id, JSON.stringify(r)]));
        if (db[c].length) empty = false;
      }
      db.logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      db.transactions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      db.notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const etag = { version: Number(data.version), snap, settings: stable(data.settings) };
      return { db: empty && !data.settings ? null : db, etag };
    },

    async save(db, etag) {
      const snap = etag?.snap || {};
      const changes = {};
      let dirty = false;
      for (const c of COLLECTIONS) {
        const before = snap[c] || new Map();
        const seen = new Set();
        const upsert = [];
        for (const r of db[c]) {
          seen.add(r.id);
          if (before.get(r.id) !== JSON.stringify(r)) upsert.push(rowToDb(r));
        }
        const del = [...before.keys()].filter((id) => !seen.has(id));
        if (upsert.length || del.length) {
          changes[TABLES[c]] = { upsert, delete: del };
          dirty = true;
        }
      }
      const settingsChanged = stable(db.settings) !== etag?.settings;
      if (!dirty && !settingsChanged) return true;
      return !!(await rpc("agri_apply", { expected_version: etag?.version ?? 0, changes, new_settings: settingsChanged ? db.settings : null }));
    },
  };
}

export function supabaseStorage(url, serviceKey) {
  const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const rpc = async (name, args) => {
    const { data, error } = await sb.rpc(name, args);
    if (error) throw new Error(`${name}: ${error.message}`);
    return data;
  };
  return {
    ...createDbAdapter(rpc),
    files: {
      mode: "signed",
      async createSignedUpload(bucket, path) {
        const { data, error } = await sb.storage.from(bucket).createSignedUploadUrl(path);
        if (error) throw new Error(error.message);
        return data;
      },
      publicUrl: (bucket, path) => sb.storage.from(bucket).getPublicUrl(path).data.publicUrl,
      async signedUrl(bucket, path) {
        const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, 600);
        if (error) return null;
        return data.signedUrl;
      },
    },
  };
}
