"use client";

type EtfQuickPanelProps = {
  setSymbol: (value: string) => void;
  setWatchlistSymbols: (value: string) => void;
  scanWatchlist: () => void;
};

const ETF_GROUPS = [
  {
    title: "市值型 ETF",
    description: "核心配置、長期持有、和高股息 ETF 做比較。",
    symbols: ["0050", "006208", "00692", "00922"],
  },
  {
    title: "高股息 ETF",
    description: "適合比較回撤、勝率、月線策略與配息型標的。",
    symbols: ["0056", "00878", "00919", "00929", "00940"],
  },
  {
    title: "半導體 / 科技 ETF",
    description: "適合觀察景氣循環、突破策略與趨勢策略。",
    symbols: ["00881", "00891", "00927", "00935"],
  },
  {
    title: "債券 ETF",
    description: "之後可加入定期定額、利率循環與股債配置比較。",
    symbols: ["00679B", "00687B", "00720B", "00751B"],
  },
];

export default function EtfQuickPanel({
  setSymbol,
  setWatchlistSymbols,
  scanWatchlist,
}: EtfQuickPanelProps) {
  function applyGroup(symbols: string[]) {
    setWatchlistSymbols(symbols.join(", "));
  }

  function applyAndScan(symbols: string[]) {
    setWatchlistSymbols(symbols.join(", "));

    setTimeout(() => {
      scanWatchlist();
    }, 300);
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-blue-600">ETF Center</p>

      <h2 className="mt-2 text-2xl font-bold text-slate-900">
        ETF 快速清單
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        點 ETF 代號可設為單一回測；也可以一鍵套用整組 ETF 到觀察清單。
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {ETF_GROUPS.map((group) => (
          <div
            key={group.title}
            className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
          >
            <h3 className="text-lg font-bold text-slate-900">{group.title}</h3>

            <p className="mt-2 text-sm text-slate-500">{group.description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {group.symbols.map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => setSymbol(symbol)}
                  className="rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-blue-50 hover:text-blue-700"
                >
                  {symbol}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-2 md:grid-cols-3">
              <button
                onClick={() => applyGroup(group.symbols)}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white"
              >
                套用觀察清單
              </button>

              <button
                onClick={() => applyAndScan(group.symbols)}
                className="rounded-2xl bg-blue-600 px-4 py-3 text-xs font-bold text-white"
              >
                套用並掃描
              </button>

              <button
                onClick={() => setSymbol(group.symbols[0])}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-xs font-bold text-slate-700"
              >
                第一檔回測
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}