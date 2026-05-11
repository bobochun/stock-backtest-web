import type { BacktestResult } from "../types";

type ResultSummaryProps = {
  result: BacktestResult;
};

export default function ResultSummary({ result }: ResultSummaryProps) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">本次回測結果</h2>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm text-slate-500">股票代號</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">
          {result.symbol}
        </p>

        <p className="mt-4 text-sm text-slate-500">策略</p>
        <p className="mt-1 font-medium text-slate-900">{result.strategy}</p>

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
  );
}