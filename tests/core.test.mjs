import { test } from "node:test";
import assert from "node:assert/strict";
import { handle, seed, emptyDb, tick } from "../public/js/core.js";

const hash = async (p, s) => `${s}:${p}`;
const issueToken = async (u) => u.id;
async function setup() {
  const db = await seed(emptyDb(), { hash, adminEmail: "admin@agricrowd.uz", adminPassword: "Admin123!", demo: true });
  const as = (id) => ({ user: db.users.find((u) => u.id === id), hash, issueToken });
  return { db, as };
}

test("fermer loyihasi admin tasdig'isiz e'lon qilinmaydi", async () => {
  const { db, as } = await setup();
  const { project } = await handle(db, "createProject", { title: "Test", crop: "Karam", region: "Jizzax", goal: 10_000_000, durationMonths: 5, fundingDeadline: "2099-01-01", investorShare: 40 }, as("u_farm1"));
  assert.equal(project.status, "pending");
  const boot = await handle(db, "bootstrap", {}, {});
  assert.ok(!boot.projects.some((p) => p.id === project.id));
  await handle(db, "reviewProject", { id: project.id, decision: "approve" }, as("u_admin"));
  const boot2 = await handle(db, "bootstrap", {}, {});
  assert.ok(boot2.projects.some((p) => p.id === project.id));
});

test("investor boshqa rol amallarini bajara olmaydi", async () => {
  const { db, as } = await setup();
  await assert.rejects(handle(db, "adminData", {}, as("u_inv1")), /ruxsat/);
  await assert.rejects(handle(db, "createProject", {}, as("u_inv1")), /ruxsat/);
  await assert.rejects(handle(db, "invest", { projectId: "p_tomato", amount: 1e6 }, {}), /kirish/);
});

test("100% yig'ilganda loyiha moliyalashtiriladi va mablag' fermerga ajratiladi", async () => {
  const { db, as } = await setup();
  const p = db.projects.find((x) => x.id === "p_tomato");
  const remaining = p.goal - p.raised;
  await assert.rejects(handle(db, "invest", { projectId: p.id, amount: remaining + 1 }, as("u_inv1")), /ortiq/);
  await handle(db, "deposit", { amount: remaining }, as("u_inv1"));
  const res = await handle(db, "invest", { projectId: p.id, amount: remaining }, as("u_inv1"));
  assert.equal(res.project.status, "funded");
  assert.equal(db.users.find((u) => u.id === "u_farm1").balance, p.goal);
});

test("muddatda 100% yig'ilmasa mablag'lar qaytariladi", async () => {
  const { db } = await setup();
  const p = db.projects.find((x) => x.id === "p_potato");
  const inv2 = db.users.find((u) => u.id === "u_inv2");
  const before = inv2.balance;
  p.fundingDeadline = "2000-01-01";
  assert.equal(tick(db), true);
  assert.equal(p.status, "refunded");
  assert.equal(inv2.balance, before + 21_000_000);
});

test("daromad investorlar ulushiga mos taqsimlanadi, komissiya olinadi", async () => {
  const { db, as } = await setup();
  const b1 = db.users.find((u) => u.id === "u_inv1").balance;
  await handle(db, "distribute", { id: "p_cucumber", actualRevenue: 200_000_000 }, as("u_admin"));
  const p = db.projects.find((x) => x.id === "p_cucumber");
  assert.equal(p.status, "completed");
  // ulush 40% = 80 mln, komissiya 5% = 4 mln, investorlarga 76 mln; inv1 30/45 qism
  assert.equal(p.distribution.commission, 4_000_000);
  assert.equal(db.users.find((u) => u.id === "u_inv1").balance - b1, Math.round(76_000_000 * 30 / 45));
  const paid = db.investments.filter((i) => i.projectId === "p_cucumber").reduce((s, i) => s + i.payout, 0);
  assert.equal(paid, 76_000_000);
});

test("ro'yxatdan o'tish va kirish", async () => {
  const { db } = await setup();
  const ctx = { hash, issueToken };
  await handle(db, "register", { role: "investor", name: "Ali", email: "ali@x.uz", password: "secret1" }, ctx);
  await assert.rejects(handle(db, "register", { role: "investor", name: "Ali", email: "ali@x.uz", password: "secret1" }, ctx), /allaqachon/);
  await assert.rejects(handle(db, "login", { email: "ali@x.uz", password: "wrong" }, ctx), /noto'g'ri/);
  const r = await handle(db, "login", { email: "ALI@x.uz", password: "secret1" }, ctx);
  assert.equal(r.user.role, "investor");
  assert.equal(r.user.passHash, undefined);
});
