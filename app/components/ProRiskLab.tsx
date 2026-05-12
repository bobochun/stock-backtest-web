"use client";

import { useMemo, useState } from "react";

type SimPath = {
  finalEquity: number;
  maxDrawdownPct: number;
  returnPct: number;
  lossStreakMax: number;
  equityCurve: number[];
};

type SimulationSummary = {
  totalContributed: number;
  expectedReturnPerTradePct: number;
  expectedAnnualReturnPct: number;
  breakEvenWinRatePct: number;
  kellyPct: number;
  suggestedRiskPct: number;
  positionPct: number;
  medianFinalEquity: number;
  p10FinalEquity: number;
  p90FinalEquity: number;
  medianReturnPct: number;
  p10ReturnPct: number;
  p90ReturnPct: number;
  medianMaxDrawdownPct: number;
  p90MaxDrawdownPct: number;
  riskOfLossPct: number;
  riskOfHalfCapitalPct: number;
  averageWorstStreak: number;
  medianCurve: number[];
};

type HeatmapCell = {
  winRatePct: number;
  avgWinPct: number;
  score: number;
  label: string;
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function formatInteger(value: number) {
  if (!Number.isFinite(value)) return "-";
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "-";
  return `NT$${formatInteger(value)}`;
}

function formatPct(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(digits)}%`;
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = clamp((sorted.length - 1) * p, 0, sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sorted[lower];

  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function createPrng(seed: number) {
  let state = Math.floor(Math.abs(seed)) % 2147483647;

  if (state === 0) state = 1;

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function compactCurve(curve: number[], points = 60) {
  if (curve.length <= points) return curve;

  const result: number[] = [];

  for (let i = 0; i < points; i++) {
    const index = Math.round((i / (points - 1)) * (curve.length - 1));
    result.push(curve[index]);
  }

  return result;
}

function makeSvgPath(values: number[], width = 720, height = 180) {
  if (values.length === 0) return "";

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function runSingleSimulation({
  seed,
  initialCapital,
  monthlyContribution,
  years,
  tradesPerYear,
  winRatePct,
  avgWinPct,
  avgLossPct,
  costPerTradePct,
  riskPerTradePct,
  maxPositionPct,
}: {
  seed: number;
  initialCapital: number;
  monthlyContribution: number;
  years: number;
  tradesPerYear: number;
  winRatePct: number;
  avgWinPct: number;
  avgLossPct: number;
  costPerTradePct: number;
  riskPerTradePct: number;
  maxPositionPct: number;
}): SimPath {
  const random = createPrng(seed);
  const totalTrades = Math.max(1, Math.round(years * tradesPerYear));
  const totalMonths = Math.max(1, Math.round(years * 12));
  const tradesPerMonth = totalTrades / totalMonths;

  const winRate = clamp(winRatePct / 100, 0, 1);
  const avgWin = Math.max(0, avgWinPct / 100);
  const avgLoss = -Math.max(0.0001, avgLossPct / 100);
  const cost = Math.max(0, costPerTradePct / 100);

  const riskPct = clamp(riskPerTradePct / 100, 0, 1);
  const maxPosition = clamp(maxPositionPct / 100, 0, 1);
  const positionPct = clamp(riskPct / Math.abs(avgLoss), 0, maxPosition);

  let equity = Math.max(1, initialCapital);
  let peak = equity;
  let maxDrawdownPct = 0;
  let currentLossStreak = 0;
  let lossStreakMax = 0;
  let lastMonthAdded = 0;

  const equityCurve: number[] = [equity];

  for (let i = 0; i < totalTrades; i++) {
    const monthIndex = Math.floor(i / Math.max(tradesPerMonth, 0.0001));

    while (lastMonthAdded < monthIndex && lastMonthAdded < totalMonths) {
      equity += monthlyContribution;
      lastMonthAdded += 1;
    }

    const isWin = random() < winRate;

    let tradeOutcome = isWin ? avgWin : avgLoss;

    const noise = 0.75 + random() * 0.5;
    tradeOutcome *= noise;

    const accountReturn = positionPct * tradeOutcome - positionPct * cost;

    equity *= 1 + accountReturn;
    equity = Math.max(1, equity);

    if (isWin) {
      currentLossStreak = 0;
    } else {
      currentLossStreak += 1;
      lossStreakMax = Math.max(lossStreakMax, currentLossStreak);
    }

    peak = Math.max(peak, equity);
    const drawdownPct = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
    maxDrawdownPct = Math.max(maxDrawdownPct, drawdownPct);

    equityCurve.push(equity);
  }

  while (lastMonthAdded < totalMonths) {
    equity += monthlyContribution;
    lastMonthAdded += 1;
    equityCurve.push(equity);
  }

  const totalContributed = initialCapital + monthlyContribution * totalMonths;
  const returnPct =
    totalContributed > 0 ? ((equity - totalContributed) / totalContributed) * 100 : 0;

  return {
    finalEquity: equity,
    maxDrawdownPct,
    returnPct,
    lossStreakMax,
    equityCurve: compactCurve(equityCurve),
  };
}

function summarizeSimulations({
  initialCapital,
  monthlyContribution,
  years,
  tradesPerYear,
  winRatePct,
  avgWinPct,
  avgLossPct,
  costPerTradePct,
  riskPerTradePct,
  maxPositionPct,
  simulations,
  seed,
}: {
  initialCapital: number;
  monthlyContribution: number;
  years: number;
  tradesPerYear: number;
  winRatePct: number;
  avgWinPct: number;
  avgLossPct: number;
  costPerTradePct: number;
  riskPerTradePct: number;
  maxPositionPct: number;
  simulations: number;
  seed: number;
}): SimulationSummary {
  const safeSimulations = Math.round(clamp(simulations, 50, 1000));
  const totalMonths = Math.max(1, Math.round(years * 12));
  const totalContributed = initialCapital + monthlyContribution * totalMonths;

  const winRate = clamp(winRatePct / 100, 0, 1);
  const avgWin = Math.max(0, avgWinPct / 100);
  const avgLoss = Math.max(0.0001, avgLossPct / 100);
  const cost = Math.max(0, costPerTradePct / 100);

  const expectedReturnPerTrade =
    winRate * avgWin - (1 - winRate) * avgLoss - cost;

  const expectedAnnualReturn =
    (Math.pow(1 + expectedReturnPerTrade, tradesPerYear) - 1) * 100;

  const breakEvenWinRate =
    avgWin + avgLoss > 0 ? (avgLoss + cost) / (avgWin + avgLoss) : 0;

  const b = avgWin / avgLoss;
  const kelly = b > 0 ? (winRate * b - (1 - winRate)) / b : 0;
  const kellyPct = clamp(kelly * 100, 0, 100);

  const suggestedRiskPct = clamp(kellyPct * 0.25, 0.25, 3);

  const positionPct = clamp(
    (riskPerTradePct / 100) / avgLoss,
    0,
    maxPositionPct / 100
  );

  const paths: SimPath[] = [];

  for (let i = 0; i < safeSimulations; i++) {
    paths.push(
      runSingleSimulation({
        seed: seed + i * 97,
        initialCapital,
        monthlyContribution,
        years,
        tradesPerYear,
        winRatePct,
        avgWinPct,
        avgLossPct,
        costPerTradePct,
        riskPerTradePct,
        maxPositionPct,
      })
    );
  }

  const finals = paths.map((path) => path.finalEquity);
  const returns = paths.map((path) => path.returnPct);
  const drawdowns = paths.map((path) => path.maxDrawdownPct);
  const streaks = paths.map((path) => path.lossStreakMax);

  const sortedByFinal = [...paths].sort((a, b) => a.finalEquity - b.finalEquity);
  const medianPath = sortedByFinal[Math.floor(sortedByFinal.length / 2)];

  const riskOfLoss =
    (paths.filter((path) => path.finalEquity < totalContributed).length /
      paths.length) *
    100;

  const riskOfHalfCapital =
    (paths.filter((path) => Math.min(...path.equityCurve) < initialCapital * 0.5)
      .length /
      paths.length) *
    100;

  const averageWorstStreak =
    streaks.reduce((sum, value) => sum + value, 0) / Math.max(streaks.length, 1);

  return {
    totalContributed,
    expectedReturnPerTradePct: expectedReturnPerTrade * 100,
    expectedAnnualReturnPct: expectedAnnualReturn,
    breakEvenWinRatePct: breakEvenWinRate * 100,
    kellyPct,
    suggestedRiskPct,
    positionPct: positionPct * 100,
    medianFinalEquity: percentile(finals, 0.5),
    p10FinalEquity: percentile(finals, 0.1),
    p90FinalEquity: percentile(finals, 0.9),
    medianReturnPct: percentile(returns, 0.5),
    p10ReturnPct: percentile(returns, 0.1),
    p90ReturnPct: percentile(returns, 0.9),
    medianMaxDrawdownPct: percentile(drawdowns, 0.5),
    p90MaxDrawdownPct: percentile(drawdowns, 0.9),
    riskOfLossPct: riskOfLoss,
    riskOfHalfCapitalPct: riskOfHalfCapital,
    averageWorstStreak,
    medianCurve: medianPath?.equityCurve || [],
  };
}

function getScoreClass(score: number) {
  if (score >= 70) return "bg-red-100 text-red-700 border-red-200";
  if (score >= 40) return "bg-amber-100 text-amber-700 border-amber-200";
  if (score >= 10) return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-green-100 text-green-700 border-green-200";
}

function getHealthLabel(summary: SimulationSummary) {
  if (
    summary.expectedReturnPerTradePct > 0 &&
    summary.riskOfLossPct < 35 &&
    summary.p90MaxDrawdownPct < 25
  ) {
    return {
      label: "策略健康度佳",
      className: "bg-red-50 text-red-700 border-red-200",
      note: "期望值為正，Monte Carlo 虧損風險可控，適合進一步做真實歷史回測驗證。",
    };
  }

  if (
    summary.expectedReturnPerTradePct > 0 &&
    summary.riskOfLossPct < 55
  ) {
    return {
      label: "策略可觀察",
      className: "bg-amber-50 text-amber-700 border-amber-200",
      note: "期望值略正，但仍需要確認最大回撤與連續虧損是否能承受。",
    };
  }

  return {
    label: "策略風險偏高",
    className: "bg-green-50 text-green-700 border-green-200",
    note: "目前參數下長期表現不穩，建議降低部位、提高盈虧比或重新檢查進出場規則。",
  };
}

export default function ProRiskLab() {
  const [initialCapital, setInitialCapital] = useState(500000);
  const [monthlyContribution, setMonthlyContribution] = useState(10000);
  const [years, setYears] = useState(5);
  const [tradesPerYear, setTradesPerYear] = useState(48);
  const [winRatePct, setWinRatePct] = useState(52);
  const [avgWinPct, setAvgWinPct] = useState(8);
  const [avgLossPct, setAvgLossPct] = useState(5);
  const [costPerTradePct, setCostPerTradePct] = useState(0.15);
  const [riskPerTradePct, setRiskPerTradePct] = useState(1);
  const [maxPositionPct, setMaxPositionPct] = useState(25);
  const [simulations, setSimulations] = useState(300);
  const [seed, setSeed] = useState(20260512);

  const summary = useMemo(() => {
    return summarizeSimulations({
      initialCapital,
      monthlyContribution,
      years,
      tradesPerYear,
      winRatePct,
      avgWinPct,
      avgLossPct,
      costPerTradePct,
      riskPerTradePct,
      maxPositionPct,
      simulations,
      seed,
    });
  }, [
    initialCapital,
    monthlyContribution,
    years,
    tradesPerYear,
    winRatePct,
    avgWinPct,
    avgLossPct,
    costPerTradePct,
    riskPerTradePct,
    maxPositionPct,
    simulations,
    seed,
  ]);

  const health = getHealthLabel(summary);

  const heatmap = useMemo(() => {
    const winRateOffsets = [-10, -5, 0, 5, 10];
    const winMultipliers = [0.7, 0.85, 1, 1.15, 1.3];

    return winRateOffsets.map((offset) => {
      const nextWinRate = clamp(winRatePct + offset, 5, 95);

      return winMultipliers.map((multiplier): HeatmapCell => {
        const nextAvgWin = Math.max(0.5, avgWinPct * multiplier);
        const p = nextWinRate / 100;
        const expected =
          p * (nextAvgWin / 100) -
          (1 - p) * (avgLossPct / 100) -
          costPerTradePct / 100;

        const annual = (Math.pow(1 + expected, tradesPerYear) - 1) * 100;
        const score = clamp(annual - summary.p90MaxDrawdownPct * 0.35, -50, 100);

        return {
          winRatePct: nextWinRate,
          avgWinPct: nextAvgWin,
          score,
          label: score >= 70 ? "強" : score >= 40 ? "可" : score >= 10 ? "弱" : "危",
        };
      });
    });
  }, [
    winRatePct,
    avgWinPct,
    avgLossPct,
    costPerTradePct,
    tradesPerYear,
    summary.p90MaxDrawdownPct,
  ]);

  const reportText = useMemo(() => {
    return [
      "專業策略健檢報告",
      `初始資金：${formatCurrency(initialCapital)}`,
      `每月投入：${formatCurrency(monthlyContribution)}`,
      `模擬年數：${years} 年`,
      `每年交易次數：${tradesPerYear} 次`,
      `勝率：${formatPct(winRatePct)}`,
      `平均獲利：${formatPct(avgWinPct)}`,
      `平均虧損：${formatPct(avgLossPct)}`,
      `單筆風險：${formatPct(riskPerTradePct)}`,
      "",
      `單筆期望值：${formatPct(summary.expectedReturnPerTradePct)}`,
      `預估年化期望：${formatPct(summary.expectedAnnualReturnPct)}`,
      `打平勝率：${formatPct(summary.breakEvenWinRatePct)}`,
      `Kelly 理論值：${formatPct(summary.kellyPct)}`,
      `保守建議單筆風險：${formatPct(summary.suggestedRiskPct)}`,
      "",
      `Monte Carlo 中位數期末資產：${formatCurrency(summary.medianFinalEquity)}`,
      `最差 10% 期末資產：${formatCurrency(summary.p10FinalEquity)}`,
      `最佳 10% 期末資產：${formatCurrency(summary.p90FinalEquity)}`,
      `虧損機率：${formatPct(summary.riskOfLossPct)}`,
      `P90 最大回撤：${formatPct(summary.p90MaxDrawdownPct)}`,
      "",
      `策略健康度：${health.label}`,
      health.note,
    ].join("\n");
  }, [
    initialCapital,
    monthlyContribution,
    years,
    tradesPerYear,
    winRatePct,
    avgWinPct,
    avgLossPct,
    riskPerTradePct,
    summary,
    health,
  ]);

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      alert("策略健檢報告已複製");
    } catch {
      alert("複製失敗，請手動選取文字");
    }
  };

  const svgPath = makeSvgPath(summary.medianCurve);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">PRO BACKTEST LAB</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              專業策略健檢與 Monte Carlo 風險模擬
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500">
              付費回測網站常見的核心不是只有報酬率，而是檢查策略能不能撐過壞情境。
              這個模組用勝率、平均盈虧、交易頻率與部位風險，模擬不同交易順序下的資金曲線。
            </p>
          </div>

          <button
            onClick={copyReport}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            複製健檢報告
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <h2 className="text-lg font-bold text-slate-900">策略參數</h2>
          <p className="mt-1 text-sm text-slate-500">
            先用目前策略的概略數據輸入。之後可以再把這些參數改成由後端真實回測結果自動帶入。
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <NumberInput label="初始資金" value={initialCapital} onChange={setInitialCapital} />
            <NumberInput label="每月投入" value={monthlyContribution} onChange={setMonthlyContribution} />
            <NumberInput label="模擬年數" value={years} onChange={setYears} />
            <NumberInput label="每年交易次數" value={tradesPerYear} onChange={setTradesPerYear} />
            <NumberInput label="勝率 %" value={winRatePct} onChange={setWinRatePct} step={0.1} />
            <NumberInput label="平均獲利 %" value={avgWinPct} onChange={setAvgWinPct} step={0.1} />
            <NumberInput label="平均虧損 %" value={avgLossPct} onChange={setAvgLossPct} step={0.1} />
            <NumberInput label="交易成本 %" value={costPerTradePct} onChange={setCostPerTradePct} step={0.01} />
            <NumberInput label="單筆風險 %" value={riskPerTradePct} onChange={setRiskPerTradePct} step={0.1} />
            <NumberInput label="最大持股部位 %" value={maxPositionPct} onChange={setMaxPositionPct} step={1} />
            <NumberInput label="模擬次數" value={simulations} onChange={setSimulations} step={50} />
            <NumberInput label="隨機種子" value={seed} onChange={setSeed} step={1} />
          </div>
        </div>

        <div className="space-y-6 xl:col-span-2">
          <div className={`rounded-2xl border p-5 ${health.className}`}>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold">{health.label}</h2>
                <p className="mt-1 text-sm leading-relaxed">{health.note}</p>
              </div>
              <div className="rounded-xl bg-white/70 px-4 py-3 text-sm font-semibold">
                建議單筆風險：{formatPct(summary.suggestedRiskPct)}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="單筆期望值"
              value={formatPct(summary.expectedReturnPerTradePct)}
              tone={summary.expectedReturnPerTradePct >= 0 ? "good" : "bad"}
            />
            <KpiCard
              title="預估年化期望"
              value={formatPct(summary.expectedAnnualReturnPct)}
              tone={summary.expectedAnnualReturnPct >= 0 ? "good" : "bad"}
            />
            <KpiCard
              title="打平勝率"
              value={formatPct(summary.breakEvenWinRatePct)}
              tone={winRatePct >= summary.breakEvenWinRatePct ? "good" : "bad"}
            />
            <KpiCard
              title="Kelly 理論值"
              value={formatPct(summary.kellyPct)}
              tone={summary.kellyPct > 0 ? "good" : "neutral"}
            />
            <KpiCard
              title="中位數期末資產"
              value={formatCurrency(summary.medianFinalEquity)}
              tone="good"
            />
            <KpiCard
              title="最差 10% 期末資產"
              value={formatCurrency(summary.p10FinalEquity)}
              tone={summary.p10FinalEquity >= summary.totalContributed ? "good" : "bad"}
            />
            <KpiCard
              title="虧損機率"
              value={formatPct(summary.riskOfLossPct)}
              tone={summary.riskOfLossPct < 35 ? "good" : "bad"}
            />
            <KpiCard
              title="P90 最大回撤"
              value={formatPct(summary.p90MaxDrawdownPct)}
              tone={summary.p90MaxDrawdownPct < 25 ? "good" : "bad"}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Monte Carlo 中位數資金曲線
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  這不是單一路徑回測，而是把交易順序隨機化後，觀察長期資金曲線穩定性。
                </p>
              </div>
              <div className="text-sm text-slate-500">
                總投入：{formatCurrency(summary.totalContributed)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <svg viewBox="0 0 720 180" className="h-56 w-full overflow-visible">
                <path
                  d={svgPath}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-red-500"
                />
              </svg>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <InfoBox label="中位數報酬" value={formatPct(summary.medianReturnPct)} />
              <InfoBox label="最差 10% 報酬" value={formatPct(summary.p10ReturnPct)} />
              <InfoBox label="最佳 10% 報酬" value={formatPct(summary.p90ReturnPct)} />
              <InfoBox label="中位數最大回撤" value={formatPct(summary.medianMaxDrawdownPct)} />
              <InfoBox label="平均最長連敗" value={`${summary.averageWorstStreak.toFixed(1)} 次`} />
              <InfoBox label="半資金風險" value={formatPct(summary.riskOfHalfCapitalPct)} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            參數韌性熱區
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            付費回測網站很重視避免過度最佳化。這張表不是找最高分，而是看附近參數是否也能活。
            如果只有單一格很強、旁邊都很弱，通常代表策略很可能只是剛好套到歷史資料。
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-2 text-sm">
            <thead>
              <tr>
                <th className="rounded-xl bg-slate-100 p-3 text-left text-slate-600">
                  勝率 / 平均獲利
                </th>
                {[0.7, 0.85, 1, 1.15, 1.3].map((multiplier) => (
                  <th
                    key={multiplier}
                    className="rounded-xl bg-slate-100 p-3 text-center text-slate-600"
                  >
                    獲利 x {multiplier}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmap.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="rounded-xl bg-slate-100 p-3 font-semibold text-slate-700">
                    勝率 {row[0].winRatePct.toFixed(1)}%
                  </td>
                  {row.map((cell) => (
                    <td
                      key={`${cell.winRatePct}-${cell.avgWinPct}`}
                      className={`rounded-xl border p-3 text-center font-semibold ${getScoreClass(
                        cell.score
                      )}`}
                    >
                      <div>{cell.label}</div>
                      <div className="mt-1 text-xs opacity-80">
                        score {cell.score.toFixed(0)}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">專業判讀</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <ChecklistCard
            title="可以考慮加碼的情況"
            items={[
              "單筆期望值為正",
              "最差 10% 情境仍高於總投入",
              "P90 最大回撤低於自己能承受的幅度",
              "參數韌性熱區不是只有單一格有效",
            ]}
          />
          <ChecklistCard
            title="需要降低部位的情況"
            items={[
              "虧損機率超過 50%",
              "P90 最大回撤超過 30%",
              "平均最長連敗超過心理可承受範圍",
              "Kelly 理論值過低或接近 0",
            ]}
          />
          <ChecklistCard
            title="下一步該接的真實資料"
            items={[
              "由後端真實回測自動帶入勝率與盈虧",
              "分多頭、空頭、盤整市場分別測試",
              "加入交易成本、滑價與除權息",
              "加入 walk-forward out-of-sample 驗證",
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
    </div>
  );
}

function KpiCard({
  title,
  value,
  tone = "neutral",
}: {
  title: string;
  value: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const valueClass =
    tone === "good"
      ? "text-red-600"
      : tone === "bad"
        ? "text-green-600"
        : "text-slate-900";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className={`mt-2 text-xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ChecklistCard({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}