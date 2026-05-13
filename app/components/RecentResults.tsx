import type { BacktestResult } from "../types";

type RecentResultsProps = {
  recentResults: BacktestResult[];
};

export default function RecentResults({ recentResults }: RecentResultsProps) {
  return (
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
                <p className="font-medium text-slate-900">{item.symbol}</p>
                <p className="mt-1 text-sm text-slate-500">{item.strategy}</p>
              </div>

              <div className="text-right">
                <p className="font-bold text-slate-900">
                  報酬 +{item.annualReturn ?? 0}%
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  MDD {item.maxDrawdown ?? 0}%｜勝率 {item.winRate ?? 0}%
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}