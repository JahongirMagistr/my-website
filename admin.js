// Administrator paneli: tahlil, tekshiruv, loyihalar, shartnomalar, to'lovlar, foydalanuvchilar,
// monitoring, yangiliklar, xabarlar, moliya, sozlamalar, jurnal
import { api, uploadFile, openFile } from "./store.js";
import { STATUSES, CONTRACT_STATUSES, PAYMENT_STATUSES, MONITOR_STATUSES, DEFAULT_HERO_IMAGE } from "./core.js";
import { t, tv, tc, monthShort } from "./i18n.js";
import {
  $, $$, esc, te, num, money, short, date, dateTime, statusBadge, contractBadge, paymentBadge, withdrawalBadge, cropIcon,
  toast, modal, confirmDlg, formData, busy, timeline, barList, columnChart, toCSV, download, stars, showFormError, compressImage, fileSize,
} from "./ui.js";
import { projectFormHtml, bindProjectForm, readProjectForm } from "./forms.js";
import { state, app, go, requireRole, refreshBoot } from "./state.js";
import { kpi, TX_LABELS, methodName, bindUpdateForm, printAnnex, docsModal } from "./cabinet.js";

let data = null;
const userName = (id) => data.users.find((u) => u.id === id)?.name || (id ? "—" : "Agricrowd.uz");
const projTitle = (id) => tc(data.projects.find((p) => p.id === id)?.title || "—");

const TABS = [
  ["dashboard", "📊 Tahlil"],
  ["review", "✅ Tekshiruv", (a) => a.pending],
  ["projects", "🌱 Loyihalar"],
  ["contracts", "📝 Shartnomalar", (a) => a.contractsToVerify],
  ["payments", "💳 To'lovlar", (a) => a.paymentsToReview + a.withdrawalsPending],
  ["users", "👥 Foydalanuvchilar"],
  ["investments", "💼 Investitsiyalar"],
  ["monitoring", "📷 Monitoring"],
  ["news", "📰 Yangiliklar"],
  ["messages", "✉️ Xabarlar", (a) => a.newMessages],
  ["finance", "💰 Moliya"],
  ["settings", "⚙️ Sozlamalar"],
  ["logs", "🕘 Faoliyat jurnali"],
];

let current = { tab: "dashboard", id: null };

export async function renderAdmin(tab = "dashboard", id) {
  if (!requireRole(["admin"])) return;
  data = await api("adminData");
  tab = tab || "dashboard";
  current = { tab, id };
  const a = data.analytics;
  const side = `<nav class="dash-side"><div class="who"><span class="small muted">${te("Administrator")}</span><b>${esc(state.user.name)}</b><span class="small muted">${esc(state.user.email)}</span></div>
    ${TABS.map(([k, l, cnt]) => { const c = cnt?.(a); return `<a href="#/admin/${k}" class="${k === tab ? "active" : ""}">${te(l)}${c ? `<span class="count">${c}</span>` : ""}</a>`; }).join("")}
    <a href="#/notifications">🔔 ${te("Bildirishnomalar")}${state.unread ? `<span class="count">${state.unread}</span>` : ""}</a></nav>`;
  app().innerHTML = `<div class="container dash">${side}<div data-admin-main></div></div>`;
  await (VIEWS[tab] || VIEWS.dashboard)($("[data-admin-main]"), id);
}

const reload = () => renderAdmin(current.tab, current.id);

async function run(btn, fn, okMsg) {
  return busy(btn, async () => {
    try {
      await fn();
      if (okMsg) toast(t(okMsg));
      await refreshBoot().catch(() => {});
      await reload();
    } catch (e) { toast(e.message, "err"); }
  });
}

function csvButton(name, rows, columns) {
  const b = document.createElement("button");
  b.className = "btn btn-sm btn-outline";
  b.textContent = "⬇ " + t("CSV (Excel)");
  b.onclick = () => download(`${name}-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows, columns.map((c) => ({ ...c, label: t(c.label) }))));
  return b;
}

const ROLE = { investor: "Investor", farmer: "Fermer", admin: "Administrator" };
const openBtn = (f, label) => f ? `<button class="btn btn-sm btn-outline" data-open="${esc(f.path)}" data-name="${esc(f.name)}">📄 ${esc(label || f.name)}</button>` : "";
const bindOpen = (el) => $$("[data-open]", el).forEach((b) => (b.onclick = () => openFile(b.dataset.open, b.dataset.name).catch((e) => toast(e.message, "err"))));

const VIEWS = {
  // --- Tahlil -------------------------------------------------------------
  dashboard(el) {
    const a = data.analytics;
    const alerts = [
      [a.pending, "ta loyiha tekshiruvni kutmoqda", "review"],
      [a.contractsToVerify, "ta shartnoma tasdiqlashni kutmoqda", "contracts"],
      [a.paymentsToReview, "ta to'lov cheki tekshirilishi kerak", "payments"],
      [a.withdrawalsPending, "ta mablag' yechish so'rovi", "payments"],
      [a.newMessages, "ta yangi xabar", "messages"],
    ].filter((x) => x[0]);
    const noTemplate = !data.settings.contractTemplate && data.contracts.some((c) => !c.template);
    el.innerHTML = `
      <div class="row between mb-2"><h2 class="mb-0">${te("Platforma tahlili")}</h2><span class="small muted">${te("Yangilangan")}: ${dateTime(new Date().toISOString())}</span></div>
      ${alerts.map(([n, txt, tab]) => `<div class="warn-box mb-1">⏳ <b>${n}</b> ${te(txt)}. <a href="#/admin/${tab}">${te("Ko'rish")} →</a></div>`).join("")}
      ${noTemplate ? `<div class="error-box mb-1">📝 ${te("Shartnoma shabloni (PDF) yuklanmagan — investor va fermerlar shartnomani yuklab ololmaydi.")} <a href="#/admin/settings">${te("Yuklash")} →</a></div>` : ""}
      <div class="kpis mt-2">
        ${kpi(short(a.totalRaised), "Jalb qilingan mablag'", true)}
        ${kpi(String(a.projects), "Jami loyihalar")}
        ${kpi(String(a.totalInvestments), "Investitsiyalar soni")}
        ${kpi(`${a.investors} / ${a.farmers}`, "Investorlar / fermerlar")}
        ${kpi(short(a.paidOut), "Investorlarga to'langan")}
        ${kpi(short(a.commissionEarned), "Platforma komissiyasi")}
        ${kpi(short(a.refunded), "Qaytarilgan mablag'")}
        ${kpi(a.successRate === null ? "—" : a.successRate + "%", "Muvaffaqiyatli moliyalashtirish")}
      </div>
      <div class="grid grid-2 mt-3">
        <div class="card"><h3>${te("Oylik investitsiyalar (so'nggi 12 oy)")}</h3>${columnChart(a.byMonth, { value: (m) => m.amount, label: (m) => monthShort(Number(m.key.slice(5)) - 1), tip: (m) => `${m.key}: ${short(m.amount)} · ${t("{n} ta", { n: m.count })}` })}</div>
        <div class="card"><h3>${te("Loyihalar holati bo'yicha")}</h3>${barList(Object.entries(a.byStatus).map(([k, v]) => ({ name: t(STATUSES[k].label), value: v })), { format: (v) => t("{n} ta", { n: v }) })}</div>
        <div class="card"><h3>${te("Hududlar bo'yicha yig'ilgan mablag'")}</h3>${barList(a.byRegion, { value: (x) => x.raised, label: (x) => tv(x.name) })}</div>
        <div class="card"><h3>${te("Mahsulot turlari bo'yicha")}</h3>${barList(a.byCrop, { value: (x) => x.raised, label: (x) => `${cropIcon(x.name)} ${tv(x.name)}` })}</div>
      </div>
      <div class="card mt-3"><div class="row between"><h3 class="mb-0">${te("Faol loyihalar — moliyalashtirish holati")}</h3><a href="#/admin/projects" class="small">${te("Barchasi")} →</a></div>
        <div class="mt-2">${barList(data.projects.filter((p) => p.status === "funding"), { value: (p) => p.percent, label: (p) => tc(p.title), format: (v) => `${v}%` })}</div></div>
      <div class="card mt-3"><h3>${te("So'nggi faoliyat")}</h3>${logTable(data.logs.slice(0, 8))}</div>`;
  },

  // --- Tekshiruv ----------------------------------------------------------
  review(el) {
    const list = data.projects.filter((p) => p.status === "pending");
    const miss = `<span style="color:var(--red)">${te("ko'rsatilmagan")}</span>`;
    el.innerHTML = `<h2>${te("Loyihalarni tekshirish")}</h2><p class="muted">${te("Fermer → Loyiha yuboradi → Administrator tekshiradi → Verifikatsiya → Loyiha e'lon qilinadi")}</p>
      ${list.length ? list.map((p) => `<div class="card mb-2">
        <div class="row between"><div><h3 class="mb-0">${cropIcon(p.crop)} ${esc(tc(p.title))}</h3><div class="small muted">${esc(userName(p.farmerId))} · ${esc(tv(p.region))} · ${te("yuborilgan")} ${dateTime(p.submittedAt || p.createdAt)}</div></div>${statusBadge(p.status)}</div>
        <dl class="kv mt-2" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
          <div><dt>${te("Kerakli mablag'")}</dt><dd>${esc(money(p.goal))}</dd></div><div><dt>${te("Umumiy qiymat")}</dt><dd>${esc(money(p.totalCost))}</dd></div>
          <div><dt>${te("Kutilayotgan daromad")}</dt><dd>${esc(money(p.expectedRevenue))}</dd></div><div><dt>${te("Investor ulushi")}</dt><dd>${p.investorShare}% (${p.expectedReturn}%)</dd></div>
          <div><dt>${te("Muddat")}</dt><dd>${te("{n} oy", { n: p.durationMonths })}</dd></div><div><dt>${te("Moliyalashtirish muddati")}</dt><dd>${date(p.fundingDeadline)}</dd></div>
        </dl>
        <div class="grid grid-2 mt-2 small">
          <div><b>${te("Garov")}:</b> ${esc(tc(p.collateral)) || miss}</div>
          <div><b>${te("Sug'urta")}:</b> ${esc(tc(p.insurance)) || miss}</div>
          <div><b>${te("Kafolat")}:</b> ${esc(tc(p.guarantee)) || "—"}</div>
          <div><b>${te("Hujjatlar")}:</b> ${esc(tc(p.documents)) || "—"}</div>
        </div>
        <div class="row mt-2"><b class="small">📁 ${te("Yuklangan hujjatlar")}:</b> ${(p.docs || []).map((d) => openBtn(d, d.title || d.name)).join(" ") || `<span class="small" style="color:var(--red)">${te("Hozircha hujjat yuklanmagan")}</span>`}</div>
        <label class="field mt-2">${te("Izoh (fermerga ko'rinadi)")}<textarea data-note="${p.id}" style="min-height:60px">${esc(p.adminNote)}</textarea></label>
        <div class="row mt-2">
          <button class="btn" data-approve="${p.id}">✅ ${te("Tasdiqlash va e'lon qilish")}</button>
          <button class="btn btn-danger" data-reject="${p.id}">✕ ${te("Rad etish")}</button>
          <a class="btn btn-outline" href="#/project/${p.id}">${te("To'liq ko'rish")}</a>
          <button class="btn btn-ghost" data-edit="${p.id}">✏️ ${te("Tahrirlash")}</button>
        </div></div>`).join("") : `<div class="card empty"><div class="ico">✅</div><p>${te("Tekshiruvni kutayotgan loyihalar yo'q.")}</p></div>`}`;
    const note = (id) => $(`[data-note="${id}"]`, el).value;
    $$("[data-approve]", el).forEach((b) => (b.onclick = () => run(b, () => api("reviewProject", { id: b.dataset.approve, decision: "approve", note: note(b.dataset.approve) }), "Loyiha tasdiqlandi va e'lon qilindi")));
    $$("[data-reject]", el).forEach((b) => (b.onclick = () => {
      if (!note(b.dataset.reject).trim()) return toast(t("Rad etish sababini izohda yozing"), "err");
      run(b, () => api("reviewProject", { id: b.dataset.reject, decision: "reject", note: note(b.dataset.reject) }), "Loyiha rad etildi");
    }));
    $$("[data-edit]", el).forEach((b) => (b.onclick = () => editProject(b.dataset.edit)));
    bindOpen(el);
  },

  // --- Loyihalar ----------------------------------------------------------
  projects(el) {
    el.innerHTML = `<div class="row between mb-2"><h2 class="mb-0">${te("Loyihalar")}</h2><div class="row" data-actions><button class="btn" data-new>+ ${te("Yangi loyiha")}</button></div></div>
      <div class="toolbar"><input type="search" placeholder="${te("Qidirish…")}" data-q /><select data-status><option value="">${te("Barcha holatlar")}</option>${Object.entries(STATUSES).map(([k, v]) => `<option value="${k}">${te(v.label)}</option>`).join("")}</select></div>
      <div class="table-wrap"><table class="data"><thead><tr><th>${te("Loyiha")}</th><th>${te("Fermer")}</th><th>${te("Holat")}</th><th class="num">${te("Kerakli")}</th><th class="num">${te("Yig'ilgan")}</th><th class="num">%</th><th>${te("Muddat")}</th><th></th></tr></thead><tbody data-rows></tbody></table></div>`;
    $("[data-actions]", el).prepend(csvButton("loyihalar", data.projects, [
      { label: "ID", get: (p) => p.id }, { label: "Nomi", get: (p) => p.title }, { label: "Mahsulot", get: (p) => p.crop }, { label: "Hudud", get: (p) => p.region },
      { label: "Fermer", get: (p) => userName(p.farmerId) }, { label: "Holat", get: (p) => t(STATUSES[p.status]?.label) }, { label: "Umumiy qiymat", get: (p) => p.totalCost },
      { label: "Kerakli mablag'", get: (p) => p.goal }, { label: "Yig'ilgan", get: (p) => p.raised }, { label: "Foiz", get: (p) => p.percent }, { label: "Investorlar", get: (p) => p.investors },
      { label: "Kutilayotgan daromad", get: (p) => p.expectedRevenue }, { label: "Investor ulushi %", get: (p) => p.investorShare }, { label: "Haqiqiy daromad", get: (p) => p.actualRevenue || "" },
      { label: "Muddat (oy)", get: (p) => p.durationMonths }, { label: "Moliyalashtirish muddati", get: (p) => p.fundingDeadline }, { label: "Yaratilgan", get: (p) => p.createdAt },
    ]));
    const draw = () => {
      const q = $("[data-q]", el).value.toLowerCase();
      const st = $("[data-status]", el).value;
      const list = data.projects.filter((p) => (!st || p.status === st) && (!q || `${p.title} ${p.crop} ${p.region} ${userName(p.farmerId)}`.toLowerCase().includes(q)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      $("[data-rows]", el).innerHTML = list.map((p) => `<tr>
        <td><b>${cropIcon(p.crop)} ${esc(tc(p.title))}</b>${p.featured ? ` <span title="${te("Bosh sahifada")}">⭐</span>` : ""}<div class="small muted">${esc(tv(p.crop))} · ${esc(tv(p.region))}</div></td>
        <td>${esc(userName(p.farmerId))}</td><td>${statusBadge(p.status)}${p.status !== "funding" && p.fundedAt && !p.disbursedAt && p.status !== "refunded" ? `<div class="small" style="color:var(--red)">${te("mablag' ajratilmagan")}</div>` : ""}</td>
        <td class="num">${num(p.goal)}</td><td class="num">${num(p.raised)}</td><td class="num">${p.percent}%</td><td class="nowrap">${date(p.fundingDeadline)}</td>
        <td class="nowrap"><button class="btn btn-sm" data-manage="${p.id}">${te("Boshqarish")}</button></td></tr>`).join("") || `<tr><td colspan="8" class="empty">${te("Loyiha topilmadi")}</td></tr>`;
      $$("[data-manage]", el).forEach((b) => (b.onclick = () => manageProject(b.dataset.manage)));
    };
    $("[data-q]", el).oninput = draw;
    $("[data-status]", el).onchange = draw;
    $("[data-new]", el).onclick = () => editProject(null);
    draw();
  },

  // --- Shartnomalar -------------------------------------------------------
  contracts(el) {
    const byProject = {};
    for (const c of data.contracts) (byProject[c.projectId] = byProject[c.projectId] || []).push(c);
    const groups = Object.entries(byProject).sort((a, b) => (b[1][0].createdAt || "").localeCompare(a[1][0].createdAt || ""));
    el.innerHTML = `<div class="row between mb-2"><h2 class="mb-0">${te("Shartnomalar")}</h2><div class="row" data-actions><a class="btn btn-sm btn-outline" href="#/admin/settings">📝 ${te("Shartnoma shabloni")}</a></div></div>
      <div class="info-box mb-2">${te("Loyiha 100% moliyalashtirilganda har bir investor uchun shartnoma avtomatik yaratiladi va ikkala tomonga xabar yuboriladi. Ikkala tomon imzolangan nusxani yuklagach, siz tekshirib tasdiqlaysiz. Loyihaning barcha shartnomalari tasdiqlangach, mablag' fermerga avtomatik ajratiladi.")}</div>
      <div class="toolbar"><select data-st><option value="">${te("Barcha holatlar")}</option>${Object.entries(CONTRACT_STATUSES).map(([k, v]) => `<option value="${k}">${te(v.label)}</option>`).join("")}</select></div>
      <div data-groups></div>`;
    $("[data-actions]", el).prepend(csvButton("shartnomalar", data.contracts, [
      { label: "Raqam", get: (c) => c.number }, { label: "Loyiha", get: (c) => c.project?.title }, { label: "Investor", get: (c) => c.investor?.name }, { label: "Fermer", get: (c) => c.farmer?.name },
      { label: "Summa", get: (c) => c.amount }, { label: "Ulush %", get: (c) => c.sharePercent }, { label: "Holat", get: (c) => t(CONTRACT_STATUSES[c.status]?.label) }, { label: "Yaratilgan", get: (c) => c.createdAt }, { label: "Tasdiqlangan", get: (c) => c.verifiedAt || "" },
    ]));
    const draw = () => {
      const st = $("[data-st]", el).value;
      $("[data-groups]", el).innerHTML = groups.map(([pid, list]) => {
        const shown = list.filter((c) => !st || c.status === st);
        if (!shown.length) return "";
        const p = data.projects.find((x) => x.id === pid);
        const verified = list.filter((c) => c.status === "verified").length;
        return `<div class="card mb-2"><div class="row between"><div><h3 class="mb-0">${esc(tc(p?.title || "—"))}</h3><div class="small muted">${te("{a} / {b} ta shartnoma tasdiqlangan", { a: verified, b: list.length })} · ${p?.disbursedAt ? `✅ ${te("mablag' ajratilgan")} ${date(p.disbursedAt)}` : `⏳ ${te("mablag' ajratilmagan")}`}</div></div>
          ${p && !p.disbursedAt && ["funded", "in_progress", "harvest"].includes(p.status) ? `<button class="btn btn-sm ${verified === list.length ? "" : "btn-outline"}" data-release="${pid}" data-all="${verified === list.length}">💵 ${te("Mablag'ni fermerga ajratish")}</button>` : ""}</div>
          <div class="table-wrap mt-2" style="box-shadow:none;border:1px solid var(--line)"><table class="data"><thead><tr><th>№</th><th>${te("Investor")}</th><th class="num">${te("Summa")}</th><th>${te("Investor imzosi")}</th><th>${te("Fermer imzosi")}</th><th>${te("Holat")}</th><th></th></tr></thead><tbody>
          ${shown.map((c) => `<tr><td class="nowrap"><b>${esc(c.number)}</b><div class="small muted">${date(c.createdAt)}</div></td><td>${esc(c.investor?.name)}</td><td class="num">${num(c.amount)}</td>
            <td>${c.investorFile ? openBtn(c.investorFile, t("Ko'rish")) : `<span class="muted small">${te("Kutilmoqda")}</span>`}</td>
            <td>${c.farmerFile ? openBtn(c.farmerFile, t("Ko'rish")) : `<span class="muted small">${te("Kutilmoqda")}</span>`}</td>
            <td>${contractBadge(c.status)}${c.adminNote ? `<div class="small muted">${esc(c.adminNote)}</div>` : ""}</td>
            <td class="nowrap">${c.status === "signed" ? `<button class="btn btn-sm" data-verify="${c.id}">✅ ${te("Tasdiqlash")}</button>` : ""}${c.status !== "verified" && (c.investorFile || c.farmerFile) ? `<button class="btn btn-sm btn-ghost" data-reject-c="${c.id}">${te("Rad etish")}</button>` : ""}<button class="btn btn-sm btn-ghost" data-annex="${c.id}" title="${te("Tomonlar ma'lumotlari (ilova)")}">🖨</button></td></tr>`).join("")}
          </tbody></table></div></div>`;
      }).join("") || `<div class="card empty"><div class="ico">📝</div><p>${te("Shartnomalar yo'q")}</p></div>`;
      bindOpen(el);
      $$("[data-annex]", el).forEach((b) => (b.onclick = () => printAnnex(b.dataset.annex, data.contracts)));
      $$("[data-verify]", el).forEach((b) => (b.onclick = () => run(b, () => api("reviewContract", { id: b.dataset.verify, decision: "verify" }), "Shartnoma tasdiqlandi")));
      $$("[data-reject-c]", el).forEach((b) => (b.onclick = () => rejectContract(b.dataset.rejectC)));
      $$("[data-release]", el).forEach((b) => (b.onclick = async () => {
        const all = b.dataset.all === "true";
        if (!(await confirmDlg(t(all ? "Loyiha mablag'i fermer hisobiga o'tkaziladi. Davom etasizmi?" : "Barcha shartnomalar hali tasdiqlanmagan! Baribir mablag'ni fermerga ajratasizmi?"), { danger: !all }))) return;
        run(b, () => api("releaseFunds", { id: b.dataset.release, force: !all }), "Mablag' fermerga ajratildi");
      }));
    };
    $("[data-st]", el).onchange = draw;
    draw();
  },

  // --- To'lovlar ----------------------------------------------------------
  payments(el) {
    const m = state.boot?.paymentMethods || {};
    el.innerHTML = `<h2>${te("To'lovlar")}</h2>
      <div class="pay-status mb-2">${[["Payme", m.payme], ["Click", m.click], ["Uzum Bank", m.uzum], [t("Bank o'tkazmasi"), m.bank], [t("Test to'lov"), m.test]].map(([n, on]) => `<span class="badge ${on ? "tone-good" : "tone-warn"}">${esc(n)}: ${te(on ? "ulangan" : "ulanmagan")}</span>`).join("")}</div>
      <details class="card-flat mb-2"><summary><b>${te("Payme / Click ulash uchun ma'lumot")}</summary>
        <p class="small mt-1">${te("To'lov tizimi kabinetida quyidagi manzillarni ko'rsating, so'ng kalitlarni Netlify muhit o'zgaruvchilariga kiriting (README'dagi 8-bosqich).")}</p>
        <table class="detail-table small"><tr><th>Payme — Endpoint URL</th><td><code>${esc(location.origin)}/api/payme</code></td></tr>
          <tr><th>Payme — ${te("hisob maydoni")}</th><td><code>order_id</code></td></tr>
          <tr><th>Click — Prepare URL</th><td><code>${esc(location.origin)}/api/click</code></td></tr>
          <tr><th>Click — Complete URL</th><td><code>${esc(location.origin)}/api/click</code></td></tr></table></details>
      <div class="row between"><h3 class="mb-0">${te("Hisobni to'ldirish")}</h3><div class="row" data-actions><select data-st><option value="">${te("Barchasi")}</option>${Object.entries(PAYMENT_STATUSES).map(([k, v]) => `<option value="${k}" ${k === "review" ? "selected" : ""}>${te(v.label)}</option>`).join("")}</select></div></div>
      <div class="table-wrap mt-2"><table class="data"><thead><tr><th>${te("Sana")}</th><th>${te("Investor")}</th><th>${te("Usul")}</th><th class="num">${te("Summa")}</th><th>${te("Chek")}</th><th>${te("Holat")}</th><th></th></tr></thead><tbody data-rows></tbody></table></div>
      <h3 class="mt-4">${te("Mablag' yechish so'rovlari")}</h3>
      <div class="table-wrap mt-2"><table class="data"><thead><tr><th>${te("Sana")}</th><th>${te("Foydalanuvchi")}</th><th class="num">${te("Summa")}</th><th>${te("Rekvizit")}</th><th>${te("Holat")}</th><th></th></tr></thead><tbody>
        ${data.withdrawals.map((w) => `<tr><td class="nowrap">${dateTime(w.createdAt)}</td><td>${esc(userName(w.userId))}</td><td class="num">${num(w.amount)}</td>
          <td class="small">${w.bank?.card ? `💳 ${esc(w.bank.card)} (${esc(w.bank.holder || "")})<br/>` : ""}${w.bank?.account ? `${esc(w.bank.bankName || "")} ${esc(w.bank.account)} MFO ${esc(w.bank.mfo || "")}` : ""}</td>
          <td>${withdrawalBadge(w.status)}${w.adminNote ? `<div class="small muted">${esc(w.adminNote)}</div>` : ""}</td>
          <td class="nowrap">${w.status === "pending" ? `<button class="btn btn-sm" data-wpaid="${w.id}">✅ ${te("O'tkazildi")}</button><button class="btn btn-sm btn-ghost" data-wrej="${w.id}">${te("Rad etish")}</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="6" class="empty">${te("So'rovlar yo'q")}</td></tr>`}
      </tbody></table></div>`;
    $("[data-actions]", el).prepend(csvButton("tolovlar", data.payments, [
      { label: "Sana", get: (p) => p.createdAt }, { label: "Investor", get: (p) => userName(p.userId) }, { label: "Usul", get: (p) => methodName(p.method) }, { label: "Summa", get: (p) => p.amount },
      { label: "Holat", get: (p) => t(PAYMENT_STATUSES[p.status]?.label) }, { label: "Tranzaksiya ID", get: (p) => p.providerTxId || "" }, { label: "To'langan", get: (p) => p.paidAt || "" },
    ]));
    const draw = () => {
      const st = $("[data-st]", el).value;
      const list = data.payments.filter((p) => !st || p.status === st);
      $("[data-rows]", el).innerHTML = list.map((p) => `<tr><td class="nowrap">${dateTime(p.createdAt)}<div class="small muted">${esc(p.id)}</div></td><td>${esc(userName(p.userId))}</td><td>${esc(methodName(p.method))}${p.providerTxId ? `<div class="small muted">${esc(p.providerTxId)}</div>` : ""}</td>
        <td class="num">${num(p.amount)}</td><td>${p.receipt ? openBtn(p.receipt, t("Chek")) : "—"}</td><td>${paymentBadge(p.status)}${p.adminNote ? `<div class="small muted">${esc(p.adminNote)}</div>` : ""}</td>
        <td class="nowrap">${p.method === "bank" && ["pending", "review"].includes(p.status) ? `<button class="btn btn-sm" data-papprove="${p.id}">✅ ${te("Tasdiqlash")}</button><button class="btn btn-sm btn-ghost" data-preject="${p.id}">${te("Rad etish")}</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="7" class="empty">${te("To'lovlar yo'q")}</td></tr>`;
      bindOpen(el);
      $$("[data-papprove]", el).forEach((b) => (b.onclick = async () => {
        const p = data.payments.find((x) => x.id === b.dataset.papprove);
        if (await confirmDlg(t("{amount} so'm {name} hisobiga o'tkaziladi. Bank hisobingizga pul tushganini tekshirdingizmi?", { amount: p.amount, name: userName(p.userId) }))) run(b, () => api("reviewPayment", { id: p.id, decision: "approve" }), "To'lov tasdiqlandi");
      }));
      $$("[data-preject]", el).forEach((b) => (b.onclick = () => noteDialog(t("Rad etish sababi"), (note) => api("reviewPayment", { id: b.dataset.preject, decision: "reject", note }), "To'lov rad etildi")));
    };
    $("[data-st]", el).onchange = draw;
    draw();
    $$("[data-wpaid]", el).forEach((b) => (b.onclick = async () => { if (await confirmDlg(t("Mablag' foydalanuvchi rekvizitlariga o'tkazilganini tasdiqlaysizmi?"))) run(b, () => api("reviewWithdrawal", { id: b.dataset.wpaid, decision: "paid" }), "Saqlandi"); }));
    $$("[data-wrej]", el).forEach((b) => (b.onclick = () => noteDialog(t("Rad etish sababi"), (note) => api("reviewWithdrawal", { id: b.dataset.wrej, decision: "reject", note }), "So'rov rad etildi, mablag' qaytarildi")));
  },

  // --- Foydalanuvchilar ---------------------------------------------------
  users(el) {
    el.innerHTML = `<div class="row between mb-2"><h2 class="mb-0">${te("Foydalanuvchilar")}</h2><div class="row" data-actions><button class="btn btn-outline" data-broadcast>📣 ${te("Xabar yuborish")}</button><button class="btn" data-new>+ ${te("Foydalanuvchi qo'shish")}</button></div></div>
      <div class="toolbar"><input type="search" placeholder="${te("Ism, email, telefon…")}" data-q /><select data-role><option value="">${te("Barcha rollar")}</option><option value="investor">${te("Investorlar")}</option><option value="farmer">${te("Fermerlar")}</option><option value="admin">${te("Administratorlar")}</option></select></div>
      <div class="table-wrap"><table class="data"><thead><tr><th>${te("Foydalanuvchi")}</th><th>${te("Rol")}</th><th>${te("Telefon")}</th><th class="num">${te("Balans")}</th><th>${te("Faoliyat")}</th><th>${te("Holat")}</th><th></th></tr></thead><tbody data-rows></tbody></table></div>`;
    $("[data-actions]", el).prepend(csvButton("foydalanuvchilar", data.users, [
      { label: "ID", get: (u) => u.id }, { label: "Ism", get: (u) => u.name }, { label: "Email", get: (u) => u.email }, { label: "Telefon", get: (u) => u.phone },
      { label: "Rol", get: (u) => t(ROLE[u.role]) }, { label: "Balans", get: (u) => u.balance }, { label: "Xo'jalik", get: (u) => u.farm?.name || "" }, { label: "Hudud", get: (u) => u.farm?.region || "" },
      { label: "Reyting", get: (u) => u.rating ?? "" }, { label: "Bloklangan", get: (u) => t(u.blocked ? "ha" : "yo'q") }, { label: "Ro'yxatdan o'tgan", get: (u) => u.createdAt },
    ]));
    const draw = () => {
      const q = $("[data-q]", el).value.toLowerCase();
      const r = $("[data-role]", el).value;
      const list = data.users.filter((u) => (!r || u.role === r) && (!q || `${u.name} ${u.email} ${u.phone} ${u.farm?.name || ""}`.toLowerCase().includes(q)));
      $("[data-rows]", el).innerHTML = list.map((u) => {
        const activity = u.role === "farmer" ? t("{n} loyiha", { n: data.projects.filter((p) => p.farmerId === u.id).length }) : u.role === "investor" ? t("{n} investitsiya", { n: data.investments.filter((i) => i.investorId === u.id).length }) : "—";
        return `<tr><td><b>${esc(u.name)}</b><div class="small muted">${esc(u.email)}${u.farm?.name ? " · " + esc(u.farm.name) : ""}</div></td>
          <td>${te(ROLE[u.role])}</td><td class="nowrap">${esc(u.phone) || "—"}</td><td class="num">${num(u.balance)}</td><td>${esc(activity)}</td>
          <td>${u.blocked ? `<span class="badge tone-bad">${te("Bloklangan")}</span>` : u.verified ? `<span class="badge tone-good">${te("Tasdiqlangan")}</span>` : `<span class="badge tone-warn">${te("Tasdiqlanmagan")}</span>`}</td>
          <td><button class="btn btn-sm btn-outline" data-edit="${u.id}">${te("Tahrirlash")}</button></td></tr>`;
      }).join("") || `<tr><td colspan="7" class="empty">${te("Topilmadi")}</td></tr>`;
      $$("[data-edit]", el).forEach((b) => (b.onclick = () => editUser(b.dataset.edit)));
    };
    $("[data-q]", el).oninput = draw;
    $("[data-role]", el).onchange = draw;
    $("[data-new]", el).onclick = newUser;
    $("[data-broadcast]", el).onclick = broadcastModal;
    draw();
  },

  // --- Investitsiyalar ----------------------------------------------------
  investments(el) {
    const list = [...data.investments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const label = { active: ["Faol", "info"], paid: ["To'langan", "good"], refunded: ["Qaytarilgan", "bad"] };
    el.innerHTML = `<div class="row between mb-2"><h2 class="mb-0">${te("Investitsiyalar")}</h2><div data-actions></div></div>
      <div class="toolbar"><input type="search" placeholder="${te("Investor yoki loyiha…")}" data-q /><select data-st><option value="">${te("Barchasi")}</option><option value="active">${te("Faol")}</option><option value="paid">${te("To'langan")}</option><option value="refunded">${te("Qaytarilgan")}</option></select></div>
      <div class="table-wrap"><table class="data"><thead><tr><th>${te("Sana")}</th><th>${te("Investor")}</th><th>${te("Loyiha")}</th><th class="num">${te("Summa")}</th><th class="num">${te("To'lov")}</th><th>${te("Holat")}</th></tr></thead><tbody data-rows></tbody></table></div>`;
    $("[data-actions]", el).append(csvButton("investitsiyalar", list, [
      { label: "Sana", get: (i) => i.createdAt }, { label: "Investor", get: (i) => userName(i.investorId) }, { label: "Loyiha", get: (i) => projTitle(i.projectId) },
      { label: "Summa", get: (i) => i.amount }, { label: "To'lov", get: (i) => i.payout || 0 }, { label: "Holat", get: (i) => t(label[i.status][0]) },
    ]));
    const draw = () => {
      const q = $("[data-q]", el).value.toLowerCase();
      const st = $("[data-st]", el).value;
      $("[data-rows]", el).innerHTML = list.filter((i) => (!st || i.status === st) && (!q || `${userName(i.investorId)} ${projTitle(i.projectId)}`.toLowerCase().includes(q))).map((i) => `<tr>
        <td class="nowrap">${dateTime(i.createdAt)}</td><td>${esc(userName(i.investorId))}</td><td><a href="#/project/${i.projectId}">${esc(projTitle(i.projectId))}</a></td>
        <td class="num">${num(i.amount)}</td><td class="num">${i.payout ? num(i.payout) : "—"}</td><td><span class="badge tone-${label[i.status][1]}">${te(label[i.status][0])}</span></td></tr>`).join("") || `<tr><td colspan="6" class="empty">${te("Topilmadi")}</td></tr>`;
    };
    $("[data-q]", el).oninput = draw;
    $("[data-st]", el).onchange = draw;
    draw();
  },

  // --- Monitoring ---------------------------------------------------------
  async monitoring(el, id) {
    const eligible = data.projects.filter((p) => [...MONITOR_STATUSES, "completed", "funding"].includes(p.status));
    const sel = eligible.find((p) => p.id === id) || eligible.find((p) => MONITOR_STATUSES.includes(p.status)) || eligible[0];
    const full = sel ? await api("getProject", { id: sel.id }) : null;
    const stages = ["Tekshiruv", "Ekish", "Parvarish", "Hosil yig'ish", "Sotish", "Yakun"];
    el.innerHTML = `<h2>${te("Monitoring")}</h2>
      <div class="toolbar"><select data-sel>${eligible.map((p) => `<option value="${p.id}" ${p === sel ? "selected" : ""}>${esc(tc(p.title))} — ${te(STATUSES[p.status].label)}</option>`).join("")}</select></div>
      ${sel ? `<div class="card"><h3>${te("Monitoring yozuvi qo'shish (Agricrowd.uz nomidan)")}</h3>
        <form class="form" id="adm-upd"><div class="form-grid">
          <label class="field">${te("Sarlavha")}<input name="title" required placeholder="${te("Masalan: Joyiga chiqib tekshirildi")}" /></label>
          <label class="field">${te("Bosqich")}<select name="stage">${stages.map((x) => `<option value="${esc(x)}">${esc(tv(x))}</option>`).join("")}</select></label>
          <label class="field full">${te("Loyiha holati")}<textarea name="text"></textarea></label>
          <label class="field">${te("Foto")}<input type="file" accept="image/*" multiple data-photos /></label>
          <label class="field">${te("Video havolasi")}<input name="video" type="url" /></label>
          <div class="img-thumbs full" data-thumbs></div></div>
          <div class="error-box" data-error hidden></div><div><button class="btn">${te("Qo'shish")}</button></div></form></div>
        <div class="card mt-2"><h3>${te("Monitoring lentasi")}</h3>${timeline(full.updates, { canDelete: true })}</div>` : `<div class="card empty">${te("Monitoring uchun loyiha yo'q")}</div>`}`;
    $("[data-sel]", el)?.addEventListener("change", (e) => go(`/admin/monitoring/${e.target.value}`));
    $$("[data-del-update]", el).forEach((b) => (b.onclick = async () => { if (await confirmDlg(t("Monitoring yozuvi o'chirilsinmi?"), { danger: true, ok: t("O'chirish") })) run(b, () => api("deleteUpdate", { id: b.dataset.delUpdate }), "O'chirildi"); }));
    const form = $("#adm-upd", el);
    if (form) bindUpdateForm(form, sel.id);
  },

  // --- Yangiliklar --------------------------------------------------------
  news(el) {
    el.innerHTML = `<div class="row between mb-2"><h2 class="mb-0">${te("Yangiliklar")}</h2><button class="btn" data-new>+ ${te("Yangilik qo'shish")}</button></div>
      <div class="table-wrap"><table class="data"><thead><tr><th>${te("Sarlavha")}</th><th>${te("Sana")}</th><th>${te("Holat")}</th><th></th></tr></thead><tbody>
      ${data.news.map((n) => `<tr><td><b>${esc(n.title)}</b><div class="small muted">${esc(n.body.slice(0, 90))}…</div></td><td class="nowrap">${date(n.createdAt)}</td>
        <td>${n.published ? `<span class="badge tone-good">${te("E'lon qilingan")}</span>` : `<span class="badge tone-warn">${te("Qoralama")}</span>`}</td>
        <td class="nowrap"><button class="btn btn-sm btn-outline" data-edit="${n.id}">${te("Tahrirlash")}</button><button class="btn btn-sm btn-ghost" data-del="${n.id}">🗑</button></td></tr>`).join("") || `<tr><td colspan="4" class="empty">${te("Hozircha yangiliklar yo'q")}</td></tr>`}
      </tbody></table></div>`;
    $("[data-new]", el).onclick = () => editNews(null);
    $$("[data-edit]", el).forEach((b) => (b.onclick = () => editNews(b.dataset.edit)));
    $$("[data-del]", el).forEach((b) => (b.onclick = async () => { if (await confirmDlg(t("Yangilik o'chirilsinmi?"), { danger: true, ok: t("O'chirish") })) run(b, () => api("deleteNews", { id: b.dataset.del }), "O'chirildi"); }));
  },

  // --- Xabarlar -----------------------------------------------------------
  messages(el) {
    const ST = { new: ["Yangi", "warn"], read: ["O'qilgan", "info"], answered: ["Javob berilgan", "good"] };
    el.innerHTML = `<div class="row between mb-2"><h2 class="mb-0">${te("Xabarlar")}</h2><div data-actions></div></div>
      <div class="table-wrap"><table class="data"><thead><tr><th>${te("Sana")}</th><th>${te("Kimdan")}</th><th>${te("Mavzu")}</th><th>${te("Holat")}</th><th></th></tr></thead><tbody>
      ${data.messages.map((m) => `<tr><td class="nowrap">${dateTime(m.createdAt)}</td><td><b>${esc(m.name)}</b><div class="small muted">${esc(m.email)} ${esc(m.phone)}</div></td><td>${esc(m.subject || m.body.slice(0, 60))}</td>
        <td><span class="badge tone-${ST[m.status][1]}">${te(ST[m.status][0])}</span></td><td><button class="btn btn-sm btn-outline" data-open-msg="${m.id}">${te("Ochish")}</button></td></tr>`).join("") || `<tr><td colspan="5" class="empty">${te("Xabarlar yo'q")}</td></tr>`}
      </tbody></table></div>`;
    $("[data-actions]", el).append(csvButton("xabarlar", data.messages, [{ label: "Sana", get: (m) => m.createdAt }, { label: "Ism", get: (m) => m.name }, { label: "Email", get: (m) => m.email }, { label: "Telefon", get: (m) => m.phone }, { label: "Mavzu", get: (m) => m.subject }, { label: "Xabar", get: (m) => m.body }]));
    $$("[data-open-msg]", el).forEach((b) => (b.onclick = () => {
      const m = data.messages.find((x) => x.id === b.dataset.openMsg);
      if (m.status === "new") api("updateMessage", { id: m.id, status: "read" }).catch(() => {});
      modal({
        title: m.subject || t("Xabar"),
        body: `<p class="small muted">${esc(m.name)} · ${esc(m.email)} ${esc(m.phone)} · ${dateTime(m.createdAt)}</p><div class="card-flat" style="white-space:pre-wrap">${esc(m.body)}</div>
          <form class="form mt-2" id="msg-form"><label class="field">${te("Ichki izoh")}<textarea name="adminNote">${esc(m.adminNote)}</textarea></label>
          <div class="row">${m.email ? `<a class="btn btn-outline" href="mailto:${esc(m.email)}?subject=${encodeURIComponent("Re: " + (m.subject || "Agricrowd.uz"))}">✉ ${te("Email orqali javob")}</a>` : ""}${m.phone ? `<a class="btn btn-outline" href="tel:${esc(m.phone)}">☎ ${te("Qo'ng'iroq")}</a>` : ""}<button class="btn">${te("Javob berildi deb belgilash")}</button></div></form>`,
        onMount(mm, close) {
          $("#msg-form", mm).onsubmit = (e) => { e.preventDefault(); close(); run(null, () => api("updateMessage", { id: m.id, status: "answered", adminNote: e.target.adminNote.value }), "Saqlandi"); };
        },
      });
    }));
  },

  // --- Moliya -------------------------------------------------------------
  finance(el) {
    const tx = data.transactions;
    const sum = (type) => tx.filter((x) => x.type === type).reduce((s, x) => s + x.amount, 0);
    el.innerHTML = `<div class="row between mb-2"><h2 class="mb-0">${te("Moliya")}</h2><div data-actions></div></div>
      <div class="kpis">${kpi(short(sum("deposit")), "Kiritilgan (to'ldirish)")}${kpi(short(sum("invest")), "Investitsiyalar")}${kpi(short(sum("disbursement")), "Fermerlarga ajratilgan")}${kpi(short(sum("payout")), "Investorlarga to'langan")}${kpi(short(sum("refund")), "Qaytarilgan")}${kpi(short(sum("withdraw")), "Yechib olingan")}${kpi(short(sum("commission")), "Platforma komissiyasi", true)}</div>
      <div class="toolbar mt-3"><select data-type><option value="">${te("Barcha operatsiyalar")}</option>${Object.entries(TX_LABELS).map(([k, v]) => `<option value="${k}">${te(v)}</option>`).join("")}</select></div>
      <div class="table-wrap"><table class="data"><thead><tr><th>${te("Sana")}</th><th>${te("Turi")}</th><th>${te("Foydalanuvchi")}</th><th>${te("Loyiha")}</th><th>${te("Izoh")}</th><th class="num">${te("Summa")}</th></tr></thead><tbody data-rows></tbody></table></div>`;
    $("[data-actions]", el).append(csvButton("operatsiyalar", tx, [
      { label: "Sana", get: (x) => x.createdAt }, { label: "Turi", get: (x) => t(TX_LABELS[x.type] || x.type) }, { label: "Foydalanuvchi", get: (x) => userName(x.userId) },
      { label: "Loyiha", get: (x) => (x.projectId ? projTitle(x.projectId) : "") }, { label: "Izoh", get: (x) => x.note }, { label: "Summa", get: (x) => x.amount },
    ]));
    const draw = () => {
      const ty = $("[data-type]", el).value;
      $("[data-rows]", el).innerHTML = tx.filter((x) => !ty || x.type === ty).slice(0, 500).map((x) => `<tr><td class="nowrap">${dateTime(x.createdAt)}</td><td>${te(TX_LABELS[x.type] || x.type)}</td><td>${esc(userName(x.userId))}</td><td>${x.projectId ? esc(projTitle(x.projectId)) : "—"}</td><td class="small">${esc(t(x.note))}</td><td class="num">${num(x.amount)}</td></tr>`).join("") || `<tr><td colspan="6" class="empty">${te("Operatsiyalar yo'q")}</td></tr>`;
    };
    $("[data-type]", el).onchange = draw;
    draw();
  },

  // --- Sozlamalar ---------------------------------------------------------
  settings(el) {
    const s = data.settings;
    const b = s.bank || {};
    const c = s.content || {};
    const langTab = (l, name) => `<div data-lang-pane="${l}" ${l === "uz" ? "" : "hidden"}><div class="form-grid">
      <label class="field">${te("Yashil yozuv (badge)")}<input name="c_${l}_heroBadge" value="${esc(c[l]?.heroBadge)}" /></label>
      <label class="field">${te("Sarlavha")}<input name="c_${l}_heroTitle" value="${esc(c[l]?.heroTitle)}" /></label>
      <label class="field full">${te("Qisqa matn")}<input name="c_${l}_heroSubtitle" value="${esc(c[l]?.heroSubtitle)}" /></label>
      <label class="field full">${te("«Biz haqimizda» matni")}<textarea name="c_${l}_about" style="min-height:160px">${esc(c[l]?.about)}</textarea></label></div></div>`;
    el.innerHTML = `<h2>${te("Sozlamalar")}</h2><div class="card"><form class="form" id="set-form">
      <h3>${te("Bosh sahifa")}</h3>
      <div class="hero-preview" style="background-image:url('${esc(s.heroImage || DEFAULT_HERO_IMAGE)}')"><span>${te(s.heroImage ? "Yuklangan rasm" : "Standart rasm")}</span></div>
      <div class="row mt-1"><label class="btn btn-sm btn-outline upload-btn"><input type="file" accept="image/*" data-hero hidden />📷 ${te("Bosh sahifa rasmini yuklash")}</label>${s.heroImage ? `<button type="button" class="btn btn-sm btn-ghost" data-hero-reset>${te("Standart rasmga qaytarish")}</button>` : ""}<span class="small muted">${te("Tavsiya: 1920×900 px, sabzavot / dala surati")}</span></div>
      <input type="hidden" name="heroImage" value="${esc(s.heroImage)}" />
      <p class="small muted mt-2">${te("Matnlar tillar bo'yicha. O'zbekcha (kirill) avtomatik ravishda lotinchadan o'giriladi.")}</p>
      <div class="pill-tabs">${[["uz", "O'zbekcha"], ["ru", "Русский"], ["en", "English"]].map(([l, n], i) => `<button type="button" data-lang-tab="${l}" class="${i ? "" : "active"}">${n}</button>`).join("")}</div>
      <div class="mt-2">${langTab("uz")}${langTab("ru")}${langTab("en")}</div>

      <div class="form-section"><h3>📝 ${te("Shartnoma shabloni (PDF)")}</h3>
        <p class="small muted">${te("Investor va fermer shu faylni yuklab olib imzolaydi. Muayyan loyiha uchun alohida shablonni «Loyihalar → Boshqarish» oynasida yuklash mumkin.")}</p>
        <div class="row">${s.contractTemplate ? `${openBtn(s.contractTemplate)} <span class="small muted">${date(s.contractTemplate.uploadedAt)}</span>` : `<span class="badge tone-bad">${te("Yuklanmagan")}</span>`}
          <label class="btn btn-sm upload-btn"><input type="file" accept="application/pdf" data-template hidden />📤 ${te(s.contractTemplate ? "Yangi shablon yuklash" : "Shablon yuklash")}</label></div>
      </div>

      <div class="form-section"><h3>${te("Moliyaviy shartlar")}</h3><div class="form-grid">
        <label class="field">${te("Platforma komissiyasi (investorlar ulushidan, %)")}<input name="commission" type="number" min="0" max="50" step="any" value="${esc(s.commission)}" /></label>
        <label class="field">${te("Minimal investitsiya (so'm)")}<input name="minInvestment" type="number" min="1000" step="any" value="${esc(s.minInvestment)}" /></label>
        <label class="check full"><input type="checkbox" name="showStats" ${s.showStats !== false ? "checked" : ""} /> ${te("Bosh sahifada statistikani ko'rsatish (loyihalar soni, jalb qilingan mablag', investorlar)")}</label>
        <label class="check full"><input type="checkbox" name="showDemoLogins" ${s.showDemoLogins ? "checked" : ""} /> ${te("Kirish sahifasida demo hisob tugmalarini ko'rsatish")}</label>
        <label class="check full"><input type="checkbox" name="testPayments" ${s.testPayments ? "checked" : ""} /> ${te("Test to'lov rejimi (hisob haqiqiy pulsiz to'ldiriladi — faqat sinov uchun!)")}</label>
      </div></div>

      <div class="form-section"><h3>${te("Bank o'tkazmasi uchun rekvizitlar")}</h3><p class="small muted">${te("Investorlar hisobni to'ldirish uchun shu rekvizitlarga pul o'tkazadi va chek yuklaydi.")}</p><div class="form-grid">
        <label class="field">${te("Qabul qiluvchi (tashkilot nomi)")}<input name="bank_recipient" value="${esc(b.recipient)}" /></label>
        <label class="field">${te("Bank nomi")}<input name="bank_bankName" value="${esc(b.bankName)}" /></label>
        <label class="field">${te("Hisob raqami")}<input name="bank_account" value="${esc(b.account)}" /></label>
        <label class="field">${te("MFO")}<input name="bank_mfo" value="${esc(b.mfo)}" /></label>
        <label class="field">${te("STIR (INN)")}<input name="bank_inn" value="${esc(b.inn)}" /></label>
        <label class="field">${te("To'lov maqsadi")} <small>({id} — ${te("to'lov raqami")})</small><input name="bank_purpose" value="${esc(b.purpose)}" /></label>
      </div></div>

      <div class="form-section"><h3>${te("Aloqa")}</h3><div class="form-grid">
        <label class="field">${te("Telefon")}<input name="contactPhone" value="${esc(s.contactPhone)}" /></label>
        <label class="field">${te("Email")}<input name="contactEmail" value="${esc(s.contactEmail)}" /></label>
        <label class="field">${te("Manzil")}<input name="address" value="${esc(s.address)}" /></label>
        <label class="field">Telegram<input name="telegram" value="${esc(s.telegram)}" placeholder="@agricrowd_uz" /></label></div></div>

      <div class="form-section"><h3>${te("Ma'lumotnomalar")}</h3><div class="form-grid">
        <label class="field">${te("Hududlar")} <small>(${te("har biri yangi qatorda")})</small><textarea name="regions" style="min-height:220px">${esc(s.regions.join("\n"))}</textarea></label>
        <label class="field">${te("Sabzavot mahsulotlari")} <small>(${te("har biri yangi qatorda")})</small><textarea name="crops" style="min-height:220px">${esc(s.crops.join("\n"))}</textarea></label></div></div>
      <div class="error-box" data-error hidden></div><div><button class="btn btn-lg">${te("Saqlash")}</button></div></form></div>
      <div class="card mt-3"><h3>✈️ ${te("Telegram bot")}</h3>
        ${state.boot?.features?.telegram ? `<p class="small">${te("Bot ulangan. Birinchi marta (yoki domen o'zgarsa) quyidagi tugmani bosing — Telegram xabarlarni saytga yubora boshlaydi.")}</p><button class="btn" data-tg-setup>${te("Telegram webhook'ni o'rnatish")}</button>`
          : `<p class="small muted">${te("Bot hali ulanmagan. README'dagi 7-bosqichga qarang: BotFather'da bot yarating va TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET o'zgaruvchilarini Netlify'ga kiriting.")}</p>`}
        <p class="small muted mt-1">✉️ ${te("Email")}: ${state.boot?.features?.email ? `<span class="badge tone-good">${te("ulangan")}</span>` : `<span class="badge tone-warn">${te("ulanmagan")}</span> — ${te("README'dagi 6-bosqich (Resend)")}`}</p></div>
      <div class="card mt-3 danger-zone"><h3>🧹 ${te("Saytni haqiqiy ishga tayyorlash")}</h3>
        <p class="small">${te("Demo foydalanuvchilar (investor@, malika@, fermer@, dehqon@agricrowd.uz), demo loyihalar, ularning investitsiyalari, shartnomalari, to'lovlari va demo yangiliklar hamma uchun o'chiriladi. Test to'lov rejimi va demo tugmalar o'chiriladi. Siz qo'shgan ma'lumotlar saqlanib qoladi.")}</p>
        <button class="btn btn-danger" data-purge>${te("Demo ma'lumotlarni o'chirish")}</button></div>`;
    $("[data-tg-setup]", el)?.addEventListener("click", (e) => run(e.target, async () => { const r = await api("telegramSetup", {}); toast(t("Webhook o'rnatildi: {url}", { url: r.url })); }));
    $("[data-purge]", el).onclick = async (e) => {
      if (!(await confirmDlg(t("Barcha demo ma'lumotlar o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi. Davom etasizmi?"), { danger: true, ok: t("O'chirish") }))) return;
      run(e.target, async () => { const r = await api("purgeDemo", {}); toast(t("{n} ta demo yozuv o'chirildi", { n: r.removed })); });
    };
    const form = $("#set-form", el);
    bindOpen(el);
    $$("[data-lang-tab]", el).forEach((btn) => (btn.onclick = () => {
      $$("[data-lang-tab]", el).forEach((x) => x.classList.toggle("active", x === btn));
      $$("[data-lang-pane]", el).forEach((x) => (x.hidden = x.dataset.langPane !== btn.dataset.langTab));
    }));
    $("[data-hero]", el).onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const dataUrl = await compressImage(f, 1920, 0.78);
        const up = await uploadFile(dataUrl, { purpose: "image", name: "hero.jpg" });
        form.heroImage.value = up.url;
        $(".hero-preview", el).style.backgroundImage = `url('${up.url}')`;
        toast(t("Rasm yuklandi — «Saqlash» tugmasini bosing"));
      } catch (err) { toast(err.message, "err"); }
    };
    $("[data-hero-reset]", el)?.addEventListener("click", () => { form.heroImage.value = ""; $(".hero-preview", el).style.backgroundImage = `url('${DEFAULT_HERO_IMAGE}')`; });
    $("[data-template]", el).onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const up = await uploadFile(f, { purpose: "contract-template", refId: "global" });
        await api("setGlobalTemplate", { file: { path: up.path, name: up.name, size: up.size } });
        toast(t("Shartnoma shabloni yuklandi"));
        reload();
      } catch (err) { toast(err.message, "err"); }
    };
    form.onsubmit = (e) => {
      e.preventDefault();
      const d = formData(form);
      const payload = { commission: d.commission, minInvestment: d.minInvestment, testPayments: d.testPayments, showStats: d.showStats, showDemoLogins: d.showDemoLogins, heroImage: d.heroImage, contactPhone: d.contactPhone, contactEmail: d.contactEmail, address: d.address, telegram: d.telegram, regions: d.regions, crops: d.crops, bank: {}, content: { uz: {}, ru: {}, en: {} } };
      for (const [k, v] of Object.entries(d)) {
        if (k.startsWith("bank_")) payload.bank[k.slice(5)] = v;
        const m = k.match(/^c_(uz|ru|en)_(\w+)$/);
        if (m) payload.content[m[1]][m[2]] = v;
      }
      run(e.submitter, () => api("updateSettings", payload), "Sozlamalar saqlandi");
    };
  },

  // --- Jurnal -------------------------------------------------------------
  logs(el) {
    el.innerHTML = `<div class="row between mb-2"><h2 class="mb-0">${te("Faoliyat jurnali")}</h2><div data-actions></div></div><div class="table-wrap">${logTable(data.logs)}</div>`;
    $("[data-actions]", el).append(csvButton("jurnal", data.logs, [{ label: "Sana", get: (l) => l.createdAt }, { label: "Foydalanuvchi", get: (l) => userName(l.userId) }, { label: "Amal", get: (l) => t(LOG_LABELS[l.action] || l.action) }, { label: "Tafsilot", get: (l) => l.details }]));
  },
};

const LOG_LABELS = {
  register: "Ro'yxatdan o'tdi", login: "Tizimga kirdi", update_profile: "Profilni yangiladi", change_password: "Parolni o'zgartirdi", deposit: "Hisobni to'ldirdi",
  withdraw_request: "Mablag' yechishni so'radi", invest: "Investitsiya kiritdi", create_project: "Loyiha yaratdi", update_project: "Loyihani tahrirladi", add_update: "Monitoring qo'shdi",
  review_project: "Loyihani tekshirdi", admin_update_project: "Loyihani tahrirladi (admin)", set_status: "Holatni o'zgartirdi", distribute: "Daromadni taqsimladi",
  delete_project: "Loyihani o'chirdi", delete_update: "Monitoringni o'chirdi", admin_create_user: "Foydalanuvchi qo'shdi", admin_update_user: "Foydalanuvchini tahrirladi",
  delete_user: "Foydalanuvchini o'chirdi", update_settings: "Sozlamalarni o'zgartirdi", project_funded: "Loyiha 100% moliyalashtirildi", project_refunded: "Mablag' qaytarildi",
  sign_contract: "Shartnomani imzoladi", review_contract: "Shartnomani tekshirdi", funds_released: "Mablag' fermerga ajratildi", release_funds: "Mablag'ni ajratdi",
  set_template: "Shartnoma shablonini yukladi", create_payment: "To'lov yaratdi", attach_receipt: "Chek yukladi", review_payment: "To'lovni tekshirdi",
  review_withdrawal: "Yechish so'rovini ko'rib chiqdi", purge_demo: "Demo ma'lumotlarni o'chirdi",
  password_reset_request: "Parol tiklashni so'radi", password_reset: "Parolni tikladi", telegram_link: "Telegram'ni uladi",
  add_project_doc: "Loyihaga hujjat qo'shdi", remove_project_doc: "Loyiha hujjatini o'chirdi", save_news: "Yangilikni saqladi", delete_news: "Yangilikni o'chirdi", broadcast: "Xabar yubordi",
};
function logTable(logs) {
  if (!logs.length) return `<p class="muted">${te("Yozuvlar yo'q")}</p>`;
  return `<table class="data"><thead><tr><th>${te("Sana")}</th><th>${te("Foydalanuvchi")}</th><th>${te("Amal")}</th><th>${te("Tafsilot")}</th></tr></thead><tbody>${logs.map((l) => `<tr><td class="nowrap">${dateTime(l.createdAt)}</td><td>${esc(userName(l.userId))}</td><td>${te(LOG_LABELS[l.action] || l.action)}</td><td class="small">${esc(l.details)}</td></tr>`).join("")}</tbody></table>`;
}

function noteDialog(title, fn, okMsg) {
  modal({
    title,
    body: `<form class="form" id="note-form"><label class="field">${te("Izoh")}<textarea name="note" required></textarea></label><div class="error-box" data-error hidden></div><button class="btn btn-danger">${te("Tasdiqlash")}</button></form>`,
    onMount(m, close) {
      $("#note-form", m).onsubmit = async (e) => {
        e.preventDefault();
        const note = e.target.note.value.trim();
        if (!note) return;
        await busy(e.submitter, async () => {
          try { await fn(note); close(); toast(t(okMsg)); await reload(); }
          catch (err) { showFormError(e.target, err.message); }
        });
      };
    },
  });
}

function rejectContract(id) {
  const c = data.contracts.find((x) => x.id === id);
  modal({
    title: t("Shartnomani rad etish"),
    body: `<form class="form" id="rc-form"><p>${te("Qaysi tomon faylini qayta yuklashi kerak?")}</p>
      <div class="row">${[["investor", "Investor"], ["farmer", "Fermer"], ["both", "Ikkala tomon"]].map(([v, l], i) => `<label class="check"><input type="radio" name="side" value="${v}" ${i === 2 || (v === "investor" && !c.farmerFile) || (v === "farmer" && !c.investorFile) ? "checked" : ""} /> ${te(l)}</label>`).join("")}</div>
      <label class="field">${te("Sabab (tomonlarga yuboriladi)")}<textarea name="note" required placeholder="${te("Masalan: imzo yoki muhr aniq ko'rinmaydi")}"></textarea></label>
      <div class="error-box" data-error hidden></div><button class="btn btn-danger">${te("Rad etish")}</button></form>`,
    onMount(m, close) {
      $("#rc-form", m).onsubmit = async (e) => {
        e.preventDefault();
        const d = formData(e.target);
        await busy(e.submitter, async () => {
          try { await api("reviewContract", { id, decision: "reject", side: d.side, note: d.note }); close(); toast(t("Tomonlarga xabar yuborildi")); reload(); }
          catch (err) { showFormError(e.target, err.message); }
        });
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Loyihani boshqarish oynasi

function manageProject(id) {
  const p = data.projects.find((x) => x.id === id);
  const invs = data.investments.filter((i) => i.projectId === id);
  const contracts = data.contracts.filter((c) => c.projectId === id);
  const next = { pending: [["rejected", "Rad etish"]], rejected: [["pending", "Qayta tekshiruvga"]], funding: [["refunded", "Bekor qilish va mablag'ni qaytarish"]], funded: [["in_progress", "Amalga oshirish boshlandi"]], in_progress: [["harvest", "Hosil yig'ish / sotish bosqichi"]] }[p.status] || [];
  const canDistribute = ["funded", "in_progress", "harvest"].includes(p.status);
  const commission = data.settings.commission;
  modal({
    title: tc(p.title),
    wide: true,
    body: `<div class="row between">${statusBadge(p.status)}<span class="small muted">${te("Fermer")}: <b>${esc(userName(p.farmerId))}</b> · ${stars(data.users.find((u) => u.id === p.farmerId)?.rating)}</span></div>
      <div class="kpis mt-2">${kpi(money(p.goal), "Kerakli mablag'")}${kpi(money(p.raised), t("Yig'ilgan ({n}%)", { n: String(p.percent) }))}${kpi(String(p.investors), "Investorlar")}${kpi(money(p.expectedRevenue), "Kutilayotgan daromad")}</div>
      <div class="row mt-3">
        <button class="btn btn-outline" data-edit>✏️ ${te("Ma'lumotlarni tahrirlash")}</button>
        <button class="btn btn-outline" data-pdocs>📁 ${te("Hujjatlar")} (${(p.docs || []).length})</button>
        <a class="btn btn-outline" href="#/project/${p.id}" data-close>👁 ${te("Sahifani ko'rish")}</a>
        ${MONITOR_STATUSES.includes(p.status) || p.status === "completed" ? `<a class="btn btn-outline" href="#/admin/monitoring/${p.id}" data-close>📷 ${te("Monitoring")}</a>` : ""}
        ${contracts.length ? `<a class="btn btn-outline" href="#/admin/contracts" data-close>📝 ${te("Shartnomalar")} (${contracts.filter((c) => c.status === "verified").length}/${contracts.length})</a>` : ""}
        ${p.status === "pending" ? `<button class="btn" data-approve>✅ ${te("Tasdiqlash")}</button>` : ""}
        ${next.map(([s, l]) => `<button class="btn ${s === "refunded" || s === "rejected" ? "btn-danger" : ""}" data-status="${s}">${te(l)}</button>`).join("")}
        ${!invs.length ? `<button class="btn btn-ghost" data-delete style="color:var(--red)">🗑 ${te("O'chirish")}</button>` : ""}
      </div>
      <div class="card-flat mt-3"><h3>📝 ${te("Shu loyiha uchun shartnoma shabloni")}</h3>
        <div class="row">${p.contractTemplate ? openBtn(p.contractTemplate) : `<span class="small muted">${te("Umumiy shablon ishlatiladi")}${data.settings.contractTemplate ? "" : " (" + te("yuklanmagan") + ")"}</span>`}
        <label class="btn btn-sm btn-outline upload-btn"><input type="file" accept="application/pdf" data-ptemplate hidden />📤 ${te("PDF yuklash")}</label>${p.contractTemplate ? `<button class="btn btn-sm btn-ghost" data-ptemplate-del>${te("Olib tashlash")}</button>` : ""}</div></div>
      ${canDistribute && !p.disbursedAt ? `<div class="warn-box mt-3">💵 ${te("Mablag' hali fermerga ajratilmagan — shartnomalar tasdiqlanishi kutilmoqda.")} <a href="#/admin/contracts" data-close>${te("Shartnomalar")} →</a></div>` : ""}
      ${canDistribute && p.disbursedAt ? `<div class="card-flat mt-3"><h3>💰 ${te("Hosil realizatsiyasi va daromadni taqsimlash")}</h3>
        <p class="small muted">${te("Hosil → Sotish → Daromad → Investorlar va fermer o'rtasida taqsimlash. Investorlar ulushi: {share}%, platforma komissiyasi: investorlar ulushidan {c}%.", { share: String(p.investorShare), c: String(commission) })}</p>
        <form class="form" id="dist-form"><div class="form-grid">
          <label class="field">${te("Hosil sotuvidan tushgan haqiqiy daromad (so'm)")}<input name="actualRevenue" type="number" min="1" step="any" required value="${p.expectedRevenue}" /></label>
          <label class="field">${te("Izoh")}<input name="note" placeholder="${te("Masalan: 92 tonna, o'rtacha 3 300 so'm/kg")}" /></label></div>
          <div class="info-box" data-dist-preview></div>
          <div><button class="btn">${te("Daromadni taqsimlash va loyihani yakunlash")}</button></div></form></div>` : ""}
      ${p.distribution ? `<div class="info-box mt-3">${te("Yakuniy hisob: tushum {rev} · investorlarga {inv} · komissiya {com} · fermer {farm}", { rev: money(p.actualRevenue), inv: money(p.distribution.toInvestors), com: money(p.distribution.commission), farm: money(p.distribution.farmerPart) })}</div>` : ""}
      <h3 class="mt-3">${te("Investorlar")} (${invs.length})</h3>
      ${invs.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>${te("Investor")}</th><th>${te("Sana")}</th><th class="num">${te("Summa")}</th><th class="num">${te("Ulush")}</th><th class="num">${te("To'lov")}</th><th>${te("Holat")}</th></tr></thead><tbody>${invs.map((i) => `<tr><td>${esc(userName(i.investorId))}</td><td>${date(i.createdAt)}</td><td class="num">${num(i.amount)}</td><td class="num">${((i.amount / p.goal) * 100).toFixed(2)}%</td><td class="num">${i.payout ? num(i.payout) : "—"}</td><td>${esc(i.status)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">${te("Hali investitsiya yo'q")}</p>`}`,
    onMount(m, close) {
      $$("[data-close]", m).forEach((a) => a.addEventListener("click", close));
      bindOpen(m);
      $("[data-edit]", m).onclick = () => { close(); editProject(id); };
      $("[data-pdocs]", m).onclick = () => { close(); docsModal(p, { canRemove: true, onChange: reload }); };
      $("[data-approve]", m)?.addEventListener("click", (e) => { close(); run(null, () => api("reviewProject", { id, decision: "approve" }), "Loyiha e'lon qilindi"); });
      $$("[data-status]", m).forEach((b) => (b.onclick = async () => {
        const st = b.dataset.status;
        const ok = await confirmDlg(st === "refunded" ? t("Loyiha bekor qilinadi va barcha investorlar mablag'i hisoblariga qaytariladi. Davom etasizmi?") : t("Holat «{status}» ga o'zgartirilsinmi?", { status: t(STATUSES[st].label) }), { danger: st === "refunded" });
        if (ok) { close(); run(null, () => api("setProjectStatus", { id, status: st }), "Holat o'zgartirildi"); }
      }));
      $("[data-delete]", m)?.addEventListener("click", async () => {
        if (await confirmDlg(t("Loyiha butunlay o'chiriladi. Davom etasizmi?"), { danger: true, ok: t("O'chirish") })) { close(); run(null, () => api("deleteProject", { id }), "Loyiha o'chirildi"); }
      });
      $("[data-ptemplate]", m).onchange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        try {
          const up = await uploadFile(f, { purpose: "contract-template", refId: id });
          await api("setProjectTemplate", { id, file: { path: up.path, name: up.name, size: up.size } });
          close(); toast(t("Shartnoma shabloni yuklandi")); reload();
        } catch (err) { toast(err.message, "err"); }
      };
      $("[data-ptemplate-del]", m)?.addEventListener("click", () => { close(); run(null, () => api("setProjectTemplate", { id, file: null }), "Saqlandi"); });
      const df = $("#dist-form", m);
      if (df) {
        const prev = () => {
          const r = Number(df.actualRevenue.value) || 0;
          const pool = r * (p.investorShare / 100);
          const com = pool * (commission / 100);
          $("[data-dist-preview]", m).textContent = t("Investorlar ulushi: {pool} → komissiya {com}, investorlarga to'lanadi {inv} (kiritilgan mablag'ga nisbatan {roi}%) · fermer ulushi {farm}", { pool: money(pool), com: money(com), inv: money(pool - com), roi: p.raised ? (((pool - com) / p.raised - 1) * 100).toFixed(1) : "0", farm: money(r - pool) });
        };
        df.oninput = prev;
        prev();
        df.onsubmit = async (e) => {
          e.preventDefault();
          if (!(await confirmDlg(t("Daromad investorlar hisoblariga o'tkaziladi va loyiha yakunlanadi. Bu amalni ortga qaytarib bo'lmaydi.")))) return;
          close();
          run(null, () => api("distribute", { id, ...formData(df) }), "Daromad taqsimlandi");
        };
      }
    },
  });
}

async function editProject(id) {
  const farmers = data.users.filter((u) => u.role === "farmer");
  let p = {};
  if (id) p = await api("getProject", { id });
  modal({
    title: t(id ? "Loyihani tahrirlash" : "Yangi loyiha (fermer nomidan)"),
    wide: true,
    body: `${projectFormHtml(p, data.settings, { farmers, admin: true })}
      ${!id ? `<label class="check mt-2"><input type="checkbox" id="publish-now" checked /> ${te("Darhol e'lon qilish (tekshiruvsiz)")}</label>` : ""}
      <div class="row mt-3"><button class="btn btn-lg" data-save>${te("Saqlash")}</button></div>`,
    onMount(m, close) {
      const form = $("#project-form", m);
      bindProjectForm(form);
      $("[data-save]", m).onclick = (e) => busy(e.currentTarget, async () => {
        try {
          const d = readProjectForm(form);
          if (!d.farmerId) throw new Error(t("Fermerni tanlang"));
          if (id) await api("adminUpdateProject", { id, ...d });
          else await api("createProject", { ...d, publish: $("#publish-now", m).checked });
          close();
          toast(t("Loyiha saqlandi"));
          await refreshBoot().catch(() => {});
          reload();
        } catch (err) { showFormError(form, err.message); }
      });
    },
  });
}

function editNews(id) {
  const n = id ? data.news.find((x) => x.id === id) : { published: true };
  modal({
    title: t(id ? "Yangilikni tahrirlash" : "Yangilik qo'shish"),
    wide: true,
    body: `<form class="form" id="news-form">
      <label class="field">${te("Sarlavha")}<input name="title" required value="${esc(n.title)}" /></label>
      <label class="field">${te("Matn")}<textarea name="body" style="min-height:220px">${esc(n.body)}</textarea></label>
      <label class="field">${te("Rasm")}<input type="file" accept="image/*" data-img /><input type="hidden" name="image" value="${esc(n.image || "")}" /><div class="img-thumbs" data-prev>${n.image ? `<img src="${esc(n.image)}" alt="" />` : ""}</div></label>
      <label class="check"><input type="checkbox" name="published" ${n.published ? "checked" : ""} /> ${te("E'lon qilish")}</label>
      <div class="error-box" data-error hidden></div><button class="btn btn-lg">${te("Saqlash")}</button></form>`,
    onMount(m, close) {
      const form = $("#news-form", m);
      $("[data-img]", m).onchange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        try {
          const up = await uploadFile(await compressImage(f, 1600, 0.75), { purpose: "image", name: "news.jpg" });
          form.image.value = up.url;
          $("[data-prev]", m).innerHTML = `<img src="${esc(up.url)}" alt="" />`;
        } catch (err) { toast(err.message, "err"); }
      };
      form.onsubmit = async (e) => {
        e.preventDefault();
        await busy(e.submitter, async () => {
          try { await api("saveNews", { id, ...formData(form) }); close(); toast(t("Saqlandi")); reload(); }
          catch (err) { showFormError(form, err.message); }
        });
      };
    },
  });
}

function broadcastModal() {
  modal({
    title: t("Xabar yuborish"),
    body: `<form class="form" id="bc-form"><label class="field">${te("Kimga")}<select name="role"><option value="">${te("Barcha foydalanuvchilar")}</option><option value="investor">${te("Investorlar")}</option><option value="farmer">${te("Fermerlar")}</option></select></label>
      <label class="field">${te("Sarlavha")}<input name="title" required /></label><label class="field">${te("Matn")}<textarea name="body"></textarea></label>
      <p class="small muted">${te("Xabar foydalanuvchilarning bildirishnomalariga (va email sozlangan bo'lsa, pochtasiga) yuboriladi.")}</p>
      <div class="error-box" data-error hidden></div><button class="btn">${te("Yuborish")}</button></form>`,
    onMount(m, close) {
      $("#bc-form", m).onsubmit = async (e) => {
        e.preventDefault();
        await busy(e.submitter, async () => {
          try { const r = await api("broadcast", formData(e.target)); close(); toast(t("{n} ta foydalanuvchiga yuborildi", { n: r.count })); }
          catch (err) { showFormError(e.target, err.message); }
        });
      };
    },
  });
}

function userFormHtml(u = {}, isNew) {
  const f = u.farm || {};
  const dc = u.docs || {};
  const b = u.bank || {};
  return `<form class="form" id="user-form"><div class="form-grid">
    <label class="field">${te("Ism-familiya")}<input name="name" value="${esc(u.name)}" required /></label>
    <label class="field">${te("Email")}<input name="email" type="email" value="${esc(u.email)}" ${isNew ? "required" : "disabled"} /></label>
    <label class="field">${te("Telefon")}<input name="phone" value="${esc(u.phone)}" /></label>
    <label class="field">${te("Rol")}<select name="role" ${u.id === state.user.id ? "disabled" : ""}>${Object.entries(ROLE).map(([k, l]) => `<option value="${k}" ${u.role === k ? "selected" : ""}>${te(l)}</option>`).join("")}</select></label>
    <label class="field">${te(isNew ? "Parol" : "Yangi parol")} <small>${te(isNew ? "(kamida 6 belgi)" : "(bo'sh qoldirilsa o'zgarmaydi)")}</small><input name="password" type="text" ${isNew ? "required" : ""} autocomplete="off" /></label>
    ${!isNew ? `<label class="field">${te("Reyting (0–5, fermerlar uchun)")}<input name="rating" type="number" min="0" max="5" step="0.1" value="${esc(u.rating ?? "")}" /></label>
    <label class="field">${te("Balansni tuzatish (so'm, +/−)")} <small>${te("Joriy")}: ${esc(money(u.balance))}</small><input name="balanceAdjust" type="number" step="any" /></label>
    <label class="field">${te("Tuzatish izohi")}<input name="note" /></label>
    <label class="check"><input type="checkbox" name="verified" ${u.verified ? "checked" : ""} /> ${te("Tasdiqlangan (verifikatsiya)")}</label>
    <label class="check"><input type="checkbox" name="blocked" ${u.blocked ? "checked" : ""} ${u.id === state.user.id ? "disabled" : ""} /> ${te("Bloklangan")}</label>` : ""}
    </div>
    ${!isNew && (dc.passport || b.card || b.account) ? `<div class="info-box small mt-2">${te("Pasport")}: ${esc(dc.passport || "—")} · ${te("JSHSHIR")}: ${esc(dc.pinfl || "—")} · ${te("Karta")}: ${esc(b.card || "—")} · ${te("Hisob")}: ${esc(b.account || "—")}</div>` : ""}
    ${u.role === "farmer" ? `<div class="form-section"><h3>${te("Xo'jalik")}</h3><div class="form-grid">
      <label class="field full">${te("Xo'jalik nomi")}<input name="farm_name" value="${esc(f.name)}" /></label>
      <label class="field">${te("Turi")}<input name="farm_type" value="${esc(f.type)}" /></label>
      <label class="field">${te("Viloyat")}<input name="farm_region" value="${esc(f.region)}" /></label>
      <label class="field">${te("Tuman")}<input name="farm_district" value="${esc(f.district)}" /></label>
      <label class="field">${te("Maydon (ga)")}<input name="farm_area" type="number" step="any" value="${esc(f.area)}" /></label>
      <label class="field">${te("Tajriba (yil)")}<input name="farm_experience" type="number" value="${esc(f.experience)}" /></label>
      <label class="field">${te("STIR (INN)")}<input name="farm_inn" value="${esc(f.inn)}" /></label>
      <label class="field full">${te("Xo'jalik haqida")}<textarea name="farm_about">${esc(f.about)}</textarea></label></div></div>` : ""}
    <div class="error-box" data-error hidden></div>
    <div class="row between"><button class="btn btn-lg">${te("Saqlash")}</button>${!isNew && u.id !== state.user.id ? `<button type="button" class="btn btn-ghost" style="color:var(--red)" data-del>🗑 ${te("O'chirish")}</button>` : ""}</div></form>`;
}

function editUser(id) {
  const u = data.users.find((x) => x.id === id);
  modal({
    title: u.name, wide: true, body: userFormHtml(u, false),
    onMount(m, close) {
      const form = $("#user-form", m);
      form.onsubmit = async (e) => {
        e.preventDefault();
        const d = formData(form);
        const payload = { id, name: d.name, phone: d.phone, verified: d.verified, rating: d.rating === "" ? null : d.rating };
        if (d.role !== undefined) payload.role = d.role;
        if (d.blocked !== undefined) payload.blocked = d.blocked;
        if (d.password) payload.password = d.password;
        if (d.balanceAdjust) { payload.balanceAdjust = d.balanceAdjust; payload.note = d.note; }
        if (u.role === "farmer") payload.farm = { name: d.farm_name, type: d.farm_type, region: d.farm_region, district: d.farm_district, area: d.farm_area, experience: d.farm_experience, inn: d.farm_inn, about: d.farm_about };
        await busy(e.submitter, async () => {
          try { await api("adminUpdateUser", payload); close(); toast(t("Saqlandi")); reload(); }
          catch (err) { showFormError(form, err.message); }
        });
      };
      $("[data-del]", m)?.addEventListener("click", async () => {
        if (await confirmDlg(t("«{name}» o'chirilsinmi?", { name: u.name }), { danger: true, ok: t("O'chirish") })) { close(); run(null, () => api("deleteUser", { id }), "Foydalanuvchi o'chirildi"); }
      });
    },
  });
}

function newUser() {
  modal({
    title: t("Yangi foydalanuvchi"), body: userFormHtml({ role: "investor" }, true),
    onMount(m, close) {
      const form = $("#user-form", m);
      form.onsubmit = async (e) => {
        e.preventDefault();
        await busy(e.submitter, async () => {
          try { await api("adminCreateUser", formData(form)); close(); toast(t("Foydalanuvchi qo'shildi")); reload(); }
          catch (err) { showFormError(form, err.message); }
        });
      };
    },
  });
}
