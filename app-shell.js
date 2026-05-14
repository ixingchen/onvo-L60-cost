/* =========================================================
   TCO Workbench v3 · Shell + state + bootstrap
   ========================================================= */

const DEFAULT_CONFIG = JSON.parse(document.getElementById("default-config").textContent);
const MODEL_PROFILES = JSON.parse(document.getElementById("model-profiles")?.textContent || "[]");

const state = {
  cfg: cloneConfig(DEFAULT_CONFIG),
  profileId: DEFAULT_CONFIG.profileId,
  theme: localStorage.getItem("tco-theme") || "light",
  chartMode: "cost",
  curveVisible: new Set(["S0", "S1", "S2", "S3", "S4", "F1", "F3"]),
  compareSet: new Set(["S0", "S1", "S3", "F1"]),
  layers: { buyout: true, settle: true, breakeven: true },
  answers: { horizon: "120", cashFlow: "invest", battery: "rent", monthly: "any" },
  drawerOpen: false
};

// shell
let lastResult = null;
let revealObserver = null;
mount();
bindEvents();
applyTheme();
recalc();
initReveal();
animateHero();

function mount() {
  // populate top-nav model selector
  const sel = document.getElementById("model-select");
  sel.innerHTML = MODEL_PROFILES.map((p) =>
    `<option value="${escapeAttr(p.profileId)}" ${p.profileId === state.profileId ? "selected" : ""}>${escapeHtml(p.brandName)} ${escapeHtml(p.modelShortName)}</option>`
  ).join("");

  // nav links
  document.getElementById("nav-links").innerHTML = [
    ["hero", "结论"],
    ["compare", "方案对比"],
    ["curves", "成本曲线"],
    ["sensitivity", "敏感性"],
    ["recommend", "推荐器"],
    ["lab", "实验室"]
  ].map(([id, t]) => `<a href="#${id}" data-jump="${id}">${escapeHtml(t)}</a>`).join("");

  // populate drawer
  renderDrawer();
}

function renderDrawer() {
  const body = document.getElementById("drawer-body");
  body.innerHTML = LAB_FIELDS.slice(0, 4).map(([title, fields]) => `
    <div class="lab-group" style="padding:0;background:transparent;border:0;">
      <h4 style="border-bottom:1px solid var(--line-soft);padding-bottom:6px;">${escapeHtml(title)}</h4>
      ${fields.map(renderLabField).join("")}
    </div>
  `).join("");
  document.getElementById("drawer-version").textContent = state.cfg.dataVersion || "";
}

function bindEvents() {
  // theme
  document.getElementById("btn-theme").addEventListener("click", () => {
    state.theme = state.theme === "light" ? "dark" : "light";
    localStorage.setItem("tco-theme", state.theme);
    applyTheme();
    // re-render charts so gradient stops pick up new tones
    renderSections();
  });

  // drawer
  document.getElementById("drawer-trigger").addEventListener("click", () => toggleDrawer());
  document.getElementById("drawer-backdrop").addEventListener("click", () => toggleDrawer(false));
  document.getElementById("btn-drawer-close").addEventListener("click", () => toggleDrawer(false));
  document.getElementById("btn-reset-all").addEventListener("click", () => {
    state.cfg = cloneConfig(currentProfile());
    state.compareSet = new Set(["S0", "S1", "S3", "F1"]);
    state.curveVisible = new Set(["S0", "S1", "S2", "S3", "S4", "F1", "F3"]);
    state.answers = { horizon: "120", cashFlow: "invest", battery: "rent", monthly: "any" };
    renderDrawer();
    recalc();
  });

  // exports
  document.getElementById("btn-export-csv").addEventListener("click", () => {
    const r = runCostSimulation(state.cfg);
    downloadText(`${slug(r.cfg)}_monthly.csv`, "\ufeff" + toCsv(r.monthlyResult), "text/csv;charset=utf-8");
  });

  // model select
  document.getElementById("model-select").addEventListener("change", (e) => {
    applyProfile(e.target.value);
  });

  // nav jump
  document.getElementById("nav-links").addEventListener("click", (e) => {
    const a = e.target.closest("[data-jump]");
    if (!a) return;
    e.preventDefault();
    const target = document.querySelector(`[data-section="${a.dataset.jump}"]`);
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - 64;
      window.scrollTo({ top, behavior: "smooth" });
    }
  });

  // global delegated handlers on #app
  const app = document.getElementById("app");
  app.addEventListener("input", onInput);
  app.addEventListener("change", onInput);
  app.addEventListener("click", onClick);

  // drawer body handlers
  const drawer = document.getElementById("drawer");
  drawer.addEventListener("input", onInput);
  drawer.addEventListener("change", onInput);

  // keyboard: T toggles theme, / opens drawer
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, select, textarea")) return;
    if (e.key.toLowerCase() === "t") document.getElementById("btn-theme").click();
    if (e.key === "/") { e.preventDefault(); toggleDrawer(); }
    if (e.key === "Escape" && state.drawerOpen) toggleDrawer(false);
  });
}

function onInput(e) {
  const el = e.target;
  if (el.matches("[data-path]")) {
    writeControl(el);
    recalcSoft();
  }
}

function onClick(e) {
  // curve mode tabs
  const tab = e.target.closest("[data-mode]");
  if (tab) {
    state.chartMode = tab.dataset.mode;
    renderCurvesSection();
    return;
  }
  // curve chip
  const cv = e.target.closest("[data-curve]");
  if (cv) {
    const id = cv.dataset.curve;
    toggleSet(state.curveVisible, id, 1);
    renderCurvesSection();
    return;
  }
  // compare chip
  const cmp = e.target.closest("[data-compare]");
  if (cmp) {
    const id = cmp.dataset.compare;
    toggleSet(state.compareSet, id, 1);
    renderCompareSection();
    return;
  }
  // layer
  const layer = e.target.closest("[data-layer]");
  if (layer) {
    const k = layer.dataset.layer;
    state.layers[k] = !state.layers[k];
    renderCurvesSection();
    return;
  }
  // horizon picker
  const h = e.target.closest("[data-horizon]");
  if (h) {
    state.cfg.horizonMonths = Number(h.dataset.horizon);
    if (state.cfg.buyoutMonth > state.cfg.horizonMonths) state.cfg.buyoutMonth = Math.min(60, state.cfg.horizonMonths);
    recalc();
    return;
  }
  // recommender
  const rq = e.target.closest("[data-rec-q]");
  if (rq) {
    state.answers[rq.dataset.recQ] = rq.dataset.recV;
    renderRecommenderSection();
    return;
  }
}

function toggleSet(set, id, min = 0) {
  if (set.has(id)) { if (set.size > min) set.delete(id); }
  else set.add(id);
}

function writeControl(el) {
  const path = el.dataset.path;
  const v = el.type === "checkbox" ? el.checked
          : (el.type === "number" || el.type === "range") ? Number(el.value)
          : el.value;
  setByPath(state.cfg, path, v);
  // sync siblings
  document.querySelectorAll(`[data-path="${cssEscape(path)}"]`).forEach((peer) => {
    if (peer === el) return;
    if (peer.type === "checkbox") peer.checked = Boolean(v);
    else peer.value = v;
  });
  const disp = document.querySelector(`[data-display-for="${cssEscape(path)}"]`);
  if (disp) disp.textContent = formatDisplay(v, disp.dataset.fmt, disp.dataset.suf);
}

function formatDisplay(v, fmt, suf) {
  if (v == null || v === "") return "";
  if (fmt === "pct") return `${(Number(v) * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
  if (fmt === "wan") return fmtWan(Number(v));
  return `${Number(v).toLocaleString("zh-CN")}${suf ? ` ${suf}` : ""}`;
}

function syncControls() {
  document.querySelectorAll("[data-path]").forEach((el) => {
    const v = getByPath(state.cfg, el.dataset.path);
    if (el.type === "checkbox") el.checked = Boolean(v);
    else el.value = v ?? "";
  });
  document.querySelectorAll("[data-display-for]").forEach((el) => {
    const v = getByPath(state.cfg, el.dataset.displayFor);
    el.textContent = formatDisplay(v, el.dataset.fmt, el.dataset.suf);
  });
}

function applyProfile(profileId) {
  const p = MODEL_PROFILES.find((x) => x.profileId === profileId) || DEFAULT_CONFIG;
  state.profileId = p.profileId;
  state.cfg = cloneConfig(p);
  recalc();
}
function currentProfile() {
  return MODEL_PROFILES.find((p) => p.profileId === state.profileId) || DEFAULT_CONFIG;
}

function toggleDrawer(force) {
  state.drawerOpen = force == null ? !state.drawerOpen : force;
  document.getElementById("drawer").classList.toggle("is-open", state.drawerOpen);
  document.getElementById("drawer-backdrop").classList.toggle("is-open", state.drawerOpen);
  document.getElementById("drawer-trigger").classList.toggle("is-open", state.drawerOpen);
  document.getElementById("drawer").setAttribute("aria-hidden", String(!state.drawerOpen));
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  document.getElementById("theme-icon")?.replaceWith(themeIcon());
}
function themeIcon() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("id", "theme-icon");
  svg.setAttribute("width", "14"); svg.setAttribute("height", "14");
  svg.setAttribute("viewBox", "0 0 14 14"); svg.setAttribute("fill", "none");
  if (state.theme === "dark") {
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", "M11 8.5A4.5 4.5 0 0 1 5.5 3a1 1 0 0 0-1.4-1A6 6 0 1 0 13 9.9a1 1 0 0 0-2-1.4z");
    path.setAttribute("fill", "currentColor");
    svg.appendChild(path);
  } else {
    const c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", "7"); c.setAttribute("cy", "7"); c.setAttribute("r", "3"); c.setAttribute("fill", "currentColor");
    svg.appendChild(c);
    const g = document.createElementNS(ns, "g");
    g.setAttribute("stroke", "currentColor"); g.setAttribute("stroke-width", "1.4"); g.setAttribute("stroke-linecap", "round");
    const rays = [
      [7, 1.5, 7, 3], [7, 11, 7, 12.5], [1.5, 7, 3, 7], [11, 7, 12.5, 7],
      [2.8, 2.8, 3.9, 3.9], [10.1, 10.1, 11.2, 11.2], [2.8, 11.2, 3.9, 10.1], [10.1, 3.9, 11.2, 2.8]
    ];
    rays.forEach(([x1, y1, x2, y2]) => {
      const ln = document.createElementNS(ns, "line");
      ln.setAttribute("x1", x1); ln.setAttribute("y1", y1); ln.setAttribute("x2", x2); ln.setAttribute("y2", y2);
      g.appendChild(ln);
    });
    svg.appendChild(g);
  }
  return svg;
}

// =========================================================
// Recalc + render dispatch
// =========================================================
function recalc() {
  const result = runCostSimulation(state.cfg);
  state.cfg = result.cfg;
  lastResult = result;
  renderSections();
}

// soft recalc: update sections inline without re-mounting (preserves drawer scroll/focus)
let softTimer = null;
function recalcSoft() {
  clearTimeout(softTimer);
  softTimer = setTimeout(() => {
    const result = runCostSimulation(state.cfg);
    state.cfg = result.cfg;
    lastResult = result;
    renderSections({ keepReveal: true });
  }, 60);
}

function renderSections(opts = {}) {
  const app = document.getElementById("app");
  app.innerHTML = `
    ${renderHero(lastResult)}
    ${renderKpiRibbon(lastResult)}
    ${renderMoments(lastResult)}
    ${renderCompare(lastResult)}
    ${renderCurves(lastResult)}
    ${renderSensitivity(lastResult)}
    ${renderRecommender(lastResult)}
    ${renderLab()}
    ${renderFooter(lastResult)}
  `;
  renderWarnings(lastResult.warnings);
  syncControls();
  // attach tooltip on main chart
  const box = document.getElementById("curve-box");
  if (box) attachChartTooltip(box, state.chartMode);
  if (!opts.keepReveal) initReveal();
  else markRevealImmediate();
  animateLines();
}

function renderCurvesSection() {
  const section = document.querySelector('[data-section="curves"]');
  if (!section) return;
  section.outerHTML = renderCurves(lastResult);
  const box = document.getElementById("curve-box");
  if (box) attachChartTooltip(box, state.chartMode);
  markRevealImmediate();
  animateLines();
}
function renderCompareSection() {
  const section = document.querySelector('[data-section="compare"]');
  if (!section) return;
  section.outerHTML = renderCompare(lastResult);
  markRevealImmediate();
}
function renderRecommenderSection() {
  const section = document.querySelector('[data-section="recommend"]');
  if (!section) return;
  section.outerHTML = renderRecommender(lastResult);
  markRevealImmediate();
}

// =========================================================
// Animations: scroll reveal + number rollup + line draw-in
// =========================================================
function initReveal() {
  if (revealObserver) revealObserver.disconnect();
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: "120px 0px", threshold: 0 });
  document.querySelectorAll(".reveal").forEach((el) => {
    revealObserver.observe(el);
  });
  // belt-and-suspenders: anything above the first viewport should not be hidden
  requestAnimationFrame(() => {
    document.querySelectorAll(".reveal").forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 1.5) el.classList.add("is-in");
    });
  });
}
function markRevealImmediate() {
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-in"));
}

function animateHero() {
  // number rollup for #hero-savings
  const node = document.getElementById("hero-savings");
  if (!node) return;
  const target = Number(node.dataset.target || 0);
  if (!target || target < 1) return;
  const duration = 900;
  const start = performance.now();
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const v = target * ease(t);
    node.textContent = fmtWan(v);
    if (t < 1) requestAnimationFrame(tick);
  }
  // wait a tick so target is rendered then animate
  requestAnimationFrame(() => requestAnimationFrame(tick));
}

function animateLines() {
  // line draw-in on chart-line elements
  document.querySelectorAll(".js-anim-line").forEach((p, idx) => {
    try {
      const len = p.getTotalLength();
      p.style.transition = "none";
      p.style.strokeDasharray = `${len} ${len}`;
      p.style.strokeDashoffset = `${len}`;
      requestAnimationFrame(() => {
        p.style.transition = `stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1) ${idx * 60}ms`;
        p.style.strokeDashoffset = "0";
      });
    } catch (err) { /* no-op */ }
  });
  // hero animated path
  const heroLine = document.querySelector(".hero-line");
  if (heroLine) {
    try {
      const len = heroLine.getTotalLength();
      heroLine.style.strokeDasharray = `${len} ${len}`;
      heroLine.style.strokeDashoffset = `${len}`;
      requestAnimationFrame(() => {
        heroLine.style.transition = "stroke-dashoffset 1500ms cubic-bezier(0.22,1,0.36,1)";
        heroLine.style.strokeDashoffset = "0";
      });
    } catch (err) {}
  }
}

// expose state for chart layer
window.__APP__ = state;
