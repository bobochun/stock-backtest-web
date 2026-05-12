"use client";

type BacktestFormProps = {
  symbol: string;
  watchlistSymbols: string;
  strategy: string;
  capital: string;
  positionSize: string;
  stopLoss: string;
  takeProfit: string;
  startDate: string;
  endDate: string;

  isLoading: boolean;
  isComparing: boolean;
  isScanning: boolean;
  isOptimizing: boolean;

  setSymbol: (value: string) => void;
  setWatchlistSymbols: (value: string) => void;
  setStrategy: (value: string) => void;
  setCapital: (value: string) => void;
  setPositionSize: (value: string) => void;
  setStopLoss: (value: string) => void;
  setTakeProfit: (value: string) => void;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;

  runBacktest: () => void;
  compareStrategies: () => void;
  scanWatchlist: () => void;
  optimizeParameters: () => void;
};

type StrategyOption = {
  value: string;
  label: string;
  group: "技術策略" | "ETF / 長期策略" | "法人籌碼策略" | "風險控管策略";
  description: string;
  flowLinked?: boolean;
};

const STRATEGY_OPTIONS: StrategyOption[] = [
  {
    value: "MA20 / MA60 黃金交叉",
    label: "MA20 / MA60 黃金交叉",
    group: "技術策略",
    description:
      "用短均線突破長均線作為趨勢轉強訊號，適合趨勢股與大盤多頭段。",
  },
  {
    value: "突破整理區策略",
    label: "突破整理區策略",
    group: "技術策略",
    description:
      "觀察股價突破近期盤整區間，搭配成交量放大，適合動能型交易。",
  },
  {
    value: "RSI 低檔反彈策略",
    label: "RSI 低檔反彈策略",
    group: "技術策略",
    description:
      "股價短線過度修正後，等待 RSI 低檔轉強，適合反彈交易與支撐區布局。",
  },
  {
    value: "Buy and Hold 長期持有",
    label: "Buy and Hold 長期持有",
    group: "ETF / 長期策略",
    description:
      "買進後長期持有，用來當作基準組，方便比較主動策略是否真的有超額報酬。",
  },
  {
    value: "ETF 定期定額策略",
    label: "ETF 定期定額策略",
    group: "ETF / 長期策略",
    description:
      "適合 0050、006208、00878 等 ETF，以長期分批投入降低擇時風險。",
  },

  {
    value: "外資投信同步買超 + MA20 趨勢過濾",
    label: "外資投信同步買超 + MA20 趨勢過濾",
    group: "法人籌碼策略",
    description:
      "外資與投信同向買超時，只挑股價維持在 MA20 上方的標的，避免只看籌碼卻追到弱勢股。",
    flowLinked: true,
  },
  {
    value: "投信連買動能 + 月線防守",
    label: "投信連買動能 + 月線防守",
    group: "法人籌碼策略",
    description:
      "投信常偏中期配置。投信買超動能出現時，以月線作為防守，適合波段觀察。",
    flowLinked: true,
  },
  {
    value: "外資回補反彈 + RSI 低檔轉強",
    label: "外資回補反彈 + RSI 低檔轉強",
    group: "法人籌碼策略",
    description:
      "適合權值股或大型電子股。外資由賣轉買時，搭配 RSI 低檔轉強觀察反彈機會。",
    flowLinked: true,
  },
  {
    value: "三大法人合計買超 + 突破整理",
    label: "三大法人合計買超 + 突破整理",
    group: "法人籌碼策略",
    description:
      "三大法人合計買超且股價突破整理區，代表籌碼與技術面同時轉強。",
    flowLinked: true,
  },
  {
    value: "外資投信同步賣超風險過濾",
    label: "外資投信同步賣超風險過濾",
    group: "風險控管策略",
    description:
      "當外資與投信同步賣超時，即使技術線型尚可，也降低進場權重或避免追價。",
    flowLinked: true,
  },
];

const GROUP_ORDER: StrategyOption["group"][] = [
  "技術策略",
  "ETF / 長期策略",
  "法人籌碼策略",
  "風險控管策略",
];

function normalizePercent(value: string) {
  const text = value.trim();

  if (!text) return "";

  if (text.endsWith("%")) return text;

  return `${text}%`;
}

function strategyDescription(strategy: string) {
  return (
    STRATEGY_OPTIONS.find((item) => item.value === strategy) ||
    STRATEGY_OPTIONS[0]
  );
}

function getFlowLabHref(symbol: string, watchlistSymbols: string) {
  const text = symbol.trim() || watchlistSymbols.trim();

  if (!text) return "/flow-lab";

  return `/flow-lab?symbols=${encodeURIComponent(text)}`;
}

export default function BacktestForm({
  symbol,
  watchlistSymbols,
  strategy,
  capital,
  positionSize,
  stopLoss,
  takeProfit,
  startDate,
  endDate,

  isLoading,
  isComparing,
  isScanning,
  isOptimizing,

  setSymbol,
  setWatchlistSymbols,
  setStrategy,
  setCapital,
  setPositionSize,
  setStopLoss,
  setTakeProfit,
  setStartDate,
  setEndDate,

  runBacktest,
  compareStrategies,
  scanWatchlist,
  optimizeParameters,
}: BacktestFormProps) {
  const selectedStrategy = strategyDescription(strategy);
  const isFlowStrategy = selectedStrategy.flowLinked === true;

  const anyLoading = isLoading || isComparing || isScanning || isOptimizing;

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold text-blue-600">STRATEGY BUILDER</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">
            回測參數與策略選擇
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            現在策略選單已加入法人籌碼策略。選到外資、投信相關策略時，可以直接連到法人籌碼實驗室檢查買賣超狀態。
          </p>
        </div>

        <a
          href={getFlowLabHref(symbol, watchlistSymbols)}
          className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100"
        >
          法人籌碼實驗室 →
        </a>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickStrategyCard
          title="外資投信同步買超"
          description="籌碼方向一致，適合搭配趨勢過濾。"
          onClick={() => setStrategy("外資投信同步買超 + MA20 趨勢過濾")}
        />
        <QuickStrategyCard
          title="投信連買動能"
          description="偏中期配置，適合波段追蹤。"
          onClick={() => setStrategy("投信連買動能 + 月線防守")}
        />
        <QuickStrategyCard
          title="外資回補反彈"
          description="權值股常見，搭配 RSI 轉強。"
          onClick={() => setStrategy("外資回補反彈 + RSI 低檔轉強")}
        />
        <QuickStrategyCard
          title="法人賣超過濾"
          description="外資投信同步賣超時降低追價。"
          onClick={() => setStrategy("外資投信同步賣超風險過濾")}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="股票代號">
              <input
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                placeholder="例如 2330"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </Field>

            <Field label="策略選單">
              <select
                value={strategy}
                onChange={(event) => setStrategy(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                {GROUP_ORDER.map((group) => (
                  <optgroup key={group} label={group}>
                    {STRATEGY_OPTIONS.filter((item) => item.group === group).map(
                      (item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      )
                    )}
                  </optgroup>
                ))}
              </select>
            </Field>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black text-slate-900">
                    {selectedStrategy.label}
                  </h3>

                  {selectedStrategy.flowLinked && (
                    <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                      法人籌碼連動
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {selectedStrategy.description}
                </p>
              </div>

              {selectedStrategy.flowLinked && (
                <a
                  href={getFlowLabHref(symbol, watchlistSymbols)}
                  className="shrink-0 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
                >
                  檢查外資 / 投信
                </a>
              )}
            </div>

            {isFlowStrategy && (
              <div className="mt-4 rounded-2xl border border-red-100 bg-white p-4 text-sm leading-6 text-slate-600">
                <p className="font-bold text-red-700">法人策略使用提醒</p>
                <p className="mt-1">
                  這類策略適合先到 <span className="font-bold">/flow-lab</span>{" "}
                  看外資、投信、自營商買賣超，再回來執行技術回測。下一版可以把法人資料正式接進後端買賣規則。
                </p>
              </div>
            )}
          </div>

          <Field label="觀察清單">
            <textarea
              value={watchlistSymbols}
              onChange={(event) => setWatchlistSymbols(event.target.value)}
              placeholder="例如 2330, 2454, 2317, 2382, 0050"
              className="h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
          </Field>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <Field label="初始資金">
              <input
                value={capital}
                onChange={(event) => setCapital(event.target.value)}
                placeholder="例如 1000000"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </Field>

            <Field label="單檔部位比例">
              <input
                value={positionSize}
                onChange={(event) =>
                  setPositionSize(normalizePercent(event.target.value))
                }
                placeholder="例如 20%"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </Field>

            <Field label="停損">
              <input
                value={stopLoss}
                onChange={(event) =>
                  setStopLoss(normalizePercent(event.target.value))
                }
                placeholder="例如 8%"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </Field>

            <Field label="停利">
              <input
                value={takeProfit}
                onChange={(event) =>
                  setTakeProfit(normalizePercent(event.target.value))
                }
                placeholder="例如 15%"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </Field>

            <Field label="開始日期">
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </Field>

            <Field label="結束日期">
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ActionButton
          label={isLoading ? "回測中..." : "執行單股回測"}
          onClick={runBacktest}
          disabled={anyLoading}
          primary
        />
        <ActionButton
          label={isComparing ? "比較中..." : "策略比較"}
          onClick={compareStrategies}
          disabled={anyLoading}
        />
        <ActionButton
          label={isScanning ? "掃描中..." : "掃描觀察清單"}
          onClick={scanWatchlist}
          disabled={anyLoading}
        />
        <ActionButton
          label={isOptimizing ? "最佳化中..." : "參數最佳化"}
          onClick={optimizeParameters}
          disabled={anyLoading}
        />
      </div>

      <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="font-black text-slate-900">新增的 5 種法人策略</h3>

        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {STRATEGY_OPTIONS.filter((item) => item.flowLinked).map((item) => (
            <div
              key={item.value}
              className="rounded-2xl border border-slate-200 bg-white p-3"
            >
              <p className="text-sm font-bold text-slate-900">{item.label}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function QuickStrategyCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:shadow-md"
    >
      <p className="text-sm font-black text-slate-900">{title}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </button>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  primary,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl px-5 py-3 text-sm font-bold transition disabled:opacity-60 ${
        primary
          ? "bg-slate-900 text-white hover:-translate-y-0.5 hover:bg-slate-700"
          : "border border-slate-300 bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}