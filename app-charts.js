/* =========================================================
   TCO Workbench v3 · Charts
   ========================================================= */

const CHART = {
  W: 1200, H: 420,
  M: { top: 24, right: 24, bottom: 36, left: 72 }
};

function chartScales(W, H, M, xMin, xMax, yMin, yMax) {
  const pw = W - M.left - M.right;
  const ph = H - M.top - M.bottom;
  return {
    pw, ph,
    xs: (m) => M.left + ((m - xMin) / Math.max(1, xMax - xMin)) * pw,
    ys: (v) => M.top + (1 - (v - yMin) / Math.max(1, yMax - yMin)) * ph
  };
}
function makeYTicks(min, max, count = 5) {
  const step = (max - min) / Math.max(1, count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}
function makeMonthTicks(min, max) {
  const span = max - min;
  const step = span <= 24 ? 6 : span <= 60 ? 12 : span <= 120 ? 24 : 36;
  const out = [];
  for (let v = step; v <= max; v += step) out.push(v);
  if (!out.includes(1)) out.unshift(1);
  if (out[out.length - 1] !== max) out.push(max);
  return out;
}
function smoothPath(points) {
  // Catmull-Rom-ish smoothing
  if (points.length < 2) return "";
  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const t = 0.18;
    const cp1x = p1[0] + (p2[0] - p0[0]) * t;
    const cp1y = p1[1] + (p2[1] - p0[1]) * t;
    const cp2x = p2[0] - (p3[0] - p1[0]) * t;
    const cp2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

// ---------- Hero chart ----------
// Stylised: shows S0 (flat) + min-cost scenario as bold gradient area
function renderHeroChart(result, options = {}) {
  const cfg = result.cfg;
  const summary = result.summaryResult;
  const min = summary.find((s) => s.minCostFlag) || summary[0];
  const minIdx = result.scenarios.findIndex((s) => s.scenarioId === min.scenarioId);
  const minRows = result.monthlyByScenario[minIdx];
  const s0Idx = result.scenarios.findIndex((s) => s.scenarioId === "S0");
  const s0Rows = result.monthlyByScenario[s0Idx];
  const W = 1200, H = 320;
  const M = { top: 30, right: 36, bottom: 30, left: 36 };

  const all = [...minRows.map((r) => r.netCost), ...s0Rows.map((r) => r.netCost)];
  const yMax = Math.max(...all) * 1.05;
  const yMin = Math.min(0, ...all);
  const { xs, ys, pw, ph } = chartScales(W, H, M, 1, cfg.horizonMonths, yMin, yMax);

  const minPts = minRows.map((r) => [xs(r.month), ys(r.netCost)]);
  const s0Pts = s0Rows.map((r) => [xs(r.month), ys(r.netCost)]);
  const minPath = smoothPath(minPts);
  const s0Path = smoothPath(s0Pts);
  const minArea = `${minPath} L ${xs(cfg.horizonMonths).toFixed(1)} ${ys(yMin).toFixed(1)} L ${xs(1).toFixed(1)} ${ys(yMin).toFixed(1)} Z`;

  // grid lines
  const yTicks = makeYTicks(yMin, yMax, 4);
  // hero animation handled via CSS @keyframes on .hero-line (path stroke-dasharray)
  return `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="hero-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${SCENARIO_TONE[min.scenarioId]}" stop-opacity="0.32"/>
          <stop offset="100%" stop-color="${SCENARIO_TONE[min.scenarioId]}" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="hero-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="var(--accent)"/>
          <stop offset="100%" stop-color="${SCENARIO_TONE[min.scenarioId]}"/>
        </linearGradient>
      </defs>
      <g opacity="0.4">
        ${yTicks.map((t) => `<line x1="${M.left}" x2="${W - M.right}" y1="${ys(t)}" y2="${ys(t)}" stroke="var(--grid-line)" stroke-width="1"/>`).join("")}
      </g>
      <path d="${minArea}" fill="url(#hero-grad)" />
      <path d="${s0Path}" fill="none" stroke="var(--ink-muted)" stroke-width="1.4" stroke-dasharray="4 6" opacity="0.5"/>
      <path d="${minPath}" class="hero-line" fill="none" stroke="url(#hero-stroke)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${minPts.at(-1)[0]}" cy="${minPts.at(-1)[1]}" r="6" fill="var(--bg-elev)" stroke="${SCENARIO_TONE[min.scenarioId]}" stroke-width="2.4"/>
      <circle cx="${minPts.at(-1)[0]}" cy="${minPts.at(-1)[1]}" r="2.2" fill="${SCENARIO_TONE[min.scenarioId]}"/>
    </svg>
    <div class="hero-chart-overlay">
      <span class="lg"><i style="background:${SCENARIO_TONE[min.scenarioId]}"></i>${escapeHtml(min.scenarioId)} ${escapeHtml(SCENARIO_SHORT[min.scenarioId])}</span>
      <span class="lg"><i style="background:var(--ink-muted);height:1px;border-radius:0;border-top:2px dashed currentColor;"></i>S0 整车买断</span>
    </div>
  `;
}

// ---------- Main multi-scenario chart ----------
function renderMainChart(result, mode, visible, layers) {
  const cfg = result.cfg;
  let series = result.monthlyByScenario.map((rows, i) => ({
    id: result.scenarios[i].scenarioId,
    name: result.scenarios[i].scenarioName,
    rows
  })).filter((s) => visible.has(s.id));

  const yField = mode === "delta" ? "deltaVsBuyout" : mode === "fund" ? "fundBalance" : "netCost";
  if (mode === "delta") series = series.filter((s) => s.id !== "S0");
  if (mode === "fund") series = series.filter((s) => s.rows.some((r) => r.fundBalance != null));

  if (!series.length) {
    return `<div class="chart-empty">勾选至少一个方案即可查看曲线</div>`;
  }

  const W = CHART.W, H = CHART.H, M = CHART.M;
  const allY = series.flatMap((s) => s.rows.map((r) => Number(r[yField]) || 0));
  let yMin = Math.min(...allY, mode !== "cost" ? 0 : Infinity);
  let yMax = Math.max(...allY, mode !== "cost" ? 0 : -Infinity);
  if (Math.abs(yMax - yMin) < 1) { yMax += 1; yMin -= 1; }
  const pad = (yMax - yMin) * 0.12; yMin -= pad; yMax += pad;
  const xMin = 1, xMax = cfg.horizonMonths;
  const { xs, ys, pw, ph } = chartScales(W, H, M, xMin, xMax, yMin, yMax);

  const yTicks = makeYTicks(yMin, yMax, 5);
  const xTicks = makeMonthTicks(xMin, xMax);

  // gradient defs
  const defs = series.map((s) => {
    const tone = SCENARIO_TONE[s.id] || "var(--ink)";
    return `
      <linearGradient id="grad-${s.id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${tone}" stop-opacity="0.30"/>
        <stop offset="100%" stop-color="${tone}" stop-opacity="0"/>
      </linearGradient>
    `;
  }).join("");

  // areas + lines
  const paint = series.map((s, i) => {
    const tone = SCENARIO_TONE[s.id] || "var(--ink)";
    const pts = s.rows.map((r) => [xs(r.month), ys(Number(r[yField]) || 0)]);
    const path = smoothPath(pts);
    const baselineY = mode === "cost" ? ys(yMin) : ys(0);
    const area = `${path} L ${pts.at(-1)[0].toFixed(1)} ${baselineY.toFixed(1)} L ${pts[0][0].toFixed(1)} ${baselineY.toFixed(1)} Z`;
    // when many lines visible, fade non-S0 / non-best areas (otherwise stacking gradients become mud)
    const shouldFillArea = mode === "cost" && (series.length <= 3 || s.id === "S0" || s.id === result.summaryResult.find((x) => x.minCostFlag)?.scenarioId);
    return `
      ${shouldFillArea ? `<path d="${area}" fill="url(#grad-${s.id})" class="chart-area"/>` : ""}
      <path d="${path}" class="chart-line js-anim-line" stroke="${tone}" data-idx="${i}"/>
    `;
  }).join("");

  // markers
  const markers = computeMarkers(result, layers);
  const markerSvg = markers.map((m) => {
    const x = xs(m.month);
    return `
      <line class="chart-marker-line" x1="${x}" x2="${x}" y1="${M.top}" y2="${M.top + ph}" stroke="${m.color}"/>
      <text class="chart-marker-text" x="${x + 6}" y="${M.top + 14}" fill="${m.color}">${escapeHtml(m.label)}</text>
    `;
  }).join("");

  // tooltip payload
  const payload = {
    yField, mode, W, H, M, xMin, xMax, yMin, yMax,
    series: series.map((s) => ({
      id: s.id,
      name: SCENARIO_SHORT[s.id] || s.name,
      color: SCENARIO_TONE[s.id],
      values: s.rows.map((r) => ({
        x: r.month,
        y: Number(r[yField]) || 0,
        netCost: r.netCost,
        cumCash: r.cumulativeCashCost,
        fundBalance: r.fundBalance,
        delta: r.deltaVsBuyout
      }))
    }))
  };

  const legend = series.map((s) => `
    <span class="lg"><i style="background:${SCENARIO_TONE[s.id]}"></i>${escapeHtml(s.id)} ${escapeHtml(SCENARIO_SHORT[s.id] || "")}</span>
  `).join("");

  const zero = mode !== "cost" && yMin < 0 && yMax > 0
    ? `<line class="chart-zero" x1="${M.left}" x2="${M.left + pw}" y1="${ys(0)}" y2="${ys(0)}"/>`
    : "";

  return `
    <svg class="js-line-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" data-payload='${escapeAttr(JSON.stringify(payload))}'>
      <defs>${defs}</defs>
      <g class="chart-grid">
        ${yTicks.map((t) => `<line x1="${M.left}" x2="${M.left + pw}" y1="${ys(t)}" y2="${ys(t)}"/>`).join("")}
      </g>
      ${zero}
      <g class="chart-axis-text">
        ${yTicks.map((t) => `<text x="${M.left - 12}" y="${ys(t) + 4}" text-anchor="end">${escapeHtml(fmtWan(t))}</text>`).join("")}
        ${xTicks.map((t) => `<text x="${xs(t)}" y="${H - M.bottom + 22}" text-anchor="middle">${t}M</text>`).join("")}
      </g>
      <line class="chart-axis" x1="${M.left}" x2="${M.left + pw}" y1="${M.top + ph}" y2="${M.top + ph}"/>
      <line class="chart-axis" x1="${M.left}" x2="${M.left}" y1="${M.top}" y2="${M.top + ph}"/>
      ${markerSvg}
      ${paint}
      <g class="chart-focus" style="pointer-events:none;"></g>
      <line class="chart-guide" hidden/>
      <rect class="chart-hitbox" x="${M.left}" y="${M.top}" width="${pw}" height="${ph}" fill="transparent"/>
    </svg>
    <div class="chart-tooltip"></div>
    <div class="chart-legend">${legend}</div>
  `;
}

function computeMarkers(result, layers) {
  const cfg = result.cfg;
  const markers = [];
  if (layers.buyout && Number.isFinite(cfg.buyoutMonth) && cfg.buyoutMonth <= cfg.horizonMonths) {
    markers.push({ month: cfg.buyoutMonth, label: `买断 ${cfg.buyoutMonth}M`, color: "var(--bad)" });
  }
  if (layers.settle && cfg.finance.enableFinanceComparison) {
    const m = cfg.finance.planType === "interest_free" && cfg.finance.settlementMode === "balloon_at_interest_free_end"
      ? cfg.finance.interestFreeMonths
      : cfg.finance.totalLoanTermMonths;
    if (m && m <= cfg.horizonMonths) {
      markers.push({ month: m, label: `结清 ${m}M`, color: "var(--accent)" });
    }
  }
  if (layers.breakeven) {
    const min = result.summaryResult.find((s) => s.minCostFlag);
    if (min && min.scenarioId !== "S0") {
      const idx = result.scenarios.findIndex((s) => s.scenarioId === min.scenarioId);
      const rows = result.monthlyByScenario[idx];
      const r = rows.find((x) => x.deltaVsBuyout < 0);
      if (r) markers.push({ month: r.month, label: `${min.scenarioId} 平衡 ${r.month}M`, color: "var(--good)" });
    }
  }
  return markers;
}

function attachChartTooltip(root, mode) {
  const svg = root.querySelector(".js-line-chart");
  const tip = root.querySelector(".chart-tooltip");
  if (!svg || !tip) return;
  const payload = JSON.parse(svg.dataset.payload);
  const focus = svg.querySelector(".chart-focus");
  const guide = svg.querySelector(".chart-guide");
  const hit = svg.querySelector(".chart-hitbox");
  payload.series.forEach((s) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("r", "4.5");
    c.setAttribute("fill", "var(--bg-elev)");
    c.setAttribute("stroke", s.color);
    c.setAttribute("stroke-width", "2");
    focus.appendChild(c);
  });
  const xs = (m) => payload.M.left + ((m - payload.xMin) / Math.max(1, payload.xMax - payload.xMin)) * (payload.W - payload.M.left - payload.M.right);
  const ys = (v) => payload.M.top + (1 - (v - payload.yMin) / Math.max(1, payload.yMax - payload.yMin)) * (payload.H - payload.M.top - payload.M.bottom);

  function onMove(e) {
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const x = vb.x + (e.clientX - rect.left) * vb.width / rect.width;
    const clamped = Math.max(payload.M.left, Math.min(payload.W - payload.M.right, x));
    const raw = payload.xMin + (clamped - payload.M.left) / (payload.W - payload.M.left - payload.M.right) * (payload.xMax - payload.xMin);
    const month = Math.max(1, Math.min(payload.xMax, Math.round(raw)));
    const gx = xs(month);
    guide.setAttribute("x1", gx); guide.setAttribute("x2", gx);
    guide.setAttribute("y1", payload.M.top); guide.setAttribute("y2", payload.H - payload.M.bottom);
    guide.removeAttribute("hidden");
    const labelMap = { netCost: "净成本", deltaVsBuyout: "差额", fundBalance: "资金池" };
    const yLabel = labelMap[payload.yField] || "";
    const rows = payload.series.map((s, i) => {
      const v = s.values.find((p) => p.x === month) || s.values[0];
      const c = focus.children[i];
      c.setAttribute("cx", gx); c.setAttribute("cy", ys(v.y));
      return { ...s, ...v };
    }).sort((a, b) => (b.y || 0) - (a.y || 0));
    tip.classList.add("is-on");
    tip.innerHTML = `
      <strong>第 ${month} 月 · 第 ${Math.ceil(month / 12)} 年 · ${yLabel}</strong>
      ${rows.map((r) => `
        <div class="row">
          <i style="background:${r.color}"></i>
          <span class="nm">${escapeHtml(r.id)} ${escapeHtml(r.name)}</span>
          <span class="vl">${escapeHtml(fmtWan(r.y))}</span>
        </div>
      `).join("")}
    `;
    const hostRect = root.getBoundingClientRect();
    const lx = e.clientX - hostRect.left;
    const ly = e.clientY - hostRect.top;
    const tw = tip.offsetWidth || 220;
    const th = tip.offsetHeight || 140;
    let left = lx + 14;
    let top = ly - th / 2;
    if (left + tw > hostRect.width - 8) left = lx - tw - 14;
    if (top < 8) top = 8;
    if (top + th > hostRect.height - 8) top = hostRect.height - th - 8;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }
  function onLeave() {
    guide.setAttribute("hidden", "");
    tip.classList.remove("is-on");
  }
  hit.addEventListener("pointermove", onMove);
  hit.addEventListener("pointerenter", onMove);
  hit.addEventListener("pointerleave", onLeave);
}

// ---------- Sensitivity mini chart ----------
// Plots final net cost of EACH scenario across a range of one parameter
function renderSensitivityChart(samples, currentValue, valueFmt) {
  // samples: [{ value, recommended: {id, netCost}, byScenario: [{id, color, netCost}] }]
  const W = 360, H = 140;
  const M = { top: 12, right: 10, bottom: 24, left: 10 };
  const pw = W - M.left - M.right;
  const ph = H - M.top - M.bottom;

  const allValues = samples.map((s) => s.value);
  const allCosts = samples.flatMap((s) => s.byScenario.map((b) => b.netCost));
  const xMin = Math.min(...allValues), xMax = Math.max(...allValues);
  let yMin = Math.min(...allCosts), yMax = Math.max(...allCosts);
  const yPad = (yMax - yMin) * 0.1 || 1;
  yMin -= yPad; yMax += yPad;
  const xs = (v) => M.left + ((v - xMin) / Math.max(0.0001, xMax - xMin)) * pw;
  const ys = (v) => M.top + (1 - (v - yMin) / Math.max(0.0001, yMax - yMin)) * ph;

  // build per-scenario lines
  const ids = samples[0].byScenario.map((b) => b.id);
  const lines = ids.map((id) => {
    const color = SCENARIO_TONE[id];
    const pts = samples.map((s) => [xs(s.value), ys(s.byScenario.find((b) => b.id === id).netCost)]);
    const d = pts.map((p, i) => `${i ? "L" : "M"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.4" opacity="0.8"/>`;
  }).join("");

  // draw recommended dot at each sample
  const recDots = samples.map((s) => {
    const cx = xs(s.value);
    const rec = s.byScenario.find((b) => b.id === s.recommendedId);
    const cy = ys(rec.netCost);
    return `<circle cx="${cx}" cy="${cy}" r="3" fill="${SCENARIO_TONE[s.recommendedId]}" stroke="var(--bg-elev)" stroke-width="1.5"/>`;
  }).join("");

  // current value vertical
  const currentX = xs(currentValue);
  const currentLine = `<line x1="${currentX}" x2="${currentX}" y1="${M.top}" y2="${M.top + ph}" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.7"/>`;

  // x-axis labels: min, current, max
  const labels = `
    <text x="${xs(xMin)}" y="${H - 4}" font-size="10" fill="var(--ink-faint)" text-anchor="start" font-family="var(--ff-mono)">${valueFmt(xMin)}</text>
    <text x="${currentX}" y="${H - 4}" font-size="10" fill="var(--accent-strong)" text-anchor="middle" font-family="var(--ff-mono)" font-weight="600">${valueFmt(currentValue)}</text>
    <text x="${xs(xMax)}" y="${H - 4}" font-size="10" fill="var(--ink-faint)" text-anchor="end" font-family="var(--ff-mono)">${valueFmt(xMax)}</text>
  `;

  return `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      ${lines}
      ${currentLine}
      ${recDots}
      ${labels}
    </svg>
  `;
}
