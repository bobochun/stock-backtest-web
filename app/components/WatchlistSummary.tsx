import type { BacktestResult } from "../types";

type WatchlistSummaryProps = {
  results: BacktestResult[];
};

function SecurityMiniList({
  title,
  items,
  valueLabel,
  getValue,
}: {
  title: string;
  items: BacktestResult[];
  valueLabel: string;
  getValue: (item: BacktestResult) => string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <h3 className="font-bold text-slate-900">{title}</h3>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">目前沒有符合條件的股票</p>
        ) : (
          items.map((item) => (
            <div
              key={`${title}-${item.symbol}-${item.strategy}`}
              className="rounded-2xl bg-slate-50 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">
                    {item.symbol}｜{item.stockName || "-"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {item.securityType || item.market || "-"}｜
                    {item.currentSignal || "-"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-500">{valueLabel}</p>
                  <p className="font-bold text-blue-700">{getValue(item)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function WatchlistSummary({ results }: WatchlistSummaryProps) {
  if (results.length === 0) {
    return null;
  }

  const topAnnualReturn = [...results]
    .sort((a, b) => (b.annualReturn ?? 0) - (a.annualReturn ?? 0))
    .slice(0, 5);

  const smallestDrawdown = [...results]
    .sort((a, b) => (b.maxDrawdown ?? 0) - (a.maxDrawdown ?? 0))
    .slice(0, 5);

  const breakoutCandidates = results
    .filter((item) =>
      ["接近突破", "已突破區間新高"].includes(item.currentSignal || "")
    )
    .slice(0, 5);

  const aboveMonthlyLine = results
    .filter((item) =>
      ["站上月線", "均線偏多", "接近月線反彈區"].includes(
        item.currentSignal || ""
      )
    )
    .slice(0, 5);

  const topWinRate = [...results]
    .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))
    .slice(0, 5);

  return (
    <section>
      <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
        <h2 className="text-xl font-bold">觀察清單摘要</h2>

        <p className="mt-2 text-sm text-slate-300">
          根據掃描結果自動整理年化報酬、最大回撤、突破候選、月線訊號與勝率。
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SecurityMiniList
          title="年化報酬前 5 名"
          items={topAnnualReturn}
          valueLabel="年化"
          getValue={(item) => `${item.annualReturn}%`}
        />

        <SecurityMiniList
          title="最大回撤較小前 5 名"
          items={smallestDrawdown}
          valueLabel="回撤"
          getValue={(item) => `${item.maxDrawdown}%`}
        />

        <SecurityMiniList
          title="目前接近突破"
          items={breakoutCandidates}
          valueLabel="收盤"
          getValue={(item) => `${item.lastClose ?? "-"}`}
        />

        <SecurityMiniList
          title="站上月線 / 月線附近"
          items={aboveMonthlyLine}
          valueLabel="MA"
          getValue={(item) =>
            item.ma20 !== undefined && item.ma20 !== null
              ? `${item.ma20}`
              : "-"
          }
        />

        <SecurityMiniList
          title="策略勝率前 5 名"
          items={topWinRate}
          valueLabel="勝率"
          getValue={(item) => `${item.winRate}%`}
        />
      </div>
    </section>
  );
}