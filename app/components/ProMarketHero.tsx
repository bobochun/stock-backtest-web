"use client";

const marketStats = [
  {
    label: "Strategy Health",
    value: "82",
    suffix: "/100",
    note: "Risk-adjusted score",
  },
  {
    label: "Monte Carlo Runs",
    value: "300",
    suffix: "x",
    note: "Randomized paths",
  },
  {
    label: "Stress Test",
    value: "P10",
    suffix: "",
    note: "Worst 10% scenario",
  },
  {
    label: "Position Control",
    value: "1.0",
    suffix: "%",
    note: "Risk per trade",
  },
];

const watchSignals = [
  {
    title: "Entry Zone",
    value: "Near Support",
    tone: "text-red-600 bg-red-50 border-red-100",
  },
  {
    title: "Drawdown Guard",
    value: "Active",
    tone: "text-blue-600 bg-blue-50 border-blue-100",
  },
  {
    title: "Overfit Check",
    value: "Heatmap",
    tone: "text-amber-600 bg-amber-50 border-amber-100",
  },
];

const miniBars = [46, 52, 48, 61, 58, 73, 69, 82, 78, 88, 84, 92];

export default function ProMarketHero() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl md:p-8">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-blue-500 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-red-500 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 blur-3xl" />
      </div>

      <div className="relative z-10 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-200 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            PRO BACKTEST TERMINAL
          </div>

          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-5xl">
            用付費級風險模擬，
            <span className="text-red-300">檢查策略能不能活下來</span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
            不是只看回測報酬率，而是同時檢查期望值、最大回撤、壞情境、
            連續虧損、Kelly 部位與參數韌性。這是專業股市網站最核心的策略壓力測試模組。
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#pro-risk-lab"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              開始策略健檢
            </a>
            <a
              href="/"
              className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              回首頁
            </a>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {marketStats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"
              >
                <p className="text-xs text-slate-300">{item.label}</p>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-2xl font-black">{item.value}</span>
                  <span className="pb-1 text-sm font-semibold text-slate-300">
                    {item.suffix}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-300">
                Strategy Equity Simulation
              </p>
              <h2 className="mt-1 text-xl font-black text-white">
                Monte Carlo Dashboard
              </h2>
            </div>
            <div className="rounded-full bg-red-400/20 px-3 py-1 text-xs font-bold text-red-200">
              LIVE MODEL
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900/80 p-4">
            <div className="mb-4 flex items-center justify-between text-xs text-slate-400">
              <span>Median Path</span>
              <span>Risk-adjusted</span>
            </div>

            <svg viewBox="0 0 720 260" className="h-64 w-full">
              <defs>
                <linearGradient id="heroLine" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="55%" stopColor="#f87171" />
                  <stop offset="100%" stopColor="#fb7185" />
                </linearGradient>
                <linearGradient id="heroArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#fb7185" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
                </linearGradient>
              </defs>

              <path
                d="M0 210 C60 200 80 175 125 182 C180 190 195 120 245 136 C300 154 330 95 380 105 C430 114 470 68 520 82 C580 98 610 40 720 50 L720 260 L0 260 Z"
                fill="url(#heroArea)"
              />
              <path
                d="M0 210 C60 200 80 175 125 182 C180 190 195 120 245 136 C300 154 330 95 380 105 C430 114 470 68 520 82 C580 98 610 40 720 50"
                fill="none"
                stroke="url(#heroLine)"
                strokeWidth="8"
                strokeLinecap="round"
              />

              {[90, 155, 230, 310, 385, 470, 555, 640].map((x, index) => {
                const high = [62, 120, 92, 148, 82, 118, 58, 88][index];
                const low = [180, 206, 165, 190, 150, 172, 130, 142][index];
                const bodyTop = [95, 150, 122, 160, 110, 134, 82, 102][index];
                const bodyHeight = [46, 32, 38, 25, 36, 34, 28, 22][index];
                const positive = index % 2 === 0;

                return (
                  <g key={x}>
                    <line
                      x1={x}
                      y1={high}
                      x2={x}
                      y2={low}
                      stroke={positive ? "#fb7185" : "#38bdf8"}
                      strokeWidth="4"
                      strokeLinecap="round"
                      opacity="0.75"
                    />
                    <rect
                      x={x - 12}
                      y={bodyTop}
                      width="24"
                      height={bodyHeight}
                      rx="5"
                      fill={positive ? "#fb7185" : "#38bdf8"}
                      opacity="0.9"
                    />
                  </g>
                );
              })}
            </svg>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {watchSignals.map((signal) => (
                <div
                  key={signal.title}
                  className={`rounded-2xl border p-3 ${signal.tone}`}
                >
                  <p className="text-[11px] font-medium opacity-80">
                    {signal.title}
                  </p>
                  <p className="mt-1 text-sm font-black">{signal.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-white/10 bg-white/10 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-300">Robustness Heat</p>
                <p className="text-sm font-bold text-white">
                  Parameter Stability
                </p>
              </div>
              <p className="text-xs text-slate-400">Win rate × payoff</p>
            </div>

            <div className="flex h-28 items-end gap-2">
              {miniBars.map((height, index) => (
                <div
                  key={index}
                  className="flex flex-1 items-end rounded-full bg-white/10"
                >
                  <div
                    className={`w-full rounded-full ${
                      height > 80
                        ? "bg-red-400"
                        : height > 65
                          ? "bg-amber-300"
                          : "bg-sky-300"
                    }`}
                    style={{ height: `${height}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}