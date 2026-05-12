"use client";

import { useEffect, useMemo, useState } from "react";

type SavedStockList = {
  id: string;
  name: string;
  symbols: string;
  updatedAt: string;
};

type FlowRecord = {
  symbol: string;
  name: string;
  market: string;
  date: string;
  foreignNetLots: number;
  trustNetLots: number;
  dealerNetLots: number;
  totalNetLots: number;
  score: number;
  baseScore?: number;
  signal: string;
  strategies: string[];
  reason: string;
  sourceMode?: string;
  hasFlowData?: boolean;

  accumulationDays?: number;
  recentFlowDays?: number;
  recentStartDate?: string;
  recentEndDate?: string;
  recentForeignBuyDays?: number;
  recentTrustBuyDays?: number;
  recentDealerBuyDays?: number;
  recentTotalBuyDays?: number;
  recentSyncBuyDays?: number;
  recentForeignNetLotsSum?: number;
  recentTrustNetLotsSum?: number;
  recentDealerNetLotsSum?: number;
  recentTotalNetLotsSum?: number;
  recentFlowScoreAvg?: number;
  recentFlowSignal?: string;
  recentFlowNote?: string;
};

type FlowResponse = {
  ok: boolean;
  source?: string;
  sourceModes?: string[];
  market?: string;
  requestedDate?: string;
  usedDate?: string;
  count?: number;
  lookbackDays?: number;
  accumulationDays?: number;
  records?: FlowRecord[];
  errors?: { symbol: string; error: string }[];
  error?: string;
};

const STORAGE_KEY = "stock-backtest-web-flow-lab-lists-v1";

const defaultSavedLists: SavedStockList[] = [
  {
    id: "ai-weight",
    name: "權值 AI",
    symbols: "2330, 2454, 2317, 2382, 2308, 2357",
    updatedAt: "",
  },
  {
    id: "finance",
    name: "金融股",
    symbols: "2881, 2882, 2884, 2885, 2886, 2891",
    updatedAt: "",
  },
  {
    id: "shipping",
    name: "航運股",
    symbols: "2603, 2609, 2615, 2618",
    updatedAt: "",
  },
  {
    id: "etf",
    name: "ETF",
    symbols: "0050, 006208, 00878, 00919, 00929",
    updatedAt: "",
  },
];

const strategyCards = [
  {
    title: "外資投信同步買超",
    badge: "Sync Flow",
    description:
      "外資與投信同向買超，代表大型資金方向一致。現在可搭配最近 N 日同步買超天數判斷延續性。",
    rules: ["單日外資買超", "單日投信買超", "最近 N 日同步買超天數"],
  },
  {
    title: "投信買超動能",
    badge: "Trust Momentum",
    description:
      "投信常偏中期配置，若最近多日持續買超，通常比單日買超更有參考價值。",
    rules: ["投信買超天數", "投信累計買超張數", "分數是否持續偏多"],
  },
  {
    title: "外資回補策略",
    badge: "Foreign Rebound",
    description:
      "外資買超與股價站回均線時，常見於權值股與大型題材股的回補行情。",
    rules: ["外資買超天數", "外資累計張數", "避免法人同步賣超"],
  },
  {
    title: "法人賣超風險過濾",
    badge: "Risk Guard",
    description:
      "若最近 N 日三大法人合計偏賣，或外資投信同步賣超，進場權重應降低。",
    rules: ["合計買超天數不足", "近期合計張數為負", "分數低於中性"],
  },
];

function nowText() {
  return new Date().toLocaleString("zh-TW", {
    hour12: false,
  });
}

function createId() {
  return `flow-list-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(value?: string) {
  if (!value || value.length !== 8) return "-";
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function formatLots(value?: number) {
  if (!Number.isFinite(Number(value))) return "-";

  const rounded = Math.round(Number(value));

  return `${rounded.toLocaleString("zh-TW")} 張`;
}

function formatSignedLots(value?: number) {
  if (!Number.isFinite(Number(value))) return "-";

  const rounded = Math.round(Number(value));
  const sign = rounded > 0 ? "+" : "";

  return `${sign}${rounded.toLocaleString("zh-TW")} 張`;
}

function formatNumber(value?: number) {
  if (!Number.isFinite(Number(value))) return "-";

  return Number(value).toLocaleString("zh-TW", {
    maximumFractionDigits: 1,
  });
}

function getScoreClass(score: number) {
  if (score >= 80) return "bg-red-50 text-red-700 border-red-200";
  if (score >= 65) return "bg-amber-50 text-amber-700 border-amber-200";
  if (score >= 50) return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function getLotsClass(value?: number) {
  if (Number(value) > 0) return "text-red-600";
  if (Number(value) < 0) return "text-green-600";
  return "text-slate-500";
}

function normalizeSymbolsFromQuery(value: string | null) {
  if (!value) return "";

  return decodeURIComponent(value)
    .replaceAll("，", ",")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
}

function normalizeSymbols(value: string) {
  return String(value || "")
    .replaceAll("，", ",")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
}

function makeBarHeight(value: number, maxAbs: number) {
  if (!Number.isFinite(value) || maxAbs <= 0) return 4;

  return Math.max(8, Math.min(100, (Math.abs(value) / maxAbs) * 100));
}

export default function InstitutionalFlowLab() {
  const [symbols, setSymbols] = useState(
    "2330, 2454, 2317, 2382, 2308, 2881, 2603"
  );
  const [date, setDate] = useState("");
  const [lookbackDays, setLookbackDays] = useState(5);
  const [accumulationDays, setAccumulationDays] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<FlowResponse | null>(null);

  const [savedLists, setSavedLists] = useState<SavedStockList[]>([]);
  const [listName, setListName] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const querySymbols = normalizeSymbolsFromQuery(params.get("symbols"));

    if (querySymbols) {
      setSymbols(querySymbols);
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setSavedLists(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }

    setSavedLists(
      defaultSavedLists.map((item) => ({
        ...item,
        updatedAt: nowText(),
      }))
    );
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLists));
  }, [savedLists]);

  const records = data?.records || [];

  const summary = useMemo(() => {
    const strong = records.filter((item) => item.score >= 80).length;
    const bullish = records.filter((item) => item.score >= 65).length;
    const weak = records.filter((item) => item.score <= 35).length;
    const totalForeign = records.reduce(
      (sum, item) => sum + Number(item.foreignNetLots || 0),
      0
    );
    const totalTrust = records.reduce(
      (sum, item) => sum + Number(item.trustNetLots || 0),
      0
    );
    const recentSync = records.reduce(
      (sum, item) => sum + Number(item.recentSyncBuyDays || 0),
      0
    );
    const recentTotal = records.reduce(
      (sum, item) => sum + Number(item.recentTotalNetLotsSum || 0),
      0
    );

    return {
      strong,
      bullish,
      weak,
      totalForeign,
      totalTrust,
      recentSync,
      recentTotal,
    };
  }, [records]);

  const maxAbsLots = useMemo(() => {
    const values = records.flatMap((record) => [
      Math.abs(Number(record.foreignNetLots || 0)),
      Math.abs(Number(record.trustNetLots || 0)),
      Math.abs(Number(record.dealerNetLots || 0)),
      Math.abs(Number(record.totalNetLots || 0)),
      Math.abs(Number(record.recentForeignNetLotsSum || 0)),
      Math.abs(Number(record.recentTrustNetLotsSum || 0)),
      Math.abs(Number(record.recentTotalNetLotsSum || 0)),
    ]);

    return Math.max(...values, 1);
  }, [records]);

  async function fetchFlow() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/institutional-flow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbols,
          date,
          lookbackDays,
          accumulationDays,
        }),
      });

      const json = (await response.json()) as FlowResponse;

      setData(json);

      if (!response.ok || !json.ok) {
        alert(json.error || "法人籌碼資料讀取失敗");
      }
    } catch {
      alert("無法連線到法人籌碼 API");
    } finally {
      setIsLoading(false);
    }
  }

  function applyPreset(nextSymbols: string) {
    setSymbols(nextSymbols);
  }

  function saveCurrentList() {
    const cleanSymbols = normalizeSymbols(symbols);

    if (!cleanSymbols) {
      alert("請先輸入股票清單");
      return;
    }

    const cleanName = listName.trim() || `自訂清單 ${savedLists.length + 1}`;

    const nextList: SavedStockList = {
      id: createId(),
      name: cleanName,
      symbols: cleanSymbols,
      updatedAt: nowText(),
    };

    setSavedLists((previous) => [nextList, ...previous]);
    setListName("");
  }

  function deleteSavedList(id: string) {
    const target = savedLists.find((item) => item.id === id);

    if (!target) return;

    if (!confirm(`確定刪除「${target.name}」？`)) return;

    setSavedLists((previous) => previous.filter((item) => item.id !== id));
  }

  function clearSymbols() {
    if (!confirm("確定清空目前股票清單？")) return;
    setSymbols("");
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
                INSTITUTIONAL FLOW STRATEGY LAB
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-5xl">
                法人籌碼策略實驗室
                <span className="block text-red-300">
                  最新資料優先 × 多日買超累計
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                單日法人資料優先抓 TWSE 官方 T86，最近 N 日買超天數與累計張數則用 FinMind
                區間資料補強。你也可以自訂股票清單並儲存成常用清單。
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={fetchFlow}
                  disabled={isLoading}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:opacity-60"
                >
                  {isLoading ? "讀取中..." : "掃描法人籌碼"}
                </button>

                <a
                  href="/"
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  回首頁
                </a>

                <a
                  href="/screener-lab"
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  盤後選股器
                </a>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
              <div className="grid gap-3 md:grid-cols-2">
                <HeroMetric label="強勢買盤" value={`${summary.strong}`} note="score ≥ 80" />
                <HeroMetric label="偏多觀察" value={`${summary.bullish}`} note="score ≥ 65" />
                <HeroMetric label="同步買超天數" value={`${summary.recentSync}`} note={`合計，近 ${accumulationDays} 日`} />
                <HeroMetric label="近 N 日合計" value={formatSignedLots(summary.recentTotal)} note="三大法人累計" />
              </div>

              <div className="mt-4 rounded-3xl bg-slate-900/80 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-slate-400">Flow Strength</p>
                  <p className="text-xs text-slate-500">
                    單日與近 N 日籌碼視覺化
                  </p>
                </div>

                <div className="flex h-28 items-end gap-2">
                  {(records.length > 0
                    ? records.slice(0, 12).map((item) => Number(item.recentTotalNetLotsSum || item.totalNetLots || 0))
                    : [42, 58, -49, 72, 63, 86, -78, 92, 69, 80, -74, 88]
                  ).map((value, index) => {
                    const positive = value >= 0;
                    const height =
                      records.length > 0 ? makeBarHeight(value, maxAbsLots) : Math.abs(Number(value));

                    return (
                      <div key={index} className="flex flex-1 items-end rounded-full bg-white/10">
                        <div
                          className={`w-full rounded-full ${positive ? "bg-red-400" : "bg-green-400"}`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {strategyCards.map((card) => (
            <div key={card.title} className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
              <div className="mb-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {card.badge}
              </div>
              <h2 className="text-lg font-black text-slate-900">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{card.description}</p>

              <div className="mt-4 space-y-2">
                {card.rules.map((rule) => (
                  <div key={rule} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    {rule}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                股票清單
              </label>
              <textarea
                value={symbols}
                onChange={(event) => setSymbols(event.target.value)}
                className="h-28 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="例如：2330, 2454, 00878"
              />

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <input
                  value={listName}
                  onChange={(event) => setListName(event.target.value)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="清單名稱，例如：我的 AI 股、ETF 收息清單"
                />

                <button
                  onClick={saveCurrentList}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-700"
                >
                  儲存目前清單
                </button>

                <button
                  onClick={clearSymbols}
                  className="rounded-2xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-bold text-green-700 transition hover:bg-green-100"
                >
                  清空
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <PresetButton label="權值 AI" onClick={() => applyPreset("2330, 2454, 2317, 2382, 2308, 2357")} />
                <PresetButton label="金融股" onClick={() => applyPreset("2881, 2882, 2884, 2885, 2886, 2891")} />
                <PresetButton label="航運股" onClick={() => applyPreset("2603, 2609, 2615, 2618")} />
                <PresetButton label="ETF" onClick={() => applyPreset("0050, 006208, 00878, 00919, 00929")} />
              </div>
            </div>

            <div className="grid gap-4">
              <Input label="查詢日期" type="date" value={date} onChange={setDate} note="可留空，系統會使用今天並往前找最近可用交易日。" />

              <Input
                label="TWSE 回找天數"
                type="number"
                value={String(lookbackDays)}
                onChange={(value) => setLookbackDays(Number(value))}
                note="找不到今天資料時，往前找幾天。建議 5。"
              />

              <Input
                label="買超累計天數"
                type="number"
                value={String(accumulationDays)}
                onChange={(value) => setAccumulationDays(Number(value))}
                note="統計最近 N 個交易日買超天數與累計張數。建議 3、5、10、20。"
              />

              <button
                onClick={fetchFlow}
                disabled={isLoading}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-700 disabled:opacity-60"
              >
                {isLoading ? "掃描中..." : "開始掃描"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold text-blue-600">CUSTOM LISTS</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">我的自訂股票清單</h2>
              <p className="mt-2 text-sm text-slate-500">
                儲存在瀏覽器 LocalStorage。適合建立 AI 股、ETF、金融、短線觀察等不同清單。
              </p>
            </div>

            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              {savedLists.length} 組清單
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {savedLists.map((list) => (
              <div key={list.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="font-black text-slate-900">{list.name}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                  {list.symbols}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  更新：{list.updatedAt || "-"}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setSymbols(list.symbols)}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
                  >
                    載入
                  </button>

                  <button
                    onClick={() => deleteSavedList(list.id)}
                    className="rounded-2xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-100"
                  >
                    刪除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {data?.error && (
          <section className="rounded-3xl border border-green-200 bg-green-50 p-5 text-green-700">
            <h2 className="font-black">讀取失敗</h2>
            <p className="mt-2 text-sm leading-6">{data.error}</p>
          </section>
        )}

        {data?.ok && (
          <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold text-blue-600">FLOW RESULTS</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">
                  法人籌碼掃描結果
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  資料來源：{data.source}｜使用日期：{formatDate(data.usedDate)}｜
                  買超累計：近 {data.accumulationDays || accumulationDays} 日
                </p>
              </div>

              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                {records.length} 檔
              </div>
            </div>

            {data.errors && data.errors.length > 0 && (
              <div className="mb-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                <p className="font-black">部分資料提醒</p>
                <div className="mt-2 space-y-1">
                  {data.errors.slice(0, 5).map((error, index) => (
                    <p key={`${error.symbol}-${index}`}>
                      {error.symbol}：{error.error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {records.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                找不到符合的股票。請確認代號是否正確。
              </div>
            ) : (
              <div className="grid gap-4">
                {records.map((record) => (
                  <FlowCard key={record.symbol} record={record} maxAbsLots={maxAbsLots} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
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

function Input({
  label,
  value,
  onChange,
  type = "text",
  note,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  note?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
      />
      {note && <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p>}
    </label>
  );
}

function FlowCard({ record, maxAbsLots }: { record: FlowRecord; maxAbsLots: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black text-slate-900">
              {record.symbol}{" "}
              <span className="font-medium text-slate-500">{record.name}</span>
            </h3>

            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getScoreClass(record.score)}`}>
              {record.signal}｜{record.score}
            </span>

            {record.baseScore !== undefined && record.baseScore !== record.score && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                單日 {record.baseScore} → 累計調整 {record.score}
              </span>
            )}
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600">{record.reason}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {record.strategies.length === 0 ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                #觀察
              </span>
            ) : (
              record.strategies.map((strategy) => (
                <span key={strategy} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  #{strategy}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
          <p className="text-xs text-slate-500">單日三大法人合計</p>
          <p className={`mt-1 text-xl font-black ${getLotsClass(record.totalNetLots)}`}>
            {formatSignedLots(record.totalNetLots)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {formatDate(record.date)}｜{record.sourceMode || "-"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <FlowMetric label="外資單日" value={formatSignedLots(record.foreignNetLots)} rawValue={record.foreignNetLots} maxAbsLots={maxAbsLots} />
        <FlowMetric label="投信單日" value={formatSignedLots(record.trustNetLots)} rawValue={record.trustNetLots} maxAbsLots={maxAbsLots} />
        <FlowMetric label="自營商單日" value={formatSignedLots(record.dealerNetLots)} rawValue={record.dealerNetLots} maxAbsLots={maxAbsLots} />
        <FlowMetric label="合計單日" value={formatSignedLots(record.totalNetLots)} rawValue={record.totalNetLots} maxAbsLots={maxAbsLots} />
      </div>

      <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black text-blue-600">RECENT ACCUMULATION</p>
            <h4 className="mt-1 text-lg font-black text-slate-900">
              最近 {record.accumulationDays || "-"} 日買超累計
            </h4>
          </div>

          <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
            {formatDate(record.recentStartDate)} → {formatDate(record.recentEndDate)}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <RecentMetric
            label="外資買超天數"
            value={`${record.recentForeignBuyDays || 0}/${record.recentFlowDays || 0}`}
            subValue={formatSignedLots(record.recentForeignNetLotsSum)}
            rawValue={record.recentForeignNetLotsSum || 0}
          />
          <RecentMetric
            label="投信買超天數"
            value={`${record.recentTrustBuyDays || 0}/${record.recentFlowDays || 0}`}
            subValue={formatSignedLots(record.recentTrustNetLotsSum)}
            rawValue={record.recentTrustNetLotsSum || 0}
          />
          <RecentMetric
            label="同步買超天數"
            value={`${record.recentSyncBuyDays || 0}/${record.recentFlowDays || 0}`}
            subValue={record.recentFlowSignal || "-"}
            rawValue={record.recentSyncBuyDays || 0}
          />
          <RecentMetric
            label="三大法人累計"
            value={formatSignedLots(record.recentTotalNetLotsSum)}
            subValue={`平均分數 ${formatNumber(record.recentFlowScoreAvg)}`}
            rawValue={record.recentTotalNetLotsSum || 0}
          />
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          {record.recentFlowNote}
        </p>
      </div>
    </div>
  );
}

function FlowMetric({
  label,
  value,
  rawValue,
  maxAbsLots,
}: {
  label: string;
  value: string;
  rawValue: number;
  maxAbsLots: number;
}) {
  const positive = rawValue >= 0;
  const width = makeBarHeight(rawValue, maxAbsLots);

  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-2 text-lg font-black ${getLotsClass(rawValue)}`}>{value}</p>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${positive ? "bg-red-500" : "bg-green-500"}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function RecentMetric({
  label,
  value,
  subValue,
  rawValue,
}: {
  label: string;
  value: string;
  subValue: string;
  rawValue: number;
}) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-black ${getLotsClass(rawValue)}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subValue}</p>
    </div>
  );
}