"use client";

import { useState } from "react";

import AdvancedMetrics from "./components/AdvancedMetrics";
import BacktestForm from "./components/BacktestForm";
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
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-blue-600">
            Taiwan Stock Backtest
          </p>

          <h1 className="mt-3 text-4xl font-bold text-slate-900">
            台股策略回測網站
          </h1>

          <p className="mt-4 max-w-2xl text-slate-600">
            支援單一股票回測、多策略比較、觀察清單掃描、參數最佳化、ETF 快速清單、台股商品搜尋與 CSV 匯出。
          </p>
        </section>

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

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard label="年化報酬" value={`${result.annualReturn}%`} />

          <MetricCard
            label="最大回撤"
            value={`${result.maxDrawdown}%`}
            danger
          />

          <MetricCard label="勝率" value={`${result.winRate}%`} />

          <MetricCard label="交易次數" value={result.trades} />
        </section>

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

        <EquityCurveChart equityCurve={equityCurve} />

        <AdvancedMetrics result={result} />

        <TradeTable tradeRecords={tradeRecords} />

        <StrategyComparison results={compareResults} />

        <WatchlistSummary results={scanResults} />

        <WatchlistScanner results={scanResults} errors={scanErrors} />

        <ParameterOptimizer results={optimizationResults} />

        <RecentResults recentResults={recentResults} />
      </div>
    </main>
  );
}