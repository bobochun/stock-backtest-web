"use client";

import type { BacktestResult } from "../types";
import { downloadCsv } from "../lib/exportCsv";

type ParameterOptimizerProps = {
  results: BacktestResult[];
};

export default function ParameterOptimizer({
  results,
}: ParameterOptimizerProps) {
  if (results.length === 0) {
    return null;
  }

  function handleDownloadOptimization() {
    const rows = results.map((item, index) => ({
      排名: index + 1,
      股票代號: item.symbol,
      股票名稱: item.stockName || "",
      市場別: item.market || "",
      商品類型: item.securityType || "",
      策略: item.strategy,
      最佳化分數: item.optimizeScore ?? "",
      機會分數: item.opportunityScore ?? "",
      年化報酬百分比: item.annualReturn,
      總報酬百分比: item.totalReturn ?? "",
      買進持有報酬百分比: item.benchmarkReturn ?? "",
      超額報酬百分比: item.alphaReturn ?? "",
      最大回撤百分比: item.maxDrawdown,
      勝率百分比: item.winRate,
      ProfitFactor: item.profitFactor ?? "",
      交易次數: item.trades,
      風險等級: item.riskLevel || "",
      快線MA: item.fastMaWindow ?? "",
      慢線MA: item.slowMaWindow ?? "",
      突破天期: item.breakoutWindow ?? "",
      停損百分比: item.stopLossPct ?? "",
      停利百分比: item.takeProfitPct ?? "",
      持倉比例百分比: item.positionSizePct ?? "",
      目前訊號: item.currentSignal || "",
      實際資料代號: item.tickerUsed || "",
      資料開始日: item.dataStartDate || "",
      資料結束日: item.dataEndDate || "",
    }));

    downloadCsv("parameter-optimization.csv", rows);
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">參數最佳化</h2>
          <p className="mt-1 text-sm text-slate-500">
            自動比較不同停損、停利、持倉比例、均線參數與突破天期，列出前 20 組。
          </p>
        </div>

        <button
          onClick={handleDownloadOptimization}
          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
        >
          下載參數最佳化 CSV
        </button>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[1450px] border-separate border-spacing-y-3">
          <thead>
            <tr className="text-left text-sm text-slate-500">
              <th className="px-4">排名</th>
              <th className="px-4">最佳化分數</th>
              <th className="px-4">機會分數</th>
              <th className="px-4">年化報酬</th>
              <th className="px-4">總報酬</th>
              <th className="px-4">超額報酬</th>
              <th className="px-4">最大回撤</th>
              <th className="px-4">勝率</th>
              <th className="px-4">PF</th>
              <th className="px-4">交易</th>
              <th className="px-4">快線/慢線</th>
              <th className="px-4">突破天期</th>
              <th className="px-4">停損/停利</th>
              <th className="px-4">持倉</th>
              <th className="px-4">風險</th>
              <th className="px-4">訊號</th>
            </tr>
          </thead>

          <tbody>
            {results.map((item, index) => (
              <tr
                key={`${item.symbol}-${item.strategy}-${index}`}
                className="rounded-2xl bg-slate-50 text-sm"
              >
                <td className="rounded-l-2xl px-4 py-4 font-bold text-slate-900">
                  #{index + 1}
                </td>

                <td className="px-4 py-4 font-bold text-purple-700">
                  {item.optimizeScore ?? "-"}
                </td>

                <td className="px-4 py-4 font-bold text-blue-700">
                  {item.opportunityScore ?? "-"}
                </td>

                <td
                  className={
                    item.annualReturn >= 0
                      ? "px-4 py-4 font-bold text-green-600"
                      : "px-4 py-4 font-bold text-red-600"
                  }
                >
                  {item.annualReturn}%
                </td>

                <td
                  className={
                    (item.totalReturn ?? 0) >= 0
                      ? "px-4 py-4 font-bold text-green-600"
                      : "px-4 py-4 font-bold text-red-600"
                  }
                >
                  {item.totalReturn ?? "-"}%
                </td>

                <td
                  className={
                    (item.alphaReturn ?? 0) >= 0
                      ? "px-4 py-4 font-bold text-green-600"
                      : "px-4 py-4 font-bold text-red-600"
                  }
                >
                  {item.alphaReturn ?? "-"}%
                </td>

                <td className="px-4 py-4 font-bold text-red-600">
                  {item.maxDrawdown}%
                </td>

                <td className="px-4 py-4 text-slate-700">
                  {item.winRate}%
                </td>

                <td className="px-4 py-4 text-slate-700">
                  {item.profitFactor ?? "-"}
                </td>

                <td className="px-4 py-4 text-slate-700">{item.trades}</td>

                <td className="px-4 py-4 text-slate-700">
                  {item.fastMaWindow ?? "-"} / {item.slowMaWindow ?? "-"}
                </td>

                <td className="px-4 py-4 text-slate-700">
                  {item.breakoutWindow ?? "-"}
                </td>

                <td className="px-4 py-4 text-slate-700">
                  {item.stopLossPct ?? "-"}% / {item.takeProfitPct ?? "-"}%
                </td>

                <td className="px-4 py-4 text-slate-700">
                  {item.positionSizePct ?? "-"}%
                </td>

                <td
                  className={
                    item.riskLevel === "高風險"
                      ? "px-4 py-4 font-bold text-red-600"
                      : item.riskLevel === "中風險"
                        ? "px-4 py-4 font-bold text-amber-600"
                        : "px-4 py-4 font-bold text-green-600"
                  }
                >
                  {item.riskLevel || "-"}
                </td>

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