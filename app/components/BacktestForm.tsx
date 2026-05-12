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
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">回測設定</h2>

      <div className="mt-5 space-y-4">
        <div>
          <label className="text-sm text-slate-600">單一股票代號</label>
          <input
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
            placeholder="例如：2330、0050、006208"
          />
        </div>

        <div>
          <label className="text-sm text-slate-600">觀察清單</label>
          <textarea
            value={watchlistSymbols}
            onChange={(event) => setWatchlistSymbols(event.target.value)}
            className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3"
            placeholder="例如：2330, 2454, 2317, 2382, 0050, 006208"
          />
          <p className="mt-1 text-xs text-slate-500">
            可用逗號、空格或換行分隔，最多掃描 30 檔。
          </p>
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

        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-700">操作按鈕</p>

          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <button
              onClick={runBacktest}
              disabled={isLoading}
              className="rounded-2xl bg-blue-600 px-6 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "回測中..." : "執行回測"}
            </button>

            <button
              onClick={compareStrategies}
              disabled={isComparing}
              className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isComparing ? "比較中..." : "比較策略"}
            </button>

            <button
              onClick={scanWatchlist}
              disabled={isScanning}
              className="rounded-2xl bg-slate-900 px-6 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isScanning ? "掃描中..." : "掃描清單"}
            </button>

            <button
              onClick={optimizeParameters}
              disabled={isOptimizing}
              className="rounded-2xl bg-purple-600 px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isOptimizing ? "最佳化中..." : "參數最佳化"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}