"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type BacktestSummary = {
  symbol?: string;
  stockName?: string;
  strategy?: string;
  annualReturn?: number;
  totalReturn?: number;
  benchmarkReturn?: number;
  alphaReturn?: number;
  maxDrawdown?: number;
  winRate?: number;
  profitFactor?: number;
  riskLevel?: string;
  currentSignal?: string;
  trades?: unknown[];
  finalEquity?: number;
};

type FlowRecord = {
  symbol?: string;
  name?: string;
  score?: number;
  signal?: string;
  reason?: string;
  foreignNetLots?: number;
  trustNetLots?: number;
  dealerNetLots?: number;
  totalNetLots?: number;
  recentFlowNote?: string;
};

type ResearchItem = {
  id: string;
  symbol: string;
  name: string;
  status: "watching" | "ready" | "entered" | "avoid";
  thesis: string;
  notes: string;
  tags: string[];
  entry?: number;
  stop?: number;
  target?: number;
  currentPrice?: number;
  score: number;
  flowScore?: number;
  flowSignal?: string;
  flowReason?: string;
  foreignNetLots?: number;
  trustNetLots?: number;
  dealerNetLots?: number;
  totalNetLots?: number;
  updatedAt: string;
  checklist: {
    trend: boolean;
    flow: boolean;
    base: boolean;
    risk: boolean;
    catalyst: boolean;
    valuation: boolean;
  };
};

const STORAGE_KEY = "stock-research-desk-pro-v1";

const strategies = [
  "MA20 / MA60 黃金交叉",
  "回測月線反彈",
  "突破 60 日新高",
  "投信連買 + 站上月線",
];

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function cleanSymbol(value: string) {
  return value.trim().toUpperCase().replace(".TW", "").replace(".TWO", "");
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatNumber(value?: number, digits = 1) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "-";
  }

  return value.toLocaleString("zh-TW", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatPct(value?: number, digits = 1) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "-";
  }

  return `${value.toFixed(digits)}%`;
}

function extractFirstFlowRecord(data: unknown): FlowRecord | undefined {
  if (Array.isArray(data)) {
    return data[0] as FlowRecord | undefined;
  }

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const candidates = [
      obj.records,
      obj.items,
      obj.data,
      obj.results,
      obj.flowRecords,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate[0] as FlowRecord | undefined;
      }
    }
  }

  return undefined;
}

function extractBacktestSummary(data: unknown): BacktestSummary {
  if (!data || typeof data !== "object") {
    return {};
  }

  const obj = data as Record<string, unknown>;

  if (obj.result && typeof obj.result === "object") {
    return obj.result as BacktestSummary;
  }

  if (obj.data && typeof obj.data === "object") {
    return obj.data as BacktestSummary;
  }

  return obj as BacktestSummary;
}

function calcPlan({
  accountSize,
  riskPct,
  entry,
  stop,
  target,
}: {
  accountSize: number;
  riskPct: number;
  entry?: number;
  stop?: number;
  target?: number;
}) {
  const maxRisk = accountSize * (riskPct / 100);

  if (!entry || !stop || entry <= 0 || stop <= 0) {
    return {
      maxRisk,
      riskPerShare: 0,
      shares: 0,
      lots: 0,
      capital: 0,
      rewardRisk: 0,
      stopLossPct: 0,
      upsidePct: 0,
    };
  }

  const riskPerShare = Math.abs(entry - stop);
  const shares = riskPerShare > 0 ? Math.floor(maxRisk / riskPerShare) : 0;
  const lots = Math.floor(shares / 1000);
  const capital = shares * entry;
  const rewardRisk =
    target && target > entry ? (target - entry) / riskPerShare : 0;
  const stopLossPct = ((entry - stop) / entry) * 100;
  const upsidePct = target ? ((target - entry) / entry) * 100 : 0;

  return {
    maxRisk,
    riskPerShare,
    shares,
    lots,
    capital,
    rewardRisk,
    stopLossPct,
    upsidePct,
  };
}

function makeResearchItem({
  symbol,
  name,
  entry,
  stop,
  target,
  thesis,
  flow,
  backtest,
}: {
  symbol: string;
  name: string;
  entry?: number;
  stop?: number;
  target?: number;
  thesis: string;
  flow?: FlowRecord;
  backtest?: BacktestSummary;
}): ResearchItem {
  const flowScore = flow?.score;
  const hasRisk = Boolean(entry && stop);
  const hasFlow = (flowScore ?? 0) >= 65;
  const hasTrend =
    (backtest?.annualReturn ?? 0) > 0 ||
    backtest?.currentSignal === "均線偏多" ||
    backtest?.currentSignal === "接近突破";

  return {
    id: uid(),
    symbol,
    name,
    status: hasRisk && hasFlow ? "ready" : "watching",
    thesis,
    notes: backtest?.currentSignal
      ? `目前訊號：${backtest.currentSignal}`
      : "",
    tags: ["stock-cockpit"],
    entry,
    stop,
    target,
    currentPrice: entry,
    score: 50,
    flowScore,
    flowSignal: flow?.signal,
    flowReason: flow?.reason || flow?.recentFlowNote,
    foreignNetLots: flow?.foreignNetLots,
    trustNetLots: flow?.trustNetLots,
    dealerNetLots: flow?.dealerNetLots,
    totalNetLots: flow?.totalNetLots,
    updatedAt: todayText(),
    checklist: {
      trend: hasTrend,
      flow: hasFlow,
      base: false,
      risk: hasRisk,
      catalyst: false,
      valuation: false,
    },
  };
}

export default function StockCockpit({
  initialSymbol,
}: {
  initialSymbol: string;
}) {
  const [symbol, setSymbol] = useState(cleanSymbol(initialSymbol || "2330"));
  const [strategy, setStrategy] = useState("MA20 / MA60 黃金交叉");
  const [capital, setCapital] = useState("1000000");
  const [positionSize, setPositionSize] = useState("20%");
  const [stopLoss, setStopLoss] = useState("8%");
  const [takeProfit, setTakeProfit] = useState("15%");
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("");
  const [fastMa, setFastMa] = useState("20");
  const [slowMa, setSlowMa] = useState("60");
  const [breakoutWindow, setBreakoutWindow] = useState("60");

  const [accountSize, setAccountSize] = useState(500000);
  const [riskPct, setRiskPct] = useState(1);
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");

  const [thesis, setThesis] = useState(
    "單股 Cockpit 觀察：等待回測、法人籌碼與風控條件同時確認。"
  );

  const [backtest, setBacktest] = useState<BacktestSummary | undefined>();
  const [flow, setFlow] = useState<FlowRecord | undefined>();
  const [loadingBacktest, setLoadingBacktest] = useState(false);
  const [loadingFlow, setLoadingFlow] = useState(false);
  const [message, setMessage] = useState("");

  const clean = cleanSymbol(symbol);

  const plan = useMemo(() => {
    return calcPlan({
      accountSize,
      riskPct,
      entry: toNumber(entry),
      stop: toNumber(stop),
      target: toNumber(target),
    });
  }, [accountSize, riskPct, entry, stop, target]);

  const stockName = flow?.name || backtest?.stockName || clean;

  async function runBacktest() {
    setLoadingBacktest(true);
    setMessage("正在執行單股回測...");

    try {
      const response = await fetch("/api/backtest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: clean,
          symbols: clean,
          strategy,
          capital,
          positionSize,
          stopLoss,
          takeProfit,
          startDate,
          endDate,
          fastMa,
          slowMa,
          breakoutWindow,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data?.error || data?.detail || "回測 API 錯誤。");
        return;
      }

      const summary = extractBacktestSummary(data);
      setBacktest(summary);

      if (!entry && typeof summary.totalReturn === "number") {
        setEntry("");
      }

      setMessage("回測完成。");
    } catch (error) {
      console.error(error);
      setMessage("回測失敗，請確認 API 設定與後端服務。");
    } finally {
      setLoadingBacktest(false);
    }
  }

  async function refreshFlow() {
    setLoadingFlow(true);
    setMessage("正在更新法人籌碼...");

    try {
      const response = await fetch("/api/institutional-flow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbols: clean,
          date: "",
          lookbackDays: 5,
          accumulationDays: 20,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data?.error || data?.detail || "法人籌碼 API 錯誤。");
        return;
      }

      const record = extractFirstFlowRecord(data);

      if (!record) {
        setMessage("法人籌碼查詢完成，但沒有 records。");
        return;
      }

      setFlow(record);
      setMessage("法人籌碼更新完成。");
    } catch (error) {
      console.error(error);
      setMessage("法人籌碼更新失敗，請確認 API 設定與後端服務。");
    } finally {
      setLoadingFlow(false);
    }
  }

  function addToResearchDesk() {
    const item = makeResearchItem({
      symbol: clean,
      name: stockName,
      entry: toNumber(entry),
      stop: toNumber(stop),
      target: toNumber(target),
      thesis,
      flow,
      backtest,
    });

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw
        ? (JSON.parse(raw) as {
            items?: ResearchItem[];
            accountSize?: number;
            riskPct?: number;
          })
        : {};

      const items = parsed.items || [];
      const exists = items.some((existing) => existing.symbol === clean);

      const nextItems = exists
        ? items.map((existing) =>
            existing.symbol === clean
              ? {
                  ...existing,
                  ...item,
                  id: existing.id,
                  notes: existing.notes || item.notes,
                  tags: Array.from(
                    new Set([...(existing.tags || []), "stock-cockpit"])
                  ),
                }
              : existing
          )
        : [item, ...items];

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          exportedAt: new Date().toISOString(),
          accountSize: parsed.accountSize || accountSize,
          riskPct: parsed.riskPct || riskPct,
          items: nextItems,
        })
      );

      setMessage(exists ? "已更新 Research Desk 既有標的。" : "已加入 Research Desk。");
    } catch {
      setMessage("加入 Research Desk 失敗。");
    }
  }

  function copyMarkdown() {
    const lines = [
      `# 單股研究：${clean} ${stockName}`,
      "",
      `日期：${todayText()}`,
      "",
      "## 回測摘要",
      `- 策略：${strategy}`,
      `- 年化報酬：${formatPct(backtest?.annualReturn)}`,
      `- 總報酬：${formatPct(backtest?.totalReturn)}`,
      `- Benchmark：${formatPct(backtest?.benchmarkReturn)}`,
      `- Alpha：${formatPct(backtest?.alphaReturn)}`,
      `- 最大回撤：${formatPct(backtest?.maxDrawdown)}`,
      `- 勝率：${formatPct(backtest?.winRate)}`,
      `- Profit Factor：${backtest?.profitFactor ?? "-"}`,
      `- 交易次數：${Array.isArray(backtest?.trades) ? backtest?.trades?.length : "-"}`,
      `- 目前訊號：${backtest?.currentSignal ?? "-"}`,
      "",
      "## 法人籌碼",
      `- 分數：${flow?.score ?? "-"}`,
      `- 訊號：${flow?.signal ?? "-"}`,
      `- 外資：${formatNumber(flow?.foreignNetLots)} 張`,
      `- 投信：${formatNumber(flow?.trustNetLots)} 張`,
      `- 自營商：${formatNumber(flow?.dealerNetLots)} 張`,
      `- 合計：${formatNumber(flow?.totalNetLots)} 張`,
      `- 理由：${flow?.reason || flow?.recentFlowNote || "-"}`,
      "",
      "## 交易計畫",
      `- 進場：${entry || "-"}`,
      `- 停損：${stop || "-"}`,
      `- 停利：${target || "-"}`,
      `- 單筆風險：${riskPct}%`,
      `- 最大虧損：${formatNumber(plan.maxRisk)} 元`,
      `- 建議股數：${formatNumber(plan.shares)} 股`,
      `- 建議張數：${formatNumber(plan.lots)} 張`,
      `- 預估投入：${formatNumber(plan.capital)} 元`,
      `- R/R：${plan.rewardRisk ? plan.rewardRisk.toFixed(2) : "-"}`,
      "",
      "## 研究理由",
      thesis || "-",
    ];

    navigator.clipboard
      .writeText(lines.join("\n"))
      .then(() => setMessage("Markdown 已複製。"))
      .catch(() => setMessage("複製失敗。"));
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
            Stock Cockpit
          </p>

          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black text-white">
                {clean} {stockName}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                單股研究駕駛艙：把回測、法人籌碼、交易計畫、部位控管與研究筆記集中在同一頁。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={runBacktest}
                disabled={loadingBacktest}
                className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
              >
                {loadingBacktest ? "回測中..." : "一鍵回測"}
              </button>

              <button
                onClick={refreshFlow}
                disabled={loadingFlow}
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15 disabled:opacity-60"
              >
                {loadingFlow ? "更新中..." : "更新法人"}
              </button>

              <button
                onClick={addToResearchDesk}
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15"
              >
                加入 Research Desk
              </button>

              <button
                onClick={copyMarkdown}
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15"
              >
                複製 Markdown
              </button>
            </div>
          </div>

          {message && (
            <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
              {message}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl">
              <h2 className="text-2xl font-black">股票與回測設定</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="股票代號" value={symbol} onChange={setSymbol} />
                <SelectField
                  label="策略"
                  value={strategy}
                  onChange={setStrategy}
                  options={strategies}
                />
                <Field label="資金" value={capital} onChange={setCapital} />
                <Field
                  label="持倉比例"
                  value={positionSize}
                  onChange={setPositionSize}
                />
                <Field label="停損" value={stopLoss} onChange={setStopLoss} />
                <Field label="停利" value={takeProfit} onChange={setTakeProfit} />
                <Field label="開始日期" value={startDate} onChange={setStartDate} />
                <Field
                  label="結束日期"
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="空白代表今天"
                />
                <Field label="快線 MA" value={fastMa} onChange={setFastMa} />
                <Field label="慢線 MA" value={slowMa} onChange={setSlowMa} />
                <Field
                  label="突破天期"
                  value={breakoutWindow}
                  onChange={setBreakoutWindow}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl">
              <h2 className="text-2xl font-black">交易計畫</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <NumberField label="帳戶資金" value={accountSize} onChange={setAccountSize} />
                <NumberField label="單筆風險 %" value={riskPct} onChange={setRiskPct} />
                <Field label="進場價" value={entry} onChange={setEntry} type="number" />
                <Field label="停損價" value={stop} onChange={setStop} type="number" />
                <Field label="停利價" value={target} onChange={setTarget} type="number" />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <Metric label="最大虧損" value={`${formatNumber(plan.maxRisk)} 元`} />
                <Metric label="建議股數" value={`${formatNumber(plan.shares)} 股`} />
                <Metric label="建議張數" value={`${formatNumber(plan.lots)} 張`} />
                <Metric label="預估投入" value={`${formatNumber(plan.capital)} 元`} />
                <Metric label="停損幅度" value={formatPct(plan.stopLossPct)} />
                <Metric
                  label="R/R"
                  value={plan.rewardRisk ? plan.rewardRisk.toFixed(2) : "-"}
                />
              </div>

              <label className="mt-5 block">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                  研究理由
                </span>
                <textarea
                  value={thesis}
                  onChange={(event) => setThesis(event.target.value)}
                  rows={5}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-cyan-200"
                />
              </label>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl">
              <h2 className="text-2xl font-black">回測摘要</h2>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <Metric label="年化報酬" value={formatPct(backtest?.annualReturn)} />
                <Metric label="總報酬" value={formatPct(backtest?.totalReturn)} />
                <Metric label="Benchmark" value={formatPct(backtest?.benchmarkReturn)} />
                <Metric label="Alpha" value={formatPct(backtest?.alphaReturn)} />
                <Metric label="最大回撤" value={formatPct(backtest?.maxDrawdown)} />
                <Metric label="勝率" value={formatPct(backtest?.winRate)} />
                <Metric label="Profit Factor" value={backtest?.profitFactor ?? "-"} />
                <Metric
                  label="交易次數"
                  value={Array.isArray(backtest?.trades) ? backtest?.trades?.length || 0 : "-"}
                />
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">目前訊號</p>
                <p className="mt-1 text-xl font-black text-blue-700">
                  {backtest?.currentSignal || "-"}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  風險等級：{backtest?.riskLevel || "-"}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl">
              <h2 className="text-2xl font-black">法人籌碼摘要</h2>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <Metric label="法人分數" value={flow?.score ?? "-"} />
                <Metric label="訊號" value={flow?.signal || "-"} />
                <Metric label="外資" value={`${formatNumber(flow?.foreignNetLots)} 張`} />
                <Metric label="投信" value={`${formatNumber(flow?.trustNetLots)} 張`} />
                <Metric label="自營商" value={`${formatNumber(flow?.dealerNetLots)} 張`} />
                <Metric label="合計" value={`${formatNumber(flow?.totalNetLots)} 張`} />
              </div>

              <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                {flow?.reason || flow?.recentFlowNote || "尚未更新法人籌碼。"}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl">
              <h2 className="text-2xl font-black">下一步</h2>

              <div className="mt-4 grid gap-3">
                <Link
                  href={`/flow-lab?symbols=${encodeURIComponent(clean)}`}
                  className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                >
                  前往 Flow Lab 查看更完整籌碼
                </Link>

                <Link
                  href="/research-desk"
                  className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                >
                  前往 Research Desk 編輯研究清單
                </Link>

                <Link
                  href="/quick-plan"
                  className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                >
                  前往 Quick Plan 微調部位
                </Link>

                <Link
                  href="/report-lab"
                  className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                >
                  前往 Report Lab 產生報告
                </Link>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label>
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-cyan-200"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-cyan-200"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label>
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-cyan-200"
      >
        {options.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    </label>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-slate-100 p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}