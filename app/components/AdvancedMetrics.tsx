import type { BacktestResult } from "../types";

type AdvancedMetricsProps = {
  result: BacktestResult;
};

function formatMoney(value?: number) {
  if (value === undefined || value === null) {
    return "尚未回測";
  }

  return `NT$ ${Math.round(value).toLocaleString("zh-TW")}`;
}

function formatPercent(value?: number | null) {
  if (value === undefined || value === null) {
    return "尚未回測";
  }

  return `${value}%`;
}

function formatNumber(value?: number | null) {
  if (value === undefined || value === null) {
    return "尚未回測";
  }

  return String(value);
}

function getScoreText(score?: number) {
  if (score === undefined || score === null) {
    return "尚未評分";
  }

  if (score >= 80) {
    return "高機會";
  }

  if (score >= 60) {
    return "中高機會";
  }

  if (score >= 40) {
    return "普通";
  }

  return "低機會";
}

export default function AdvancedMetrics({ result }: AdvancedMetricsProps) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">進階績效分析</h2>
          <p className="mt-1 text-sm text-slate-500">
            補充總報酬、買進持有比較、Profit Factor、風險等級與目前位置。
          </p>
        </div>

        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
          機會分數：{result.opportunityScore ?? "尚未評分"} / 100｜
          {getScoreText(result.opportunityScore)}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">最終資產</p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {formatMoney(result.finalEquity)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">總報酬率</p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {formatPercent(result.totalReturn)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">買進持有報酬</p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {formatPercent(result.benchmarkReturn)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">策略超額報酬</p>
          <p
            className={
              (result.alphaReturn ?? 0) >= 0
                ? "mt-1 text-lg font-bold text-green-600"
                : "mt-1 text-lg font-bold text-red-600"
            }
          >
            {formatPercent(result.alphaReturn)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Profit Factor</p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {formatNumber(result.profitFactor)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">平均每筆報酬</p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {formatPercent(result.avgTradeReturn)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">最佳單筆</p>
          <p className="mt-1 text-lg font-bold text-green-600">
            {formatPercent(result.bestTradeReturn)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">最差單筆</p>
          <p className="mt-1 text-lg font-bold text-red-600">
            {formatPercent(result.worstTradeReturn)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Payoff Ratio</p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {formatNumber(result.payoffRatio)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">最大連續虧損</p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {result.maxConsecutiveLosses ?? "尚未回測"}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">風險等級</p>
          <p
            className={
              result.riskLevel === "高風險"
                ? "mt-1 text-lg font-bold text-red-600"
                : result.riskLevel === "中風險"
                  ? "mt-1 text-lg font-bold text-amber-600"
                  : "mt-1 text-lg font-bold text-green-600"
            }
          >
            {result.riskLevel || "尚未回測"}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">區間高點</p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {formatNumber(result.high60)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-blue-50 p-4">
          <p className="text-sm text-blue-700">距離快線 MA</p>
          <p className="mt-1 text-lg font-bold text-blue-700">
            {formatPercent(result.distanceToMa20Pct)}
          </p>
        </div>

        <div className="rounded-2xl bg-blue-50 p-4">
          <p className="text-sm text-blue-700">距離慢線 MA</p>
          <p className="mt-1 text-lg font-bold text-blue-700">
            {formatPercent(result.distanceToMa60Pct)}
          </p>
        </div>

        <div className="rounded-2xl bg-blue-50 p-4">
          <p className="text-sm text-blue-700">距離區間高點</p>
          <p className="mt-1 text-lg font-bold text-blue-700">
            {formatPercent(result.distanceToHigh60Pct)}
          </p>
        </div>
      </div>
    </section>
  );
}