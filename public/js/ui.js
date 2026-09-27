// Umumiy UI yordamchilari
import { STATUSES, CONTRACT_STATUSES, PAYMENT_STATUSES, WITHDRAWAL_STATUSES } from "./core.js";
import { t, tv, tc, formatDate } from "./i18n.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
// Tarjima + HTML-xavfsiz
export const te = (key, params) => esc(t(key, params));

export const num = (n) => Math.round(Number(n) || 0).toLocaleString("ru-RU").replace(/[,  ]/g, " ");
export const money = (n) => `${num(n)} ${t("so'm")}`;
export function short(n) {
  n = Number(n) || 0;
  const f = (x) => x.toFixed(1).replace(".0", "");
  if (Math.abs(n) >= 1e9) return t("{n} mlrd so'm", { n: f(n / 1e9) });
  if (Math.abs(n) >= 1e6) return t("{n} mln so'm", { n: f(n / 1e6) });
  return money(n);
}
export const date = (iso) => esc(formatDate(iso));
export const dateTime = (iso) => esc(formatDate(iso, true));
export function daysLeft(deadline) {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline + "T23:59:59") - Date.now()) / 864e5);
}

const badge = (map, status) => {
  const s = map[status] || { label: status, tone: "info" };
  return `<span class="badge tone-${s.tone}">${te(s.label)}</span>`;
};
export const statusBadge = (s) => badge(STATUSES, s);
export const contractBadge = (s) => badge(CONTRACT_STATUSES, s);
export const paymentBadge = (s) => badge(PAYMENT_STATUSES, s);
export const withdrawalBadge = (s) => badge(WITHDRAWAL_STATUSES, s);

const CROP_ICONS = { Pomidor: "🍅", Bodring: "🥒", Kartoshka: "🥔", Piyoz: "🧅", Sabzi: "🥕", Karam: "🥬", Qalampir: "🌶️", Baqlajon: "🍆", Sarimsoq: "🧄", Lavlagi: "🟣", Qovoq: "🎃" };
const CROP_BG = { Pomidor: "#fde2dc", Bodring: "#dcf3e0", Kartoshka: "#f3ead9", Piyoz: "#f6e6f0", Sabzi: "#fde8d4", Karam: "#e3f4d9", Qalampir: "#fbdcdc", Baqlajon: "#ebe3f6" };
export const cropIcon = (c) => CROP_ICONS[c] || "🌱";
export const cropBg = (c) => CROP_BG[c] || "#e3f4e9";
export const place = (p) => esc(tv(p.region)) + (p.district ? ", " + esc(tc(p.district)) : "");

export function cover(p, extra = "", cls = "project-cover") {
  const style = p.image ? `background-image:url('${esc(p.image)}')` : `background:${cropBg(p.crop)}`;
  return `<div class="${cls}" style="${style}">${p.image ? "" : cropIcon(p.crop)}${extra}</div>`;
}

export function progress(p) {
  const pct = p.percent ?? (p.goal ? Math.min(100, (p.raised / p.goal) * 100) : 0);
  return `<div class="progress ${pct >= 100 ? "full" : ""}" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
    <div class="progress-row"><span>${te("{amount} yig'ildi", { amount: short(p.raised) }).replace(esc(short(p.raised)), `<b>${esc(short(p.raised))}</b>`)}</span><span><b>${Math.round(pct * 10) / 10}%</b> / ${esc(short(p.goal))}</span></div>`;
}

export const stars = (r) => (r == null ? `<span class="muted">${te("baholanmagan")}</span>` : `<span class="rating" title="${r} / 5">${"★".repeat(Math.round(r))}${"☆".repeat(5 - Math.round(r))}</span> <b>${Number(r).toFixed(1)}</b>`);

// --- Toast ---
export function toast(msg, type = "ok") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  $("#toast-root").append(el);
  while ($("#toast-root").children.length > 3) $("#toast-root").firstChild.remove();
  setTimeout(() => el.remove(), 4000);
}

// --- Modal ---
export function modal({ title, body, wide = false, onMount }) {
  const root = $("#modal-root");
  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";
  wrap.innerHTML = `<div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-head"><h3>${esc(title)}</h3><button class="modal-close" aria-label="${te("Yopish")}">×</button></div>
    <div class="modal-body">${body}</div></div>`;
  const close = () => { wrap.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => e.key === "Escape" && close();
  wrap.addEventListener("mousedown", (e) => e.target === wrap && close());
  $(".modal-close", wrap).onclick = close;
  document.addEventListener("keydown", onKey);
  root.append(wrap);
  const m = $(".modal", wrap);
  onMount?.(m, close);
  $("input:not([type=hidden]), select, textarea", m)?.focus();
  return close;
}

export function confirmDlg(text, { ok = t("Tasdiqlash"), danger = false } = {}) {
  return new Promise((resolve) => {
    modal({
      title: t("Tasdiqlang"),
      body: `<p>${esc(text)}</p><div class="row" style="justify-content:flex-end"><button class="btn btn-ghost" data-no>${te("Bekor qilish")}</button><button class="btn ${danger ? "btn-danger" : ""}" data-yes>${esc(ok)}</button></div>`,
      onMount(m, c) {
        $("[data-no]", m).onclick = () => { c(); resolve(false); };
        $("[data-yes]", m).onclick = () => { c(); resolve(true); };
        $(".modal-close", m).addEventListener("click", () => resolve(false));
      },
    });
  });
}

// Formadan ma'lumot yig'ish
export function formData(form) {
  const out = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    if (el.type === "checkbox") out[el.name] = el.checked;
    else if (el.type === "number") out[el.name] = el.value === "" ? "" : Number(el.value);
    else if (el.type === "file") continue;
    else out[el.name] = el.value;
  }
  return out;
}

// Tugmani "kuting" holatiga o'tkazib, amalni bajarish
export async function busy(btn, fn) {
  const html = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.innerHTML = te("Kuting…"); }
  try {
    return await fn();
  } finally {
    if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = html; }
  }
}

export function showFormError(form, msg) {
  const box = $("[data-error]", form);
  if (!box) return toast(msg, "err");
  box.textContent = msg;
  box.hidden = false;
  box.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Rasmni siqib, data URL ko'rinishida qaytaradi
export function compressImage(file, maxSize = 1280, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error(t("Faqat rasm fayllari")));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error(t("Rasmni o'qib bo'lmadi")));
    img.src = url;
  });
}

export function videoEmbed(url) {
  if (!url) return "";
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `<div class="video-wrap"><iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}" title="Video" allowfullscreen loading="lazy"></iframe></div>`;
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return `<div class="video-wrap"><video src="${esc(url)}" controls preload="metadata"></video></div>`;
  if (/^https?:\/\//.test(url)) return `<p class="mt-1"><a href="${esc(url)}" target="_blank" rel="noopener">▶ ${te("Videoni ko'rish")}</a></p>`;
  return "";
}

export function showImage(src) {
  modal({ title: t("Rasm"), wide: true, body: `<img src="${esc(src)}" alt="" style="width:100%;border-radius:12px" />` });
}

// Monitoring lentasi
export function timeline(updates, { canDelete = false } = {}) {
  if (!updates?.length) return `<div class="empty"><div class="ico">📷</div><p>${te("Hozircha monitoring ma'lumotlari yo'q.")}</p></div>`;
  return `<div class="timeline">${updates.map((u) => `
    <div class="tl-item">
      <div class="when">${dateTime(u.createdAt)} ${u.stage ? `· <b>${esc(tv(u.stage))}</b>` : ""} · ${u.authorRole === "admin" ? "Agricrowd.uz" : te("Fermer")}</div>
      <h4 class="mt-1 mb-0">${esc(tc(u.title))}</h4>
      ${u.text ? `<p class="mt-1 mb-0">${esc(tc(u.text))}</p>` : ""}
      ${Array.isArray(u.images) && u.images.length ? `<div class="tl-media">${u.images.map((src) => `<img src="${esc(src)}" alt="" loading="lazy" data-zoom />`).join("")}</div>` : ""}
      ${videoEmbed(u.video)}
      ${canDelete ? `<button class="btn btn-sm btn-ghost mt-1" data-del-update="${u.id}">🗑 ${te("O'chirish")}</button>` : ""}
    </div>`).join("")}</div>`;
}

// Loyiha bosqichlari chizig'i
const TRACK = ["funding", "funded", "in_progress", "harvest", "completed"];
const TRACK_LABELS = ["Mablag' yig'ish", "100%", "Amalga oshirish", "Hosil / sotish", "Taqsimlash"];
export function statusTrack(status) {
  const idx = TRACK.indexOf(status);
  if (idx < 0) return "";
  return `<div class="status-track">${TRACK.map((_, i) => `<span class="${i <= idx ? "on" : ""}"></span>`).join("")}</div>
    <div class="status-labels">${TRACK_LABELS.map((l) => `<span>${te(l)}</span>`).join("")}</div>`;
}

// --- Oddiy grafiklar (bitta rang, hover'da tooltip) ---
export function barList(items, { value = (x) => x.value, label = (x) => x.name, format = short } = {}) {
  if (!items.length) return `<p class="muted">${te("Ma'lumot yo'q")}</p>`;
  const max = Math.max(...items.map(value), 1);
  return `<div class="bars">${items.map((it) => `
    <div class="bar-row" data-tip="${esc(label(it))}: ${esc(format(value(it)))}">
      <span class="lbl">${esc(label(it))}</span>
      <span class="track"><span class="fill" style="width:${(value(it) / max) * 100}%"></span></span>
      <span class="val">${esc(format(value(it)))}</span>
    </div>`).join("")}</div>`;
}

export function columnChart(items, { value, label, tip }) {
  const max = Math.max(...items.map(value), 1);
  return `<div class="col-chart">${items.map((it) => `<div class="col" data-tip="${esc(tip(it))}"><div class="fill" style="height:${(value(it) / max) * 100}%"></div></div>`).join("")}</div>
    <div class="col-labels">${items.map((it) => `<span>${esc(label(it))}</span>`).join("")}</div>`;
}

let tipEl;
if (globalThis.document) {
  document.addEventListener("mouseover", (e) => {
    const tg = e.target.closest?.("[data-tip]");
    if (!tg) { tipEl?.remove(); tipEl = null; return; }
    if (!tipEl) { tipEl = document.createElement("div"); tipEl.className = "tip"; document.body.append(tipEl); }
    tipEl.textContent = tg.dataset.tip;
  });
  document.addEventListener("mousemove", (e) => {
    if (tipEl) { tipEl.style.left = Math.min(e.clientX + 12, innerWidth - tipEl.offsetWidth - 8) + "px"; tipEl.style.top = e.clientY + 14 + "px"; }
  });
}

export function toCSV(rows, columns) {
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return "﻿" + [columns.map((c) => q(c.label)).join(","), ...rows.map((r) => columns.map((c) => q(c.get(r))).join(","))].join("\n");
}
export function download(name, text, type = "text/csv;charset=utf-8") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Fayl nomi/hajmi
export const fileSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
