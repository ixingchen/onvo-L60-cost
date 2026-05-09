/* =========================================================
   TCO Workbench — app shell + state + sidebar
   ========================================================= */

const SCENARIO_COLORS = {
  S0: "oklch(0.18 0.01 250)",
  S1: "oklch(0.50 0.13 252)",
  S2: "oklch(0.55 0.10 200)",
  S3: "oklch(0.55 0.13 295)",
  S4: "oklch(0.58 0.18 25)",
  F1: "oklch(0.65 0.13 75)",
  F2: "oklch(0.60 0.15 45)",
  F3: "oklch(0.55 0.13 155)",
  F4: "oklch(0.50 0.06 220)"
};

const SCENARIO_SHORT = {
  S0: "整车买断",
  S1: "永不买断 · 留存",
  S2: "永不买断 · 池扣租",
  S3: "N月买断 · 留存",
  S4: "N月买断 · 池扣",
  F1: "BaaS金融 · 留存",
  F2: "BaaS金融 · 池扣",
  F3: "整车金融 · 留存",
  F4: "整车金融 · 池扣"
};

const SCENARIO_GROUPS = [
  { id: "anchor", name: "锚点", ids: ["S0"] },
  { id: "baas",   name: "现金 · BaaS", ids: ["S1", "S2", "S3", "S4"] },
  { id: "fin",    name: "金融方案", ids: ["F1", "F2", "F3", "F4"] }
];

const DEFAULT_CONFIG = JSON.parse(document.getElementById("default-config").textContent);
const MODEL_PROFILES = JSON.parse(document.getElementById("model-profiles")?.textContent || "[]");

const state = {
  cfg: cloneConfig(DEFAULT_CONFIG),
  profileId: DEFAULT_CONFIG.profileId,
  chartType: "cost",
  visibleScenarios: new Set(SCENARIOS.map((s) => s.scenarioId)),
  layers: { buyoutMarker: true, settlementMarker: true, breakevenMarker: true },
  detailScenario: "S0",
  sidebarCollapsed: false,
  mobileOpen: false
};

const root = document.getElementById("app");

// ---- Bootstrap ----
let lastResult = null;
mountShell();
bindEvents();
recalc();

// =========================================================
// SHELL
// =========================================================
function mountShell() {
  root.innerHTML = `
    <header class="appbar">
      <div class="brand-mark">
        <span class="dot"></span>
        <span>TCO 工作台</span>
        <span class="scope">· 蔚来 · 乐道 · 萤火虫购车成本仿真</span>
      </div>
      <div class="appbar-spacer"></div>
      <div class="appbar-actions">
        <button class="iconbtn" id="btn-collapse" title="收起参数侧栏">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3l-3 4 3 4M9 3l-3 4 3 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>收起参数</span>
        </button>
        <button class="iconbtn" id="btn-export-csv" title="导出 CSV">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v7m0 0l-2.5-2.5M7 9l2.5-2.5M2.5 12h9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>CSV</span>
        </button>
        <button class="iconbtn" id="btn-export-json" title="导出 JSON">
          <span>JSON</span>
        </button>
        <button class="pillbtn is-primary" id="btn-reset">
          <span>重置默认</span>
        </button>
      </div>
    </header>

    <main class="shell">
      <aside class="sidebar" id="sidebar">
        <div class="side-head">
          <h2>参数配置</h2>
          <span style="font-size:11px;color:var(--muted)" id="data-version">${escapeHtml(state.cfg.dataVersion || "")}</span>
        </div>
        <div id="sidebar-body"></div>
      </aside>

      <section class="canvas">
        <section class="hero" id="hero"></section>
        <div id="warnings"></div>
        <section class="kpi-strip" id="kpi-strip"></section>

        <section class="panel" id="analysis-panel">
          <div class="panel-head">
            <div class="panel-title">
              <span id="chart-title">分析面板</span>
              <span class="sub" id="chart-sub"></span>
            </div>
            <div class="segmented" id="chart-tabs">
              ${tabButton("cost", "净成本")}
              ${tabButton("delta", "差额 vs 整车买断")}
              ${tabButton("fund", "资金池余额")}
              ${tabButton("buyout", "买断金额曲线")}
              ${tabButton("composition", "成本构成")}
            </div>
          </div>
          <div id="scenario-chips" class="chips"></div>
          <div class="chart-box" id="chart-box"></div>
          <div id="layer-toggles"></div>
        </section>

        <section class="panel" id="detail-panel" style="padding:20px 24px;">
          <div class="toolbar-row">
            <div class="panel-title" style="font-size:16px;">结果明细</div>
            <label class="scenario-pick">
              <span>逐月明细方案</span>
              <select id="detail-scenario"></select>
            </label>
          </div>
          <div id="summary-table"></div>
          <details class="detail" style="margin-top:12px;">
            <summary>逐月明细表 <span class="chev">›</span></summary>
            <div id="monthly-table"></div>
          </details>
          <details class="detail" style="margin-top:8px;">
            <summary>公式与数据来源 <span class="chev">›</span></summary>
            <div id="formula-block"></div>
          </details>
        </section>
      </section>
    </main>

    <button class="mobile-fab" id="btn-mobile-toggle">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 5h10M3 8h10M3 11h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
      <span>调整参数</span>
    </button>
  `;
  renderSidebar();
}

// =========================================================
// SIDEBAR
// =========================================================
function renderSidebar() {
  const body = document.getElementById("sidebar-body");
  body.innerHTML = `
    ${groupModelPicker()}
    ${group("vehicle", "车型与价格", true, [
      numberField("整车买断价", "wholeCarPrice", 80000, 400000, 100, "元"),
      numberField("BaaS 车价", "bodyPrice", 60000, 350000, 100, "元"),
      numberField("电池价格", "batteryPrice", 10000, 150000, 100, "元"),
      numberField("电池月租", "batteryRent", 0, 2000, 1, "元/月")
    ])}
    ${group("baas", "BaaS 与买断", true, [
      numberField("买断月份", "buyoutMonth", 1, 120, 1, "月", { maxPath: "horizonMonths" }),
      numberField("抵扣开始月", "creditStartMonth", 1, 120, 1, "月"),
      numberField("抵扣结束月", "creditEndMonth", 1, 120, 1, "月"),
      numberField("每月抵扣", "creditPerMonth", 0, 1500, 1, "元/月"),
      toggleField("启用租金优惠", "rentPromotion.useRentPromotion"),
      numberField("周期内付费月", "rentPromotion.paidMonthsPerCycle", 0, 12, 1, "月"),
      numberField("优惠周期", "rentPromotion.cycleMonths", 1, 12, 1, "月"),
      toggleField("抵扣只按付费账单", "rentPromotion.creditOnlyPaidBills")
    ])}
    ${group("finance", "金融贷款", true, [
      toggleField("启用金融对比", "finance.enableFinanceComparison"),
      selectField("贷款类型", "finance.planType", [
        ["interest_free", "前段免息 + 后段方案"],
        ["standard_amortized", "等额本息（常规/低息）"]
      ]),
      numberField("首付比例", "finance.downPaymentRatio", 0, 1, 0.01, "", { format: "percent" }),
      numberField("总贷款期", "finance.totalLoanTermMonths", 12, 84, 1, "月"),
      numberField("免息期", "finance.interestFreeMonths", 0, 60, 1, "月", { maxPath: "finance.totalLoanTermMonths" }),
      selectField("免息期末处理", "finance.settlementMode", [
        ["balloon_at_interest_free_end", "免息期末一次性结清"],
        ["continue_installments_after_free", "继续分期至到期"]
      ]),
      numberField("贷款年化利率", "finance.loanAnnualRate", 0, 0.12, 0.001, "", { format: "percent" }),
      numberField("后段年化利率", "finance.postFreeAnnualRate", 0, 0.12, 0.001, "", { format: "percent" })
    ])}
    ${group("ins", "保险与补贴", false, [
      numberField("BaaS 首年保险", "insurance.baasFirstYear", 0, 20000, 100, "元"),
      numberField("买断首年保险", "insurance.buyoutFirstYear", 0, 20000, 100, "元"),
      numberField("续保折扣", "insurance.afterYear1Factor", 0, 1.5, 0.01, "×"),
      toggleField("买断后切换保险口径", "insurance.switchInsuranceAfterBuyout"),
      selectField("补贴模式", "subsidyPolicy.mode", [
        ["none", "无补贴"],
        ["transfer_old_car", "置换更新"],
        ["scrap_old_car", "报废更新"],
        ["custom", "自定义"]
      ]),
      numberField("补贴到账月", "subsidyPolicy.subsidyReceiveMonth", 1, 120, 1, "月"),
      numberField("自定义补贴", "subsidyPolicy.customSubsidyYuan", 0, 50000, 100, "元"),
      numberField("积分现金等价", "pointRebate.pointRebateYuan", 0, 50000, 100, "元"),
      numberField("积分抵扣月", "pointRebate.pointRebateMonth", 1, 120, 1, "月")
    ])}
    ${group("inv", "投资资金池", false, [
      numberField("年化收益率", "investment.annualReturn", -0.05, 0.12, 0.001, "", { format: "percent" }),
      numberField("留存理财结算周期", "investment.retainedSettlementIntervalYears", 1, 5, 1, "年"),
      selectField("S4 买断款来源", "investment.fundBuyoutPaymentSource", [
        ["fund", "基金账户"],
        ["external", "外部支付"]
      ])
    ])}
    ${group("adv", "高级假设", false, [
      numberField("模拟月份", "horizonMonths", 12, 240, 1, "月"),
      toggleField("纳入补能成本", "energy.includeEnergyCost"),
      numberField("年行驶里程", "energy.annualMileageKm", 0, 50000, 500, "km"),
      numberField("百公里电耗", "energy.energyKWhPer100km", 0, 30, 0.1, "kWh"),
      numberField("电价", "energy.electricityPrice", 0, 3, 0.01, "元/kWh"),
      toggleField("纳入期末残值", "resale.includeResaleValue"),
      numberField("期末残值", "resale.resaleValueYuan", 0, 300000, 1000, "元")
    ])}
  `;
  syncControls();
}

function groupModelPicker() {
  const profile = currentProfile();
  const brands = [];
  MODEL_PROFILES.forEach((p) => {
    if (!brands.find((b) => b.brandId === p.brandId)) brands.push(p);
  });
  const models = MODEL_PROFILES.filter((p) => p.brandId === profile.brandId);
  return `
    <details class="side-group" open>
      <summary>
        <span>车型选择</span>
        <span class="chev">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 2l4 3-4 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
      </summary>
      <div class="side-body">
        <div class="field">
          <div class="field-label"><span class="label-name">品牌</span></div>
          <div class="field-input">
            <select id="brand-select">
              ${brands.map((b) => `<option value="${escapeAttr(b.brandId)}" ${b.brandId === profile.brandId ? "selected" : ""}>${escapeHtml(b.brandName)} · ${escapeHtml(b.brandNameEn)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field">
          <div class="field-label"><span class="label-name">车型</span></div>
          <div class="field-input">
            <select id="model-select">
              ${models.map((p) => `<option value="${escapeAttr(p.profileId)}" ${p.profileId === state.profileId ? "selected" : ""}>${escapeHtml(p.modelShortName)} · ${escapeHtml(p.modelNameEn)}</option>`).join("")}
            </select>
          </div>
        </div>
      </div>
    </details>
  `;
}

function group(id, title, open, fields) {
  return `
    <details class="side-group" data-group="${id}" ${open ? "open" : ""}>
      <summary>
        <span>${escapeHtml(title)}</span>
        <span class="grp-tag">${fields.length} 项</span>
        <span class="chev">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 2l4 3-4 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
      </summary>
      <div class="side-body">
        ${fields.join("")}
      </div>
    </details>
  `;
}

function numberField(label, path, min, max, step, suffix, opt = {}) {
  const maxAttr = opt.maxPath ? `data-max-path="${escapeAttr(opt.maxPath)}"` : `max="${max}"`;
  const fmt = opt.format || (suffix === "元/月" || suffix === "元" ? "yuan" : "raw");
  return `
    <div class="field">
      <div class="field-label">
        <span class="label-name">${escapeHtml(label)}</span>
        <span class="label-value" data-display-for="${escapeAttr(path)}" data-format="${fmt}" data-suffix="${escapeAttr(suffix || "")}"></span>
      </div>
      <div class="field-input">
        <input type="number" data-path="${escapeAttr(path)}" min="${min}" ${maxAttr} step="${step}" inputmode="decimal">
        ${suffix ? `<span class="suffix">${escapeHtml(suffix)}</span>` : ""}
      </div>
      <input type="range" class="field-range" data-path="${escapeAttr(path)}" min="${min}" ${maxAttr} step="${step}" aria-label="${escapeAttr(label)}">
    </div>
  `;
}

function selectField(label, path, options) {
  return `
    <div class="field">
      <div class="field-label"><span class="label-name">${escapeHtml(label)}</span></div>
      <div class="field-input">
        <select data-path="${escapeAttr(path)}">
          ${options.map(([v, t]) => `<option value="${escapeAttr(v)}">${escapeHtml(t)}</option>`).join("")}
        </select>
      </div>
    </div>
  `;
}

function toggleField(label, path) {
  return `
    <label class="toggle">
      <input type="checkbox" data-path="${escapeAttr(path)}">
      <span class="toggle-text">${escapeHtml(label)}</span>
    </label>
  `;
}

function tabButton(id, label) {
  return `<button data-chart-tab="${id}">${escapeHtml(label)}</button>`;
}

// =========================================================
// EVENTS
// =========================================================
function bindEvents() {
  root.addEventListener("input", (e) => {
    if (e.target.matches("[data-path]")) {
      writeControl(e.target);
      recalc();
    }
  });
  root.addEventListener("change", (e) => {
    if (e.target.id === "brand-select") {
      const profile = MODEL_PROFILES.find((p) => p.brandId === e.target.value);
      if (profile) applyProfile(profile.profileId);
      return;
    }
    if (e.target.id === "model-select") { applyProfile(e.target.value); return; }
    if (e.target.id === "detail-scenario") {
      state.detailScenario = e.target.value;
      renderTables(lastResult);
      return;
    }
    if (e.target.matches("[data-path]")) {
      writeControl(e.target);
      recalc();
    }
  });
  root.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-chart-tab]");
    if (tab) { state.chartType = tab.dataset.chartTab; renderAnalysis(lastResult); return; }
    const chip = e.target.closest("[data-chip]");
    if (chip) {
      const id = chip.dataset.chip;
      if (chip.dataset.chipAction === "solo") {
        state.visibleScenarios = new Set([id]);
      } else if (state.visibleScenarios.has(id)) {
        if (state.visibleScenarios.size > 1) state.visibleScenarios.delete(id);
      } else {
        state.visibleScenarios.add(id);
      }
      renderChips(lastResult);
      renderAnalysis(lastResult);
      return;
    }
    const preset = e.target.closest("[data-chip-preset]");
    if (preset) {
      const p = preset.dataset.chipPreset;
      const all = lastResult.scenarios.map((s) => s.scenarioId);
      if (p === "all") state.visibleScenarios = new Set(all);
      else if (p === "none") state.visibleScenarios = new Set([all[0]]);
      else if (p === "baas") state.visibleScenarios = new Set(all.filter((id) => !id.startsWith("F")));
      else if (p === "fin") state.visibleScenarios = new Set(["S0", ...all.filter((id) => id.startsWith("F"))]);
      renderChips(lastResult);
      renderAnalysis(lastResult);
      return;
    }
    const layer = e.target.closest("[data-layer]");
    if (layer) {
      const k = layer.dataset.layer;
      state.layers[k] = !state.layers[k];
      renderLayerToggles();
      renderAnalysis(lastResult);
      return;
    }
    if (e.target.id === "btn-collapse") {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      document.querySelector(".shell").classList.toggle("is-collapsed", state.sidebarCollapsed);
      e.target.querySelector("span").textContent = state.sidebarCollapsed ? "展开参数" : "收起参数";
      return;
    }
    if (e.target.id === "btn-mobile-toggle" || e.target.closest("#btn-mobile-toggle")) {
      state.mobileOpen = !state.mobileOpen;
      document.querySelector(".shell").classList.toggle("is-mobile-open", state.mobileOpen);
      return;
    }
    if (e.target.id === "btn-reset") {
      state.cfg = cloneConfig(currentProfile());
      state.detailScenario = "S0";
      state.visibleScenarios = new Set(SCENARIOS.map((s) => s.scenarioId));
      renderSidebar();
      recalc();
      return;
    }
    if (e.target.id === "btn-export-csv") {
      const r = runCostSimulation(state.cfg);
      downloadText(`${slug(r.cfg)}_monthly.csv`, "\ufeff" + toCsv(r.monthlyResult), "text/csv;charset=utf-8");
    }
    if (e.target.id === "btn-export-json") {
      const r = runCostSimulation(state.cfg);
      downloadText(`${slug(r.cfg)}_results.json`, JSON.stringify({ cfg: r.cfg, summary: r.summaryResult }, null, 2), "application/json");
    }
  });
  // close mobile drawer when clicking shell overlay
  document.addEventListener("click", (e) => {
    if (!state.mobileOpen) return;
    if (e.target.closest(".sidebar") || e.target.closest("#btn-mobile-toggle")) return;
    state.mobileOpen = false;
    document.querySelector(".shell").classList.remove("is-mobile-open");
  });
}

function applyProfile(profileId) {
  const p = MODEL_PROFILES.find((x) => x.profileId === profileId) || DEFAULT_CONFIG;
  state.profileId = p.profileId;
  state.cfg = cloneConfig(p);
  state.detailScenario = "S0";
  state.visibleScenarios = new Set(SCENARIOS.map((s) => s.scenarioId));
  renderSidebar();
  recalc();
}

function currentProfile() {
  return MODEL_PROFILES.find((p) => p.profileId === state.profileId) || DEFAULT_CONFIG;
}

// =========================================================
// SYNC CONTROLS
// =========================================================
function syncControls() {
  root.querySelectorAll("[data-path]").forEach((el) => {
    if (el.dataset.maxPath) {
      const m = getByPath(state.cfg, el.dataset.maxPath);
      if (m != null) el.max = m;
    }
    const v = getByPath(state.cfg, el.dataset.path);
    if (el.type === "checkbox") el.checked = Boolean(v);
    else el.value = v;
  });
  root.querySelectorAll("[data-display-for]").forEach((el) => {
    const v = getByPath(state.cfg, el.dataset.displayFor);
    el.textContent = formatDisplay(v, el.dataset.format, el.dataset.suffix);
  });
}

function writeControl(el) {
  const path = el.dataset.path;
  const v = el.type === "checkbox" ? el.checked
          : (el.type === "number" || el.type === "range") ? Number(el.value)
          : el.value;
  setByPath(state.cfg, path, v);
  // sync siblings (number <-> range)
  root.querySelectorAll(`[data-path="${cssEscape(path)}"]`).forEach((peer) => {
    if (peer === el) return;
    if (peer.type === "checkbox") peer.checked = Boolean(v);
    else peer.value = v;
  });
  const display = root.querySelector(`[data-display-for="${cssEscape(path)}"]`);
  if (display) display.textContent = formatDisplay(v, display.dataset.format, display.dataset.suffix);
}

function formatDisplay(v, format, suffix) {
  if (v == null || v === "") return "";
  if (format === "percent") return (Number(v) * 100).toFixed(2).replace(/\.?0+$/, "") + "%";
  if (format === "yuan") return Number(v).toLocaleString("zh-CN") + (suffix === "元/月" ? " 元/月" : " 元");
  return Number(v).toLocaleString("zh-CN") + (suffix ? ` ${suffix}` : "");
}

// =========================================================
// RECALC + RENDER ENTRY
// =========================================================
function recalc() {
  const result = runCostSimulation(state.cfg);
  state.cfg = result.cfg;
  if (!result.scenarios.find((s) => s.scenarioId === state.detailScenario)) {
    state.detailScenario = result.scenarios[0]?.scenarioId || "S0";
  }
  // ensure visible set only includes available scenarios
  const available = new Set(result.scenarios.map((s) => s.scenarioId));
  for (const id of state.visibleScenarios) if (!available.has(id)) state.visibleScenarios.delete(id);
  if (state.visibleScenarios.size === 0) state.visibleScenarios.add("S0");
  lastResult = result;
  syncControls();
  document.getElementById("data-version").textContent = state.cfg.dataVersion || "";
  renderHero(result);
  renderWarnings(result.warnings);
  renderKpis(result);
  renderChips(result);
  renderLayerToggles();
  renderAnalysis(result);
  renderTables(result);
  renderFormulae(result.cfg);
}

function renderWarnings(warnings) {
  const el = document.getElementById("warnings");
  el.innerHTML = warnings.length
    ? `<div class="warning-strip">${warnings.map((w) => `<span>${escapeHtml(w)}</span>`).join("")}</div>` : "";
}

// expose state to other module so chart code can read visibleScenarios + layers
window.__APP_STATE__ = state;
