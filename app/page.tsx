"use client";

import { useState } from "react";

import BacktestForm from "./components/BacktestForm";
import EquityCurveChart from "./components/EquityCurveChart";
import MetricCard from "./components/MetricCard";
import RecentResults from "./components/RecentResults";
import ResultSummary from "./components/ResultSummary";
import TradeTable from "./components/TradeTable";

import type { BacktestResult, EquityPoint, TradeRecord } from "./types";

import {
  generateEquityCurve,
  generateTradeRecords,
} from "./lib/fakeBacktest";

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
    entryDate: "2025-01-10",
    exitDate: "2025-02-14",
    entryPrice: 620,
    exitPrice: 665,
    shares: 1000,
    pnl: 45000,
    pnlPct: 7.3,
    result: "獲利",
  },
  {
    id: 2,
    symbol: "2330",
    entryDate: "2025-03-05",
    exitDate: "2025-03-28",
    entryPrice: 680,
    exitPrice: 654,
    shares: 1000,
    pnl: -26000,
    pnlPct: -3.8,
    result: "虧損",
  },
  {
    id: 3,
    symbol: "2330",
    entryDate: "2025-05-08",
    exitDate: "2025-06-20",
    entryPrice: 640,
    exitPrice: 712,
    shares: 1000,
    pnl: 72000,
    pnlPct: 11.3,
    result: "獲利",
  },
];

export default function Home() {
  const [symbol, setSymbol] = useState("");
  const [strategy, setStrategy] = useState("MA20 / MA60 黃金交叉");
  const [capital, setCapital] = useState("1000000");
  const [positionSize, setPositionSize] = useState("20%");

  const [result, setResult] = useState<BacktestResult>({
    symbol: "2330",
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
      strategy: "MA20 / MA60 黃金交叉",
      annualReturn: 22.4,
      maxDrawdown: -12.8,
      winRate: 62.1,
      trades: 42,
    },
    {
      symbol: "2454",
      strategy: "突破 60 日新高",
      annualReturn: 16.8,
      maxDrawdown: -15.4,
      winRate: 58.3,
      trades: 36,
    },
    {
      symbol: "2382",
      strategy: "回測月線反彈",
      annualReturn: 19.1,
      maxDrawdown: -11.6,
      winRate: 64.2,
      trades: 31,
    },
  ]);

  function runBacktest() {
    if (!symbol.trim()) {
      alert("請先輸入股票代號，例如 2330");
      return;
    }

    const cleanCapital = Number(capital.replaceAll(",", ""));

    if (!cleanCapital || cleanCapital <= 0) {
      alert("請輸入正確的初始資金，例如 1000000");
      return;
    }

    const fakeAnnualReturn = Number((Math.random() * 25 + 5).toFixed(1));
    const fakeMaxDrawdown = Number(-(Math.random() * 20 + 5).toFixed(1));
    const fakeWinRate = Number((Math.random() * 25 + 45).toFixed(1));
    const fakeTrades = Math.floor(Math.random() * 60 + 10);

    const newResult: BacktestResult = {
      symbol: symbol.trim(),
      strategy,
      annualReturn: fakeAnnualReturn,
      maxDrawdown: fakeMaxDrawdown,
      winRate: fakeWinRate,
      trades: fakeTrades,
    };

    const newCurve = generateEquityCurve(cleanCapital, fakeAnnualReturn);
    const newTrades = generateTradeRecords(symbol.trim(), cleanCapital);

    setResult(newResult);
    setEquityCurve(newCurve);
    setTradeRecords(newTrades);
    setRecentResults([newResult, ...recentResults]);
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
            輸入股票代號、選擇交易策略，系統會幫你回測歷史績效，
            包含年化報酬、最大回撤、勝率、交易紀錄與資金曲線。
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={runBacktest}
              className="rounded-2xl bg-slate-900 px-6 py-3 font-medium text-white"
            >
              開始回測
            </button>

            <button className="rounded-2xl border border-slate-300 px-6 py-3 font-medium text-slate-700">
              查看策略庫
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard label="年化報酬" value={`${result.annualReturn}%`} />
          <MetricCard label="最大回撤" value={`${result.maxDrawdown}%`} danger />
          <MetricCard label="勝率" value={`${result.winRate}%`} />
          <MetricCard label="交易次數" value={result.trades} />
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <BacktestForm
            symbol={symbol}
            strategy={strategy}
            capital={capital}
            positionSize={positionSize}
            setSymbol={setSymbol}
            setStrategy={setStrategy}
            setCapital={setCapital}
            setPositionSize={setPositionSize}
            runBacktest={runBacktest}
          />

          <ResultSummary result={result} />
        </section>

        <EquityCurveChart equityCurve={equityCurve} />

        <TradeTable tradeRecords={tradeRecords} />

        <RecentResults recentResults={recentResults} />

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">網站開發進度</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-green-50 p-4">
              <p className="font-medium text-green-700">第 1 階段</p>
              <p className="mt-1 text-sm text-green-700">前端 Dashboard</p>
            </div>

            <div className="rounded-2xl bg-green-50 p-4">
              <p className="font-medium text-green-700">第 2 階段</p>
              <p className="mt-1 text-sm text-green-700">假資料回測互動</p>
            </div>

            <div className="rounded-2xl bg-green-50 p-4">
              <p className="font-medium text-green-700">第 3 階段</p>
              <p className="mt-1 text-sm text-green-700">資金曲線圖</p>
            </div>

            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="font-medium text-blue-700">第 4 階段</p>
              <p className="mt-1 text-sm text-blue-700">元件拆分完成</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}