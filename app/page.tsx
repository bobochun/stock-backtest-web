"use client";

import { useState } from "react";

import AdvancedMetrics from "./components/AdvancedMetrics";
import BacktestForm from "./components/BacktestForm";
import DcaBacktestPanel from "./components/DcaBacktestPanel";
import EquityCurveChart from "./components/EquityCurveChart";
import EtfQuickPanel from "./components/EtfQuickPanel";
import MetricCard from "./components/MetricCard";
import ParameterOptimizer from "./components/ParameterOptimizer";
import QuickActionPanel from "./components/QuickActionPanel";
import RecentResults from "./components/RecentResults";
import ResultSummary from "./components/ResultSummary";
import SecuritySearchBox from "./components/SecuritySearchBox";
import StrategyComparison from "./components/StrategyComparison";
import TradeTable from "./components/TradeTable";
import WatchlistScanner from "./components/WatchlistScanner";
import WatchlistSummary from "./components/WatchlistSummary";

import type {
  BacktestResult,
  EquityPoint,
  ScanError,
  TradeRecord,
} from "./types";

const defaultCurve: EquityPoint[] = [
  { period: "第 1 月", strategy: 1000000, benchmark: 1000000 },
  { period: "第 2 月", strategy: 1032000, benchmark: 1010000 },
  { period: "第 3 月", strategy: 1015000, benchmark: 1006000 },
  { period: "第 4 月", strategy: 1068000, benchmark: 1024000 },
  { period: "第 5 月", strategy: 1102000, benchmark: 1043000 },
  { period: "第 6 月", strategy: 1087000, benchmark: 1035000 },
  { period: "第 7 月", strategy: 1149000, benchmark: 1060000 },
  { period: "第 8 月", strategy: 1184000, benchmark: 1075000 },
  { period: "第 9 月", strategy: 1169000, benchmark: 1068000 },
  { period: "第 10 月", strategy: 1223000, benchmark: 1090000 },
  { period: "第 11 月", strategy: 1258000, benchmark: 1105000 },
  { period: "第 12 月", strategy: 1287000, benchmark: 1120000 },
];

const defaultTrades: TradeRecord[] = [
  {
    id: 1,
    symbol: "2330",
    stockName: "台積電",
    entryDate: "2025-01-10",
    exitDate: "2025-02-14",
    entryPrice: 620,
    exitPrice: 665,
    shares: 1000,
    pnl: 45000,
    pnlPct: 7.3,
    result: "獲利",
  },
];

function safeMetricValue(value: unknown, suffix = "") {
  if (value === null || value === undefined) return "-";

  if (typeof value === "number") {
    return `${value}${suffix}`;
  }

  if (typeof value === "string") {
    return `${value}${suffix}`;
  }

  if (Array.isArray(value)) {
    return `${value.length}${suffix}`;
  }

  return "-";
}

function formatCompactCurrency(value: number) {
  return value.toLocaleString("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  });
}

function HeroMiniChart() {
  const bars = [38, 48, 43, 62, 56, 74, 68, 82, 79, 91, 86, 96];

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-300">
            Strategy Equity Curve
          </p>
          <p className="mt-1 text-xl font-black text-white">
            +28.7% Simulated
          </p>
        </div>

        <div className="rounded-full bg-red-400/20 px-3 py-1 text-xs font-bold text-red-200">
          PRO VIEW
        </div>
      </div>

      <div className="rounded-3xl bg-slate-950/70 p-4">
        <svg viewBox="0 0 720 260" className="h-56 w-full">
          <defs>
            <linearGradient id="homeHeroLine" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="55%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#fb7185" />
            </linearGradient>
            <linearGradient id="homeHeroArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path
            d="M0 210 C60 200 80 175 125 182 C180 190 195 120 245 136 C300 154 330 95 380 105 C430 114 470 68 520 82 C580 98 610 40 720 50 L720 260 L0 260 Z"
            fill="url(#homeHeroArea)"
          />
          <path
            d="M0 210 C60 200 80 175 125 182 C180 190 195 120 245 136 C300 154 330 95 380 105 C430 114 470 68 520 82 C580 98 610 40 720 50"
            fill="none"
            stroke="url(#homeHeroLine)"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {[90, 155, 230, 310, 385, 470, 555, 640].map((x, index) => {
            const high = [62, 120, 92, 148, 82, 118, 58, 88][index];
            const low = [180, 206, 165, 190, 150, 172, 130, 142][index];
            const bodyTop = [95, 150, 122, 160, 110, 134, 82, 102][index];
            const bodyHeight = [46, 32, 38, 25, 36, 34, 28, 22][index];
            const positive = index % 2 === 0;

            return (
              <g key={x}>
                <line
                  x1={x}
                  y1={high}
                  x2={x}
                  y2={low}
                  stroke={positive ? "#fb7185" : "#38bdf8"}
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity="0.75"
                />
                <rect
                  x={x - 12}
                  y={bodyTop}
                  width="24"
                  height={bodyHeight}
                  rx="5"
                  fill={positive ? "#fb7185" : "#38bdf8"}
                  opacity="0.9"
                />
              </g>
            );
          })}
        </svg>

        <div className="mt-4 flex h-20 items-end gap-2">
          {bars.map((height, index) => (
            <div
              key={index}
              className="flex flex-1 items-end rounded-full bg-white/10"
            >
              <div
                className={`w-full rounded-full ${
                  height > 80
                    ? "bg-red-400"
                    : height > 60
                      ? "bg-amber-300"
                      : "bg-sky-300"
                }`}
                style={{ height: `${height}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  badge,
  href,
}: {
  title: string;
  description: string;
  badge: string;
  href?: string;
}) {
  const content = (
    <div className="group h-full rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl">
      <div className="mb-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
        {badge}
      </div>
      <h3 className="text-lg font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-4 text-sm font-bold text-blue-600 group-hover:text-blue-700">
        {href ? "前往功能 →" : "已在首頁下方"}
      </div>
    </div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }

  return content;
}

export default function Home() {
  const [symbol, setSymbol] = useState("");
  const [watchlistSymbols, setWatchlistSymbols] = useState(
    "2330, 2454, 2317, 2382, 0050, 006208, 00878"
  );

  const [strategy, setStrategy] = useState("MA20 / MA60 黃金交叉");
  const [capital, setCapital] = useState("1000000");
  const [positionSize, setPositionSize] = useState("20%");
  const [stopLoss, setStopLoss] = useState("8%");
  const [takeProfit, setTakeProfit] = useState("15%");
  const [startDate, setStartDate] = useState("2025-01-01");
  const [endDate, setEndDate] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const [compareResults, setCompareResults] = useState<BacktestResult[]>([]);
  const [scanResults, setScanResults] = useState<BacktestResult[]>([]);
  const [scanErrors, setScanErrors] = useState<ScanError[]>([]);
  const [optimizationResults, setOptimizationResults] = useState<
    BacktestResult[]
  >([]);

  const [result, setResult] = useState<BacktestResult>({
    symbol: "2330",
    stockName: "台積電",
    strategy: "MA20 / MA60 黃金交叉",
    annualReturn: 18.7,
    maxDrawdown: -13.2,
    winRate: 61.5,
    trades: 48,
  });

  const [equityCurve, setEquityCurve] = useState<EquityPoint[]>(defaultCurve);
  const [tradeRecords, setTradeRecords] =
    useState<TradeRecord[]>(defaultTrades);

  const [recentResults, setRecentResults] = useState<BacktestResult[]>([
    {
      symbol: "2330",
      stockName: "台積電",
      strategy: "MA20 / MA60 黃金交叉",
      annualReturn: 22.4,
      maxDrawdown: -12.8,
      winRate: 62.1,
      trades: 42,
    },
  ]);

  const requestBody = {
    symbol,
    symbols: watchlistSymbols,
    strategy,
    capital,
    positionSize,
    stopLoss,
    takeProfit,
    startDate,
    endDate,
  };

  function addToWatchlist(nextSymbol: string) {
    const current = watchlistSymbols
      .replaceAll("，", ",")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!current.includes(nextSymbol)) {
      setWatchlistSymbols([...current, nextSymbol].join(", "));
    }
  }

  async function runBacktest() {
    if (!symbol.trim()) {
      alert("請先輸入股票代號，例如 2330");
      return;
    }

    setIsLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch("/api/backtest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "回測失敗");
        return;
      }

      setResult(data.result);
      setEquityCurve(data.equityCurve);
      setTradeRecords(data.tradeRecords);
      setRecentResults((previousResults) => [data.result, ...previousResults]);
    } catch {
      alert("回測逾時或無法連線到後端，請確認 FastAPI port 8000 有啟動");
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }

  async function compareStrategies() {
    if (!symbol.trim()) {
      alert("請先輸入股票代號，例如 2330");
      return;
    }

    setIsComparing(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "策略比較失敗");
        return;
      }

      setCompareResults(data.results);
    } catch {
      alert("策略比較逾時或無法連線到後端，請確認 FastAPI port 8000 有啟動");
    } finally {
      clearTimeout(timeoutId);
      setIsComparing(false);
    }
  }

  async function scanWatchlist() {
    setIsScanning(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "觀察清單掃描失敗");
        return;
      }

      setScanResults(data.results || []);
      setScanErrors(data.errors || []);
    } catch {
      alert("觀察清單掃描逾時或無法連線到後端，請確認 FastAPI port 8000 有啟動");
    } finally {
      clearTimeout(timeoutId);
      setIsScanning(false);
    }
  }

  async function optimizeParameters() {
    if (!symbol.trim()) {
      alert("請先輸入股票代號，例如 2330");
      return;
    }

    setIsOptimizing(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 240000);

    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "參數最佳化失敗");
        return;
      }

      setOptimizationResults(data.results || []);
    } catch {
      alert("參數最佳化逾時或無法連線到後端，請確認 FastAPI port 8000 有啟動");
    } finally {
      clearTimeout(timeoutId);
      setIsOptimizing(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-12%] top-[-12%] h-96 w-96 rounded-full bg-blue-200/60 blur-3xl" />
        <div className="absolute right-[-10%] top-[18%] h-96 w-96 rounded-full bg-red-200/60 blur-3xl" />
        <div className="absolute bottom-[-18%] left-[30%] h-96 w-96 rounded-full bg-cyan-200/40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl md:p-8">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-blue-500 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-red-500 blur-3xl" />
            <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 blur-3xl" />
          </div>

          <div className="relative z-10 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-200 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                TAIWAN STOCK BACKTEST TERMINAL
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-5xl">
                台股策略回測網站
                <span className="block text-red-300">
                  從回測、掃描到風險控管
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                支援單一股票回測、多策略比較、觀察清單掃描、參數最佳化、
                ETF 快速清單、台股商品搜尋、ETF 定期定額與 CSV 匯出。
                現在也加入專業級 Monte Carlo 風險實驗室。
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#backtest-workspace"
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  開始回測
                </a>

                <a
                  href="/pro-lab"
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  進入 PRO 實驗室
                </a>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs text-slate-300">Default Symbol</p>
                  <p className="mt-2 text-2xl font-black">
                    {result.symbol || "2330"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {result.stockName || result.name || "台積電"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs text-slate-300">Capital</p>
                  <p className="mt-2 text-2xl font-black">
                    {formatCompactCurrency(Number(capital) || 0)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Position {positionSize}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs text-slate-300">Watchlist</p>
                  <p className="mt-2 text-2xl font-black">
                    {
                      watchlistSymbols
                        .replaceAll("，", ",")
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean).length
                    }
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Symbols monitored
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs text-slate-300">Strategy</p>
                  <p className="mt-2 text-lg font-black">{strategy}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Active template
                  </p>
                </div>
              </div>
            </div>

            <HeroMiniChart />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FeatureCard
            title="單股策略回測"
            description="輸入股票代號與策略條件，快速查看績效、回撤、勝率與交易紀錄。"
            badge="BACKTEST"
          />
          <FeatureCard
            title="觀察清單掃描"
            description="一次掃描多檔台股或 ETF，快速找出較有機會的標的。"
            badge="SCANNER"
          />
          <FeatureCard
            title="參數最佳化"
            description="比較不同策略參數，檢查是否有更好的風險報酬組合。"
            badge="OPTIMIZER"
          />
          <FeatureCard
            title="PRO 風險實驗室"
            description="用 Monte Carlo、Kelly、最差 10% 情境與參數韌性檢查策略品質。"
            badge="PRO LAB"
            href="/pro-lab"
          />
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="年化報酬"
            value={safeMetricValue(result.annualReturn, "%")}
          />

          <MetricCard
            label="最大回撤"
            value={safeMetricValue(result.maxDrawdown, "%")}
            danger
          />

          <MetricCard
            label="勝率"
            value={safeMetricValue(result.winRate, "%")}
          />

          <MetricCard label="交易次數" value={safeMetricValue(result.trades)} />
        </section>

        <section
          id="backtest-workspace"
          className="rounded-[2rem] border border-slate-200 bg-white/80 p-3 shadow-xl backdrop-blur md:p-4"
        >
          <div className="mb-4 px-2 pt-2 md:px-3 md:pt-3">
            <p className="text-sm font-bold text-blue-600">
              BACKTEST WORKSPACE
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              策略操作工作區
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              這裡保留你原本所有主要功能，只把外層改成比較像專業股市網站的儀表板外觀。
            </p>
          </div>

          <div className="space-y-6">
            <QuickActionPanel
              isLoading={isLoading}
              isComparing={isComparing}
              isScanning={isScanning}
              isOptimizing={isOptimizing}
              runBacktest={runBacktest}
              compareStrategies={compareStrategies}
              scanWatchlist={scanWatchlist}
              optimizeParameters={optimizeParameters}
            />

            <SecuritySearchBox
              onSelectSymbol={setSymbol}
              onAddToWatchlist={addToWatchlist}
            />

            <EtfQuickPanel
              setSymbol={setSymbol}
              setWatchlistSymbols={setWatchlistSymbols}
              scanWatchlist={scanWatchlist}
            />

            <DcaBacktestPanel />

            <section className="grid gap-6 md:grid-cols-2">
              <BacktestForm
                symbol={symbol}
                watchlistSymbols={watchlistSymbols}
                strategy={strategy}
                capital={capital}
                positionSize={positionSize}
                stopLoss={stopLoss}
                takeProfit={takeProfit}
                startDate={startDate}
                endDate={endDate}
                isLoading={isLoading}
                isComparing={isComparing}
                isScanning={isScanning}
                isOptimizing={isOptimizing}
                setSymbol={setSymbol}
                setWatchlistSymbols={setWatchlistSymbols}
                setStrategy={setStrategy}
                setCapital={setCapital}
                setPositionSize={setPositionSize}
                setStopLoss={setStopLoss}
                setTakeProfit={setTakeProfit}
                setStartDate={setStartDate}
                setEndDate={setEndDate}
                runBacktest={runBacktest}
                compareStrategies={compareStrategies}
                scanWatchlist={scanWatchlist}
                optimizeParameters={optimizeParameters}
              />

              <ResultSummary result={result} />
            </section>
          </div>
        </section>

        <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white/80 p-3 shadow-xl backdrop-blur md:p-4">
          <div className="px-2 pt-2 md:px-3 md:pt-3">
            <p className="text-sm font-bold text-blue-600">
              PERFORMANCE ANALYTICS
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              績效分析與交易紀錄
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              包含資金曲線、進階指標、交易明細、策略比較、觀察清單掃描與近期結果。
            </p>
          </div>

          <EquityCurveChart equityCurve={equityCurve} />

          <AdvancedMetrics result={result} />

          <TradeTable tradeRecords={tradeRecords} />

          <StrategyComparison results={compareResults} />

          <WatchlistSummary results={scanResults} />

          <WatchlistScanner results={scanResults} errors={scanErrors} />

          <ParameterOptimizer results={optimizationResults} />

          <RecentResults recentResults={recentResults} />
        </section>
      </div>
    </main>
  );
}