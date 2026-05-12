"use client";

import { useEffect, useMemo, useState } from "react";

type QuoteResult = {
  symbol: string;
  stockName: string;
  market?: string;
  securityType?: string;
  tickerUsed?: string;
  lastClose: number;
  lastDate: string;
  error?: string;
};

type FlowRecord = {
  symbol: string;
  name: string;
  market: string;
  date: string;
  foreignNetLots: number;
  trustNetLots: number;
  dealerNetLots: number;
  totalNetLots: number;
  score: number;
  baseScore?: number;
  signal: string;
  strategies: string[];
  reason: string;
  sourceMode?: string;
  hasFlowData?: boolean;
  accumulationDays?: number;
  recentFlowDays?: number;
  recentForeignBuyDays?: number;
  recentTrustBuyDays?: number;
  recentSyncBuyDays?: number;
  recentForeignNetLotsSum?: number;
  recentTrustNetLotsSum?: number;
  recentTotalNetLotsSum?: number;
  recentFlowScoreAvg?: number;
  recentFlowSignal?: string;
  recentFlowNote?: string;
};

type FlowResponse = {
  ok: boolean;
  records?: FlowRecord[];
  error?: string;
};

type PlanProfile = "swing" | "short" | "etf" | "breakout" | "value";
type TradingUnit = "odd" | "lot";

type TradePlan = {
  id: string;
  symbol: string;
  name: string;
  profile: PlanProfile;
  generatedAt: string;
  quoteDate: string;
  currentPrice: number;
  entryPrice: number;
  addPrice: number;
  stopLossPrice: number;
  targetPrice1: number;
  targetPrice2: number;
  capital: number;
  riskPct: number;
  maxPositionPct: number;
  maxPositionAmount: number;
  riskBudget: number;
  sharesByPosition: number;
  sharesByRisk: number;
  suggestedShares: number;
  estimatedCost: number;
  estimatedRisk: number;
  estimatedReward1: number;
  estimatedReward2: number;
  rr1: number;
  rr2: number;
  positionPct: number;
  flowScore: number;
  flowSignal: string;
  flowSummary: string;
  thesis: string[];
  entryRules: string[];
  exitRules: string[];
  riskNotes: string[];
  checklist: string[];
  tags: string[];
};

const PLAN_STORAGE_KEY = "stock-backtest-web-trade-plan-lab-v1";

const profileOptions: { value: PlanProfile; label: string; description: string }[] = [
  {
    value: "swing",
    label: "中短線趨勢",
    description: "適合法人偏多、站上均線、等待回測進場。",
  },
  {
    value: "short",
    label: "短線反彈",
    description: "適合 RSI 低檔轉強、回檔後反彈。",
  },
  {
    value: "breakout",
    label: "突破動能",
    description: "適合整理後突破、強勢股追蹤。",
  },
  {
    value: "etf",
    label: "ETF 分批",
    description: "適合 ETF、長期配置、回檔分批加碼。",
  },
  {
    value: "value",
    label: "價值低波動",
    description: "適合高股息、低波動、慢慢分批。",
  },
];

function nowText() {
  return new Date().toLocaleString("zh-TW", {
    hour12: false,
  });
}

function createId() {
  return `trade-plan-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseNumber(value: string | number | undefined | null) {
  const parsed = Number(
    String(value ?? "")
      .replaceAll(",", "")
      .replaceAll("，", "")
      .replaceAll("%", "")
      .trim()
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "-";

  return `NT$${Math.round(value).toLocaleString("zh-TW")}`;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "-";

  return value.toLocaleString("zh-TW", {
    maximumFractionDigits: 2,
  });
}

function formatPrice(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "-";

  return value.toLocaleString("zh-TW", {
    maximumFractionDigits: 2,
  });
}

function formatPct(value: number) {
  if (!Number.isFinite(value)) return "-";

  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(1)}%`;
}

function roundTaiwanPrice(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;

  if (value < 50) return Number(value.toFixed(2));
  if (value < 500) return Number(value.toFixed(1));

  return Math.round(value);
}

function floorByUnit(value: number, unit: TradingUnit) {
  if (!Number.isFinite(value) || value <= 0) return 0;

  if (unit === "lot") {
    return Math.floor(value / 1000) * 1000;
  }

  return Math.floor(value);
}

function pnlClass(value: number) {
  if (value > 0) return "text-red-600";
  if (value < 0) return "text-green-600";
  return "text-slate-500";
}

function getProfileLabel(profile: PlanProfile) {
  return profileOptions.find((item) => item.value === profile)?.label || "交易計畫";
}

function getSuggestedLevels(price: number, profile: PlanProfile, flowScore: number) {
  if (!Number.isFinite(price) || price <= 0) {
    return {
      entryPrice: 0,
      addPrice: 0,
      stopLossPrice: 0,
      targetPrice1: 0,
      targetPrice2: 0,
    };
  }

  let entry = 0.98;
  let add = 0.95;
  let stop = 0.92;
  let target1 = 1.1;
  let target2 = 1.16;

  if (profile === "short") {
    entry = 0.97;
    add = 0.94;
    stop = 0.91;
    target1 = 1.08;
    target2 = 1.12;
  }

  if (profile === "breakout") {
    entry = 0.995;
    add = 0.97;
    stop = 0.94;
    target1 = 1.1;
    target2 = 1.18;
  }

  if (profile === "etf") {
    entry = 0.97;
    add = 0.94;
    stop = 0.88;
    target1 = 1.08;
    target2 = 1.12;
  }

  if (profile === "value") {
    entry = 0.96;
    add = 0.92;
    stop = 0.88;
    target1 = 1.08;
    target2 = 1.15;
  }

  if (flowScore >= 75 && profile !== "etf") {
    entry += 0.005;
    target1 += 0.02;
    target2 += 0.03;
  }

  if (flowScore <= 40) {
    entry -= 0.015;
    add -= 0.015;
    stop -= 0.02;
  }

  return {
    entryPrice: roundTaiwanPrice(price * entry),
    addPrice: roundTaiwanPrice(price * add),
    stopLossPrice: roundTaiwanPrice(price * stop),
    targetPrice1: roundTaiwanPrice(price * target1),
    targetPrice2: roundTaiwanPrice(price * target2),
  };
}

function makeFlowSummary(record: FlowRecord | null) {
  if (!record) {
    return {
      score: 50,
      signal: "尚未查詢法人資料",
      summary: "目前尚未取得法人籌碼資料，交易計畫先以價格與風險控管為主。",
    };
  }

  const recentText =
    record.recentFlowDays && record.recentFlowDays > 0
      ? `近 ${record.recentFlowDays} 日外資買超 ${record.recentForeignBuyDays || 0} 天、投信買超 ${
          record.recentTrustBuyDays || 0
        } 天、同步買超 ${record.recentSyncBuyDays || 0} 天。`
      : "近期買超天數資料不足。";

  return {
    score: Number(record.score || 50),
    signal: record.signal || "中性",
    summary: `${record.signal || "中性"}，法人分數 ${record.score || 50}。單日三大法人合計 ${formatNumber(
      record.totalNetLots || 0
    )} 張。${recentText}`,
  };
}

function buildPlan({
  symbol,
  name,
  profile,
  currentPrice,
  quoteDate,
  capital,
  riskPct,
  maxPositionPct,
  tradingUnit,
  flowRecord,
  customEntry,
  customStop,
  customTarget,
}: {
  symbol: string;
  name: string;
  profile: PlanProfile;
  currentPrice: number;
  quoteDate: string;
  capital: number;
  riskPct: number;
  maxPositionPct: number;
  tradingUnit: TradingUnit;
  flowRecord: FlowRecord | null;
  customEntry: number;
  customStop: number;
  customTarget: number;
}): TradePlan {
  const flow = makeFlowSummary(flowRecord);
  const levels = getSuggestedLevels(currentPrice, profile, flow.score);

  const entryPrice = customEntry > 0 ? customEntry : levels.entryPrice;
  const stopLossPrice = customStop > 0 ? customStop : levels.stopLossPrice;
  const targetPrice1 = customTarget > 0 ? customTarget : levels.targetPrice1;
  const targetPrice2 = levels.targetPrice2;
  const addPrice = levels.addPrice;

  const maxPositionAmount = capital * (maxPositionPct / 100);
  const riskBudget = capital * (riskPct / 100);
  const riskPerShare = Math.max(0, entryPrice - stopLossPrice);

  const sharesByPosition = floorByUnit(
    entryPrice > 0 ? maxPositionAmount / entryPrice : 0,
    tradingUnit
  );

  const sharesByRisk = floorByUnit(
    riskPerShare > 0 ? riskBudget / riskPerShare : sharesByPosition,
    tradingUnit
  );

  const suggestedShares = Math.max(0, Math.min(sharesByPosition, sharesByRisk));
  const estimatedCost = suggestedShares * entryPrice;
  const estimatedRisk = suggestedShares * riskPerShare;
  const estimatedReward1 = suggestedShares * Math.max(0, targetPrice1 - entryPrice);
  const estimatedReward2 = suggestedShares * Math.max(0, targetPrice2 - entryPrice);
  const rr1 = estimatedRisk > 0 ? estimatedReward1 / estimatedRisk : 0;
  const rr2 = estimatedRisk > 0 ? estimatedReward2 / estimatedRisk : 0;
  const positionPct = capital > 0 ? (estimatedCost / capital) * 100 : 0;

  const thesis = [
    `${symbol} ${name} 目前收盤價 ${formatPrice(currentPrice)}，本計畫使用「${getProfileLabel(profile)}」框架。`,
    flow.summary,
    flow.score >= 65
      ? "法人籌碼偏多，允許使用較接近現價的進場區，但仍須遵守停損。"
      : flow.score <= 40
        ? "法人籌碼偏弱，進場需更保守，建議等待更明確回測或縮小部位。"
        : "法人籌碼中性，進場重點放在價格是否接近買點與風險報酬是否合理。",
  ];

  const entryRules = [
    `第一筆觀察買點：${formatPrice(entryPrice)} 附近。`,
    `第二筆加碼或分批區：${formatPrice(addPrice)} 附近，僅在沒有跌破主要停損且大盤未明顯轉弱時執行。`,
    `若現價離買點太遠，不追價；等待回測或下一次訊號。`,
    flow.score >= 65
      ? "若外資與投信續買，可提高執行優先度。"
      : "若法人轉為連續賣超，暫緩進場。",
  ];

  const exitRules = [
    `停損價：${formatPrice(stopLossPrice)}，跌破後不攤平，先降低部位。`,
    `第一停利：${formatPrice(targetPrice1)}，可分批出場 30%～50%。`,
    `第二停利：${formatPrice(targetPrice2)}，若趨勢延續可用移動停損替代一次賣出。`,
    "若進場理由消失，例如法人明顯轉賣、跌破關鍵均線，應重新評估，不必等到停損價。",
  ];

  const riskNotes = [
    `本次風險預算約 ${formatMoney(riskBudget)}，建議股數 ${formatNumber(suggestedShares)} 股。`,
    `預估投入金額 ${formatMoney(estimatedCost)}，約佔總資金 ${formatPct(positionPct)}。`,
    `若跌到停損，預估虧損 ${formatMoney(estimatedRisk)}。`,
    rr1 >= 1.5
      ? `第一目標風報比約 ${formatNumber(rr1)}，可接受。`
      : `第一目標風報比約 ${formatNumber(rr1)}，偏低，進場價需要更有耐心。`,
  ];

  const checklist = [
    "現價已接近計畫買點，而不是情緒追價。",
    "停損價已先設定，且單筆虧損在可承受範圍。",
    "法人籌碼沒有明顯惡化。",
    "大盤或同族群沒有明顯系統性風險。",
    "進場後若未照計畫走，能接受停損出場。",
  ];

  const tags = [
    getProfileLabel(profile),
    flow.score >= 65 ? "法人偏多" : "",
    flow.score <= 40 ? "法人偏弱" : "",
    rr1 >= 1.5 ? "風報比可接受" : "等待更佳買點",
    positionPct > maxPositionPct ? "部位過大" : "",
  ].filter(Boolean);

  return {
    id: createId(),
    symbol,
    name,
    profile,
    generatedAt: nowText(),
    quoteDate,
    currentPrice,
    entryPrice,
    addPrice,
    stopLossPrice,
    targetPrice1,
    targetPrice2,
    capital,
    riskPct,
    maxPositionPct,
    maxPositionAmount,
    riskBudget,
    sharesByPosition,
    sharesByRisk,
    suggestedShares,
    estimatedCost,
    estimatedRisk,
    estimatedReward1,
    estimatedReward2,
    rr1,
    rr2,
    positionPct,
    flowScore: flow.score,
    flowSignal: flow.signal,
    flowSummary: flow.summary,
    thesis,
    entryRules,
    exitRules,
    riskNotes,
    checklist,
    tags,
  };
}

function planToText(plan: TradePlan) {
  return [
    `【${plan.symbol} ${plan.name} 智能交易計畫】`,
    `產生時間：${plan.generatedAt}`,
    `策略類型：${getProfileLabel(plan.profile)}`,
    `現價：${formatPrice(plan.currentPrice)}（${plan.quoteDate || "-"}）`,
    "",
    "一、交易假說",
    ...plan.thesis.map((item) => `- ${item}`),
    "",
    "二、進場計畫",
    `- 第一買點：${formatPrice(plan.entryPrice)}`,
    `- 分批加碼：${formatPrice(plan.addPrice)}`,
    `- 建議股數：${formatNumber(plan.suggestedShares)} 股`,
    `- 預估投入：${formatMoney(plan.estimatedCost)}，約佔總資金 ${formatPct(plan.positionPct)}`,
    ...plan.entryRules.map((item) => `- ${item}`),
    "",
    "三、出場計畫",
    `- 停損：${formatPrice(plan.stopLossPrice)}，預估風險 ${formatMoney(plan.estimatedRisk)}`,
    `- 第一停利：${formatPrice(plan.targetPrice1)}，風報比 ${formatNumber(plan.rr1)}`,
    `- 第二停利：${formatPrice(plan.targetPrice2)}，風報比 ${formatNumber(plan.rr2)}`,
    ...plan.exitRules.map((item) => `- ${item}`),
    "",
    "四、風險控管",
    ...plan.riskNotes.map((item) => `- ${item}`),
    "",
    "五、進場前檢查",
    ...plan.checklist.map((item) => `- [ ] ${item}`),
  ].join("\n");
}

async function fetchQuote(symbol: string): Promise<QuoteResult> {
  const cleanSymbol = symbol.trim();

  if (!cleanSymbol) {
    throw new Error("請先輸入股票代號");
  }

  const response = await fetch(`/api/quote?symbol=${encodeURIComponent(cleanSymbol)}`, {
    cache: "no-store",
  });

  const data = (await response.json()) as QuoteResult;

  if (!response.ok) {
    throw new Error(data.error || "查詢失敗");
  }

  return data;
}

async function fetchFlow(symbol: string, accumulationDays: number): Promise<FlowRecord | null> {
  const response = await fetch("/api/institutional-flow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      symbols: symbol,
      date: "",
      lookbackDays: 5,
      accumulationDays,
    }),
  });

  const data = (await response.json()) as FlowResponse;

  if (!response.ok || !data.ok) {
    return null;
  }

  return data.records?.[0] || null;
}

export default function TradePlanLab() {
  const [symbol, setSymbol] = useState("2330");
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<PlanProfile>("swing");
  const [capital, setCapital] = useState("1000000");
  const [riskPct, setRiskPct] = useState("1");
  const [maxPositionPct, setMaxPositionPct] = useState("20");
  const [tradingUnit, setTradingUnit] = useState<TradingUnit>("odd");
  const [accumulationDays, setAccumulationDays] = useState("5");
  const [currentPrice, setCurrentPrice] = useState("");
  const [quoteDate, setQuoteDate] = useState("");
  const [customEntry, setCustomEntry] = useState("");
  const [customStop, setCustomStop] = useState("");
  const [customTarget, setCustomTarget] = useState("");
  const [flowRecord, setFlowRecord] = useState<FlowRecord | null>(null);
  const [plans, setPlans] = useState<TradePlan[]>([]);
  const [activePlan, setActivePlan] = useState<TradePlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PLAN_STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        setPlans(parsed);
        setActivePlan(parsed[0] || null);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plans));
  }, [plans]);

  const previewLevels = useMemo(() => {
    const flowScore = flowRecord?.score || 50;

    return getSuggestedLevels(parseNumber(currentPrice), profile, flowScore);
  }, [currentPrice, profile, flowRecord]);

  async function loadDataAndGenerate() {
    if (!symbol.trim()) {
      alert("請先輸入股票代號");
      return;
    }

    setIsLoading(true);

    try {
      const quote = await fetchQuote(symbol);
      const flow = await fetchFlow(quote.symbol, parseNumber(accumulationDays));

      setSymbol(quote.symbol);
      setName(quote.stockName || quote.symbol);
      setCurrentPrice(String(quote.lastClose || ""));
      setQuoteDate(quote.lastDate || "");
      setFlowRecord(flow);

      const plan = buildPlan({
        symbol: quote.symbol,
        name: quote.stockName || quote.symbol,
        profile,
        currentPrice: quote.lastClose,
        quoteDate: quote.lastDate || "",
        capital: parseNumber(capital),
        riskPct: parseNumber(riskPct),
        maxPositionPct: parseNumber(maxPositionPct),
        tradingUnit,
        flowRecord: flow,
        customEntry: parseNumber(customEntry),
        customStop: parseNumber(customStop),
        customTarget: parseNumber(customTarget),
      });

      setActivePlan(plan);
      setPlans((previous) => [plan, ...previous].slice(0, 20));
    } catch (error) {
      alert(error instanceof Error ? error.message : "產生交易計畫失敗");
    } finally {
      setIsLoading(false);
    }
  }

  function generateFromCurrentInputs() {
    const price = parseNumber(currentPrice);

    if (!symbol.trim() || price <= 0) {
      alert("請先輸入股票代號與現價，或按「抓資料並產生計畫」");
      return;
    }

    const plan = buildPlan({
      symbol: symbol.trim(),
      name: name.trim() || symbol.trim(),
      profile,
      currentPrice: price,
      quoteDate,
      capital: parseNumber(capital),
      riskPct: parseNumber(riskPct),
      maxPositionPct: parseNumber(maxPositionPct),
      tradingUnit,
      flowRecord,
      customEntry: parseNumber(customEntry),
      customStop: parseNumber(customStop),
      customTarget: parseNumber(customTarget),
    });

    setActivePlan(plan);
    setPlans((previous) => [plan, ...previous].slice(0, 20));
  }

  async function copyActivePlan() {
    if (!activePlan) {
      alert("請先產生交易計畫");
      return;
    }

    await navigator.clipboard.writeText(planToText(activePlan));
    alert("交易計畫已複製");
  }

  function deletePlan(id: string) {
    setPlans((previous) => previous.filter((plan) => plan.id !== id));

    if (activePlan?.id === id) {
      setActivePlan(null);
    }
  }

  function clearPlans() {
    if (!confirm("確定清空最近交易計畫？")) return;

    setPlans([]);
    setActivePlan(null);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-12%] top-[-12%] h-96 w-96 rounded-full bg-blue-200/60 blur-3xl" />
        <div className="absolute right-[-10%] top-[18%] h-96 w-96 rounded-full bg-red-200/60 blur-3xl" />
        <div className="absolute bottom-[-18%] left-[30%] h-96 w-96 rounded-full bg-cyan-200/40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl md:p-8">
          <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-200 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                AI TRADE PLAN GENERATOR
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-5xl">
                智能交易計畫產生器
                <span className="block text-red-300">進場、停損、停利、部位一次算好</span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                輸入股票代號後，自動抓現價與法人籌碼，依照資金、風險比例與策略型態產生完整交易計畫。
                這個頁面是把 Screener、Flow、Watchlist 與 Portfolio 串成實際操作決策。
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={loadDataAndGenerate}
                  disabled={isLoading}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:opacity-60"
                >
                  {isLoading ? "產生中..." : "抓資料並產生計畫"}
                </button>

                <button
                  onClick={copyActivePlan}
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  複製計畫
                </button>

                <a
                  href="/"
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  回首頁
                </a>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
              <div className="grid gap-3 md:grid-cols-2">
                <HeroMetric label="建議股數" value={`${formatNumber(activePlan?.suggestedShares || 0)}`} note="Suggested shares" />
                <HeroMetric label="預估投入" value={formatMoney(activePlan?.estimatedCost || 0)} note="Estimated cost" />
                <HeroMetric label="停損風險" value={formatMoney(activePlan?.estimatedRisk || 0)} note="Risk amount" />
                <HeroMetric label="風報比" value={`${formatNumber(activePlan?.rr1 || 0)}`} note="Target 1 R/R" />
              </div>

              <div className="mt-4 rounded-3xl bg-slate-900/80 p-4">
                <p className="text-xs text-slate-400">Plan Quality</p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-red-400"
                    style={{
                      width: `${Math.max(
                        5,
                        Math.min(100, activePlan ? activePlan.flowScore : 50)
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-3 text-sm text-slate-300">
                  法人訊號：{activePlan?.flowSignal || "尚未產生"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
          <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <div>
              <h2 className="text-xl font-black text-slate-900">交易參數</h2>
              <p className="mt-1 text-sm text-slate-500">
                你可以只填股票代號後直接產生，也可以自行覆蓋買點、停損與停利。
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Input label="股票代號" value={symbol} onChange={setSymbol} placeholder="2330 / 00878" />
                <Input label="名稱" value={name} onChange={setName} placeholder="自動帶入" />
                <Input label="現價" value={currentPrice} onChange={setCurrentPrice} placeholder="自動帶入或手動" />
                <Input label="價格日期" value={quoteDate} onChange={setQuoteDate} placeholder="自動帶入" />

                <Select
                  label="策略型態"
                  value={profile}
                  onChange={(value) => setProfile(value as PlanProfile)}
                  options={profileOptions.map((item) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                />

                <Input label="總資金" value={capital} onChange={setCapital} placeholder="1000000" />
                <Input label="單筆風險 %" value={riskPct} onChange={setRiskPct} placeholder="1" />
                <Input label="最大部位 %" value={maxPositionPct} onChange={setMaxPositionPct} placeholder="20" />

                <Input label="買超累計天數" value={accumulationDays} onChange={setAccumulationDays} placeholder="5" />
                <Select
                  label="交易單位"
                  value={tradingUnit}
                  onChange={(value) => setTradingUnit(value as TradingUnit)}
                  options={[
                    { value: "odd", label: "零股 / 任意股數" },
                    { value: "lot", label: "整張 / 1000 股" },
                  ]}
                />

                <Input label="自訂買點" value={customEntry} onChange={setCustomEntry} placeholder={`建議 ${formatPrice(previewLevels.entryPrice)}`} />
                <Input label="自訂停損" value={customStop} onChange={setCustomStop} placeholder={`建議 ${formatPrice(previewLevels.stopLossPrice)}`} />
                <Input label="自訂停利" value={customTarget} onChange={setCustomTarget} placeholder={`建議 ${formatPrice(previewLevels.targetPrice1)}`} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={loadDataAndGenerate}
                  disabled={isLoading}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-700 disabled:opacity-60"
                >
                  {isLoading ? "產生中..." : "抓資料並產生計畫"}
                </button>

                <button
                  onClick={generateFromCurrentInputs}
                  className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100"
                >
                  用目前輸入重算
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-black text-slate-900">目前建議價位</h3>

              <div className="mt-4 grid gap-3">
                <MiniMetric label="第一買點" value={formatPrice(previewLevels.entryPrice)} />
                <MiniMetric label="分批加碼" value={formatPrice(previewLevels.addPrice)} />
                <MiniMetric label="停損價" value={formatPrice(previewLevels.stopLossPrice)} />
                <MiniMetric label="第一停利" value={formatPrice(previewLevels.targetPrice1)} />
                <MiniMetric label="第二停利" value={formatPrice(previewLevels.targetPrice2)} />
              </div>

              <div className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-600">
                <p className="font-bold text-slate-900">提醒</p>
                <p className="mt-1">
                  這頁產生的是交易計畫，不是保證獲利訊號。重點是讓每筆交易在進場前先知道買點、停損、停利與最大虧損。
                </p>
              </div>
            </div>
          </div>
        </section>

        {activePlan && (
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-bold text-blue-600">ACTIVE PLAN</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">
                    {activePlan.symbol} {activePlan.name}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {getProfileLabel(activePlan.profile)}｜產生時間：{activePlan.generatedAt}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {activePlan.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <InfoMetric label="現價" value={formatPrice(activePlan.currentPrice)} />
                <InfoMetric label="買點" value={formatPrice(activePlan.entryPrice)} />
                <InfoMetric label="停損" value={formatPrice(activePlan.stopLossPrice)} valueClassName="text-green-600" />
                <InfoMetric label="停利一" value={formatPrice(activePlan.targetPrice1)} valueClassName="text-red-600" />
                <InfoMetric label="建議股數" value={`${formatNumber(activePlan.suggestedShares)} 股`} />
                <InfoMetric label="預估投入" value={formatMoney(activePlan.estimatedCost)} />
                <InfoMetric label="最大風險" value={formatMoney(activePlan.estimatedRisk)} valueClassName="text-green-600" />
                <InfoMetric label="風報比" value={`${formatNumber(activePlan.rr1)} / ${formatNumber(activePlan.rr2)}`} />
              </div>

              <div className="mt-5 rounded-3xl bg-slate-50 p-4">
                <h3 className="font-black text-slate-900">交易假說</h3>
                <ListBlock items={activePlan.thesis} />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <PlanBlock title="進場條件" items={activePlan.entryRules} />
                <PlanBlock title="出場條件" items={activePlan.exitRules} />
                <PlanBlock title="風險控管" items={activePlan.riskNotes} />
                <PlanBlock title="進場前檢查" items={activePlan.checklist} checkbox />
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
                <h2 className="text-xl font-black text-slate-900">法人籌碼摘要</h2>

                <div className="mt-4 grid gap-3">
                  <MiniMetric label="法人分數" value={`${activePlan.flowScore}`} />
                  <MiniMetric label="法人訊號" value={activePlan.flowSignal} />
                </div>

                <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {activePlan.flowSummary}
                </p>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-900">文字版計畫</h2>
                  <button
                    onClick={copyActivePlan}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
                  >
                    複製
                  </button>
                </div>

                <textarea
                  value={planToText(activePlan)}
                  readOnly
                  className="h-96 w-full rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-700"
                />
              </div>
            </div>
          </section>
        )}

        <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold text-blue-600">RECENT PLANS</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">最近交易計畫</h2>
            </div>

            <button
              onClick={clearPlans}
              className="rounded-2xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-100"
            >
              清空
            </button>
          </div>

          {plans.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              尚未產生交易計畫。
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="font-black text-slate-900">
                    {plan.symbol}{" "}
                    <span className="font-medium text-slate-500">{plan.name}</span>
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    買點 {formatPrice(plan.entryPrice)}｜停損 {formatPrice(plan.stopLossPrice)}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    股數 {formatNumber(plan.suggestedShares)}｜風險 {formatMoney(plan.estimatedRisk)}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">{plan.generatedAt}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => setActivePlan(plan)}
                      className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
                    >
                      查看
                    </button>

                    <button
                      onClick={() => deletePlan(plan.id)}
                      className="rounded-2xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-100"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function HeroMetric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-xs text-slate-300">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{note}</p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}

function InfoMetric({
  label,
  value,
  valueClassName = "text-slate-900",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className={`mt-2 text-lg font-black ${valueClassName}`}>{value}</p>
    </div>
  );
}

function ListBlock({ items }: { items: string[] }) {
  return (
    <div className="mt-3 space-y-2">
      {items.map((item) => (
        <div key={item} className="flex gap-2 text-sm leading-6 text-slate-600">
          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function PlanBlock({
  title,
  items,
  checkbox,
}: {
  title: string;
  items: string[];
  checkbox?: boolean;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <h3 className="font-black text-slate-900">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex gap-2 text-sm leading-6 text-slate-600">
            <span className="mt-0.5 shrink-0 text-slate-400">
              {checkbox ? "☐" : "•"}
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}