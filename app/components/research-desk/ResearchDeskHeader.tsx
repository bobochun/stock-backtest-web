"use client";

type ResearchDeskHeaderProps = {
  message: string;
  loadingFlow: boolean;
  kpi: {
    total: number;
    highScore: number;
    ready: number;
    missingRisk: number;
    avgScore: number;
  };
  onRefreshFlow: () => void;
  onCopyMarkdown: () => void;
  onExportJson: () => void;
};

export default function ResearchDeskHeader({
  message,
  loadingFlow,
  kpi,
  onRefreshFlow,
  onCopyMarkdown,
  onExportJson,
}: ResearchDeskHeaderProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6 shadow-2xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
            Taiwan Stock Research Desk
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
            Research Desk Pro
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
            盤後選股、法人確認、部位控管、觀察清單、研究筆記與報告輸出整合在同一頁。
            這一版採用 Vercel-friendly 設計：重互動放前端、資料存在 localStorage、
            API 只在按鈕觸發時呼叫。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onRefreshFlow}
            disabled={loadingFlow}
            className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-300 disabled:opacity-60"
          >
            {loadingFlow ? "更新中..." : "更新法人籌碼"}
          </button>

          <button
            onClick={onCopyMarkdown}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
          >
            複製 Markdown
          </button>

          <button
            onClick={onExportJson}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
          >
            匯出 JSON
          </button>
        </div>
      </div>

      {message && (
        <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
          {message}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="研究清單" value={kpi.total} hint="目前追蹤股票數" />
        <KpiCard label="高分候選" value={kpi.highScore} hint="綜合分數 ≥ 70" />
        <KpiCard label="接近進場" value={kpi.ready} hint="狀態標記 ready" />
        <KpiCard label="缺風控" value={kpi.missingRisk} hint="尚未設定進場/停損" />
        <KpiCard label="平均分數" value={kpi.avgScore} hint="清單品質概覽" />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}