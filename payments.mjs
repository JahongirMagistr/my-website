// Rasmiy to'lov tizimlari: Payme (Merchant API) va Click (SHOP API).
// Merchant shartnomasi tuzilib, kalitlar muhit o'zgaruvchilariga kiritilgach avtomatik yoqiladi.
import crypto from "node:crypto";
import { creditPayment } from "../public/js/core.js";

const env = (k) => process.env[k] || "";

export function paymentConfig() {
  return {
    methods: {
      payme: !!(env("PAYME_MERCHANT_ID") && env("PAYME_KEY")),
      click: !!(env("CLICK_SERVICE_ID") && env("CLICK_MERCHANT_ID") && env("CLICK_SECRET_KEY")),
      uzum: false, // Uzum Bank merchant API — shartnoma va hujjatlar olingach ulanadi
    },
  };
}

const PAYME_ACCOUNT = () => env("PAYME_ACCOUNT_FIELD") || "order_id";

export function checkoutUrl(method, payment, returnUrl) {
  if (method === "payme") {
    const base = env("PAYME_TEST") === "true" ? "https://checkout.test.paycom.uz" : "https://checkout.paycom.uz";
    const params = [`m=${env("PAYME_MERCHANT_ID")}`, `ac.${PAYME_ACCOUNT()}=${payment.id}`, `a=${payment.amount * 100}`, "l=uz"];
    if (returnUrl) params.push(`c=${returnUrl}`);
    return `${base}/${Buffer.from(params.join(";")).toString("base64")}`;
  }
  if (method === "click") {
    const q = new URLSearchParams({ service_id: env("CLICK_SERVICE_ID"), merchant_id: env("CLICK_MERCHANT_ID"), amount: String(payment.amount), transaction_param: payment.id });
    if (returnUrl) q.set("return_url", returnUrl);
    return `https://my.click.uz/services/pay?${q}`;
  }
  throw new Error("unknown payment method");
}

// ---------------------------------------------------------------------------
// Payme Merchant API — https://developer.help.paycom.uz

const PAYME_TIMEOUT = 12 * 60 * 60 * 1000;
const msg = (uz, ru, en) => ({ uz, ru, en });
const PE = {
  auth: [-32504, msg("Ruxsat yo'q", "Недостаточно привилегий", "Insufficient privileges")],
  method: [-32601, msg("Metod topilmadi", "Метод не найден", "Method not found")],
  amount: [-31001, msg("Summa noto'g'ri", "Неверная сумма", "Incorrect amount")],
  notFound: [-31003, msg("Tranzaksiya topilmadi", "Транзакция не найдена", "Transaction not found")],
  cantCancel: [-31007, msg("Bekor qilib bo'lmaydi", "Невозможно отменить транзакцию", "Unable to cancel")],
  cantPerform: [-31008, msg("Amalni bajarib bo'lmaydi", "Невозможно выполнить операцию", "Unable to perform operation")],
  order: [-31050, msg("Buyurtma topilmadi", "Заказ не найден", "Order not found")],
  busy: [-31051, msg("Buyurtma bo'yicha boshqa to'lov kutilmoqda", "Заказ ожидает другую оплату", "Order is awaiting another payment")],
};

class PaymeError extends Error {
  constructor([code, message], data) { super(message.en); this.code = code; this.msg = message; this.data = data; }
}

function checkPaymeAuth(header) {
  const key = env("PAYME_KEY");
  if (!key || !header.startsWith("Basic ")) return false;
  const [login, pass] = Buffer.from(header.slice(6), "base64").toString().split(":");
  const a = Buffer.from(pass || "");
  const b = Buffer.from(key);
  return login === "Paycom" && a.length === b.length && crypto.timingSafeEqual(a, b);
}

const findByPaymeId = (db, id) => db.payments.find((p) => p.provider?.system === "payme" && p.provider.id === id);

function checkOrder(db, params) {
  const orderId = params.account?.[PAYME_ACCOUNT()];
  const p = db.payments.find((x) => x.id === orderId && x.method === "payme");
  if (!p) throw new PaymeError(PE.order, PAYME_ACCOUNT());
  if (Number(params.amount) !== p.amount * 100) throw new PaymeError(PE.amount);
  if (p.status !== "pending") throw new PaymeError(PE.order, PAYME_ACCOUNT());
  return p;
}

function cancelPayme(db, p, reason, ctx) {
  const pv = p.provider;
  if (pv.state === 1) {
    pv.state = -1;
  } else if (pv.state === 2) {
    const u = db.users.find((x) => x.id === p.userId);
    if (!u || (u.balance || 0) < p.amount) throw new PaymeError(PE.cantCancel);
    u.balance -= p.amount;
    db.transactions.unshift({ id: "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), userId: u.id, type: "adjust", amount: -p.amount, projectId: null, note: "To'lov bekor qilindi (Payme)", createdAt: new Date().toISOString() });
    pv.state = -2;
  }
  pv.cancelTime = Date.now();
  pv.reason = reason ?? null;
  p.status = "cancelled";
}

const paymeTx = (p) => ({
  create_time: p.provider.createTime, perform_time: p.provider.performTime || 0, cancel_time: p.provider.cancelTime || 0,
  transaction: p.id, state: p.provider.state, reason: p.provider.reason ?? null,
});

export async function paymeRpc(db, body, authHeader, ctx) {
  const { id = null, method, params = {} } = body || {};
  try {
    if (!checkPaymeAuth(authHeader)) throw new PaymeError(PE.auth);
    switch (method) {
      case "CheckPerformTransaction":
        checkOrder(db, params);
        return { id, result: { allow: true } };

      case "CreateTransaction": {
        const existing = findByPaymeId(db, params.id);
        if (existing) {
          if (existing.provider.state !== 1) throw new PaymeError(PE.cantPerform);
          if (Date.now() - existing.provider.createTime > PAYME_TIMEOUT) {
            cancelPayme(db, existing, 4, ctx);
            throw new PaymeError(PE.cantPerform);
          }
          return { id, result: { create_time: existing.provider.createTime, transaction: existing.id, state: 1 } };
        }
        const p = checkOrder(db, params);
        if (p.provider?.state === 1) throw new PaymeError(PE.busy, PAYME_ACCOUNT());
        p.provider = { system: "payme", id: params.id, time: params.time, createTime: Date.now(), performTime: 0, cancelTime: 0, state: 1, reason: null };
        p.providerTxId = params.id;
        return { id, result: { create_time: p.provider.createTime, transaction: p.id, state: 1 } };
      }

      case "PerformTransaction": {
        const p = findByPaymeId(db, params.id);
        if (!p) throw new PaymeError(PE.notFound);
        if (p.provider.state === 1) {
          if (Date.now() - p.provider.createTime > PAYME_TIMEOUT) {
            cancelPayme(db, p, 4, ctx);
            throw new PaymeError(PE.cantPerform);
          }
          p.provider.state = 2;
          p.provider.performTime = Date.now();
          creditPayment(db, p, ctx, "Payme orqali to'lov");
        } else if (p.provider.state !== 2) throw new PaymeError(PE.cantPerform);
        return { id, result: { transaction: p.id, perform_time: p.provider.performTime, state: 2 } };
      }

      case "CancelTransaction": {
        const p = findByPaymeId(db, params.id);
        if (!p) throw new PaymeError(PE.notFound);
        if (p.provider.state > 0) cancelPayme(db, p, params.reason, ctx);
        return { id, result: { transaction: p.id, cancel_time: p.provider.cancelTime, state: p.provider.state } };
      }

      case "CheckTransaction": {
        const p = findByPaymeId(db, params.id);
        if (!p) throw new PaymeError(PE.notFound);
        return { id, result: paymeTx(p) };
      }

      case "GetStatement": {
        const list = db.payments.filter((p) => p.provider?.system === "payme" && p.provider.time >= params.from && p.provider.time <= params.to);
        return {
          id,
          result: {
            transactions: list.map((p) => ({
              id: p.provider.id, time: p.provider.time, amount: p.amount * 100, account: { [PAYME_ACCOUNT()]: p.id }, receivers: null, ...paymeTx(p),
            })),
          },
        };
      }

      default:
        throw new PaymeError(PE.method);
    }
  } catch (e) {
    if (e instanceof PaymeError) return { id, error: { code: e.code, message: e.msg, data: e.data } };
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Click SHOP API — https://docs.click.uz

const md5 = (s) => crypto.createHash("md5").update(s).digest("hex");

export async function clickCallback(db, q, ctx) {
  const base = { click_trans_id: q.click_trans_id, merchant_trans_id: q.merchant_trans_id };
  const err = (error, error_note, extra = {}) => ({ ...base, ...extra, error, error_note });
  const action = Number(q.action);
  const signSrc = action === 1
    ? `${q.click_trans_id}${q.service_id}${env("CLICK_SECRET_KEY")}${q.merchant_trans_id}${q.merchant_prepare_id}${q.amount}${q.action}${q.sign_time}`
    : `${q.click_trans_id}${q.service_id}${env("CLICK_SECRET_KEY")}${q.merchant_trans_id}${q.amount}${q.action}${q.sign_time}`;
  if (!env("CLICK_SECRET_KEY") || q.service_id !== env("CLICK_SERVICE_ID") || md5(signSrc) !== q.sign_string) return err(-1, "SIGN CHECK FAILED!");
  if (action !== 0 && action !== 1) return err(-3, "Action not found");

  const p = db.payments.find((x) => x.id === q.merchant_trans_id && x.method === "click");
  if (!p) return err(-5, "User does not exist");
  if (Math.abs(Number(q.amount) - p.amount) > 0.01) return err(-2, "Incorrect parameter amount");
  if (p.status === "paid") return err(-4, "Already paid");
  if (p.status === "cancelled" || p.status === "rejected") return err(-9, "Transaction cancelled");

  if (action === 0) {
    const prepareId = Number(String(Date.now()).slice(-9));
    p.provider = { system: "click", clickTransId: q.click_trans_id, paydocId: q.click_paydoc_id, prepareId, state: "prepared" };
    p.providerTxId = q.click_trans_id;
    return err(0, "Success", { merchant_prepare_id: prepareId });
  }

  if (!p.provider || String(p.provider.prepareId) !== String(q.merchant_prepare_id)) return err(-6, "Transaction does not exist");
  if (Number(q.error) < 0) {
    p.status = "cancelled";
    p.provider.state = "cancelled";
    return err(-9, "Transaction cancelled", { merchant_confirm_id: p.provider.prepareId });
  }
  p.provider.state = "completed";
  creditPayment(db, p, ctx, "Click orqali to'lov");
  return err(0, "Success", { merchant_confirm_id: p.provider.prepareId });
}
