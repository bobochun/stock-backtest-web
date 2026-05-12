"use client";

import { useEffect, useMemo, useState } from "react";

type FlowRecord = {
  symbol: string;
  name: string;
  market: "TWSE";
  date: string;
  foreignNetLots: number;
  trustNetLots: number;
  dealerNetLots: number;
  totalNetLots: number;
  score: number;
  signal: string;
  strategies: string[];
  reason: string;
};

type FlowResponse = {
  ok: boolean;
  source?: string;
  market?: string;
  requestedDate?: string;
  usedDate?: string;
  count?: number;
  records?: FlowRecord[];
  error?: string;
};

const strategyCards = [
  {
    title: "外資投信同步買超",
    badge: "Chip Strong",
    description:
      "外資與投信同向買超，代表大型資金方向一致。適合搭配均線轉強、突破整理區或回測支撐。",
    rules: ["外資買超 > 1000 張", "投信買超 > 300 張", "三大法人合計買超"],
  },
  {
    title: "投信買超動能",
    badge: "Trust Flow",
    description:
      "投信通常偏向中期配置，若連續買超常容易形成中期趨勢。第一版先做單日買超，之後可加連買天數。",
    rules: ["投信買超 > 300 張", "股價不追高", "接近月線或季線更佳"],
  },
  {
    title: "外資回補策略",
    badge: "Foreign Rebound",
    description:
      "外資由賣轉買或大幅買超，常見於權值股、AI、半導體、金融股。適合搭配大盤轉強。",
    rules: ["外資買超 > 1000 張", "外資賣壓結束", "成交量回溫"],
  },
  {
    title: "法人賣超風險過濾",
    badge: "Risk Guard",
    description:
      "如果外資與投信同步賣超，就算技術線型漂亮，也先降低進場權重，避免被籌碼倒貨。",
    rules: ["外資賣超", "投信賣超", "跌破停損不凹單"],
  },
];

function formatDate(value?: string) {
  if (!value || value.length !== 8) return "-";

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function formatLots(value: number) {
  if (!Number.isFinite(value)) return "-";

  const rounded = Math.round(value);

  return `${rounded.toLocaleString("zh-TW")} 張`;
}

function formatSignedLots(value: number) {
  if (!Number.isFinite(value)) return "-";

  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";

  return `${sign}${rounded.toLocaleString("zh-TW")} 張`;
}

function getScoreClass(score: number) {
  if (score >= 80) return "bg-red-50 text-red-700 border-red-200";
  if (score >= 60) return "bg-amber-50 text-amber-700 border-amber-200";
  if (score >= 40) return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function getLotsClass(value: number) {
  if (value > 0) return "text-red-600";
  if (value < 0) return "text-green-600";
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

function makeBarHeight(value: number, maxAbs: number) {
  if (!Number.isFinite(value) || maxAbs <= 0) return 4;

  return Math.max(8, Math.min(100, (Math.abs(value) / maxAbs) * 100));
}

export default function InstitutionalFlowLab() {
  const [symbols, setSymbols] = useState(
    "2330, 2454, 2317, 2382, 2308, 2881, 2603"
  );
  const [date, setDate] = useState("");
  const [lookbackDays, setLookbackDays] = useState(7);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<FlowResponse | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const querySymbols = normalizeSymbolsFromQuery(params.get("symbols"));

    if (querySymbols) {
      setSymbols(querySymbols);
    }
  }, []);

  const records = data?.records || [];

  const summary = useMemo(() => {
    const strong = records.filter((item) => item.score >= 80).length;
    const bullish = records.filter((item) => item.score >= 60).length;
    const weak = records.filter((item) => item.score <= 20).length;
    const totalForeign = records.reduce(
      (sum, item) => sum + item.foreignNetLots,
      0
    );
    const totalTrust = records.reduce(
      (sum, item) => sum + item.trustNetLots,
      0
    );

    return {
      strong,
      bullish,
      weak,
      totalForeign,
      totalTrust,
    };
  }, [records]);

  const maxAbsLots = useMemo(() => {
    const values = records.flatMap((record) => [
      Math.abs(record.foreignNetLots),
      Math.abs(record.trustNetLots),
      Math.abs(record.dealerNetLots),
      Math.abs(record.totalNetLots),
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
                  連結外資、投信買賣超
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                這一頁把策略從單純技術線型，升級成「技術面 + 籌碼面」。
                從首頁策略選單點進來時，股票代號會自動帶入這裡。
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
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
              <div className="grid gap-3 md:grid-cols-2">
                <HeroMetric
                  label="強勢買盤"
                  value={`${summary.strong}`}
                  note="score ≥ 80"
                />
                <HeroMetric
                  label="偏多觀察"
                  value={`${summary.bullish}`}
                  note="score ≥ 60"
                />
                <HeroMetric
                  label="外資合計"
                  value={formatSignedLots(summary.totalForeign)}
                  note="目前清單"
                />
                <HeroMetric
                  label="投信合計"
                  value={formatSignedLots(summary.totalTrust)}
                  note="目前清單"
                />
              </div>

              <div className="mt-4 rounded-3xl bg-slate-900/80 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-slate-400">Flow Strength</p>
                  <p className="text-xs text-slate-500">
                    外資 / 投信籌碼視覺化
                  </p>
                </div>

                <div className="flex h-28 items-end gap-2">
                  {(records.length > 0
                    ? records.slice(0, 12).map((item) => item.totalNetLots)
                    : [42, 58, -49, 72, 63, 86, -78, 92, 69, 80, -74, 88]
                  ).map((value, index) => {
                    const positive = value >= 0;
                    const height =
                      records.length > 0
                        ? makeBarHeight(value, maxAbsLots)
                        : Math.abs(Number(value));

                    return (
                      <div
                        key={index}
                        className="flex flex-1 items-end rounded-full bg-white/10"
                      >
                        <div
                          className={`w-full rounded-full ${
                            positive ? "bg-red-400" : "bg-green-400"
                          }`}
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
            <div
              key={card.title}
              className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur"
            >
              <div className="mb-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {card.badge}
              </div>
              <h2 className="text-lg font-black text-slate-900">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {card.description}
              </p>

              <div className="mt-4 space-y-2">
                {card.rules.map((rule) => (
                  <div
                    key={rule}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    {rule}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr_0.5fr_auto]">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                股票清單
              </label>
              <textarea
                value={symbols}
                onChange={(event) => setSymbols(event.target.value)}
                className="h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="例如：2330, 2454, 2317"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                查詢日期
              </label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />

              <p className="mt-2 text-xs leading-5 text-slate-500">
                可留空，系統會用今天並往前找最近有資料的交易日。
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                回找天數
              </label>
              <input
                type="number"
                value={lookbackDays}
                onChange={(event) => setLookbackDays(Number(event.target.value))}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchFlow}
                disabled={isLoading}
                className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-700 disabled:opacity-60 lg:w-auto"
              >
                {isLoading ? "掃描中..." : "開始掃描"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <PresetButton
              label="權值 AI"
              onClick={() =>
                applyPreset("2330, 2454, 2317, 2382, 2308, 2357")
              }
            />
            <PresetButton
              label="金融股"
              onClick={() =>
                applyPreset("2881, 2882, 2884, 2885, 2886, 2891")
              }
            />
            <PresetButton
              label="航運股"
              onClick={() => applyPreset("2603, 2609, 2615, 2618")}
            />
            <PresetButton
              label="ETF"
              onClick={() => applyPreset("0050, 006208, 00878, 00919, 00929")}
            />
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
                  資料來源：{data.source}｜使用日期：{formatDate(data.usedDate)}
                </p>
              </div>

              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                {records.length} 檔
              </div>
            </div>

            {records.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                找不到符合的股票。請確認代號是否為上市股票，或放寬股票清單。
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

function HeroMetric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-xs text-slate-300">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{note}</p>
    </div>
  );
}

function PresetButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
    >
      {label}
    </button>
  );
}

function FlowCard({
  record,
  maxAbsLots,
}: {
  record: FlowRecord;
  maxAbsLots: number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black text-slate-900">
              {record.symbol}{" "}
              <span className="font-medium text-slate-500">{record.name}</span>
            </h3>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold ${getScoreClass(
                record.score
              )}`}
            >
              {record.signal}｜{record.score}
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {record.reason}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {record.strategies.length === 0 ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                #觀察
              </span>
            ) : (
              record.strategies.map((strategy) => (
                <span
                  key={strategy}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                >
                  #{strategy}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
          <p className="text-xs text-slate-500">三大法人合計</p>
          <p
            className={`mt-1 text-xl font-black ${getLotsClass(
              record.totalNetLots
            )}`}
          >
            {formatSignedLots(record.totalNetLots)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <FlowMetric
          label="外資"
          value={formatSignedLots(record.foreignNetLots)}
          rawValue={record.foreignNetLots}
          maxAbsLots={maxAbsLots}
        />
        <FlowMetric
          label="投信"
          value={formatSignedLots(record.trustNetLots)}
          rawValue={record.trustNetLots}
          maxAbsLots={maxAbsLots}
        />
        <FlowMetric
          label="自營商"
          value={formatSignedLots(record.dealerNetLots)}
          rawValue={record.dealerNetLots}
          maxAbsLots={maxAbsLots}
        />
        <FlowMetric
          label="合計"
          value={formatSignedLots(record.totalNetLots)}
          rawValue={record.totalNetLots}
          maxAbsLots={maxAbsLots}
        />
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
      <p className={`mt-2 text-lg font-black ${getLotsClass(rawValue)}`}>
        {value}
      </p>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${positive ? "bg-red-500" : "bg-green-500"}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}