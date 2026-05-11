type BacktestFormProps = {
  symbol: string;
  strategy: string;
  capital: string;
  positionSize: string;
  stopLoss: string;
  takeProfit: string;
  startDate: string;
  endDate: string;
  isLoading: boolean;
  setSymbol: (value: string) => void;
  setStrategy: (value: string) => void;
  setCapital: (value: string) => void;
  setPositionSize: (value: string) => void;
  setStopLoss: (value: string) => void;
  setTakeProfit: (value: string) => void;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  runBacktest: () => void;
};

export default function BacktestForm({
  symbol,
  strategy,
  capital,
  positionSize,
  stopLoss,
  takeProfit,
  startDate,
  endDate,
  isLoading,
  setSymbol,
  setStrategy,
  setCapital,
  setPositionSize,
  setStopLoss,
  setTakeProfit,
  setStartDate,
  setEndDate,
  runBacktest,
}: BacktestFormProps) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">回測設定</h2>

      <div className="mt-5 space-y-4">
        <div>
          <label className="text-sm text-slate-600">股票代號</label>
          <input
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
            placeholder="例如：2330"
          />
        </div>

        <div>
          <label className="text-sm text-slate-600">策略</label>
          <select
            value={strategy}
            onChange={(event) => setStrategy(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
          >
            <option>MA20 / MA60 黃金交叉</option>
            <option>回測月線反彈</option>
            <option>突破 60 日新高</option>
            <option>投信連買 + 站上月線</option>
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm text-slate-600">初始資金</label>
            <input
              value={capital}
              onChange={(event) => setCapital(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
              placeholder="1000000"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">單筆持倉上限</label>
            <input
              value={positionSize}
              onChange={(event) => setPositionSize(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
              placeholder="20%"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm text-slate-600">停損 %</label>
            <input
              value={stopLoss}
              onChange={(event) => setStopLoss(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
              placeholder="8%"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">停利 %</label>
            <input
              value={takeProfit}
              onChange={(event) => setTakeProfit(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
              placeholder="15%"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm text-slate-600">開始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">結束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </div>
        </div>

        <button
          onClick={runBacktest}
          disabled={isLoading}
          className="w-full rounded-2xl bg-blue-600 px-6 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "回測中..." : "執行回測"}
        </button>
      </div>
    </div>
  );
}