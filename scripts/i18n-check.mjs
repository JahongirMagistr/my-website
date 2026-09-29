// Tarjima qilinadigan barcha o'zbekcha kalitlarni yig'adi → i18n lug'atlaridagi yetishmayotganlarini ko'rsatadi
import fs from "node:fs";
const files = ["app.js", "cabinet.js", "admin.js", "forms.js", "ui.js", "core.js", "store.js", "state.js"].map((f) => "public/js/" + f);
const keys = new Set();
const unesc = (s) => s.replace(/\\"/g, '"').replace(/\\n/g, "\n");
for (const f of files) {
  let src = fs.readFileSync(f, "utf8");
  if (f.endsWith("core.js")) {
    src = src.slice(0, src.indexOf("export async function seed")); // demo ma'lumotlar tarjima qilinmaydi
    src = src.replace(/content: \{[\s\S]*?\n  \},\n\};/, "};"); // ko'p tilli kontent allaqachon tarjima qilingan
  }
  // 1) t("…") / te("…") chaqiruvlari
  for (const m of src.matchAll(/\bte?\(\s*"((?:[^"\\]|\\.)*)"/g)) keys.add(unesc(m[1]));
  // 2) boshqa UI satrlari: bo'sh joy yoki tutuq belgisi bor, kod emas
  for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) {
    const s = unesc(m[1]);
    if (!/[A-Za-z]/.test(s) || /\$\{|[<>;]|=>|===|\|\||&&|^\s|\s$|^[#./@]|^https?:|^data:|^[a-z-]+\/|\bconsole\b|\(\s*\)/.test(s)) continue;
    const uiLike = /^[A-ZĞÜŞÇÖ«📊💼📝📷💳👤🌱➕✅🔔👥📰✉️💰⚙️🕘(!{]/u.test(s) || /\s/.test(s) || /[a-z]['’][a-z]/.test(s);
    if (!uiLike) continue;
    if (/^[a-z_]+(\.[a-z_]+)+$/i.test(s) || /^[A-Z_]+$/.test(s)) continue;
    keys.add(s);
  }
}
const out = [...keys].filter((k) => k.trim()).sort();
const check = (name) => {
  const dict = (await_import(name));
  return out.filter((k) => !(k in dict) && !(k.replace(/^!/, "") in dict));
};
function await_import(p) { const txt = fs.readFileSync(p, "utf8"); return JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1)); }

const missRu = check("public/js/i18n-ru.js"), missEn = check("public/js/i18n-en.js");
const skip = (k) => /^[a-z0-9 :-]+$/.test(k) || /^[Mm]\d/.test(k) || /^(btn|card|row|info-box|warn-box|error-box|kpi|grid|form|field|check|small|muted|container|section|hbtn|flex:|input:|}|toolbar|table-wrap|news-img|pay-status|logo|top-link|avatar|badge|auth-wrap|contract-steps|img-thumbs|hero-inner|loader|kv|mt-|full)/.test(k) || /^\{\w+\}(: \{\w+\})?$/.test(k) || ["AA1234567", "Admin123!", "Agricrowd", "English", "Escape", "SHA-256", "T23:59:59"].includes(k);
for (const [n, list] of [["ru", missRu], ["en", missEn]]) { const real = list.filter((k) => !skip(k)); if (real.length) console.log(n + ":", real); }
console.log(`jami kalitlar: ${out.length}; ru yetishmaydi: ${missRu.length}; en yetishmaydi: ${missEn.length}`);
