// Agricrowd.uz — asosiy ilova: marshrutlash, ommaviy sahifalar, kabinetlar
import { api, getMode, setToken, hasToken, resetDemo } from "./store.js";
import { STATUSES, MONITOR_STATUSES } from "./core.js";
import {
  $, $$, esc, num, money, short, date, dateTime, daysLeft, statusBadge, cropIcon, cover, progress, stars,
  toast, modal, confirmDlg, formData, busy, compressImage, timeline, statusTrack, showImage,
} from "./ui.js";
import { projectFormHtml, bindProjectForm, readProjectForm, showFormError } from "./forms.js";
import { renderAdmin } from "./admin.js";

export const state = { user: null, boot: null };
const app = () => $("#app");
const settings = () => state.boot?.settings || { crops: [], regions: [], commission: 5, minInvestment: 500000 };

export async function refreshBoot() {
  state.boot = await api("bootstrap");
  $("#footer-phone").textContent = "☎ " + settings().contactPhone;
  $("#footer-email").textContent = "✉ " + settings().contactEmail;
}

// ---------------------------------------------------------------------------
// Marshrutlash (hash-router)

const ROUTES = [
  [/^\/?$/, pageHome, "home"],
  [/^\/projects$/, pageProjects, "projects"],
  [/^\/project\/([\w-]+)$/, pageProject, "projects"],
  [/^\/investor$/, pageInvestorInfo, "investor"],
  [/^\/farmer$/, pageFarmerInfo, "farmer"],
  [/^\/how$/, pageHow, "how"],
  [/^\/login$/, pageLogin, "login"],
  [/^\/register$/, pageRegister, "register"],
  [/^\/cabinet(?:\/([\w-]+))?(?:\/([\w-]+))?$/, pageCabinet, "cabinet"],
  [/^\/admin(?:\/([\w-]+))?(?:\/([\w-]+))?$/, (tab, id) => renderAdmin(tab, id), "admin"],
];

export function go(path) { location.hash = "#" + path; }

function query() {
  const q = location.hash.split("?")[1] || "";
  return Object.fromEntries(new URLSearchParams(q));
}

async function route() {
  const path = location.hash.replace(/^#/, "").split("?")[0] || "/";
  $("#main-nav").classList.remove("open");
  for (const [re, fn, nav] of ROUTES) {
    const m = path.match(re);
    if (!m) continue;
    $$(".main-nav > a").forEach((a) => a.classList.toggle("active", a.dataset.nav === nav));
    renderNavAuth();
    try {
      await fn(...m.slice(1));
    } catch (e) {
      console.error(e);
      app().innerHTML = `<div class="container section"><div class="card empty"><div class="ico">⚠️</div><h2>Xatolik</h2><p>${esc(e.message)}</p><a class="btn" href="#/">Bosh sahifaga</a></div></div>`;
    }
    window.scrollTo(0, 0);
    return;
  }
  app().innerHTML = `<div class="container section"><div class="card empty"><div class="ico">🔍</div><h2>Sahifa topilmadi</h2><a class="btn" href="#/">Bosh sahifaga</a></div></div>`;
}

function renderNavAuth() {
  const u = state.user;
  const el = $("#nav-auth");
  if (!u) {
    el.innerHTML = `<a class="btn btn-ghost btn-sm" href="#/login">Kirish</a><a class="btn btn-sm" href="#/register">Ro'yxatdan o'tish</a>`;
    return;
  }
  const link = u.role === "admin" ? "#/admin" : "#/cabinet";
  const roleName = { admin: "Admin panel", investor: "Kabinet", farmer: "Kabinet" }[u.role];
  el.innerHTML = `<a class="user-chip" href="${link}" title="${roleName}"><span class="avatar">${esc(initials(u.name))}</span>${esc(roleName)}</a><button class="btn btn-ghost btn-sm" data-logout>Chiqish</button>`;
  $("[data-logout]", el).onclick = logout;
}

const initials = (n = "") => n.split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase();

function logout() {
  setToken(null);
  state.user = null;
  toast("Tizimdan chiqdingiz");
  go("/");
  renderNavAuth();
}

export function requireRole(roles) {
  if (!state.user) {
    go("/login?next=" + encodeURIComponent(location.hash.slice(1)));
    return false;
  }
  if (!roles.includes(state.user.role)) {
    app().innerHTML = `<div class="container section"><div class="card empty"><div class="ico">🔒</div><h2>Ruxsat yo'q</h2><p>Bu bo'lim ${roles.map((r) => ({ admin: "administrator", investor: "investor", farmer: "fermer" }[r])).join(" / ")} uchun.</p><a class="btn" href="#/">Bosh sahifaga</a></div></div>`;
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Loyiha kartasi

function projectCard(p) {
  const left = daysLeft(p.fundingDeadline);
  const deadline = p.status === "funding" && left !== null ? `<span>⏳ ${left > 0 ? `${left} kun qoldi` : "muddat tugadi"}</span>` : "";
  return `<article class="project-card">
    ${cover(p, `<span class="badge-pos" style="position:absolute;top:12px;left:12px">${statusBadge(p.status)}</span>`)}
    <div class="project-body">
      <h3>${esc(p.title)}</h3>
      <div class="project-meta"><span>${cropIcon(p.crop)} ${esc(p.crop)}</span><span>📍 ${esc(p.region)}</span>${deadline}</div>
      ${progress(p)}
      <dl class="kv">
        <div><dt>Kerakli mablag'</dt><dd>${short(p.goal)}</dd></div>
        <div><dt>Yig'ilgan mablag'</dt><dd>${short(p.raised)}</dd></div>
        <div><dt>Loyiha muddati</dt><dd>${esc(p.durationMonths)} oy</dd></div>
        <div><dt>Kutilayotgan hosil</dt><dd>${p.expectedYield ? `${num(p.expectedYield)} t` : "—"}</dd></div>
        <div style="grid-column:1/-1"><dt>Investor uchun qaytarish shartlari</dt><dd>Daromadning ${esc(p.investorShare)}% · kutilayotgan ${p.expectedReturn >= 0 ? "+" : ""}${p.expectedReturn}%</dd></div>
      </dl>
      <div class="project-footer"><a class="btn" href="#/project/${p.id}">Batafsil</a></div>
    </div>
  </article>`;
}

// ---------------------------------------------------------------------------
// Bosh sahifa

async function pageHome() {
  await refreshBoot();
  const { stats, projects } = state.boot;
  const s = settings();
  const featured = [...projects.filter((p) => p.featured), ...projects.filter((p) => !p.featured && p.status === "funding"), ...projects].filter((p, i, a) => a.indexOf(p) === i).slice(0, 3);
  app().innerHTML = `
  <section class="hero"><div class="container hero-grid">
    <div>
      <span class="eyebrow">🌱 O'zbekiston qishloq xo'jaligi kraudfanding platformasi</span>
      <h1>${esc(s.heroTitle)}</h1>
      <p class="lead">${esc(s.heroText)}</p>
      <div class="hero-actions">
        <a class="btn btn-sun btn-lg" href="#/projects">Loyihalarni ko'rish</a>
        <a class="btn btn-light btn-lg" href="#/investor">Investor bo'lish</a>
        <a class="btn btn-outline btn-lg" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.5)" href="#/farmer">Loyiha joylashtirish</a>
      </div>
    </div>
    <div class="hero-card"><div class="triad">
      <div class="triad-item"><div class="ico">👨‍🌾</div><div><b>Fermer / dehqon</b><span>Loyiha va mahsulot — sabzavot yetishtirish uchun mablag' jalb qiladi</span></div></div>
      <div class="triad-item"><div class="ico">💼</div><div><b>Investor</b><span>Moliyaviy resurs — loyihalarga mablag' kiritib, hosildan ulush oladi</span></div></div>
      <div class="triad-item"><div class="ico">🤝</div><div><b>Agricrowd.uz</b><span>Bog'lash, tekshirish, moliyalashtirishni tashkil etish va monitoring</span></div></div>
    </div></div>
  </div></section>

  <div class="container stats-bar"><div class="stats-grid">
    <div><div class="stat-value">${num(stats.projects)}</div><div class="stat-label">E'lon qilingan loyihalar</div></div>
    <div><div class="stat-value">${short(stats.totalRaised)}</div><div class="stat-label">Jalb qilingan mablag'</div></div>
    <div><div class="stat-value">${num(stats.investors)}</div><div class="stat-label">Investorlar</div></div>
    <div><div class="stat-value">${num(stats.farmers)}</div><div class="stat-label">Fermer va dehqonlar</div></div>
  </div></div>

  <section class="section"><div class="container">
    <div class="section-head"><div><h2>Moliyalashtirilayotgan loyihalar</h2><p>Administrator tomonidan tekshirilib, tasdiqlangan sabzavot yetishtirish loyihalari.</p></div><a class="btn btn-outline" href="#/projects">Barcha loyihalar →</a></div>
    <div class="project-grid">${featured.map(projectCard).join("") || `<div class="card empty">Hozircha loyihalar yo'q</div>`}</div>
  </div></section>

  <section class="section section-alt"><div class="container">
    <div class="section-head"><div><h2>Qanday ishlaydi?</h2><p>Hosil → Sotish → Daromad → Investorlar va fermer o'rtasida taqsimlash.</p></div><a class="btn btn-ghost" href="#/how">Batafsil →</a></div>
    <div class="steps">
      <div class="step"><h3>Loyiha joylashtiriladi</h3><p>Fermer ro'yxatdan o'tib, o'z sabzavot yetishtirish loyihasini kiritadi va yuboradi.</p></div>
      <div class="step"><h3>Administrator tekshiradi</h3><p>Hujjatlar, garov, sug'urta va shartlar tekshirilib, loyiha e'lon qilinadi.</p></div>
      <div class="step"><h3>Investorlar mablag' kiritadi</h3><p>Loyiha 100% moliyalashtirilsa — ishga tushadi, aks holda mablag'lar qaytariladi.</p></div>
      <div class="step"><h3>Monitoring va daromad</h3><p>Foto/video monitoring, hosil sotilgach daromad shartlar asosida taqsimlanadi.</p></div>
    </div>
  </div></section>

  <section class="section"><div class="container">
    <h2>Loyiha kafolati va nazorat</h2>
    <div class="grid grid-2 mt-3">
      <div class="feature"><div class="ico">🌾</div><div><h3>Hosil garovi</h3><p>Loyiha kelgusi hosil va xo'jalik mol-mulki garovi bilan ta'minlanadi.</p></div></div>
      <div class="feature"><div class="ico">🛡️</div><div><h3>Hosil sug'urtasi</h3><p>Tabiiy ofatlar va boshqa xavflardan hosil sug'urtalanadi.</p></div></div>
      <div class="feature"><div class="ico">💯</div><div><h3>100% moliyalashtirish sharti</h3><p>Loyiha to'liq moliyalashtirilmasa, amalga oshirilmaydi va mablag'lar investorlarga qaytariladi.</p></div></div>
      <div class="feature"><div class="ico">📷</div><div><h3>Foto / video monitoring</h3><p>Investor loyiha qanday amalga oshirilayotganini platforma orqali kuzatib boradi.</p></div></div>
    </div>
  </div></section>

  <section class="section" style="padding-top:0"><div class="container"><div class="cta">
    <div><h2>Qishloq xo'jaligini birga rivojlantiramiz</h2><p>Investor sifatida mablag' kiriting yoki fermer sifatida loyihangizni joylashtiring.</p></div>
    <div class="row"><a class="btn btn-sun btn-lg" href="#/register?role=investor">Investor bo'lish</a><a class="btn btn-light btn-lg" href="#/register?role=farmer">Loyiha joylashtirish</a></div>
  </div></div></section>`;
}

// ---------------------------------------------------------------------------
// Loyihalar ro'yxati

async function pageProjects() {
  await refreshBoot();
  const { projects } = state.boot;
  const s = settings();
  const q = query();
  app().innerHTML = `
  <section class="page-head"><div class="container"><div class="breadcrumbs"><a href="#/">Bosh sahifa</a> / Loyihalar</div><h1>Loyihalar</h1><p>Platformaga joylashtirilgan va administrator tomonidan tasdiqlangan sabzavot yetishtirish loyihalari.</p></div></section>
  <section class="section" style="padding-top:28px"><div class="container">
    <div class="filters">
      <input type="search" placeholder="🔍 Qidirish (nomi, fermer)…" data-f="q" value="${esc(q.q || "")}" />
      <select data-f="crop"><option value="">Barcha mahsulotlar</option>${s.crops.map((c) => `<option ${q.crop === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
      <select data-f="region"><option value="">Barcha hududlar</option>${s.regions.map((c) => `<option ${q.region === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
      <select data-f="status"><option value="">Barcha holatlar</option>${["funding", "funded", "in_progress", "harvest", "completed", "refunded"].map((k) => `<option value="${k}" ${q.status === k ? "selected" : ""}>${esc(STATUSES[k].label)}</option>`).join("")}</select>
      <select data-f="sort"><option value="">Saralash: yangi</option><option value="percent">Moliyalashtirish darajasi</option><option value="return">Kutilayotgan daromad</option><option value="goal">Mablag' miqdori</option></select>
    </div>
    <p class="muted small" data-count></p>
    <div class="project-grid" data-list></div>
  </div></section>`;
  const draw = () => {
    const f = Object.fromEntries($$("[data-f]").map((el) => [el.dataset.f, el.value]));
    let list = projects.filter((p) =>
      (!f.crop || p.crop === f.crop) && (!f.region || p.region === f.region) && (!f.status || p.status === f.status) &&
      (!f.q || `${p.title} ${p.crop} ${p.region} ${p.farmer?.name} ${p.farmer?.farm?.name}`.toLowerCase().includes(f.q.toLowerCase())));
    if (f.sort === "percent") list.sort((a, b) => b.percent - a.percent);
    if (f.sort === "return") list.sort((a, b) => b.expectedReturn - a.expectedReturn);
    if (f.sort === "goal") list.sort((a, b) => b.goal - a.goal);
    $("[data-count]").textContent = `${list.length} ta loyiha topildi`;
    $("[data-list]").innerHTML = list.map(projectCard).join("") || `<div class="card empty" style="grid-column:1/-1"><div class="ico">🌱</div><p>Mos loyiha topilmadi</p></div>`;
  };
  $$("[data-f]").forEach((el) => el.addEventListener("input", draw));
  draw();
}

// ---------------------------------------------------------------------------
// Loyiha sahifasi

async function pageProject(id) {
  const p = await api("getProject", { id });
  const s = settings();
  const f = p.farmer || {};
  const left = daysLeft(p.fundingDeadline);
  const u = state.user;
  const myTotal = (p.myInvestments || []).filter((i) => i.status !== "refunded").reduce((a, i) => a + i.amount, 0);
  const invShare = p.expectedRevenue * (p.investorShare / 100);
  const row = (k, v) => `<tr><th>${k}</th><td>${v || "—"}</td></tr>`;

  let action = "";
  if (p.status === "funding") {
    if (!u) action = `<a class="btn btn-lg btn-block" href="#/login?next=/project/${p.id}">Investitsiya kiritish</a><p class="small muted mt-1">Investitsiya kiritish uchun investor sifatida tizimga kiring.</p>`;
    else if (u.role === "investor") action = `<button class="btn btn-lg btn-block" data-invest>Investitsiya kiritish</button>`;
    else action = `<p class="small muted">Investitsiya faqat investor hisobidan kiritiladi.</p>`;
  } else if (p.status === "pending") action = `<div class="warn-box">Loyiha administrator tekshiruvida. Tasdiqlangandan keyin investorlar uchun ochiladi.</div>`;
  else if (p.status === "rejected") action = `<div class="error-box">Loyiha rad etilgan. ${esc(p.adminNote)}</div>`;
  else if (p.status === "refunded") action = `<div class="error-box">Loyiha muddat ichida 100% moliyalashtirilmadi — investorlar mablag'i qaytarildi.</div>`;
  else action = `<div class="info-box">✅ Loyiha 100% moliyalashtirilgan. Mablag' yig'ish yakunlangan.</div>`;

  app().innerHTML = `
  <section class="page-head"><div class="container">
    <div class="breadcrumbs"><a href="#/">Bosh sahifa</a> / <a href="#/projects">Loyihalar</a> / ${esc(p.title)}</div>
    <div class="row" style="margin-bottom:10px">${statusBadge(p.status)}</div>
    <h1>${esc(p.title)}</h1>
    <p>${cropIcon(p.crop)} ${esc(p.crop)} · 📍 ${esc(p.region)}${p.district ? ", " + esc(p.district) : ""} · ${esc(p.area)} ga · ${esc(p.durationMonths)} oy</p>
  </div></section>
  <section class="section" style="padding-top:28px"><div class="container project-layout">
    <div>
      ${p.image ? `<img src="${esc(p.image)}" alt="" style="width:100%;max-height:380px;object-fit:cover;border-radius:16px;margin-bottom:20px" />` : ""}
      <div class="card">
        <div class="tabs" role="tablist">
          <button class="active" data-tab="about">Loyiha haqida</button>
          <button data-tab="finance">Moliyaviy qism</button>
          <button data-tab="risk">Kafolat va risklar</button>
          <button data-tab="monitor">Monitoring (${p.updates.length})</button>
        </div>
        <div data-pane="about">
          ${p.summary ? `<p style="font-size:1.05rem">${esc(p.summary)}</p>` : ""}
          <h3 class="mt-3">Fermer / dehqon xo'jaligi haqida</h3>
          <table class="detail-table">
            ${row("Xo'jalik", esc(f.farm?.name || f.name))}
            ${row("Xo'jalik turi", esc(f.farm?.type))}
            ${row("Rahbar", esc(f.name) + (f.verified ? ' <span class="badge tone-good">tasdiqlangan</span>' : ""))}
            ${row("Tajriba", f.farm?.experience ? esc(f.farm.experience) + " yil" : "")}
            ${row("Xo'jalik maydoni", f.farm?.area ? esc(f.farm.area) + " ga" : "")}
          </table>
          ${f.farm?.about ? `<p class="mt-2 muted">${esc(f.farm.about)}</p>` : ""}
          <h3 class="mt-3">Loyiha tafsilotlari</h3>
          <table class="detail-table">
            ${row("Nima yetishtiriladi", `${cropIcon(p.crop)} ${esc(p.crop)}`)}
            ${row("Loyiha maydoni", p.area ? esc(p.area) + " gektar" : "")}
            ${row("Loyiha joylashgan hudud", esc(p.region) + (p.district ? ", " + esc(p.district) : ""))}
            ${row("Kerakli mablag'", money(p.goal))}
            ${row("Loyiha muddati", esc(p.durationMonths) + " oy")}
          </table>
          <h3 class="mt-3">Ishlab chiqarish rejasi</h3>
          <p>${esc(p.plan) || "—"}</p>
          <h3 class="mt-3">Mablag'dan foydalanish yo'nalishlari</h3>
          ${p.usage?.length ? `<table class="detail-table">${p.usage.map((x) => row(esc(x.item), money(x.amount))).join("")}</table>` : `<p>${esc(p.purpose) || "—"}</p>`}
        </div>
        <div data-pane="finance" hidden>
          <table class="detail-table">
            ${row("Loyihaning umumiy qiymati", p.totalCost ? money(p.totalCost) : "")}
            ${row("Jalb qilinishi kerak bo'lgan mablag'", money(p.goal))}
            ${row("Yig'ilgan mablag'", money(p.raised) + ` (${p.percent}%)`)}
            ${row("Investor mablag'ining foydalanish maqsadi", esc(p.purpose))}
            ${row("Kutilayotgan hosil", p.expectedYield ? `${num(p.expectedYield)} tonna` : "")}
            ${row("Kutilayotgan sotish narxi", p.expectedPrice ? `${num(p.expectedPrice)} so'm/kg` : "")}
            ${row("Hosil realizatsiyasidan olinadigan daromad", money(p.expectedRevenue))}
            ${row("Investor ulushi", `daromadning ${esc(p.investorShare)}% — ${money(invShare)}`)}
            ${row("Kutilayotgan daromadlilik", `${p.expectedReturn >= 0 ? "+" : ""}${p.expectedReturn}% (${esc(p.durationMonths)} oyda)`)}
            ${row("Platforma komissiyasi", `investorlar ulushidan ${esc(s.commission)}%`)}
            ${row("Mablag'ni qaytarish shartlari", esc(p.returnTerms))}
            ${row("Moliyalashtirish muddati", date(p.fundingDeadline))}
          </table>
          ${p.distribution ? `<h3 class="mt-3">Yakuniy hisob-kitob</h3><table class="detail-table">
            ${row("Hosil realizatsiyasidan tushum", money(p.actualRevenue))}
            ${row("Investorlar ulushi", money(p.distribution.investorPool))}
            ${row("Platforma komissiyasi", money(p.distribution.commission))}
            ${row("Investorlarga to'langan", money(p.distribution.toInvestors))}
            ${row("Fermer ulushi", money(p.distribution.farmerPart))}
          </table>` : ""}
          <div class="info-box mt-3">💯 <b>100% moliyalashtirish sharti:</b> agar loyiha belgilangan muddatda 100% moliyalashtirilsa — loyiha ishga tushadi va mablag' fermerga ajratiladi. Aks holda loyiha amalga oshirilmaydi va investorlarning mablag'lari qaytariladi.</div>
        </div>
        <div data-pane="risk" hidden>
          <div class="guarantee"><div class="ico">🌾</div><div><h4 class="mb-0">Hosil garovi</h4><p>${esc(p.collateral) || "—"}</p></div></div>
          <div class="guarantee"><div class="ico">🛡️</div><div><h4 class="mb-0">Sug'urta</h4><p>${esc(p.insurance) || "—"}</p></div></div>
          <div class="guarantee"><div class="ico">📜</div><div><h4 class="mb-0">Kafolat</h4><p>${esc(p.guarantee) || "—"}</p></div></div>
          <div class="guarantee"><div class="ico">⭐</div><div><h4 class="mb-0">Fermerning reytingi / faoliyati</h4><p>${stars(f.rating)} · platformada ${f.projectsTotal || 0} ta loyiha, ${f.projectsCompleted || 0} tasi muvaffaqiyatli yakunlangan</p></div></div>
          <div class="guarantee"><div class="ico">📷</div><div><h4 class="mb-0">Loyiha monitoringi</h4><p>Loyiha moliyalashtirilgandan keyin foto, video va holat ma'lumotlari orqali platforma tomonidan nazorat qilinadi.</p></div></div>
          <div class="guarantee" style="border:0"><div class="ico">📁</div><div><h4 class="mb-0">Taqdim etilgan hujjatlar</h4><p>${esc(p.documents) || "—"}</p></div></div>
        </div>
        <div data-pane="monitor" hidden>${statusTrack(p.status)}<div class="mt-3">${timeline(p.updates)}</div></div>
      </div>
    </div>
    <aside class="sticky">
      <div class="card">
        ${progress(p)}
        <dl class="kv mt-2">
          <div><dt>Investorlar</dt><dd>${p.investors}</dd></div>
          <div><dt>${p.status === "funding" ? "Qolgan muddat" : "Muddat"}</dt><dd>${p.status === "funding" && left !== null ? (left > 0 ? left + " kun" : "tugadi") : date(p.fundingDeadline)}</dd></div>
          <div><dt>Qolgan summa</dt><dd>${short(Math.max(0, p.goal - p.raised))}</dd></div>
          <div><dt>Kutilayotgan daromad</dt><dd style="color:var(--green-700)">${p.expectedReturn >= 0 ? "+" : ""}${p.expectedReturn}%</dd></div>
        </dl>
        <div class="mt-3">${action}</div>
        ${myTotal ? `<div class="info-box mt-2">Sizning investitsiyangiz: <b>${money(myTotal)}</b></div>` : ""}
        ${statusTrack(p.status)}
      </div>
      <div class="card mt-2">
        <h3>Fermer</h3>
        <div class="row"><span class="avatar" style="width:44px;height:44px;font-size:1rem">${esc(initials(f.name))}</span><div><b>${esc(f.name)}</b><div class="small muted">${esc(f.farm?.name || "")}</div></div></div>
        <p class="mt-2 mb-0">${stars(f.rating)}</p>
      </div>
    </aside>
  </div></section>`;

  $$("[data-tab]").forEach((b) => (b.onclick = () => {
    $$("[data-tab]").forEach((x) => x.classList.toggle("active", x === b));
    $$("[data-pane]").forEach((x) => (x.hidden = x.dataset.pane !== b.dataset.tab));
  }));
  $("[data-invest]")?.addEventListener("click", () => investModal(p));
}

function investModal(p) {
  const s = settings();
  const remaining = p.goal - p.raised;
  const min = Math.min(s.minInvestment, remaining);
  const balance = state.user.balance || 0;
  modal({
    title: "Investitsiya kiritish",
    body: `<form class="form" id="inv-form">
      <div class="info-box"><b>${esc(p.title)}</b><br/>Qolgan summa: <b>${money(remaining)}</b> · Hisobingizda: <b>${money(balance)}</b></div>
      <label class="field">Investitsiya summasi (so'm)<input name="amount" type="number" min="${min}" max="${remaining}" step="any" required value="${Math.min(remaining, Math.max(min, 1_000_000))}" /><small>Minimal: ${money(min)}</small></label>
      <div class="row">${[1, 5, 10].map((m) => m * 1e6).filter((v) => v <= remaining).map((v) => `<button type="button" class="btn btn-sm btn-outline" data-set="${v}">${short(v)}</button>`).join("")}<button type="button" class="btn btn-sm btn-outline" data-set="${remaining}">Qolganini to'liq</button></div>
      <div class="card-flat" data-preview></div>
      <label class="check small"><input type="checkbox" required name="agree" /> Loyiha shartlari, risklar va 100% moliyalashtirish sharti bilan tanishdim</label>
      <div class="error-box" data-error hidden></div>
      <div class="row between"><button type="button" class="btn btn-ghost" data-topup>+ Hisobni to'ldirish</button><button class="btn btn-lg">Tasdiqlash</button></div>
    </form>`,
    onMount(m, close) {
      const form = $("#inv-form", m);
      const prev = () => {
        const a = Number(form.amount.value) || 0;
        const share = p.goal ? a / p.goal : 0;
        const exp = p.expectedRevenue * (p.investorShare / 100) * (1 - s.commission / 100) * share;
        $("[data-preview]", m).innerHTML = `<div class="small muted">Loyihadagi ulushingiz</div><b>${(share * 100).toFixed(2)}%</b><div class="small muted mt-1">Kutilayotgan qaytim (komissiyadan keyin)</div><b style="color:var(--green-700)">${money(exp)}</b> <span class="small muted">— sof foyda ${money(exp - a)}</span>`;
      };
      form.addEventListener("input", prev);
      $$("[data-set]", m).forEach((b) => (b.onclick = () => { form.amount.value = b.dataset.set; prev(); }));
      $("[data-topup]", m).onclick = () => { close(); depositModal(() => investModal(p)); };
      prev();
      form.onsubmit = async (e) => {
        e.preventDefault();
        if (!form.agree.checked) return showFormError(form, "Shartlar bilan tanishganingizni tasdiqlang");
        await busy(e.submitter, async () => {
          try {
            const res = await api("invest", { projectId: p.id, amount: Number(form.amount.value) });
            state.user = res.user;
            close();
            toast(res.project.status === "funded" ? "🎉 Investitsiya qabul qilindi! Loyiha 100% moliyalashtirildi" : "Investitsiya muvaffaqiyatli kiritildi");
            route();
          } catch (err) { showFormError(form, err.message); }
        });
      };
    },
  });
}

function depositModal(after) {
  modal({
    title: "Hisobni to'ldirish",
    body: `<form class="form" id="dep-form">
      <div class="warn-box small">To'lov tizimi (Click / Payme / Uzcard / Humo) ulanguncha hisob to'ldirish soddalashtirilgan tartibda amalga oshiriladi.</div>
      <label class="field">Summa (so'm)<input name="amount" type="number" min="10000" step="any" value="5000000" required /></label>
      <div class="row">${[1, 5, 10, 50].map((m) => `<button type="button" class="btn btn-sm btn-outline" data-set="${m * 1e6}">${m} mln</button>`).join("")}</div>
      <div class="error-box" data-error hidden></div>
      <button class="btn btn-lg">To'ldirish</button></form>`,
    onMount(m, close) {
      const form = $("#dep-form", m);
      $$("[data-set]", m).forEach((b) => (b.onclick = () => (form.amount.value = b.dataset.set)));
      form.onsubmit = async (e) => {
        e.preventDefault();
        await busy(e.submitter, async () => {
          try {
            state.user = (await api("deposit", { amount: Number(form.amount.value) })).user;
            close();
            toast("Hisob to'ldirildi");
            after ? after() : route();
          } catch (err) { showFormError(form, err.message); }
        });
      };
    },
  });
}

function withdrawModal() {
  modal({
    title: "Mablag'ni yechib olish",
    body: `<form class="form" id="wd-form"><div class="info-box">Mavjud mablag': <b>${money(state.user.balance)}</b></div>
      <label class="field">Summa (so'm)<input name="amount" type="number" min="1" max="${state.user.balance}" value="${state.user.balance}" required /></label>
      <div class="error-box" data-error hidden></div><button class="btn btn-lg">Yechib olish</button></form>`,
    onMount(m, close) {
      const form = $("#wd-form", m);
      form.onsubmit = async (e) => {
        e.preventDefault();
        await busy(e.submitter, async () => {
          try { state.user = (await api("withdraw", { amount: Number(form.amount.value) })).user; close(); toast("So'rov bajarildi"); route(); }
          catch (err) { showFormError(form, err.message); }
        });
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Ma'lumot sahifalari

function flow(items) {
  return `<div class="flow">${items.map((t, i) => `${i ? '<div class="flow-arrow">↓</div>' : ""}<div class="flow-item ${t.startsWith("!") ? "key" : ""}"><span class="n">${i + 1}</span>${esc(t.replace(/^!/, ""))}</div>`).join("")}</div>`;
}
const INVESTOR_FLOW = ["Ro'yxatdan o'tish", "Investor kabineti", "Loyihalar", "Loyihani tanlash", "Batafsil ma'lumot", "Investitsiya kiritish", "!Loyiha 100% moliyalashtiriladi", "Loyiha amalga oshiriladi", "Foto/video monitoring", "Hosil olinadi", "Hosil sotiladi", "!Daromad taqsimlanadi"];
const FARMER_FLOW = ["Loyiha joylashtirish", "Ro'yxatdan o'tish", "Fermer kabineti", "Yangi loyiha", "Loyiha ma'lumotlarini kiritish", "Loyihani yuborish", "!Administrator tekshiruvi", "Tasdiqlash", "Platformada e'lon qilish", "Investorlar mablag' kiritadi", "!100% moliyalashtirish", "Loyihani amalga oshirish", "Monitoring", "Hosil olish va sotish", "!Daromadni taqsimlash"];

function pageInvestorInfo() {
  app().innerHTML = `
  <section class="page-head"><div class="container"><div class="breadcrumbs"><a href="#/">Bosh sahifa</a> / Investor bo'lish</div><h1>Investor bo'lish</h1><p>Qishloq xo'jaligi loyihalariga mablag' kiriting va hosil realizatsiyasidan tushgan daromaddan ulush oling.</p></div></section>
  <section class="section"><div class="container grid grid-2" style="align-items:start">
    <div>
      <h2>Investor uchun imkoniyatlar</h2>
      <div class="grid mt-3">
        <div class="feature"><div class="ico">🔎</div><div><h3>Tekshirilgan loyihalar</h3><p>Har bir loyiha administrator tomonidan hujjatlar, garov va sug'urta bo'yicha tekshiriladi.</p></div></div>
        <div class="feature"><div class="ico">💯</div><div><h3>100% sharti</h3><p>Loyiha to'liq moliyalashtirilmasa — mablag'ingiz hisobingizga qaytariladi.</p></div></div>
        <div class="feature"><div class="ico">📷</div><div><h3>Shaffof monitoring</h3><p>Loyihaning holati, foto va video hisobotlarini kabinetingizda kuzatasiz.</p></div></div>
        <div class="feature"><div class="ico">💰</div><div><h3>Hosildan daromad</h3><p>Hosil sotilgach, daromad kiritgan mablag'ingiz ulushiga mos taqsimlanadi.</p></div></div>
      </div>
      <div class="row mt-4"><a class="btn btn-lg" href="#/register?role=investor">Investor sifatida ro'yxatdan o'tish</a><a class="btn btn-lg btn-outline" href="#/projects">Loyihalarni ko'rish</a></div>
    </div>
    <div class="card"><h3>Investor yo'nalishi</h3>${flow(INVESTOR_FLOW)}</div>
  </div></section>`;
}

function pageFarmerInfo() {
  app().innerHTML = `
  <section class="page-head"><div class="container"><div class="breadcrumbs"><a href="#/">Bosh sahifa</a> / Loyiha joylashtirish</div><h1>Loyiha joylashtirish</h1><p>Sabzavot yetishtiruvchi fermer va dehqon xo'jaliklari uchun — loyihangizni joylashtiring va investorlar mablag'ini jalb qiling.</p></div></section>
  <section class="section"><div class="container grid grid-2" style="align-items:start">
    <div>
      <h2>Loyihada qanday ma'lumotlar kiritiladi?</h2>
      <div class="card-flat mt-2"><ul style="columns:2;gap:24px;margin:0;padding-left:18px">
        ${["Loyiha nomi", "Yetishtiriladigan sabzavot mahsuloti", "Ishlab chiqarish hududi", "Maydon", "Loyiha qiymati", "Kerakli mablag'", "Mablag'dan foydalanish maqsadi", "Ishlab chiqarish rejasi", "Kutilayotgan hosil", "Kutilayotgan daromad", "Moliyalashtirish muddati", "Qaytarish shartlari", "Garov / kafolat", "Sug'urta ma'lumotlari"].map((x) => `<li>${x}</li>`).join("")}
      </ul></div>
      <div class="grid mt-3">
        <div class="feature"><div class="ico">📝</div><div><h3>Oson ariza</h3><p>Shaxsiy kabinet orqali loyihani kiritib, «Yuborish» tugmasini bosasiz.</p></div></div>
        <div class="feature"><div class="ico">✅</div><div><h3>Administrator tekshiruvi</h3><p>Loyiha tekshirilib, verifikatsiyadan o'tgach investorlar uchun e'lon qilinadi.</p></div></div>
        <div class="feature"><div class="ico">💵</div><div><h3>Mablag' ajratilishi</h3><p>Loyiha 100% moliyalashtirilgach, yig'ilgan mablag' ishlab chiqarish uchun ajratiladi.</p></div></div>
      </div>
      <div class="row mt-4"><a class="btn btn-lg" href="${state.user?.role === "farmer" ? "#/cabinet/new" : "#/register?role=farmer"}">Loyiha joylashtirish</a></div>
    </div>
    <div class="card"><h3>Fermer / dehqon yo'nalishi</h3>${flow(FARMER_FLOW)}</div>
  </div></section>`;
}

function pageHow() {
  app().innerHTML = `
  <section class="page-head"><div class="container"><div class="breadcrumbs"><a href="#/">Bosh sahifa</a> / Qanday ishlaydi?</div><h1>Qanday ishlaydi?</h1><p>Agricrowd.uz uch tomonning o'zaro bog'lanishiga qurilgan: fermer/dehqon → loyiha va mahsulot, investor → moliyaviy resurs, Agricrowd.uz → bog'lash, tekshirish, moliyalashtirishni tashkil etish va monitoring.</p></div></section>
  <section class="section"><div class="container">
    <div class="card mb-2"><h3>Umumiy harakat sxemasi</h3>${flow(["Saytga kirish", "Bosh sahifa", "Loyihalar / Investor bo'lish / Loyiha joylashtirish"])}</div>
    <div class="grid grid-2 mt-3" style="align-items:start">
      <div class="card"><h3>💼 Investor yo'nalishi</h3>${flow(INVESTOR_FLOW)}</div>
      <div class="card"><h3>👨‍🌾 Fermer / dehqon yo'nalishi</h3>${flow(FARMER_FLOW)}</div>
    </div>
    <div class="grid grid-3 mt-4">
      <div class="card"><h3>💯 100% moliyalashtirish sharti</h3><p class="mb-0">Loyiha 100% moliyalashtirilsa — ishga tushadi, yig'ilgan mablag' loyiha uchun ajratiladi. Moliyalashtirilmasa — loyiha amalga oshirilmaydi va investorlarning mablag'lari qaytariladi.</p></div>
      <div class="card"><h3>📷 Monitoring</h3><p class="mb-0">Loyiha foto, video va holat ma'lumotlari orqali nazorat qilinadi. Investor loyiha qanday amalga oshirilayotganini platforma orqali kuzatadi.</p></div>
      <div class="card"><h3>💰 Daromad taqsimoti</h3><p class="mb-0">Hosil → Sotish → Daromad → Investorlar va fermer o'rtasida taqsimlash. Investor o'z ulushini oladi, platforma belgilangan tartibda komissiya oladi (${esc(settings().commission)}%).</p></div>
    </div>
  </div></section>`;
}

// ---------------------------------------------------------------------------
// Kirish va ro'yxatdan o'tish

function afterLogin(user, next) {
  state.user = user;
  renderNavAuth();
  go(next || (user.role === "admin" ? "/admin" : "/cabinet"));
}

function pageLogin() {
  if (state.user) return go(state.user.role === "admin" ? "/admin" : "/cabinet");
  const next = query().next;
  app().innerHTML = `<div class="container"><div class="auth-wrap card">
    <h2>Kirish</h2><p class="muted">Agricrowd.uz hisobingizga kiring</p>
    <form class="form" id="login-form">
      <label class="field">Email<input name="email" type="email" autocomplete="email" required /></label>
      <label class="field">Parol<input name="password" type="password" autocomplete="current-password" required /></label>
      <div class="error-box" data-error hidden></div>
      <button class="btn btn-lg btn-block">Kirish</button>
    </form>
    <p class="mt-2 mb-0 small">Hisobingiz yo'qmi? <a href="#/register">Ro'yxatdan o'tish</a></p>
    ${demoHint()}
  </div></div>`;
  const form = $("#login-form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    await busy(e.submitter, async () => {
      try {
        const res = await api("login", formData(form));
        setToken(res.token);
        toast(`Xush kelibsiz, ${res.user.name}!`);
        afterLogin(res.user, next);
      } catch (err) { showFormError(form, err.message); }
    });
  };
  $$("[data-demo]").forEach((b) => (b.onclick = () => { form.email.value = b.dataset.demo; form.password.value = b.dataset.pw; form.requestSubmit(); }));
}

function demoHint() {
  if (!state.boot?.projects?.some((p) => p.id === "p_tomato")) return "";
  return `<div class="card-flat mt-3 small"><b>Demo hisoblar</b> (sinov uchun):
    <div class="row mt-1"><button class="btn btn-sm btn-outline" data-demo="investor@agricrowd.uz" data-pw="demo123">Investor</button><button class="btn btn-sm btn-outline" data-demo="fermer@agricrowd.uz" data-pw="demo123">Fermer</button>${getMode() === "demo" ? `<button class="btn btn-sm btn-outline" data-demo="admin@agricrowd.uz" data-pw="Admin123!">Admin</button>` : ""}</div></div>`;
}

function pageRegister() {
  if (state.user) return go("/cabinet");
  const q = query();
  let role = q.role === "farmer" || q.role === "investor" ? q.role : "";
  const s = settings();
  app().innerHTML = `<div class="container"><div class="auth-wrap card" style="max-width:640px">
    <h2>Ro'yxatdan o'tish</h2><p class="muted">Platformadagi rolingizni tanlang</p>
    <div class="role-picker">
      <button type="button" class="role-option" data-role="investor"><span class="ico">💼</span><b>Investor</b><span class="small muted">Qishloq xo'jaligi loyihalariga mablag' kiritaman</span></button>
      <button type="button" class="role-option" data-role="farmer"><span class="ico">👨‍🌾</span><b>Fermer / dehqon</b><span class="small muted">Sabzavot yetishtirish loyihamni joylashtiraman</span></button>
    </div>
    <form class="form mt-3" id="reg-form" hidden>
      <div class="form-grid">
        <label class="field full">Ism-familiya *<input name="name" required autocomplete="name" /></label>
        <label class="field">Email *<input name="email" type="email" required autocomplete="email" /></label>
        <label class="field">Telefon<input name="phone" type="tel" placeholder="+998 __ ___ __ __" autocomplete="tel" /></label>
        <label class="field">Parol * <small>(kamida 6 belgi)</small><input name="password" type="password" minlength="6" required autocomplete="new-password" /></label>
        <label class="field">Parolni takrorlang *<input name="password2" type="password" required autocomplete="new-password" /></label>
      </div>
      <div data-farm-fields hidden class="form-section"><h3>Xo'jalik ma'lumotlari</h3><div class="form-grid">
        <label class="field full">Xo'jalik nomi<input name="farm_name" placeholder="«…» fermer xo'jaligi" /></label>
        <label class="field">Xo'jalik turi<select name="farm_type"><option>Fermer xo'jaligi</option><option>Dehqon xo'jaligi</option><option>Tomorqa xo'jaligi</option><option>Agrofirma / MChJ</option></select></label>
        <label class="field">Viloyat<select name="farm_region"><option value="">—</option>${s.regions.map((r) => `<option>${esc(r)}</option>`).join("")}</select></label>
        <label class="field">Tuman<input name="farm_district" /></label>
        <label class="field">Yer maydoni (ga)<input name="farm_area" type="number" min="0" step="0.1" /></label>
        <label class="field">Tajriba (yil)<input name="farm_experience" type="number" min="0" /></label>
        <label class="field">STIR (INN)<input name="farm_inn" /></label>
      </div></div>
      <label class="check small"><input type="checkbox" name="agree" /> Platformadan foydalanish shartlariga roziman</label>
      <div class="error-box" data-error hidden></div>
      <button class="btn btn-lg btn-block">Ro'yxatdan o'tish</button>
    </form>
    <p class="mt-2 mb-0 small">Hisobingiz bormi? <a href="#/login">Kirish</a></p>
  </div></div>`;
  const form = $("#reg-form");
  const pick = (r) => {
    role = r;
    $$("[data-role]").forEach((b) => b.classList.toggle("selected", b.dataset.role === r));
    form.hidden = false;
    $("[data-farm-fields]").hidden = r !== "farmer";
  };
  $$("[data-role]").forEach((b) => (b.onclick = () => pick(b.dataset.role)));
  if (role) pick(role);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(form);
    if (d.password !== d.password2) return showFormError(form, "Parollar mos kelmadi");
    if (!d.agree) return showFormError(form, "Foydalanish shartlariga rozilik bildiring");
    const farm = { name: d.farm_name, type: d.farm_type, region: d.farm_region, district: d.farm_district, area: d.farm_area, experience: d.farm_experience, inn: d.farm_inn };
    await busy(e.submitter, async () => {
      try {
        const res = await api("register", { role, name: d.name, email: d.email, phone: d.phone, password: d.password, farm });
        setToken(res.token);
        toast("Ro'yxatdan o'tdingiz! Shaxsiy kabinetingizga xush kelibsiz");
        afterLogin(res.user, role === "farmer" ? "/cabinet/new" : "/cabinet");
      } catch (err) { showFormError(form, err.message); }
    });
  };
}

// ---------------------------------------------------------------------------
// Shaxsiy kabinetlar

async function pageCabinet(tab, id) {
  if (!requireRole(["investor", "farmer", "admin"])) return;
  if (state.user.role === "admin") return go("/admin");
  if (state.user.role === "investor") return investorCabinet(tab || "overview");
  return farmerCabinet(tab || "overview", id);
}

function dashShell(items, active, content) {
  const u = state.user;
  return `<div class="container dash">
    <nav class="dash-side">
      <div class="who"><span class="small muted">${u.role === "investor" ? "Investor" : "Fermer / dehqon"}</span><b>${esc(u.name)}</b><span class="small muted">${esc(u.email)}</span></div>
      ${items.map(([key, label, count]) => `<a href="#/cabinet/${key}" class="${key === active ? "active" : ""}">${label}${count ? `<span class="count">${count}</span>` : ""}</a>`).join("")}
    </nav>
    <div>${content}</div>
  </div>`;
}

const kpi = (v, l, accent) => `<div class="kpi ${accent ? "accent" : ""}"><div class="v">${v}</div><div class="l">${l}</div></div>`;
const TX_LABELS = { deposit: "Hisob to'ldirish", withdraw: "Yechib olish", invest: "Investitsiya", refund: "Qaytarildi", payout: "Daromad ulushi", disbursement: "Loyiha mablag'i ajratildi", adjust: "Tuzatish", commission: "Komissiya" };
const TX_SIGN = { deposit: 1, refund: 1, payout: 1, disbursement: 1, withdraw: -1, invest: -1 };

function txTable(list) {
  if (!list.length) return `<div class="card empty"><div class="ico">🧾</div><p>Operatsiyalar yo'q</p></div>`;
  return `<div class="table-wrap"><table class="data"><thead><tr><th>Sana</th><th>Turi</th><th>Izoh</th><th class="num">Summa</th></tr></thead><tbody>
    ${list.map((t) => { const sign = TX_SIGN[t.type] ?? Math.sign(t.amount); return `<tr><td class="nowrap">${dateTime(t.createdAt)}</td><td>${TX_LABELS[t.type] || t.type}</td><td>${esc(t.note)}</td><td class="num" style="color:${sign > 0 ? "var(--green-700)" : "var(--red)"};font-weight:700">${sign > 0 ? "+" : "−"}${num(Math.abs(t.amount))}</td></tr>`; }).join("")}
  </tbody></table></div>`;
}

async function investorCabinet(tab) {
  const d = await api("investorDashboard");
  state.user = d.user;
  const s = d.summary;
  const items = [["overview", "📊 Umumiy ko'rinish"], ["investments", "💼 Investitsiyalarim", d.investments.length], ["monitoring", "📷 Monitoring"], ["transactions", "🧾 Daromad va operatsiyalar"], ["profile", "👤 Profil"]];
  let content = "";
  const invRows = (list) => list.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Loyiha</th><th>Holati</th><th class="num">Investitsiya</th><th class="num">Ulush</th><th>Moliyalashtirish</th><th class="num">Kutilayotgan daromad</th><th class="num">Olingan</th></tr></thead><tbody>
    ${list.map((i) => `<tr><td><a href="#/project/${i.projectId}"><b>${esc(i.project?.title || "—")}</b></a><div class="small muted">${date(i.createdAt)} · ${esc(i.project?.region || "")}</div></td>
      <td>${i.status === "refunded" ? '<span class="badge tone-bad">Qaytarilgan</span>' : statusBadge(i.project?.status)}</td>
      <td class="num">${num(i.amount)}</td><td class="num">${i.sharePercent}%</td>
      <td style="min-width:160px">${i.project ? `<div class="progress"><span style="width:${i.project.percent}%"></span></div><div class="small muted">${i.project.percent}%</div>` : ""}</td>
      <td class="num">${i.status === "active" ? num(i.expectedIncome) : "—"}</td><td class="num">${i.payout ? `<b style="color:var(--green-700)">${num(i.payout)}</b>` : "—"}</td></tr>`).join("")}
    </tbody></table></div>` : `<div class="card empty"><div class="ico">🌱</div><p>Hali investitsiya kiritmagansiz.</p><a class="btn" href="#/projects">Loyiha tanlash</a></div>`;

  if (tab === "overview") {
    content = `<div class="row between mb-2"><h2 class="mb-0">Investor kabineti</h2><div class="row"><button class="btn btn-sun" data-deposit>+ Hisobni to'ldirish</button><button class="btn btn-outline" data-withdraw>Yechib olish</button></div></div>
      <div class="kpis">${kpi(money(s.balance), "Mavjud mablag'", true)}${kpi(money(s.invested), "Faol investitsiyalar")}${kpi(money(s.expectedIncome), "Kutilayotgan daromad")}${kpi(money(s.received), "Olingan daromad")}${kpi(s.projects, "Loyihalar soni")}</div>
      <div class="row between mt-4 mb-2"><h3 class="mb-0">So'nggi investitsiyalar</h3><a href="#/projects" class="btn btn-sm">+ Yangi investitsiya</a></div>
      ${invRows(d.investments.slice(0, 5))}`;
  } else if (tab === "investments") {
    content = `<h2>Investitsiya qilingan loyihalar</h2>${invRows(d.investments)}`;
  } else if (tab === "monitoring") {
    const projects = [...new Map(d.investments.filter((i) => i.project).map((i) => [i.projectId, i.project])).values()];
    content = `<h2>Loyiha bo'yicha monitoring</h2>` + (projects.length ? (await Promise.all(projects.map(async (p) => {
      const full = await api("getProject", { id: p.id });
      return `<div class="card mb-2"><div class="row between"><h3 class="mb-0"><a href="#/project/${p.id}">${esc(p.title)}</a></h3>${statusBadge(p.status)}</div>${statusTrack(p.status)}<div class="mt-3">${timeline(full.updates.slice(0, 5))}</div></div>`;
    }))).join("") : `<div class="card empty"><p>Monitoring ma'lumotlari investitsiya kiritilgan loyihalar bo'yicha ko'rinadi.</p></div>`);
  } else if (tab === "transactions") {
    const paid = d.investments.filter((i) => i.status === "paid");
    content = `<h2>Hosil va daromad taqsimoti</h2>
      ${paid.length ? `<div class="table-wrap mb-2"><table class="data"><thead><tr><th>Loyiha</th><th class="num">Kiritilgan</th><th class="num">Olingan</th><th class="num">Foyda</th></tr></thead><tbody>${paid.map((i) => `<tr><td>${esc(i.project?.title)}</td><td class="num">${num(i.amount)}</td><td class="num">${num(i.payout)}</td><td class="num" style="color:var(--green-700);font-weight:700">${i.payout - i.amount >= 0 ? "+" : ""}${num(i.payout - i.amount)} (${(((i.payout - i.amount) / i.amount) * 100).toFixed(1)}%)</td></tr>`).join("")}</tbody></table></div>` : `<div class="info-box mb-2">Hali yakunlangan loyihalar bo'yicha daromad taqsimlanmagan.</div>`}
      <h3 class="mt-3">Barcha operatsiyalar</h3>${txTable(d.transactions)}`;
  } else if (tab === "profile") {
    content = profileHtml();
  }
  app().innerHTML = dashShell(items, tab, content);
  $("[data-deposit]")?.addEventListener("click", () => depositModal());
  $("[data-withdraw]")?.addEventListener("click", withdrawModal);
  if (tab === "profile") bindProfile();
}

function profileHtml() {
  const u = state.user;
  const f = u.farm || {};
  return `<h2>Profil</h2>
  <div class="card"><form class="form" id="profile-form">
    <h3>Shaxsiy ma'lumotlar</h3>
    <div class="form-grid">
      <label class="field">Ism-familiya<input name="name" value="${esc(u.name)}" /></label>
      <label class="field">Telefon<input name="phone" value="${esc(u.phone)}" /></label>
      <label class="field">Email<input value="${esc(u.email)}" disabled /></label>
      <label class="field">Ro'yxatdan o'tgan sana<input value="${date(u.createdAt)}" disabled /></label>
    </div>
    ${u.role === "farmer" ? `<div class="form-section"><h3>Xo'jalik ma'lumotlari</h3><div class="form-grid">
      <label class="field full">Xo'jalik nomi<input name="farm_name" value="${esc(f.name)}" /></label>
      <label class="field">Xo'jalik turi<input name="farm_type" value="${esc(f.type)}" /></label>
      <label class="field">Viloyat<select name="farm_region"><option value="">—</option>${settings().regions.map((r) => `<option ${r === f.region ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></label>
      <label class="field">Tuman<input name="farm_district" value="${esc(f.district)}" /></label>
      <label class="field">Yer maydoni (ga)<input name="farm_area" type="number" step="0.1" value="${esc(f.area)}" /></label>
      <label class="field">Tajriba (yil)<input name="farm_experience" type="number" value="${esc(f.experience)}" /></label>
      <label class="field">STIR (INN)<input name="farm_inn" value="${esc(f.inn)}" /></label>
      <label class="field full">Xo'jalik haqida<textarea name="farm_about">${esc(f.about)}</textarea></label>
      <div class="full small muted">Reyting: ${stars(u.rating)} · Holat: ${u.verified ? "✅ tasdiqlangan" : "⏳ tasdiqlanmagan"}</div>
    </div></div>` : ""}
    <div class="error-box" data-error hidden></div>
    <div><button class="btn">Saqlash</button></div>
  </form></div>
  <div class="card mt-2"><form class="form" id="pw-form"><h3>Parolni o'zgartirish</h3><div class="form-grid">
    <label class="field">Joriy parol<input name="oldPassword" type="password" required /></label>
    <label class="field">Yangi parol<input name="newPassword" type="password" minlength="6" required /></label></div>
    <div class="error-box" data-error hidden></div><div><button class="btn btn-outline">Parolni yangilash</button></div></form></div>`;
}

function bindProfile() {
  const form = $("#profile-form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(form);
    const payload = { name: d.name, phone: d.phone };
    if (state.user.role === "farmer") payload.farm = { name: d.farm_name, type: d.farm_type, region: d.farm_region, district: d.farm_district, area: d.farm_area, experience: d.farm_experience, inn: d.farm_inn, about: d.farm_about };
    await busy(e.submitter, async () => {
      try { state.user = (await api("updateProfile", payload)).user; toast("Ma'lumotlar saqlandi"); renderNavAuth(); }
      catch (err) { showFormError(form, err.message); }
    });
  };
  const pw = $("#pw-form");
  pw.onsubmit = async (e) => {
    e.preventDefault();
    await busy(e.submitter, async () => {
      try { await api("changePassword", formData(pw)); pw.reset(); toast("Parol yangilandi"); }
      catch (err) { showFormError(pw, err.message); }
    });
  };
}

async function farmerCabinet(tab, id) {
  const d = await api("farmerDashboard");
  state.user = d.user;
  const s = d.summary;
  const items = [["overview", "📊 Umumiy ko'rinish"], ["projects", "🌱 Yuborilgan loyihalar", d.projects.length], ["new", "➕ Yangi loyiha"], ["monitoring", "📷 Monitoring"], ["transactions", "🧾 Operatsiyalar"], ["profile", "👤 Shaxsiy va xo'jalik ma'lumotlari"]];
  const projRows = (list) => list.length ? `<div class="grid">${list.map((p) => `
    <div class="card-flat"><div class="row between"><div><h3 class="mb-0">${cropIcon(p.crop)} ${esc(p.title)}</h3><div class="small muted">${esc(p.region)} · yuborilgan: ${date(p.submittedAt || p.createdAt)}</div></div>${statusBadge(p.status)}</div>
      ${p.adminNote ? `<div class="${p.status === "rejected" ? "error-box" : "info-box"} mt-2 small"><b>Administrator izohi:</b> ${esc(p.adminNote)}</div>` : ""}
      ${p.status === "pending" ? `<div class="warn-box mt-2 small">⏳ Loyiha administrator tekshiruvida. Tasdiqlangandan so'ng investorlar uchun e'lon qilinadi.</div>` : ""}
      ${["funding", "funded", "in_progress", "harvest", "completed"].includes(p.status) ? `<div class="mt-2">${progress(p)}</div>${statusTrack(p.status)}` : ""}
      <div class="row mt-2">
        <a class="btn btn-sm btn-outline" href="#/project/${p.id}">Ko'rish</a>
        ${["pending", "rejected"].includes(p.status) ? `<a class="btn btn-sm btn-outline" href="#/cabinet/edit/${p.id}">✏️ Tahrirlash</a>` : ""}
        ${MONITOR_STATUSES.includes(p.status) ? `<a class="btn btn-sm" href="#/cabinet/monitoring/${p.id}">📷 Monitoring qo'shish</a>` : ""}
        <span class="small muted grow right">${p.investors} investor · ${p.updates.length} monitoring yozuvi</span>
      </div></div>`).join("")}</div>` : `<div class="card empty"><div class="ico">🌱</div><p>Hali loyiha joylashtirmagansiz.</p><a class="btn" href="#/cabinet/new">Yangi loyiha</a></div>`;

  let content = "";
  if (tab === "overview") {
    content = `<div class="row between mb-2"><h2 class="mb-0">Fermer kabineti</h2><a class="btn btn-sun" href="#/cabinet/new">+ Loyiha joylashtirish</a></div>
      ${!state.user.farm?.name ? `<div class="warn-box mb-2">Xo'jalik ma'lumotlarini to'ldiring — bu investorlar ishonchini oshiradi. <a href="#/cabinet/profile">To'ldirish →</a></div>` : ""}
      <div class="kpis">${kpi(money(s.balance), "Hisobdagi mablag'", true)}${kpi(s.projects, "Jami loyihalar")}${kpi(s.pending, "Tekshiruvda")}${kpi(s.active, "Faol loyihalar")}${kpi(money(s.raised), "Jalb qilingan mablag'")}</div>
      <h3 class="mt-4">Loyihalarim</h3>${projRows(d.projects.slice(0, 4))}`;
  } else if (tab === "projects") {
    content = `<div class="row between mb-2"><h2 class="mb-0">Yuborilgan loyihalar</h2><a class="btn" href="#/cabinet/new">+ Yangi loyiha</a></div>${projRows(d.projects)}`;
  } else if (tab === "new" || tab === "edit") {
    let p = {};
    if (tab === "edit") p = (await api("farmerProject", { id })).project;
    const isEdit = tab === "edit";
    content = `<h2>${isEdit ? "Loyihani tahrirlash" : "Yangi loyiha joylashtirish"}</h2>
      <div class="info-box mb-2">Loyiha ma'lumotlarini to'liq kiriting va «Yuborish» tugmasini bosing. Loyiha avval administrator tomonidan tekshiriladi, tasdiqlangandan so'ng investorlar uchun e'lon qilinadi.</div>
      <div class="card">${projectFormHtml(p, settings())}<div class="row mt-3"><button class="btn btn-lg" data-submit>📤 Yuborish</button><a class="btn btn-ghost" href="#/cabinet/projects">Bekor qilish</a></div></div>`;
    app().innerHTML = dashShell(items, isEdit ? "projects" : "new", content);
    const form = $("#project-form");
    bindProjectForm(form);
    $("[data-submit]").onclick = (e) => busy(e.currentTarget, async () => {
      try {
        await api(isEdit ? "updateProject" : "createProject", { ...(isEdit ? { id } : {}), ...readProjectForm(form) });
        toast("Loyiha yuborildi! Administrator tekshiruvidan so'ng e'lon qilinadi");
        go("/cabinet/projects");
      } catch (err) { showFormError(form, err.message); }
    });
    return;
  } else if (tab === "monitoring") {
    const eligible = d.projects.filter((p) => MONITOR_STATUSES.includes(p.status));
    const sel = eligible.find((p) => p.id === id) || eligible[0];
    const withUpdates = d.projects.filter((p) => p.updates.length);
    content = `<h2>Monitoring</h2>
      ${sel ? `<div class="card"><h3>Monitoring qo'shish — foto / video / loyiha holati</h3>
        <form class="form" id="upd-form">
          <div class="form-grid">
            <label class="field full">Loyiha<select name="projectId">${eligible.map((p) => `<option value="${p.id}" ${p === sel ? "selected" : ""}>${esc(p.title)}</option>`).join("")}</select></label>
            <label class="field">Sarlavha<input name="title" required placeholder="Masalan: Ko'chatlar ekildi" /></label>
            <label class="field">Bosqich<select name="stage"><option>Tayyorgarlik</option><option>Ekish</option><option>Parvarish</option><option>Hosil yig'ish</option><option>Sotish</option></select></label>
            <label class="field full">Loyiha holati haqida<textarea name="text" placeholder="Nima ishlar bajarildi, mablag' qanday sarflandi…"></textarea></label>
            <label class="field">Foto (6 tagacha)<input type="file" accept="image/*" multiple data-photos /></label>
            <label class="field">Video havolasi (YouTube yoki .mp4)<input name="video" type="url" placeholder="https://youtube.com/…" /></label>
            <div class="img-thumbs full" data-thumbs></div>
          </div>
          <div class="error-box" data-error hidden></div>
          <div><button class="btn">Monitoringni qo'shish</button></div>
        </form></div>` : `<div class="info-box">Monitoring loyiha 100% moliyalashtirilgandan so'ng qo'shiladi.</div>`}
      ${withUpdates.map((p) => `<div class="card mt-2"><div class="row between"><h3 class="mb-0">${esc(p.title)}</h3>${statusBadge(p.status)}</div><div class="mt-2">${timeline(p.updates)}</div></div>`).join("")}`;
  } else if (tab === "transactions") {
    content = `<div class="row between mb-2"><h2 class="mb-0">Operatsiyalar</h2><button class="btn btn-outline" data-withdraw ${s.balance ? "" : "disabled"}>Mablag'ni yechib olish</button></div>
      <div class="kpis mb-2">${kpi(money(s.balance), "Hisobdagi mablag'", true)}</div>${txTable(d.transactions)}`;
  } else if (tab === "profile") {
    content = profileHtml();
  }
  app().innerHTML = dashShell(items, tab, content);
  $("[data-withdraw]")?.addEventListener("click", withdrawModal);
  if (tab === "profile") bindProfile();
  const uf = $("#upd-form");
  if (uf) {
    let photos = [];
    $("[data-photos]", uf).onchange = async (e) => {
      try {
        photos = await Promise.all([...e.target.files].slice(0, 6).map((f) => compressImage(f, 1024, 0.65)));
        $("[data-thumbs]", uf).innerHTML = photos.map((src) => `<img src="${src}" alt="" />`).join("");
      } catch (err) { toast(err.message, "err"); }
    };
    uf.onsubmit = async (e) => {
      e.preventDefault();
      await busy(e.submitter, async () => {
        try { await api("addUpdate", { ...formData(uf), images: photos }); toast("Monitoring qo'shildi — investorlar ko'ra oladi"); route(); }
        catch (err) { showFormError(uf, err.message); }
      });
    };
  }
}

// ---------------------------------------------------------------------------
// Ishga tushirish

async function init() {
  $("#year").textContent = new Date().getFullYear();
  $(".nav-toggle").onclick = () => $("#main-nav").classList.toggle("open");
  if (hasToken()) {
    try { state.user = (await api("me")).user; } catch { setToken(null); }
  }
  try { await refreshBoot(); } catch (e) { console.error(e); }
  if (getMode() === "demo") {
    const b = $("#demo-banner");
    b.hidden = false;
    b.innerHTML = `Demo rejim: server ulanmagan, ma'lumotlar faqat shu brauzerda saqlanadi. <a href="#" data-reset>Demo ma'lumotlarni tiklash</a>`;
    $("[data-reset]", b).onclick = async (e) => {
      e.preventDefault();
      if (await confirmDlg("Barcha demo ma'lumotlar boshlang'ich holatga qaytariladi.")) { resetDemo(); location.hash = "#/"; location.reload(); }
    };
  }
  document.addEventListener("click", (e) => { const img = e.target.closest("[data-zoom]"); if (img) showImage(img.src); });
  window.addEventListener("hashchange", route);
  route();
}

init();
