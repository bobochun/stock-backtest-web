"use client";

import type { TradeRecord } from "../types";
import { downloadCsv } from "../lib/exportCsv";

type TradeTableProps = {
  tradeRecords: TradeRecord[];
};

function formatMoney(value: number) {
  return `NT$ ${Math.round(value).toLocaleString("zh-TW")}`;
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("zh-TW");
}

export default function TradeTable({ tradeRecords }: TradeTableProps) {
  const totalPnl = tradeRecords.reduce((sum, trade) => sum + trade.pnl, 0);

  function handleDownloadTrades() {
    const rows = tradeRecords.map((trade) => ({
      股票代號: trade.symbol,
      股票名稱: trade.stockName || "",
      買進日: trade.entryDate,
      賣出日: trade.exitDate,
      買進價: trade.entryPrice,
      賣出價: trade.exitPrice,
      股數: trade.shares,
      損益: trade.pnl,
      報酬率百分比: trade.pnlPct,
      結果: trade.result,
    }));

    downloadCsv("trade-records.csv", rows);
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">交易紀錄表</h2>
          <p className="mt-1 text-sm text-slate-500">
            每次回測會依照策略訊號產生買賣紀錄，包含進出場與損益。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
            總損益：
            <span
              className={
                totalPnl >= 0
                  ? "font-bold text-green-600"
                  : "font-bold text-red-600"
              }
            >
              {formatMoney(totalPnl)}
            </span>
          </div>

          <button
            onClick={handleDownloadTrades}
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
          >
            下載交易紀錄 CSV
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[1000px] border-separate border-spacing-y-3">
          <thead>
            <tr className="text-left text-sm text-slate-500">
              <th className="px-4">股票</th>
              <th className="px-4">名稱</th>
              <th className="px-4">買進日</th>
              <th className="px-4">賣出日</th>
              <th className="px-4">買進價</th>
              <th className="px-4">賣出價</th>
              <th className="px-4">股數</th>
              <th className="px-4">損益</th>
              <th className="px-4">報酬率</th>
              <th className="px-4">結果</th>
            </tr>
          </thead>

          <tbody>
            {tradeRecords.map((trade) => (
              <tr key={trade.id} className="rounded-2xl bg-slate-50 text-sm">
                <td className="rounded-l-2xl px-4 py-4 font-medium text-slate-900">
                  {trade.symbol}
                </td>

                <td className="px-4 py-4 text-slate-700">
                  {trade.stockName || "-"}
                </td>

                <td className="px-4 py-4 text-slate-700">
                  {trade.entryDate}
                </td>

                <td className="px-4 py-4 text-slate-700">{trade.exitDate}</td>

                <td className="px-4 py-4 text-slate-700">
                  {trade.entryPrice}
                </td>

                <td className="px-4 py-4 text-slate-700">{trade.exitPrice}</td>

                <td className="px-4 py-4 text-slate-700">
                  {formatNumber(trade.shares)}
                </td>

                <td
                  className={
                    trade.pnl >= 0
                      ? "px-4 py-4 font-bold text-green-600"
                      : "px-4 py-4 font-bold text-red-600"
                  }
                >
                  {formatMoney(trade.pnl)}
                </td>

                <td
                  className={
                    trade.pnlPct >= 0
                      ? "px-4 py-4 font-bold text-green-600"
                      : "px-4 py-4 font-bold text-red-600"
                  }
                >
                  {trade.pnlPct}%
                </td>

                <td className="rounded-r-2xl px-4 py-4">
                  <span
                    className={
                      trade.result === "獲利"
                        ? "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
                        : "rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700"
                    }
                  >
                    {trade.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}