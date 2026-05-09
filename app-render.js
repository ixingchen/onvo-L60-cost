/* =========================================================
   TCO Workbench — rendering layer
   Hero · KPIs · Chips · Layer toggles · Charts · Tables
   ========================================================= */

// ---------------- Hero ----------------
function renderHero(result) {
  const cfg = result.cfg;
  const profile = currentProfile();
  const min = result.summaryResult.find((s) => s.minCostFlag);
  const s0 = result.summaryResult.find((s) => s.scenarioId === "S0");
  const delta = (min && s0) ? min.finalNetCost - s0.finalNetCost : 0;
  const isSaving = delta < 0;
  const brand = profile.brandId;
  const brandLabel = `${profile.brandName} · ${profile.brandNameEn}`;
  document.getElementById("hero").innerHTML = `
    <div>
      <div class="hero-eyebrow">
        <span class="brand-chip" data-brand="${escapeAttr(brand)}">${escapeHtml(brandLabel)}</span>
        <span style="margin-left:10px;">数据 ${escapeHtml(cfg.dataVersion)}</span>
      </div>
      <h1>${escapeHtml(profile.modelName)}</h1>
      <div class="hero-sub">
        ${cfg.horizonMonths} 个月模拟 · 整车 ¥${cfg.wholeCarPrice.toLocaleString("zh-CN")} ·
        BaaS 车价 ¥${cfg.bodyPrice.toLocaleString("zh-CN")} · 月租 ¥${cfg.batteryRent}
      </div>
    </div>
    <div class="hero-callout">
      <span class="label">${cfg.horizonMonths} 月最低成本方案</span>
      <span class="value">${escapeHtml(min?.scenarioId || "")} · ${formatYuanShort(min?.finalNetCost || 0)}</span>
      <span class="delta">
        相对整车买断
        <strong class="${isSaving ? "" : "up"}">${signed(delta)}</strong>
        · ${escapeHtml(SCENARIO_SHORT[min?.scenarioId] || min?.scenarioName || "")}
      </span>
    </div>
  `;
}

// ---------------- KPI strip ----------------
function renderKpis(result) {
  const cfg = result.cfg;
  const summary = result.summaryResult;
  const min = summary.find((s) => s.minCostFlag);
  const s0 = summary.find((s) => s.scenarioId === "S0");
  const s1 = summary.find((s) => s.scenarioId === "S1");
  const s4 = summary.find((s) => s.scenarioId === "S4");
  const buyoutDue = calcBuyoutDue(cfg, cfg.buyoutMonth);

  // crossover month: first month at which min scenario surpasses S0
  let crossoverMonth = null;
  if (min && min.scenarioId !== "S0") {
    const rows = result.monthlyByScenario[result.scenarios.findIndex((s) => s.scenarioId === min.scenarioId)];
    for (const row of rows) {
      if (row.deltaVsBuyout < 0) { crossoverMonth = row.month; break; }
    }
  }

  const kpis = [
    {
      label: "最低成本方案",
      value: min ? `${min.scenarioId}` : "—",
      meta: min ? `${formatYuanShort(min.finalNetCost)} · ${escapeHtml(SCENARIO_SHORT[min.scenarioId] || "")}` : ""
    },
    {
      label: `相对整车买断 · ${cfg.horizonMonths} 月`,
      value: signed(min ? min.finalNetCost - (s0?.finalNetCost || 0) : 0),
      meta: kpiBadge(min ? min.finalNetCost - (s0?.finalNetCost || 0) : 0)
    },
    {
      label: "S1 盈亏平衡月",
      value: s1?.breakEvenMonth ? `第 ${s1.breakEvenMonth} 月` : "未达到",
      meta: crossoverMonth ? `最低方案首次低于买断 第 ${crossoverMonth} 月` : "相对整车买断"
    },
    {
      label: `第 ${cfg.buyoutMonth} 月买断应付`,
      value: formatYuanShort(buyoutDue),
      meta: `电池价 ¥${cfg.batteryPrice.toLocaleString("zh-CN")} · S4 池余 ${s4?.fundEndingBalance == null ? "—" : formatYuanShort(s4.fundEndingBalance)}`
    }
  ];

  document.getElementById("kpi-strip").innerHTML = kpis.map((k) => `
    <article class="kpi">
      <span class="label">${escapeHtml(k.label)}</span>
      <span class="value">${k.value}</span>
      <span class="meta">${k.meta}</span>
    </article>
  `).join("");
}

function kpiBadge(delta) {
  if (delta == null || isNaN(delta)) return "";
  const isSaving = delta < 0;
  const cls = isSaving ? "" : "up";
  return `<span class="badge ${cls}">${isSaving ? "↓" : "↑"} ${formatYuanShort(Math.abs(delta))}</span> 相对整车买断`;
}

// ---------------- Scenario chips ----------------
function renderChips(result) {
  const host = document.getElementById("scenario-chips");
  const visible = state.visibleScenarios;
  const summary = Object.fromEntries(result.summaryResult.map((s) => [s.scenarioId, s]));
  const groups = SCENARIO_GROUPS.map((g) => ({
    ...g,
    items: g.ids.filter((id) => result.scenarios.find((s) => s.scenarioId === id))
  })).filter((g) => g.items.length);

  const presetButtons = `
    <div style="display:flex;gap:6px;margin-left:auto;align-items:center;">
      <span style="font-size:11px;color:var(--muted);margin-right:4px;">预设</span>
      <button class="chip" data-chip-preset="all">全部</button>
      <button class="chip" data-chip-preset="baas">仅 BaaS</button>
      <button class="chip" data-chip-preset="fin">仅金融</button>
      <button class="chip" data-chip-preset="none">仅 S0</button>
    </div>
  `;

  host.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;width:100%;">
      ${groups.map((g) => `
        <span style="font-size:11px;color:var(--muted);margin:0 4px 0 ${g.id === "anchor" ? "0" : "8px"};letter-spacing:0.04em;">${escapeHtml(g.name)}</span>
        ${g.items.map((id) => {
          const isOn = visible.has(id);
          const color = SCENARIO_COLORS[id] || "var(--muted)";
          const s = summary[id];
          const delta = s ? s.finalNetCost - (summary["S0"]?.finalNetCost || 0) : 0;
          return `
            <button class="chip ${isOn ? "is-on" : ""}" data-chip="${id}" title="${escapeAttr(SCENARIO_SHORT[id] || "")} · ${formatYuanFull(s?.finalNetCost || 0)}${id === "S0" ? "" : ` · ${signed(delta)}`}">
              <span class="swatch" style="background:${color}"></span>
              <span class="id">${escapeHtml(id)}</span>
              <span>${escapeHtml(SCENARIO_SHORT[id] || "")}</span>
            </button>
          `;
        }).join("")}
      `).join("")}
      ${presetButtons}
    </div>
  `;
}

// ---------------- Layer toggles ----------------
function renderLayerToggles() {
  const host = document.getElementById("layer-toggles");
  const layers = state.layers;
  const isLineChart = ["cost", "delta", "fund"].includes(state.chartType);
  if (!isLineChart) { host.innerHTML = ""; return; }
  host.innerHTML = `
    <div class="layer-toggles">
      <span style="font-size:11px;color:var(--muted);margin-right:4px;letter-spacing:0.06em;text-transform:uppercase;">关键标记</span>
      <button class="layer ${layers.buyoutMarker ? "is-on" : ""}" data-layer="buyoutMarker">买断月</button>
      <button class="layer ${layers.settlementMarker ? "is-on" : ""}" data-layer="settlementMarker">贷款结清月</button>
      <button class="layer ${layers.breakevenMarker ? "is-on" : ""}" data-layer="breakevenMarker">盈亏平衡月</button>
    </div>
  `;
}

// ---------------- Analysis dispatcher ----------------
function renderAnalysis(result) {
  // tab state
  document.querySelectorAll("[data-chart-tab]").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.chartTab === state.chartType);
  });
  const titleEl = document.getElementById("chart-title");
  const subEl = document.getElementById("chart-sub");
  const titles = {
    cost: ["逐月累计净成本", "净成本 = 累计现金支出 − 累计投资收益"],
    delta: ["相对整车买断差额", "曲线低于零轴 = 比整车买断更划算"],
    fund: ["投资资金池余额", "资金留存按周期结算 · 理财池逐月扣租 / 还贷"],
    buyout: ["买断应付金额曲线", `第 ${result.cfg.creditStartMonth}–${result.cfg.creditEndMonth} 月每月抵扣 ¥${result.cfg.creditPerMonth}`],
    composition: [`${result.cfg.horizonMonths} 月成本构成`, "粗条为支出 · 细条为补贴 / 积分 / 投资收益抵减"]
  };
  titleEl.textContent = titles[state.chartType][0];
  subEl.textContent = titles[state.chartType][1];

  // chips visible only for cost / delta / fund
  document.getElementById("scenario-chips").style.display = ["cost", "delta", "fund"].includes(state.chartType) ? "flex" : "none";

  const host = document.getElementById("chart-box");
  if (state.chartType === "cost") {
    host.innerHTML = renderLineChart(result, "netCost", { zeroLine: false });
  } else if (state.chartType === "delta") {
    host.innerHTML = renderLineChart(result, "deltaVsBuyout", { zeroLine: true, excludeS0: true });
  } else if (state.chartType === "fund") {
    host.innerHTML = renderLineChart(result, "fundBalance", { zeroLine: true, onlyWithFund: true });
  } else if (state.chartType === "buyout") {
    host.innerHTML = renderBuyoutCurveChart(result.cfg);
  } else {
    host.innerHTML = renderCompositionStack(result);
  }
  // attach tooltip
  attachLineTooltip(host, result);
}

// ---------------- Line chart (custom) ----------------
function renderLineChart(result, yField, opts = {}) {
  const cfg = result.cfg;
  const visible = state.visibleScenarios;
  let series = result.monthlyByScenario.map((rows, i) => ({
    scenarioId: result.scenarios[i].scenarioId,
    scenarioName: result.scenarios[i].scenarioName,
    rows
  }));
  if (opts.excludeS0) series = series.filter((s) => s.scenarioId !== "S0");
  if (opts.onlyWithFund) series = series.filter((s) => s.rows.some((r) => r.fundBalance != null));
  series = series.filter((s) => visible.has(s.scenarioId));
  if (!series.length) return `<div class="chart-empty">在上方至少勾选一个方案 chip 才能查看曲线。</div>`;

  const W = 920, H = 380;
  const M = { top: 16, right: 18, bottom: 30, left: 64 };
  const pw = W - M.left - M.right;
  const ph = H - M.top - M.bottom;

  // domain
  const allY = series.flatMap((s) => s.rows.map((r) => Number(r[yField]) || 0));
  let yMin = Math.min(...allY, opts.zeroLine ? 0 : Infinity);
  let yMax = Math.max(...allY, opts.zeroLine ? 0 : -Infinity);
  if (Math.abs(yMax - yMin) < 1) { yMax += 1; yMin -= 1; }
  const yPad = (yMax - yMin) * 0.10;
  yMin -= yPad; yMax += yPad;
  const xMin = 1, xMax = cfg.horizonMonths;
  const xs = (m) => M.left + ((m - xMin) / Math.max(1, xMax - xMin)) * pw;
  const ys = (v) => M.top + (1 - (v - yMin) / (yMax - yMin)) * ph;

  // ticks
  const yTicks = makeTicks(yMin, yMax, 5);
  const xTicks = makeMonthTicks(xMin, xMax);

  // markers
  const markers = computeMarkers(result, series);
  const markerSvg = state.layers.buyoutMarker || state.layers.settlementMarker || state.layers.breakevenMarker
    ? markers.map((m) => {
        if (m.kind === "buyout" && !state.layers.buyoutMarker) return "";
        if (m.kind === "settle" && !state.layers.settlementMarker) return "";
        if (m.kind === "breakeven" && !state.layers.breakevenMarker) return "";
        const x = xs(m.month);
        return `
          <line class="chart-marker-line" x1="${x}" x2="${x}" y1="${M.top}" y2="${M.top + ph}" stroke="${m.color}" />
          <text class="chart-marker-text" x="${x + 4}" y="${M.top + 12}" fill="${m.color}">${escapeHtml(m.label)}</text>
        `;
      }).join("")
    : "";

  // lines + areas
  const lines = series.map((s) => {
    const color = SCENARIO_COLORS[s.scenarioId] || "#888";
    const pts = s.rows.map((r) => `${xs(r.month).toFixed(1)},${ys(Number(r[yField]) || 0).toFixed(1)}`).join(" ");
    return `<polyline class="chart-line is-on" points="${pts}" stroke="${color}" />`;
  }).join("");

  // zero line
  const zero = opts.zeroLine && yMin < 0 && yMax > 0
    ? `<line class="chart-zero" x1="${M.left}" x2="${M.left + pw}" y1="${ys(0)}" y2="${ys(0)}" />`
    : "";

  const tooltipPayload = {
    yField, W, H, M, xMin, xMax, yMin, yMax,
    series: series.map((s) => ({
      id: s.scenarioId,
      name: s.scenarioName,
      color: SCENARIO_COLORS[s.scenarioId],
      values: s.rows.map((r) => ({
        x: r.month,
        y: Number(r[yField]) || 0,
        netCost: r.netCost,
        cumCash: r.cumulativeCashCost,
        fundBalance: r.fundBalance,
        loanPayment: r.loanPayment,
        rent: r.rent,
        buyout: r.buyout,
        delta: r.deltaVsBuyout
      }))
    }))
  };

  const legend = series.map((s) => `
    <span class="lg"><i style="background:${SCENARIO_COLORS[s.scenarioId]}"></i>${escapeHtml(s.scenarioId)} ${escapeHtml(SCENARIO_SHORT[s.scenarioId] || "")}</span>
  `).join("");

  return `
    <div class="chart-scroll">
      <svg class="js-line-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" data-payload='${escapeAttr(JSON.stringify(tooltipPayload))}'>
        <g class="chart-grid">
          ${yTicks.map((t) => `<line x1="${M.left}" x2="${M.left + pw}" y1="${ys(t)}" y2="${ys(t)}"/>`).join("")}
        </g>
        ${zero}
        <g class="chart-axis-text">
          ${yTicks.map((t) => `<text x="${M.left - 10}" y="${ys(t) + 3}" text-anchor="end">${escapeHtml(formatYuanShort(t))}</text>`).join("")}
          ${xTicks.map((t) => `<text x="${xs(t)}" y="${H - M.bottom + 18}" text-anchor="middle">${t} 月</text>`).join("")}
        </g>
        <line class="chart-axis" x1="${M.left}" x2="${M.left + pw}" y1="${M.top + ph}" y2="${M.top + ph}"/>
        <line class="chart-axis" x1="${M.left}" x2="${M.left}" y1="${M.top}" y2="${M.top + ph}"/>
        ${markerSvg}
        ${lines}
        <g class="chart-focus" hidden></g>
        <line class="chart-guide" hidden />
        <rect class="chart-hitbox" x="${M.left}" y="${M.top}" width="${pw}" height="${ph}" fill="transparent" />
      </svg>
    </div>
    <div class="chart-tooltip" hidden></div>
    <div class="chart-legend">${legend}</div>
  `;
}

function computeMarkers(result, series) {
  const cfg = result.cfg;
  const markers = [];
  if (Number.isFinite(cfg.buyoutMonth) && cfg.buyoutMonth <= cfg.horizonMonths) {
    markers.push({ kind: "buyout", month: cfg.buyoutMonth, label: `买断 第${cfg.buyoutMonth}月`, color: "var(--bad)" });
  }
  if (cfg.finance.enableFinanceComparison) {
    const settleMonth = cfg.finance.planType === "interest_free" && cfg.finance.settlementMode === "balloon_at_interest_free_end"
      ? cfg.finance.interestFreeMonths
      : cfg.finance.totalLoanTermMonths;
    if (settleMonth && settleMonth <= cfg.horizonMonths) {
      markers.push({ kind: "settle", month: settleMonth, label: `结清 第${settleMonth}月`, color: "var(--accent)" });
    }
  }
  // breakeven: first month any visible non-S0 series goes below S0 (delta < 0)
  const beScen = series.find((s) => s.scenarioId !== "S0");
  if (beScen) {
    const row = beScen.rows.find((r) => r.deltaVsBuyout < 0);
    if (row) markers.push({ kind: "breakeven", month: row.month, label: `${beScen.scenarioId} 平衡 第${row.month}月`, color: "var(--good)" });
  }
  return markers;
}

function makeTicks(min, max, count) {
  const step = (max - min) / Math.max(1, count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}
function makeMonthTicks(min, max) {
  const span = max - min;
  const step = span <= 24 ? 3 : span <= 60 ? 12 : span <= 120 ? 12 : 24;
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) ticks.push(v);
  if (!ticks.includes(1)) ticks.unshift(1);
  if (ticks[ticks.length - 1] !== max) ticks.push(max);
  return ticks;
}

// ---------------- Buyout curve ----------------
function renderBuyoutCurveChart(cfg) {
  const W = 920, H = 360;
  const M = { top: 16, right: 18, bottom: 30, left: 64 };
  const pw = W - M.left - M.right;
  const ph = H - M.top - M.bottom;
  const end = Math.max(cfg.horizonMonths, cfg.creditEndMonth + 12);
  const points = [];
  for (let m = 1; m <= end; m += 1) points.push({ x: m, y: calcBuyoutDue(cfg, m) });
  const yMin = 0, yMax = Math.max(...points.map((p) => p.y)) * 1.1 || cfg.batteryPrice;
  const xMin = 1, xMax = end;
  const xs = (m) => M.left + ((m - xMin) / Math.max(1, xMax - xMin)) * pw;
  const ys = (v) => M.top + (1 - (v - yMin) / (yMax - yMin)) * ph;
  const yTicks = makeTicks(yMin, yMax, 5);
  const xTicks = makeMonthTicks(xMin, xMax);
  const path = points.map((p) => `${xs(p.x).toFixed(1)},${ys(p.y).toFixed(1)}`).join(" ");
  const buyoutX = xs(Math.min(cfg.buyoutMonth, end));
  const buyoutY = ys(calcBuyoutDue(cfg, cfg.buyoutMonth));
  return `
    <div class="chart-scroll">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
        <g class="chart-grid">${yTicks.map((t) => `<line x1="${M.left}" x2="${M.left + pw}" y1="${ys(t)}" y2="${ys(t)}"/>`).join("")}</g>
        <g class="chart-axis-text">
          ${yTicks.map((t) => `<text x="${M.left - 10}" y="${ys(t) + 3}" text-anchor="end">${escapeHtml(formatYuanShort(t))}</text>`).join("")}
          ${xTicks.map((t) => `<text x="${xs(t)}" y="${H - M.bottom + 18}" text-anchor="middle">${t} 月</text>`).join("")}
        </g>
        <line class="chart-axis" x1="${M.left}" x2="${M.left + pw}" y1="${M.top + ph}" y2="${M.top + ph}"/>
        <line class="chart-axis" x1="${M.left}" x2="${M.left}" y1="${M.top}" y2="${M.top + ph}"/>
        <polyline class="chart-line is-on" points="${path}" stroke="${SCENARIO_COLORS.S0}" />
        <line class="chart-marker-line" x1="${buyoutX}" x2="${buyoutX}" y1="${M.top}" y2="${M.top + ph}" stroke="var(--bad)" />
        <circle cx="${buyoutX}" cy="${buyoutY}" r="5" fill="var(--bad)" stroke="#fff" stroke-width="2"/>
        <text x="${buyoutX + 6}" y="${buyoutY - 8}" fill="var(--bad)" class="chart-marker-text">第 ${cfg.buyoutMonth} 月 · ${escapeHtml(formatYuanShort(calcBuyoutDue(cfg, cfg.buyoutMonth)))}</text>
      </svg>
    </div>
    <div class="chart-legend">
      <span class="lg"><i style="background:${SCENARIO_COLORS.S0}"></i>买断应付</span>
      <span class="lg"><i style="background:var(--bad)"></i>当前买断月</span>
    </div>
  `;
}

// ---------------- Composition ----------------
function renderCompositionStack(result) {
  const components = [
    ["vehicleCost", "车价/首付"],
    ["loanPayment", "贷款月供"],
    ["tax", "购置税"],
    ["insurance", "保险"],
    ["rent", "租金"],
    ["buyout", "买断款"],
    ["energy", "补能"]
  ];
  const offsets = [
    ["subsidy", "补贴"],
    ["pointRebate", "积分"],
    ["investmentGain", "投资收益"]
  ];
  const COLOR = {
    vehicleCost: "oklch(0.20 0.01 250)",
    loanPayment: "oklch(0.50 0.13 252)",
    tax: "oklch(0.70 0.10 220)",
    insurance: "oklch(0.55 0.13 295)",
    rent: "oklch(0.65 0.13 75)",
    buyout: "oklch(0.58 0.18 25)",
    energy: "oklch(0.55 0.13 155)",
    subsidy: "oklch(0.78 0.04 250)",
    pointRebate: "oklch(0.85 0.04 250)",
    investmentGain: "oklch(0.70 0.07 200)"
  };

  const grouped = groupByScenario(result.monthlyResult);
  const ids = Object.keys(grouped).filter((id) => state.visibleScenarios.has(id));
  if (!ids.length) return `<div class="chart-empty">勾选至少一个方案以查看构成。</div>`;
  const data = ids.map((id) => {
    const rows = grouped[id];
    const item = { id, name: SCENARIO_SHORT[id] || rows[0].scenarioName };
    components.forEach(([k]) => {
      item[k] = rows.reduce((acc, r) => acc + (Number(r[k]) || 0), 0);
    });
    offsets.forEach(([k]) => {
      if (k === "investmentGain") item[k] = rows[rows.length - 1].investmentGain || 0;
      else item[k] = rows.reduce((acc, r) => acc + (Number(r[k]) || 0), 0);
    });
    return item;
  });

  const positives = data.map((d) => components.reduce((a, [k]) => a + Math.max(0, d[k]), 0));
  const negatives = data.map((d) => offsets.reduce((a, [k]) => a + Math.max(0, d[k]), 0));
  const max = Math.max(...positives, ...negatives, 1);

  const W = 920, rowH = 56, pad = 12;
  const M = { top: 8, right: 24, bottom: 8, left: 130 };
  const H = M.top + M.bottom + data.length * rowH;
  const pw = W - M.left - M.right;
  const xs = (v) => (v / max) * pw;

  const rows = data.map((d, idx) => {
    const y = M.top + idx * rowH;
    let cursor = M.left;
    const supBars = components.filter(([k]) => d[k] > 0).map(([k, label]) => {
      const w = xs(d[k]);
      const r = `<rect x="${cursor}" y="${y + 8}" width="${w}" height="20" rx="3" fill="${COLOR[k]}"><title>${label} ¥${Math.round(d[k]).toLocaleString("zh-CN")}</title></rect>`;
      cursor += w; return r;
    }).join("");
    let cur2 = M.left;
    const offBars = offsets.filter(([k]) => d[k] > 0).map(([k, label]) => {
      const w = xs(d[k]);
      const r = `<rect x="${cur2}" y="${y + 32}" width="${w}" height="8" rx="2" fill="${COLOR[k]}"><title>${label} ¥${Math.round(d[k]).toLocaleString("zh-CN")}</title></rect>`;
      cur2 += w; return r;
    }).join("");
    const total = positives[idx] - negatives[idx];
    return `
      <g>
        <text x="${M.left - 12}" y="${y + 22}" text-anchor="end" font-size="11" fill="var(--muted)">${escapeHtml(d.id)}</text>
        <text x="${M.left - 12}" y="${y + 36}" text-anchor="end" font-size="10" fill="var(--muted-soft)">${escapeHtml(d.name)}</text>
        ${supBars}
        ${offBars}
        <text x="${cursor + 8}" y="${y + 22}" font-size="11" font-weight="600" fill="var(--ink-strong)">${escapeHtml(formatYuanShort(total))}</text>
      </g>
    `;
  }).join("");

  const legend = [...components, ...offsets].map(([k, lab]) =>
    `<span class="lg"><i style="background:${COLOR[k]}"></i>${escapeHtml(lab)}</span>`
  ).join("");
  return `
    <div class="chart-scroll">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="min-height:${H}px;">
        ${rows}
      </svg>
    </div>
    <div class="chart-legend">${legend}</div>
  `;
}

// ---------------- Tooltip handler ----------------
function attachLineTooltip(host, result) {
  const svg = host.querySelector(".js-line-chart");
  const tip = host.querySelector(".chart-tooltip");
  if (!svg || !tip) return;
  const payload = JSON.parse(svg.dataset.payload);
  const focusGroup = svg.querySelector(".chart-focus");
  const guide = svg.querySelector(".chart-guide");
  const hitbox = svg.querySelector(".chart-hitbox");
  payload.series.forEach((s) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("r", "4.5");
    c.setAttribute("fill", s.color);
    focusGroup.appendChild(c);
  });

  const xs = (m) => payload.M.left + ((m - payload.xMin) / Math.max(1, payload.xMax - payload.xMin)) * (payload.W - payload.M.left - payload.M.right);
  const ys = (v) => payload.M.top + (1 - (v - payload.yMin) / (payload.yMax - payload.yMin)) * (payload.H - payload.M.top - payload.M.bottom);

  function move(e) {
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const x = vb.x + (e.clientX - rect.left) * vb.width / rect.width;
    const clamped = Math.max(payload.M.left, Math.min(payload.W - payload.M.right, x));
    const rawMonth = payload.xMin + (clamped - payload.M.left) / (payload.W - payload.M.left - payload.M.right) * (payload.xMax - payload.xMin);
    const month = Math.max(1, Math.min(payload.xMax, Math.round(rawMonth)));
    const guideX = xs(month);
    guide.setAttribute("x1", guideX); guide.setAttribute("x2", guideX);
    guide.setAttribute("y1", payload.M.top); guide.setAttribute("y2", payload.H - payload.M.bottom);
    guide.removeAttribute("hidden");
    focusGroup.removeAttribute("hidden");
    const rows = payload.series.map((s, i) => {
      const v = s.values.find((p) => p.x === month) || s.values[0];
      const c = focusGroup.children[i];
      c.setAttribute("cx", guideX);
      c.setAttribute("cy", ys(v.y));
      return { id: s.id, name: s.name, color: s.color, ...v };
    });
    const yField = payload.yField;
    const labelMap = {
      netCost: "净成本",
      deltaVsBuyout: "相对买断",
      fundBalance: "资金池余额"
    };
    tip.hidden = false;
    tip.style.opacity = "1";
    tip.innerHTML = `
      <strong>第 ${month} 月 · 第 ${Math.ceil(month / 12)} 年</strong>
      ${rows.map((r) => `
        <div class="row">
          <i style="background:${r.color}"></i>
          <span class="nm">${escapeHtml(r.id)} ${escapeHtml(SCENARIO_SHORT[r.id] || "")}</span>
          <span class="vl">${escapeHtml(formatYuanShort(r[yField] != null ? r[yField] : r.y))}</span>
        </div>
        <div class="row" style="font-size:11px;color:var(--muted-soft);">
          <i></i>
          <span class="nm">累计现金 / 净成本 / Δ vs S0</span>
          <span class="vl" style="color:var(--muted);">
            ${escapeHtml(formatYuanShort(r.cumCash || 0))} ·
            ${escapeHtml(formatYuanShort(r.netCost || 0))} ·
            ${signed(r.delta || 0)}
          </span>
        </div>
      `).join("")}
    `;
    const hostRect = host.getBoundingClientRect();
    const lx = e.clientX - hostRect.left;
    const ly = e.clientY - hostRect.top;
    const tw = tip.offsetWidth || 240;
    const th = tip.offsetHeight || 140;
    let left = lx + 14;
    let top = ly - th - 10;
    if (left + tw > hostRect.width - 8) left = lx - tw - 14;
    if (top < 8) top = ly + 14;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }
  function leave() {
    guide.setAttribute("hidden", "");
    focusGroup.setAttribute("hidden", "");
    tip.style.opacity = "0";
    setTimeout(() => { if (tip.style.opacity === "0") tip.hidden = true; }, 160);
  }
  hitbox.addEventListener("pointermove", move);
  hitbox.addEventListener("pointerenter", move);
  hitbox.addEventListener("pointerleave", leave);
}

// ---------------- Tables ----------------
function renderTables(result) {
  // detail scenario picker
  const picker = document.getElementById("detail-scenario");
  picker.innerHTML = result.summaryResult.map((s) =>
    `<option value="${s.scenarioId}" ${s.scenarioId === state.detailScenario ? "selected" : ""}>${escapeHtml(s.scenarioId)} · ${escapeHtml(SCENARIO_SHORT[s.scenarioId] || s.scenarioName)}</option>`
  ).join("");

  // summary table
  const headers = ["方案", "净成本", "相对买断", "盈亏平衡", "现金支出", "月供", "结清款", "买断应付", "资金池余额"];
  const summaryRows = result.summaryResult.map((s) => {
    const cells = [
      `<span style="color:${SCENARIO_COLORS[s.scenarioId] || "inherit"};font-weight:600;">${escapeHtml(s.scenarioId)}</span> ${escapeHtml(SCENARIO_SHORT[s.scenarioId] || s.scenarioName)}`,
      formatYuanFull(s.finalNetCost),
      signed(s.deltaVsBuyout, formatYuanFull),
      s.breakEvenMonth ? `第 ${s.breakEvenMonth} 月` : "—",
      formatYuanFull(s.finalNominalCashCost),
      s.monthlyLoanPayment ? formatYuanFull(s.monthlyLoanPayment) : "—",
      s.balloonPayment ? formatYuanFull(s.balloonPayment) : "—",
      s.buyoutDue ? formatYuanFull(s.buyoutDue) : "—",
      s.fundEndingBalance == null ? "—" : formatYuanFull(s.fundEndingBalance)
    ];
    return { isBest: s.minCostFlag, cells };
  });
  document.getElementById("summary-table").innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
        <tbody>
          ${summaryRows.map((r) => `<tr>${r.cells.map((c, i) => `<td${r.isBest && i === 1 ? ' class="is-best"' : ""}>${c}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;

  // monthly table
  const rows = result.monthlyResult.filter((r) => r.scenarioId === state.detailScenario);
  const mh = ["月", "车价", "贷款", "税", "保险", "租金", "买断", "补贴/积分", "投资收益", "结算扣款", "资金余额", "净成本"];
  document.getElementById("monthly-table").innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>${mh.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map((r) => `<tr>
            <td>${r.month}</td>
            <td>${cell(r.vehicleCost)}</td>
            <td>${cell(r.loanPayment)}</td>
            <td>${cell(r.tax)}</td>
            <td>${cell(r.insurance)}</td>
            <td>${cell(r.rent)}</td>
            <td>${cell(r.buyout)}</td>
            <td>${cell((r.subsidy || 0) + (r.pointRebate || 0))}</td>
            <td>${cell(r.investmentGain)}</td>
            <td>${cell(r.retainedSettlement)}</td>
            <td>${r.fundBalance == null ? "—" : formatYuanFull(r.fundBalance)}</td>
            <td><strong>${formatYuanFull(r.netCost)}</strong></td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function cell(v) {
  if (v == null || Math.abs(v) < 0.5) return `<span style="color:var(--muted-soft);">—</span>`;
  return formatYuanFull(v);
}

// ---------------- Formulae ----------------
function renderFormulae(cfg) {
  const sources = cfg.sources || [];
  const fp = cfg.finance.planType === "interest_free"
    ? `${cfg.finance.totalLoanTermMonths} 月贷款，前 ${cfg.finance.interestFreeMonths} 月免息，` +
      (cfg.finance.settlementMode === "balloon_at_interest_free_end"
        ? `第 ${cfg.finance.interestFreeMonths} 月一次性结清剩余本金`
        : `之后按 ${(cfg.finance.postFreeAnnualRate * 100).toFixed(2)}% 年化继续分期`)
    : `${cfg.finance.totalLoanTermMonths} 期等额本息，年化 ${(cfg.finance.loanAnnualRate * 100).toFixed(2)}%`;

  document.getElementById("formula-block").innerHTML = `
    <div class="formula-grid">
      <p><strong>购置税</strong>：购车价 ÷ ${cfg.taxPolicy.vatDivisor} × ${(cfg.taxPolicy.taxRate * 100).toFixed(1)}%，再按 ${(cfg.taxPolicy.reliefRate * 100).toFixed(0)}% 减免，单车上限 ¥${cfg.taxPolicy.taxReliefCap.toLocaleString("zh-CN")}。</p>
      <p><strong>买断抵扣</strong>：第 ${cfg.creditStartMonth}–${cfg.creditEndMonth} 月每月抵扣 ¥${cfg.creditPerMonth}，买断款下限为零。</p>
      <p><strong>金融方案</strong>：${escapeHtml(fp)}。BaaS 贷款只覆盖车身价；电池未买断部分另计入资金池。</p>
      <p><strong>投资收益</strong>：月收益 = (1 + 年化 ${(cfg.investment.annualReturn * 100).toFixed(2)}%)<sup>1/12</sup> − 1；留存理财每 ${cfg.investment.retainedSettlementIntervalYears} 年结算一次外部垫付。</p>
      <p><strong>保险</strong>：BaaS 首年 ¥${cfg.insurance.baasFirstYear.toLocaleString("zh-CN")} / 买断首年 ¥${cfg.insurance.buyoutFirstYear.toLocaleString("zh-CN")}，次年起 ${(cfg.insurance.afterYear1Factor * 100).toFixed(0)}%。</p>
      <p><strong>免责声明</strong>：本工具为给定参数下的模拟结果，不构成购车、税务或投资建议。所有计算均基于公开资料整理的车型默认值，使用者可在参数侧栏调整任何字段。</p>
    </div>
    <div class="table-wrap" style="margin-top:8px;">
      <table>
        <thead><tr><th>编号</th><th>资料</th><th>链接</th></tr></thead>
        <tbody>
          ${sources.map((s) => `<tr>
            <td>${escapeHtml(s.id)}</td>
            <td>${escapeHtml(s.name)}</td>
            <td><a href="${escapeAttr(s.url)}" target="_blank" rel="noreferrer">${escapeHtml(s.url)}</a></td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}
