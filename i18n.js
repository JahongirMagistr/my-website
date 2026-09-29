// Tillar: O'zbekcha (Lotin) — asosiy, O'zbekcha (Kirill) — avtomatik transliteratsiya, Ruscha, Inglizcha.
// Matnlar o'zbekcha (lotin) kalit sifatida yoziladi: t("Loyihalar") → joriy tildagi tarjima.
import RU from "./i18n-ru.js";
import EN from "./i18n-en.js";

const DICTS = { ru: RU, en: EN };
const KEY = "agricrowd_lang";

let flagSeq = 0;
const FLAGS = {
  uz: () => `<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#fff"/><rect width="30" height="6.4" fill="#0099b5"/><rect y="13.6" width="30" height="6.4" fill="#1eb53a"/><rect y="6.4" width="30" height=".5" fill="#ce1126"/><rect y="13.1" width="30" height=".5" fill="#ce1126"/><circle cx="4.6" cy="3.2" r="2.1" fill="#fff"/><circle cx="5.4" cy="3.2" r="1.8" fill="#0099b5"/><g fill="#fff"><circle cx="8" cy="4.6" r=".45"/><circle cx="9.6" cy="4.6" r=".45"/><circle cx="11.2" cy="4.6" r=".45"/><circle cx="9.6" cy="3.1" r=".45"/><circle cx="11.2" cy="3.1" r=".45"/><circle cx="11.2" cy="1.6" r=".45"/></g></svg>`,
  ru: () => `<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#fff"/><rect y="6.67" width="30" height="6.67" fill="#0039a6"/><rect y="13.33" width="30" height="6.67" fill="#d52b1e"/></svg>`,
  en: () => {
    const id = "uk" + ++flagSeq;
    return `<svg viewBox="0 0 60 30" aria-hidden="true"><clipPath id="${id}s"><path d="M0,0v30h60V0z"/></clipPath><clipPath id="${id}t"><path d="M30,15h30v15zv15H0zH0V0zV0h30z"/></clipPath><g clip-path="url(#${id}s)"><path d="M0,0v30h60V0z" fill="#012169"/><path d="M0,0L60,30M60,0L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0L60,30M60,0L0,30" clip-path="url(#${id}t)" stroke="#c8102e" stroke-width="4"/><path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#c8102e" stroke-width="6"/></g></svg>`;
  },
};

export const LANGS = [
  { code: "uz", name: "O'zbekcha (Lotin)", short: "O'Z", flag: "uz", html: "uz-Latn" },
  { code: "uz-Cyrl", name: "Ўзбекча (Кирилл)", short: "ЎЗ", flag: "uz", html: "uz-Cyrl" },
  { code: "ru", name: "Русский", short: "RU", flag: "ru", html: "ru" },
  { code: "en", name: "English", short: "EN", flag: "en", html: "en" },
];
export const flagSvg = (code) => FLAGS[LANGS.find((l) => l.code === code)?.flag || "uz"]();

// --- O'zbek lotin → kirill transliteratsiyasi --------------------------------
const PROTECT = /(\{[^}]+\}|<[^>]+>|https?:\/\/\S+|[\w.+-]+@[\w-]+\.[\w.]+|Agricrowd(?:\.uz)?|Payme|Click|Uzum(?: Bank)?|Uzcard|Humo|Visa|Mastercard|YouTube|Telegram|CSV|Excel|PDF|JPG|PNG|E-IMZO|Resend|Supabase|Netlify|mp4|ID|STIR|MFO|ATB|MChJ|SMS|\bOK\b)/g;
const APOS = "['’ʻʼ‘`]";
const MULTI = [
  [new RegExp(`O${APOS}`, "g"), "Ў"], [new RegExp(`o${APOS}`, "g"), "ў"],
  [new RegExp(`G${APOS}`, "g"), "Ғ"], [new RegExp(`g${APOS}`, "g"), "ғ"],
  [/SH/g, "Ш"], [/Sh/g, "Ш"], [/sh/g, "ш"], [/CH/g, "Ч"], [/Ch/g, "Ч"], [/ch/g, "ч"],
  [/YO/g, "Ё"], [/Yo/g, "Ё"], [/yo/g, "ё"], [/YU/g, "Ю"], [/Yu/g, "Ю"], [/yu/g, "ю"],
  [/YA/g, "Я"], [/Ya/g, "Я"], [/ya/g, "я"], [/YE/g, "Е"], [/Ye/g, "Е"], [/ye/g, "е"],
];
const SINGLE = { a: "а", b: "б", c: "с", d: "д", f: "ф", g: "г", h: "ҳ", i: "и", j: "ж", k: "к", l: "л", m: "м", n: "н", o: "о", p: "п", q: "қ", r: "р", s: "с", t: "т", u: "у", v: "в", w: "в", x: "х", y: "й", z: "з" };

function translitPart(s) {
  // «e» so'z boshida yoki unlidan keyin — «э», aks holda «е»
  s = s.replace(/(^|[^A-Za-zʻ'’ʼ‘`])E/g, "$1Э").replace(/(^|[^A-Za-zʻ'’ʼ‘`])e/g, "$1э");
  s = s.replace(/([aeiouAEIOU])e/g, "$1э");
  s = s.replace(/ts(?=i[yo])/g, "ц").replace(/TS(?=I[YO])/g, "Ц").replace(/Ts(?=i[yo])/g, "Ц");
  for (const [re, rep] of MULTI) s = s.replace(re, rep);
  s = s.replace(new RegExp(APOS, "g"), "ъ");
  return s.replace(/[A-Za-z]/g, (c) => {
    if (c === "e") return "е";
    if (c === "E") return "Е";
    const low = SINGLE[c.toLowerCase()];
    if (!low) return c;
    return c === c.toLowerCase() ? low : low.toUpperCase();
  });
}

export function translit(text) {
  const s = String(text ?? "");
  let out = "";
  let last = 0;
  for (const m of s.matchAll(PROTECT)) {
    out += translitPart(s.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  return out + translitPart(s.slice(last));
}

// --- Tarjima ---------------------------------------------------------------
const fmtNum = (n) => Math.round(Number(n) || 0).toLocaleString("ru-RU").replace(/[,  ]/g, " ");

function lookup(lang, key) {
  if (lang === "uz" || !key) return key;
  if (lang === "uz-Cyrl") return translit(key);
  return DICTS[lang]?.[key] ?? key;
}

export function translate(lang, key, params) {
  let s = lookup(lang || "uz", String(key ?? ""));
  if (params) {
    s = s.replace(/\{(\w+)\}/g, (m, k) => {
      const v = params[k];
      if (v === undefined || v === null) return m;
      if (typeof v === "number") return fmtNum(v);
      return lang !== "uz" && (DICTS.ru[v] !== undefined) ? lookup(lang, v) : String(v);
    });
  }
  return s;
}

// --- Brauzerdagi joriy til ---------------------------------------------------
let current = "uz";
try {
  const saved = globalThis.localStorage?.getItem(KEY);
  if (LANGS.some((l) => l.code === saved)) current = saved;
  else {
    const nav = (globalThis.navigator?.language || "").toLowerCase();
    if (nav.startsWith("ru")) current = "ru";
    else if (nav.startsWith("en")) current = "en";
  }
} catch { /* localStorage yo'q */ }

export const getLang = () => current;
export function setLang(code) {
  if (!LANGS.some((l) => l.code === code)) return;
  current = code;
  try { localStorage.setItem(KEY, code); } catch { /* ignore */ }
  if (globalThis.document) document.documentElement.lang = LANGS.find((l) => l.code === code).html;
}
if (globalThis.document) document.documentElement.lang = LANGS.find((l) => l.code === current).html;

export const t = (key, params) => translate(current, key, params);

// Ma'lumot qiymatlari (hudud, mahsulot nomi va h.k.): lug'atda bo'lsa tarjima, kirillda — transliteratsiya
export const tv = (value) => {
  if (!value) return value ?? "";
  if (current === "uz") return value;
  if (current === "uz-Cyrl") return translit(value);
  return DICTS[current]?.[value] ?? value;
};

// Foydalanuvchi kiritgan matn: kirill tanlanganda transliteratsiya qilinadi
export const tc = (text) => (current === "uz-Cyrl" ? translit(text) : text ?? "");

// Admin kiritadigan ko'p tilli kontent (bosh sahifa, «Biz haqimizda»)
export function contentText(content, field) {
  if (!content) return "";
  if (current === "uz-Cyrl") return translit(content.uz?.[field] || "");
  return content[current]?.[field] || content.uz?.[field] || "";
}

export const MONTHS = {
  uz: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentyabr", "oktyabr", "noyabr", "dekabr"],
  ru: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
export const MONTHS_SHORT = {
  uz: ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"],
  ru: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
export function formatDate(iso, withTime = false) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  const l = current === "uz-Cyrl" ? "uz" : current;
  let m = MONTHS[l][d.getMonth()];
  if (current === "uz-Cyrl") m = translit(m);
  let s = l === "en" ? `${m} ${d.getDate()}, ${d.getFullYear()}` : l === "ru" ? `${d.getDate()} ${m} ${d.getFullYear()}` : `${d.getDate()}-${m}, ${d.getFullYear()}`;
  if (withTime) s += ` ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return s;
}
export function monthShort(i) {
  const l = current === "uz-Cyrl" ? "uz" : current;
  return current === "uz-Cyrl" ? translit(MONTHS_SHORT.uz[i]) : MONTHS_SHORT[l][i];
}
