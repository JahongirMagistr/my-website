// Bildirishnomalarni tashqariga yuborish: email (Resend) va Telegram. Ikkalasi ham ixtiyoriy.
import { translate } from "../public/js/i18n.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const siteUrl = () => (process.env.SITE_URL || process.env.URL || "https://agricrowd.uz").replace(/\/$/, "");

async function sendEmail(m) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !m.to) return;
  const from = process.env.MAIL_FROM || "Agricrowd.uz <noreply@agricrowd.uz>";
  const title = translate(m.lang, m.title, m.params);
  const body = translate(m.lang, m.body, m.params);
  const link = m.link ? `${siteUrl()}/#${m.link}` : siteUrl();
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e2e8e4;border-radius:12px">
    <h2 style="color:#1f6f43;margin:0 0 12px">Agricrowd.uz</h2>
    <p style="margin:0 0 8px">${esc(translate(m.lang, "Assalomu alaykum, {name}!", { name: m.name }))}</p>
    <h3 style="margin:16px 0 8px">${esc(title)}</h3><p>${esc(body)}</p>
    <p style="margin-top:20px"><a href="${esc(link)}" style="background:#1f6f43;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">${esc(translate(m.lang, m.button || "Saytga o'tish"))}</a></p></div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [m.to], subject: `${title} — Agricrowd.uz`, html }),
  });
  if (!r.ok) console.error("resend", r.status, await r.text());
}

export async function telegramSend(chatId, key, params, lang = "uz", link = "") {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;
  let text = translate(lang || "uz", key, params);
  if (link) text += `\n\n${siteUrl()}/#${link}`;
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!r.ok) console.error("telegram", r.status, await r.text());
}

export async function sendOutbox(list) {
  if (!list?.length) return;
  await Promise.all(list.map(async (m) => {
    await Promise.allSettled([
      sendEmail(m),
      m.telegramChatId ? telegramSend(m.telegramChatId, `${translate(m.lang, m.title, m.params)}\n\n${translate(m.lang, m.body, m.params)}`, null, m.lang, m.link) : null,
    ]);
  }));
}
