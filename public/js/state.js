// Umumiy holat va yordamchilar (sahifalar o'rtasida)
import { api } from "./store.js";
import { $, te } from "./ui.js";

export const state = { user: null, boot: null, unread: 0 };

export const app = () => $("#app");
export const settings = () => state.boot?.settings || { crops: [], regions: [], commission: 5, minInvestment: 500000, content: {}, bank: {} };

export async function refreshBoot() {
  state.boot = await api("bootstrap");
  return state.boot;
}

export function go(path) { location.hash = "#" + path; }

export function query() {
  const q = location.hash.split("?")[1] || "";
  return Object.fromEntries(new URLSearchParams(q));
}

export function requireRole(roles) {
  if (!state.user) {
    go("/login?next=" + encodeURIComponent(location.hash.slice(1)));
    return false;
  }
  if (!roles.includes(state.user.role)) {
    app().innerHTML = `<div class="container section"><div class="card empty"><div class="ico">🔒</div><h2>${te("Ruxsat yo'q")}</h2><p>${te("Bu bo'limga kirish uchun ruxsatingiz yo'q.")}</p><a class="btn" href="#/">${te("Bosh sahifaga")}</a></div></div>`;
    return false;
  }
  return true;
}

export const initials = (n = "") => n.split(/\s+/).map((x) => x[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

// Sahifani qayta chizish (til o'zgarganda, ma'lumot yangilanganda)
let rerender = () => {};
export const setRerender = (fn) => { rerender = fn; };
export const reload = () => rerender();
