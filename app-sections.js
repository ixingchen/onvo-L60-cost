/* =========================================================
   TCO Workbench v3 · Section renderers
   ========================================================= */

// ---------- Hero ----------
function renderHero(result) {
  const cfg = result.cfg;
  const summary = result.summaryResult;
  const min = summary.find((s) => s.minCostFlag) || summary[0];
  const s0 = summary.find((s) => s.scenarioId === "S0");
  const savings = s0 ? s0.finalNetCost - min.finalNetCost : 0;
  const savingsPct = s0 ? Math.abs(savings) / s0.finalNetCost : 0;
  const profile = currentProfile();
  const years = (cfg.horizonMonths / 12).toFixed(0);

  // crossover month
  const minIdx = result.scenarios.findIndex((s) => s.scenarioId === min.scenarioId);
  const minRows = result.monthlyByScenario[minIdx];
  const crossover = minRows.find((r) => r.deltaVsBuyout < 0)?.month;

  return `
    <section class="section hero" data-section="hero">
      <div class="canvas">
        <div class="hero-grid">
          <div class="hero-eyebrow reveal">
            <span class="eyebrow"><span class="dot"></span>${escapeHtml(profile.brandName)} · ${escapeHtml(profile.brandNameEn)} · 数据 ${escapeHtml(cfg.dataVersion)}</span>
            <div class="horizon-picker" id="horizon-picker">
              ${[60, 96, 120].map((m) => `<button data-horizon="${m}" class="${m === cfg.horizonMonths ? "is-on" : ""}">${m / 12} 年</button>`).join("")}
            </div>
          </div>
          <h1 class="reveal" style="--reveal-delay:80ms;">
            未来 <span class="num">${years}</span> 年里,<br/>
            <span class="accent">${escapeHtml(SCENARIO_SHORT[min.scenarioId] || min.scenarioName)}</span> 比整车买断<br/>
            少花 <span class="num" id="hero-savings" data-target="${Math.abs(savings)}">${escapeHtml(fmtWan(Math.abs(savings)))}</span>。
          </h1>
          <p class="hero-sub reveal" style="--reveal-delay:160ms;">
            ${escapeHtml(profile.modelName)} · 整车价 ¥${cfg.wholeCarPrice.toLocaleString("zh-CN")} ·
            BaaS 车价 ¥${cfg.bodyPrice.toLocaleString("zh-CN")} ·
            电池租金 ¥${cfg.batteryRent}/月 · 第 ${cfg.buyoutMonth} 月可买断
          </p>

          <div class="hero-chart reveal" style="--reveal-delay:240ms;" id="hero-chart">
            ${renderHeroChart(result)}
          </div>

          <div class="hero-stats reveal" style="--reveal-delay:320ms;">
            <div class="hero-stat">
              <span class="lab">推荐方案净成本</span>
              <span class="val">${escapeHtml(fmtWan(min.finalNetCost))}</span>
              <span class="meta">${escapeHtml(min.scenarioId)} · ${escapeHtml(SCENARIO_SHORT[min.scenarioId] || "")}</span>
            </div>
            <div class="hero-stat">
              <span class="lab">相对整车买断</span>
              <span class="val ${savings > 0 ? "delta-down" : "delta-up"}">${escapeHtml(fmtSigned(-savings))}</span>
              <span class="meta">${(savingsPct * 100).toFixed(1)}% ${savings > 0 ? "更省" : "更贵"}</span>
            </div>
            <div class="hero-stat">
              <span class="lab">${crossover ? "追平整车买断" : "对比整车买断"}</span>
              <span class="val">${crossover ? `第 ${crossover} 月` : (savings > 0 ? "始终更低" : "始终更高")}</span>
              <span class="meta">${crossover ? `约第 ${Math.ceil(crossover / 12)} 年` : (savings > 0 ? `${SCENARIO_SHORT[min.scenarioId]} 从首月起更省` : "全期未追平")}</span>
            </div>
            <div class="hero-stat">
              <span class="lab">第 ${cfg.buyoutMonth} 月买断应付</span>
              <span class="val">${escapeHtml(fmtWan(calcBuyoutDue(cfg, cfg.buyoutMonth)))}</span>
              <span class="meta">原价 ¥${cfg.batteryPrice.toLocaleString("zh-CN")}</span>
            </div>
          </div>

          <div id="warnings"></div>
        </div>
      </div>
    </section>
  `;
}

// ---------- KPI ribbon ----------
function renderKpiRibbon(result) {
  const cfg = result.cfg;
  const summary = result.summaryResult;
  const min = summary.find((s) => s.minCostFlag);
  const s0 = summary.find((s) => s.scenarioId === "S0");
  const s1 = summary.find((s) => s.scenarioId === "S1");
  const s4 = summary.find((s) => s.scenarioId === "S4");
  const delta = min && s0 ? min.finalNetCost - s0.finalNetCost : 0;
  const totalRent = s1 ? s1.rentTotal || calcRentTotal(cfg) : calcRentTotal(cfg);

  const cells = [
    {
      lab: "全期最优",
      val: min ? min.scenarioId : "—",
      meta: min ? `${SCENARIO_SHORT[min.scenarioId]} · 净成本 ${fmtWan(min.finalNetCost)}` : "",
      highlight: true
    },
    {
      lab: "相对买断节省",
      val: fmtSigned(-delta),
      cls: delta < 0 ? "delta-down" : "delta-up",
      meta: `${cfg.horizonMonths} 个月累计`
    },
    {
      lab: "买断应付",
      val: fmtWan(calcBuyoutDue(cfg, cfg.buyoutMonth)),
      meta: `第 ${cfg.buyoutMonth} 月 · 抵扣后`
    },
    {
      lab: cfg.horizonMonths + " 个月租金合计",
      val: fmtWan(totalRent),
      meta: `月租 ¥${cfg.batteryRent} × ${cfg.horizonMonths}`
    }
  ];

  return `
    <section class="section" data-section="kpi">
      <div class="canvas">
        <div class="section-head reveal">
          <span class="eyebrow"><span class="dot"></span>关键指标</span>
          <h2>四个数字看懂这台车的拥有成本。</h2>
          <p class="lead">下面所有结论均由你在右下角抽屉调整的参数实时驱动。整车买断作为基线锚点 S0,所有方案与它对比。</p>
        </div>
        <div class="kpi-ribbon reveal" style="--reveal-delay:100ms;">
          ${cells.map((c) => `
            <article class="kpi-cell ${c.highlight ? "is-highlight" : ""}">
              <span class="lab">${escapeHtml(c.lab)}</span>
              <span class="val ${c.cls || ""}">${escapeHtml(c.val)}</span>
              <span class="meta">${escapeHtml(c.meta)}</span>
            </article>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function calcRentTotal(cfg) {
  return cfg.batteryRent * cfg.horizonMonths;
}

// ---------- Decision moments ----------
function renderMoments(result) {
  const cfg = result.cfg;
  const summary = result.summaryResult;
  const min = summary.find((s) => s.minCostFlag);
  const minIdx = result.scenarios.findIndex((s) => s.scenarioId === min.scenarioId);
  const minRows = result.monthlyByScenario[minIdx];
  const crossover = minRows.find((r) => r.deltaVsBuyout < 0)?.month;
  const settleM = cfg.finance.enableFinanceComparison
    ? (cfg.finance.planType === "interest_free" && cfg.finance.settlementMode === "balloon_at_interest_free_end"
        ? cfg.finance.interestFreeMonths : cfg.finance.totalLoanTermMonths)
    : null;
  const buyoutM = cfg.buyoutMonth;
  const horizon = cfg.horizonMonths;

  // sort moments along x
  const moments = [];
  if (crossover) moments.push({ month: crossover, lab: "追平买断", val: `第 ${crossover} 月`, tone: "good", desc: `${SCENARIO_SHORT[min.scenarioId]} 的累计净成本首次低于整车买断,标志着 BaaS / 金融的"投资回收期"。` });
  if (settleM) moments.push({ month: settleM, lab: "贷款结清", val: `第 ${settleM} 月`, tone: "accent", desc: `按当前金融方案,这是最后一笔月供 ${cfg.finance.planType === "interest_free" ? "或一次性结清尾款" : ""}的月份。结清后现金流压力骤降。` });
  if (buyoutM <= horizon) moments.push({ month: buyoutM, lab: "可买断电池", val: `第 ${buyoutM} 月`, tone: "bad", desc: `BaaS 车主到第 ${buyoutM} 月可一次性补足电池款 ${fmtWan(calcBuyoutDue(cfg, buyoutM))},把车并表为整车资产。` });
  moments.sort((a, b) => a.month - b.month);

  if (!moments.length) {
    return "";
  }

  const minM = 1, maxM = horizon;

  return `
    <section class="section" data-section="moments">
      <div class="canvas">
        <div class="section-head reveal">
          <span class="eyebrow"><span class="dot"></span>关键决策时刻</span>
          <h2>三个月份,决定你这十年的现金流。</h2>
          <p class="lead">在 ${horizon} 个月的拥有曲线上,以下三个时间点最值得标注。它们决定了你"什么时候省钱、什么时候花大钱"。</p>
        </div>

        <div class="timeline reveal" style="--reveal-delay:100ms;">
          <div class="timeline-track" style="--track-progress: 1;">
            ${moments.map((m, i) => {
              const x = ((m.month - minM) / Math.max(1, maxM - minM)) * 100;
              const side = i % 2 === 0 ? "above" : "below";
              return `
                <div class="timeline-mark" data-tone="${m.tone}" data-side="${side}" style="left:${x.toFixed(1)}%;">
                  <span class="lab">${escapeHtml(m.lab)}</span>
                  <span class="val">${escapeHtml(m.val)}</span>
                  <span class="pin"></span>
                </div>
              `;
            }).join("")}
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--ink-faint);font-family:var(--ff-mono);margin-top:-12px;">
            <span>第 1 月</span><span>第 ${horizon} 月</span>
          </div>

          <div class="timeline-grid">
            ${moments.map((m) => `
              <article class="timeline-card" data-tone="${m.tone}">
                <div class="head"><span class="dot"></span>${escapeHtml(m.lab)}</div>
                <div class="val">${escapeHtml(m.val)}</div>
                <div class="meta">${escapeHtml(m.desc)}</div>
              </article>
            `).join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

// ---------- Comparison ----------
function renderCompare(result) {
  const cfg = result.cfg;
  const summary = result.summaryResult;
  const s0 = summary.find((s) => s.scenarioId === "S0");
  const visible = state.compareSet;

  const chips = result.scenarios.map((s) => {
    const isOn = visible.has(s.scenarioId);
    return `
      <button class="chip ${isOn ? "is-on" : ""}" data-compare="${s.scenarioId}">
        <span class="swatch" style="background:${SCENARIO_TONE[s.scenarioId]}"></span>
        <span class="id">${s.scenarioId}</span>
        <span>${escapeHtml(SCENARIO_SHORT[s.scenarioId] || "")}</span>
      </button>
    `;
  }).join("");

  const cards = summary.filter((s) => visible.has(s.scenarioId)).map((s) => {
    const delta = s0 ? s.finalNetCost - s0.finalNetCost : 0;
    const isBest = s.minCostFlag;
    const tone = SCENARIO_TONE[s.scenarioId];
    return `
      <article class="compare-card ${isBest ? "is-best" : ""}" style="--card-tone:${tone};">
        <div class="head">
          <span class="id">${escapeHtml(s.scenarioId)}</span>
          <span class="winner">★ 最优方案</span>
        </div>
        <div>
          <h4 class="nm">${escapeHtml(SCENARIO_SHORT[s.scenarioId] || s.scenarioName)}</h4>
          <p class="desc">${escapeHtml(SCENARIO_DESC[s.scenarioId] || "")}</p>
        </div>
        <div>
          <div class="net-row">
            <span class="net">${escapeHtml(fmtWan(s.finalNetCost))}</span>
          </div>
          <div class="vs">
            ${s.scenarioId === "S0" ? "基线锚点" : `相对买断 <strong class="${delta > 0 ? "up" : ""}">${escapeHtml(fmtSigned(delta))}</strong>`}
          </div>
        </div>
        <dl>
          <dt>累计现金支出</dt><dd>${escapeHtml(fmtWan(s.finalNominalCashCost))}</dd>
          ${s.monthlyLoanPayment ? `<dt>月供</dt><dd>${escapeHtml(fmtFull(s.monthlyLoanPayment))}</dd>` : ""}
          ${s.balloonPayment ? `<dt>结清尾款</dt><dd>${escapeHtml(fmtWan(s.balloonPayment))}</dd>` : ""}
          ${s.buyoutDue ? `<dt>买断应付</dt><dd>${escapeHtml(fmtWan(s.buyoutDue))}</dd>` : ""}
          ${s.fundEndingBalance != null ? `<dt>资金池余额</dt><dd>${escapeHtml(fmtWan(s.fundEndingBalance))}</dd>` : ""}
          <dt>盈亏平衡</dt><dd>${s.breakEvenMonth ? "第 " + s.breakEvenMonth + " 月" : "—"}</dd>
        </dl>
      </article>
    `;
  }).join("");

  return `
    <section class="section" data-section="compare">
      <div class="canvas">
        <div class="section-head reveal">
          <span class="eyebrow"><span class="dot"></span>方案并排对比</span>
          <h2>挑 2–4 个方案,看它们的取舍差在哪。</h2>
          <p class="lead">点击下面的标签把方案加入对比卡。最便宜的那张会高亮成主推荐,你也可以挑相近成本的几张做横向比较。</p>
        </div>
        <div class="compare-bar reveal">
          <span class="lab">已对比 ${visible.size} 个 ·</span>
          ${chips}
        </div>
        <div class="compare-cards reveal" style="--reveal-delay:120ms;">${cards}</div>
      </div>
    </section>
  `;
}

// ---------- Main curves ----------
function renderCurves(result) {
  const cfg = result.cfg;
  const visible = state.curveVisible;
  const layers = state.layers;
  const mode = state.chartMode;

  const titles = {
    cost: ["逐月累计净成本", "净成本 = 累计现金 − 累计投资收益。低 = 钱花得少。"],
    delta: ["相对整车买断的差额", "曲线低于零轴 = 比整车买断更划算。"],
    fund: ["投资资金池余额", "理财池逐月扣租 / 还贷,曲线归零 = 池子被掏空。"]
  };

  const chips = result.scenarios.map((s) => {
    const on = visible.has(s.scenarioId);
    return `
      <button class="chip ${on ? "is-on" : ""}" data-curve="${s.scenarioId}">
        <span class="swatch" style="background:${SCENARIO_TONE[s.scenarioId]}"></span>
        <span class="id">${s.scenarioId}</span>
        <span>${escapeHtml(SCENARIO_SHORT[s.scenarioId] || "")}</span>
      </button>
    `;
  }).join("");

  return `
    <section class="section" data-section="curves">
      <div class="canvas">
        <div class="section-head reveal">
          <span class="eyebrow"><span class="dot"></span>逐月成本曲线</span>
          <h2>把每个方案画在同一张图上。</h2>
          <p class="lead">三种视角:净成本、与买断的差额、资金池余额。配合右上角"关键标记"开关,你能立刻看到买断月、贷款结清月、平衡月对曲线的影响。</p>
        </div>

        <div class="chart-shell reveal" style="--reveal-delay:120ms;">
          <div class="chart-title-row">
            <div>
              <h3 id="curve-title">${titles[mode][0]}</h3>
              <span class="sub" id="curve-sub">${titles[mode][1]}</span>
            </div>
            <div class="chart-tabs" id="curve-tabs">
              <button data-mode="cost" class="${mode === "cost" ? "is-active" : ""}">净成本</button>
              <button data-mode="delta" class="${mode === "delta" ? "is-active" : ""}">差额 vs 买断</button>
              <button data-mode="fund" class="${mode === "fund" ? "is-active" : ""}">资金池余额</button>
            </div>
          </div>

          <div class="chart-bar" style="margin-top:18px;">
            <div class="compare-bar" style="margin:0;">
              ${chips}
            </div>
          </div>

          <div class="chart-box" id="curve-box">
            ${renderMainChart(result, mode, visible, layers)}
          </div>

          <div class="layer-toggles">
            <span class="lab">关键标记</span>
            <button data-layer="buyout" class="${layers.buyout ? "is-on" : ""}">买断月</button>
            <button data-layer="settle" class="${layers.settle ? "is-on" : ""}">贷款结清月</button>
            <button data-layer="breakeven" class="${layers.breakeven ? "is-on" : ""}">盈亏平衡月</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

// ---------- Sensitivity ----------
function renderSensitivity(result) {
  const cfg = result.cfg;
  const params = [
    {
      key: "investment.annualReturn",
      label: "投资年化收益",
      desc: "把车价差额或资金池放进理财,年化每变化 0.5% 对结论意味着什么。",
      current: cfg.investment.annualReturn,
      range: [0, 0.06, 7],
      fmt: (v) => `${(v * 100).toFixed(1)}%`
    },
    {
      key: "finance.postFreeAnnualRate",
      label: "免息后贷款年化",
      desc: "免息期之后剩余本金按多少利率还,直接影响 F1–F4 的吸引力。",
      current: cfg.finance.postFreeAnnualRate,
      range: [0, 0.08, 7],
      fmt: (v) => `${(v * 100).toFixed(1)}%`
    },
    {
      key: "batteryPrice",
      label: "电池买断价",
      desc: "电池价上下浮动 ±20%,看 BaaS 买断方案是否还划算。",
      current: cfg.batteryPrice,
      range: [Math.round(cfg.batteryPrice * 0.7), Math.round(cfg.batteryPrice * 1.3), 7],
      fmt: (v) => fmtWan(v)
    }
  ];

  const cards = params.map((p) => {
    const samples = [];
    const [lo, hi, steps] = p.range;
    for (let i = 0; i < steps; i += 1) {
      const v = lo + (hi - lo) * (i / (steps - 1));
      const r = simulateWith(cfg, { [p.key]: v });
      const byScenario = r.summaryResult.map((s) => ({
        id: s.scenarioId,
        netCost: s.finalNetCost
      }));
      const recommended = r.summaryResult.find((s) => s.minCostFlag);
      samples.push({
        value: v,
        recommendedId: recommended.scenarioId,
        byScenario
      });
    }
    // takeaway: at extreme ranges, what's recommended
    const loRec = samples[0].recommendedId;
    const hiRec = samples[samples.length - 1].recommendedId;
    const currRec = result.summaryResult.find((s) => s.minCostFlag).scenarioId;
    let takeaway;
    if (loRec === hiRec && loRec === currRec) {
      takeaway = `结论稳健。即使 ${p.label} 在 ${p.fmt(lo)}–${p.fmt(hi)} 区间任意波动,推荐方案仍是 <strong>${currRec}</strong>。`;
    } else {
      takeaway = `结论会切换:在 ${p.fmt(lo)} 附近最优是 <strong>${loRec}</strong>,在 ${p.fmt(hi)} 附近变成 <strong>${hiRec}</strong>。`;
    }

    return `
      <article class="sens-card">
        <div class="head">
          <h4>${escapeHtml(p.label)}</h4>
          <span class="now">当前 ${escapeHtml(p.fmt(p.current))}</span>
        </div>
        <p class="desc">${escapeHtml(p.desc)}</p>
        <div class="sens-mini">${renderSensitivityChart(samples, p.current, p.fmt)}</div>
        <div class="sens-row">
          <span>${escapeHtml(p.fmt(lo))}</span>
          <span class="now-pill">推荐 ${escapeHtml(currRec)}</span>
          <span>${escapeHtml(p.fmt(hi))}</span>
        </div>
        <div class="sens-takeaway">${takeaway}</div>
      </article>
    `;
  }).join("");

  return `
    <section class="section" data-section="sensitivity">
      <div class="canvas">
        <div class="section-head reveal">
          <span class="eyebrow"><span class="dot"></span>敏感性分析</span>
          <h2>结论会因为这三个变量翻盘吗?</h2>
          <p class="lead">每张卡片把一个关键假设左右拉一遍,告诉你各方案的净成本怎么动、推荐方案是否会变。竖虚线 = 你当前的设置。</p>
        </div>
        <div class="sens-grid reveal" style="--reveal-delay:120ms;">${cards}</div>
      </div>
    </section>
  `;
}

// ---------- Recommender ----------
const REC_QUESTIONS = [
  {
    id: "horizon",
    q: "你大概几年后会换这台车?",
    opts: [
      { v: "60", l: "5 年内" },
      { v: "96", l: "8 年" },
      { v: "120", l: "10 年以上" }
    ]
  },
  {
    id: "cashFlow",
    q: "想把首付那笔钱花掉,还是留着理财?",
    opts: [
      { v: "spend", l: "全款付清" },
      { v: "invest", l: "想留下来理财" }
    ]
  },
  {
    id: "battery",
    q: "你介意租电池,还是希望整车产权?",
    opts: [
      { v: "rent", l: "租用没问题" },
      { v: "buyout", l: "中途想买断" },
      { v: "own", l: "一开始就要整车" }
    ]
  },
  {
    id: "monthly", q: "每月现金流是否敏感?",
    opts: [
      { v: "low", l: "希望月供低 / 灵活" },
      { v: "any", l: "都可以接受" }
    ]
  }
];

function recommendScenario(answers, summary) {
  // filter valid scenarios
  let candidates = summary.map((s) => s.scenarioId);

  if (answers.battery === "rent") {
    candidates = candidates.filter((id) => ["S1", "S2", "F1", "F2"].includes(id));
  } else if (answers.battery === "buyout") {
    candidates = candidates.filter((id) => ["S3", "S4"].includes(id));
  } else if (answers.battery === "own") {
    candidates = candidates.filter((id) => ["S0", "F3", "F4"].includes(id));
  }

  if (answers.cashFlow === "invest") {
    // prefer scenarios that have a fund / investment leg
    const withFund = candidates.filter((id) => id !== "S0");
    if (withFund.length) candidates = withFund;
  } else if (answers.cashFlow === "spend") {
    // prefer cash scenarios
    const cash = candidates.filter((id) => !id.startsWith("F"));
    if (cash.length) candidates = cash;
  }

  if (answers.monthly === "low") {
    const low = candidates.filter((id) => id.startsWith("F") || id === "S1" || id === "S2");
    if (low.length) candidates = low;
  }

  if (!candidates.length) candidates = summary.map((s) => s.scenarioId);

  // pick lowest-cost candidate
  const sorted = [...summary].filter((s) => candidates.includes(s.scenarioId)).sort((a, b) => a.finalNetCost - b.finalNetCost);
  return sorted[0];
}

function renderRecommender(result) {
  const cfg = result.cfg;
  const answers = state.answers;
  const rec = recommendScenario(answers, result.summaryResult);
  const s0 = result.summaryResult.find((s) => s.scenarioId === "S0");
  const delta = rec && s0 ? rec.finalNetCost - s0.finalNetCost : 0;

  const reasons = [];
  if (answers.horizon) reasons.push(`持有 ${Number(answers.horizon) / 12} 年`);
  if (answers.cashFlow === "invest") reasons.push("把现金留作理财");
  else if (answers.cashFlow === "spend") reasons.push("一次性付清");
  if (answers.battery === "rent") reasons.push("接受租电池");
  else if (answers.battery === "buyout") reasons.push("中途买断电池");
  else if (answers.battery === "own") reasons.push("整车产权");
  if (answers.monthly === "low") reasons.push("月供越低越好");

  return `
    <section class="section" data-section="recommend">
      <div class="canvas">
        <div class="section-head reveal">
          <span class="eyebrow"><span class="dot"></span>决策推荐器</span>
          <h2>四个问题,直接给出推荐方案。</h2>
          <p class="lead">回答下面的偏好,我们会从 9 个方案里挑一个最合适的,告诉你为什么。所有数字仍然来自当前参数设置。</p>
        </div>

        <div class="rec-shell reveal" style="--reveal-delay:120ms;">
          <div class="rec-grid">
            <div class="rec-questions">
              ${REC_QUESTIONS.map((q, i) => `
                <div class="rec-q">
                  <div class="q"><span class="num">${String(i + 1).padStart(2, "0")}</span>${escapeHtml(q.q)}</div>
                  <div class="opts">
                    ${q.opts.map((o) => `
                      <button data-rec-q="${q.id}" data-rec-v="${o.v}" class="${answers[q.id] === o.v ? "is-on" : ""}">${escapeHtml(o.l)}</button>
                    `).join("")}
                  </div>
                </div>
              `).join("")}
            </div>

            <aside class="rec-result">
              <span class="lab">为你推荐</span>
              <span class="id">${escapeHtml(rec?.scenarioId || "—")}</span>
              <span class="nm">${escapeHtml(SCENARIO_SHORT[rec?.scenarioId] || rec?.scenarioName || "尚未命中候选")}</span>
              <span class="why">基于 ${reasons.length ? reasons.map(escapeHtml).join(" · ") : "尚未作答"},在当前参数下这是最便宜的可行方案。</span>
              <div class="stats">
                <div>
                  <span class="l">净成本</span>
                  <span class="v">${rec ? escapeHtml(fmtWan(rec.finalNetCost)) : "—"}</span>
                </div>
                <div>
                  <span class="l">相对买断</span>
                  <span class="v">${rec ? escapeHtml(fmtSigned(delta)) : "—"}</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  `;
}

// ---------- Lab (full param tweaks inline) ----------
const LAB_FIELDS = [
  ["车型基础", [
    { p: "wholeCarPrice", l: "整车价", min: 80000, max: 800000, step: 1000, suf: "元", fmt: "wan" },
    { p: "bodyPrice", l: "BaaS 车身价", min: 80000, max: 800000, step: 1000, suf: "元", fmt: "wan" },
    { p: "batteryPrice", l: "电池买断价", min: 30000, max: 250000, step: 1000, suf: "元", fmt: "wan" },
    { p: "batteryRent", l: "电池月租", min: 200, max: 2000, step: 10, suf: "元/月" },
    { p: "horizonMonths", l: "模拟月数", min: 24, max: 240, step: 12, suf: "月" }
  ]],
  ["买断 / 抵扣", [
    { p: "buyoutMonth", l: "买断月", min: 1, max: 240, step: 1, suf: "月" },
    { p: "creditStartMonth", l: "抵扣起始月", min: 1, max: 60, step: 1, suf: "月" },
    { p: "creditEndMonth", l: "抵扣结束月", min: 1, max: 240, step: 1, suf: "月" },
    { p: "creditPerMonth", l: "每月抵扣", min: 0, max: 1000, step: 10, suf: "元" }
  ]],
  ["资金池", [
    { p: "investment.annualReturn", l: "年化收益", min: 0, max: 0.08, step: 0.001, suf: "", fmt: "pct" },
    { p: "investment.retainedSettlementIntervalYears", l: "结算间隔", min: 1, max: 5, step: 1, suf: "年" }
  ]],
  ["金融贷款", [
    { p: "finance.enableFinanceComparison", l: "启用金融对比", t: "toggle" },
    { p: "finance.planType", l: "方案类型", t: "select", opts: [["interest_free", "免息+尾款"], ["standard_amortized", "等额本息"]] },
    { p: "finance.downPaymentRatio", l: "首付比例", min: 0, max: 0.5, step: 0.05, suf: "", fmt: "pct" },
    { p: "finance.totalLoanTermMonths", l: "贷款总期限", min: 12, max: 84, step: 12, suf: "月" },
    { p: "finance.interestFreeMonths", l: "免息期", min: 0, max: 60, step: 6, suf: "月" },
    { p: "finance.postFreeAnnualRate", l: "免息后年化", min: 0, max: 0.1, step: 0.005, suf: "", fmt: "pct" }
  ]],
  ["保险与补贴", [
    { p: "insurance.baasFirstYear", l: "BaaS 首年保费", min: 2000, max: 12000, step: 100, suf: "元" },
    { p: "insurance.buyoutFirstYear", l: "整车首年保费", min: 2000, max: 15000, step: 100, suf: "元" },
    { p: "insurance.afterYear1Factor", l: "次年起折扣", min: 0.4, max: 1, step: 0.05, suf: "", fmt: "pct" },
    { p: "subsidyPolicy.replaceSubsidyCap", l: "置换补贴上限", min: 0, max: 30000, step: 500, suf: "元" }
  ]]
];

function renderLab() {
  return `
    <section class="section" data-section="lab">
      <div class="canvas">
        <div class="section-head reveal">
          <span class="eyebrow"><span class="dot"></span>调参实验室</span>
          <h2>把所有假设摊开,亲手摇一遍。</h2>
          <p class="lead">右下角的抽屉装的是核心参数,这里是完整面板。任何一格变化,上面所有结论会实时刷新。</p>
        </div>
        <div class="lab-grid reveal" style="--reveal-delay:120ms;">
          ${LAB_FIELDS.map(([title, fields]) => `
            <div class="lab-group">
              <h4>${escapeHtml(title)}</h4>
              ${fields.map(renderLabField).join("")}
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderLabField(f) {
  if (f.t === "toggle") {
    return `
      <label class="toggle">
        <input type="checkbox" data-path="${escapeAttr(f.p)}">
        ${escapeHtml(f.l)}
      </label>
    `;
  }
  if (f.t === "select") {
    return `
      <div class="field">
        <div class="field-label"><span class="nm">${escapeHtml(f.l)}</span></div>
        <div class="field-input">
          <select data-path="${escapeAttr(f.p)}">
            ${f.opts.map(([v, t]) => `<option value="${escapeAttr(v)}">${escapeHtml(t)}</option>`).join("")}
          </select>
        </div>
      </div>
    `;
  }
  return `
    <div class="field">
      <div class="field-label">
        <span class="nm">${escapeHtml(f.l)}</span>
        <span class="vl" data-display-for="${escapeAttr(f.p)}" data-fmt="${f.fmt || "raw"}" data-suf="${escapeAttr(f.suf || "")}"></span>
      </div>
      <div class="field-input">
        <input type="number" data-path="${escapeAttr(f.p)}" min="${f.min}" max="${f.max}" step="${f.step}" inputmode="decimal">
        ${f.suf ? `<span class="suffix">${escapeHtml(f.suf)}</span>` : ""}
      </div>
      <input type="range" class="field-range" data-path="${escapeAttr(f.p)}" min="${f.min}" max="${f.max}" step="${f.step}" aria-label="${escapeAttr(f.l)}">
    </div>
  `;
}

// ---------- Footer ----------
function renderFooter(result) {
  const cfg = result.cfg;
  const sources = cfg.sources || [];
  const fp = cfg.finance.planType === "interest_free"
    ? `${cfg.finance.totalLoanTermMonths} 月,前 ${cfg.finance.interestFreeMonths} 月免息;` +
      (cfg.finance.settlementMode === "balloon_at_interest_free_end"
        ? `第 ${cfg.finance.interestFreeMonths} 月一次性结清` : `之后年化 ${(cfg.finance.postFreeAnnualRate * 100).toFixed(2)}% 续供`)
    : `${cfg.finance.totalLoanTermMonths} 期等额本息,年化 ${(cfg.finance.loanAnnualRate * 100).toFixed(2)}%`;

  return `
    <footer class="footer">
      <div class="canvas">
        <h4>计算公式</h4>
        <div class="formula-grid">
          <p><strong>购置税:</strong>购车价 ÷ ${cfg.taxPolicy.vatDivisor} × ${(cfg.taxPolicy.taxRate * 100).toFixed(0)}%,按 ${(cfg.taxPolicy.reliefRate * 100).toFixed(0)}% 减免,单车上限 ¥${cfg.taxPolicy.taxReliefCap.toLocaleString("zh-CN")}。</p>
          <p><strong>买断抵扣:</strong>第 ${cfg.creditStartMonth}–${cfg.creditEndMonth} 月每月抵扣 ¥${cfg.creditPerMonth},买断款下限为零。</p>
          <p><strong>金融:</strong>${escapeHtml(fp)}。BaaS 贷款只覆盖车身价。</p>
          <p><strong>投资收益:</strong>月收益 = (1 + ${(cfg.investment.annualReturn * 100).toFixed(2)}%)<sup>1/12</sup> − 1,每 ${cfg.investment.retainedSettlementIntervalYears} 年结算外部垫付。</p>
        </div>
        <h4 style="margin-top:36px;">数据来源</h4>
        <div class="source-list">
          ${sources.map((s) => `
            <a href="${escapeAttr(s.url)}" target="_blank" rel="noreferrer">
              <span class="idx">[${escapeHtml(s.id)}]</span>
              <span>${escapeHtml(s.name)}</span>
            </a>
          `).join("")}
        </div>
        <p class="legal">本工具仅基于公开资料整理的车型默认值与给定假设进行模拟,不构成购车、税务或投资建议。所有数字以你在抽屉与实验室中的实际设置为准。</p>
      </div>
    </footer>
  `;
}

// ---------- Warnings ----------
function renderWarnings(warnings) {
  const el = document.getElementById("warnings");
  if (!el) return;
  el.innerHTML = warnings.length
    ? `<div class="warnings">${warnings.map((w) => `<span>⚠ ${escapeHtml(w)}</span>`).join("")}</div>` : "";
}
