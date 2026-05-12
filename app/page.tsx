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

function parseMoney(value: string) {
  const parsed = Number(String(value || "").replaceAll(",", ""));

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCompactCurrency(value: number) {
  return value.toLocaleString("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  });
}

function formatNumber(value: number | string | undefined | null) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) return "-";

  return parsed.toLocaleString("zh-TW", {
    maximumFractionDigits: 2,
  });
}

function formatPct(value: number | string | undefined | null) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) return "-";

  const sign = parsed > 0 ? "+" : "";

  return `${sign}${parsed.toFixed(1)}%`;
}

function getResultName(result: BacktestResult) {
  const maybeName = (result as { name?: string }).name;

  return result.stockName || maybeName || "台積電";
}

function countSymbols(value: string) {
  return value
    .replaceAll("，", ",")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean).length;
}

function HeroVisualPanel({
  result,
}: {
  result: BacktestResult;
}) {
  const bars = [38, 48, 43, 62, 56, 74, 68, 82, 79, 91, 86, 96];
  const score = Number(result.opportunityScore ?? 72);

  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-cyan-400/20 via-red-400/10 to-blue-500/20 blur-2xl" />

      <div className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-300">
              Strategy Intelligence View
            </p>
            <p className="mt-1 text-2xl font-black text-white">
              {formatPct(result.annualReturn)}
            </p>
          </div>

          <div className="rounded-full bg-red-400/20 px-3 py-1 text-xs font-bold text-red-200">
            SCORE {score}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/80 p-4">
          <svg viewBox="0 0 760 310" className="h-64 w-full">
            <defs>
              <linearGradient id="heroLine" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="45%" stopColor="#60a5fa" />
                <stop offset="75%" stopColor="#f87171" />
                <stop offset="100%" stopColor="#fb7185" />
              </linearGradient>

              <linearGradient id="heroArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
              </linearGradient>

              <radialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </radialGradient>
            </defs>

            <rect x="0" y="0" width="760" height="310" rx="28" fill="#020617" />

            {[40, 100, 160, 220, 280].map((y) => (
              <line
                key={y}
                x1="26"
                y1={y}
                x2="734"
                y2={y}
                stroke="#1e293b"
                strokeWidth="2"
              />
            ))}

            {[80, 180, 280, 380, 480, 580, 680].map((x) => (
              <line
                key={x}
                x1={x}
                y1="26"
                x2={x}
                y2="284"
                stroke="#0f172a"
                strokeWidth="2"
              />
            ))}

            <circle cx="610" cy="86" r="130" fill="url(#heroGlow)" />

            <path
              d="M30 238 C86 224 112 193 160 203 C218 215 240 132 292 151 C350 172 383 104 430 118 C482 134 520 70 575 90 C628 111 660 48 730 58 L730 286 L30 286 Z"
              fill="url(#heroArea)"
            />

            <path
              d="M30 238 C86 224 112 193 160 203 C218 215 240 132 292 151 C350 172 383 104 430 118 C482 134 520 70 575 90 C628 111 660 48 730 58"
              fill="none"
              stroke="url(#heroLine)"
              strokeWidth="8"
              strokeLinecap="round"
            />

            {[100, 175, 255, 335, 415, 500, 585, 670].map((x, index) => {
              const high = [78, 130, 92, 158, 86, 120, 58, 82][index];
              const low = [188, 215, 170, 205, 155, 182, 130, 145][index];
              const bodyTop = [103, 154, 124, 166, 114, 138, 88, 104][index];
              const bodyHeight = [48, 34, 40, 27, 38, 36, 30, 24][index];
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
                    opacity="0.85"
                  />
                  <rect
                    x={x - 13}
                    y={bodyTop}
                    width="26"
                    height={bodyHeight}
                    rx="6"
                    fill={positive ? "#fb7185" : "#38bdf8"}
                    opacity="0.95"
                  />
                </g>
              );
            })}

            <g transform="translate(48 42)">
              <rect width="178" height="62" rx="18" fill="#0f172a" opacity="0.92" />
              <text x="18" y="25" fill="#94a3b8" fontSize="13" fontWeight="700">
                ACTIVE SYMBOL
              </text>
              <text x="18" y="50" fill="#ffffff" fontSize="24" fontWeight="900">
                {result.symbol || "2330"}
              </text>
            </g>

            <g transform="translate(540 204)">
              <rect width="166" height="58" rx="18" fill="#0f172a" opacity="0.92" />
              <text x="18" y="24" fill="#94a3b8" fontSize="13" fontWeight="700">
                WIN RATE
              </text>
              <text x="18" y="48" fill="#fb7185" fontSize="24" fontWeight="900">
                {formatPct(result.winRate)}
              </text>
            </g>
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

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MiniGlassMetric
            label="Max DD"
            value={formatPct(result.maxDrawdown)}
          />
          <MiniGlassMetric label="Trades" value={safeMetricValue(result.trades)} />
          <MiniGlassMetric
            label="Signal"
            value={result.currentSignal || "Watch"}
          />
        </div>
      </div>
    </div>
  );
}

function MiniGlassMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
      <p className="text-xs text-slate-300">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function MarketMosaicIllustration() {
  const tiles = [
    { label: "MA", value: "+12.4%", hot: true },
    { label: "RSI", value: "42", hot: false },
    { label: "FLOW", value: "78", hot: true },
    { label: "DD", value: "-8.2%", hot: false },
    { label: "ETF", value: "+6.1%", hot: true },
    { label: "RISK", value: "B", hot: false },
  ];

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-xl">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-400/30 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-cyan-400/30 blur-3xl" />

      <div className="relative">
        <p className="text-xs font-bold text-slate-400">MARKET MAP</p>
        <h3 className="mt-2 text-xl font-black">策略雷達與風險熱區</h3>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className={`rounded-2xl border p-4 ${
                tile.hot
                  ? "border-red-300/30 bg-red-400/15"
                  : "border-cyan-300/30 bg-cyan-400/15"
              }`}
            >
              <p className="text-xs text-slate-300">{tile.label}</p>
              <p className="mt-2 text-2xl font-black">{tile.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-white/10 p-4">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Signal Quality</span>
            <span>82%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-red-400" />
          </div>
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
  icon,
  accent = "blue",
}: {
  title: string;
  description: string;
  badge: string;
  href?: string;
  icon: string;
  accent?: "blue" | "red" | "cyan" | "amber" | "slate";
}) {
  const accentClass = {
    blue: "from-blue-50 to-white text-blue-700",
    red: "from-red-50 to-white text-red-700",
    cyan: "from-cyan-50 to-white text-cyan-700",
    amber: "from-amber-50 to-white text-amber-700",
    slate: "from-slate-50 to-white text-slate-700",
  }[accent];

  const content = (
    <div className="group h-full overflow-hidden rounded-3xl border border-slate-200 bg-white/85 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl">
      <div className={`bg-gradient-to-br ${accentClass} p-5`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
            {icon}
          </div>

          <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-slate-600">
            {badge}
          </div>
        </div>

        <h3 className="mt-5 text-lg font-black text-slate-900">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>

        <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-blue-600 group-hover:text-blue-700">
          {href ? "前往功能" : "已在首頁下方"}
          <span className="transition group-hover:translate-x-1">→</span>
        </div>
      </div>
    </div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }

  return content;
}

function LabPortalCard({
  title,
  description,
  href,
  icon,
  eyebrow,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
  eyebrow: string;
}) {
  return (
    <a
      href={href}
      className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-100 blur-2xl transition group-hover:bg-red-100" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-blue-600">{eyebrow}</p>
            <h3 className="mt-2 text-lg font-black text-slate-900">{title}</h3>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-2xl text-white shadow-lg">
            {icon}
          </div>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>

        <div className="mt-4 text-sm font-black text-slate-900">
          開啟模組 →
        </div>
      </div>
    </a>
  );
}

function WorkflowStep({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
        {index}
      </div>
      <h3 className="mt-4 text-lg font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
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
        <div className="absolute left-[-12%] top-[-12%] h-96 w-96 rounded-full bg-blue-200/70 blur-3xl" />
        <div className="absolute right-[-10%] top-[18%] h-96 w-96 rounded-full bg-red-200/70 blur-3xl" />
        <div className="absolute bottom-[-18%] left-[30%] h-96 w-96 rounded-full bg-cyan-200/50 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
        <nav className="flex flex-col gap-3 rounded-[2rem] border border-white/60 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white shadow-lg">
              TW
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">
                Taiwan Strategy Terminal
              </p>
              <p className="text-xs text-slate-500">
                Backtest · Flow · Screener · Report
              </p>
            </div>
          </a>

          <div className="flex flex-wrap gap-2 text-sm font-bold">
            <a
              href="#backtest-workspace"
              className="rounded-full bg-slate-950 px-4 py-2 text-white"
            >
              回測
            </a>
            <a
              href="/watchlist-lab"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Watchlist
            </a>
            <a
              href="/screener-lab"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Screener
            </a>
            <a
              href="/report-lab"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Report
            </a>
          </div>
        </nav>

        <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl md:p-8">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-blue-500 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-red-500 blur-3xl" />
            <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 blur-3xl" />
          </div>

          <div className="relative z-10 grid gap-8 xl:grid-cols-[1.02fr_0.98fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-200 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                TAIWAN STOCK BACKTEST TERMINAL
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
                台股策略決策平台
                <span className="block text-red-300">
                  回測、籌碼、選股、報告一次完成
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                從單股策略回測、多策略比較、法人籌碼實驗室、Watchlist
                進場提醒、盤後選股器到專業回測報告，整合成一個更接近付費股票網站的研究工作台。
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#backtest-workspace"
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  開始回測
                </a>

                <a
                  href="/screener-lab"
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  盤後選股器
                </a>

                <a
                  href="/report-lab"
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  專業報告
                </a>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs text-slate-300">Active Symbol</p>
                  <p className="mt-2 text-2xl font-black">
                    {result.symbol || "2330"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {getResultName(result)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs text-slate-300">Capital</p>
                  <p className="mt-2 text-2xl font-black">
                    {formatCompactCurrency(parseMoney(capital))}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Position {positionSize}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs text-slate-300">Watchlist</p>
                  <p className="mt-2 text-2xl font-black">
                    {countSymbols(watchlistSymbols)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Symbols monitored
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs text-slate-300">Strategy</p>
                  <p className="mt-2 line-clamp-2 text-lg font-black">
                    {strategy}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Active template
                  </p>
                </div>
              </div>
            </div>

            <HeroVisualPanel result={result} />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <LabPortalCard
            title="Watchlist 進場提醒"
            description="設定理想買點、停損、停利，自動判斷是否接近買點。"
            href="/watchlist-lab"
            icon="🔔"
            eyebrow="ALERT CENTER"
          />
          <LabPortalCard
            title="盤後選股器"
            description="掃描 MA20、突破、RSI、法人籌碼，找出候選股。"
            href="/screener-lab"
            icon="🧭"
            eyebrow="SCREENER"
          />
          <LabPortalCard
            title="專業回測報告"
            description="年度績效、月報酬熱力圖、回撤、最佳與最差交易。"
            href="/report-lab"
            icon="📊"
            eyebrow="REPORT"
          />
          <LabPortalCard
            title="法人籌碼實驗室"
            description="查看外資、投信、自營商買賣超與籌碼分數。"
            href="/flow-lab"
            icon="🏦"
            eyebrow="FLOW LAB"
          />
          <LabPortalCard
            title="PRO 風險實驗室"
            description="Monte Carlo、Kelly、韌性測試與最差情境分析。"
            href="/pro-lab"
            icon="🧪"
            eyebrow="PRO LAB"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
            <p className="text-sm font-black text-blue-600">RESEARCH FLOW</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              從篩選到進場的完整流程
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              首頁現在不是只放回測表單，而是變成完整研究入口：先選股，再看籌碼，再放進 Watchlist，最後輸出報告。
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <WorkflowStep
                index="01"
                title="盤後掃描"
                description="用 Screener 找出站上月線、突破、RSI 轉強或法人偏多的候選股。"
              />
              <WorkflowStep
                index="02"
                title="法人確認"
                description="用 Flow Lab 檢查外資、投信、自營商方向，避免只看技術面。"
              />
              <WorkflowStep
                index="03"
                title="回測驗證"
                description="用首頁回測工作區比較策略、參數與風險報酬。"
              />
              <WorkflowStep
                index="04"
                title="提醒與報告"
                description="把標的加進 Watchlist，最後用 Report Lab 產出專業報告。"
              />
            </div>
          </div>

          <MarketMosaicIllustration />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FeatureCard
            title="單股策略回測"
            description="輸入股票代號與策略條件，快速查看績效、回撤、勝率與交易紀錄。"
            badge="BACKTEST"
            icon="📈"
            accent="blue"
          />
          <FeatureCard
            title="觀察清單掃描"
            description="一次掃描多檔台股或 ETF，快速找出較有機會的標的。"
            badge="SCANNER"
            icon="🔎"
            accent="cyan"
          />
          <FeatureCard
            title="參數最佳化"
            description="比較不同策略參數，檢查是否有更好的風險報酬組合。"
            badge="OPTIMIZER"
            icon="⚙️"
            accent="amber"
          />
          <FeatureCard
            title="法人籌碼策略"
            description="把外資、投信買賣超加入策略判斷，建立籌碼與技術共振。"
            badge="FLOW"
            href="/flow-lab"
            icon="🏦"
            accent="red"
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
          className="rounded-[2rem] border border-slate-200 bg-white/85 p-3 shadow-xl backdrop-blur md:p-4"
        >
          <div className="mb-4 px-2 pt-2 md:px-3 md:pt-3">
            <p className="text-sm font-bold text-blue-600">
              BACKTEST WORKSPACE
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              策略操作工作區
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              這裡保留你原本所有主要功能，外層改成更像專業股市研究平台的儀表板。
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

        <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white/85 p-3 shadow-xl backdrop-blur md:p-4">
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