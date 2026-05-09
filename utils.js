/* =========================================================
   Shared utilities
   ========================================================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
function escapeAttr(v) { return escapeHtml(v); }

function getByPath(obj, path) {
  return path.split(".").reduce((acc, k) => acc?.[k], obj);
}
function setByPath(obj, path, value) {
  const keys = path.split(".");
  let cur = obj;
  keys.slice(0, -1).forEach((k) => {
    if (!cur[k]) cur[k] = {};
    cur = cur[k];
  });
  cur[keys.at(-1)] = value;
}
function cssEscape(v) {
  if (window.CSS && CSS.escape) return CSS.escape(v);
  return String(v).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}
function slug(cfg) {
  return String(cfg.profileId || cfg.modelId || "vehicle")
    .toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replaceAll(/^_+|_+$/g, "");
}
function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a); a.click(); a.remove();
  URL.revokeObjectURL(a.href);
}

function formatYuanShort(v) {
  const n = Math.round(Number(v) || 0);
  const abs = Math.abs(n);
  if (abs >= 100000) return `${(n / 10000).toFixed(1)} 万`;
  if (abs >= 10000) return `${(n / 10000).toFixed(2)} 万`;
  return `${n.toLocaleString("zh-CN")} 元`;
}
function formatYuanFull(v) {
  return `¥ ${Math.round(Number(v) || 0).toLocaleString("zh-CN")}`;
}
function signed(n, formatter = formatYuanShort) {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return sign + formatter(Math.abs(n));
}
