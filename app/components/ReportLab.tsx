"use client";

import { useMemo, useState } from "react";

type EquityPoint = {
  date: string;
  strategy: number;
  benchmark?: number;
};

type TradeRecord = {
  id?: number;
  symbol?: string;
  stockName?: string;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  shares: number;
  pnl: number;
  pnlPct: number;
  result: string;
  entryFlowSignal?: string;
  entryFlowScore?: number;
  exitFlowSignal?: string;
  exitFlowScore?: number;
};

type BacktestResult = {
  symbol: string;
  stockName: string;
  strategy: string;
  annualReturn: number;
  maxDrawdown: number;
  winRate: number;
  trades: number;
  opportunityScore?: number;
  currentSignal?: string;
  lastClose?: number;
  ma20?: number | null;
  ma60?: number | null;
  flowEnabled?: boolean;
  flowSignal?: string;
  flowScoreAvg?: number;
  foreignNetLotsSum?: number;
  trustNetLotsSum?: number;
  profitFactor?: number;
  sharpeRatio?: number;
  totalReturn?: number;
};

type BacktestResponse = {
  result: BacktestResult;
  equityCurve: EquityPoint[];
  tradeRecords: TradeRecord[];
};

type MonthlyReturn = {
  month: string;
  value: number;
};

type YearlyReturn = {
  year: string;
  start: number;
  end: number;
  returnPct: number;
};

type DrawdownPoint = {
  date: string;
  equity: number;
  peak: number;
  drawdownPct: number;
};

type DrawdownPeriod = {
  startDate: string;
  endDate: string;
  troughDate: string;
  maxDrawdownPct: number;
  days: number;
};

const strategyOptions = [
  "MA20 / MA60 黃金交叉",
  "MA5 / MA20 短線轉強",
  "突破整理區策略",
  "創 20 日新高動能策略",
  "RSI 低檔反彈策略",
  "布林通道下緣反彈",
  "KD 低檔黃金交叉",
  "外資投信同步買超 + MA20 趨勢過濾",
  "投信連買動能 + 月線防守",
  "外資回補反彈 + RSI 低檔轉強",
  "三大法人合計買超 + 突破整理",
  "外資投信同步賣超風險過濾",
  "Buy and Hold 長期持有",
  "ETF 回檔分批加碼",
];

function defaultStartDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 3);
  return date.toISOString().slice(0, 10);
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseNumber(value: string) {
  const parsed = Number(String(value).replaceAll(",", "").replaceAll("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return `NT$${Math.round(value).toLocaleString("zh-TW")}`;
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return value.toLocaleString("zh-TW", { maximumFractionDigits: 2 });
}

function formatPct(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function monthKey(date: string) {
  return String(date || "").slice(0, 7);
}

function yearKey(date: string) {
  return String(date || "").slice(0, 4);
}

function calculateMonthlyReturns(curve: EquityPoint[]): MonthlyReturn[] {
  const grouped = new Map<string, EquityPoint[]>();

  curve.forEach((point) => {
    const key = monthKey(point.date);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(point);
  });

  return Array.from(grouped.entries()).map(([month, points]) => {
    const first = points[0];
    const last = points[points.length - 1];
    const value =
      first.strategy > 0 ? (last.strategy / first.strategy - 1) * 100 : 0;

    return {
      month,
      value,
    };
  });
}

function calculateYearlyReturns(curve: EquityPoint[]): YearlyReturn[] {
  const grouped = new Map<string, EquityPoint[]>();

  curve.forEach((point) => {
    const key = yearKey(point.date);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(point);
  });

  return Array.from(grouped.entries()).map(([year, points]) => {
    const first = points[0];
    const last = points[points.length - 1];
    const returnPct =
      first.strategy > 0 ? (last.strategy / first.strategy - 1) * 100 : 0;

    return {
      year,
      start: first.strategy,
      end: last.strategy,
      returnPct,
    };
  });
}

function calculateDrawdown(curve: EquityPoint[]): DrawdownPoint[] {
  let peak = 0;

  return curve.map((point) => {
    peak = Math.max(peak, point.strategy);
    const drawdownPct = peak > 0 ? (point.strategy / peak - 1) * 100 : 0;

    return {
      date: point.date,
      equity: point.strategy,
      peak,
      drawdownPct,
    };
  });
}

function calculateDrawdownPeriods(drawdown: DrawdownPoint[]): DrawdownPeriod[] {
  const periods: DrawdownPeriod[] = [];
  let inDrawdown = false;
  let startDate = "";
  let troughDate = "";
  let maxDrawdownPct = 0;
  let startIndex = 0;

  drawdown.forEach((point, index) => {
    if (!inDrawdown && point.drawdownPct < 0) {
      inDrawdown = true;
      startDate = point.date;
      troughDate = point.date;
      maxDrawdownPct = point.drawdownPct;
      startIndex = index;
    }

    if (inDrawdown && point.drawdownPct < maxDrawdownPct) {
      maxDrawdownPct = point.drawdownPct;
      troughDate = point.date;
    }

    const recovered = inDrawdown && point.drawdownPct >= -0.01;
    const lastPoint = index === drawdown.length - 1;

    if (inDrawdown && (recovered || lastPoint)) {
      periods.push({
        startDate,
        endDate: point.date,
        troughDate,
        maxDrawdownPct,
        days: Math.max(1, index - startIndex + 1),
      });

      inDrawdown = false;
      startDate = "";
      troughDate = "";
      maxDrawdownPct = 0;
      startIndex = 0;
    }
  });

  return periods
    .sort((a, b) => a.maxDrawdownPct - b.maxDrawdownPct)
    .slice(0, 5);
}

function riskGrade(result?: BacktestResult) {
  if (!result) {
    return {
      label: "-",
      score: 0,
      tone: "bg-slate-100 text-slate-600 border-slate-200",
    };
  }

  let score = 50;

  score += Math.max(-25, Math.min(25, result.annualReturn || 0));
  score += Math.max(-20, Math.min(20, (result.winRate || 0) - 50));
  score -= Math.min(30, Math.abs(result.maxDrawdown || 0));

  if ((result.profitFactor || 0) >= 1.5) score += 10;
  if ((result.opportunityScore || 0) >= 70) score += 10;
  if ((result.flowScoreAvg || 50) >= 65) score += 5;

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (score >= 80) {
    return {
      label: "A 穩健偏強",
      score,
      tone: "bg-red-50 text-red-700 border-red-200",
    };
  }

  if (score >= 65) {
    return {
      label: "B 可觀察",
      score,
      tone: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }

  if (score >= 50) {
    return {
      label: "C 中性",
      score,
      tone: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  return {
    label: "D 風險偏高",
    score,
    tone: "bg-slate-50 text-slate-600 border-slate-200",
  };
}

function heatClass(value: number) {
  if (value >= 8) return "bg-red-600 text-white";
  if (value >= 4) return "bg-red-300 text-red-950";
  if (value > 0) return "bg-red-100 text-red-700";
  if (value <= -8) return "bg-green-700 text-white";
  if (value <= -4) return "bg-green-300 text-green-950";
  if (value < 0) return "bg-green-100 text-green-700";
  return "bg-slate-100 text-slate-500";
}

function extractErrorMessage(json: unknown) {
  if (typeof json === "string") return json;

  if (json && typeof json === "object") {
    const objectValue = json as Record<string, unknown>;

    if (typeof objectValue.detail === "string") return objectValue.detail;
    if (typeof objectValue.error === "string") return objectValue.error;
    if (typeof objectValue.message === "string") return objectValue.message;

    if (Array.isArray(objectValue.detail)) {
      return objectValue.detail
        .map((item) => {
          if (item && typeof item === "object") {
            const errorItem = item as Record<string, unknown>;
            return `${JSON.stringify(errorItem.loc || "")}: ${
              errorItem.msg || JSON.stringify(errorItem)
            }`;
          }

          return String(item);
        })
        .join("\n");
    }

    return JSON.stringify(json, null, 2);
  }

  return "未知錯誤";
}

function normalizeBacktestResponse(json: unknown): BacktestResponse | null {
  if (!json || typeof json !== "object") return null;

  const objectValue = json as Record<string, unknown>;

  const result = objectValue.result;
  const equityCurve = objectValue.equityCurve;
  const tradeRecords = objectValue.tradeRecords;

  if (
    result &&
    typeof result === "object" &&
    Array.isArray(equityCurve) &&
    Array.isArray(tradeRecords)
  ) {
    return json as BacktestResponse;
  }

  return null;
}

export default function ReportLab() {
  const [symbol, setSymbol] = useState("2330");
  const [strategy, setStrategy] = useState("MA20 / MA60 黃金交叉");
  const [capital, setCapital] = useState("1000000");
  const [positionSize, setPositionSize] = useState("20");
  const [stopLoss, setStopLoss] = useState("8");
  const [takeProfit, setTakeProfit] = useState("15");
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState(todayDate());
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<BacktestResponse | null>(null);
  const [lastError, setLastError] = useState("");

  const monthlyReturns = useMemo(
    () => calculateMonthlyReturns(data?.equityCurve || []),
    [data]
  );

  const yearlyReturns = useMemo(
    () => calculateYearlyReturns(data?.equityCurve || []),
    [data]
  );

  const drawdown = useMemo(
    () => calculateDrawdown(data?.equityCurve || []),
    [data]
  );

  const drawdownPeriods = useMemo(
    () => calculateDrawdownPeriods(drawdown),
    [drawdown]
  );

  const bestTrades = useMemo(
    () =>
      [...(data?.tradeRecords || [])]
        .sort((a, b) => b.pnl - a.pnl)
        .slice(0, 5),
    [data]
  );

  const worstTrades = useMemo(
    () =>
      [...(data?.tradeRecords || [])]
        .sort((a, b) => a.pnl - b.pnl)
        .slice(0, 5),
    [data]
  );

  const grade = useMemo(() => riskGrade(data?.result), [data]);

  const reportText = useMemo(() => {
    if (!data) return "";

    const result = data.result;

    return [
      `【${result.symbol} ${result.stockName} 回測報告】`,
      `策略：${result.strategy}`,
      `期間：${startDate} 至 ${endDate}`,
      `年化報酬：${formatPct(result.annualReturn)}`,
      `最大回撤：${formatPct(result.maxDrawdown)}`,
      `勝率：${formatPct(result.winRate)}`,
      `交易次數：${result.trades}`,
      `風險評級：${grade.label}（${grade.score}/100）`,
      `目前訊號：${result.currentSignal || "-"}`,
      result.flowEnabled
        ? `法人籌碼：${result.flowSignal || "-"}，平均分數 ${
            result.flowScoreAvg ?? "-"
          }`
        : `法人籌碼：未啟用`,
      "",
      "最佳交易：",
      ...bestTrades.map(
        (trade) =>
          `- ${trade.entryDate} → ${trade.exitDate}，${formatMoney(
            trade.pnl
          )}，${formatPct(trade.pnlPct)}`
      ),
      "",
      "最差交易：",
      ...worstTrades.map(
        (trade) =>
          `- ${trade.entryDate} → ${trade.exitDate}，${formatMoney(
            trade.pnl
          )}，${formatPct(trade.pnlPct)}`
      ),
    ].join("\n");
  }, [data, startDate, endDate, bestTrades, worstTrades, grade]);

  async function runReport() {
    setIsLoading(true);
    setLastError("");

    try {
      const payload = {
        symbol,
        strategy,
        capital,
        positionSize,
        stopLoss,
        takeProfit,
        startDate,
        endDate,
      };

      const response = await fetch("/api/backtest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const text = await response.text();

      let json: unknown;

      try {
        json = JSON.parse(text);
      } catch {
        const message = `後端回傳不是 JSON。\n\nHTTP ${response.status}\n\n${text.slice(
          0,
          1000
        )}`;

        setLastError(message);
        alert(`回測報告產生失敗：\n\n${message}`);
        return;
      }

      if (!response.ok) {
        const message = `HTTP ${response.status}\n\n${extractErrorMessage(
          json
        )}`;

        setLastError(message);
        alert(`回測報告產生失敗：\n\n${message}`);
        return;
      }

      const normalized = normalizeBacktestResponse(json);

      if (!normalized) {
        const message = `回傳格式不符合預期。\n\n${JSON.stringify(
          json,
          null,
          2
        ).slice(0, 1500)}`;

        setLastError(message);
        alert(`回測報告產生失敗：\n\n${message}`);
        return;
      }

      setData(normalized);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "未知連線錯誤";

      setLastError(message);
      alert(`無法連線到回測 API：\n\n${message}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function copyReport() {
    if (!reportText) {
      alert("請先產生報告");
      return;
    }

    await navigator.clipboard.writeText(reportText);
    alert("文字報告已複製");
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
                PROFESSIONAL BACKTEST REPORT
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-5xl">
                專業回測報告中心
                <span className="block text-red-300">
                  績效 × 回撤 × 交易品質
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                把單次回測結果轉成更像付費網站的報告格式，包含年度績效、月報酬熱力圖、回撤分析、最佳與最差交易。
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={runReport}
                  disabled={isLoading}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:opacity-60"
                >
                  {isLoading ? "產生中..." : "產生回測報告"}
                </button>

                <button
                  onClick={copyReport}
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  複製文字報告
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
                  label="年化報酬"
                  value={formatPct(data?.result.annualReturn)}
                  note="Annual return"
                />
                <HeroMetric
                  label="最大回撤"
                  value={formatPct(data?.result.maxDrawdown)}
                  note="Max drawdown"
                />
                <HeroMetric
                  label="勝率"
                  value={formatPct(data?.result.winRate)}
                  note="Win rate"
                />
                <HeroMetric
                  label="交易次數"
                  value={`${data?.result.trades || 0}`}
                  note="Trades"
                />
              </div>

              <div className={`mt-4 rounded-3xl border p-4 ${grade.tone}`}>
                <p className="text-xs font-bold">REPORT GRADE</p>
                <p className="mt-2 text-3xl font-black">{grade.label}</p>
                <p className="mt-1 text-sm">風險分數：{grade.score}/100</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input label="股票代號" value={symbol} onChange={setSymbol} />

            <Select
              label="策略"
              value={strategy}
              onChange={setStrategy}
              options={strategyOptions}
            />

            <Input label="初始資金" value={capital} onChange={setCapital} />
            <Input
              label="單檔部位 %"
              value={positionSize}
              onChange={setPositionSize}
            />
            <Input label="停損 %" value={stopLoss} onChange={setStopLoss} />
            <Input label="停利 %" value={takeProfit} onChange={setTakeProfit} />
            <Input
              label="開始日期"
              value={startDate}
              onChange={setStartDate}
              type="date"
            />
            <Input
              label="結束日期"
              value={endDate}
              onChange={setEndDate}
              type="date"
            />
          </div>

          {lastError && (
            <div className="mt-4 rounded-3xl border border-green-200 bg-green-50 p-4 text-green-700">
              <p className="font-black">最新錯誤訊息</p>
              <pre className="mt-2 whitespace-pre-wrap text-xs leading-5">
                {lastError}
              </pre>
            </div>
          )}
        </section>

        {data && (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="目前訊號"
                value={data.result.currentSignal || "-"}
                note="Current signal"
              />
              <SummaryCard
                label="機會分數"
                value={`${data.result.opportunityScore ?? "-"}`}
                note="Opportunity score"
              />
              <SummaryCard
                label="法人籌碼"
                value={data.result.flowSignal || "未啟用"}
                note={`Flow score ${data.result.flowScoreAvg ?? "-"}`}
              />
              <SummaryCard
                label="最後收盤"
                value={formatNumber(data.result.lastClose)}
                note={`MA20 ${formatNumber(data.result.ma20)}`}
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
                <h2 className="text-xl font-black text-slate-900">年度績效</h2>

                <div className="mt-4 grid gap-3">
                  {yearlyReturns.map((row) => (
                    <div key={row.year} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-700">{row.year}</p>
                        <p
                          className={`font-black ${
                            row.returnPct >= 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {formatPct(row.returnPct)}
                        </p>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full ${
                            row.returnPct >= 0 ? "bg-red-500" : "bg-green-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(5, Math.abs(row.returnPct) * 2)
                            )}%`,
                          }}
                        />
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        {formatMoney(row.start)} → {formatMoney(row.end)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
                <h2 className="text-xl font-black text-slate-900">
                  月報酬熱力圖
                </h2>

                <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                  {monthlyReturns.map((row) => (
                    <div
                      key={row.month}
                      className={`rounded-2xl p-3 ${heatClass(row.value)}`}
                    >
                      <p className="text-xs font-bold opacity-80">{row.month}</p>
                      <p className="mt-1 text-lg font-black">
                        {formatPct(row.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
                <h2 className="text-xl font-black text-slate-900">回撤分析</h2>

                <div className="mt-4 rounded-3xl bg-slate-950 p-4">
                  <p className="text-xs font-bold text-slate-400">
                    Underwater Chart
                  </p>

                  <div className="mt-4 flex h-40 items-end gap-1">
                    {drawdown.slice(-80).map((point, index) => (
                      <div
                        key={`${point.date}-${index}`}
                        className="flex flex-1 items-end rounded-full bg-white/10"
                      >
                        <div
                          className="w-full rounded-full bg-green-400"
                          style={{
                            height: `${Math.max(
                              3,
                              Math.min(100, Math.abs(point.drawdownPct) * 3)
                            )}%`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {drawdownPeriods.map((period) => (
                    <div
                      key={`${period.startDate}-${period.troughDate}`}
                      className="rounded-2xl bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-slate-700">
                          {period.startDate} → {period.endDate}
                        </p>
                        <p className="font-black text-green-600">
                          {formatPct(period.maxDrawdownPct)}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        谷底：{period.troughDate}｜期間：{period.days} 筆資料
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
                <h2 className="text-xl font-black text-slate-900">交易品質</h2>

                <div className="mt-4 grid gap-3">
                  <MiniMetric
                    label="Profit Factor"
                    value={formatNumber(data.result.profitFactor)}
                  />
                  <MiniMetric
                    label="Sharpe Ratio"
                    value={formatNumber(data.result.sharpeRatio)}
                  />
                  <MiniMetric
                    label="總交易"
                    value={`${data.tradeRecords.length}`}
                  />
                  <MiniMetric
                    label="最大回撤"
                    value={formatPct(data.result.maxDrawdown)}
                  />
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <TradeTable title="最佳交易 Top 5" rows={bestTrades} />
              <TradeTable title="最差交易 Top 5" rows={worstTrades} />
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
              <h2 className="text-xl font-black text-slate-900">可複製報告</h2>
              <textarea
                value={reportText}
                readOnly
                className="mt-4 h-72 w-full rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-700"
              />
            </section>
          </>
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

function SummaryCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function TradeTable({
  title,
  rows,
}: {
  title: string;
  rows: TradeRecord[];
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
      <h2 className="text-xl font-black text-slate-900">{title}</h2>

      <div className="mt-4 grid gap-3">
        {rows.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            尚無交易紀錄。
          </div>
        ) : (
          rows.map((trade, index) => (
            <div
              key={`${trade.entryDate}-${trade.exitDate}-${index}`}
              className="rounded-2xl bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-slate-700">
                  {trade.entryDate} → {trade.exitDate}
                </p>
                <p
                  className={`font-black ${
                    trade.pnl >= 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {formatMoney(trade.pnl)}
                </p>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                {formatNumber(trade.entryPrice)} →{" "}
                {formatNumber(trade.exitPrice)}｜{trade.shares} 股｜
                {formatPct(trade.pnlPct)}
              </p>

              {trade.entryFlowSignal && (
                <p className="mt-1 text-xs text-slate-500">
                  進場法人：{trade.entryFlowSignal}｜分數{" "}
                  {trade.entryFlowScore}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </section>
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
      <span className="mb-1 block text-sm font-bold text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}

function Select({
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
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}