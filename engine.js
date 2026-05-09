const SCENARIOS = [
  {
    scenarioId: "S0",
    scenarioName: "整车买断",
    purchaseMode: "whole",
    investmentMode: "no_investment",
    paymentMode: "cash",
    buyoutMonth: null,
    buyoutPaymentSource: "external"
  },
  {
    scenarioId: "S1",
    scenarioName: "BaaS 永不买断 + 资金留存理财",
    purchaseMode: "baas",
    investmentMode: "bank_fixed_principal",
    paymentMode: "cash",
    buyoutMonth: Infinity,
    buyoutPaymentSource: "external"
  },
  {
    scenarioId: "S2",
    scenarioName: "BaaS 永不买断 + 理财池扣租",
    purchaseMode: "baas",
    investmentMode: "fund_withdraw_rent",
    paymentMode: "cash",
    buyoutMonth: Infinity,
    buyoutPaymentSource: "external"
  },
  {
    scenarioId: "S3",
    scenarioName: "BaaS 第 N 月买断 + 资金留存理财",
    purchaseMode: "baas",
    investmentMode: "bank_fixed_principal",
    paymentMode: "cash",
    buyoutMonth: "cfg",
    buyoutPaymentSource: "external"
  },
  {
    scenarioId: "S4",
    scenarioName: "BaaS 第 N 月买断 + 理财池扣租/买断",
    purchaseMode: "baas",
    investmentMode: "fund_withdraw_rent",
    paymentMode: "cash",
    buyoutMonth: "cfg",
    buyoutPaymentSource: "cfg"
  },
  {
    scenarioId: "F1",
    scenarioName: "BaaS 金融方案 + 资金留存理财",
    purchaseMode: "baas",
    investmentMode: "loan_fixed_principal",
    paymentMode: "finance_loan",
    buyoutMonth: Infinity,
    buyoutPaymentSource: "external"
  },
  {
    scenarioId: "F2",
    scenarioName: "BaaS 金融方案 + 理财池还贷/扣租",
    purchaseMode: "baas",
    investmentMode: "loan_pool_withdraw",
    paymentMode: "finance_loan",
    buyoutMonth: Infinity,
    buyoutPaymentSource: "external"
  },
  {
    scenarioId: "F3",
    scenarioName: "整车金融方案 + 资金留存理财",
    purchaseMode: "whole",
    investmentMode: "loan_fixed_principal",
    paymentMode: "finance_loan",
    buyoutMonth: null,
    buyoutPaymentSource: "external"
  },
  {
    scenarioId: "F4",
    scenarioName: "整车金融方案 + 理财池还贷",
    purchaseMode: "whole",
    investmentMode: "loan_pool_withdraw",
    paymentMode: "finance_loan",
    buyoutMonth: null,
    buyoutPaymentSource: "external"
  }
];

const MONEY_FIELDS = [
  "finalNominalCashCost",
  "finalNetCost",
  "vehicleCost",
  "downPayment",
  "loanPayment",
  "loanBalloon",
  "loanInterest",
  "loanPrincipal",
  "monthlyLoanPayment",
  "balloonPayment",
  "tax",
  "subsidy",
  "insurance",
  "rent",
  "buyout",
  "pointRebate",
  "energy",
  "resaleValue",
  "buyoutDue",
  "nominalCashCost",
  "cumulativeCashCost",
  "investmentGain",
  "investmentPrincipal",
  "fundBalance",
  "fundEndingBalance",
  "retainedSettlement",
  "fundTopUp",
  "fundTopUpTotal",
  "netCost",
  "deltaVsBuyout"
];

function cloneConfig(cfg) {
  return JSON.parse(JSON.stringify(cfg));
}

function normalizeConfig(input) {
  const cfg = cloneConfig(input);
  cfg.wholeCarPrice = finiteNumber(cfg.wholeCarPrice, 0);
  cfg.bodyPrice = finiteNumber(cfg.bodyPrice, 0);
  cfg.batteryPrice = finiteNumber(cfg.batteryPrice, cfg.wholeCarPrice - cfg.bodyPrice);
  cfg.batteryRent = finiteNumber(cfg.batteryRent, 0);
  cfg.horizonMonths = clampInt(cfg.horizonMonths, 1, 360);
  cfg.buyoutMonth = parseBuyoutMonth(cfg.buyoutMonth, cfg.horizonMonths);
  cfg.creditStartMonth = clampInt(cfg.creditStartMonth, 1, 360);
  cfg.creditEndMonth = clampInt(cfg.creditEndMonth, cfg.creditStartMonth, 360);
  cfg.creditPerMonth = finiteNumber(cfg.creditPerMonth, 0);
  cfg.taxPolicy = cfg.taxPolicy || {};
  cfg.subsidyPolicy = cfg.subsidyPolicy || {};
  cfg.insurance = cfg.insurance || {};
  cfg.investment = cfg.investment || {};
  cfg.finance = cfg.finance || {};
  cfg.pointRebate = cfg.pointRebate || {};
  cfg.rentPromotion = cfg.rentPromotion || {};
  cfg.energy = cfg.energy || {};
  cfg.resale = cfg.resale || {};
  cfg.taxPolicy.vatDivisor = positiveNumber(cfg.taxPolicy.vatDivisor, 1.13);
  cfg.taxPolicy.taxRate = finiteNumber(cfg.taxPolicy.taxRate, 0.1);
  cfg.taxPolicy.reliefRate = finiteNumber(cfg.taxPolicy.reliefRate, 0.5);
  cfg.taxPolicy.taxReliefCap = finiteNumber(cfg.taxPolicy.taxReliefCap, 15000);
  cfg.subsidyPolicy.subsidyReceiveMonth = clampInt(cfg.subsidyPolicy.subsidyReceiveMonth, 1, 360);
  cfg.subsidyPolicy.replaceSubsidyRate = finiteNumber(cfg.subsidyPolicy.replaceSubsidyRate, 0.08);
  cfg.subsidyPolicy.replaceSubsidyCap = finiteNumber(cfg.subsidyPolicy.replaceSubsidyCap, 15000);
  cfg.subsidyPolicy.scrapSubsidyRate = finiteNumber(cfg.subsidyPolicy.scrapSubsidyRate, 0.12);
  cfg.subsidyPolicy.scrapSubsidyCap = finiteNumber(cfg.subsidyPolicy.scrapSubsidyCap, 20000);
  cfg.subsidyPolicy.customSubsidyYuan = finiteNumber(cfg.subsidyPolicy.customSubsidyYuan, 0);
  cfg.insurance.baasFirstYear = finiteNumber(cfg.insurance.baasFirstYear, 0);
  cfg.insurance.buyoutFirstYear = finiteNumber(cfg.insurance.buyoutFirstYear, 0);
  cfg.insurance.afterYear1Factor = finiteNumber(cfg.insurance.afterYear1Factor, 0.7);
  cfg.insurance.switchInsuranceAfterBuyout = Boolean(cfg.insurance.switchInsuranceAfterBuyout);
  cfg.investment.annualReturn = Math.max(finiteNumber(cfg.investment.annualReturn, 0), -0.999);
  cfg.investment.fundBuyoutPaymentSource = cfg.investment.fundBuyoutPaymentSource === "external" ? "external" : "fund";
  cfg.investment.retainedSettlementIntervalYears = clampInt(cfg.investment.retainedSettlementIntervalYears ?? 1, 1, 10);
  const legacyFinanceEnabled = cfg.finance.enableZeroInterestLoan !== false;
  cfg.finance.enableFinanceComparison = cfg.finance.enableFinanceComparison ?? legacyFinanceEnabled;
  cfg.finance.enableFinanceComparison = cfg.finance.enableFinanceComparison !== false;
  cfg.finance.planType = cfg.finance.planType === "standard_amortized" ? "standard_amortized" : "interest_free";
  cfg.finance.enableZeroInterestLoan = cfg.finance.enableFinanceComparison && cfg.finance.planType === "interest_free";
  cfg.finance.planName = String(cfg.finance.planName || (cfg.finance.planType === "standard_amortized" ? "常规等额本息贷款" : "免息金融方案"));
  const legacyLoanTerm = cfg.finance.loanTermMonths;
  cfg.finance.totalLoanTermMonths = clampInt(cfg.finance.totalLoanTermMonths ?? legacyLoanTerm ?? 60, 1, 120);
  cfg.finance.interestFreeMonths = cfg.finance.planType === "standard_amortized"
    ? 0
    : clampInt(cfg.finance.interestFreeMonths ?? 36, 1, cfg.finance.totalLoanTermMonths);
  cfg.finance.downPaymentRatio = Math.max(0, Math.min(1, finiteNumber(cfg.finance.downPaymentRatio, 0)));
  cfg.finance.loanAnnualRate = Math.max(0, finiteNumber(cfg.finance.loanAnnualRate, 0));
  cfg.finance.postFreeAnnualRate = Math.max(0, finiteNumber(cfg.finance.postFreeAnnualRate ?? cfg.finance.loanAnnualRate, 0.033));
  cfg.finance.settlementMode = cfg.finance.settlementMode === "continue_installments_after_free"
    ? "continue_installments_after_free"
    : "balloon_at_interest_free_end";
  cfg.pointRebate.pointRebateYuan = finiteNumber(cfg.pointRebate.pointRebateYuan, 0);
  cfg.pointRebate.pointRebateMonth = clampInt(cfg.pointRebate.pointRebateMonth, 1, 360);
  cfg.rentPromotion.useRentPromotion = Boolean(cfg.rentPromotion.useRentPromotion);
  cfg.rentPromotion.paidMonthsPerCycle = clampInt(cfg.rentPromotion.paidMonthsPerCycle, 0, 60);
  cfg.rentPromotion.cycleMonths = clampInt(cfg.rentPromotion.cycleMonths, 1, 60);
  cfg.rentPromotion.paidMonthsPerCycle = Math.min(cfg.rentPromotion.paidMonthsPerCycle, cfg.rentPromotion.cycleMonths);
  cfg.rentPromotion.creditOnlyPaidBills = Boolean(cfg.rentPromotion.creditOnlyPaidBills);
  cfg.energy.includeEnergyCost = Boolean(cfg.energy.includeEnergyCost);
  cfg.energy.annualMileageKm = finiteNumber(cfg.energy.annualMileageKm, 0);
  cfg.energy.energyKWhPer100km = finiteNumber(cfg.energy.energyKWhPer100km, 0);
  cfg.energy.electricityPrice = finiteNumber(cfg.energy.electricityPrice, 0);
  cfg.resale.includeResaleValue = Boolean(cfg.resale.includeResaleValue);
  cfg.resale.resaleValueYuan = finiteNumber(cfg.resale.resaleValueYuan, 0);
  return cfg;
}

function validateConfig(input) {
  const cfg = normalizeConfig(input);
  const warnings = [];
  if (cfg.wholeCarPrice < cfg.bodyPrice) {
    warnings.push("整车买断价格低于 BaaS 车价，请确认车价输入。");
  }
  if (cfg.batteryPrice !== cfg.wholeCarPrice - cfg.bodyPrice) {
    warnings.push("电池价格与整车价-BaaS 车价不一致，当前按手动电池价计算。");
  }
  if (Number.isFinite(cfg.buyoutMonth) && cfg.buyoutMonth > cfg.horizonMonths) {
    warnings.push("买断月份超过模拟期，先租后买方案在当前模拟期内不会发生买断。");
  }
  if (cfg.rentPromotion.useRentPromotion && cfg.rentPromotion.paidMonthsPerCycle === cfg.rentPromotion.cycleMonths) {
    warnings.push("租金优惠已启用，但周期内全部月份都付费，等同于无优惠。");
  }
  if (cfg.investment.annualReturn < 0) {
    warnings.push("年化收益率为负，投资收益会增加净成本。");
  }
  return { cfg, warnings };
}

function buildScenarios(cfg) {
  return SCENARIOS
    .filter((scenario) => cfg.finance.enableFinanceComparison || !scenario.scenarioId.startsWith("F"))
    .map((scenario) => {
      const next = { ...scenario };
      if (next.buyoutMonth === "cfg") next.buyoutMonth = cfg.buyoutMonth;
      if (next.buyoutPaymentSource === "cfg") {
        next.buyoutPaymentSource = cfg.investment.fundBuyoutPaymentSource;
      }
      return next;
    });
}

function runCostSimulation(input) {
  const { cfg, warnings } = validateConfig(input);
  const scenarios = buildScenarios(cfg);
  const monthlyByScenario = scenarios.map((scenario) => simulateScenario(cfg, scenario));
  const base = monthlyByScenario[0];

  monthlyByScenario.forEach((rows) => {
    rows.forEach((row, index) => {
      row.deltaVsBuyout = roundMoney(row.netCost - base[index].netCost);
    });
  });

  const monthlyResult = monthlyByScenario.flat();
  const summaryResult = summarizeResults(cfg, scenarios, monthlyByScenario);
  return { cfg, warnings, scenarios, monthlyResult, monthlyByScenario, summaryResult };
}

function simulateScenario(cfg, scenario) {
  const rows = [];
  const T = cfg.horizonMonths;
  const purchasePrice = scenario.purchaseMode === "whole" ? cfg.wholeCarPrice : cfg.bodyPrice;
  const loan = calcLoanPlan(cfg, purchasePrice, scenario);
  const monthlyReturn = annualToMonthlyReturn(cfg.investment.annualReturn);
  let cumulativeCashCost = 0;
  const initialPrincipal = calcInvestmentPrincipal(cfg, scenario, loan);
  let fundBalance = hasInvestmentPool(scenario) ? initialPrincipal : null;
  let investmentGain = 0;
  let pendingRetainedSettlement = 0;
  const buyoutMonth = scenario.buyoutMonth;

  for (let month = 1; month <= T; month += 1) {
    const hasBuyoutEvent = scenario.purchaseMode === "baas" && Number.isFinite(buyoutMonth) && month === buyoutMonth;
    const isRenting = scenario.purchaseMode === "baas" && (buyoutMonth === Infinity || month <= buyoutMonth);
    const downPayment = month === 1 ? loan.downPayment : 0;
    const vehicleCost = isFinancePayment(scenario)
      ? downPayment
      : month === 1
        ? purchasePrice
        : 0;
    const loanSchedule = calcLoanPaymentForMonth(loan, month);
    const loanPayment = isFinancePayment(scenario) ? loanSchedule.totalPayment : 0;
    const loanBalloon = isFinancePayment(scenario) ? loanSchedule.balloonPayment : 0;
    const loanInterest = isFinancePayment(scenario) ? loanSchedule.interestPayment : 0;
    const tax = month === 1 ? calcPurchaseTax(purchasePrice, cfg) : 0;
    const subsidy = month === cfg.subsidyPolicy.subsidyReceiveMonth ? calcSubsidy(purchasePrice, cfg) : 0;
    const pointRebate = month === cfg.pointRebate.pointRebateMonth ? cfg.pointRebate.pointRebateYuan : 0;
    const insurance = calcInsuranceForMonth(cfg, scenario, month);
    const rent = isRenting && isRentBillPaid(cfg, month) ? cfg.batteryRent : 0;
    const buyout = hasBuyoutEvent ? calcBuyoutDue(cfg, buyoutMonth) : 0;
    const energy = cfg.energy.includeEnergyCost ? calcMonthlyEnergyCost(cfg) : 0;
    const resaleValue = cfg.resale.includeResaleValue && month === T ? cfg.resale.resaleValueYuan : 0;
    const nominalCashCost = vehicleCost + loanPayment + tax + insurance + rent + buyout + energy - subsidy - pointRebate - resaleValue;

    cumulativeCashCost += nominalCashCost;

    let fundTopUp = 0;
    let retainedSettlement = 0;
    if (isFixedPrincipalInvestment(scenario)) {
      const interest = fundBalance * monthlyReturn;
      investmentGain += interest;
      fundBalance += interest;
      pendingRetainedSettlement += calcRetainedExternalUse(scenario, { rent, buyout, loanPayment });
      if (shouldSettleRetainedPool(cfg, month, T) && pendingRetainedSettlement > 0) {
        retainedSettlement = pendingRetainedSettlement;
        if (retainedSettlement > fundBalance) {
          fundTopUp = retainedSettlement - fundBalance;
          fundBalance = 0;
        } else {
          fundBalance -= retainedSettlement;
        }
        pendingRetainedSettlement = 0;
      }
    } else if (isPoolInvestment(scenario)) {
      const interest = fundBalance * monthlyReturn;
      investmentGain += interest;
      fundBalance += interest;
      let withdrawal = 0;
      if (scenario.investmentMode === "fund_withdraw_rent") withdrawal += rent;
      if (scenario.investmentMode === "loan_pool_withdraw") withdrawal += loanPayment + rent;
      if (buyout > 0 && scenario.buyoutPaymentSource === "fund") withdrawal += buyout;
      if (withdrawal > fundBalance) {
        fundTopUp = withdrawal - fundBalance;
        fundBalance = 0;
      } else {
        fundBalance -= withdrawal;
      }
    }

    const row = {
      month,
      year: Math.ceil(month / 12),
      scenarioId: scenario.scenarioId,
      scenarioName: scenario.scenarioName,
      vehicleCost,
      downPayment,
      loanPayment,
      loanBalloon,
      loanInterest,
      tax,
      subsidy,
      insurance,
      rent,
      buyout,
      pointRebate,
      energy,
      resaleValue,
      nominalCashCost,
      cumulativeCashCost,
      investmentGain,
      fundBalance: fundBalance === null ? null : fundBalance,
      retainedSettlement,
      fundTopUp,
      netCost: cumulativeCashCost - investmentGain,
      deltaVsBuyout: 0
    };
    rows.push(roundMoneyFields(row));
  }
  return rows;
}

function summarizeResults(cfg, scenarios, monthlyByScenario) {
  const summaries = scenarios.map((scenario, index) => {
    const rows = monthlyByScenario[index];
    const last = rows[rows.length - 1];
    const breakEvenRow = scenario.scenarioId === "S0" ? null : rows.find((row) => row.deltaVsBuyout >= 0);
    const finiteBuyout = Number.isFinite(scenario.buyoutMonth);
    return {
      scenarioId: scenario.scenarioId,
      scenarioName: scenario.scenarioName,
      finalNominalCashCost: last.cumulativeCashCost,
      finalNetCost: last.netCost,
      deltaVsBuyout: last.deltaVsBuyout,
      breakEvenMonth: breakEvenRow ? breakEvenRow.month : null,
      buyoutDue: finiteBuyout ? calcBuyoutDue(cfg, scenario.buyoutMonth) : 0,
      investmentPrincipal: calcInvestmentPrincipal(cfg, scenario),
      loanPrincipal: rows.reduce((acc, row) => acc + row.loanPayment - row.loanInterest, 0),
      monthlyLoanPayment: rows.find((row) => row.loanPayment > 0)?.loanPayment || 0,
      balloonPayment: rows.reduce((acc, row) => acc + row.loanBalloon, 0),
      fundEndingBalance: last.fundBalance,
      fundTopUpTotal: sum(rows.map((row) => row.fundTopUp)),
      minCostFlag: false
    };
  });
  const minCost = Math.min(...summaries.map((item) => item.finalNetCost));
  summaries.forEach((summary) => {
    summary.minCostFlag = Math.abs(summary.finalNetCost - minCost) < 0.005;
  });
  return summaries.map(roundMoneyFields);
}

function calcPurchaseTax(invoiceTaxInclusivePrice, cfg) {
  const policy = cfg.taxPolicy;
  const baseTax = invoiceTaxInclusivePrice / policy.vatDivisor * policy.taxRate;
  const taxRelief = Math.min(baseTax * policy.reliefRate, policy.taxReliefCap);
  return roundMoney(Math.max(baseTax - taxRelief, 0));
}

function calcLoanPlan(cfg, purchasePrice, scenario = {}) {
  if (!isFinancePayment(scenario)) {
    return {
      downPayment: purchasePrice,
      loanPrincipal: 0,
      totalLoanTermMonths: 0,
      interestFreeMonths: 0,
      regularPrincipalPayment: 0,
      standardMonthlyPayment: 0,
      postFreeMonthlyPayment: 0,
      balloonPayment: 0,
      loanAnnualRate: cfg.finance.loanAnnualRate,
      postFreeAnnualRate: cfg.finance.postFreeAnnualRate,
      settlementMode: cfg.finance.settlementMode,
      planType: cfg.finance.planType
    };
  }
  const downPayment = roundMoney(purchasePrice * cfg.finance.downPaymentRatio);
  const loanPrincipal = roundMoney(Math.max(purchasePrice - downPayment, 0));
  const totalLoanTermMonths = Math.max(1, cfg.finance.totalLoanTermMonths);
  if (cfg.finance.planType === "standard_amortized") {
    const standardMonthlyPayment = calcAmortizedPayment(loanPrincipal, annualToMonthlyReturn(cfg.finance.loanAnnualRate), totalLoanTermMonths);
    return {
      downPayment,
      loanPrincipal,
      totalLoanTermMonths,
      interestFreeMonths: 0,
      regularPrincipalPayment: 0,
      remainingAfterFree: loanPrincipal,
      standardMonthlyPayment,
      postFreeMonthlyPayment: 0,
      balloonPayment: 0,
      loanAnnualRate: cfg.finance.loanAnnualRate,
      postFreeAnnualRate: cfg.finance.postFreeAnnualRate,
      settlementMode: cfg.finance.settlementMode,
      planType: cfg.finance.planType
    };
  }
  const interestFreeMonths = Math.min(cfg.finance.interestFreeMonths, totalLoanTermMonths);
  const regularPrincipalPayment = roundMoney(loanPrincipal / totalLoanTermMonths);
  const principalPaidDuringFree = regularPrincipalPayment * interestFreeMonths;
  const remainingAfterFree = roundMoney(Math.max(loanPrincipal - principalPaidDuringFree, 0));
  const remainingMonths = Math.max(0, totalLoanTermMonths - interestFreeMonths);
  const postFreeMonthlyPayment = cfg.finance.settlementMode === "continue_installments_after_free" && remainingMonths > 0
    ? calcAmortizedPayment(remainingAfterFree, annualToMonthlyReturn(cfg.finance.postFreeAnnualRate), remainingMonths)
    : 0;
  const balloonPayment = cfg.finance.settlementMode === "balloon_at_interest_free_end" ? remainingAfterFree : 0;
  return {
    downPayment,
    loanPrincipal,
    totalLoanTermMonths,
    interestFreeMonths,
    regularPrincipalPayment,
    remainingAfterFree,
    standardMonthlyPayment: 0,
    postFreeMonthlyPayment,
    balloonPayment,
    loanAnnualRate: cfg.finance.loanAnnualRate,
    postFreeAnnualRate: cfg.finance.postFreeAnnualRate,
    settlementMode: cfg.finance.settlementMode,
    planType: cfg.finance.planType
  };
}

function calcLoanPaymentForMonth(loan, month) {
  if (!loan.loanPrincipal || month > loan.totalLoanTermMonths) {
    return { totalPayment: 0, principalPayment: 0, interestPayment: 0, balloonPayment: 0 };
  }
  if (loan.planType === "standard_amortized") {
    const remainingBeforePayment = calcRemainingAfterPriorStandardPayments(loan, month - 1);
    const monthlyRate = annualToMonthlyReturn(loan.loanAnnualRate || 0);
    const interestPayment = roundMoney(remainingBeforePayment * monthlyRate);
    const principalPayment = month === loan.totalLoanTermMonths
      ? roundMoney(remainingBeforePayment)
      : roundMoney(Math.min(Math.max(loan.standardMonthlyPayment - interestPayment, 0), remainingBeforePayment));
    const totalPayment = roundMoney(principalPayment + interestPayment);
    return { totalPayment, principalPayment, interestPayment, balloonPayment: 0 };
  }
  if (month <= loan.interestFreeMonths) {
    const isBalloonMonth = loan.settlementMode === "balloon_at_interest_free_end" && month === loan.interestFreeMonths;
    const balloonPayment = isBalloonMonth ? loan.balloonPayment : 0;
    return {
      totalPayment: roundMoney(loan.regularPrincipalPayment + balloonPayment),
      principalPayment: roundMoney(loan.regularPrincipalPayment + balloonPayment),
      interestPayment: 0,
      balloonPayment
    };
  }
  if (loan.settlementMode !== "continue_installments_after_free") {
    return { totalPayment: 0, principalPayment: 0, interestPayment: 0, balloonPayment: 0 };
  }
  const monthsAfterFree = month - loan.interestFreeMonths;
  const remainingBeforePayment = calcRemainingAfterPriorPayments(loan, monthsAfterFree - 1);
  const monthlyRate = annualToMonthlyReturn(cfgFinanceRateFallback(loan));
  const interestPayment = roundMoney(remainingBeforePayment * monthlyRate);
  const totalPayment = loan.postFreeMonthlyPayment;
  const principalPayment = roundMoney(Math.max(totalPayment - interestPayment, 0));
  return { totalPayment, principalPayment, interestPayment, balloonPayment: 0 };
}

function calcSubsidy(invoiceTaxInclusivePrice, cfg) {
  const policy = cfg.subsidyPolicy;
  switch (policy.mode) {
    case "none":
      return 0;
    case "scrap_old_car":
      return roundMoney(Math.min(invoiceTaxInclusivePrice * policy.scrapSubsidyRate, policy.scrapSubsidyCap));
    case "custom":
      return roundMoney(Math.max(policy.customSubsidyYuan, 0));
    case "transfer_old_car":
    default:
      return roundMoney(Math.min(invoiceTaxInclusivePrice * policy.replaceSubsidyRate, policy.replaceSubsidyCap));
  }
}

function calcBuyoutDue(cfg, buyoutMonth) {
  if (!Number.isFinite(buyoutMonth)) return 0;
  const endMonth = Math.min(buyoutMonth, cfg.creditEndMonth);
  if (endMonth < cfg.creditStartMonth) return roundMoney(cfg.batteryPrice);
  let eligibleCount = 0;
  for (let month = cfg.creditStartMonth; month <= endMonth; month += 1) {
    if (!cfg.rentPromotion.creditOnlyPaidBills || isRentBillPaid(cfg, month)) eligibleCount += 1;
  }
  const credit = cfg.creditPerMonth * eligibleCount;
  return roundMoney(Math.max(cfg.batteryPrice - credit, 0));
}

function calcInsuranceForMonth(cfg, scenario, month) {
  if ((month - 1) % 12 !== 0) return 0;
  const firstYear = month === 1;
  let basis = scenario.purchaseMode === "whole" ? "buyout" : "baas";
  if (
    scenario.purchaseMode === "baas" &&
    cfg.insurance.switchInsuranceAfterBuyout &&
    Number.isFinite(scenario.buyoutMonth) &&
    scenario.buyoutMonth < month
  ) {
    basis = "buyout";
  }
  const base = basis === "buyout" ? cfg.insurance.buyoutFirstYear : cfg.insurance.baasFirstYear;
  return roundMoney(firstYear ? base : base * cfg.insurance.afterYear1Factor);
}

function isRentBillPaid(cfg, month) {
  if (!cfg.rentPromotion.useRentPromotion) return true;
  const cycleMonth = ((month - 1) % cfg.rentPromotion.cycleMonths) + 1;
  return cycleMonth <= cfg.rentPromotion.paidMonthsPerCycle;
}

function calcMonthlyEnergyCost(cfg) {
  const monthlyKm = cfg.energy.annualMileageKm / 12;
  return roundMoney(monthlyKm * cfg.energy.energyKWhPer100km / 100 * cfg.energy.electricityPrice);
}

function annualToMonthlyReturn(annualReturn) {
  return (1 + annualReturn) ** (1 / 12) - 1;
}

function calcInvestmentPrincipal(cfg, scenario, loan = null) {
  const batteryReserve = scenario.purchaseMode === "baas" ? cfg.batteryPrice : 0;
  if (isFinancePayment(scenario)) {
    const plan = loan || calcLoanPlan(cfg, scenario.purchaseMode === "whole" ? cfg.wholeCarPrice : cfg.bodyPrice, scenario);
    return roundMoney(plan.loanPrincipal + batteryReserve);
  }
  if (scenario.investmentMode === "bank_fixed_principal" || scenario.investmentMode === "fund_withdraw_rent") {
    return roundMoney(batteryReserve);
  }
  return 0;
}

function isFixedPrincipalInvestment(scenario) {
  return scenario.investmentMode === "bank_fixed_principal" || scenario.investmentMode === "loan_fixed_principal";
}

function isPoolInvestment(scenario) {
  return scenario.investmentMode === "fund_withdraw_rent" || scenario.investmentMode === "loan_pool_withdraw";
}

function hasInvestmentPool(scenario) {
  return isFixedPrincipalInvestment(scenario) || isPoolInvestment(scenario);
}

function calcRetainedExternalUse(scenario, amounts) {
  let value = 0;
  if (scenario.purchaseMode === "baas") value += amounts.rent;
  if (isFinancePayment(scenario)) value += amounts.loanPayment;
  if (isFixedPrincipalInvestment(scenario)) value += amounts.buyout;
  return value;
}

function isFinancePayment(scenario) {
  return scenario.paymentMode === "finance_loan" || scenario.paymentMode === "zero_interest_loan";
}

function shouldSettleRetainedPool(cfg, month, horizonMonths) {
  const intervalMonths = cfg.investment.retainedSettlementIntervalYears * 12;
  return month % intervalMonths === 0 || month === horizonMonths;
}

function calcAmortizedPayment(principal, monthlyRate, months) {
  if (principal <= 0 || months <= 0) return 0;
  if (Math.abs(monthlyRate) < 1e-12) return roundMoney(principal / months);
  const factor = (monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);
  return roundMoney(principal * factor);
}

function calcRemainingAfterPriorPayments(loan, priorPayments) {
  const monthlyRate = annualToMonthlyReturn(cfgFinanceRateFallback(loan));
  let remaining = loan.remainingAfterFree;
  for (let i = 0; i < priorPayments; i += 1) {
    const interest = remaining * monthlyRate;
    const principal = Math.max(loan.postFreeMonthlyPayment - interest, 0);
    remaining = Math.max(remaining - principal, 0);
  }
  return remaining;
}

function calcRemainingAfterPriorStandardPayments(loan, priorPayments) {
  const monthlyRate = annualToMonthlyReturn(loan.loanAnnualRate || 0);
  let remaining = loan.loanPrincipal;
  for (let i = 0; i < priorPayments; i += 1) {
    const interest = roundMoney(remaining * monthlyRate);
    const principal = roundMoney(Math.min(Math.max(loan.standardMonthlyPayment - interest, 0), remaining));
    remaining = roundMoney(Math.max(remaining - principal, 0));
  }
  return remaining;
}

function cfgFinanceRateFallback(loan) {
  return loan.postFreeAnnualRate ?? 0;
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((header) => csvCell(row[header])).join(","));
  });
  return lines.join("\n");
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function finiteNumber(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function positiveNumber(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : fallback;
}

function clampInt(value, min, max) {
  const next = Math.round(Number(value));
  if (!Number.isFinite(next)) return min;
  return Math.max(min, Math.min(max, next));
}

function parseBuyoutMonth(value, horizonMonths) {
  if (value === Infinity || value === "Inf" || value === "Infinity" || value === null) return Infinity;
  return clampInt(value, 1, Math.max(horizonMonths, 1));
}

function roundMoney(value) {
  if (value === null || value === undefined) return value;
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function roundMoneyFields(row) {
  const next = { ...row };
  MONEY_FIELDS.forEach((field) => {
    if (Object.hasOwn(next, field) && next[field] !== null) next[field] = roundMoney(next[field]);
  });
  return next;
}

function sum(values) {
  return roundMoney(values.reduce((acc, value) => acc + (Number(value) || 0), 0));
}


const SERIES_COLORS = ["#0071e3", "#1d1d1f", "#ff3b30", "#f59e0b", "#34c759", "#86868b"];
const COMPONENT_COLORS = {
  vehicleCost: "#1d1d1f",
  loanPayment: "#0071e3",
  tax: "#5ac8fa",
  insurance: "#af52de",
  rent: "#ff9500",
  buyout: "#ff3b30",
  energy: "#34c759",
  subsidy: "#8e8e93",
  pointRebate: "#c7c7cc",
  investmentGain: "#aeaeb2"
};

function renderLineChart({ title, subtitle = "", series, yFormatter = formatWan, zeroLine = false }) {
  const width = 920;
  const height = 360;
  const margin = { top: 46, right: 34, bottom: 54, left: 76 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const allPoints = series.flatMap((item) => item.values.map((point) => point.y));
  const allMonths = series.flatMap((item) => item.values.map((point) => point.x));
  const xMin = Math.min(...allMonths, 1);
  const xMax = Math.max(...allMonths, 12);
  let yMin = Math.min(...allPoints, zeroLine ? 0 : Infinity);
  let yMax = Math.max(...allPoints, zeroLine ? 0 : -Infinity);
  if (Math.abs(yMax - yMin) < 1) {
    yMax += 1;
    yMin -= 1;
  }
  const yPad = (yMax - yMin) * 0.08;
  yMax += yPad;
  yMin -= yPad;

  const x = (value) => margin.left + ((value - xMin) / Math.max(1, xMax - xMin)) * plotWidth;
  const y = (value) => margin.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight;
  const yTicks = buildTicks(yMin, yMax, 5);
  const xTicks = buildMonthTicks(xMin, xMax);

  const lines = series.map((item, index) => {
    const points = item.values.map((point) => `${x(point.x).toFixed(1)},${y(point.y).toFixed(1)}`).join(" ");
    const color = item.color || SERIES_COLORS[index % SERIES_COLORS.length];
    return `<polyline class="chart-line" points="${points}" fill="none" stroke="${color}" stroke-width="2.6" vector-effect="non-scaling-stroke"></polyline>`;
  }).join("");

  const legend = series.map((item, index) => {
    const color = item.color || SERIES_COLORS[index % SERIES_COLORS.length];
    return `<span><i style="background:${color}"></i>${escapeSvg(item.name)}</span>`;
  }).join("");

  const zero = zeroLine && yMin < 0 && yMax > 0
    ? `<line class="zero-line" x1="${margin.left}" x2="${width - margin.right}" y1="${y(0)}" y2="${y(0)}"></line>`
    : "";

  const tooltipPayload = escapeSvgAttr(JSON.stringify({
    width,
    height,
    margin,
    xMin,
    xMax,
    yMin,
    yMax,
    series: series.map((item, index) => ({
      name: item.name,
      color: item.color || SERIES_COLORS[index % SERIES_COLORS.length],
      values: item.values
    }))
  }));

  return `<figure class="chart-surface js-line-chart" data-tooltip-payload="${tooltipPayload}">
    <div class="chart-scroll">
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeSvgAttr(title)}">
      <text class="chart-title" x="${margin.left}" y="25">${escapeSvg(title)}</text>
      ${subtitle ? `<text class="chart-subtitle" x="${margin.left}" y="43">${escapeSvg(subtitle)}</text>` : ""}
      <g class="grid-lines">
        ${yTicks.map((tick) => `<line x1="${margin.left}" x2="${width - margin.right}" y1="${y(tick)}" y2="${y(tick)}"></line>`).join("")}
      </g>
      ${zero}
      <g class="axis-labels">
        ${yTicks.map((tick) => `<text x="${margin.left - 12}" y="${y(tick) + 4}" text-anchor="end">${escapeSvg(yFormatter(tick))}</text>`).join("")}
        ${xTicks.map((tick) => `<text x="${x(tick)}" y="${height - margin.bottom + 26}" text-anchor="middle">${tick}</text>`).join("")}
      </g>
      <line class="axis" x1="${margin.left}" x2="${width - margin.right}" y1="${height - margin.bottom}" y2="${height - margin.bottom}"></line>
      <line class="axis" x1="${margin.left}" x2="${margin.left}" y1="${margin.top}" y2="${height - margin.bottom}"></line>
      ${lines}
      <rect class="chart-hitbox" x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" fill="transparent" pointer-events="all"></rect>
    </svg>
    </div>
    <figcaption class="chart-legend">${legend}</figcaption>
    <div class="chart-tooltip" hidden></div>
  </figure>`;
}

function renderBuyoutCurve(cfg, calcBuyoutDue) {
  const values = [];
  const end = Math.max(cfg.horizonMonths, cfg.creditEndMonth + 12);
  for (let month = 1; month <= end; month += 1) {
    values.push({ x: month, y: calcBuyoutDue(cfg, month) });
  }
  return renderLineChart({
    title: "买断应付金额曲线",
    subtitle: `第 ${cfg.creditStartMonth}-${cfg.creditEndMonth} 月抵扣，默认每月 ${cfg.creditPerMonth} 元`,
    series: [{ name: "买断应付", values, color: "var(--rose)" }],
    yFormatter: formatWan
  });
}

function renderCompositionChart(monthlyResult) {
  const width = 920;
  const height = 430;
  const margin = { top: 58, right: 118, bottom: 34, left: 92 };
  const components = [
    ["vehicleCost", "车价/首付"],
    ["loanPayment", "贷款月供"],
    ["tax", "购置税"],
    ["insurance", "保险"],
    ["rent", "租金"],
    ["buyout", "买断款"],
    ["energy", "补能"],
    ["subsidy", "补贴"],
    ["pointRebate", "积分"],
    ["investmentGain", "投资收益"]
  ];
  const grouped = groupByScenario(monthlyResult);
  const scenarioIds = Object.keys(grouped);
  const data = scenarioIds.map((id) => {
    const rows = grouped[id];
    const item = { scenarioId: id, scenarioName: rows[0].scenarioName };
    components.forEach(([key]) => {
      if (key === "investmentGain") {
        item[key] = rows[rows.length - 1].investmentGain;
      } else {
        item[key] = rows.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
      }
    });
    return item;
  });
  const maxValue = Math.max(...data.map((item) => {
    const positive = components
      .filter(([key]) => !["subsidy", "pointRebate", "investmentGain"].includes(key))
      .reduce((acc, [key]) => acc + Math.max(0, item[key]), 0);
    const negative = item.subsidy + item.pointRebate + item.investmentGain;
    return Math.max(positive, negative);
  }), 1);
  const plotWidth = width - margin.left - margin.right;
  const barHeight = 34;
  const gap = 34;
  const x = (value) => margin.left + (value / maxValue) * plotWidth;
  const baseY = margin.top + 24;
  const bars = data.map((item, rowIndex) => {
    const y = baseY + rowIndex * (barHeight + gap);
    let cursor = margin.left;
    const positiveSegments = components.filter(([key]) => !["subsidy", "pointRebate", "investmentGain"].includes(key) && item[key] > 0);
    const negativeSegments = components.filter(([key]) => ["subsidy", "pointRebate", "investmentGain"].includes(key) && item[key] > 0);
    const positive = positiveSegments.map(([key, label]) => {
      const w = x(item[key]) - margin.left;
      const rect = `<rect x="${cursor}" y="${y}" width="${Math.max(0, w)}" height="${barHeight}" fill="${COMPONENT_COLORS[key]}"><title>${label} ${formatYuan(item[key])}</title></rect>`;
      cursor += w;
      return rect;
    }).join("");
    let savingCursor = margin.left;
    const savings = negativeSegments.map(([key, label]) => {
      const w = x(item[key]) - margin.left;
      const rect = `<rect x="${savingCursor}" y="${y + barHeight + 4}" width="${Math.max(0, w)}" height="9" fill="${COMPONENT_COLORS[key]}"><title>${label}抵减 ${formatYuan(item[key])}</title></rect>`;
      savingCursor += w;
      return rect;
    }).join("");
    const valueLabelX = Math.min(cursor + 10, width - margin.right + 14);
    return `<g>
      <text class="bar-label" x="${margin.left - 12}" y="${y + 22}" text-anchor="end">${escapeSvg(item.scenarioId)}</text>
      ${positive}
      ${savings}
      <text class="bar-value" x="${valueLabelX}" y="${y + 22}">${escapeSvg(formatWan(cursorValue(cursor, margin.left, plotWidth, maxValue)))}</text>
    </g>`;
  }).join("");
  const legend = components.map(([key, label], index) => {
    return `<span><i style="background:${COMPONENT_COLORS[key]}"></i>${escapeSvg(label)}</span>`;
  }).join("");
  return `<figure class="chart-surface">
    <div class="chart-scroll">
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="成本构成图">
      <text class="chart-title" x="${margin.left}" y="27">成本构成图</text>
      <text class="chart-subtitle" x="${margin.left}" y="46">粗条为支出，细条为补贴、积分和投资收益抵减</text>
      <line class="axis" x1="${margin.left}" x2="${width - margin.right}" y1="${margin.top}" y2="${margin.top}"></line>
      ${bars}
    </svg>
    </div>
    <figcaption class="chart-legend composition-legend">${legend}</figcaption>
  </figure>`;
}

function buildSeries(monthlyResult, yField, filter = () => true) {
  const grouped = groupByScenario(monthlyResult.filter(filter));
  return Object.values(grouped).map((rows, index) => ({
    name: rows[0].scenarioId,
    color: SERIES_COLORS[index % SERIES_COLORS.length],
    values: rows.map((row) => ({ x: row.month, y: row[yField] || 0 }))
  }));
}

function enhanceLineChartTooltips(scope = document) {
  scope.querySelectorAll(".js-line-chart").forEach((chart) => {
    if (chart.dataset.tooltipReady === "true") return;
    chart.dataset.tooltipReady = "true";
    const svg = chart.querySelector("svg");
    const tooltip = chart.querySelector(".chart-tooltip");
    const payload = JSON.parse(chart.dataset.tooltipPayload);
    const guide = svgEl("line", { class: "chart-guide", y1: payload.margin.top, y2: payload.height - payload.margin.bottom });
    const focusLayer = svgEl("g", { class: "chart-focus-layer" });
    const hitbox = svg.querySelector(".chart-hitbox");
    svg.insertBefore(guide, hitbox);
    svg.insertBefore(focusLayer, hitbox);
    guide.setAttribute("hidden", "");
    focusLayer.setAttribute("hidden", "");

    const circles = payload.series.map((item) => {
      const circle = svgEl("circle", { r: 4.5, fill: item.color, stroke: "#fff", "stroke-width": 2 });
      focusLayer.append(circle);
      return circle;
    });

    const move = (event) => {
      const point = svgPoint(svg, event);
      const clampedX = Math.max(payload.margin.left, Math.min(payload.width - payload.margin.right, point.x));
      const rawMonth = payload.xMin + (clampedX - payload.margin.left) / (payload.width - payload.margin.left - payload.margin.right) * (payload.xMax - payload.xMin);
      const month = nearestMonth(payload.series[0]?.values || [], rawMonth);
      const x = scaleX(payload, month);
      const rows = payload.series.map((item, index) => {
        const valuePoint = nearestPoint(item.values, month);
        const y = scaleY(payload, valuePoint.y);
        circles[index].setAttribute("cx", x);
        circles[index].setAttribute("cy", y);
        return { name: item.name, color: item.color, value: valuePoint.y };
      });

      guide.removeAttribute("hidden");
      focusLayer.removeAttribute("hidden");
      guide.setAttribute("x1", x);
      guide.setAttribute("x2", x);
      tooltip.hidden = false;
      tooltip.style.opacity = 1;
      tooltip.innerHTML = `<strong>第 ${month} 月</strong>${rows.map((row) => (
        `<span><i style="background:${row.color}"></i>${escapeChartHtml(row.name)}：${formatYuan(row.value)}</span>`
      )).join("")}`;

      const chartRect = chart.getBoundingClientRect();
      const localX = event.clientX - chartRect.left;
      const localY = event.clientY - chartRect.top;
      const tooltipWidth = tooltip.offsetWidth || 180;
      const tooltipHeight = tooltip.offsetHeight || 120;
      const left = Math.max(8, Math.min(chartRect.width - tooltipWidth - 8, localX + 14));
      const top = Math.max(8, Math.min(chartRect.height - tooltipHeight - 8, localY - tooltipHeight - 12));
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    const leave = () => {
      guide.setAttribute("hidden", "");
      focusLayer.setAttribute("hidden", "");
      tooltip.style.opacity = 0;
      setTimeout(() => { if (tooltip.style.opacity == 0) tooltip.hidden = true; }, 200);
    };

    hitbox.addEventListener("pointermove", move);
    hitbox.addEventListener("pointerenter", move);
    hitbox.addEventListener("pointerleave", leave);
    hitbox.addEventListener("pointercancel", leave);
  });
}

function groupByScenario(rows) {
  return rows.reduce((acc, row) => {
    if (!acc[row.scenarioId]) acc[row.scenarioId] = [];
    acc[row.scenarioId].push(row);
    return acc;
  }, {});
}

function formatYuan(value) {
  return `${Math.round(value).toLocaleString("zh-CN")} 元`;
}

function formatWan(value) {
  return `${(value / 10000).toFixed(1)} 万`;
}

function buildTicks(min, max, count) {
  const step = (max - min) / Math.max(1, count - 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
}

function buildMonthTicks(min, max) {
  const ticks = [];
  const span = max - min;
  const step = span <= 36 ? 6 : 12;
  for (let value = Math.ceil(min / step) * step; value <= max; value += step) {
    ticks.push(value);
  }
  if (!ticks.includes(1)) ticks.unshift(1);
  return ticks;
}

function cursorValue(cursor, start, width, maxValue) {
  return ((cursor - start) / Math.max(1, width)) * maxValue;
}

function escapeSvg(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeSvgAttr(value) {
  return escapeSvg(value).replaceAll('"', "&quot;");
}

function escapeChartHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function svgEl(name, attrs) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function svgPoint(svg, event) {
  const rect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  return {
    x: viewBox.x + (event.clientX - rect.left) * viewBox.width / rect.width,
    y: viewBox.y + (event.clientY - rect.top) * viewBox.height / rect.height
  };
}

function nearestMonth(values, rawMonth) {
  if (!values.length) return Math.round(rawMonth);
  return nearestPoint(values, rawMonth).x;
}

function nearestPoint(values, month) {
  return values.reduce((best, point) => (
    Math.abs(point.x - month) < Math.abs(best.x - month) ? point : best
  ), values[0]);
}

function scaleX(payload, month) {
  const plotWidth = payload.width - payload.margin.left - payload.margin.right;
  return payload.margin.left + ((month - payload.xMin) / Math.max(1, payload.xMax - payload.xMin)) * plotWidth;
}

function scaleY(payload, value) {
  const plotHeight = payload.height - payload.margin.top - payload.margin.bottom;
  return payload.margin.top + (1 - (value - payload.yMin) / (payload.yMax - payload.yMin)) * plotHeight;
}
