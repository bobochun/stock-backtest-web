"use client";

import type { BacktestResult, ScanError } from "../types";
import { downloadCsv } from "../lib/exportCsv";

type WatchlistScannerProps = {
  results: BacktestResult[];
  errors: ScanError[];
};

export default function WatchlistScanner({
  results,
  errors,
}: WatchlistScannerProps) {
  if (results.length === 0 && errors.length === 0) {
    return null;
  }

  function handleDownloadScan() {
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

    downloadCsv("watchlist-scan.csv", rows);
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">觀察清單掃描</h2>
          <p className="mt-1 text-sm text-slate-500">
            針對多檔股票批次回測同一策略，並依訊號與年化報酬排序。
          </p>
        </div>

        <button
          onClick={handleDownloadScan}
          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
        >
          下載掃描結果 CSV
        </button>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[1250px] border-separate border-spacing-y-3">
          <thead>
            <tr className="text-left text-sm text-slate-500">
              <th className="px-4">排名</th>
              <th className="px-4">股票</th>
              <th className="px-4">名稱</th>
              <th className="px-4">市場</th>
              <th className="px-4">實際代號</th>
              <th className="px-4">年化報酬</th>
              <th className="px-4">最大回撤</th>
              <th className="px-4">勝率</th>
              <th className="px-4">交易</th>
              <th className="px-4">收盤</th>
              <th className="px-4">MA20 / MA60</th>
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

                <td className="px-4 py-4 text-slate-700">
                  {item.tickerUsed || "-"}
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

                <td className="px-4 py-4 font-bold text-red-600">
                  {item.maxDrawdown}%
                </td>

                <td className="px-4 py-4 text-slate-700">
                  {item.winRate}%
                </td>

                <td className="px-4 py-4 text-slate-700">{item.trades}</td>

                <td className="px-4 py-4 text-slate-700">
                  {item.lastClose || "-"}
                </td>

                <td className="px-4 py-4 text-slate-700">
                  {item.ma20 !== undefined &&
                  item.ma20 !== null &&
                  item.ma60 !== undefined &&
                  item.ma60 !== null
                    ? `${item.ma20} / ${item.ma60}`
                    : "-"}
                </td>

                <td className="rounded-r-2xl px-4 py-4 font-medium text-blue-700">
                  {item.currentSignal || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {errors.length > 0 && (
        <div className="mt-5 rounded-2xl bg-red-50 p-4">
          <p className="font-medium text-red-700">部分股票抓取失敗</p>

          <div className="mt-2 space-y-1 text-sm text-red-700">
            {errors.map((error) => (
              <p key={error.symbol}>
                {error.symbol}
                {error.stockName ? `｜${error.stockName}` : ""}
                {error.market ? `｜${error.market}` : ""}: {error.message}
              </p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}