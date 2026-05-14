/* =========================================================
   TCO Workbench v3 · Shared utilities
   ========================================================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
function escapeAttr(v) { return escapeHtml(v); }
function getByPath(obj, path) { return path.split(".").reduce((acc, k) => acc?.[k], obj); }
function setByPath(obj, path, value) {
  const keys = path.split(".");
  let cur = obj;
  keys.slice(0, -1).forEach((k) => { if (!cur[k]) cur[k] = {}; cur = cur[k]; });
  cur[keys.at(-1)] = value;
}
function cssEscape(v) { return window.CSS && CSS.escape ? CSS.escape(v) : String(v).replaceAll("\\", "\\\\").replaceAll('"', '\\"'); }
function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.append(a); a.click(); a.remove();
  URL.revokeObjectURL(a.href);
}
function slug(cfg) {
  return String(cfg.profileId || cfg.modelId || "vehicle")
    .toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replaceAll(/^_+|_+$/g, "");
}

function fmtWan(v) {
  const n = Math.round(Number(v) || 0);
  const abs = Math.abs(n);
  if (abs >= 100000) return `${(n / 10000).toFixed(1)} 万`;
  if (abs >= 10000) return `${(n / 10000).toFixed(2)} 万`;
  return `${n.toLocaleString("zh-CN")} 元`;
}
function fmtFull(v) { return `¥ ${Math.round(Number(v) || 0).toLocaleString("zh-CN")}`; }
function fmtSigned(n, fn = fmtWan) {
  if (n == null || isNaN(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return sign + fn(Math.abs(n));
}
function fmtPct(v, decimals = 2) {
  if (v == null || isNaN(v)) return "—";
  return `${(v * 100).toFixed(decimals)}%`;
}
function fmtMonth(m) {
  if (!m || m > 600) return "—";
  return `第 ${m} 月`;
}

const SCENARIO_TONE = {
  S0: "var(--tone-anchor)",
  S1: "var(--tone-baas)",
  S2: "var(--tone-baas-2)",
  S3: "var(--tone-baas-3)",
  S4: "var(--tone-baas-4)",
  F1: "var(--tone-fin-1)",
  F2: "var(--tone-fin-2)",
  F3: "var(--tone-fin-3)",
  F4: "var(--tone-fin-4)"
};
const SCENARIO_SHORT = {
  S0: "整车买断",
  S1: "BaaS 永不买断",
  S2: "BaaS 理财扣租",
  S3: "BaaS 第N月买断",
  S4: "BaaS 池抵买断",
  F1: "BaaS 金融",
  F2: "BaaS 金融池还贷",
  F3: "整车金融",
  F4: "整车金融池还贷"
};
const SCENARIO_DESC = {
  S0: "一次性付清整车款,无月供无租金,作为对照锚点。",
  S1: "买身体、租电池;每月还租,身体差额放入低风险理财。",
  S2: "买身体、租电池;一次性留出资金池,逐月扣租生息。",
  S3: "BaaS 起步,第 N 月用现金把电池买断为整车。",
  S4: "BaaS 起步,第 N 月用资金池把电池买断,本金留存生息。",
  F1: "0 首付分期买身体 + 租电池,身体差额理财。",
  F2: "0 首付分期 + BaaS,资金池每月还贷扣租。",
  F3: "0 首付分期买整车,身体差额理财。",
  F4: "0 首付分期买整车,资金池每月还贷。"
};
function scenarioGroup(id) {
  if (id === "S0") return "anchor";
  if (id.startsWith("F")) return "finance";
  return "baas";
}

// run multiple sims with cfg overrides for sensitivity
function simulateWith(baseCfg, overrides) {
  const cfg = JSON.parse(JSON.stringify(baseCfg));
  Object.entries(overrides).forEach(([path, v]) => setByPath(cfg, path, v));
  return runCostSimulation(cfg);
}
