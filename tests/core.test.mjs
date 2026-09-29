import { test } from "node:test";
import assert from "node:assert/strict";
import { handle, seed, emptyDb, tick } from "../public/js/core.js";

const hash = async (p, s) => `${s}:${p}`;
const issueToken = async (u) => u.id;
const files = { mode: "inline", putInline: async () => {}, getInline: async () => "data:application/pdf;base64,AA==" };
async function setup() {
  const db = await seed(emptyDb(), { hash, adminEmail: "admin@agricrowd.uz", adminPassword: "Admin123!", demo: true });
  const as = (id) => ({ user: db.users.find((u) => u.id === id), hash, issueToken, outbox: [], files, payments: { methods: {} } });
  return { db, as };
}
const pdf = (path) => ({ path, name: "s.pdf", size: 100 });

test("fermer loyihasi admin tasdig'isiz e'lon qilinmaydi", async () => {
  const { db, as } = await setup();
  const { project } = await handle(db, "createProject", { title: "Test", crop: "Karam", region: "Jizzax", goal: 10_000_000, durationMonths: 5, fundingDeadline: "2099-01-01", investorShare: 40 }, as("u_farm1"));
  assert.equal(project.status, "pending");
  assert.ok(!(await handle(db, "bootstrap", {}, {})).projects.some((p) => p.id === project.id));
  await handle(db, "reviewProject", { id: project.id, decision: "approve" }, as("u_admin"));
  assert.ok((await handle(db, "bootstrap", {}, {})).projects.some((p) => p.id === project.id));
});

test("rollar bo'yicha ruxsatlar", async () => {
  const { db, as } = await setup();
  await assert.rejects(handle(db, "adminData", {}, as("u_inv1")), /ruxsat/);
  await assert.rejects(handle(db, "createProject", {}, as("u_inv1")), /ruxsat/);
  await assert.rejects(handle(db, "invest", { projectId: "p_tomato", amount: 1e6 }, {}), /kirish/);
});

test("100%: shartnomalar yaratiladi, mablag' faqat hammasi tasdiqlangach ajratiladi", async () => {
  const { db, as } = await setup();
  const p = db.projects.find((x) => x.id === "p_tomato");
  const remaining = p.goal - p.raised;
  db.users.find((u) => u.id === "u_inv1").balance = remaining;
  await assert.rejects(handle(db, "invest", { projectId: p.id, amount: remaining + 1 }, as("u_inv1")), /ortiq/);
  const ctx = as("u_inv1");
  const res = await handle(db, "invest", { projectId: p.id, amount: remaining }, ctx);
  assert.equal(res.project.status, "funded");
  const contracts = db.contracts.filter((c) => c.projectId === p.id);
  assert.equal(contracts.length, 2); // ikki investor
  assert.ok(ctx.outbox.some((m) => m.title === "Shartnomani imzolash vaqti keldi"));
  const farmer = db.users.find((u) => u.id === "u_farm1");
  assert.equal(farmer.balance, 0, "mablag' hali ajratilmagan");

  // begona foydalanuvchi shartnomaga fayl yuklay olmaydi
  await assert.rejects(handle(db, "submitContractFile", { contractId: contracts[0].id, file: pdf(`contracts/${contracts[0].id}/investor-x.pdf`) }, as("u_farm2")), /tegishli emas/);
  // noto'g'ri papkadagi fayl rad etiladi
  const c0 = contracts.find((c) => c.investorId === "u_inv1");
  await assert.rejects(handle(db, "submitContractFile", { contractId: c0.id, file: pdf("receipts/x.pdf") }, as("u_inv1")), /noto'g'ri/);

  for (const c of contracts) {
    await handle(db, "submitContractFile", { contractId: c.id, file: pdf(`contracts/${c.id}/investor-a.pdf`) }, as(c.investorId));
    await handle(db, "submitContractFile", { contractId: c.id, file: pdf(`contracts/${c.id}/farmer-a.pdf`) }, as("u_farm1"));
  }
  assert.ok(contracts.every((c) => c.status === "signed"));
  await handle(db, "reviewContract", { id: contracts[0].id, decision: "verify" }, as("u_admin"));
  assert.equal(farmer.balance, 0, "bitta shartnoma yetarli emas");
  // rad etish: fermer fayli o'chadi
  await handle(db, "reviewContract", { id: contracts[1].id, decision: "reject", side: "farmer", note: "Muhr ko'rinmaydi" }, as("u_admin"));
  assert.equal(contracts[1].status, "partial");
  await handle(db, "submitContractFile", { contractId: contracts[1].id, file: pdf(`contracts/${contracts[1].id}/farmer-b.pdf`) }, as("u_farm1"));
  await handle(db, "reviewContract", { id: contracts[1].id, decision: "verify" }, as("u_admin"));
  assert.equal(farmer.balance, p.goal);
  assert.ok(p.disbursedAt);
});

test("muddatda 100% yig'ilmasa mablag'lar qaytariladi", async () => {
  const { db } = await setup();
  const p = db.projects.find((x) => x.id === "p_potato");
  const inv2 = db.users.find((u) => u.id === "u_inv2");
  const before = inv2.balance;
  p.fundingDeadline = "2000-01-01";
  assert.equal(tick(db, { outbox: [] }), true);
  assert.equal(p.status, "refunded");
  assert.equal(inv2.balance, before + 21_000_000);
});

test("daromad investorlar ulushiga mos taqsimlanadi, komissiya olinadi", async () => {
  const { db, as } = await setup();
  const b1 = db.users.find((u) => u.id === "u_inv1").balance;
  await handle(db, "distribute", { id: "p_cucumber", actualRevenue: 200_000_000 }, as("u_admin"));
  const p = db.projects.find((x) => x.id === "p_cucumber");
  assert.equal(p.status, "completed");
  assert.equal(p.distribution.commission, 4_000_000);
  assert.equal(db.users.find((u) => u.id === "u_inv1").balance - b1, Math.round(76_000_000 * 30 / 45));
  assert.equal(db.investments.filter((i) => i.projectId === "p_cucumber").reduce((s, i) => s + i.payout, 0), 76_000_000);
});

test("bank o'tkazmasi: chek → admin tasdig'i → balans; yechish so'rovi", async () => {
  const { db, as } = await setup();
  const u = db.users.find((x) => x.id === "u_inv2");
  const start = u.balance;
  const { payment } = await handle(db, "createPayment", { method: "bank", amount: 2_000_000 }, as("u_inv2"));
  assert.equal(payment.status, "pending");
  await assert.rejects(handle(db, "attachReceipt", { paymentId: payment.id, file: pdf(`receipts/${payment.id}/a.pdf`) }, as("u_inv1")), /ruxsat/);
  await handle(db, "attachReceipt", { paymentId: payment.id, file: pdf(`receipts/${payment.id}/a.pdf`) }, as("u_inv2"));
  assert.equal(payment.status, "review");
  assert.equal(u.balance, start);
  await handle(db, "reviewPayment", { id: payment.id, decision: "approve" }, as("u_admin"));
  assert.equal(u.balance, start + 2_000_000);
  await assert.rejects(handle(db, "reviewPayment", { id: payment.id, decision: "approve" }, as("u_admin")), /allaqachon/);

  await assert.rejects(handle(db, "requestWithdrawal", { amount: 1_000_000 }, as("u_inv2")), /rekvizit/);
  u.bank = { card: "8600000000000000" };
  const { withdrawal } = await handle(db, "requestWithdrawal", { amount: 1_000_000 }, as("u_inv2"));
  assert.equal(u.balance, start + 1_000_000);
  await handle(db, "reviewWithdrawal", { id: withdrawal.id, decision: "reject", note: "x" }, as("u_admin"));
  assert.equal(u.balance, start + 2_000_000, "rad etilganda qaytariladi");
});

test("test to'lov faqat sozlamada yoqilganda ishlaydi", async () => {
  const { db, as } = await setup();
  db.settings.testPayments = false;
  await assert.rejects(handle(db, "createPayment", { method: "test", amount: 1_000_000 }, as("u_inv1")), /mavjud emas/);
});

test("fayl o'qish huquqi", async () => {
  const { db, as } = await setup();
  const c = db.contracts[0];
  await handle(db, "fileUrl", { path: `contracts/${c.id}/investor-a.pdf` }, as(c.investorId));
  await assert.rejects(handle(db, "fileUrl", { path: `contracts/${c.id}/investor-a.pdf` }, as("u_farm1")), /ruxsat/);
  await assert.rejects(handle(db, "fileUrl", { path: `contracts/${c.id}/investor-a.pdf` }, {}), /kirish/);
});

test("ro'yxatdan o'tish va kirish", async () => {
  const { db } = await setup();
  const ctx = { hash, issueToken, outbox: [] };
  await handle(db, "register", { role: "investor", name: "Ali", email: "ali@x.uz", password: "secret1" }, ctx);
  await assert.rejects(handle(db, "register", { role: "investor", name: "Ali", email: "ali@x.uz", password: "secret1" }, ctx), /allaqachon/);
  await assert.rejects(handle(db, "login", { email: "ali@x.uz", password: "wrong" }, ctx), /noto'g'ri/);
  const r = await handle(db, "login", { email: "ALI@x.uz", password: "secret1" }, ctx);
  assert.equal(r.user.role, "investor");
  assert.equal(r.user.passHash, undefined);
});

test("rasm manzillari tekshiriladi", async () => {
  const { db, as } = await setup();
  await handle(db, "adminUpdateProject", { id: "p_tomato", image: "x');background:url(evil" }, as("u_admin"));
  assert.equal(db.projects.find((p) => p.id === "p_tomato").image, "");
  await handle(db, "adminUpdateProject", { id: "p_tomato", image: "https://abc.supabase.co/storage/v1/object/public/media/images/a.jpg" }, as("u_admin"));
  assert.match(db.projects.find((p) => p.id === "p_tomato").image, /^https:/);
});

test("demo ma'lumotlarni o'chirish: haqiqiy ma'lumotlar saqlanadi", async () => {
  const { db, as } = await setup();
  const ctx = { hash, issueToken, outbox: [] };
  const real = (await handle(db, "register", { role: "farmer", name: "Haqiqiy Fermer", email: "real@x.uz", password: "secret1" }, ctx)).user;
  const { project } = await handle(db, "createProject", { title: "Real", crop: "Karam", region: "Jizzax", goal: 10_000_000, durationMonths: 5, fundingDeadline: "2099-01-01", investorShare: 40 }, as(real.id));
  await assert.rejects(handle(db, "purgeDemo", {}, as("u_inv1")), /ruxsat/);
  const r = await handle(db, "purgeDemo", {}, as("u_admin"));
  assert.ok(r.removed > 20);
  assert.deepEqual(db.users.map((u) => u.id).sort(), ["u_admin", real.id].sort());
  assert.deepEqual(db.projects.map((p) => p.id), [project.id]);
  assert.equal(db.investments.length + db.contracts.length + db.news.length, 0);
  assert.equal(db.settings.testPayments, false);
  assert.equal(db.settings.showDemoLogins, false);
  assert.equal((await handle(db, "bootstrap", {}, {})).stats.totalRaised, 0);
});

test("parolni email orqali tiklash", async () => {
  const { db } = await setup();
  const outbox = [];
  const ctx = { hash, issueToken, outbox };
  await handle(db, "forgotPassword", { email: "nobody@x.uz" }, ctx);
  assert.equal(outbox.length, 0, "yo'q email — xat yuborilmaydi, javob esa bir xil");
  await handle(db, "forgotPassword", { email: "INVESTOR@agricrowd.uz" }, ctx);
  assert.equal(outbox.length, 1);
  const link = new URLSearchParams(outbox[0].link.split("?")[1]);
  const token = link.get("token");
  const u = db.users.find((x) => x.id === "u_inv1");
  assert.ok(u.resetHash && u.resetHash !== token, "token ochiq holda saqlanmaydi");
  await handle(db, "forgotPassword", { email: "investor@agricrowd.uz" }, ctx);
  assert.equal(outbox.length, 1, "1 daqiqa ichida takroriy xat yuborilmaydi");
  await assert.rejects(handle(db, "resetPassword", { email: "investor@agricrowd.uz", token: "bad", password: "newpass1" }, ctx), /muddati/);
  await handle(db, "resetPassword", { email: "investor@agricrowd.uz", token, password: "newpass1" }, ctx);
  await handle(db, "login", { email: "investor@agricrowd.uz", password: "newpass1" }, ctx);
  await assert.rejects(handle(db, "resetPassword", { email: "investor@agricrowd.uz", token, password: "other12" }, ctx), /muddati/, "token bir martalik");
  const { user } = await handle(db, "me", {}, { user: u });
  assert.equal(user.resetHash, undefined);
});

test("Telegram: hisobni ulash va xabarlar", async () => {
  const { telegramUpdate } = await import("../public/js/core.js");
  const { db, as } = await setup();
  const ctx = { ...as("u_inv1"), telegram: { bot: "agricrowd_bot" } };
  await assert.rejects(handle(db, "telegramLink", {}, as("u_inv1")), /ulanmagan/);
  const { url } = await handle(db, "telegramLink", {}, ctx);
  const code = url.split("start=")[1];
  assert.match(url, /^https:\/\/t\.me\/agricrowd_bot\?start=/);
  assert.equal(telegramUpdate(db, { message: { chat: { id: 555 }, text: "/start wrong" } }).key.includes("xush kelibsiz"), true);
  const r = telegramUpdate(db, { message: { chat: { id: 555 }, text: `/start ${code}` } });
  assert.match(r.key, /ulandi/);
  const u = db.users.find((x) => x.id === "u_inv1");
  assert.equal(u.telegramChatId, "555");
  assert.equal((await handle(db, "me", {}, { user: u })).user.telegramLinked, true);
  const adminOut = [];
  u.bank = { card: "8600" };
  await handle(db, "requestWithdrawal", { amount: 10000 }, { ...as("u_inv1"), outbox: adminOut });
  await handle(db, "reviewWithdrawal", { id: db.withdrawals[0].id, decision: "paid" }, { ...as("u_admin"), outbox: adminOut });
  assert.ok(adminOut.some((m) => m.telegramChatId === "555"), "investor xabari Telegram'ga ham ketadi");
  telegramUpdate(db, { message: { chat: { id: 555 }, text: "/stop" } });
  assert.equal(u.telegramChatId, null);
});

test("loyiha hujjatlari: kim yuklay va ko'ra oladi", async () => {
  const { db, as } = await setup();
  const doc = (p) => ({ path: `projects/${p}/a.pdf`, name: "ijara.pdf", size: 10 });
  await assert.rejects(handle(db, "uploadInit", { purpose: "project-doc", refId: "p_tomato", contentType: "application/pdf", size: 10 }, as("u_farm2")), /tegishli emas/);
  await handle(db, "uploadInit", { purpose: "project-doc", refId: "p_tomato", contentType: "application/pdf", size: 10 }, { ...as("u_farm1"), signUpload: async () => "t" });
  await handle(db, "addProjectDoc", { projectId: "p_tomato", title: "Yer ijarasi", file: doc("p_tomato") }, as("u_farm1"));
  await assert.rejects(handle(db, "addProjectDoc", { projectId: "p_tomato", file: doc("p_potato") }, as("u_farm1")), /noto'g'ri/);
  const path = "projects/p_tomato/a.pdf";
  await handle(db, "fileUrl", { path }, as("u_inv1")); // mablag' kiritgan investor
  await handle(db, "fileUrl", { path }, as("u_admin"));
  const ctx = { hash, issueToken, outbox: [] };
  const other = (await handle(db, "register", { role: "investor", name: "B", email: "b@x.uz", password: "secret1" }, ctx)).user;
  await assert.rejects(handle(db, "fileUrl", { path }, as(other.id)), /ruxsat/);
  assert.equal((await handle(db, "getProject", { id: "p_tomato" }, as(other.id))).docs, undefined, "begona investorga hujjat ro'yxati berilmaydi");
  assert.equal((await handle(db, "getProject", { id: "p_tomato" }, as("u_inv1"))).docs.length, 1);
  assert.equal((await handle(db, "bootstrap", {}, {})).projects.find((p) => p.id === "p_tomato").docs, undefined);
  await assert.rejects(handle(db, "removeProjectDoc", { projectId: "p_tomato", path }, as("u_farm1")), /administrator/, "e'lon qilingan loyihada fermer o'chira olmaydi");
  await handle(db, "removeProjectDoc", { projectId: "p_tomato", path }, as("u_admin"));
});
