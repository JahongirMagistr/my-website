// Investor va fermer shaxsiy kabinetlari: investitsiyalar, loyihalar, shartnomalar, hamyon, monitoring, profil
import { api, uploadFile, openFile } from "./store.js";
import { MONITOR_STATUSES } from "./core.js";
import { t, tv, tc, formatDate } from "./i18n.js";
import {
  $, $$, esc, te, num, money, date, dateTime, statusBadge, contractBadge, paymentBadge, withdrawalBadge, cropIcon, progress, stars,
  toast, modal, confirmDlg, formData, busy, timeline, statusTrack, showFormError, fileSize,
} from "./ui.js";
import { projectFormHtml, bindProjectForm, readProjectForm, uploadImages } from "./forms.js";
import { state, app, settings, go, requireRole, reload } from "./state.js";

export async function renderCabinet(tab, id) {
  if (!requireRole(["investor", "farmer", "admin"])) return;
  if (state.user.role === "admin") return go("/admin");
  if (state.user.role === "investor") return investorCabinet(tab || "overview", id);
  return farmerCabinet(tab || "overview", id);
}

function dashShell(items, active, content) {
  const u = state.user;
  return `<div class="container dash">
    <nav class="dash-side">
      <div class="who"><span class="small muted">${te(u.role === "investor" ? "Investor" : "Fermer / dehqon")}</span><b>${esc(u.name)}</b><span class="small muted">${esc(u.email)}</span></div>
      ${items.map(([key, label, count]) => `<a href="#/cabinet/${key}" class="${key === active ? "active" : ""}">${te(label)}${count ? `<span class="count">${count}</span>` : ""}</a>`).join("")}
      <a href="#/notifications">🔔 ${te("Bildirishnomalar")}${state.unread ? `<span class="count">${state.unread}</span>` : ""}</a>
    </nav>
    <div>${content}</div>
  </div>`;
}

export const kpi = (v, l, accent) => `<div class="kpi ${accent ? "accent" : ""}"><div class="v">${esc(v)}</div><div class="l">${te(l)}</div></div>`;
export const TX_LABELS = { deposit: "Hisob to'ldirish", withdraw: "Yechib olish", invest: "Investitsiya", refund: "Qaytarildi", payout: "Daromad ulushi", disbursement: "Loyiha mablag'i ajratildi", adjust: "Tuzatish", commission: "Komissiya" };
const TX_SIGN = { deposit: 1, refund: 1, payout: 1, disbursement: 1, withdraw: -1, invest: -1 };

function txTable(list) {
  if (!list.length) return `<div class="card empty"><div class="ico">🧾</div><p>${te("Operatsiyalar yo'q")}</p></div>`;
  return `<div class="table-wrap"><table class="data"><thead><tr><th>${te("Sana")}</th><th>${te("Turi")}</th><th>${te("Izoh")}</th><th class="num">${te("Summa")}</th></tr></thead><tbody>
    ${list.map((x) => { const sign = TX_SIGN[x.type] ?? Math.sign(x.amount); return `<tr><td class="nowrap">${dateTime(x.createdAt)}</td><td>${te(TX_LABELS[x.type] || x.type)}</td><td>${esc(t(x.note))}</td><td class="num" style="color:${sign > 0 ? "var(--green-700)" : "var(--red)"};font-weight:700">${sign > 0 ? "+" : "−"}${num(Math.abs(x.amount))}</td></tr>`; }).join("")}
  </tbody></table></div>`;
}

// ---------------------------------------------------------------------------
// Investor kabineti

async function investorCabinet(tab) {
  const d = await api("investorDashboard");
  state.user = d.user;
  const s = d.summary;
  const items = [["overview", "📊 Umumiy ko'rinish"], ["investments", "💼 Investitsiyalarim", d.investments.length], ["contracts", "📝 Shartnomalar", d.contractsAction], ["monitoring", "📷 Monitoring"], ["wallet", "💳 Hamyon"], ["profile", "👤 Profil"]];
  let content = "";
  const invRows = (list) => list.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>${te("Loyiha")}</th><th>${te("Holati")}</th><th class="num">${te("Investitsiya")}</th><th class="num">${te("Ulush")}</th><th>${te("Moliyalashtirish")}</th><th class="num">${te("Kutilayotgan daromad")}</th><th class="num">${te("Olingan")}</th></tr></thead><tbody>
    ${list.map((i) => `<tr><td><a href="#/project/${i.projectId}"><b>${esc(tc(i.project?.title || "—"))}</b></a><div class="small muted">${date(i.createdAt)} · ${esc(tv(i.project?.region || ""))}</div></td>
      <td>${i.status === "refunded" ? `<span class="badge tone-bad">${te("Qaytarilgan")}</span>` : statusBadge(i.project?.status)}</td>
      <td class="num">${num(i.amount)}</td><td class="num">${i.sharePercent}%</td>
      <td style="min-width:150px">${i.project ? `<div class="progress"><span style="width:${i.project.percent}%"></span></div><div class="small muted">${i.project.percent}%</div>` : ""}</td>
      <td class="num">${i.status === "active" ? num(i.expectedIncome) : "—"}</td><td class="num">${i.payout ? `<b style="color:var(--green-700)">${num(i.payout)}</b>` : "—"}</td></tr>`).join("")}
    </tbody></table></div>` : `<div class="card empty"><div class="ico">🌱</div><p>${te("Hali investitsiya kiritmagansiz.")}</p><a class="btn" href="#/projects">${te("Loyiha tanlash")}</a></div>`;

  if (tab === "overview") {
    content = `<div class="row between mb-2"><h2 class="mb-0">${te("Investor kabineti")}</h2><div class="row"><button class="btn btn-sun" data-deposit>+ ${te("Hisobni to'ldirish")}</button><button class="btn btn-outline" data-withdraw>${te("Yechib olish")}</button></div></div>
      ${d.contractsAction ? `<div class="warn-box mb-2">✍️ ${te("{n} ta shartnoma imzolashingizni kutmoqda.", { n: d.contractsAction })} <a href="#/cabinet/contracts">${te("Shartnomalarga o'tish")} →</a></div>` : ""}
      <div class="kpis">${kpi(money(s.balance), "Mavjud mablag'", true)}${kpi(money(s.invested), "Faol investitsiyalar")}${kpi(money(s.expectedIncome), "Kutilayotgan daromad")}${kpi(money(s.received), "Olingan daromad")}${kpi(String(s.projects), "Loyihalar soni")}</div>
      <div class="row between mt-4 mb-2"><h3 class="mb-0">${te("So'nggi investitsiyalar")}</h3><a href="#/projects" class="btn btn-sm">+ ${te("Yangi investitsiya")}</a></div>
      ${invRows(d.investments.slice(0, 5))}`;
  } else if (tab === "investments") {
    content = `<h2>${te("Investitsiya qilingan loyihalar")}</h2>${invRows(d.investments)}`;
  } else if (tab === "contracts") {
    content = await contractsView("investor");
  } else if (tab === "monitoring") {
    const projects = [...new Map(d.investments.filter((i) => i.project).map((i) => [i.projectId, i.project])).values()];
    content = `<h2>${te("Loyiha bo'yicha monitoring")}</h2>` + (projects.length ? (await Promise.all(projects.map(async (p) => {
      const full = await api("getProject", { id: p.id });
      return `<div class="card mb-2"><div class="row between"><h3 class="mb-0"><a href="#/project/${p.id}">${esc(tc(p.title))}</a></h3>${statusBadge(p.status)}</div>${statusTrack(p.status)}<div class="mt-3">${timeline(full.updates.slice(0, 5))}</div></div>`;
    }))).join("") : `<div class="card empty"><p>${te("Monitoring ma'lumotlari investitsiya kiritilgan loyihalar bo'yicha ko'rinadi.")}</p></div>`);
  } else if (tab === "wallet") {
    content = await walletView(d.transactions, s.balance, d.investments);
  } else if (tab === "profile") {
    content = profileHtml();
  }
  app().innerHTML = dashShell(items, tab, content);
  bindCommon(tab);
}

// ---------------------------------------------------------------------------
// Fermer kabineti

async function farmerCabinet(tab, id) {
  const d = await api("farmerDashboard");
  state.user = d.user;
  farmerProjects = d.projects;
  const s = d.summary;
  const items = [["overview", "📊 Umumiy ko'rinish"], ["projects", "🌱 Yuborilgan loyihalar", d.projects.length], ["new", "➕ Yangi loyiha"], ["contracts", "📝 Shartnomalar", d.contractsAction], ["monitoring", "📷 Monitoring"], ["wallet", "💳 Hamyon"], ["profile", "👤 Shaxsiy va xo'jalik ma'lumotlari"]];
  const projRows = (list) => list.length ? `<div class="grid">${list.map((p) => `
    <div class="card-flat"><div class="row between"><div><h3 class="mb-0">${cropIcon(p.crop)} ${esc(tc(p.title))}</h3><div class="small muted">${esc(tv(p.region))} · ${te("yuborilgan")}: ${date(p.submittedAt || p.createdAt)}</div></div>${statusBadge(p.status)}</div>
      ${p.adminNote ? `<div class="${p.status === "rejected" ? "error-box" : "info-box"} mt-2 small"><b>${te("Administrator izohi")}:</b> ${esc(p.adminNote)}</div>` : ""}
      ${p.status === "pending" ? `<div class="warn-box mt-2 small">⏳ ${te("Loyiha administrator tekshiruvida. Tasdiqlangandan so'ng investorlar uchun e'lon qilinadi.")}</div>` : ""}
      ${p.status === "funded" && !p.disbursedAt ? `<div class="warn-box mt-2 small">✍️ ${te("Loyiha 100% moliyalashtirildi. Investorlar bilan shartnomalarni imzolang — shartnomalar tasdiqlangach mablag' hisobingizga ajratiladi.")} <a href="#/cabinet/contracts">${te("Shartnomalar")} →</a></div>` : ""}
      ${["funding", "funded", "in_progress", "harvest", "completed"].includes(p.status) ? `<div class="mt-2">${progress(p)}</div>${statusTrack(p.status)}` : ""}
      <div class="row mt-2">
        <a class="btn btn-sm btn-outline" href="#/project/${p.id}">${te("Ko'rish")}</a>
        ${["pending", "rejected"].includes(p.status) ? `<a class="btn btn-sm btn-outline" href="#/cabinet/edit/${p.id}">✏️ ${te("Tahrirlash")}</a>` : ""}
        ${MONITOR_STATUSES.includes(p.status) ? `<a class="btn btn-sm" href="#/cabinet/monitoring/${p.id}">📷 ${te("Monitoring qo'shish")}</a>` : ""}
        <button class="btn btn-sm btn-outline" data-docs="${p.id}">📁 ${te("Hujjatlar")} (${(p.docs || []).length})</button>
        <span class="small muted grow right">${te("{n} investor", { n: p.investors })} · ${te("{n} ta monitoring yozuvi", { n: p.updates.length })}</span>
      </div></div>`).join("")}</div>` : `<div class="card empty"><div class="ico">🌱</div><p>${te("Hali loyiha joylashtirmagansiz.")}</p><a class="btn" href="#/cabinet/new">${te("Yangi loyiha")}</a></div>`;

  let content = "";
  if (tab === "overview") {
    content = `<div class="row between mb-2"><h2 class="mb-0">${te("Fermer kabineti")}</h2><a class="btn btn-sun" href="#/cabinet/new">+ ${te("Loyiha joylashtirish")}</a></div>
      ${!state.user.farm?.name ? `<div class="warn-box mb-2">${te("Xo'jalik ma'lumotlarini to'ldiring — bu investorlar ishonchini oshiradi.")} <a href="#/cabinet/profile">${te("To'ldirish")} →</a></div>` : ""}
      ${d.contractsAction ? `<div class="warn-box mb-2">✍️ ${te("{n} ta shartnoma imzolashingizni kutmoqda.", { n: d.contractsAction })} <a href="#/cabinet/contracts">${te("Shartnomalarga o'tish")} →</a></div>` : ""}
      <div class="kpis">${kpi(money(s.balance), "Hisobdagi mablag'", true)}${kpi(String(s.projects), "Jami loyihalar")}${kpi(String(s.pending), "Tekshiruvda")}${kpi(String(s.active), "Faol loyihalar")}${kpi(money(s.raised), "Jalb qilingan mablag'")}</div>
      <h3 class="mt-4">${te("Loyihalarim")}</h3>${projRows(d.projects.slice(0, 4))}`;
  } else if (tab === "projects") {
    content = `<div class="row between mb-2"><h2 class="mb-0">${te("Yuborilgan loyihalar")}</h2><a class="btn" href="#/cabinet/new">+ ${te("Yangi loyiha")}</a></div>${projRows(d.projects)}`;
  } else if (tab === "new" || tab === "edit") {
    let p = {};
    const isEdit = tab === "edit";
    if (isEdit) p = (await api("farmerProject", { id })).project;
    content = `<h2>${te(isEdit ? "Loyihani tahrirlash" : "Yangi loyiha joylashtirish")}</h2>
      <div class="info-box mb-2">${te("Loyiha ma'lumotlarini to'liq kiriting va «Yuborish» tugmasini bosing. Loyiha avval administrator tomonidan tekshiriladi, tasdiqlangandan so'ng investorlar uchun e'lon qilinadi.")}<br/>📁 ${te("Hujjatlarni (yer ijarasi, sug'urta va h.k.) loyiha yuborilgach «Yuborilgan loyihalar» bo'limidagi «Hujjatlar» tugmasi orqali yuklaysiz.")}</div>
      <div class="card">${projectFormHtml(p, settings())}<div class="row mt-3"><button class="btn btn-lg" data-submit>📤 ${te("Yuborish")}</button><a class="btn btn-ghost" href="#/cabinet/projects">${te("Bekor qilish")}</a></div></div>`;
    app().innerHTML = dashShell(items, isEdit ? "projects" : "new", content);
    const form = $("#project-form");
    bindProjectForm(form);
    $("[data-submit]").onclick = (e) => busy(e.currentTarget, async () => {
      try {
        await api(isEdit ? "updateProject" : "createProject", { ...(isEdit ? { id } : {}), ...readProjectForm(form) });
        toast(t("Loyiha yuborildi! Administrator tekshiruvidan so'ng e'lon qilinadi"));
        go("/cabinet/projects");
      } catch (err) { showFormError(form, err.message); }
    });
    return;
  } else if (tab === "contracts") {
    content = await contractsView("farmer");
  } else if (tab === "monitoring") {
    const eligible = d.projects.filter((p) => MONITOR_STATUSES.includes(p.status));
    const sel = eligible.find((p) => p.id === id) || eligible[0];
    const withUpdates = d.projects.filter((p) => p.updates.length);
    const stages = ["Tayyorgarlik", "Ekish", "Parvarish", "Hosil yig'ish", "Sotish"];
    content = `<h2>${te("Monitoring")}</h2>
      ${sel ? `<div class="card"><h3>${te("Monitoring qo'shish — foto / video / loyiha holati")}</h3>
        <form class="form" id="upd-form">
          <div class="form-grid">
            <label class="field full">${te("Loyiha")}<select name="projectId">${eligible.map((p) => `<option value="${p.id}" ${p === sel ? "selected" : ""}>${esc(tc(p.title))}</option>`).join("")}</select></label>
            <label class="field">${te("Sarlavha")}<input name="title" required placeholder="${te("Masalan: Ko'chatlar ekildi")}" /></label>
            <label class="field">${te("Bosqich")}<select name="stage">${stages.map((x) => `<option value="${esc(x)}">${esc(tv(x))}</option>`).join("")}</select></label>
            <label class="field full">${te("Loyiha holati haqida")}<textarea name="text" placeholder="${te("Nima ishlar bajarildi, mablag' qanday sarflandi…")}"></textarea></label>
            <label class="field">${te("Foto (6 tagacha)")}<input type="file" accept="image/*" multiple data-photos /></label>
            <label class="field">${te("Video havolasi (YouTube yoki .mp4)")}<input name="video" type="url" placeholder="https://youtube.com/…" /></label>
            <div class="img-thumbs full" data-thumbs></div>
          </div>
          <div class="error-box" data-error hidden></div>
          <div><button class="btn">${te("Monitoringni qo'shish")}</button></div>
        </form></div>` : `<div class="info-box">${te("Monitoring loyiha 100% moliyalashtirilgandan so'ng qo'shiladi.")}</div>`}
      ${withUpdates.map((p) => `<div class="card mt-2"><div class="row between"><h3 class="mb-0">${esc(tc(p.title))}</h3>${statusBadge(p.status)}</div><div class="mt-2">${timeline(p.updates)}</div></div>`).join("")}`;
  } else if (tab === "wallet") {
    content = await walletView(d.transactions, s.balance, null);
  } else if (tab === "profile") {
    content = profileHtml();
  }
  app().innerHTML = dashShell(items, tab, content);
  bindCommon(tab);
  const uf = $("#upd-form");
  if (uf) bindUpdateForm(uf);
}

export function bindUpdateForm(uf, fixedProjectId) {
  let files = [];
  $("[data-photos]", uf).onchange = (e) => {
    files = [...e.target.files].slice(0, 6);
    $("[data-thumbs]", uf).innerHTML = files.map((f) => `<img src="${URL.createObjectURL(f)}" alt="" />`).join("");
  };
  uf.onsubmit = async (e) => {
    e.preventDefault();
    await busy(e.submitter, async () => {
      try {
        const images = await uploadImages(files);
        const d = formData(uf);
        await api("addUpdate", { ...d, projectId: fixedProjectId || d.projectId, images });
        toast(t("Monitoring qo'shildi — investorlar ko'ra oladi"));
        reload();
      } catch (err) { showFormError(uf, err.message); }
    });
  };
}

// Loyiha hujjatlari oynasi (fermer va admin)
export function docsModal(project, { canRemove = false, onChange } = {}) {
  let docs = project.docs || [];
  modal({
    title: t("Loyiha hujjatlari") + " — " + tc(project.title),
    wide: true,
    body: `<p class="small muted">${te("Yer ijarasi shartnomasi, xo'jalik guvohnomasi, sug'urta polisi, xaridor bilan shartnoma va boshqa hujjatlar (PDF, JPG yoki PNG). Hujjatlarni administrator, shuningdek loyihaga mablag' kiritgan investorlar ko'ra oladi.")}</p>
      <div data-doc-list></div>
      <form class="form mt-2 card-flat" id="doc-form"><div class="form-grid">
        <label class="field">${te("Hujjat nomi")}<input name="title" placeholder="${te("Masalan: Yer ijarasi shartnomasi")}" required /></label>
        <label class="field">${te("Fayl")}<input type="file" name="file" accept="application/pdf,image/jpeg,image/png" required /></label></div>
        <div class="error-box" data-error hidden></div><div><button class="btn">📤 ${te("Yuklash")}</button></div></form>`,
    onMount(m) {
      const draw = () => {
        $("[data-doc-list]", m).innerHTML = docs.length ? `<div class="doc-list">${docs.map((d) => `<div class="doc-item"><span>📄 <b>${esc(d.title || d.name)}</b> <span class="small muted">${esc(d.name)} · ${fileSize(d.size || 0)} · ${date(d.uploadedAt)}</span></span>
          <span class="row"><button class="btn btn-sm btn-outline" data-open="${esc(d.path)}" data-name="${esc(d.name)}">${te("Ochish")}</button>${canRemove ? `<button class="btn btn-sm btn-ghost" data-rm="${esc(d.path)}">🗑</button>` : ""}</span></div>`).join("")}</div>` : `<p class="muted">${te("Hozircha hujjat yuklanmagan")}</p>`;
        $$("[data-open]", m).forEach((b) => (b.onclick = () => openFile(b.dataset.open, b.dataset.name).catch((e) => toast(e.message, "err"))));
        $$("[data-rm]", m).forEach((b) => (b.onclick = async () => {
          if (!(await confirmDlg(t("Hujjat o'chirilsinmi?"), { danger: true, ok: t("O'chirish") }))) return;
          try { docs = (await api("removeProjectDoc", { projectId: project.id, path: b.dataset.rm })).docs; draw(); onChange?.(); } catch (e) { toast(e.message, "err"); }
        }));
      };
      draw();
      const form = $("#doc-form", m);
      form.onsubmit = async (e) => {
        e.preventDefault();
        const f = form.file.files[0];
        if (!f) return;
        await busy(e.submitter, async () => {
          try {
            const up = await uploadFile(f, { purpose: "project-doc", refId: project.id });
            docs = (await api("addProjectDoc", { projectId: project.id, title: form.title.value, file: { path: up.path, name: up.name, size: up.size } })).docs;
            form.reset();
            draw();
            onChange?.();
            toast(t("Hujjat yuklandi"));
          } catch (err) { showFormError(form, err.message); }
        });
      };
    },
  });
}

let farmerProjects = [];

function bindCommon(tab) {
  $$("[data-docs]").forEach((b) => (b.onclick = () => {
    const p = farmerProjects.find((x) => x.id === b.dataset.docs);
    if (p) docsModal(p, { canRemove: ["pending", "rejected"].includes(p.status), onChange: reload });
  }));
  $("[data-deposit]")?.addEventListener("click", () => depositModal());
  $$("[data-withdraw]").forEach((b) => b.addEventListener("click", withdrawModal));
  if (tab === "profile") bindProfile();
  if (tab === "contracts") bindContracts();
  if (tab === "wallet") bindWallet();
}

// ---------------------------------------------------------------------------
// Shartnomalar

async function contractsView(role) {
  const { contracts } = await api("myContracts");
  const other = role === "investor" ? "farmer" : "investor";
  const intro = `<div class="info-box mb-2"><b>${te("Shartnoma qanday imzolanadi?")}</b>
    <ol class="steps-list">
      <li>${te("Shartnoma shablonini (PDF) yuklab oling.")}</li>
      <li>${te("Chop etib, imzolang. Fermer xo'jaligi muhr ham bosadi.")}</li>
      <li>${te("Imzolangan nusxani skanerlab yoki suratga olib, shu yerga yuklang (PDF, JPG yoki PNG).")}</li>
      <li>${te("Ikkala tomon yuklagach, administrator tekshirib tasdiqlaydi.")}</li>
    </ol></div>`;
  if (!contracts.length) return `<h2>${te("Shartnomalar")}</h2>${intro}<div class="card empty"><div class="ico">📝</div><p>${te("Shartnomalar loyiha 100% moliyalashtirilgandan so'ng shu yerda paydo bo'ladi.")}</p></div>`;
  return `<h2>${te("Shartnomalar")}</h2>${intro}<div class="grid">${contracts.map((c) => {
    const mine = c[`${role}File`];
    const theirs = c[`${other}File`];
    const party = c[other];
    return `<div class="card contract-card">
      <div class="row between"><div><h3 class="mb-0">${te("Shartnoma № {number}", { number: c.number })}</h3>
        <div class="small muted">${esc(tc(c.project?.title))} · ${date(c.createdAt)}</div></div>${contractBadge(c.status)}</div>
      <dl class="kv mt-2" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
        <div><dt>${te(role === "investor" ? "Fermer" : "Investor")}</dt><dd>${esc(party?.name || "—")}${role === "investor" && party?.farm?.name ? `<div class="small muted">${esc(tc(party.farm.name))}</div>` : ""}</dd></div>
        <div><dt>${te("Investitsiya summasi")}</dt><dd>${esc(money(c.amount))}</dd></div>
        <div><dt>${te("Loyihadagi ulush")}</dt><dd>${c.sharePercent}%</dd></div>
        <div><dt>${te("Investorlar ulushi (daromaddan)")}</dt><dd>${esc(String(c.project?.investorShare ?? "—"))}%</dd></div>
      </dl>
      ${c.adminNote && c.status !== "verified" ? `<div class="error-box small mt-2">${te("Administrator izohi")}: ${esc(c.adminNote)}</div>` : ""}
      <div class="contract-steps mt-2">
        <div class="cstep"><span class="n">1</span><div><b>${te("Shablonni yuklab olish")}</b>
          ${c.template ? `<div><button class="btn btn-sm btn-outline" data-open="${esc(c.template.path)}" data-name="${esc(c.template.name)}">⬇ ${te("Shartnoma (PDF)")}</button> <button class="btn btn-sm btn-ghost" data-annex="${c.id}">🖨 ${te("Tomonlar ma'lumotlari (ilova)")}</button></div>`
            : `<div class="small muted">${te("Shartnoma shabloni hali yuklanmagan — administrator tez orada joylaydi.")}</div><button class="btn btn-sm btn-ghost" data-annex="${c.id}">🖨 ${te("Tomonlar ma'lumotlari (ilova)")}</button>`}
        </div></div>
        <div class="cstep"><span class="n">2</span><div><b>${te(role === "farmer" ? "Imzolang va muhr bosing" : "Imzolang")}</b></div></div>
        <div class="cstep"><span class="n">3</span><div><b>${te("Imzolangan nusxani yuklash")}</b>
          ${mine ? `<div class="file-line">✅ <button class="link-btn" data-open="${esc(mine.path)}" data-name="${esc(mine.name)}">${esc(mine.name)}</button> <span class="small muted">${dateTime(mine.uploadedAt)}${mine.size ? " · " + fileSize(mine.size) : ""}</span></div>` : ""}
          ${c.status !== "verified" ? `<label class="upload-btn btn btn-sm ${mine ? "btn-ghost" : ""}"><input type="file" accept="application/pdf,image/jpeg,image/png" data-upload="${c.id}" hidden />${te(mine ? "Qayta yuklash" : "📤 Fayl tanlash va yuklash")}</label>` : ""}
        </div></div>
        <div class="cstep"><span class="n">4</span><div><b>${te(role === "investor" ? "Fermer imzosi" : "Investor imzosi")}</b>
          <div class="small">${theirs ? `✅ ${te("Imzolangan")} · ${dateTime(theirs.uploadedAt)}` : `⏳ ${te("Kutilmoqda")}`}</div></div></div>
        <div class="cstep"><span class="n">5</span><div><b>${te("Administrator tasdig'i")}</b>
          <div class="small">${c.status === "verified" ? `✅ ${te("Tasdiqlangan")} · ${dateTime(c.verifiedAt)}` : c.status === "signed" ? `🔎 ${te("Tekshirilmoqda")}` : `⏳ ${te("Ikkala tomon imzolagach")}`}</div></div></div>
      </div>
    </div>`;
  }).join("")}</div>`;
}

function bindContracts() {
  $$("[data-open]").forEach((b) => (b.onclick = () => openFile(b.dataset.open, b.dataset.name).catch((e) => toast(e.message, "err"))));
  $$("[data-annex]").forEach((b) => (b.onclick = () => printAnnex(b.dataset.annex)));
  $$("[data-upload]").forEach((inp) => (inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    const label = inp.closest("label");
    label.classList.add("disabled");
    label.lastChild.textContent = t("Yuklanmoqda…");
    try {
      const up = await uploadFile(f, { purpose: "contract-signed", refId: inp.dataset.upload });
      await api("submitContractFile", { contractId: inp.dataset.upload, file: { path: up.path, name: up.name, size: up.size } });
      toast(t("Imzolangan shartnoma yuklandi"));
      reload();
    } catch (e) {
      toast(e.message, "err");
      reload();
    }
  }));
}

// Shartnoma ilovasi: tomonlar rekvizitlari va shartlar (chop etish uchun)
export async function printAnnex(contractId, contracts) {
  const list = contracts || (await api("myContracts")).contracts;
  const c = list.find((x) => x.id === contractId);
  if (!c) return;
  const inv = c.investor || {};
  const f = c.farmer || {};
  const row = (k, v) => `<tr><th>${esc(t(k))}</th><td>${esc(v || "—")}</td></tr>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(t("Shartnoma № {number}", { number: c.number }))}</title>
    <style>body{font-family:Arial,sans-serif;max-width:760px;margin:24px auto;color:#111;font-size:14px}h1{font-size:20px;text-align:center}h2{font-size:15px;margin-top:22px;border-bottom:1px solid #999;padding-bottom:4px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:6px 8px;border:1px solid #ccc;vertical-align:top}th{width:42%;background:#f5f5f5}.sign{display:flex;justify-content:space-between;margin-top:48px}.sign div{width:45%;border-top:1px solid #000;padding-top:6px;text-align:center}@media print{button{display:none}}</style></head><body>
    <button onclick="print()">🖨 ${esc(t("Chop etish"))}</button>
    <h1>${esc(t("Shartnoma № {number}", { number: c.number }))} — ${esc(t("Ilova"))}</h1>
    <p style="text-align:center">${esc(t("Tomonlar ma'lumotlari va investitsiya shartlari"))} · Agricrowd.uz · ${esc(formatDate(c.createdAt))}</p>
    <h2>${esc(t("Loyiha"))}</h2><table>
      ${row("Loyiha nomi", c.project?.title)}${row("Mahsulot", c.project?.crop)}${row("Hudud", [c.project?.region, c.project?.district].filter(Boolean).join(", "))}
      ${row("Maydon", c.project?.area ? `${c.project.area} ga` : "")}${row("Loyiha muddati", c.project?.durationMonths ? t("{n} oy", { n: c.project.durationMonths }) : "")}
      ${row("Jalb qilingan mablag'", money(c.project?.goal))}${row("Investorlar ulushi (daromaddan)", `${c.project?.investorShare}%`)}${row("Qaytarish shartlari", c.project?.returnTerms)}</table>
    <h2>${esc(t("Investitsiya"))}</h2><table>${row("Investitsiya summasi", money(c.amount))}${row("Loyihadagi ulush", `${c.sharePercent}%`)}</table>
    <h2>${esc(t("Investor"))}</h2><table>
      ${row("F.I.Sh.", inv.name)}${row("Pasport", inv.docs?.passport)}${row("JSHSHIR", inv.docs?.pinfl)}${row("Manzil", inv.docs?.address)}${row("Telefon", inv.phone)}${row("Email", inv.email)}
      ${row("Bank / karta", [inv.bank?.bankName, inv.bank?.account, inv.bank?.card].filter(Boolean).join(", "))}</table>
    <h2>${esc(t("Fermer / dehqon xo'jaligi"))}</h2><table>
      ${row("Xo'jalik", f.farm?.name)}${row("Rahbar", f.name)}${row("STIR (INN)", f.farm?.inn)}${row("Manzil", f.farm?.address || [f.farm?.region, f.farm?.district].filter(Boolean).join(", "))}
      ${row("Telefon", f.phone)}${row("Email", f.email)}${row("Bank rekvizitlari", [f.bank?.bankName, f.bank?.account, f.bank?.mfo && "MFO " + f.bank.mfo].filter(Boolean).join(", "))}</table>
    <div class="sign"><div>${esc(t("Investor"))}: ${esc(inv.name || "")}<br/><br/>${esc(t("imzo"))}</div><div>${esc(t("Fermer"))}: ${esc(f.name || "")}<br/><br/>${esc(t("imzo, muhr"))}</div></div>
    </body></html>`;
  const w = window.open("", "_blank");
  if (!w) return toast(t("Brauzer yangi oynani blokladi"), "err");
  w.document.write(html);
  w.document.close();
}

// ---------------------------------------------------------------------------
// Hamyon: hisobni to'ldirish, yechib olish, operatsiyalar

async function walletView(transactions, balance, investments) {
  const { payments, withdrawals } = await api("myPayments");
  const isInvestor = state.user.role === "investor";
  return `<div class="row between mb-2"><h2 class="mb-0">${te("Hamyon")}</h2><div class="row">${isInvestor ? `<button class="btn btn-sun" data-deposit>+ ${te("Hisobni to'ldirish")}</button>` : ""}<button class="btn btn-outline" data-withdraw ${balance ? "" : "disabled"}>${te("Mablag'ni yechib olish")}</button></div></div>
    <div class="kpis mb-2">${kpi(money(balance), "Mavjud mablag'", true)}${investments ? kpi(money(investments.filter((i) => i.status === "paid").reduce((a, i) => a + i.payout, 0)), "Olingan daromad") : ""}</div>
    ${isInvestor ? `<h3 class="mt-3">${te("To'lovlar (hisobni to'ldirish)")}</h3>${payments.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>${te("Sana")}</th><th>${te("Usul")}</th><th class="num">${te("Summa")}</th><th>${te("Holat")}</th><th></th></tr></thead><tbody>
      ${payments.map((p) => `<tr><td class="nowrap">${dateTime(p.createdAt)}</td><td>${esc(methodName(p.method))}</td><td class="num">${num(p.amount)}</td><td>${paymentBadge(p.status)}${p.adminNote ? `<div class="small muted">${esc(p.adminNote)}</div>` : ""}</td>
        <td class="nowrap">${p.method === "bank" && ["pending", "review", "rejected"].includes(p.status) ? `<button class="btn btn-sm btn-outline" data-bank="${p.id}">${te(p.receipt ? "Chek / rekvizitlar" : "Chek yuklash")}</button>` : ""}
        ${["pending", "review"].includes(p.status) && p.provider?.state !== 1 ? `<button class="btn btn-sm btn-ghost" data-cancel-pay="${p.id}">${te("Bekor qilish")}</button>` : ""}</td></tr>`).join("")}
      </tbody></table></div>` : `<p class="muted">${te("To'lovlar yo'q")}</p>`}` : ""}
    <h3 class="mt-3">${te("Mablag' yechish so'rovlari")}</h3>${withdrawals.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>${te("Sana")}</th><th class="num">${te("Summa")}</th><th>${te("Rekvizit")}</th><th>${te("Holat")}</th></tr></thead><tbody>
      ${withdrawals.map((w) => `<tr><td class="nowrap">${dateTime(w.createdAt)}</td><td class="num">${num(w.amount)}</td><td class="small">${esc(w.bank?.card ? "💳 " + maskCard(w.bank.card) : w.bank?.account || "")}</td><td>${withdrawalBadge(w.status)}${w.adminNote ? `<div class="small muted">${esc(w.adminNote)}</div>` : ""}</td></tr>`).join("")}
      </tbody></table></div>` : `<p class="muted">${te("So'rovlar yo'q")}</p>`}
    <h3 class="mt-3">${te("Barcha operatsiyalar")}</h3>${txTable(transactions)}`;
}

const maskCard = (c) => String(c).replace(/\s/g, "").replace(/^(\d{4})\d+(\d{4})$/, "$1 •••• •••• $2");
export const methodName = (m) => ({ payme: "Payme", click: "Click", uzum: "Uzum Bank", bank: t("Bank o'tkazmasi"), test: t("Test to'lov") }[m] || m);

function bindWallet() {
  $$("[data-bank]").forEach((b) => (b.onclick = async () => {
    const { payments } = await api("myPayments");
    const p = payments.find((x) => x.id === b.dataset.bank);
    if (p) bankModal(p);
  }));
  $$("[data-cancel-pay]").forEach((b) => (b.onclick = async () => {
    if (!(await confirmDlg(t("To'lov bekor qilinsinmi?")))) return;
    try { await api("cancelPayment", { paymentId: b.dataset.cancelPay }); reload(); } catch (e) { toast(e.message, "err"); }
  }));
}

export function depositModal() {
  const m = state.boot?.paymentMethods || {};
  const opts = [
    ["payme", "Payme", "payme", m.payme, "Uzcard, Humo, Visa kartalari"],
    ["click", "Click", "click", m.click, "Uzcard, Humo kartalari"],
    ["uzum", "Uzum Bank", "uzum", m.uzum, "Uzum ilovasi orqali"],
    ["bank", t("Bank o'tkazmasi"), "bank", m.bank, "Hisob raqamiga o'tkazma + chek"],
    ...(m.test ? [["test", t("Test to'lov"), "test", true, "Haqiqiy pulsiz (sinov rejimi)"]] : []),
  ];
  const first = opts.find((o) => o[3])?.[0];
  modal({
    title: t("Hisobni to'ldirish"),
    body: `<form class="form" id="dep-form">
      <label class="field">${te("Summa (so'm)")}<input name="amount" type="number" min="1000" step="any" value="5000000" required /></label>
      <div class="row">${[1, 5, 10, 50].map((x) => `<button type="button" class="btn btn-sm btn-outline" data-set="${x * 1e6}">${te("{n} mln", { n: x })}</button>`).join("")}</div>
      <div class="field">${te("To'lov usuli")}
        <div class="pay-methods">${opts.map(([key, name, cls, ok, hint]) => `<label class="pay-method ${ok ? "" : "off"}"><input type="radio" name="method" value="${key}" ${key === first ? "checked" : ""} ${ok ? "" : "disabled"} />
          <span class="pm-logo pm-${cls}">${esc(name)}</span><span class="small muted">${ok ? te(hint) : te("Tez orada")}</span></label>`).join("")}</div>
      </div>
      ${first ? "" : `<div class="warn-box small">${te("To'lov usullari hali ulanmagan. Administrator bilan bog'laning.")}</div>`}
      <div class="error-box" data-error hidden></div>
      <button class="btn btn-lg" ${first ? "" : "disabled"}>${te("Davom etish")}</button></form>`,
    onMount(mm, close) {
      const form = $("#dep-form", mm);
      $$("[data-set]", mm).forEach((b) => (b.onclick = () => (form.amount.value = b.dataset.set)));
      form.onsubmit = async (e) => {
        e.preventDefault();
        const method = form.method.value;
        await busy(e.submitter, async () => {
          try {
            const res = await api("createPayment", { method, amount: Number(form.amount.value), returnUrl: `${location.origin}/#/payment-return` });
            if (res.redirectUrl) { location.href = res.redirectUrl; return; }
            close();
            if (method === "test") { state.user = res.user; toast(t("Hisob to'ldirildi")); reload(); return; }
            if (method === "bank") bankModal(res.payment, res.bank);
          } catch (err) { showFormError(form, err.message); }
        });
      };
    },
  });
}

function bankModal(p, bank = settings().bank) {
  const purpose = t(bank.purpose || "Agricrowd.uz hisobini to'ldirish, ID: {id}", { id: p.id });
  const line = (k, v) => `<tr><th>${te(k)}</th><td><b>${esc(v || "—")}</b> ${v ? `<button type="button" class="link-btn" data-copy="${esc(v)}">${te("nusxa")}</button>` : ""}</td></tr>`;
  modal({
    title: t("Bank o'tkazmasi"),
    body: `<p>${te("Quyidagi rekvizitlarga {amount} o'tkazing va to'lov chekini (kvitansiya) yuklang. Administrator tekshirgach, hisobingiz to'ldiriladi.", { amount: money(p.amount) })}</p>
      <table class="detail-table">${line("Qabul qiluvchi", bank.recipient)}${line("Bank", bank.bankName)}${line("Hisob raqami", bank.account)}${line("MFO", bank.mfo)}${line("STIR (INN)", bank.inn)}${line("Summa", String(p.amount))}${line("To'lov maqsadi", purpose)}</table>
      ${p.receipt ? `<div class="info-box mt-2 small">✅ ${te("Chek yuklangan")}: ${esc(p.receipt.name)} — ${te("tekshirilmoqda")}</div>` : ""}
      <form class="form mt-2" id="rc-form"><label class="field">${te("To'lov cheki (PDF, JPG yoki PNG)")}<input type="file" name="file" accept="application/pdf,image/jpeg,image/png" required /></label>
      <div class="error-box" data-error hidden></div>
      <div class="row between"><button type="button" class="btn btn-ghost" data-later>${te("Keyinroq yuklayman")}</button><button class="btn">${te("Chekni yuborish")}</button></div></form>`,
    onMount(m, close) {
      $$("[data-copy]", m).forEach((b) => (b.onclick = () => { navigator.clipboard?.writeText(b.dataset.copy); toast(t("Nusxa olindi")); }));
      $("[data-later]", m).onclick = () => { close(); reload(); };
      const form = $("#rc-form", m);
      form.onsubmit = async (e) => {
        e.preventDefault();
        const f = form.file.files[0];
        if (!f) return;
        await busy(e.submitter, async () => {
          try {
            const up = await uploadFile(f, { purpose: "receipt", refId: p.id });
            await api("attachReceipt", { paymentId: p.id, file: { path: up.path, name: up.name, size: up.size } });
            close();
            toast(t("Chek yuborildi. Administrator tekshiradi"));
            go("/cabinet/wallet");
            reload();
          } catch (err) { showFormError(form, err.message); }
        });
      };
    },
  });
}

function withdrawModal() {
  const u = state.user;
  const b = u.bank || {};
  if (!b.card && !b.account) {
    return modal({ title: t("Mablag'ni yechib olish"), body: `<p>${te("Avval profilingizda bank rekvizitlari yoki karta raqamini kiriting")}.</p><a class="btn" href="#/cabinet/profile" data-close>${te("Profilga o'tish")}</a>`, onMount(m, close) { $("[data-close]", m).onclick = close; } });
  }
  modal({
    title: t("Mablag'ni yechib olish"),
    body: `<form class="form" id="wd-form"><div class="info-box">${te("Mavjud mablag'")}: <b>${esc(money(u.balance))}</b><br/>${te("O'tkaziladi")}: <b>${esc(b.card ? maskCard(b.card) : `${b.bankName || ""} ${b.account || ""}`)}</b></div>
      <label class="field">${te("Summa (so'm)")}<input name="amount" type="number" min="1000" max="${u.balance}" value="${u.balance}" step="any" required /></label>
      <p class="small muted">${te("So'rov administrator tomonidan ko'rib chiqiladi va 1–3 ish kunida o'tkaziladi.")}</p>
      <div class="error-box" data-error hidden></div><button class="btn btn-lg">${te("So'rov yuborish")}</button></form>`,
    onMount(m, close) {
      const form = $("#wd-form", m);
      form.onsubmit = async (e) => {
        e.preventDefault();
        await busy(e.submitter, async () => {
          try { state.user = (await api("requestWithdrawal", { amount: Number(form.amount.value) })).user; close(); toast(t("So'rov yuborildi")); reload(); }
          catch (err) { showFormError(form, err.message); }
        });
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Profil

function profileHtml() {
  const u = state.user;
  const f = u.farm || {};
  const b = u.bank || {};
  const dc = u.docs || {};
  return `<h2>${te("Profil")}</h2>
  <div class="card"><form class="form" id="profile-form">
    <h3>${te("Shaxsiy ma'lumotlar")}</h3>
    <div class="form-grid">
      <label class="field">${te("Ism-familiya")}<input name="name" value="${esc(u.name)}" /></label>
      <label class="field">${te("Telefon")}<input name="phone" value="${esc(u.phone)}" /></label>
      <label class="field">${te("Email")}<input value="${esc(u.email)}" disabled /></label>
      <label class="field">${te("Ro'yxatdan o'tgan sana")}<input value="${esc(formatDate(u.createdAt))}" disabled /></label>
    </div>
    <div class="form-section"><h3>${te("Shartnoma uchun ma'lumotlar")}</h3><p class="small muted">${te("Bu ma'lumotlar shartnoma ilovasida ko'rsatiladi.")}</p><div class="form-grid">
      <label class="field">${te("Pasport seriyasi va raqami")}<input name="doc_passport" value="${esc(dc.passport)}" placeholder="AA1234567" /></label>
      <label class="field">${te("JSHSHIR (PINFL)")}<input name="doc_pinfl" value="${esc(dc.pinfl)}" inputmode="numeric" maxlength="14" /></label>
      <label class="field">${te("Tug'ilgan sana")}<input name="doc_birthDate" type="date" value="${esc(dc.birthDate)}" /></label>
      <label class="field">${te("Yashash manzili")}<input name="doc_address" value="${esc(dc.address)}" /></label>
    </div></div>
    <div class="form-section"><h3>${te("Bank rekvizitlari")}</h3><p class="small muted">${te("Daromad va mablag' yechish shu rekvizitlarga o'tkaziladi.")}</p><div class="form-grid">
      <label class="field">${te("Karta raqami (Uzcard / Humo)")}<input name="bank_card" value="${esc(b.card)}" inputmode="numeric" placeholder="8600 •••• •••• ••••" /></label>
      <label class="field">${te("Karta egasi")}<input name="bank_holder" value="${esc(b.holder)}" /></label>
      <label class="field">${te("Bank nomi")}<input name="bank_bankName" value="${esc(b.bankName)}" /></label>
      <label class="field">${te("Hisob raqami (20 xonali)")}<input name="bank_account" value="${esc(b.account)}" inputmode="numeric" /></label>
      <label class="field">${te("MFO")}<input name="bank_mfo" value="${esc(b.mfo)}" inputmode="numeric" /></label>
    </div></div>
    ${u.role === "farmer" ? `<div class="form-section"><h3>${te("Xo'jalik ma'lumotlari")}</h3><div class="form-grid">
      <label class="field full">${te("Xo'jalik nomi")}<input name="farm_name" value="${esc(f.name)}" /></label>
      <label class="field">${te("Xo'jalik turi")}<input name="farm_type" value="${esc(f.type)}" /></label>
      <label class="field">${te("Viloyat")}<select name="farm_region"><option value="">—</option>${settings().regions.map((r) => `<option value="${esc(r)}" ${r === f.region ? "selected" : ""}>${esc(tv(r))}</option>`).join("")}</select></label>
      <label class="field">${te("Tuman")}<input name="farm_district" value="${esc(f.district)}" /></label>
      <label class="field">${te("Yuridik manzil")}<input name="farm_address" value="${esc(f.address)}" /></label>
      <label class="field">${te("Yer maydoni (ga)")}<input name="farm_area" type="number" step="any" value="${esc(f.area)}" /></label>
      <label class="field">${te("Tajriba (yil)")}<input name="farm_experience" type="number" value="${esc(f.experience)}" /></label>
      <label class="field">${te("STIR (INN)")}<input name="farm_inn" value="${esc(f.inn)}" /></label>
      <label class="field full">${te("Xo'jalik haqida")}<textarea name="farm_about">${esc(f.about)}</textarea></label>
      <div class="full small muted">${te("Reyting")}: ${stars(u.rating)} · ${te("Holat")}: ${u.verified ? "✅ " + te("tasdiqlangan") : "⏳ " + te("tasdiqlanmagan")}</div>
    </div></div>` : ""}
    <div class="error-box" data-error hidden></div>
    <div><button class="btn">${te("Saqlash")}</button></div>
  </form></div>
  ${state.boot?.features?.telegram ? `<div class="card mt-2"><h3>✈️ ${te("Telegram bildirishnomalari")}</h3>
    <p class="small muted">${te("Loyiha, shartnoma va to'lovlar haqidagi barcha xabarlar Telegram'ingizga keladi.")}</p>
    ${u.telegramLinked ? `<div class="row"><span class="badge tone-good">${te("Ulangan")}</span><button class="btn btn-sm btn-ghost" data-tg-off>${te("O'chirish")}</button></div>`
      : `<button class="btn" data-tg-on>✈️ ${te("Telegram'ni ulash")}</button><p class="small muted mt-1">${te("Tugmani bosing, Telegram'da ochilgan botda «Start» ni bosing, so'ng shu sahifani yangilang.")}</p>`}
  </div>` : ""}
  <div class="card mt-2"><form class="form" id="pw-form"><h3>${te("Parolni o'zgartirish")}</h3><div class="form-grid">
    <label class="field">${te("Joriy parol")}<input name="oldPassword" type="password" required /></label>
    <label class="field">${te("Yangi parol")}<input name="newPassword" type="password" minlength="6" required /></label></div>
    <div class="error-box" data-error hidden></div><div><button class="btn btn-outline">${te("Parolni yangilash")}</button></div></form></div>`;
}

const pick = (d, prefix) => Object.fromEntries(Object.entries(d).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]));

function bindProfile() {
  $("[data-tg-on]")?.addEventListener("click", async (e) => {
    const win = window.open("", "_blank");
    try {
      const { url } = await api("telegramLink", {});
      if (win) win.location = url; else location.href = url;
      e.target.outerHTML = `<button class="btn btn-outline" onclick="location.reload()">${te("Ulandi — sahifani yangilash")}</button>`;
    } catch (err) { win?.close(); toast(err.message, "err"); }
  });
  $("[data-tg-off]")?.addEventListener("click", async () => {
    try { state.user = (await api("telegramUnlink", {})).user; toast(t("Telegram o'chirildi")); reload(); } catch (err) { toast(err.message, "err"); }
  });
  const form = $("#profile-form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(form);
    const payload = { name: d.name, phone: d.phone, docs: pick(d, "doc_"), bank: pick(d, "bank_") };
    if (state.user.role === "farmer") payload.farm = pick(d, "farm_");
    await busy(e.submitter, async () => {
      try { state.user = (await api("updateProfile", payload)).user; toast(t("Ma'lumotlar saqlandi")); }
      catch (err) { showFormError(form, err.message); }
    });
  };
  const pw = $("#pw-form");
  pw.onsubmit = async (e) => {
    e.preventDefault();
    await busy(e.submitter, async () => {
      try { await api("changePassword", formData(pw)); pw.reset(); toast(t("Parol yangilandi")); }
      catch (err) { showFormError(pw, err.message); }
    });
  };
}

