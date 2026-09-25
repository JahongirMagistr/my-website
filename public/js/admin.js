// Administrator paneli: tahlil, loyihalarni tekshirish, tahrirlash, foydalanuvchilar, moliya, sozlamalar
import { api } from "./store.js";
import { STATUSES, MONITOR_STATUSES } from "./core.js";
import {
  $, $$, esc, num, money, short, date, dateTime, statusBadge, cropIcon, toast, modal, confirmDlg, formData, busy,
  compressImage, timeline, barList, columnChart, toCSV, download, stars,
} from "./ui.js";
import { projectFormHtml, bindProjectForm, readProjectForm, showFormError } from "./forms.js";
import { state, requireRole, go, refreshBoot } from "./app.js";

let data = null;
const app = () => $("#app");
const userName = (id) => data.users.find((u) => u.id === id)?.name || (id ? "—" : "Platforma");
const projTitle = (id) => data.projects.find((p) => p.id === id)?.title || "—";

const TABS = [
  ["dashboard", "📊 Tahlil"],
  ["review", "✅ Tekshiruv"],
  ["projects", "🌱 Loyihalar"],
  ["users", "👥 Foydalanuvchilar"],
  ["investments", "💼 Investitsiyalar"],
  ["monitoring", "📷 Monitoring"],
  ["finance", "💰 Moliya"],
  ["settings", "⚙️ Sozlamalar"],
  ["logs", "🕘 Faoliyat jurnali"],
];

export async function renderAdmin(tab = "dashboard", id) {
  if (!requireRole(["admin"])) return;
  data = await api("adminData");
  tab = tab || "dashboard";
  const pending = data.analytics.pending;
  const side = `<nav class="dash-side"><div class="who"><span class="small muted">Administrator</span><b>${esc(state.user.name)}</b><span class="small muted">${esc(state.user.email)}</span></div>
    ${TABS.map(([k, l]) => `<a href="#/admin/${k}" class="${k === tab ? "active" : ""}">${l}${k === "review" && pending ? `<span class="count">${pending}</span>` : ""}</a>`).join("")}</nav>`;
  const view = VIEWS[tab] || VIEWS.dashboard;
  app().innerHTML = `<div class="container dash">${side}<div data-admin-main></div></div>`;
  view($("[data-admin-main]"), id);
}

const reload = () => renderAdmin(location.hash.split("/")[2] || "dashboard", location.hash.split("/")[3]);
const kpi = (v, l, accent) => `<div class="kpi ${accent ? "accent" : ""}"><div class="v">${v}</div><div class="l">${l}</div></div>`;

async function run(btn, fn, okMsg) {
  return busy(btn, async () => {
    try {
      await fn();
      if (okMsg) toast(okMsg);
      await refreshBoot().catch(() => {});
      reload();
    } catch (e) { toast(e.message, "err"); }
  });
}

function csvButton(name, rows, columns) {
  const b = document.createElement("button");
  b.className = "btn btn-sm btn-outline";
  b.textContent = "⬇ CSV (Excel)";
  b.onclick = () => download(`${name}-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows, columns));
  return b;
}

const VIEWS = {
  // --- Tahlil -------------------------------------------------------------
  dashboard(el) {
    const a = data.analytics;
    const monthLabel = (k) => ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"][Number(k.slice(5)) - 1];
    el.innerHTML = `
      <div class="row between mb-2"><h2 class="mb-0">Platforma tahlili</h2><span class="small muted">Yangilangan: ${dateTime(new Date().toISOString())}</span></div>
      ${a.pending ? `<div class="warn-box mb-2">⏳ <b>${a.pending}</b> ta loyiha tekshiruvni kutmoqda. <a href="#/admin/review">Tekshirish →</a></div>` : ""}
      <div class="kpis">
        ${kpi(short(a.totalRaised), "Jalb qilingan mablag'", true)}
        ${kpi(a.projects, "Jami loyihalar")}
        ${kpi(a.totalInvestments, "Investitsiyalar soni")}
        ${kpi(`${a.investors} / ${a.farmers}`, "Investorlar / fermerlar")}
        ${kpi(short(a.paidOut), "Investorlarga to'langan")}
        ${kpi(short(a.commissionEarned), "Platforma komissiyasi")}
        ${kpi(short(a.refunded), "Qaytarilgan mablag'")}
        ${kpi(a.successRate === null ? "—" : a.successRate + "%", "Muvaffaqiyatli moliyalashtirish")}
      </div>
      <div class="grid grid-2 mt-3">
        <div class="card"><h3>Oylik investitsiyalar (so'nggi 12 oy)</h3>${columnChart(a.byMonth, { value: (m) => m.amount, label: (m) => monthLabel(m.key), tip: (m) => `${m.key}: ${short(m.amount)} · ${m.count} ta` })}</div>
        <div class="card"><h3>Loyihalar holati bo'yicha</h3>${barList(Object.entries(a.byStatus).map(([k, v]) => ({ name: STATUSES[k].label, value: v })), { format: (v) => `${v} ta` })}</div>
        <div class="card"><h3>Hududlar bo'yicha yig'ilgan mablag'</h3>${barList(a.byRegion, { value: (x) => x.raised })}</div>
        <div class="card"><h3>Mahsulot turlari bo'yicha</h3>${barList(a.byCrop, { value: (x) => x.raised, label: (x) => `${cropIcon(x.name)} ${x.name}` })}</div>
      </div>
      <div class="card mt-3"><div class="row between"><h3 class="mb-0">Faol loyihalar — moliyalashtirish holati</h3><a href="#/admin/projects" class="small">Barchasi →</a></div>
        <div class="mt-2">${barList(data.projects.filter((p) => p.status === "funding"), { value: (p) => p.percent, label: (p) => p.title, format: (v) => `${v}%` })}</div></div>
      <div class="card mt-3"><h3>So'nggi faoliyat</h3>${logTable(data.logs.slice(0, 8))}</div>`;
  },

  // --- Tekshiruv ----------------------------------------------------------
  review(el) {
    const list = data.projects.filter((p) => p.status === "pending");
    el.innerHTML = `<h2>Loyihalarni tekshirish</h2><p class="muted">Fermer → Loyiha yuboradi → Administrator tekshiradi → Verifikatsiya → Loyiha e'lon qilinadi</p>
      ${list.length ? list.map((p) => `<div class="card mb-2">
        <div class="row between"><div><h3 class="mb-0">${cropIcon(p.crop)} ${esc(p.title)}</h3><div class="small muted">${esc(userName(p.farmerId))} · ${esc(p.region)} · yuborilgan ${dateTime(p.submittedAt || p.createdAt)}</div></div>${statusBadge(p.status)}</div>
        <dl class="kv mt-2" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
          <div><dt>Kerakli mablag'</dt><dd>${money(p.goal)}</dd></div><div><dt>Umumiy qiymat</dt><dd>${money(p.totalCost)}</dd></div>
          <div><dt>Kutilayotgan daromad</dt><dd>${money(p.expectedRevenue)}</dd></div><div><dt>Investor ulushi</dt><dd>${p.investorShare}% (${p.expectedReturn}%)</dd></div>
          <div><dt>Muddat</dt><dd>${p.durationMonths} oy</dd></div><div><dt>Moliyalashtirish muddati</dt><dd>${date(p.fundingDeadline)}</dd></div>
        </dl>
        <div class="grid grid-2 mt-2 small">
          <div><b>Garov:</b> ${esc(p.collateral) || '<span style="color:var(--red)">ko\'rsatilmagan</span>'}</div>
          <div><b>Sug'urta:</b> ${esc(p.insurance) || '<span style="color:var(--red)">ko\'rsatilmagan</span>'}</div>
          <div><b>Kafolat:</b> ${esc(p.guarantee) || "—"}</div>
          <div><b>Hujjatlar:</b> ${esc(p.documents) || "—"}</div>
        </div>
        <label class="field mt-2">Izoh (fermerga ko'rinadi)<textarea data-note="${p.id}" style="min-height:60px">${esc(p.adminNote)}</textarea></label>
        <div class="row mt-2">
          <button class="btn" data-approve="${p.id}">✅ Tasdiqlash va e'lon qilish</button>
          <button class="btn btn-danger" data-reject="${p.id}">✕ Rad etish</button>
          <a class="btn btn-outline" href="#/project/${p.id}" target="_blank">To'liq ko'rish</a>
          <button class="btn btn-ghost" data-edit="${p.id}">✏️ Tahrirlash</button>
        </div></div>`).join("") : `<div class="card empty"><div class="ico">✅</div><p>Tekshiruvni kutayotgan loyihalar yo'q.</p></div>`}`;
    const note = (id) => $(`[data-note="${id}"]`, el).value;
    $$("[data-approve]", el).forEach((b) => (b.onclick = () => run(b, () => api("reviewProject", { id: b.dataset.approve, decision: "approve", note: note(b.dataset.approve) }), "Loyiha tasdiqlandi va e'lon qilindi")));
    $$("[data-reject]", el).forEach((b) => (b.onclick = () => {
      if (!note(b.dataset.reject).trim()) return toast("Rad etish sababini izohda yozing", "err");
      run(b, () => api("reviewProject", { id: b.dataset.reject, decision: "reject", note: note(b.dataset.reject) }), "Loyiha rad etildi");
    }));
    $$("[data-edit]", el).forEach((b) => (b.onclick = () => editProject(b.dataset.edit)));
  },

  // --- Loyihalar ----------------------------------------------------------
  projects(el) {
    el.innerHTML = `<div class="row between mb-2"><h2 class="mb-0">Loyihalar</h2><div class="row" data-actions><button class="btn" data-new>+ Yangi loyiha</button></div></div>
      <div class="toolbar"><input type="search" placeholder="Qidirish…" data-q /><select data-status><option value="">Barcha holatlar</option>${Object.entries(STATUSES).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("")}</select></div>
      <div class="table-wrap"><table class="data"><thead><tr><th>Loyiha</th><th>Fermer</th><th>Holat</th><th class="num">Kerakli</th><th class="num">Yig'ilgan</th><th class="num">%</th><th>Muddat</th><th></th></tr></thead><tbody data-rows></tbody></table></div>`;
    $("[data-actions]", el).prepend(csvButton("loyihalar", data.projects, [
      { label: "ID", get: (p) => p.id }, { label: "Nomi", get: (p) => p.title }, { label: "Mahsulot", get: (p) => p.crop }, { label: "Hudud", get: (p) => p.region },
      { label: "Fermer", get: (p) => userName(p.farmerId) }, { label: "Holat", get: (p) => STATUSES[p.status]?.label }, { label: "Umumiy qiymat", get: (p) => p.totalCost },
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
        <td><b>${cropIcon(p.crop)} ${esc(p.title)}</b>${p.featured ? ' <span title="Bosh sahifada">⭐</span>' : ""}<div class="small muted">${esc(p.crop)} · ${esc(p.region)}</div></td>
        <td>${esc(userName(p.farmerId))}</td><td>${statusBadge(p.status)}</td>
        <td class="num">${num(p.goal)}</td><td class="num">${num(p.raised)}</td><td class="num">${p.percent}%</td><td class="nowrap">${date(p.fundingDeadline)}</td>
        <td class="nowrap"><button class="btn btn-sm" data-manage="${p.id}">Boshqarish</button></td></tr>`).join("") || `<tr><td colspan="8" class="empty">Loyiha topilmadi</td></tr>`;
      $$("[data-manage]", el).forEach((b) => (b.onclick = () => manageProject(b.dataset.manage)));
    };
    $("[data-q]", el).oninput = draw;
    $("[data-status]", el).onchange = draw;
    $("[data-new]", el).onclick = () => editProject(null);
    draw();
  },

  // --- Foydalanuvchilar ---------------------------------------------------
  users(el) {
    el.innerHTML = `<div class="row between mb-2"><h2 class="mb-0">Foydalanuvchilar</h2><div class="row" data-actions><button class="btn" data-new>+ Foydalanuvchi qo'shish</button></div></div>
      <div class="toolbar"><input type="search" placeholder="Ism, email, telefon…" data-q /><select data-role><option value="">Barcha rollar</option><option value="investor">Investorlar</option><option value="farmer">Fermerlar</option><option value="admin">Administratorlar</option></select></div>
      <div class="table-wrap"><table class="data"><thead><tr><th>Foydalanuvchi</th><th>Rol</th><th>Telefon</th><th class="num">Balans</th><th>Faoliyat</th><th>Holat</th><th></th></tr></thead><tbody data-rows></tbody></table></div>`;
    $("[data-actions]", el).prepend(csvButton("foydalanuvchilar", data.users, [
      { label: "ID", get: (u) => u.id }, { label: "Ism", get: (u) => u.name }, { label: "Email", get: (u) => u.email }, { label: "Telefon", get: (u) => u.phone },
      { label: "Rol", get: (u) => u.role }, { label: "Balans", get: (u) => u.balance }, { label: "Xo'jalik", get: (u) => u.farm?.name || "" }, { label: "Hudud", get: (u) => u.farm?.region || "" },
      { label: "Reyting", get: (u) => u.rating ?? "" }, { label: "Bloklangan", get: (u) => (u.blocked ? "ha" : "yo'q") }, { label: "Ro'yxatdan o'tgan", get: (u) => u.createdAt },
    ]));
    const roleName = { investor: "Investor", farmer: "Fermer", admin: "Admin" };
    const draw = () => {
      const q = $("[data-q]", el).value.toLowerCase();
      const r = $("[data-role]", el).value;
      const list = data.users.filter((u) => (!r || u.role === r) && (!q || `${u.name} ${u.email} ${u.phone} ${u.farm?.name || ""}`.toLowerCase().includes(q)));
      $("[data-rows]", el).innerHTML = list.map((u) => {
        const activity = u.role === "farmer" ? `${data.projects.filter((p) => p.farmerId === u.id).length} loyiha` : u.role === "investor" ? `${data.investments.filter((i) => i.investorId === u.id).length} investitsiya` : "—";
        return `<tr><td><b>${esc(u.name)}</b><div class="small muted">${esc(u.email)}${u.farm?.name ? " · " + esc(u.farm.name) : ""}</div></td>
          <td>${roleName[u.role]}</td><td class="nowrap">${esc(u.phone) || "—"}</td><td class="num">${num(u.balance)}</td><td>${activity}</td>
          <td>${u.blocked ? '<span class="badge tone-bad">Bloklangan</span>' : u.verified ? '<span class="badge tone-good">Tasdiqlangan</span>' : '<span class="badge tone-warn">Tasdiqlanmagan</span>'}</td>
          <td><button class="btn btn-sm btn-outline" data-edit="${u.id}">Tahrirlash</button></td></tr>`;
      }).join("") || `<tr><td colspan="7" class="empty">Topilmadi</td></tr>`;
      $$("[data-edit]", el).forEach((b) => (b.onclick = () => editUser(b.dataset.edit)));
    };
    $("[data-q]", el).oninput = draw;
    $("[data-role]", el).onchange = draw;
    $("[data-new]", el).onclick = newUser;
    draw();
  },

  // --- Investitsiyalar ----------------------------------------------------
  investments(el) {
    const list = [...data.investments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const label = { active: ["Faol", "info"], paid: ["To'langan", "good"], refunded: ["Qaytarilgan", "bad"] };
    el.innerHTML = `<div class="row between mb-2"><h2 class="mb-0">Investitsiyalar</h2><div data-actions></div></div>
      <div class="toolbar"><input type="search" placeholder="Investor yoki loyiha…" data-q /><select data-st><option value="">Barchasi</option><option value="active">Faol</option><option value="paid">To'langan</option><option value="refunded">Qaytarilgan</option></select></div>
      <div class="table-wrap"><table class="data"><thead><tr><th>Sana</th><th>Investor</th><th>Loyiha</th><th class="num">Summa</th><th class="num">To'lov</th><th>Holat</th></tr></thead><tbody data-rows></tbody></table></div>`;
    $("[data-actions]", el).append(csvButton("investitsiyalar", list, [
      { label: "Sana", get: (i) => i.createdAt }, { label: "Investor", get: (i) => userName(i.investorId) }, { label: "Loyiha", get: (i) => projTitle(i.projectId) },
      { label: "Summa", get: (i) => i.amount }, { label: "To'lov", get: (i) => i.payout || 0 }, { label: "Holat", get: (i) => i.status },
    ]));
    const draw = () => {
      const q = $("[data-q]", el).value.toLowerCase();
      const st = $("[data-st]", el).value;
      $("[data-rows]", el).innerHTML = list.filter((i) => (!st || i.status === st) && (!q || `${userName(i.investorId)} ${projTitle(i.projectId)}`.toLowerCase().includes(q))).map((i) => `<tr>
        <td class="nowrap">${dateTime(i.createdAt)}</td><td>${esc(userName(i.investorId))}</td><td><a href="#/project/${i.projectId}">${esc(projTitle(i.projectId))}</a></td>
        <td class="num">${num(i.amount)}</td><td class="num">${i.payout ? num(i.payout) : "—"}</td><td><span class="badge tone-${label[i.status][1]}">${label[i.status][0]}</span></td></tr>`).join("") || `<tr><td colspan="6" class="empty">Topilmadi</td></tr>`;
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
    el.innerHTML = `<h2>Monitoring</h2>
      <div class="toolbar"><select data-sel>${eligible.map((p) => `<option value="${p.id}" ${p === sel ? "selected" : ""}>${esc(p.title)} — ${esc(STATUSES[p.status].label)}</option>`).join("")}</select></div>
      ${sel ? `<div class="card"><h3>Monitoring yozuvi qo'shish (Agricrowd.uz nomidan)</h3>
        <form class="form" id="adm-upd"><div class="form-grid">
          <label class="field">Sarlavha<input name="title" required placeholder="Masalan: Joyiga chiqib tekshirildi" /></label>
          <label class="field">Bosqich<select name="stage"><option>Tekshiruv</option><option>Ekish</option><option>Parvarish</option><option>Hosil yig'ish</option><option>Sotish</option><option>Yakun</option></select></label>
          <label class="field full">Loyiha holati<textarea name="text"></textarea></label>
          <label class="field">Foto<input type="file" accept="image/*" multiple data-photos /></label>
          <label class="field">Video havolasi<input name="video" type="url" /></label>
          <div class="img-thumbs full" data-thumbs></div></div>
          <div class="error-box" data-error hidden></div><div><button class="btn">Qo'shish</button></div></form></div>
        <div class="card mt-2"><h3>Monitoring lentasi</h3>${timeline(full.updates, { canDelete: true })}</div>` : `<div class="card empty">Monitoring uchun loyiha yo'q</div>`}`;
    $("[data-sel]", el)?.addEventListener("change", (e) => go(`/admin/monitoring/${e.target.value}`));
    $$("[data-del-update]", el).forEach((b) => (b.onclick = async () => { if (await confirmDlg("Monitoring yozuvi o'chirilsinmi?", { danger: true, ok: "O'chirish" })) run(b, () => api("deleteUpdate", { id: b.dataset.delUpdate }), "O'chirildi"); }));
    const form = $("#adm-upd", el);
    if (form) {
      let photos = [];
      $("[data-photos]", form).onchange = async (e) => {
        photos = await Promise.all([...e.target.files].slice(0, 6).map((f) => compressImage(f, 1024, 0.65)));
        $("[data-thumbs]", form).innerHTML = photos.map((s) => `<img src="${s}" alt="" />`).join("");
      };
      form.onsubmit = (e) => { e.preventDefault(); run(e.submitter, () => api("addUpdate", { projectId: sel.id, ...formData(form), images: photos }), "Monitoring qo'shildi"); };
    }
  },

  // --- Moliya -------------------------------------------------------------
  finance(el) {
    const t = data.transactions;
    const sum = (type) => t.filter((x) => x.type === type).reduce((s, x) => s + x.amount, 0);
    const TX = { deposit: "Hisob to'ldirish", withdraw: "Yechib olish", invest: "Investitsiya", refund: "Qaytarish", payout: "Daromad to'lovi", disbursement: "Fermerga ajratildi", adjust: "Tuzatish", commission: "Komissiya" };
    el.innerHTML = `<div class="row between mb-2"><h2 class="mb-0">Moliya</h2><div data-actions></div></div>
      <div class="kpis">${kpi(short(sum("deposit")), "Kiritilgan (to'ldirish)")}${kpi(short(sum("invest")), "Investitsiyalar")}${kpi(short(sum("disbursement")), "Fermerlarga ajratilgan")}${kpi(short(sum("payout")), "Investorlarga to'langan")}${kpi(short(sum("refund")), "Qaytarilgan")}${kpi(short(sum("commission")), "Platforma komissiyasi", true)}</div>
      <div class="toolbar mt-3"><select data-type><option value="">Barcha operatsiyalar</option>${Object.entries(TX).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
      <div class="table-wrap"><table class="data"><thead><tr><th>Sana</th><th>Turi</th><th>Foydalanuvchi</th><th>Loyiha</th><th>Izoh</th><th class="num">Summa</th></tr></thead><tbody data-rows></tbody></table></div>`;
    $("[data-actions]", el).append(csvButton("operatsiyalar", t, [
      { label: "Sana", get: (x) => x.createdAt }, { label: "Turi", get: (x) => TX[x.type] || x.type }, { label: "Foydalanuvchi", get: (x) => userName(x.userId) },
      { label: "Loyiha", get: (x) => (x.projectId ? projTitle(x.projectId) : "") }, { label: "Izoh", get: (x) => x.note }, { label: "Summa", get: (x) => x.amount },
    ]));
    const draw = () => {
      const ty = $("[data-type]", el).value;
      $("[data-rows]", el).innerHTML = t.filter((x) => !ty || x.type === ty).slice(0, 500).map((x) => `<tr><td class="nowrap">${dateTime(x.createdAt)}</td><td>${TX[x.type] || x.type}</td><td>${esc(userName(x.userId))}</td><td>${x.projectId ? esc(projTitle(x.projectId)) : "—"}</td><td class="small">${esc(x.note)}</td><td class="num">${num(x.amount)}</td></tr>`).join("") || `<tr><td colspan="6" class="empty">Operatsiyalar yo'q</td></tr>`;
    };
    $("[data-type]", el).onchange = draw;
    draw();
  },

  // --- Sozlamalar ---------------------------------------------------------
  settings(el) {
    const s = data.settings;
    el.innerHTML = `<h2>Sozlamalar</h2><div class="card"><form class="form" id="set-form">
      <h3>Moliyaviy shartlar</h3><div class="form-grid">
        <label class="field">Platforma komissiyasi (investorlar ulushidan, %)<input name="commission" type="number" min="0" max="50" step="0.1" value="${esc(s.commission)}" /></label>
        <label class="field">Minimal investitsiya (so'm)<input name="minInvestment" type="number" min="1000" step="any" value="${esc(s.minInvestment)}" /></label></div>
      <div class="form-section"><h3>Bosh sahifa matni</h3><div class="form-grid">
        <label class="field full">Sarlavha<input name="heroTitle" value="${esc(s.heroTitle)}" /></label>
        <label class="field full">Tavsif<textarea name="heroText">${esc(s.heroText)}</textarea></label></div></div>
      <div class="form-section"><h3>Aloqa</h3><div class="form-grid">
        <label class="field">Telefon<input name="contactPhone" value="${esc(s.contactPhone)}" /></label>
        <label class="field">Email<input name="contactEmail" value="${esc(s.contactEmail)}" /></label></div></div>
      <div class="form-section"><h3>Ma'lumotnomalar</h3><div class="form-grid">
        <label class="field">Hududlar <small>(har biri yangi qatorda)</small><textarea name="regions" style="min-height:220px">${esc(s.regions.join("\n"))}</textarea></label>
        <label class="field">Sabzavot mahsulotlari <small>(har biri yangi qatorda)</small><textarea name="crops" style="min-height:220px">${esc(s.crops.join("\n"))}</textarea></label></div></div>
      <div class="error-box" data-error hidden></div><div><button class="btn btn-lg">Saqlash</button></div></form></div>`;
    const form = $("#set-form", el);
    form.onsubmit = (e) => { e.preventDefault(); run(e.submitter, () => api("updateSettings", formData(form)), "Sozlamalar saqlandi"); };
  },

  // --- Jurnal -------------------------------------------------------------
  logs(el) {
    el.innerHTML = `<div class="row between mb-2"><h2 class="mb-0">Faoliyat jurnali</h2><div data-actions></div></div><div class="table-wrap">${logTable(data.logs)}</div>`;
    $("[data-actions]", el).append(csvButton("jurnal", data.logs, [{ label: "Sana", get: (l) => l.createdAt }, { label: "Foydalanuvchi", get: (l) => userName(l.userId) }, { label: "Amal", get: (l) => l.action }, { label: "Tafsilot", get: (l) => l.details }]));
  },
};

const LOG_LABELS = {
  register: "Ro'yxatdan o'tdi", login: "Tizimga kirdi", update_profile: "Profilni yangiladi", change_password: "Parolni o'zgartirdi", deposit: "Hisobni to'ldirdi",
  withdraw: "Mablag' yechdi", invest: "Investitsiya kiritdi", create_project: "Loyiha yaratdi", update_project: "Loyihani tahrirladi", add_update: "Monitoring qo'shdi",
  review_project: "Loyihani tekshirdi", admin_update_project: "Loyihani tahrirladi (admin)", set_status: "Holatni o'zgartirdi", distribute: "Daromadni taqsimladi",
  delete_project: "Loyihani o'chirdi", delete_update: "Monitoringni o'chirdi", admin_create_user: "Foydalanuvchi qo'shdi", admin_update_user: "Foydalanuvchini tahrirladi",
  delete_user: "Foydalanuvchini o'chirdi", update_settings: "Sozlamalarni o'zgartirdi", project_funded: "Loyiha 100% moliyalashtirildi", project_refunded: "Mablag' qaytarildi",
};
function logTable(logs) {
  if (!logs.length) return `<p class="muted">Yozuvlar yo'q</p>`;
  return `<table class="data"><thead><tr><th>Sana</th><th>Foydalanuvchi</th><th>Amal</th><th>Tafsilot</th></tr></thead><tbody>${logs.map((l) => `<tr><td class="nowrap">${dateTime(l.createdAt)}</td><td>${esc(userName(l.userId))}</td><td>${LOG_LABELS[l.action] || esc(l.action)}</td><td class="small">${esc(l.details)}</td></tr>`).join("")}</tbody></table>`;
}

// ---------------------------------------------------------------------------
// Loyihani boshqarish oynasi

function manageProject(id) {
  const p = data.projects.find((x) => x.id === id);
  const invs = data.investments.filter((i) => i.projectId === id);
  const next = { pending: [["rejected", "Rad etish"]], rejected: [["pending", "Qayta tekshiruvga"]], funding: [["refunded", "Bekor qilish va mablag'ni qaytarish"]], funded: [["in_progress", "Amalga oshirish boshlandi"]], in_progress: [["harvest", "Hosil yig'ish / sotish bosqichi"]] }[p.status] || [];
  const canDistribute = ["funded", "in_progress", "harvest"].includes(p.status);
  const commission = data.settings.commission;
  modal({
    title: p.title,
    wide: true,
    body: `<div class="row between">${statusBadge(p.status)}<span class="small muted">Fermer: <b>${esc(userName(p.farmerId))}</b> · ${stars(data.users.find((u) => u.id === p.farmerId)?.rating)}</span></div>
      <div class="kpis mt-2">${kpi(money(p.goal), "Kerakli mablag'")}${kpi(money(p.raised), `Yig'ilgan (${p.percent}%)`)}${kpi(p.investors, "Investorlar")}${kpi(money(p.expectedRevenue), "Kutilayotgan daromad")}</div>
      <div class="row mt-3">
        <button class="btn btn-outline" data-edit>✏️ Ma'lumotlarni tahrirlash</button>
        <a class="btn btn-outline" href="#/project/${p.id}" data-close>👁 Sahifani ko'rish</a>
        ${MONITOR_STATUSES.includes(p.status) || p.status === "completed" ? `<a class="btn btn-outline" href="#/admin/monitoring/${p.id}" data-close>📷 Monitoring</a>` : ""}
        ${p.status === "pending" ? `<button class="btn" data-approve>✅ Tasdiqlash</button>` : ""}
        ${next.map(([s, l]) => `<button class="btn ${s === "refunded" || s === "rejected" ? "btn-danger" : ""}" data-status="${s}">${l}</button>`).join("")}
        ${!invs.some((i) => i.status === "active") ? `<button class="btn btn-ghost" data-delete style="color:var(--red)">🗑 O'chirish</button>` : ""}
      </div>
      ${canDistribute ? `<div class="card-flat mt-3"><h3>💰 Hosil realizatsiyasi va daromadni taqsimlash</h3>
        <p class="small muted">Hosil → Sotish → Daromad → Investorlar va fermer o'rtasida taqsimlash. Investorlar ulushi: ${p.investorShare}%, platforma komissiyasi: investorlar ulushidan ${commission}%.</p>
        <form class="form" id="dist-form"><div class="form-grid">
          <label class="field">Hosil sotuvidan tushgan haqiqiy daromad (so'm)<input name="actualRevenue" type="number" min="1" step="any" required value="${p.expectedRevenue}" /></label>
          <label class="field">Izoh<input name="note" placeholder="Masalan: 92 tonna, o'rtacha 3 300 so'm/kg" /></label></div>
          <div class="info-box" data-dist-preview></div>
          <div><button class="btn">Daromadni taqsimlash va loyihani yakunlash</button></div></form></div>` : ""}
      ${p.distribution ? `<div class="info-box mt-3">Yakuniy hisob: tushum <b>${money(p.actualRevenue)}</b> · investorlarga <b>${money(p.distribution.toInvestors)}</b> · komissiya <b>${money(p.distribution.commission)}</b> · fermer <b>${money(p.distribution.farmerPart)}</b></div>` : ""}
      <h3 class="mt-3">Investorlar (${invs.length})</h3>
      ${invs.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Investor</th><th>Sana</th><th class="num">Summa</th><th class="num">Ulush</th><th class="num">To'lov</th><th>Holat</th></tr></thead><tbody>${invs.map((i) => `<tr><td>${esc(userName(i.investorId))}</td><td>${date(i.createdAt)}</td><td class="num">${num(i.amount)}</td><td class="num">${((i.amount / p.goal) * 100).toFixed(2)}%</td><td class="num">${i.payout ? num(i.payout) : "—"}</td><td>${i.status}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">Hali investitsiya yo'q</p>`}`,
    onMount(m, close) {
      $$("[data-close]", m).forEach((a) => a.addEventListener("click", close));
      $("[data-edit]", m).onclick = () => { close(); editProject(id); };
      $("[data-approve]", m)?.addEventListener("click", (e) => { close(); run(e.currentTarget, () => api("reviewProject", { id, decision: "approve" }), "Loyiha e'lon qilindi"); });
      $$("[data-status]", m).forEach((b) => (b.onclick = async () => {
        const st = b.dataset.status;
        const ok = await confirmDlg(st === "refunded" ? "Loyiha bekor qilinadi va barcha investorlar mablag'i hisoblariga qaytariladi. Davom etasizmi?" : `Holat «${STATUSES[st].label}» ga o'zgartirilsinmi?`, { danger: st === "refunded" });
        if (ok) { close(); run(null, () => api("setProjectStatus", { id, status: st }), "Holat o'zgartirildi"); }
      }));
      $("[data-delete]", m)?.addEventListener("click", async () => {
        if (await confirmDlg("Loyiha butunlay o'chiriladi. Davom etasizmi?", { danger: true, ok: "O'chirish" })) { close(); run(null, () => api("deleteProject", { id }), "Loyiha o'chirildi"); }
      });
      const df = $("#dist-form", m);
      if (df) {
        const prev = () => {
          const r = Number(df.actualRevenue.value) || 0;
          const pool = r * (p.investorShare / 100);
          const com = pool * (commission / 100);
          $("[data-dist-preview]", m).innerHTML = `Investorlar ulushi: <b>${money(pool)}</b> → komissiya <b>${money(com)}</b>, investorlarga to'lanadi <b>${money(pool - com)}</b> (kiritilgan ${money(p.raised)} ga nisbatan ${p.raised ? (((pool - com) / p.raised - 1) * 100).toFixed(1) : 0}%) · fermer ulushi <b>${money(r - pool)}</b>`;
        };
        df.oninput = prev;
        prev();
        df.onsubmit = async (e) => {
          e.preventDefault();
          if (!(await confirmDlg("Daromad investorlar hisoblariga o'tkaziladi va loyiha yakunlanadi. Bu amalni ortga qaytarib bo'lmaydi."))) return;
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
  if (id) p = (await api("getProject", { id }));
  modal({
    title: id ? "Loyihani tahrirlash" : "Yangi loyiha (fermer nomidan)",
    wide: true,
    body: `${projectFormHtml(p, data.settings, { farmers, admin: true })}
      ${!id ? `<label class="check mt-2"><input type="checkbox" id="publish-now" checked /> Darhol e'lon qilish (tekshiruvsiz)</label>` : ""}
      <div class="row mt-3"><button class="btn btn-lg" data-save>Saqlash</button></div>`,
    onMount(m, close) {
      const form = $("#project-form", m);
      bindProjectForm(form);
      $("[data-save]", m).onclick = (e) => busy(e.currentTarget, async () => {
        try {
          const d = readProjectForm(form);
          if (!d.farmerId) throw new Error("Fermerni tanlang");
          if (id) await api("adminUpdateProject", { id, ...d });
          else await api("createProject", { ...d, publish: $("#publish-now", m).checked });
          close();
          toast("Loyiha saqlandi");
          await refreshBoot().catch(() => {});
          reload();
        } catch (err) { showFormError(form, err.message); }
      });
    },
  });
}

function userFormHtml(u = {}, isNew) {
  const f = u.farm || {};
  return `<form class="form" id="user-form"><div class="form-grid">
    <label class="field">Ism-familiya<input name="name" value="${esc(u.name)}" required /></label>
    <label class="field">Email<input name="email" type="email" value="${esc(u.email)}" ${isNew ? "required" : "disabled"} /></label>
    <label class="field">Telefon<input name="phone" value="${esc(u.phone)}" /></label>
    <label class="field">Rol<select name="role" ${u.id === state.user.id ? "disabled" : ""}>${[["investor", "Investor"], ["farmer", "Fermer / dehqon"], ["admin", "Administrator"]].map(([k, l]) => `<option value="${k}" ${u.role === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <label class="field">${isNew ? "Parol" : "Yangi parol"} <small>${isNew ? "(kamida 6 belgi)" : "(bo'sh qoldirilsa o'zgarmaydi)"}</small><input name="password" type="text" ${isNew ? "required" : ""} autocomplete="off" /></label>
    ${!isNew ? `<label class="field">Reyting (0–5, fermerlar uchun)<input name="rating" type="number" min="0" max="5" step="0.1" value="${esc(u.rating ?? "")}" /></label>
    <label class="field">Balansni tuzatish (so'm, +/−) <small>Joriy: ${money(u.balance)}</small><input name="balanceAdjust" type="number" step="any" /></label>
    <label class="field">Tuzatish izohi<input name="note" /></label>
    <label class="check"><input type="checkbox" name="verified" ${u.verified ? "checked" : ""} /> Tasdiqlangan (verifikatsiya)</label>
    <label class="check"><input type="checkbox" name="blocked" ${u.blocked ? "checked" : ""} ${u.id === state.user.id ? "disabled" : ""} /> Bloklangan</label>` : ""}
    </div>
    ${u.role === "farmer" ? `<div class="form-section"><h3>Xo'jalik</h3><div class="form-grid">
      <label class="field full">Xo'jalik nomi<input name="farm_name" value="${esc(f.name)}" /></label>
      <label class="field">Turi<input name="farm_type" value="${esc(f.type)}" /></label>
      <label class="field">Viloyat<input name="farm_region" value="${esc(f.region)}" /></label>
      <label class="field">Tuman<input name="farm_district" value="${esc(f.district)}" /></label>
      <label class="field">Maydon (ga)<input name="farm_area" type="number" step="0.1" value="${esc(f.area)}" /></label>
      <label class="field">Tajriba (yil)<input name="farm_experience" type="number" value="${esc(f.experience)}" /></label>
      <label class="field">STIR<input name="farm_inn" value="${esc(f.inn)}" /></label>
      <label class="field full">Xo'jalik haqida<textarea name="farm_about">${esc(f.about)}</textarea></label></div></div>` : ""}
    <div class="error-box" data-error hidden></div>
    <div class="row between"><button class="btn btn-lg">Saqlash</button>${!isNew && u.id !== state.user.id ? `<button type="button" class="btn btn-ghost" style="color:var(--red)" data-del>🗑 O'chirish</button>` : ""}</div></form>`;
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
          try { await api("adminUpdateUser", payload); close(); toast("Saqlandi"); reload(); }
          catch (err) { showFormError(form, err.message); }
        });
      };
      $("[data-del]", m)?.addEventListener("click", async () => {
        if (await confirmDlg(`«${esc(u.name)}» o'chirilsinmi?`, { danger: true, ok: "O'chirish" })) { close(); run(null, () => api("deleteUser", { id }), "Foydalanuvchi o'chirildi"); }
      });
    },
  });
}

function newUser() {
  modal({
    title: "Yangi foydalanuvchi", body: userFormHtml({ role: "investor" }, true),
    onMount(m, close) {
      const form = $("#user-form", m);
      form.onsubmit = async (e) => {
        e.preventDefault();
        await busy(e.submitter, async () => {
          try { await api("adminCreateUser", formData(form)); close(); toast("Foydalanuvchi qo'shildi"); reload(); }
          catch (err) { showFormError(form, err.message); }
        });
      };
    },
  });
}
