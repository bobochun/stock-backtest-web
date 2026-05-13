"use client";

import { useMemo, useState } from "react";

type DcaCurvePoint = {
  period: string;
  dca: number;
  invested: number;
};

type DcaRow = {
  symbol: string;
  stockName: string;
  market?: string;
  securityType?: string;
  tickerUsed: string;
  monthlyAmount: number;
  initialAmount: number;
  totalInvested: number;
  finalValue: number;
  totalReturn: number;
  annualReturn: number;
  maxDrawdown: number;
  shares: number;
  cash: number;
  lastClose: number;
  tradeCount: number;
  oneShotFinalValue: number;
  oneShotReturn: number;
  curve: Array<{
    period: string;
    value: number;
    invested: number;
    shares: number;
    cash: number;
    monthEndPrice: number;
  }>;
};

type DcaResponse = {
  summary: {
    symbols: string[];
    monthlyAmount: number;
    initialAmount: number;
    totalInvested: number;
    finalValue: number;
    totalReturn: number;
    annualReturn: number;
    maxDrawdown: number;
    oneShotFinalValue: number;
    oneShotReturn: number;
    dcaVsOneShotDelta: number;
    months: number;
    startDate: string;
    endDate: string;
    dayOfMonth: number;
  };
  rows: DcaRow[];
  equityCurve: DcaCurvePoint[];
  errors: Array<{
    symbol: string;
    message: string;
  }>;
};

export default function DcaBacktestPanel() {
  const [symbols, setSymbols] = useState("0050,006208,00878");
  const [monthlyAmount, setMonthlyAmount] = useState("10000");
  const [initialAmount, setInitialAmount] = useState("0");
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("5");

  const [data, setData] = useState<DcaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bestRow = useMemo(() => {
    if (!data?.rows?.length) return null;
    return [...data.rows].sort((a, b) => b.totalReturn - a.totalReturn)[0];
  }, [data]);

  async function runDcaBacktest() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/dca", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbols,
          monthlyAmount,
          initialAmount,
          startDate,
          endDate,
          dayOfMonth,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || result.detail || "定期定額 API 發生錯誤");
        return;
      }

      setData(result);
    } catch (err) {
      console.error(err);
      setError("無法連線到定期定額 API，請確認 FastAPI 後端與 API_BASE_URL。");
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value?: number) {
    if (value === undefined || value === null || Number.isNaN(value)) {
      return "-";
    }

    return value.toLocaleString("zh-TW", {
      style: "currency",
      currency: "TWD",
      maximumFractionDigits: 0,
    });
  }

  function formatNumber(value?: number, digits = 1) {
    if (value === undefined || value === null || Number.isNaN(value)) {
      return "-";
    }

    return value.toLocaleString("zh-TW", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            定期定額真實歷史回測
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            使用 FastAPI 後端 /dca，透過 yfinance 抓真實歷史價格，依每月指定日期買進並計算實際績效。
          </p>
        </div>

        <button
          onClick={runDcaBacktest}
          disabled={loading}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {loading ? "回測中..." : "執行真實 DCA 回測"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Input label="股票 / ETF 代號" value={symbols} onChange={setSymbols} />
        <Input label="每月投入" value={monthlyAmount} onChange={setMonthlyAmount} type="number" />
        <Input label="初始投入" value={initialAmount} onChange={setInitialAmount} type="number" />
        <Input label="開始日期" value={startDate} onChange={setStartDate} type="date" />
        <Input label="結束日期" value={endDate} onChange={setEndDate} type="date" placeholder="空白代表今天" />
        <Input label="每月幾號買" value={dayOfMonth} onChange={setDayOfMonth} type="number" />
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ResultCard title="累積投入" value={formatCurrency(data.summary.totalInvested)} />
            <ResultCard title="期末市值" value={formatCurrency(data.summary.finalValue)} />
            <ResultCard
              title="定期定額報酬"
              value={`${formatNumber(data.summary.totalReturn, 1)}%`}
              positive={data.summary.totalReturn >= 0}
            />
            <ResultCard
              title="年化報酬"
              value={`${formatNumber(data.summary.annualReturn, 1)}%`}
              positive={data.summary.annualReturn >= 0}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ResultCard
              title="最大回撤"
              value={`${formatNumber(data.summary.maxDrawdown, 1)}%`}
              positive={data.summary.maxDrawdown >= -10}
            />
            <ResultCard
              title="單筆投入比較"
              value={`${formatNumber(data.summary.oneShotReturn, 1)}%`}
              positive={data.summary.oneShotReturn >= 0}
            />
            <ResultCard
              title="DCA vs 單筆差額"
              value={formatCurrency(data.summary.dcaVsOneShotDelta)}
              positive={data.summary.dcaVsOneShotDelta >= 0}
            />
            <ResultCard title="回測月數" value={`${data.summary.months} 個月`} />
          </div>

          {bestRow && (
            <div className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
              <h3 className="text-sm font-bold text-cyan-900">表現最佳標的</h3>
              <p className="mt-2 text-lg font-black text-cyan-950">
                {bestRow.symbol} {bestRow.stockName}
              </p>
              <p className="mt-1 text-sm text-cyan-800">
                總報酬 {formatNumber(bestRow.totalReturn, 1)}%，年化{" "}
                {formatNumber(bestRow.annualReturn, 1)}%，最大回撤{" "}
                {formatNumber(bestRow.maxDrawdown, 1)}%，期末價格{" "}
                {formatCurrency(bestRow.lastClose)}
              </p>
            </div>
          )}

          {data.errors?.length > 0 && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-bold">部分標的資料提醒</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {data.errors.map((item) => (
                  <li key={`${item.symbol}-${item.message}`}>
                    {item.symbol}：{item.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-sm text-slate-500">
                  <th className="px-4">標的</th>
                  <th className="px-4">資料代號</th>
                  <th className="px-4">累積投入</th>
                  <th className="px-4">期末市值</th>
                  <th className="px-4">定期定額</th>
                  <th className="px-4">年化</th>
                  <th className="px-4">最大回撤</th>
                  <th className="px-4">股數</th>
                  <th className="px-4">現金餘額</th>
                  <th className="px-4">期末價格</th>
                  <th className="px-4">買進次數</th>
                </tr>
              </thead>

              <tbody>
                {data.rows.map((item) => (
                  <tr key={item.symbol} className="bg-slate-50 text-sm">
                    <td className="rounded-l-2xl px-4 py-4 font-bold text-slate-900">
                      {item.symbol} {item.stockName}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{item.tickerUsed}</td>
                    <td className="px-4 py-4">{formatCurrency(item.totalInvested)}</td>
                    <td className="px-4 py-4">{formatCurrency(item.finalValue)}</td>
                    <td className={item.totalReturn >= 0 ? "px-4 py-4 font-bold text-red-600" : "px-4 py-4 font-bold text-green-600"}>
                      {formatNumber(item.totalReturn, 1)}%
                    </td>
                    <td className={item.annualReturn >= 0 ? "px-4 py-4 font-bold text-red-600" : "px-4 py-4 font-bold text-green-600"}>
                      {formatNumber(item.annualReturn, 1)}%
                    </td>
                    <td className="px-4 py-4">{formatNumber(item.maxDrawdown, 1)}%</td>
                    <td className="px-4 py-4">{formatNumber(item.shares, 0)}</td>
                    <td className="px-4 py-4">{formatCurrency(item.cash)}</td>
                    <td className="px-4 py-4">{formatCurrency(item.lastClose)}</td>
                    <td className="rounded-r-2xl px-4 py-4">{item.tradeCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              組合資產曲線摘要
            </h3>

            <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2 lg:grid-cols-4">
              <SummaryItem label="資料來源" value="yfinance / Yahoo Finance" />
              <SummaryItem label="開始日期" value={data.summary.startDate} />
              <SummaryItem label="結束日期" value={data.summary.endDate} />
              <SummaryItem label="每月買進日" value={`每月 ${data.summary.dayOfMonth} 號附近`} />
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              若指定買進日不是交易日，後端會選當月第一個大於等於該日期的交易日；
              如果當月沒有後續交易日，則使用當月最後交易日。
            </p>
          </div>
        </>
      )}
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}

function ResultCard({
  title,
  value,
  positive,
}: {
  title: string;
  value: string;
  positive?: boolean;
}) {
  const valueColor =
    positive === undefined
      ? "text-slate-900"
      : positive
        ? "text-red-600"
        : "text-green-600";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className={`mt-2 text-xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{value}</p>
    </div>
  );
}
