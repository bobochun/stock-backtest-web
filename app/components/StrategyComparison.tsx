import type { BacktestResult } from "../types";

type StrategyComparisonProps = {
  results: BacktestResult[];
};

export default function StrategyComparison({
  results,
}: StrategyComparisonProps) {
  if (results.length === 0) {
    return null;
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

        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
          依年化報酬排序
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[800px] border-separate border-spacing-y-3">
          <thead>
            <tr className="text-left text-sm text-slate-500">
              <th className="px-4">排名</th>
              <th className="px-4">策略</th>
              <th className="px-4">年化報酬</th>
              <th className="px-4">最大回撤</th>
              <th className="px-4">勝率</th>
              <th className="px-4">交易次數</th>
            </tr>
          </thead>

          <tbody>
            {results.map((item, index) => (
              <tr
                key={item.strategy}
                className="rounded-2xl bg-slate-50 text-sm"
              >
                <td className="rounded-l-2xl px-4 py-4 font-bold text-slate-900">
                  #{index + 1}
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

                <td className="rounded-r-2xl px-4 py-4 text-slate-700">
                  {item.trades}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}