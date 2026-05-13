"use client";

import type { BacktestResult } from "../types";
import { downloadCsv } from "../lib/exportCsv";

type StrategyComparisonProps = {
  results: BacktestResult[];
};

export default function StrategyComparison({
  results,
}: StrategyComparisonProps) {
  if (results.length === 0) {
    return null;
  }

  function handleDownloadComparison() {
    const rows = results.map((item, index) => ({
      排名: index + 1,
      股票代號: item.symbol,
      股票名稱: item.stockName || "",
      市場別: item.market || "",
      實際資料代號: item.tickerUsed || "",
      策略: item.strategy,
      年化報酬百分比: item.annualReturn,
      最大回撤百分比: item.maxDrawdown,
      勝率百分比: item.winRate,
      交易次數: item.trades,
      最新收盤價: item.lastClose || "",
      MA20: item.ma20 || "",
      MA60: item.ma60 || "",
      目前訊號: item.currentSignal || "",
      資料來源: item.dataSource || "",
      資料開始日: item.dataStartDate || "",
      資料結束日: item.dataEndDate || "",
    }));

    downloadCsv("strategy-comparison.csv", rows);
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">策略比較</h2>
          <p className="mt-1 text-sm text-slate-500">
            同一支股票、同一日期區間下，比較不同策略的績效表現。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            依年化報酬排序
          </div>

          <button
            onClick={handleDownloadComparison}
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
          >
            下載策略比較 CSV
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[1150px] border-separate border-spacing-y-3">
          <thead>
            <tr className="text-left text-sm text-slate-500">
              <th className="px-4">排名</th>
              <th className="px-4">股票</th>
              <th className="px-4">名稱</th>
              <th className="px-4">市場</th>
              <th className="px-4">策略</th>
              <th className="px-4">年化報酬</th>
              <th className="px-4">最大回撤</th>
              <th className="px-4">勝率</th>
              <th className="px-4">交易次數</th>
              <th className="px-4">目前訊號</th>
            </tr>
          </thead>

          <tbody>
            {results.map((item, index) => (
              <tr
                key={`${item.symbol}-${item.strategy}`}
                className="rounded-2xl bg-slate-50 text-sm"
              >
                <td className="rounded-l-2xl px-4 py-4 font-bold text-slate-900">
                  #{index + 1}
                </td>

                <td className="px-4 py-4 font-medium text-slate-900">
                  {item.symbol}
                </td>

                <td className="px-4 py-4 text-slate-700">
                  {item.stockName || "-"}
                </td>

                <td className="px-4 py-4 text-slate-700">
                  {item.market || "-"}
                </td>

                <td className="px-4 py-4">
                  <div className="font-medium text-slate-900">
                    {item.strategy}
                  </div>

                  {index === 0 && (
                    <span className="mt-2 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                      目前最佳
                    </span>
                  )}
                </td>

                <td
                  className={
                    (item.annualReturn ?? 0) >= 0
                      ? "px-4 py-4 font-bold text-green-600"
                      : "px-4 py-4 font-bold text-red-600"
                  }
                >
                  {item.annualReturn ?? 0}%
                </td>

                <td className="px-4 py-4 font-bold text-red-600">
                  {item.maxDrawdown ?? 0}%
                </td>

                <td className="px-4 py-4 text-slate-700">
                  {item.winRate ?? 0}%
                </td>

                <td className="px-4 py-4 text-slate-700">{Array.isArray(item.trades) ? item.trades.length : item.trades ?? 0}</td>

                <td className="rounded-r-2xl px-4 py-4 font-medium text-blue-700">
                  {item.currentSignal || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}