// Email bildirishnomalar (ixtiyoriy): RESEND_API_KEY o'rnatilgan bo'lsa, Resend orqali yuboriladi.
import { translate } from "../public/js/i18n.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export async function sendOutbox(list) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !list?.length) return;
  const from = process.env.MAIL_FROM || "Agricrowd.uz <noreply@agricrowd.uz>";
  const site = (process.env.SITE_URL || process.env.URL || "https://agricrowd.uz").replace(/\/$/, "");
  await Promise.all(list.filter((m) => m.to).map(async (m) => {
    const title = translate(m.lang, m.title, m.params);
    const body = translate(m.lang, m.body, m.params);
    const link = m.link ? `${site}/#${m.link}` : site;
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e2e8e4;border-radius:12px">
      <h2 style="color:#1f6f43;margin:0 0 12px">Agricrowd.uz</h2>
      <p style="margin:0 0 8px">${esc(translate(m.lang, "Assalomu alaykum, {name}!", { name: m.name }))}</p>
      <h3 style="margin:16px 0 8px">${esc(title)}</h3><p>${esc(body)}</p>
      <p style="margin-top:20px"><a href="${esc(link)}" style="background:#1f6f43;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">${esc(translate(m.lang, "Saytga o'tish"))}</a></p></div>`;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [m.to], subject: `${title} — Agricrowd.uz`, html }),
    });
    if (!r.ok) console.error("resend", r.status, await r.text());
  }));
}
