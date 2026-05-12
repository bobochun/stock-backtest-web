"use client";

import { useMemo, useState } from "react";

type DcaResult = {
  totalInvested: number;
  finalValue: number;
  totalReturn: number;
  totalReturnPct: number;
  shares: number;
  avgCost: number;
  finalPrice: number;
};

export default function DcaBacktestPanel() {
  const [symbol, setSymbol] = useState("0050.TW");
  const [monthlyAmount, setMonthlyAmount] = useState(10000);
  const [months, setMonths] = useState(36);
  const [startPrice, setStartPrice] = useState(100);
  const [annualReturn, setAnnualReturn] = useState(8);

  const result: DcaResult = useMemo(() => {
    const monthlyReturn = Math.pow(1 + annualReturn / 100, 1 / 12) - 1;

    let price = startPrice;
    let shares = 0;
    let totalInvested = 0;

    for (let i = 0; i < months; i++) {
      shares += monthlyAmount / price;
      totalInvested += monthlyAmount;
      price *= 1 + monthlyReturn;
    }

    const finalPrice = price;
    const finalValue = shares * finalPrice;
    const totalReturn = finalValue - totalInvested;
    const totalReturnPct =
      totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
    const avgCost = shares > 0 ? totalInvested / shares : 0;

    return {
      totalInvested,
      finalValue,
      totalReturn,
      totalReturnPct,
      shares,
      avgCost,
      finalPrice,
    };
  }, [monthlyAmount, months, startPrice, annualReturn]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString("zh-TW", {
      style: "currency",
      currency: "TWD",
      maximumFractionDigits: 0,
    });
  };

  const formatNumber = (value: number, digits = 2) => {
    return value.toLocaleString("zh-TW", {
      maximumFractionDigits: digits,
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900">定期定額回測</h2>
        <p className="mt-1 text-sm text-slate-500">
          用簡化模型估算每月投入後的長期累積效果，適合快速比較不同投入金額、期間與報酬率假設。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            股票 / ETF 代號
          </label>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            placeholder="例如 0050.TW"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            每月投入
          </label>
          <input
            type="number"
            value={monthlyAmount}
            onChange={(e) => setMonthlyAmount(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            投資月數
          </label>
          <input
            type="number"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            起始股價
          </label>
          <input
            type="number"
            value={startPrice}
            onChange={(e) => setStartPrice(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            年化報酬率 %
          </label>
          <input
            type="number"
            value={annualReturn}
            onChange={(e) => setAnnualReturn(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ResultCard
          title="累積投入"
          value={formatCurrency(result.totalInvested)}
        />
        <ResultCard
          title="期末市值"
          value={formatCurrency(result.finalValue)}
        />
        <ResultCard
          title="總損益"
          value={formatCurrency(result.totalReturn)}
          positive={result.totalReturn >= 0}
        />
        <ResultCard
          title="總報酬率"
          value={`${formatNumber(result.totalReturnPct)}%`}
          positive={result.totalReturnPct >= 0}
        />
      </div>

      <div className="mt-6 rounded-2xl bg-slate-50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">
          回測摘要
        </h3>

        <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2 lg:grid-cols-4">
          <SummaryItem label="標的" value={symbol || "-"} />
          <SummaryItem label="累積股數" value={formatNumber(result.shares, 4)} />
          <SummaryItem label="平均成本" value={formatCurrency(result.avgCost)} />
          <SummaryItem label="期末估計股價" value={formatCurrency(result.finalPrice)} />
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          注意：這是前端簡化版定期定額模型，尚未串接真實歷史股價。
          真正版本可以改成呼叫 FastAPI 後端，用 yfinance 或資料庫抓歷史月資料，
          再計算每月實際買進股數與真實績效。
        </p>
      </div>
    </section>
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