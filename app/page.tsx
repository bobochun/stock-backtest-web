"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type BacktestResult = {
  symbol: string;
  strategy: string;
  annualReturn: number;
  maxDrawdown: number;
  winRate: number;
  trades: number;
};

type EquityPoint = {
  period: string;
  strategy: number;
  benchmark: number;
};

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

function formatMoney(value: number) {
  return `NT$ ${Math.round(value).toLocaleString("zh-TW")}`;
}

function generateEquityCurve(initialCapital: number, annualReturn: number) {
  const curve: EquityPoint[] = [];

  let strategyEquity = initialCapital;
  let benchmarkEquity = initialCapital;

  const monthlyStrategyReturn = annualReturn / 100 / 12;
  const monthlyBenchmarkReturn = 0.08 / 12;

  for (let month = 1; month <= 12; month++) {
    const strategyNoise = Math.random() * 0.08 - 0.03;
    const benchmarkNoise = Math.random() * 0.04 - 0.015;

    strategyEquity =
      strategyEquity * (1 + monthlyStrategyReturn + strategyNoise);

    benchmarkEquity =
      benchmarkEquity * (1 + monthlyBenchmarkReturn + benchmarkNoise);

    curve.push({
      period: `第 ${month} 月`,
      strategy: Math.round(strategyEquity),
      benchmark: Math.round(benchmarkEquity),
    });
  }

  return curve;
}

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

    setResult(newResult);
    setEquityCurve(newCurve);
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
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">年化報酬</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {result.annualReturn}%
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">最大回撤</p>
            <p className="mt-2 text-2xl font-bold text-red-600">
              {result.maxDrawdown}%
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">勝率</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {result.winRate}%
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">交易次數</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {result.trades}
            </p>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">回測設定</h2>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm text-slate-600">股票代號</label>
                <input
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                  placeholder="例如：2330"
                />
              </div>

              <div>
                <label className="text-sm text-slate-600">策略</label>
                <select
                  value={strategy}
                  onChange={(event) => setStrategy(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option>MA20 / MA60 黃金交叉</option>
                  <option>回測月線反彈</option>
                  <option>突破 60 日新高</option>
                  <option>投信連買 + 站上月線</option>
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-slate-600">初始資金</label>
                  <input
                    value={capital}
                    onChange={(event) => setCapital(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                    placeholder="1000000"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-600">
                    單筆持倉上限
                  </label>
                  <input
                    value={positionSize}
                    onChange={(event) => setPositionSize(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                    placeholder="20%"
                  />
                </div>
              </div>

              <button
                onClick={runBacktest}
                className="w-full rounded-2xl bg-blue-600 px-6 py-3 font-medium text-white"
              >
                執行回測
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">本次回測結果</h2>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">股票代號</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {result.symbol}
              </p>

              <p className="mt-4 text-sm text-slate-500">策略</p>
              <p className="mt-1 font-medium text-slate-900">
                {result.strategy}
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-white p-4">
                  <p className="text-sm text-slate-500">年化報酬</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {result.annualReturn}%
                  </p>
                </div>

                <div className="rounded-xl bg-white p-4">
                  <p className="text-sm text-slate-500">最大回撤</p>
                  <p className="mt-1 text-xl font-bold text-red-600">
                    {result.maxDrawdown}%
                  </p>
                </div>

                <div className="rounded-xl bg-white p-4">
                  <p className="text-sm text-slate-500">勝率</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {result.winRate}%
                  </p>
                </div>

                <div className="rounded-xl bg-white p-4">
                  <p className="text-sm text-slate-500">交易次數</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {result.trades}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                策略資金曲線
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                比較策略績效與大盤基準走勢，目前使用模擬資料。
              </p>
            </div>

            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              期末資金：
              <span className="font-bold text-slate-900">
                {formatMoney(equityCurve[equityCurve.length - 1].strategy)}
              </span>
            </div>
          </div>

          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={equityCurve}
                margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={(value) => `${Math.round(value / 10000)}萬`} />
                <Tooltip
                  formatter={(value) => formatMoney(Number(value))}
                  labelFormatter={(label) => `期間：${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="strategy"
                  name="策略資金"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  name="大盤基準"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">最近回測結果</h2>

          <div className="mt-5 space-y-3">
            {recentResults.map((item, index) => (
              <div
                key={`${item.symbol}-${index}`}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {item.symbol}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.strategy}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      報酬 +{item.annualReturn}%
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      MDD {item.maxDrawdown}%｜勝率 {item.winRate}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

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

            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="font-medium text-blue-700">第 3 階段</p>
              <p className="mt-1 text-sm text-blue-700">資金曲線圖</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-medium text-slate-900">第 4 階段</p>
              <p className="mt-1 text-sm text-slate-500">Python 回測 API</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}