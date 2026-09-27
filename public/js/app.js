// Agricrowd.uz — asosiy ilova: sarlavha, marshrutlash, ommaviy sahifalar, kirish/ro'yxatdan o'tish
import { api, getMode, setToken, hasToken, resetDemo } from "./store.js";
import { STATUSES } from "./core.js";
import { t, tv, tc, LANGS, getLang, setLang, flagSvg, contentText } from "./i18n.js";
import {
  $, $$, esc, te, num, money, short, date, dateTime, daysLeft, statusBadge, cropIcon, cover, progress, stars, place,
  toast, modal, confirmDlg, formData, busy, timeline, statusTrack, showImage, showFormError,
} from "./ui.js";
import { state, app, settings, refreshBoot, go, query, initials, setRerender } from "./state.js";
import { renderCabinet, depositModal } from "./cabinet.js";
import { renderAdmin } from "./admin.js";

// ---------------------------------------------------------------------------
// Ikonkalar

export const ICON = {
  mail: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h17A1.5 1.5 0 0 1 22 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18.5zm2.2.5 7.8 6.1L19.8 6zM20 7.9l-7.4 5.8a1 1 0 0 1-1.2 0L4 7.9V18h16z"/></svg>`,
  search: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5" stroke-linecap="round"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" stroke-linejoin="round"/><path d="M10 20a2 2 0 0 0 4 0" stroke-linecap="round"/></svg>`,
  user: `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0" stroke-linecap="round"/></svg>`,
  caret: `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M7 10l5 5 5-5z"/></svg>`,
  check: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M4 12h15m-5-6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

const NAV = [
  ["/", "Bosh sahifa", "home"],
  ["/projects", "Loyihalar", "projects"],
  ["/investor", "Investor bo'lish", "investor"],
  ["/farmer", "Loyiha joylashtirish", "farmer"],
  ["/how", "Qanday ishlaydi?", "how"],
  ["/news", "Yangiliklar", "news"],
  ["/about", "Biz haqimizda", "about"],
];

let activeNav = "home";

// ---------------------------------------------------------------------------
// Sarlavha (header) va pastki qism (footer)

function langSwitcher() {
  const cur = LANGS.find((l) => l.code === getLang());
  return `<div class="lang">
    <button class="lang-btn" aria-haspopup="listbox" aria-expanded="false" data-lang-btn title="${te("Tilni tanlang")}">
      <span class="flag">${flagSvg(cur.code)}</span><span class="lang-name">${esc(cur.short)}</span>${ICON.caret}
    </button>
    <ul class="lang-menu" role="listbox" hidden>
      ${LANGS.map((l) => `<li role="option" aria-selected="${l.code === cur.code}"><button data-lang="${l.code}" class="${l.code === cur.code ? "on" : ""}"><span class="flag">${flagSvg(l.code)}</span><span>${esc(l.name)}</span>${l.code === cur.code ? ICON.check : ""}</button></li>`).join("")}
    </ul>
  </div>`;
}

function authLinks() {
  const u = state.user;
  if (!u) return `<a class="top-link" href="#/login">${te("Kirish")}</a><a class="top-link" href="#/register">${te("Ro'yxatdan o'tish")}</a>`;
  const link = u.role === "admin" ? "#/admin" : "#/cabinet";
  return `<a class="top-link top-user" href="${link}"><span class="avatar sm">${esc(initials(u.name))}</span>${esc(u.name.split(" ")[0])}</a><button class="top-link" data-logout>${te("Chiqish")}</button>`;
}

export function renderChrome() {
  const s = settings();
  const u = state.user;
  const cabinet = u ? (u.role === "admin" ? "#/admin" : "#/cabinet") : "#/login";
  $("#site-header").innerHTML = `
    <div class="topbar"><div class="container topbar-inner">
      <nav class="top-nav" aria-label="${te("Asosiy menyu")}">${NAV.map(([href, label, key]) => `<a href="#${href}" class="${key === activeNav ? "active" : ""}">${te(label)}</a>`).join("")}</nav>
      <div class="top-right">
        <a class="top-mail" href="mailto:${esc(s.contactEmail)}">${ICON.mail}<span>${esc(s.contactEmail)}</span></a>
        <span class="top-sep"></span>
        ${langSwitcher()}
        <span class="top-sep"></span>
        <span class="top-auth">${authLinks()}</span>
      </div>
    </div></div>
    <div class="mainbar"><div class="container mainbar-inner">
      <a href="#/" class="logo" aria-label="Agricrowd.uz"><img src="/img/logo.svg" alt="" width="34" height="34" /><span>Agricrowd<b>.uz</b></span></a>
      <form class="search" role="search" data-search><input name="q" type="search" placeholder="${te("Qidirish...")}" aria-label="${te("Loyihalarni qidirish")}" /><button aria-label="${te("Qidirish")}">${ICON.search}</button></form>
      <div class="mainbar-right">
        ${u ? `<button class="icon-btn" data-bell aria-label="${te("Bildirishnomalar")}">${ICON.bell}${state.unread ? `<span class="dot-count">${state.unread > 9 ? "9+" : state.unread}</span>` : ""}</button>` : ""}
        <a class="icon-btn" href="${cabinet}" aria-label="${te(u ? "Shaxsiy kabinet" : "Kirish")}" title="${te(u ? "Shaxsiy kabinet" : "Kirish")}">${ICON.user}</a>
        <a class="btn-contact" href="#/contact">${te("Biz bilan bog'lanish")}</a>
        <button class="nav-toggle" aria-label="${te("Menyu")}" data-menu>☰</button>
      </div>
    </div></div>
    <div class="mobile-menu" hidden>
      <div class="container">
        ${NAV.map(([href, label, key]) => `<a href="#${href}" class="${key === activeNav ? "active" : ""}">${te(label)}</a>`).join("")}
        <a href="#/contact">${te("Biz bilan bog'lanish")}</a>
        <div class="mobile-auth">${authLinks()}</div>
      </div>
    </div>`;

  $("#site-footer").innerHTML = `
    <div class="container footer-grid">
      <div>
        <a href="#/" class="logo logo-light"><img src="/img/logo.svg" alt="" width="30" height="30" /><span>Agricrowd<b>.uz</b></span></a>
        <p>${te("Sabzavot yetishtirish loyihalarini moliyalashtirish platformasi. Fermer — loyiha va mahsulot, investor — moliyaviy resurs, Agricrowd.uz — ularni bog'lash, tekshirish va monitoring.")}</p>
      </div>
      <div><h4>${te("Platforma")}</h4>${NAV.slice(1).map(([href, label]) => `<a href="#${href}">${te(label)}</a>`).join("")}</div>
      <div><h4>${te("Foydalanuvchilarga")}</h4>
        <a href="#/register?role=investor">${te("Investor sifatida ro'yxatdan o'tish")}</a>
        <a href="#/register?role=farmer">${te("Fermer sifatida ro'yxatdan o'tish")}</a>
        <a href="#/how">${te("Ko'p so'raladigan savollar")}</a>
        <a href="#/contact">${te("Biz bilan bog'lanish")}</a>
      </div>
      <div><h4>${te("Aloqa")}</h4>
        <a href="tel:${esc(s.contactPhone?.replace(/\s/g, ""))}">☎ ${esc(s.contactPhone)}</a>
        <a href="mailto:${esc(s.contactEmail)}">✉ ${esc(s.contactEmail)}</a>
        ${s.telegram ? `<a href="${esc(s.telegram.startsWith("http") ? s.telegram : "https://t.me/" + s.telegram.replace("@", ""))}" target="_blank" rel="noopener">✈ Telegram</a>` : ""}
        <span>📍 ${esc(tc(s.address))}</span>
      </div>
    </div>
    <div class="container footer-bottom"><span>© ${new Date().getFullYear()} Agricrowd.uz. ${te("Barcha huquqlar himoyalangan.")}</span><span class="pay-logos">Payme · Click · Uzum · Uzcard · Humo</span></div>`;
}

// Sarlavhadagi hodisalar (bir marta ulanadi)
function bindChrome() {
  document.addEventListener("click", async (e) => {
    const langBtn = e.target.closest("[data-lang-btn]");
    const menu = $(".lang-menu");
    if (langBtn) {
      const open = menu.hidden;
      menu.hidden = !open;
      langBtn.setAttribute("aria-expanded", String(open));
      return;
    }
    if (menu && !e.target.closest(".lang-menu")) menu.hidden = true;
    const pick = e.target.closest("[data-lang]");
    if (pick) {
      setLang(pick.dataset.lang);
      if (state.user) api("updateProfile", { lang: pick.dataset.lang }).catch(() => {});
      route();
      return;
    }
    if (e.target.closest("[data-logout]")) return logout();
    if (e.target.closest("[data-menu]")) { const m = $(".mobile-menu"); m.hidden = !m.hidden; return; }
    if (e.target.closest("[data-bell]")) return toggleBell();
    if (!e.target.closest(".notif-pop")) $(".notif-pop")?.remove();
    const img = e.target.closest("[data-zoom]");
    if (img) showImage(img.src);
  });
  document.addEventListener("submit", (e) => {
    if (!e.target.matches("[data-search]")) return;
    e.preventDefault();
    const q = e.target.q.value.trim();
    go("/projects" + (q ? "?q=" + encodeURIComponent(q) : ""));
  });
}

// Bildirishnomalar oynasi
async function toggleBell() {
  if ($(".notif-pop")) return $(".notif-pop").remove();
  const pop = document.createElement("div");
  pop.className = "notif-pop";
  pop.innerHTML = `<div class="loader small">${te("Yuklanmoqda…")}</div>`;
  $(".mainbar-inner").append(pop);
  try {
    const { notifications } = await api("notifications");
    pop.innerHTML = `<div class="notif-head"><b>${te("Bildirishnomalar")}</b>${notifications.some((n) => !n.read) ? `<button class="link-btn" data-read-all>${te("Hammasini o'qilgan deb belgilash")}</button>` : ""}</div>
      <div class="notif-list">${notifications.slice(0, 8).map(notifItem).join("") || `<p class="muted small" style="padding:16px">${te("Bildirishnomalar yo'q")}</p>`}</div>
      <a class="notif-all" href="#/notifications">${te("Barchasini ko'rish")} →</a>`;
    $("[data-read-all]", pop)?.addEventListener("click", async () => {
      await api("markNotificationsRead", {});
      state.unread = 0;
      pop.remove();
      renderChrome();
    });
  } catch (e) {
    pop.innerHTML = `<p class="small" style="padding:16px">${esc(e.message)}</p>`;
  }
}

export function notifItem(n) {
  return `<a class="notif ${n.read ? "" : "unread"}" href="#${esc(n.link || "/notifications")}" data-notif="${n.id}">
    <b>${esc(t(n.title, n.params))}</b><span>${esc(t(n.body, n.params))}</span><small>${dateTime(n.createdAt)}</small></a>`;
}

async function pageNotifications() {
  if (!state.user) return go("/login?next=/notifications");
  const { notifications } = await api("notifications");
  app().innerHTML = `<div class="container section" style="max-width:820px">
    <div class="row between mb-2"><h1 class="mb-0">${te("Bildirishnomalar")}</h1>${notifications.some((n) => !n.read) ? `<button class="btn btn-outline btn-sm" data-read>${te("Hammasini o'qilgan deb belgilash")}</button>` : ""}</div>
    <div class="card notif-list full">${notifications.map(notifItem).join("") || `<div class="empty"><div class="ico">🔔</div><p>${te("Bildirishnomalar yo'q")}</p></div>`}</div></div>`;
  $("[data-read]")?.addEventListener("click", async () => { await api("markNotificationsRead", {}); state.unread = 0; route(); });
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
  [/^\/news$/, pageNews, "news"],
  [/^\/news\/([\w-]+)$/, pageNewsItem, "news"],
  [/^\/about$/, pageAbout, "about"],
  [/^\/contact$/, pageContact, "contact"],
  [/^\/login$/, pageLogin, "login"],
  [/^\/register$/, pageRegister, "register"],
  [/^\/notifications$/, pageNotifications, "cabinet"],
  [/^\/payment-return$/, pagePaymentReturn, "cabinet"],
  [/^\/cabinet(?:\/([\w-]+))?(?:\/([\w-]+))?$/, (tab, id) => renderCabinet(tab, id), "cabinet"],
  [/^\/admin(?:\/([\w-]+))?(?:\/([\w-]+))?$/, (tab, id) => renderAdmin(tab, id), "admin"],
];

let lastPath = null;
export async function route() {
  const path = location.hash.replace(/^#/, "").split("?")[0] || "/";
  $(".notif-pop")?.remove();
  for (const [re, fn, nav] of ROUTES) {
    const m = path.match(re);
    if (!m) continue;
    activeNav = nav;
    if (state.user) {
      api("me").then((r) => {
        state.user = r.user;
        if (r.unread !== state.unread) { state.unread = r.unread; renderChrome(); }
      }).catch(() => {});
    }
    renderChrome();
    renderDemoBanner();
    try {
      await fn(...m.slice(1));
    } catch (e) {
      console.error(e);
      app().innerHTML = `<div class="container section"><div class="card empty"><div class="ico">⚠️</div><h2>${te("Xatolik")}</h2><p>${esc(e.message)}</p><a class="btn" href="#/">${te("Bosh sahifaga")}</a></div></div>`;
    }
    if (path !== lastPath) window.scrollTo(0, 0);
    lastPath = path;
    return;
  }
  app().innerHTML = `<div class="container section"><div class="card empty"><div class="ico">🔍</div><h2>${te("Sahifa topilmadi")}</h2><a class="btn" href="#/">${te("Bosh sahifaga")}</a></div></div>`;
}

function logout() {
  setToken(null);
  state.user = null;
  state.unread = 0;
  toast(t("Tizimdan chiqdingiz"));
  go("/");
  renderChrome();
}

// ---------------------------------------------------------------------------
// Loyiha kartasi

export function projectCard(p) {
  const left = daysLeft(p.fundingDeadline);
  const deadline = p.status === "funding" && left !== null ? `<span>⏳ ${left > 0 ? te("{n} kun qoldi", { n: left }) : te("muddat tugadi")}</span>` : "";
  return `<article class="project-card">
    ${cover(p, `<span style="position:absolute;top:12px;left:12px">${statusBadge(p.status)}</span>`)}
    <div class="project-body">
      <h3>${esc(tc(p.title))}</h3>
      <div class="project-meta"><span>${cropIcon(p.crop)} ${esc(tv(p.crop))}</span><span>📍 ${esc(tv(p.region))}</span>${deadline}</div>
      ${progress(p)}
      <dl class="kv">
        <div><dt>${te("Kerakli mablag'")}</dt><dd>${esc(short(p.goal))}</dd></div>
        <div><dt>${te("Yig'ilgan mablag'")}</dt><dd>${esc(short(p.raised))}</dd></div>
        <div><dt>${te("Loyiha muddati")}</dt><dd>${te("{n} oy", { n: p.durationMonths })}</dd></div>
        <div><dt>${te("Kutilayotgan hosil")}</dt><dd>${p.expectedYield ? te("{n} t", { n: p.expectedYield }) : "—"}</dd></div>
        <div style="grid-column:1/-1"><dt>${te("Investor uchun qaytarish shartlari")}</dt><dd>${te("Daromadning {share}% · kutilayotgan {ret}%", { share: String(p.investorShare), ret: (p.expectedReturn >= 0 ? "+" : "") + p.expectedReturn })}</dd></div>
      </dl>
      <div class="project-footer"><a class="btn" href="#/project/${p.id}">${te("Batafsil")}</a></div>
    </div>
  </article>`;
}

// ---------------------------------------------------------------------------
// Bosh sahifa

async function pageHome() {
  await refreshBoot();
  const { stats, projects, news } = state.boot;
  const s = settings();
  const u = state.user;
  const hero = s.heroImage || "";
  const featured = [...projects.filter((p) => p.featured), ...projects.filter((p) => p.status === "funding"), ...projects].filter((p, i, a) => a.indexOf(p) === i).slice(0, 3);
  const cab = u ? (u.role === "admin" ? "#/admin" : "#/cabinet") : null;
  app().innerHTML = `
  <section class="hero" ${hero ? `style="--hero:url('${esc(hero)}')"` : ""}>
    <div class="hero-inner container">
      <a class="hero-pill" href="#/how"><span class="pill-dot"></span>${esc(contentText(s.content, "heroBadge"))}<span class="pill-link">${te("Batafsil ma'lumot")}${ICON.arrow}</span></a>
      <h1 class="hero-title">${esc(contentText(s.content, "heroTitle") || "Agricrowd")}</h1>
      <p class="hero-sub">${esc(contentText(s.content, "heroSubtitle"))}</p>
      <div class="hero-btns">
        ${u ? `<a class="hbtn hbtn-light" href="${cab}">${te("Shaxsiy kabinet")}</a><a class="hbtn hbtn-mauve" href="#/projects">${te("Loyihalar")}</a>`
          : `<a class="hbtn hbtn-light" href="#/login">${te("Kirish")}</a><a class="hbtn hbtn-mauve" href="#/register">${te("Ro'yxatdan o'tish")}</a>`}
      </div>
    </div>
  </section>

  <div class="container stats-bar"><div class="stats-grid">
    <div><div class="stat-value">${num(stats.projects)}</div><div class="stat-label">${te("E'lon qilingan loyihalar")}</div></div>
    <div><div class="stat-value">${esc(short(stats.totalRaised))}</div><div class="stat-label">${te("Jalb qilingan mablag'")}</div></div>
    <div><div class="stat-value">${num(stats.investors)}</div><div class="stat-label">${te("Investorlar")}</div></div>
    <div><div class="stat-value">${num(stats.farmers)}</div><div class="stat-label">${te("Fermer va dehqonlar")}</div></div>
  </div></div>

  <section class="section"><div class="container">
    <div class="section-head"><div><h2>${te("Moliyalashtirilayotgan loyihalar")}</h2><p>${te("Administrator tomonidan tekshirilib, tasdiqlangan sabzavot yetishtirish loyihalari.")}</p></div><a class="btn btn-outline" href="#/projects">${te("Barcha loyihalar")} →</a></div>
    <div class="project-grid">${featured.map(projectCard).join("") || `<div class="card empty">${te("Hozircha loyihalar yo'q")}</div>`}</div>
  </div></section>

  <section class="section section-alt"><div class="container">
    <div class="triad-grid">
      <div class="triad-card"><div class="ico">👨‍🌾</div><h3>${te("Fermer / dehqon")}</h3><p>${te("Loyiha va mahsulot — sabzavot yetishtirish uchun mablag' jalb qiladi")}</p><a href="#/farmer">${te("Loyiha joylashtirish")} →</a></div>
      <div class="triad-card"><div class="ico">💼</div><h3>${te("Investor")}</h3><p>${te("Moliyaviy resurs — loyihalarga mablag' kiritib, hosildan ulush oladi")}</p><a href="#/investor">${te("Investor bo'lish")} →</a></div>
      <div class="triad-card"><div class="ico">🤝</div><h3>Agricrowd.uz</h3><p>${te("Bog'lash, tekshirish, moliyalashtirishni tashkil etish va monitoring")}</p><a href="#/about">${te("Biz haqimizda")} →</a></div>
    </div>
  </div></section>

  <section class="section"><div class="container">
    <div class="section-head"><div><h2>${te("Qanday ishlaydi?")}</h2><p>${te("Hosil → Sotish → Daromad → Investorlar va fermer o'rtasida taqsimlash.")}</p></div><a class="btn btn-ghost" href="#/how">${te("Batafsil")} →</a></div>
    <div class="steps">
      <div class="step"><h3>${te("Loyiha joylashtiriladi")}</h3><p>${te("Fermer ro'yxatdan o'tib, o'z sabzavot yetishtirish loyihasini kiritadi va yuboradi.")}</p></div>
      <div class="step"><h3>${te("Administrator tekshiradi")}</h3><p>${te("Hujjatlar, garov, sug'urta va shartlar tekshirilib, loyiha e'lon qilinadi.")}</p></div>
      <div class="step"><h3>${te("Investorlar mablag' kiritadi")}</h3><p>${te("Loyiha 100% moliyalashtirilsa — ishga tushadi, aks holda mablag'lar qaytariladi.")}</p></div>
      <div class="step"><h3>${te("Shartnoma imzolanadi")}</h3><p>${te("Investor va fermer shartnomani yuklab olib imzolaydi, imzolangan nusxani saytga joylaydi.")}</p></div>
      <div class="step"><h3>${te("Monitoring")}</h3><p>${te("Loyiha bajarilishi foto, video va holat ma'lumotlari orqali kuzatib boriladi.")}</p></div>
      <div class="step"><h3>${te("Daromad taqsimlanadi")}</h3><p>${te("Hosil sotilgach, daromad shartlar asosida investorlar va fermer o'rtasida taqsimlanadi.")}</p></div>
    </div>
  </div></section>

  <section class="section section-alt"><div class="container">
    <h2>${te("Loyiha kafolati va nazorat")}</h2>
    <div class="grid grid-2 mt-3">
      <div class="feature"><div class="ico">🌾</div><div><h3>${te("Hosil garovi")}</h3><p>${te("Loyiha kelgusi hosil va xo'jalik mol-mulki garovi bilan ta'minlanadi.")}</p></div></div>
      <div class="feature"><div class="ico">🛡️</div><div><h3>${te("Hosil sug'urtasi")}</h3><p>${te("Tabiiy ofatlar va boshqa xavflardan hosil sug'urtalanadi.")}</p></div></div>
      <div class="feature"><div class="ico">💯</div><div><h3>${te("100% moliyalashtirish sharti")}</h3><p>${te("Loyiha to'liq moliyalashtirilmasa, amalga oshirilmaydi va mablag'lar investorlarga qaytariladi.")}</p></div></div>
      <div class="feature"><div class="ico">📝</div><div><h3>${te("Rasmiy shartnoma")}</h3><p>${te("Har bir investitsiya investor va fermer o'rtasidagi imzolangan shartnoma bilan rasmiylashtiriladi.")}</p></div></div>
    </div>
  </div></section>

  ${news.length ? `<section class="section"><div class="container">
    <div class="section-head"><div><h2>${te("Yangiliklar")}</h2></div><a class="btn btn-ghost" href="#/news">${te("Barcha yangiliklar")} →</a></div>
    <div class="grid grid-3">${news.slice(0, 3).map(newsCard).join("")}</div>
  </div></section>` : ""}

  <section class="section" style="padding-top:${news.length ? 0 : 64}px"><div class="container"><div class="cta">
    <div><h2>${te("Qishloq xo'jaligini birga rivojlantiramiz")}</h2><p>${te("Investor sifatida mablag' kiriting yoki fermer sifatida loyihangizni joylashtiring.")}</p></div>
    <div class="row"><a class="btn btn-sun btn-lg" href="#/register?role=investor">${te("Investor bo'lish")}</a><a class="btn btn-light btn-lg" href="#/register?role=farmer">${te("Loyiha joylashtirish")}</a></div>
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
  <section class="page-head"><div class="container"><div class="breadcrumbs"><a href="#/">${te("Bosh sahifa")}</a> / ${te("Loyihalar")}</div><h1>${te("Loyihalar")}</h1><p>${te("Platformaga joylashtirilgan va administrator tomonidan tasdiqlangan sabzavot yetishtirish loyihalari.")}</p></div></section>
  <section class="section" style="padding-top:28px"><div class="container">
    <div class="filters">
      <input type="search" placeholder="🔍 ${te("Qidirish (nomi, fermer)…")}" data-f="q" value="${esc(q.q || "")}" />
      <select data-f="crop"><option value="">${te("Barcha mahsulotlar")}</option>${s.crops.map((c) => `<option value="${esc(c)}" ${q.crop === c ? "selected" : ""}>${esc(tv(c))}</option>`).join("")}</select>
      <select data-f="region"><option value="">${te("Barcha hududlar")}</option>${s.regions.map((c) => `<option value="${esc(c)}" ${q.region === c ? "selected" : ""}>${esc(tv(c))}</option>`).join("")}</select>
      <select data-f="status"><option value="">${te("Barcha holatlar")}</option>${["funding", "funded", "in_progress", "harvest", "completed", "refunded"].map((k) => `<option value="${k}" ${q.status === k ? "selected" : ""}>${te(STATUSES[k].label)}</option>`).join("")}</select>
      <select data-f="sort"><option value="">${te("Saralash: yangi")}</option><option value="percent">${te("Moliyalashtirish darajasi")}</option><option value="return">${te("Kutilayotgan daromad")}</option><option value="goal">${te("Mablag' miqdori")}</option></select>
    </div>
    <p class="muted small" data-count></p>
    <div class="project-grid" data-list></div>
  </div></section>`;
  const draw = () => {
    const f = Object.fromEntries($$("[data-f]").map((el) => [el.dataset.f, el.value]));
    const needle = f.q.toLowerCase();
    let list = projects.filter((p) =>
      (!f.crop || p.crop === f.crop) && (!f.region || p.region === f.region) && (!f.status || p.status === f.status) &&
      (!needle || `${p.title} ${tc(p.title)} ${p.crop} ${tv(p.crop)} ${p.region} ${tv(p.region)} ${p.farmer?.name} ${p.farmer?.farm?.name}`.toLowerCase().includes(needle)));
    if (f.sort === "percent") list.sort((a, b) => b.percent - a.percent);
    if (f.sort === "return") list.sort((a, b) => b.expectedReturn - a.expectedReturn);
    if (f.sort === "goal") list.sort((a, b) => b.goal - a.goal);
    $("[data-count]").textContent = t("{n} ta loyiha topildi", { n: list.length });
    $("[data-list]").innerHTML = list.map(projectCard).join("") || `<div class="card empty" style="grid-column:1/-1"><div class="ico">🌱</div><p>${te("Mos loyiha topilmadi")}</p></div>`;
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
  const row = (k, v) => `<tr><th>${te(k)}</th><td>${v || "—"}</td></tr>`;
  const sign = (n) => (n >= 0 ? "+" : "") + n;

  let action = "";
  if (p.status === "funding") {
    if (!u) action = `<a class="btn btn-lg btn-block" href="#/login?next=/project/${p.id}">${te("Investitsiya kiritish")}</a><p class="small muted mt-1">${te("Investitsiya kiritish uchun investor sifatida tizimga kiring.")}</p>`;
    else if (u.role === "investor") action = `<button class="btn btn-lg btn-block" data-invest>${te("Investitsiya kiritish")}</button>`;
    else action = `<p class="small muted">${te("Investitsiya faqat investor hisobidan kiritiladi.")}</p>`;
  } else if (p.status === "pending") action = `<div class="warn-box">${te("Loyiha administrator tekshiruvida. Tasdiqlangandan keyin investorlar uchun ochiladi.")}</div>`;
  else if (p.status === "rejected") action = `<div class="error-box">${te("Loyiha rad etilgan.")} ${esc(p.adminNote)}</div>`;
  else if (p.status === "refunded") action = `<div class="error-box">${te("Loyiha muddat ichida 100% moliyalashtirilmadi — investorlar mablag'i qaytarildi.")}</div>`;
  else action = `<div class="info-box">✅ ${te("Loyiha 100% moliyalashtirilgan. Mablag' yig'ish yakunlangan.")}</div>`;

  app().innerHTML = `
  <section class="page-head"><div class="container">
    <div class="breadcrumbs"><a href="#/">${te("Bosh sahifa")}</a> / <a href="#/projects">${te("Loyihalar")}</a> / ${esc(tc(p.title))}</div>
    <div class="row" style="margin-bottom:10px">${statusBadge(p.status)}</div>
    <h1>${esc(tc(p.title))}</h1>
    <p>${cropIcon(p.crop)} ${esc(tv(p.crop))} · 📍 ${place(p)} · ${te("{n} ga", { n: p.area })} · ${te("{n} oy", { n: p.durationMonths })}</p>
  </div></section>
  <section class="section" style="padding-top:28px"><div class="container project-layout">
    <div>
      ${p.image ? `<img src="${esc(p.image)}" alt="" class="project-hero-img" data-zoom />` : ""}
      <div class="card">
        <div class="tabs" role="tablist">
          <button class="active" data-tab="about">${te("Loyiha haqida")}</button>
          <button data-tab="finance">${te("Moliyaviy qism")}</button>
          <button data-tab="risk">${te("Kafolat va risklar")}</button>
          <button data-tab="monitor">${te("Monitoring")} (${p.updates.length})</button>
        </div>
        <div data-pane="about">
          ${p.summary ? `<p style="font-size:1.05rem">${esc(tc(p.summary))}</p>` : ""}
          <h3 class="mt-3">${te("Fermer / dehqon xo'jaligi haqida")}</h3>
          <table class="detail-table">
            ${row("Xo'jalik", esc(tc(f.farm?.name || f.name)))}
            ${row("Xo'jalik turi", esc(tv(f.farm?.type)))}
            ${row("Rahbar", esc(f.name) + (f.verified ? ` <span class="badge tone-good">${te("tasdiqlangan")}</span>` : ""))}
            ${row("Tajriba", f.farm?.experience ? te("{n} yil", { n: f.farm.experience }) : "")}
            ${row("Xo'jalik maydoni", f.farm?.area ? te("{n} ga", { n: f.farm.area }) : "")}
          </table>
          ${f.farm?.about ? `<p class="mt-2 muted">${esc(tc(f.farm.about))}</p>` : ""}
          <h3 class="mt-3">${te("Loyiha tafsilotlari")}</h3>
          <table class="detail-table">
            ${row("Nima yetishtiriladi", `${cropIcon(p.crop)} ${esc(tv(p.crop))}`)}
            ${row("Loyiha maydoni", p.area ? te("{n} gektar", { n: p.area }) : "")}
            ${row("Loyiha joylashgan hudud", place(p))}
            ${row("Kerakli mablag'", esc(money(p.goal)))}
            ${row("Loyiha muddati", te("{n} oy", { n: p.durationMonths }))}
          </table>
          <h3 class="mt-3">${te("Ishlab chiqarish rejasi")}</h3>
          <p>${esc(tc(p.plan)) || "—"}</p>
          <h3 class="mt-3">${te("Mablag'dan foydalanish yo'nalishlari")}</h3>
          ${p.usage?.length ? `<table class="detail-table">${p.usage.map((x) => `<tr><th>${esc(tc(x.item))}</th><td>${esc(money(x.amount))}</td></tr>`).join("")}</table>` : `<p>${esc(tc(p.purpose)) || "—"}</p>`}
        </div>
        <div data-pane="finance" hidden>
          <table class="detail-table">
            ${row("Loyihaning umumiy qiymati", p.totalCost ? esc(money(p.totalCost)) : "")}
            ${row("Jalb qilinishi kerak bo'lgan mablag'", esc(money(p.goal)))}
            ${row("Yig'ilgan mablag'", esc(money(p.raised)) + ` (${p.percent}%)`)}
            ${row("Investor mablag'ining foydalanish maqsadi", esc(tc(p.purpose)))}
            ${row("Kutilayotgan hosil", p.expectedYield ? te("{n} tonna", { n: p.expectedYield }) : "")}
            ${row("Kutilayotgan sotish narxi", p.expectedPrice ? te("{n} so'm/kg", { n: p.expectedPrice }) : "")}
            ${row("Hosil realizatsiyasidan olinadigan daromad", esc(money(p.expectedRevenue)))}
            ${row("Investor ulushi", te("daromadning {share}% — {amount}", { share: String(p.investorShare), amount: money(invShare) }))}
            ${row("Kutilayotgan daromadlilik", te("{ret}% ({n} oyda)", { ret: sign(p.expectedReturn), n: p.durationMonths }))}
            ${row("Platforma komissiyasi", te("investorlar ulushidan {n}%", { n: String(s.commission) }))}
            ${row("Mablag'ni qaytarish shartlari", esc(tc(p.returnTerms)))}
            ${row("Moliyalashtirish muddati", date(p.fundingDeadline))}
          </table>
          ${p.distribution ? `<h3 class="mt-3">${te("Yakuniy hisob-kitob")}</h3><table class="detail-table">
            ${row("Hosil realizatsiyasidan tushum", esc(money(p.actualRevenue)))}
            ${row("Investorlar ulushi", esc(money(p.distribution.investorPool)))}
            ${row("Platforma komissiyasi", esc(money(p.distribution.commission)))}
            ${row("Investorlarga to'langan", esc(money(p.distribution.toInvestors)))}
            ${row("Fermer ulushi", esc(money(p.distribution.farmerPart)))}
          </table>` : ""}
          <div class="info-box mt-3">💯 <b>${te("100% moliyalashtirish sharti")}:</b> ${te("agar loyiha belgilangan muddatda 100% moliyalashtirilsa — loyiha ishga tushadi, investor va fermer shartnoma imzolaydi, so'ng mablag' fermerga ajratiladi. Aks holda loyiha amalga oshirilmaydi va investorlarning mablag'lari qaytariladi.")}</div>
        </div>
        <div data-pane="risk" hidden>
          <div class="guarantee"><div class="ico">🌾</div><div><h4 class="mb-0">${te("Hosil garovi")}</h4><p>${esc(tc(p.collateral)) || "—"}</p></div></div>
          <div class="guarantee"><div class="ico">🛡️</div><div><h4 class="mb-0">${te("Sug'urta")}</h4><p>${esc(tc(p.insurance)) || "—"}</p></div></div>
          <div class="guarantee"><div class="ico">📜</div><div><h4 class="mb-0">${te("Kafolat")}</h4><p>${esc(tc(p.guarantee)) || "—"}</p></div></div>
          <div class="guarantee"><div class="ico">⭐</div><div><h4 class="mb-0">${te("Fermerning reytingi / faoliyati")}</h4><p>${stars(f.rating)} · ${te("platformada {total} ta loyiha, {done} tasi muvaffaqiyatli yakunlangan", { total: f.projectsTotal || 0, done: f.projectsCompleted || 0 })}</p></div></div>
          <div class="guarantee"><div class="ico">📷</div><div><h4 class="mb-0">${te("Loyiha monitoringi")}</h4><p>${te("Loyiha moliyalashtirilgandan keyin foto, video va holat ma'lumotlari orqali platforma tomonidan nazorat qilinadi.")}</p></div></div>
          <div class="guarantee" style="border:0"><div class="ico">📁</div><div><h4 class="mb-0">${te("Taqdim etilgan hujjatlar")}</h4><p>${esc(tc(p.documents)) || "—"}</p></div></div>
        </div>
        <div data-pane="monitor" hidden>${statusTrack(p.status)}<div class="mt-3">${timeline(p.updates)}</div></div>
      </div>
    </div>
    <aside class="sticky">
      <div class="card">
        ${progress(p)}
        <dl class="kv mt-2">
          <div><dt>${te("Investorlar")}</dt><dd>${p.investors}</dd></div>
          <div><dt>${te(p.status === "funding" ? "Qolgan muddat" : "Muddat")}</dt><dd>${p.status === "funding" && left !== null ? (left > 0 ? te("{n} kun", { n: left }) : te("tugadi")) : date(p.fundingDeadline)}</dd></div>
          <div><dt>${te("Qolgan summa")}</dt><dd>${esc(short(Math.max(0, p.goal - p.raised)))}</dd></div>
          <div><dt>${te("Kutilayotgan daromad")}</dt><dd style="color:var(--green-700)">${sign(p.expectedReturn)}%</dd></div>
        </dl>
        <div class="mt-3">${action}</div>
        ${myTotal ? `<div class="info-box mt-2">${te("Sizning investitsiyangiz")}: <b>${esc(money(myTotal))}</b></div>` : ""}
        ${statusTrack(p.status)}
      </div>
      <div class="card mt-2">
        <h3>${te("Fermer")}</h3>
        <div class="row"><span class="avatar" style="width:44px;height:44px;font-size:1rem">${esc(initials(f.name))}</span><div><b>${esc(f.name)}</b><div class="small muted">${esc(tc(f.farm?.name || ""))}</div></div></div>
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
    title: t("Investitsiya kiritish"),
    body: `<form class="form" id="inv-form">
      <div class="info-box"><b>${esc(tc(p.title))}</b><br/>${te("Qolgan summa")}: <b>${esc(money(remaining))}</b> · ${te("Hisobingizda")}: <b>${esc(money(balance))}</b></div>
      <label class="field">${te("Investitsiya summasi (so'm)")}<input name="amount" type="number" min="${min}" max="${remaining}" step="any" required value="${Math.min(remaining, Math.max(min, 1_000_000))}" /><small>${te("Minimal")}: ${esc(money(min))}</small></label>
      <div class="row">${[1, 5, 10].map((m) => m * 1e6).filter((v) => v <= remaining).map((v) => `<button type="button" class="btn btn-sm btn-outline" data-set="${v}">${esc(short(v))}</button>`).join("")}<button type="button" class="btn btn-sm btn-outline" data-set="${remaining}">${te("Qolganini to'liq")}</button></div>
      <div class="card-flat" data-preview></div>
      <label class="check small"><input type="checkbox" name="agree" /> ${te("Loyiha shartlari, risklar va 100% moliyalashtirish sharti bilan tanishdim. Loyiha to'liq moliyalashtirilgach, fermer bilan shartnoma imzolashga roziman.")}</label>
      <div class="error-box" data-error hidden></div>
      <div class="row between"><button type="button" class="btn btn-ghost" data-topup>+ ${te("Hisobni to'ldirish")}</button><button class="btn btn-lg">${te("Tasdiqlash")}</button></div>
    </form>`,
    onMount(m, close) {
      const form = $("#inv-form", m);
      const prev = () => {
        const a = Number(form.amount.value) || 0;
        const share = p.goal ? a / p.goal : 0;
        const exp = p.expectedRevenue * (p.investorShare / 100) * (1 - s.commission / 100) * share;
        $("[data-preview]", m).innerHTML = `<div class="small muted">${te("Loyihadagi ulushingiz")}</div><b>${(share * 100).toFixed(2)}%</b><div class="small muted mt-1">${te("Kutilayotgan qaytim (komissiyadan keyin)")}</div><b style="color:var(--green-700)">${esc(money(exp))}</b> <span class="small muted">— ${te("sof foyda {amount}", { amount: money(exp - a) })}</span>`;
      };
      form.addEventListener("input", prev);
      $$("[data-set]", m).forEach((b) => (b.onclick = () => { form.amount.value = b.dataset.set; prev(); }));
      $("[data-topup]", m).onclick = () => { close(); depositModal(); };
      prev();
      form.onsubmit = async (e) => {
        e.preventDefault();
        if (!form.agree.checked) return showFormError(form, t("Shartlar bilan tanishganingizni tasdiqlang"));
        await busy(e.submitter, async () => {
          try {
            const res = await api("invest", { projectId: p.id, amount: Number(form.amount.value) });
            state.user = res.user;
            close();
            toast(res.project.status === "funded" ? t("🎉 Investitsiya qabul qilindi! Loyiha 100% moliyalashtirildi — shartnomani imzolang") : t("Investitsiya muvaffaqiyatli kiritildi"));
            route();
          } catch (err) { showFormError(form, err.message); }
        });
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Ma'lumot sahifalari

function flow(items) {
  return `<div class="flow">${items.map((x, i) => `${i ? '<div class="flow-arrow">↓</div>' : ""}<div class="flow-item ${x.startsWith("!") ? "key" : ""}"><span class="n">${i + 1}</span>${te(x.replace(/^!/, ""))}</div>`).join("")}</div>`;
}
const INVESTOR_FLOW = ["Ro'yxatdan o'tish", "Investor kabineti", "Hisobni to'ldirish", "Loyihalar", "Loyihani tanlash", "Batafsil ma'lumot", "Investitsiya kiritish", "!Loyiha 100% moliyalashtiriladi", "!Shartnoma imzolanadi", "Loyiha amalga oshiriladi", "Foto/video monitoring", "Hosil olinadi", "Hosil sotiladi", "!Daromad taqsimlanadi"];
const FARMER_FLOW = ["Loyiha joylashtirish", "Ro'yxatdan o'tish", "Fermer kabineti", "Yangi loyiha", "Loyiha ma'lumotlarini kiritish", "Loyihani yuborish", "!Administrator tekshiruvi", "Tasdiqlash", "Platformada e'lon qilish", "Investorlar mablag' kiritadi", "!100% moliyalashtirish", "!Shartnoma imzolanadi", "Mablag' ajratiladi", "Loyihani amalga oshirish", "Monitoring", "Hosil olish va sotish", "!Daromadni taqsimlash"];

function pageHead(crumb, title, text) {
  return `<section class="page-head"><div class="container"><div class="breadcrumbs"><a href="#/">${te("Bosh sahifa")}</a> / ${te(crumb)}</div><h1>${te(title)}</h1>${text ? `<p>${te(text)}</p>` : ""}</div></section>`;
}

function pageInvestorInfo() {
  app().innerHTML = `
  ${pageHead("Investor bo'lish", "Investor bo'lish", "Qishloq xo'jaligi loyihalariga mablag' kiriting va hosil realizatsiyasidan tushgan daromaddan ulush oling.")}
  <section class="section"><div class="container grid grid-2" style="align-items:start">
    <div>
      <h2>${te("Investor uchun imkoniyatlar")}</h2>
      <div class="grid mt-3">
        <div class="feature"><div class="ico">🔎</div><div><h3>${te("Tekshirilgan loyihalar")}</h3><p>${te("Har bir loyiha administrator tomonidan hujjatlar, garov va sug'urta bo'yicha tekshiriladi.")}</p></div></div>
        <div class="feature"><div class="ico">💯</div><div><h3>${te("100% sharti")}</h3><p>${te("Loyiha to'liq moliyalashtirilmasa — mablag'ingiz hisobingizga qaytariladi.")}</p></div></div>
        <div class="feature"><div class="ico">📝</div><div><h3>${te("Rasmiy shartnoma")}</h3><p>${te("Loyiha moliyalashtirilgach, fermer bilan shartnoma imzolanadi va saytda saqlanadi.")}</p></div></div>
        <div class="feature"><div class="ico">📷</div><div><h3>${te("Shaffof monitoring")}</h3><p>${te("Loyihaning holati, foto va video hisobotlarini kabinetingizda kuzatasiz.")}</p></div></div>
        <div class="feature"><div class="ico">💳</div><div><h3>${te("Qulay to'lov")}</h3><p>${te("Hisobni Payme, Click yoki bank o'tkazmasi orqali to'ldirasiz.")}</p></div></div>
        <div class="feature"><div class="ico">💰</div><div><h3>${te("Hosildan daromad")}</h3><p>${te("Hosil sotilgach, daromad kiritgan mablag'ingiz ulushiga mos taqsimlanadi.")}</p></div></div>
      </div>
      <div class="row mt-4"><a class="btn btn-lg" href="#/register?role=investor">${te("Investor sifatida ro'yxatdan o'tish")}</a><a class="btn btn-lg btn-outline" href="#/projects">${te("Loyihalarni ko'rish")}</a></div>
    </div>
    <div class="card"><h3>${te("Investor yo'nalishi")}</h3>${flow(INVESTOR_FLOW)}</div>
  </div></section>`;
}

function pageFarmerInfo() {
  const fields = ["Loyiha nomi", "Yetishtiriladigan sabzavot mahsuloti", "Ishlab chiqarish hududi", "Maydon", "Loyiha qiymati", "Kerakli mablag'", "Mablag'dan foydalanish maqsadi", "Ishlab chiqarish rejasi", "Kutilayotgan hosil", "Kutilayotgan daromad", "Moliyalashtirish muddati", "Qaytarish shartlari", "Garov / kafolat", "Sug'urta ma'lumotlari"];
  app().innerHTML = `
  ${pageHead("Loyiha joylashtirish", "Loyiha joylashtirish", "Sabzavot yetishtiruvchi fermer va dehqon xo'jaliklari uchun — loyihangizni joylashtiring va investorlar mablag'ini jalb qiling.")}
  <section class="section"><div class="container grid grid-2" style="align-items:start">
    <div>
      <h2>${te("Loyihada qanday ma'lumotlar kiritiladi?")}</h2>
      <div class="card-flat mt-2"><ul class="cols-2">${fields.map((x) => `<li>${te(x)}</li>`).join("")}</ul></div>
      <div class="grid mt-3">
        <div class="feature"><div class="ico">📝</div><div><h3>${te("Oson ariza")}</h3><p>${te("Shaxsiy kabinet orqali loyihani kiritib, «Yuborish» tugmasini bosasiz.")}</p></div></div>
        <div class="feature"><div class="ico">✅</div><div><h3>${te("Administrator tekshiruvi")}</h3><p>${te("Loyiha tekshirilib, verifikatsiyadan o'tgach investorlar uchun e'lon qilinadi.")}</p></div></div>
        <div class="feature"><div class="ico">✍️</div><div><h3>${te("Shartnoma")}</h3><p>${te("100% moliyalashtirilgach, har bir investor bilan shartnomani yuklab olib, imzolab (muhr bilan) saytga joylaysiz.")}</p></div></div>
        <div class="feature"><div class="ico">💵</div><div><h3>${te("Mablag' ajratilishi")}</h3><p>${te("Shartnomalar tasdiqlangach, yig'ilgan mablag' ishlab chiqarish uchun hisobingizga ajratiladi.")}</p></div></div>
      </div>
      <div class="row mt-4"><a class="btn btn-lg" href="${state.user?.role === "farmer" ? "#/cabinet/new" : "#/register?role=farmer"}">${te("Loyiha joylashtirish")}</a></div>
    </div>
    <div class="card"><h3>${te("Fermer / dehqon yo'nalishi")}</h3>${flow(FARMER_FLOW)}</div>
  </div></section>`;
}

const FAQ = [
  ["Minimal investitsiya qancha?", "Minimal investitsiya summasi administrator tomonidan belgilanadi (hozir {min} so'm)."],
  ["Loyiha to'liq moliyalashtirilmasa nima bo'ladi?", "Belgilangan muddatda 100% yig'ilmasa, loyiha amalga oshirilmaydi va barcha investorlar mablag'i avtomatik ravishda hisoblariga qaytariladi."],
  ["Shartnoma qanday imzolanadi?", "Loyiha 100% moliyalashtirilgach, investor va fermerga xabar yuboriladi. Ikkala tomon ham kabinetdagi «Shartnomalar» bo'limidan shartnomani PDF shaklida yuklab oladi, imzolaydi (fermer muhr bosadi) va skanerlangan nusxasini saytga yuklaydi. Administrator tekshirib tasdiqlaydi."],
  ["Hisobni qanday to'ldiraman?", "Kabinetdagi «Hamyon» bo'limida Payme, Click yoki bank o'tkazmasi orqali. Bank o'tkazmasida to'lov chekini yuklaysiz va administrator tasdiqlaydi."],
  ["Daromad qachon to'lanadi?", "Hosil sotilgach, haqiqiy tushum asosida investorlar ulushi hisoblanadi va hisobingizga o'tkaziladi. Mablag'ni bank kartangizga yechib olishingiz mumkin."],
  ["Platforma komissiyasi qancha?", "Platforma investorlar ulushidan {commission}% komissiya oladi. Boshqa yashirin to'lovlar yo'q."],
];

function pageHow() {
  const s = settings();
  app().innerHTML = `
  ${pageHead("Qanday ishlaydi?", "Qanday ishlaydi?", "Agricrowd.uz uch tomonning o'zaro bog'lanishiga qurilgan: fermer/dehqon → loyiha va mahsulot, investor → moliyaviy resurs, Agricrowd.uz → bog'lash, tekshirish, moliyalashtirishni tashkil etish va monitoring.")}
  <section class="section"><div class="container">
    <div class="card mb-2"><h3>${te("Umumiy harakat sxemasi")}</h3>${flow(["Saytga kirish", "Bosh sahifa", "Loyihalar / Investor bo'lish / Loyiha joylashtirish"])}</div>
    <div class="grid grid-2 mt-3" style="align-items:start">
      <div class="card"><h3>💼 ${te("Investor yo'nalishi")}</h3>${flow(INVESTOR_FLOW)}</div>
      <div class="card"><h3>👨‍🌾 ${te("Fermer / dehqon yo'nalishi")}</h3>${flow(FARMER_FLOW)}</div>
    </div>
    <div class="grid grid-3 mt-4">
      <div class="card"><h3>💯 ${te("100% moliyalashtirish sharti")}</h3><p class="mb-0">${te("Loyiha 100% moliyalashtirilsa — ishga tushadi. Moliyalashtirilmasa — loyiha amalga oshirilmaydi va investorlarning mablag'lari qaytariladi.")}</p></div>
      <div class="card"><h3>📝 ${te("Shartnoma")}</h3><p class="mb-0">${te("Investor va fermer shartnomani yuklab olib imzolaydi va imzolangan nusxani saytga joylaydi. Administrator tasdiqlagach, mablag' fermerga ajratiladi.")}</p></div>
      <div class="card"><h3>💰 ${te("Daromad taqsimoti")}</h3><p class="mb-0">${te("Hosil → Sotish → Daromad → Investorlar va fermer o'rtasida taqsimlash. Investor o'z ulushini oladi, platforma belgilangan tartibda komissiya oladi ({n}%).", { n: String(s.commission) })}</p></div>
    </div>
    <h2 class="mt-4" id="faq">${te("Ko'p so'raladigan savollar")}</h2>
    <div class="faq">${FAQ.map(([q, a]) => `<details class="card-flat"><summary>${te(q)}</summary><p>${te(a, { min: s.minInvestment, commission: String(s.commission) })}</p></details>`).join("")}</div>
  </div></section>`;
}

// ---------------------------------------------------------------------------
// Yangiliklar, biz haqimizda, aloqa

function newsCard(n) {
  return `<a class="news-card" href="#/news/${n.id}">
    ${n.image ? `<div class="news-img" style="background-image:url('${esc(n.image)}')"></div>` : `<div class="news-img news-img-empty">📰</div>`}
    <div class="news-body"><small class="muted">${date(n.createdAt)}</small><h3>${esc(tc(n.title))}</h3><p>${esc(tc(n.body).slice(0, 160))}${n.body.length > 160 ? "…" : ""}</p></div></a>`;
}

async function pageNews() {
  await refreshBoot();
  const { news } = state.boot;
  app().innerHTML = `${pageHead("Yangiliklar", "Yangiliklar", "Platforma, loyihalar va qishloq xo'jaligi bo'yicha so'nggi xabarlar.")}
  <section class="section"><div class="container"><div class="grid grid-3">${news.map(newsCard).join("") || `<div class="card empty" style="grid-column:1/-1"><div class="ico">📰</div><p>${te("Hozircha yangiliklar yo'q")}</p></div>`}</div></div></section>`;
}

async function pageNewsItem(id) {
  const { news: n } = await api("getNews", { id });
  app().innerHTML = `<section class="page-head"><div class="container"><div class="breadcrumbs"><a href="#/">${te("Bosh sahifa")}</a> / <a href="#/news">${te("Yangiliklar")}</a></div><h1>${esc(tc(n.title))}</h1><p>${date(n.createdAt)}</p></div></section>
  <section class="section"><div class="container" style="max-width:820px"><article class="card article">
    ${n.image ? `<img src="${esc(n.image)}" alt="" class="article-img" data-zoom />` : ""}
    ${esc(tc(n.body)).split(/\n{2,}/).map((para) => `<p>${para.replace(/\n/g, "<br/>")}</p>`).join("")}
  </article><a class="btn btn-ghost mt-2" href="#/news">← ${te("Barcha yangiliklar")}</a></div></section>`;
}

async function pageAbout() {
  await refreshBoot();
  const s = settings();
  const { stats } = state.boot;
  app().innerHTML = `${pageHead("Biz haqimizda", "Biz haqimizda", "")}
  <section class="section"><div class="container grid grid-2" style="align-items:start">
    <div class="card article">${esc(contentText(s.content, "about")).split(/\n{2,}/).map((x) => `<p>${x.replace(/\n/g, "<br/>")}</p>`).join("")}</div>
    <div>
      <div class="kpis">
        <div class="kpi accent"><div class="v">${num(stats.projects)}</div><div class="l">${te("E'lon qilingan loyihalar")}</div></div>
        <div class="kpi"><div class="v">${esc(short(stats.totalRaised))}</div><div class="l">${te("Jalb qilingan mablag'")}</div></div>
        <div class="kpi"><div class="v">${num(stats.investors)}</div><div class="l">${te("Investorlar")}</div></div>
        <div class="kpi"><div class="v">${num(stats.farmers)}</div><div class="l">${te("Fermer va dehqonlar")}</div></div>
      </div>
      <div class="card mt-2"><h3>${te("Aloqa")}</h3>
        <p class="mb-0">☎ <a href="tel:${esc(s.contactPhone?.replace(/\s/g, ""))}">${esc(s.contactPhone)}</a><br/>✉ <a href="mailto:${esc(s.contactEmail)}">${esc(s.contactEmail)}</a><br/>📍 ${esc(tc(s.address))}</p>
        <a class="btn mt-2" href="#/contact">${te("Biz bilan bog'lanish")}</a>
      </div>
    </div>
  </div></section>`;
}

function pageContact() {
  const s = settings();
  const u = state.user;
  app().innerHTML = `${pageHead("Biz bilan bog'lanish", "Biz bilan bog'lanish", "Savol, taklif yoki hamkorlik bo'yicha yozing — tez orada javob beramiz.")}
  <section class="section"><div class="container grid grid-2" style="align-items:start">
    <div class="card"><form class="form" id="contact-form">
      <div class="form-grid">
        <label class="field">${te("Ism")} *<input name="name" required value="${esc(u?.name || "")}" /></label>
        <label class="field">${te("Telefon")}<input name="phone" type="tel" value="${esc(u?.phone || "")}" /></label>
        <label class="field full">${te("Email")}<input name="email" type="email" value="${esc(u?.email || "")}" /></label>
        <label class="field full">${te("Mavzu")}<input name="subject" /></label>
        <label class="field full">${te("Xabar")} *<textarea name="body" required style="min-height:140px"></textarea></label>
      </div>
      <div class="error-box" data-error hidden></div>
      <div><button class="btn btn-lg">${te("Yuborish")}</button></div>
    </form></div>
    <div>
      <div class="card"><h3>${te("Aloqa ma'lumotlari")}</h3>
        <div class="contact-line">☎ <a href="tel:${esc(s.contactPhone?.replace(/\s/g, ""))}">${esc(s.contactPhone)}</a></div>
        <div class="contact-line">✉ <a href="mailto:${esc(s.contactEmail)}">${esc(s.contactEmail)}</a></div>
        ${s.telegram ? `<div class="contact-line">✈ <a href="${esc(s.telegram.startsWith("http") ? s.telegram : "https://t.me/" + s.telegram.replace("@", ""))}" target="_blank" rel="noopener">Telegram</a></div>` : ""}
        <div class="contact-line">📍 ${esc(tc(s.address))}</div>
      </div>
      <div class="card mt-2"><h3>${te("Ko'p so'raladigan savollar")}</h3><p class="mb-0">${te("Ko'p beriladigan savollarga javoblarni «Qanday ishlaydi?» sahifasida topasiz.")}</p><a class="btn btn-outline mt-2" href="#/how">${te("Savollar va javoblar")} →</a></div>
    </div>
  </div></section>`;
  const form = $("#contact-form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    await busy(e.submitter, async () => {
      try {
        await api("sendMessage", formData(form));
        form.reset();
        toast(t("Xabaringiz yuborildi. Rahmat!"));
      } catch (err) { showFormError(form, err.message); }
    });
  };
}

// To'lov tizimidan qaytish sahifasi
async function pagePaymentReturn() {
  if (!state.user) return go("/login");
  const { payments } = await api("myPayments");
  const p = payments.find((x) => x.id === query().id) || payments[0];
  const ok = p?.status === "paid";
  app().innerHTML = `<div class="container section" style="max-width:640px"><div class="card empty">
    <div class="ico">${ok ? "✅" : "⏳"}</div>
    <h2>${te(ok ? "To'lov qabul qilindi" : "To'lov tekshirilmoqda")}</h2>
    <p>${p ? esc(money(p.amount)) : ""}</p>
    <p class="muted">${te(ok ? "Mablag' hisobingizga tushdi." : "To'lov tizimidan tasdiq kelishi bilan hisobingiz to'ldiriladi. Bu bir necha daqiqa olishi mumkin.")}</p>
    <div class="row" style="justify-content:center"><a class="btn" href="#/cabinet/wallet">${te("Hamyon")}</a>${ok ? "" : `<button class="btn btn-outline" data-refresh>${te("Yangilash")}</button>`}</div>
  </div></div>`;
  $("[data-refresh]")?.addEventListener("click", route);
}

// ---------------------------------------------------------------------------
// Kirish va ro'yxatdan o'tish

function afterLogin(res, next) {
  setToken(res.token);
  state.user = res.user;
  go(next || (res.user.role === "admin" ? "/admin" : "/cabinet"));
}

function pageLogin() {
  if (state.user) return go(state.user.role === "admin" ? "/admin" : "/cabinet");
  const next = query().next;
  app().innerHTML = `<div class="container"><div class="auth-wrap card">
    <h2>${te("Kirish")}</h2><p class="muted">${te("Agricrowd.uz hisobingizga kiring")}</p>
    <form class="form" id="login-form">
      <label class="field">${te("Email")}<input name="email" type="email" autocomplete="email" required /></label>
      <label class="field">${te("Parol")}<input name="password" type="password" autocomplete="current-password" required /></label>
      <div class="error-box" data-error hidden></div>
      <button class="btn btn-lg btn-block">${te("Kirish")}</button>
    </form>
    <p class="mt-2 mb-0 small">${te("Hisobingiz yo'qmi?")} <a href="#/register">${te("Ro'yxatdan o'tish")}</a></p>
    <p class="mt-1 mb-0 small muted">${te("Parolni unutdingizmi? Administratorga murojaat qiling:")} <a href="#/contact">${te("Biz bilan bog'lanish")}</a></p>
    ${demoHint()}
  </div></div>`;
  const form = $("#login-form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    await busy(e.submitter, async () => {
      try {
        const res = await api("login", formData(form));
        toast(t("Xush kelibsiz, {name}!", { name: res.user.name }));
        afterLogin(res, next);
      } catch (err) { showFormError(form, err.message); }
    });
  };
  $$("[data-demo]").forEach((b) => (b.onclick = () => { form.email.value = b.dataset.demo; form.password.value = b.dataset.pw; form.requestSubmit(); }));
}

function demoHint() {
  if (!state.boot?.projects?.some((p) => p.id === "p_tomato")) return "";
  return `<div class="card-flat mt-3 small"><b>${te("Demo hisoblar")}</b> (${te("sinov uchun")}):
    <div class="row mt-1"><button class="btn btn-sm btn-outline" data-demo="investor@agricrowd.uz" data-pw="demo123">${te("Investor")}</button><button class="btn btn-sm btn-outline" data-demo="fermer@agricrowd.uz" data-pw="demo123">${te("Fermer")}</button>${getMode() === "demo" ? `<button class="btn btn-sm btn-outline" data-demo="admin@agricrowd.uz" data-pw="Admin123!">${te("Admin")}</button>` : ""}</div></div>`;
}

function pageRegister() {
  if (state.user) return go("/cabinet");
  const q = query();
  let role = q.role === "farmer" || q.role === "investor" ? q.role : "";
  const s = settings();
  app().innerHTML = `<div class="container"><div class="auth-wrap card" style="max-width:640px">
    <h2>${te("Ro'yxatdan o'tish")}</h2><p class="muted">${te("Platformadagi rolingizni tanlang")}</p>
    <div class="role-picker">
      <button type="button" class="role-option" data-role="investor"><span class="ico">💼</span><b>${te("Investor")}</b><span class="small muted">${te("Qishloq xo'jaligi loyihalariga mablag' kiritaman")}</span></button>
      <button type="button" class="role-option" data-role="farmer"><span class="ico">👨‍🌾</span><b>${te("Fermer / dehqon")}</b><span class="small muted">${te("Sabzavot yetishtirish loyihamni joylashtiraman")}</span></button>
    </div>
    <form class="form mt-3" id="reg-form" hidden>
      <div class="form-grid">
        <label class="field full">${te("Ism-familiya")} *<input name="name" required autocomplete="name" /></label>
        <label class="field">${te("Email")} *<input name="email" type="email" required autocomplete="email" /></label>
        <label class="field">${te("Telefon")}<input name="phone" type="tel" placeholder="+998 __ ___ __ __" autocomplete="tel" /></label>
        <label class="field">${te("Parol")} * <small>(${te("kamida 6 belgi")})</small><input name="password" type="password" minlength="6" required autocomplete="new-password" /></label>
        <label class="field">${te("Parolni takrorlang")} *<input name="password2" type="password" required autocomplete="new-password" /></label>
      </div>
      <div data-farm-fields hidden class="form-section"><h3>${te("Xo'jalik ma'lumotlari")}</h3><div class="form-grid">
        <label class="field full">${te("Xo'jalik nomi")}<input name="farm_name" placeholder="${te("«…» fermer xo'jaligi")}" /></label>
        <label class="field">${te("Xo'jalik turi")}<select name="farm_type">${["Fermer xo'jaligi", "Dehqon xo'jaligi", "Tomorqa xo'jaligi", "Agrofirma / MChJ"].map((x) => `<option value="${esc(x)}">${esc(tv(x))}</option>`).join("")}</select></label>
        <label class="field">${te("Viloyat")}<select name="farm_region"><option value="">—</option>${s.regions.map((r) => `<option value="${esc(r)}">${esc(tv(r))}</option>`).join("")}</select></label>
        <label class="field">${te("Tuman")}<input name="farm_district" /></label>
        <label class="field">${te("Yer maydoni (ga)")}<input name="farm_area" type="number" min="0" step="any" /></label>
        <label class="field">${te("Tajriba (yil)")}<input name="farm_experience" type="number" min="0" /></label>
        <label class="field">${te("STIR (INN)")}<input name="farm_inn" /></label>
      </div></div>
      <label class="check small"><input type="checkbox" name="agree" /> ${te("Platformadan foydalanish shartlariga va shaxsiy ma'lumotlarimni qayta ishlashga roziman")}</label>
      <div class="error-box" data-error hidden></div>
      <button class="btn btn-lg btn-block">${te("Ro'yxatdan o'tish")}</button>
    </form>
    <p class="mt-2 mb-0 small">${te("Hisobingiz bormi?")} <a href="#/login">${te("Kirish")}</a></p>
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
    if (d.password !== d.password2) return showFormError(form, t("Parollar mos kelmadi"));
    if (!d.agree) return showFormError(form, t("Foydalanish shartlariga rozilik bildiring"));
    const farm = { name: d.farm_name, type: d.farm_type, region: d.farm_region, district: d.farm_district, area: d.farm_area, experience: d.farm_experience, inn: d.farm_inn };
    await busy(e.submitter, async () => {
      try {
        const res = await api("register", { role, name: d.name, email: d.email, phone: d.phone, password: d.password, farm, lang: getLang() });
        toast(t("Ro'yxatdan o'tdingiz! Shaxsiy kabinetingizga xush kelibsiz"));
        afterLogin(res, role === "farmer" ? "/cabinet/new" : "/cabinet");
      } catch (err) { showFormError(form, err.message); }
    });
  };
}

// ---------------------------------------------------------------------------
// Ishga tushirish

async function init() {
  bindChrome();
  if (hasToken()) {
    try {
      const r = await api("me");
      state.user = r.user;
      state.unread = r.unread;
    } catch { setToken(null); }
  }
  try { await refreshBoot(); } catch (e) { console.error(e); }
  setRerender(route);
  window.addEventListener("hashchange", route);
  route();
}

function renderDemoBanner() {
  if (getMode() === "demo") {
    const b = $("#demo-banner");
    b.hidden = false;
    b.innerHTML = `${te("Demo rejim: server ulanmagan, ma'lumotlar faqat shu brauzerda saqlanadi.")} <a href="#" data-reset>${te("Demo ma'lumotlarni tiklash")}</a>`;
    $("[data-reset]", b).onclick = async (e) => {
      e.preventDefault();
      if (await confirmDlg(t("Barcha demo ma'lumotlar boshlang'ich holatga qaytariladi."))) { resetDemo(); location.hash = "#/"; location.reload(); }
    };
  }
}

init();
