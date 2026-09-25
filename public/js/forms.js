// Loyiha joylashtirish formasi (fermer kabineti va admin panelida ishlatiladi)
import { $, $$, esc, formData, compressImage, toast, num } from "./ui.js";

const opt = (list, val) => list.map((x) => `<option ${x === val ? "selected" : ""}>${esc(x)}</option>`).join("");

export function projectFormHtml(p = {}, settings, { farmers = null, admin = false } = {}) {
  const usage = p.usage?.length ? p.usage : [{ item: "", amount: "" }];
  const defDeadline = new Date(Date.now() + 45 * 864e5).toISOString().slice(0, 10);
  return `
  <form class="form" id="project-form" novalidate>
    ${farmers ? `<label class="field">Fermer / dehqon xo'jaligi
      <select name="farmerId" required><option value="">— tanlang —</option>${farmers.map((f) => `<option value="${f.id}" ${f.id === p.farmerId ? "selected" : ""}>${esc(f.name)} — ${esc(f.farm?.name || f.email)}</option>`).join("")}</select></label>` : ""}

    <div class="form-section" style="border:0;padding:0"><h3>1. Loyiha haqida</h3>
    <div class="form-grid">
      <label class="field full">Loyiha nomi *<input name="title" required maxlength="200" value="${esc(p.title)}" placeholder="Masalan: Issiqxonada erta pomidor yetishtirish" /></label>
      <label class="field">Yetishtiriladigan sabzavot mahsuloti *<select name="crop" required><option value="">— tanlang —</option>${opt(settings.crops, p.crop)}</select></label>
      <label class="field">Ishlab chiqarish hududi (viloyat) *<select name="region" required><option value="">— tanlang —</option>${opt(settings.regions, p.region)}</select></label>
      <label class="field">Tuman / aniq manzil<input name="district" value="${esc(p.district)}" placeholder="Masalan: Payariq tumani" /></label>
      <label class="field">Maydon (gektar)<input name="area" type="number" min="0" step="0.01" value="${esc(p.area)}" /></label>
      <label class="field full">Qisqa tavsif<input name="summary" maxlength="300" value="${esc(p.summary)}" placeholder="Loyiha kartasida ko'rinadigan 1 jumla" /></label>
      <label class="field full">Ishlab chiqarish rejasi<textarea name="plan" placeholder="Ekish, parvarish, hosil yig'ish va sotish bosqichlari, muddatlari">${esc(p.plan)}</textarea></label>
      <label class="field full">Loyiha rasmi <small>(ixtiyoriy, JPG/PNG)</small>
        <input type="file" accept="image/*" data-image-input />
        <input type="hidden" name="image" value="${esc(p.image || "")}" />
        <div class="img-thumbs" data-image-preview>${p.image ? `<img src="${esc(p.image)}" alt="" />` : ""}</div>
      </label>
    </div></div>

    <div class="form-section"><h3>2. Moliyaviy qism</h3>
    <div class="form-grid">
      <label class="field">Loyihaning umumiy qiymati (so'm)<input name="totalCost" type="number" min="0" step="any" value="${esc(p.totalCost)}" /></label>
      <label class="field">Jalb qilinishi kerak bo'lgan mablag' (so'm) *<input name="goal" type="number" min="0" step="any" required value="${esc(p.goal)}" /></label>
      <label class="field full">Mablag'dan foydalanish maqsadi<textarea name="purpose" placeholder="Investor mablag'i nimaga sarflanadi">${esc(p.purpose)}</textarea></label>
      <div class="field full">Mablag'dan foydalanish yo'nalishlari (smeta)
        <div data-usage>${usage.map(usageRow).join("")}</div>
        <div class="row"><button type="button" class="btn btn-sm btn-outline" data-add-usage>+ Qator qo'shish</button><span class="small muted" data-usage-total></span></div>
      </div>
      <label class="field">Kutilayotgan hosil (tonna)<input name="expectedYield" type="number" min="0" step="0.1" value="${esc(p.expectedYield)}" /></label>
      <label class="field">Kutilayotgan sotish narxi (so'm/kg)<input name="expectedPrice" type="number" min="0" step="50" value="${esc(p.expectedPrice)}" /></label>
      <label class="field">Kutilayotgan daromad — hosil realizatsiyasidan (so'm)<input name="expectedRevenue" type="number" min="0" step="any" value="${esc(p.expectedRevenue)}" /><small data-revenue-hint></small></label>
      <label class="field">Investor ulushi (daromaddan, %) *<input name="investorShare" type="number" min="1" max="100" step="1" required value="${esc(p.investorShare ?? 40)}" /></label>
      <label class="field">Loyiha muddati (oy) *<input name="durationMonths" type="number" min="1" max="36" required value="${esc(p.durationMonths)}" /></label>
      <label class="field">Moliyalashtirish muddati (gacha) *<input name="fundingDeadline" type="date" required value="${esc(p.fundingDeadline || defDeadline)}" /></label>
      <label class="field full">Qaytarish shartlari<input name="returnTerms" value="${esc(p.returnTerms)}" placeholder="Masalan: Hosil sotilgach, tushumning 40% investorlarga ulushiga mos taqsimlanadi" /></label>
      <div class="full info-box" data-calc></div>
    </div></div>

    <div class="form-section"><h3>3. Kafolat va risklar</h3>
    <div class="form-grid">
      <label class="field full">Garov ta'minoti (hosil garovi va boshqalar)<textarea name="collateral">${esc(p.collateral)}</textarea></label>
      <label class="field full">Sug'urta bilan bog'liq ma'lumotlar<textarea name="insurance">${esc(p.insurance)}</textarea></label>
      <label class="field full">Kafolat<textarea name="guarantee">${esc(p.guarantee)}</textarea></label>
      <label class="field full">Taqdim etilgan hujjatlar<textarea name="documents" placeholder="Yer ijarasi shartnomasi, xo'jalik guvohnomasi, sug'urta polisi…">${esc(p.documents)}</textarea></label>
    </div></div>

    ${admin ? `<div class="form-section"><h3>Administrator</h3><div class="form-grid">
      <label class="field full">Administrator izohi<textarea name="adminNote">${esc(p.adminNote)}</textarea></label>
      <label class="check"><input type="checkbox" name="featured" ${p.featured ? "checked" : ""}/> Bosh sahifada ajratib ko'rsatish</label>
    </div></div>` : ""}
    <div class="error-box" data-error hidden></div>
  </form>`;
}

function usageRow(u = {}) {
  return `<div class="row mt-1" data-usage-row><input class="grow" placeholder="Yo'nalish (masalan: ko'chat)" value="${esc(u.item)}" data-u-item style="flex:2 1 200px" /><input type="number" min="0" step="any" placeholder="Summa" value="${esc(u.amount)}" data-u-amount style="flex:1 1 140px" /><button type="button" class="btn btn-sm btn-ghost" data-del-usage aria-label="O'chirish">✕</button></div>`;
}

export function bindProjectForm(form) {
  const usageBox = $("[data-usage]", form);
  const recalc = () => {
    const d = formData(form);
    const usage = $$("[data-usage-row]", form).reduce((s, r) => s + (Number($("[data-u-amount]", r).value) || 0), 0);
    $("[data-usage-total]", form).textContent = usage ? `Jami: ${num(usage)} so'm${d.goal && usage !== d.goal ? ` (kerakli mablag'dan ${usage > d.goal ? "ko'p" : "kam"})` : ""}` : "";
    const auto = d.expectedYield && d.expectedPrice ? d.expectedYield * 1000 * d.expectedPrice : 0;
    $("[data-revenue-hint]", form).textContent = auto ? `Hosil × narx = ${num(auto)} so'm` : "";
    const revenue = d.expectedRevenue || auto;
    const calc = $("[data-calc]", form);
    if (d.goal && revenue && d.investorShare) {
      const back = revenue * (d.investorShare / 100);
      const roi = (back / d.goal - 1) * 100;
      calc.innerHTML = `📊 Investorlarga kutilayotgan jami qaytim: <b>${num(back)} so'm</b> — kiritilgan mablag'ga nisbatan <b>${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%</b> (${d.durationMonths || "?"} oyda, platforma komissiyasidan oldin).`;
      calc.hidden = false;
    } else calc.hidden = true;
  };
  form.addEventListener("input", recalc);
  form.addEventListener("click", (e) => {
    if (e.target.closest("[data-add-usage]")) { usageBox.insertAdjacentHTML("beforeend", usageRow()); recalc(); }
    const del = e.target.closest("[data-del-usage]");
    if (del) { del.closest("[data-usage-row]").remove(); recalc(); }
  });
  $("[data-image-input]", form).addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = await compressImage(f, 1280, 0.7);
      form.elements.image.value = data;
      $("[data-image-preview]", form).innerHTML = `<img src="${data}" alt="" />`;
    } catch (err) { toast(err.message, "err"); }
  });
  recalc();
}

export function readProjectForm(form) {
  const d = formData(form);
  d.usage = $$("[data-usage-row]", form).map((r) => ({ item: $("[data-u-item]", r).value, amount: Number($("[data-u-amount]", r).value) || 0 })).filter((u) => u.item && u.amount);
  if (!d.expectedRevenue && d.expectedYield && d.expectedPrice) d.expectedRevenue = d.expectedYield * 1000 * d.expectedPrice;
  return d;
}

export function showFormError(form, msg) {
  const box = $("[data-error]", form);
  box.textContent = msg;
  box.hidden = false;
  box.scrollIntoView({ behavior: "smooth", block: "center" });
}
