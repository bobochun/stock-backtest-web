"use client";

import { useMemo, useState } from "react";

type ScreenerCandidate = {
  symbol: string;
  stockName: string;
  market: string;
  securityType: string;
  tickerUsed: string;
  lastDate: string;
  lastClose: number;
  ma20: number | null;
  ma60: number | null;
  high20: number | null;
  rsi: number | null;
  distanceToMa20Pct: number | null;
  distanceToMa60Pct: number | null;
  distanceToHigh20Pct: number | null;
  aboveMa20: boolean;
  aboveMa60: boolean;
  ma20AboveMa60: boolean;
  nearMa20: boolean;
  breakout20: boolean;
  rsiRebound: boolean;
  flowScoreAvg: number;
  flowSignal: string;
  flowDataDays: number;
  foreignNetLotsSum: number;
  trustNetLotsSum: number;
  dealerNetLotsSum: number;
  latestForeignNetLots: number;
  latestTrustNetLots: number;
  latestTotalNetLots: number;
  score: number;
  signal: string;
  tags: string[];
  passed: boolean;
};

type ScreenerResponse = {
  ok: boolean;
  requestedCount: number;
  count: number;
  passedCount: number;
  candidates: ScreenerCandidate[];
  passedCandidates: ScreenerCandidate[];
  watchCandidates: ScreenerCandidate[];
  riskCandidates: ScreenerCandidate[];
  errors: { symbol: string; error: string }[];
  error?: string;
};

const defaultSymbols =
  "2330, 2454, 2317, 2382, 2308, 2357, 2881, 2882, 2603, 2609, 0050, 006208, 00878, 00919";

function todayInputValue() {
  const date = new Date();
  return date.toISOString().slice(0, 10);
}

function pastDateInputValue(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";

  return value.toLocaleString("zh-TW", {
    maximumFractionDigits: 2,
  });
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";

  return Math.round(value).toLocaleString("zh-TW");
}

function formatPct(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";

  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(1)}%`;
}

function scoreClass(score: number) {
  if (score >= 80) return "bg-red-50 text-red-700 border-red-200";
  if (score >= 65) return "bg-amber-50 text-amber-700 border-amber-200";
  if (score >= 50) return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function lotClass(value: number) {
  if (value > 0) return "text-red-600";
  if (value < 0) return "text-green-600";
  return "text-slate-500";
}

export default function ScreenerLab() {
  const [symbols, setSymbols] = useState(defaultSymbols);
  const [startDate, setStartDate] = useState(pastDateInputValue(420));
  const [endDate, setEndDate] = useState(todayInputValue());
  const [useFlow, setUseFlow] = useState(true);
  const [minScore, setMinScore] = useState(55);
  const [requireAboveMa20, setRequireAboveMa20] = useState(false);
  const [requireFlowPositive, setRequireFlowPositive] = useState(false);
  const [requireBreakout, setRequireBreakout] = useState(false);
  const [requireRsiRebound, setRequireRsiRebound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<ScreenerResponse | null>(null);
  const [view, setView] = useState<"passed" | "watch" | "risk" | "all">("passed");

  const rows = useMemo(() => {
    if (!data) return [];

    if (view === "passed") return data.passedCandidates || [];
    if (view === "watch") return data.watchCandidates || [];
    if (view === "risk") return data.riskCandidates || [];

    return data.candidates || [];
  }, [data, view]);

  async function runScreener() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/screener", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbols,
          startDate,
          endDate,
          useFlow,
          minScore,
          requireAboveMa20,
          requireFlowPositive,
          requireBreakout,
          requireRsiRebound,
        }),
      });

      const json = (await response.json()) as ScreenerResponse;

      setData(json);

      if (!response.ok || !json.ok) {
        alert(json.error || "選股器掃描失敗");
      }
    } catch {
      alert("無法連線到 Screener API");
    } finally {
      setIsLoading(false);
    }
  }

  function applyPreset(nextSymbols: string) {
    setSymbols(nextSymbols);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-12%] top-[-12%] h-96 w-96 rounded-full bg-blue-200/60 blur-3xl" />
        <div className="absolute right-[-10%] top-[18%] h-96 w-96 rounded-full bg-red-200/60 blur-3xl" />
        <div className="absolute bottom-[-18%] left-[30%] h-96 w-96 rounded-full bg-cyan-200/40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl md:p-8">
          <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-200 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                AFTER-MARKET SCREENER
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-5xl">
                盤後選股器
                <span className="block text-red-300">技術面 × 法人籌碼</span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                掃描股票池，找出站上 MA20、接近月線、20 日突破、RSI 低檔轉強與法人籌碼偏多的候選股。
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={runScreener}
                  disabled={isLoading}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:opacity-60"
                >
                  {isLoading ? "掃描中..." : "開始盤後掃描"}
                </button>

                <a
                  href="/"
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  回首頁
                </a>

                <a
                  href="/watchlist-lab"
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  Watchlist
                </a>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
              <div className="grid gap-3 md:grid-cols-2">
                <HeroMetric label="候選股" value={`${data?.passedCount || 0}`} note="Passed" />
                <HeroMetric label="掃描數" value={`${data?.count || 0}`} note="Scanned" />
                <HeroMetric label="觀察股" value={`${data?.watchCandidates?.length || 0}`} note="Watch" />
                <HeroMetric label="風險股" value={`${data?.riskCandidates?.length || 0}`} note="Risk" />
              </div>

              <div className="mt-4 rounded-3xl bg-slate-900/80 p-4">
                <p className="text-xs text-slate-400">Screener Strength</p>
                <div className="mt-4 flex h-28 items-end gap-2">
                  {(data?.candidates || []).slice(0, 12).map((item, index) => (
                    <div
                      key={`${item.symbol}-${index}`}
                      className="flex flex-1 items-end rounded-full bg-white/10"
                    >
                      <div
                        className={`w-full rounded-full ${
                          item.score >= 80
                            ? "bg-red-400"
                            : item.score >= 65
                              ? "bg-amber-300"
                              : "bg-sky-300"
                        }`}
                        style={{ height: `${Math.max(8, item.score)}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
          <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                股票池
              </label>
              <textarea
                value={symbols}
                onChange={(event) => setSymbols(event.target.value)}
                className="h-28 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <PresetButton
                  label="權值 AI"
                  onClick={() => applyPreset("2330, 2454, 2317, 2382, 2308, 2357")}
                />
                <PresetButton
                  label="金融"
                  onClick={() => applyPreset("2881, 2882, 2884, 2885, 2886, 2891")}
                />
                <PresetButton
                  label="航運"
                  onClick={() => applyPreset("2603, 2609, 2615, 2618")}
                />
                <PresetButton
                  label="ETF"
                  onClick={() => applyPreset("0050, 006208, 00878, 00919, 00929")}
                />
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="開始日期" value={startDate} onChange={setStartDate} type="date" />
                <Input label="結束日期" value={endDate} onChange={setEndDate} type="date" />
                <Input label="最低分數" value={String(minScore)} onChange={(value) => setMinScore(Number(value))} type="number" />
              </div>

              <div className="grid gap-2 rounded-3xl bg-slate-50 p-4">
                <Checkbox label="啟用法人籌碼" checked={useFlow} onChange={setUseFlow} />
                <Checkbox label="只要站上 MA20" checked={requireAboveMa20} onChange={setRequireAboveMa20} />
                <Checkbox label="只要法人偏多" checked={requireFlowPositive} onChange={setRequireFlowPositive} />
                <Checkbox label="只要 20 日突破" checked={requireBreakout} onChange={setRequireBreakout} />
                <Checkbox label="只要 RSI 低檔轉強" checked={requireRsiRebound} onChange={setRequireRsiRebound} />
              </div>
            </div>
          </div>
        </section>

        {data && (
          <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-bold text-blue-600">SCREENER RESULTS</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">
                  掃描結果
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  候選 {data.passedCount} 檔｜總掃描 {data.count} 檔｜錯誤 {data.errors?.length || 0} 檔
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <ViewButton label="候選買進" active={view === "passed"} onClick={() => setView("passed")} />
                <ViewButton label="觀察" active={view === "watch"} onClick={() => setView("watch")} />
                <ViewButton label="風險" active={view === "risk"} onClick={() => setView("risk")} />
                <ViewButton label="全部" active={view === "all"} onClick={() => setView("all")} />
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                目前沒有符合條件的股票。可以降低最低分數或放寬條件。
              </div>
            ) : (
              <div className="grid gap-4">
                {rows.map((item) => (
                  <CandidateCard key={item.symbol} item={item} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function CandidateCard({ item }: { item: ScreenerCandidate }) {
  const flowHref = `/flow-lab?symbols=${encodeURIComponent(item.symbol)}`;
  const watchHref = `/watchlist-lab`;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black text-slate-900">
              {item.symbol}{" "}
              <span className="font-medium text-slate-500">{item.stockName}</span>
            </h3>

            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${scoreClass(item.score)}`}>
              {item.signal}｜{item.score}
            </span>

            {item.passed && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                候選
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={flowHref}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
          >
            法人籌碼
          </a>

          <a
            href={watchHref}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            加到 Watchlist
          </a>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Metric label="收盤價" value={formatPrice(item.lastClose)} />
        <Metric label="MA20" value={formatPrice(item.ma20)} />
        <Metric label="MA60" value={formatPrice(item.ma60)} />
        <Metric label="距 MA20" value={formatPct(item.distanceToMa20Pct)} />
        <Metric label="RSI" value={item.rsi === null ? "-" : String(item.rsi)} />
        <Metric label="日期" value={item.lastDate} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric
          label="法人分數"
          value={`${item.flowScoreAvg}`}
        />
        <Metric
          label="外資合計"
          value={`${formatNumber(item.foreignNetLotsSum)} 張`}
          valueClassName={lotClass(item.foreignNetLotsSum)}
        />
        <Metric
          label="投信合計"
          value={`${formatNumber(item.trustNetLotsSum)} 張`}
          valueClassName={lotClass(item.trustNetLotsSum)}
        />
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {item.flowSignal}｜法人資料天數：{item.flowDataDays}
      </p>
    </div>
  );
}

function HeroMetric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-xs text-slate-300">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{note}</p>
    </div>
  );
}

function PresetButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
    >
      {label}
    </button>
  );
}

function ViewButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
        active
          ? "bg-slate-900 text-white"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function Metric({
  label,
  value,
  valueClassName = "text-slate-900",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className={`mt-2 text-lg font-black ${valueClassName}`}>{value}</p>
    </div>
  );
}