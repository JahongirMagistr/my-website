// Supabase adapteri haqiqiy PostgreSQL'da (supabase/schema.sql bilan). DATABASE_URL bo'lmasa o'tkazib yuboriladi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createDbAdapter } from "../server/supabase.mjs";
import { seed, emptyDb, normalizeDb, handle } from "../public/js/core.js";

const url = process.env.TEST_DATABASE_URL;
test("PostgreSQL adapteri: saqlash, qayta yuklash, faqat o'zgarganlar, versiya konflikti", { skip: !url && "TEST_DATABASE_URL yo'q" }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url });
  const calls = [];
  const rpc = async (name, args) => {
    calls.push(name);
    const sql = name === "agri_load" ? "select public.agri_load($1) as r" : "select public.agri_apply($1, $2, $3) as r";
    const params = name === "agri_load" ? [args.log_limit] : [args.expected_version, JSON.stringify(args.changes), args.new_settings == null ? null : JSON.stringify(args.new_settings)];
    return (await pool.query(sql, params)).rows[0].r;
  };
  await pool.query("truncate users, projects, investments, monitoring_updates, contracts, payments, withdrawals, notifications, transactions, activity_logs, news, messages cascade; update agri_meta set version = 0, settings = null");
  const a = createDbAdapter(rpc);
  let l = await a.load();
  assert.equal(l.db, null);
  const db = await seed(emptyDb(), { hash: async (p, s) => s + p, adminEmail: "a@a.uz", adminPassword: "x", demo: true });
  assert.equal(await a.save(db, l.etag), true);

  l = await a.load();
  normalizeDb(l.db);
  assert.equal(l.db.projects.length, 5);
  assert.equal(l.db.users.find((u) => u.id === "u_farm1").farm.name, "«Tursunov Agro» fermer xo'jaligi");
  calls.length = 0;
  assert.equal(await a.save(l.db, l.etag), true);
  assert.deepEqual(calls, [], "o'zgarish bo'lmasa, bazaga yozilmaydi (barcha ustunlar mos)");

  const ctx = { user: l.db.users.find((u) => u.id === "u_inv1"), hash: async () => "", outbox: [] };
  await handle(l.db, "invest", { projectId: "p_potato", amount: 1_000_000 }, ctx);
  const stale = await a.load();
  assert.equal(await a.save(l.db, l.etag), true);
  stale.db.users[0].name = "X";
  assert.equal(await a.save(stale.db, stale.etag), false, "eskirgan versiya rad etiladi");

  const fresh = await a.load();
  assert.equal(fresh.db.projects.find((p) => p.id === "p_potato").raised, 22_000_000);
  fresh.db.projects = fresh.db.projects.filter((p) => p.id !== "p_carrot");
  assert.equal(await a.save(fresh.db, fresh.etag), true);
  assert.equal((await pool.query("select count(*) from projects")).rows[0].count, "4");
  await pool.end();
});

test("PostgreSQL: yangi maydonlar (parol tiklash, Telegram, hujjatlar) saqlanadi", { skip: !url && "TEST_DATABASE_URL yo'q" }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url });
  const rpc = async (name, args) => {
    const sql = name === "agri_load" ? "select public.agri_load($1) as r" : "select public.agri_apply($1, $2, $3) as r";
    const params = name === "agri_load" ? [args.log_limit] : [args.expected_version, JSON.stringify(args.changes), args.new_settings == null ? null : JSON.stringify(args.new_settings)];
    return (await pool.query(sql, params)).rows[0].r;
  };
  const a = createDbAdapter(rpc);
  const l = await a.load();
  const u = l.db.users.find((x) => x.id === "u_inv1");
  u.telegramChatId = "777"; u.resetHash = "h"; u.resetExp = new Date(Date.now() + 1e6).toISOString();
  l.db.projects[0].docs = [{ path: "projects/x/a.pdf", name: "a.pdf", title: "Ijara" }];
  assert.equal(await a.save(l.db, l.etag), true);
  const l2 = await a.load();
  const u2 = l2.db.users.find((x) => x.id === "u_inv1");
  assert.equal(u2.telegramChatId, "777");
  assert.equal(u2.resetHash, "h");
  assert.equal(l2.db.projects.find((p) => p.id === l.db.projects[0].id).docs[0].title, "Ijara");
  await pool.end();
});
