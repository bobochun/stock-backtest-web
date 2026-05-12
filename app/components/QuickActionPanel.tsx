"use client";

type QuickActionPanelProps = {
  isLoading: boolean;
  isComparing: boolean;
  isScanning: boolean;
  isOptimizing: boolean;
  runBacktest: () => void;
  compareStrategies: () => void;
  scanWatchlist: () => void;
  optimizeParameters: () => void;
};

export default function QuickActionPanel({
  isLoading,
  isComparing,
  isScanning,
  isOptimizing,
  runBacktest,
  compareStrategies,
  scanWatchlist,
  optimizeParameters,
}: QuickActionPanelProps) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-purple-600">Quick Actions</p>

      <h2 className="mt-2 text-2xl font-bold text-slate-900">快速操作</h2>

      <p className="mt-2 text-sm text-slate-500">
        主要功能按鈕集中在這裡。紫色按鈕就是參數最佳化。
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <button
          onClick={runBacktest}
          disabled={isLoading}
          className="rounded-2xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "回測中..." : "執行回測"}
        </button>

        <button
          onClick={compareStrategies}
          disabled={isComparing}
          className="rounded-2xl border border-slate-300 bg-white px-5 py-4 text-sm font-bold text-slate-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isComparing ? "比較中..." : "比較策略"}
        </button>

        <button
          onClick={scanWatchlist}
          disabled={isScanning}
          className="rounded-2xl bg-slate-900 px-5 py-4 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isScanning ? "掃描中..." : "掃描清單"}
        </button>

        <button
          onClick={optimizeParameters}
          disabled={isOptimizing}
          className="rounded-2xl bg-purple-700 px-5 py-4 text-sm font-bold text-white shadow-sm hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isOptimizing ? "最佳化中..." : "參數最佳化"}
        </button>
      </div>
    </section>
  );
}