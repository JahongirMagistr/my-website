// Payme va Click protokollari
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { seed, emptyDb, handle } from "../public/js/core.js";

process.env.PAYME_MERCHANT_ID = "m1";
process.env.PAYME_KEY = "secret-key";
process.env.CLICK_SERVICE_ID = "11";
process.env.CLICK_MERCHANT_ID = "22";
process.env.CLICK_SECRET_KEY = "click-secret";
const { paymeRpc, clickCallback, checkoutUrl, paymentConfig } = await import("../server/payments.mjs");

const hash = async (p, s) => `${s}:${p}`;
async function setup(method) {
  const db = await seed(emptyDb(), { hash, adminEmail: "a@a.uz", adminPassword: "x", demo: true });
  const ctx = { user: db.users.find((u) => u.id === "u_inv2"), hash, outbox: [], payments: { methods: paymentConfig().methods, checkoutUrl } };
  const { payment, redirectUrl } = await handle(db, "createPayment", { method, amount: 150_000, returnUrl: "https://x/#/r" }, ctx);
  return { db, payment, redirectUrl, user: ctx.user };
}
const auth = "Basic " + Buffer.from("Paycom:secret-key").toString("base64");

test("Payme: to'liq sikl va xatolar", async () => {
  const { db, payment, redirectUrl, user } = await setup("payme");
  assert.match(Buffer.from(redirectUrl.split("/").pop(), "base64").toString(), /m=m1;ac\.order_id=.+;a=15000000/);
  const start = user.balance;
  const call = (method, params) => paymeRpc(db, { id: 1, method, params }, auth, { outbox: [] });
  assert.equal((await paymeRpc(db, { id: 1, method: "CheckPerformTransaction", params: {} }, "Basic bad", {})).error.code, -32504);
  assert.equal((await call("CheckPerformTransaction", { amount: 1, account: { order_id: payment.id } })).error.code, -31001);
  assert.equal((await call("CheckPerformTransaction", { amount: 15_000_000, account: { order_id: "nope" } })).error.code, -31050);
  assert.deepEqual((await call("CheckPerformTransaction", { amount: 15_000_000, account: { order_id: payment.id } })).result, { allow: true });
  const cr = await call("CreateTransaction", { id: "pm1", time: Date.now(), amount: 15_000_000, account: { order_id: payment.id } });
  assert.equal(cr.result.state, 1);
  assert.equal((await call("CreateTransaction", { id: "pm2", time: Date.now(), amount: 15_000_000, account: { order_id: payment.id } })).error.code, -31051);
  const pr = await call("PerformTransaction", { id: "pm1" });
  assert.equal(pr.result.state, 2);
  assert.equal(user.balance, start + 150_000);
  assert.equal((await call("PerformTransaction", { id: "pm1" })).result.state, 2, "takroriy so'rov idempotent");
  assert.equal(user.balance, start + 150_000);
  assert.equal((await call("CheckTransaction", { id: "pm1" })).result.state, 2);
  const cancel = await call("CancelTransaction", { id: "pm1", reason: 5 });
  assert.equal(cancel.result.state, -2);
  assert.equal(user.balance, start);
  assert.equal((await call("GetStatement", { from: 0, to: Date.now() + 1000 })).result.transactions.length, 1);
  assert.equal((await call("Foo", {})).error.code, -32601);
});

test("Click: prepare → complete va imzo tekshiruvi", async () => {
  const { db, payment, redirectUrl, user } = await setup("click");
  assert.match(redirectUrl, /my\.click\.uz\/services\/pay\?service_id=11&merchant_id=22&amount=150000&transaction_param=/);
  const start = user.balance;
  const md5 = (s) => crypto.createHash("md5").update(s).digest("hex");
  const base = { click_trans_id: "777", service_id: "11", click_paydoc_id: "1", merchant_trans_id: payment.id, amount: "150000.00", error: "0", sign_time: "2026-09-27 10:00:00" };
  const prep = { ...base, action: "0" };
  prep.sign_string = md5(`${prep.click_trans_id}${prep.service_id}click-secret${prep.merchant_trans_id}${prep.amount}${prep.action}${prep.sign_time}`);
  assert.equal((await clickCallback(db, { ...prep, sign_string: "bad" }, {})).error, -1);
  const r1 = await clickCallback(db, prep, { outbox: [] });
  assert.equal(r1.error, 0);
  const comp = { ...base, action: "1", merchant_prepare_id: String(r1.merchant_prepare_id) };
  comp.sign_string = md5(`${comp.click_trans_id}${comp.service_id}click-secret${comp.merchant_trans_id}${comp.merchant_prepare_id}${comp.amount}${comp.action}${comp.sign_time}`);
  const r2 = await clickCallback(db, comp, { outbox: [] });
  assert.equal(r2.error, 0);
  assert.equal(user.balance, start + 150_000);
  assert.equal((await clickCallback(db, comp, { outbox: [] })).error, -4, "ikkinchi marta — Already paid");
});
