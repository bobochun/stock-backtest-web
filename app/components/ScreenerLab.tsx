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

type WatchItem = {
  id: string;
  symbol: string;
  name: string;
  strategy: string;
  currentPrice: string;
  entryPrice: string;
  stopLossPrice: string;
  targetPrice: string;
  positionAmount: string;
  note: string;
  tags: string;
  active: boolean;
  updatedAt: string;
  quoteDate?: string;
};

const WATCHLIST_STORAGE_KEY = "stock-backtest-web-watchlist-alerts-v3";

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

function nowText() {
  return new Date().toLocaleString("zh-TW", {
    hour12: false,
  });
}

function createWatchId() {
  return `watch-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function roundTaiwanPrice(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";

  if (value < 50) return value.toFixed(2);
  if (value < 500) return value.toFixed(1);

  return Math.round(value).toString();
}

function getSuggestedLevels(price: number, item: ScreenerCandidate) {
  if (!Number.isFinite(price) || price <= 0) {
    return {
      entryPrice: "",
      stopLossPrice: "",
      targetPrice: "",
      logic: "尚未有現價，無法自動計算。",
    };
  }

  let entryMultiplier = 0.98;
  let stopMultiplier = 0.93;
  let targetMultiplier = 1.12;
  let logic = "法人 / 趨勢候選：回檔 2% 作為買點，停損約 7%，停利約 12%。";

  if (item.securityType?.includes("ETF") || item.symbol.startsWith("00")) {
    entryMultiplier = 0.97;
    stopMultiplier = 0.9;
    targetMultiplier = 1.1;
    logic = "ETF 候選：回檔 3% 分批，停損約 10%，停利約 10%。";
  } else if (item.breakout20) {
    entryMultiplier = 0.995;
    stopMultiplier = 0.94;
    targetMultiplier = 1.15;
    logic = "突破候選：買點接近現價，停損約 6%，停利約 15%。";
  } else if (item.rsiRebound) {
    entryMultiplier = 0.96;
    stopMultiplier = 0.91;
    targetMultiplier = 1.1;
    logic = "RSI 低檔轉強候選：回檔 4% 作為買點，停損約 9%，停利約 10%。";
  } else if (item.nearMa20) {
    entryMultiplier = 0.985;
    stopMultiplier = 0.93;
    targetMultiplier = 1.12;
    logic = "接近月線候選：買點略低於現價，停損約 7%，停利約 12%。";
  }

  return {
    entryPrice: roundTaiwanPrice(price * entryMultiplier),
    stopLossPrice: roundTaiwanPrice(price * stopMultiplier),
    targetPrice: roundTaiwanPrice(price * targetMultiplier),
    logic,
  };
}

function getCandidateStrategy(item: ScreenerCandidate) {
  if (item.breakout20 && item.flowScoreAvg >= 60) {
    return "三大法人合計買超 + 突破整理";
  }

  if (item.flowScoreAvg >= 60 && item.aboveMa20) {
    return "外資投信同步買超 + MA20 趨勢過濾";
  }

  if (item.rsiRebound) {
    return "RSI 低檔反彈策略";
  }

  if (item.securityType?.includes("ETF") || item.symbol.startsWith("00")) {
    return "ETF 回檔分批加碼";
  }

  return "MA20 / MA60 黃金交叉";
}

function readWatchlist(): WatchItem[] {
  try {
    const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    if (Array.isArray(parsed)) return parsed;

    return [];
  } catch {
    return [];
  }
}

function writeWatchlist(items: WatchItem[]) {
  localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(items));
}

function addCandidateToWatchlist(item: ScreenerCandidate) {
  const existing = readWatchlist();
  const cleanSymbol = item.symbol.trim();
  const oldItem = existing.find((row) => row.symbol === cleanSymbol);
  const suggestion = getSuggestedLevels(item.lastClose, item);
  const strategy = getCandidateStrategy(item);

  const watchItem: WatchItem = {
    id: oldItem?.id || createWatchId(),
    symbol: cleanSymbol,
    name: item.stockName || cleanSymbol,
    strategy,
    currentPrice: String(item.lastClose || ""),
    entryPrice: oldItem?.entryPrice || suggestion.entryPrice,
    stopLossPrice: oldItem?.stopLossPrice || suggestion.stopLossPrice,
    targetPrice: oldItem?.targetPrice || suggestion.targetPrice,
    positionAmount: oldItem?.positionAmount || "50000",
    note:
      oldItem?.note ||
      [
        `由 Screener 一鍵加入。`,
        `分數 ${item.score}，訊號：${item.signal}。`,
        `法人：${item.flowSignal}，平均分數 ${item.flowScoreAvg}。`,
        `系統預設：${suggestion.logic}`,
      ].join(" "),
    tags: [
      ...item.tags,
      `Screener ${item.score}`,
      item.flowScoreAvg >= 60 ? "法人偏多" : "",
      item.breakout20 ? "突破" : "",
      item.rsiRebound ? "RSI轉強" : "",
    ]
      .filter(Boolean)
      .join(", "),
    active: true,
    updatedAt: nowText(),
    quoteDate: item.lastDate,
  };

  const nextItems = oldItem
    ? existing.map((row) => (row.symbol === cleanSymbol ? watchItem : row))
    : [watchItem, ...existing];

  writeWatchlist(nextItems);

  alert(`${item.symbol} ${item.stockName} 已加入 Watchlist`);
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
                <span className="block text-red-300">
                  技術面 × 法人籌碼 × 一鍵加入 Watchlist
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                掃描股票池，找出站上 MA20、接近月線、20 日突破、RSI 低檔轉強與法人籌碼偏多的候選股。
                現在可以直接把候選股加入 Watchlist，並自動帶入建議買點、停損與停利。
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
                  打開 Watchlist
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
          <button
            onClick={() => addCandidateToWatchlist(item)}
            className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
          >
            加入 Watchlist
          </button>

          <a
            href="/watchlist-lab"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
          >
            打開 Watchlist
          </a>

          <a
            href={flowHref}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
          >
            法人籌碼
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
        <Metric label="法人分數" value={`${item.flowScoreAvg}`} />
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