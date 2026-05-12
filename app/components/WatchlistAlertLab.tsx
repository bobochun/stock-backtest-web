"use client";

import { useEffect, useMemo, useState } from "react";

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

type QuoteResult = {
  symbol: string;
  stockName: string;
  market?: string;
  securityType?: string;
  tickerUsed?: string;
  lastClose: number;
  lastDate: string;
  error?: string;
};

type SuggestedLevels = {
  entryPrice: string;
  stopLossPrice: string;
  targetPrice: string;
  logic: string;
};

type AlertKind =
  | "entry"
  | "near"
  | "stop"
  | "target"
  | "watch"
  | "paused"
  | "missing";

type AlertStatus = {
  kind: AlertKind;
  label: string;
  description: string;
  tone: string;
  badge: string;
  priority: number;
};

const STORAGE_KEY = "stock-backtest-web-watchlist-alerts-v3";

const strategyOptions = [
  "外資投信同步買超 + MA20 趨勢過濾",
  "投信連買動能 + 月線防守",
  "外資回補反彈 + RSI 低檔轉強",
  "三大法人合計買超 + 突破整理",
  "外資投信同步賣超風險過濾",
  "MA20 / MA60 黃金交叉",
  "突破整理區策略",
  "RSI 低檔反彈策略",
  "ETF 回檔分批加碼",
  "高殖利率低波動策略",
];

const defaultItems: WatchItem[] = [
  {
    id: "watch-2330",
    symbol: "2330",
    name: "台積電",
    strategy: "外資投信同步買超 + MA20 趨勢過濾",
    currentPrice: "950",
    entryPrice: "931",
    stopLossPrice: "884",
    targetPrice: "1064",
    positionAmount: "100000",
    note: "觀察回測月線附近，若法人籌碼轉強再考慮分批。",
    tags: "AI, 半導體, 權值股",
    active: true,
    updatedAt: "",
    quoteDate: "",
  },
  {
    id: "watch-0050",
    symbol: "0050",
    name: "元大台灣50",
    strategy: "ETF 回檔分批加碼",
    currentPrice: "180",
    entryPrice: "174.6",
    stopLossPrice: "162",
    targetPrice: "198",
    positionAmount: "50000",
    note: "長期核心 ETF，接近月線或大盤回檔時分批。",
    tags: "ETF, 長期, 核心部位",
    active: true,
    updatedAt: "",
    quoteDate: "",
  },
];

function nowText() {
  return new Date().toLocaleString("zh-TW", {
    hour12: false,
  });
}

function createId() {
  return `watch-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseNumber(value: string) {
  const cleaned = String(value || "")
    .replaceAll(",", "")
    .replaceAll("，", "")
    .trim();

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "-";
  return Math.round(value).toLocaleString("zh-TW");
}

function formatPrice(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "-";

  return value.toLocaleString("zh-TW", {
    maximumFractionDigits: 2,
  });
}

function formatPct(value: number) {
  if (!Number.isFinite(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function getDistancePct(current: number, target: number) {
  if (!current || !target) return 0;
  return (current / target - 1) * 100;
}

function roundTaiwanPrice(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";

  if (value < 50) return value.toFixed(2);
  if (value < 500) return value.toFixed(1);

  return Math.round(value).toString();
}

function getSuggestedLevels(price: number, strategy: string): SuggestedLevels {
  if (!Number.isFinite(price) || price <= 0) {
    return {
      entryPrice: "",
      stopLossPrice: "",
      targetPrice: "",
      logic: "尚未有現價，無法自動計算。",
    };
  }

  const text = strategy || "";

  let entryMultiplier = 0.98;
  let stopMultiplier = 0.93;
  let targetMultiplier = 1.12;
  let logic = "趨勢 / 法人策略：回檔 2% 作為買點，停損約 7%，停利約 12%。";

  if (text.includes("ETF")) {
    entryMultiplier = 0.97;
    stopMultiplier = 0.9;
    targetMultiplier = 1.1;
    logic = "ETF 策略：回檔 3% 分批，停損約 10%，停利約 10%。";
  } else if (text.includes("突破") || text.includes("新高")) {
    entryMultiplier = 0.995;
    stopMultiplier = 0.94;
    targetMultiplier = 1.15;
    logic = "突破策略：買點接近現價，停損約 6%，停利約 15%。";
  } else if (
    text.includes("RSI") ||
    text.includes("KD") ||
    text.includes("低檔") ||
    text.includes("反彈") ||
    text.includes("回檔")
  ) {
    entryMultiplier = 0.96;
    stopMultiplier = 0.91;
    targetMultiplier = 1.1;
    logic = "低接 / 反彈策略：回檔 4% 作為買點，停損約 9%，停利約 10%。";
  } else if (text.includes("高殖利率") || text.includes("低波動")) {
    entryMultiplier = 0.98;
    stopMultiplier = 0.92;
    targetMultiplier = 1.08;
    logic = "高殖利率低波動策略：回檔 2% 作為買點，停損約 8%，停利約 8%。";
  } else if (
    text.includes("外資") ||
    text.includes("投信") ||
    text.includes("法人")
  ) {
    entryMultiplier = 0.98;
    stopMultiplier = 0.93;
    targetMultiplier = 1.12;
    logic = "法人籌碼策略：回檔 2% 作為買點，停損約 7%，停利約 12%。";
  } else if (text.includes("MA20") || text.includes("MA60")) {
    entryMultiplier = 0.98;
    stopMultiplier = 0.93;
    targetMultiplier = 1.12;
    logic = "均線趨勢策略：回檔 2% 作為買點，停損約 7%，停利約 12%。";
  }

  return {
    entryPrice: roundTaiwanPrice(price * entryMultiplier),
    stopLossPrice: roundTaiwanPrice(price * stopMultiplier),
    targetPrice: roundTaiwanPrice(price * targetMultiplier),
    logic,
  };
}

function getStatus(item: WatchItem, tolerancePct: number): AlertStatus {
  if (!item.active) {
    return {
      kind: "paused",
      label: "暫停觀察",
      description: "這檔目前沒有啟用提醒。",
      tone: "border-slate-200 bg-slate-50 text-slate-600",
      badge: "bg-slate-100 text-slate-600",
      priority: 0,
    };
  }

  const current = parseNumber(item.currentPrice);
  const entry = parseNumber(item.entryPrice);
  const stop = parseNumber(item.stopLossPrice);
  const target = parseNumber(item.targetPrice);

  if (!current || !entry) {
    return {
      kind: "missing",
      label: "資料不足",
      description:
        "請至少填入現價與理想買點，或按「自動帶入資料」取得最新收盤價與建議價位。",
      tone: "border-slate-200 bg-slate-50 text-slate-600",
      badge: "bg-slate-100 text-slate-600",
      priority: 1,
    };
  }

  if (stop > 0 && current <= stop) {
    return {
      kind: "stop",
      label: "跌破停損",
      description: `現價 ${formatPrice(current)} 已低於停損 ${formatPrice(
        stop
      )}，需要檢查是否出場或降低部位。`,
      tone: "border-green-200 bg-green-50 text-green-700",
      badge: "bg-green-100 text-green-700",
      priority: 5,
    };
  }

  if (target > 0 && current >= target) {
    return {
      kind: "target",
      label: "達到停利",
      description: `現價 ${formatPrice(current)} 已達目標價 ${formatPrice(
        target
      )}，可考慮分批停利或移動停損。`,
      tone: "border-blue-200 bg-blue-50 text-blue-700",
      badge: "bg-blue-100 text-blue-700",
      priority: 4,
    };
  }

  const nearEntryPrice = entry * (1 + tolerancePct / 100);

  if (current <= entry) {
    return {
      kind: "entry",
      label: "進入買點",
      description: `現價 ${formatPrice(current)} 已低於或等於理想買點 ${formatPrice(
        entry
      )}，可以搭配法人籌碼與大盤確認。`,
      tone: "border-red-200 bg-red-50 text-red-700",
      badge: "bg-red-100 text-red-700",
      priority: 5,
    };
  }

  if (current <= nearEntryPrice) {
    return {
      kind: "near",
      label: "接近買點",
      description: `現價距離理想買點約 ${formatPct(
        getDistancePct(current, entry)
      )}，已進入提醒範圍。`,
      tone: "border-amber-200 bg-amber-50 text-amber-700",
      badge: "bg-amber-100 text-amber-700",
      priority: 3,
    };
  }

  return {
    kind: "watch",
    label: "等待回測",
    description: `現價仍高於理想買點 ${formatPct(
      getDistancePct(current, entry)
    )}，先列入觀察。`,
    tone: "border-slate-200 bg-white text-slate-700",
    badge: "bg-slate-100 text-slate-600",
    priority: 2,
  };
}

function makeBlankItem(): WatchItem {
  return {
    id: createId(),
    symbol: "",
    name: "",
    strategy: "外資投信同步買超 + MA20 趨勢過濾",
    currentPrice: "",
    entryPrice: "",
    stopLossPrice: "",
    targetPrice: "",
    positionAmount: "50000",
    note: "",
    tags: "",
    active: true,
    updatedAt: nowText(),
    quoteDate: "",
  };
}

async function fetchQuote(symbol: string): Promise<QuoteResult> {
  const cleanSymbol = symbol.trim();

  if (!cleanSymbol) {
    throw new Error("請先輸入股票代號");
  }

  const response = await fetch(
    `/api/quote?symbol=${encodeURIComponent(cleanSymbol)}`,
    {
      cache: "no-store",
    }
  );

  const data = (await response.json()) as QuoteResult;

  if (!response.ok) {
    throw new Error(data.error || "查詢失敗");
  }

  return data;
}

export default function WatchlistAlertLab() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<WatchItem[]>([]);
  const [draft, setDraft] = useState<WatchItem>(makeBlankItem());
  const [tolerancePct, setTolerancePct] = useState(3);
  const [filter, setFilter] = useState<"all" | AlertKind>("all");
  const [importText, setImportText] = useState("");
  const [loadingQuoteId, setLoadingQuoteId] = useState<string | null>(null);

  const draftSuggestion = useMemo(() => {
    return getSuggestedLevels(parseNumber(draft.currentPrice), draft.strategy);
  }, [draft.currentPrice, draft.strategy]);

  useEffect(() => {
    setMounted(true);

    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setItems(parsed);
          return;
        }
      }

      const oldSaved = localStorage.getItem(
        "stock-backtest-web-watchlist-alerts-v2"
      );

      if (oldSaved) {
        const parsed = JSON.parse(oldSaved);

        if (Array.isArray(parsed)) {
          setItems(parsed);
          return;
        }
      }

      const olderSaved = localStorage.getItem(
        "stock-backtest-web-watchlist-alerts-v1"
      );

      if (olderSaved) {
        const parsed = JSON.parse(olderSaved);

        if (Array.isArray(parsed)) {
          setItems(parsed);
          return;
        }
      }
    } catch {
      // ignore invalid localStorage
    }

    setItems(
      defaultItems.map((item) => ({
        ...item,
        updatedAt: nowText(),
      }))
    );
  }, []);

  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, mounted]);

  const enrichedItems = useMemo(() => {
    return items
      .map((item) => ({
        item,
        status: getStatus(item, tolerancePct),
      }))
      .sort((a, b) => b.status.priority - a.status.priority);
  }, [items, tolerancePct]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return enrichedItems;

    return enrichedItems.filter(({ status }) => status.kind === filter);
  }, [enrichedItems, filter]);

  const summary = useMemo(() => {
    const active = enrichedItems.filter(({ item }) => item.active).length;
    const entry = enrichedItems.filter(
      ({ status }) => status.kind === "entry"
    ).length;
    const near = enrichedItems.filter(
      ({ status }) => status.kind === "near"
    ).length;
    const stop = enrichedItems.filter(
      ({ status }) => status.kind === "stop"
    ).length;
    const target = enrichedItems.filter(
      ({ status }) => status.kind === "target"
    ).length;
    const totalPosition = items.reduce(
      (sum, item) => sum + parseNumber(item.positionAmount),
      0
    );

    return {
      total: items.length,
      active,
      entry,
      near,
      stop,
      target,
      totalPosition,
    };
  }, [enrichedItems, items]);

  function updateItem(id: string, patch: Partial<WatchItem>) {
    setItems((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              updatedAt: nowText(),
            }
          : item
      )
    );
  }

  function applySuggestedLevelsToDraft(overwrite = true) {
    const suggestion = getSuggestedLevels(
      parseNumber(draft.currentPrice),
      draft.strategy
    );

    if (!suggestion.entryPrice) {
      alert("請先輸入或自動帶入現價");
      return;
    }

    setDraft((previous) => ({
      ...previous,
      entryPrice:
        overwrite || !previous.entryPrice
          ? suggestion.entryPrice
          : previous.entryPrice,
      stopLossPrice:
        overwrite || !previous.stopLossPrice
          ? suggestion.stopLossPrice
          : previous.stopLossPrice,
      targetPrice:
        overwrite || !previous.targetPrice
          ? suggestion.targetPrice
          : previous.targetPrice,
      note: previous.note ? previous.note : `系統預設：${suggestion.logic}`,
      updatedAt: nowText(),
    }));
  }

  function applySuggestedLevelsToItem(id: string) {
    const item = items.find((row) => row.id === id);

    if (!item) return;

    const suggestion = getSuggestedLevels(
      parseNumber(item.currentPrice),
      item.strategy
    );

    if (!suggestion.entryPrice) {
      alert("請先填入現價或更新現價");
      return;
    }

    updateItem(id, {
      entryPrice: suggestion.entryPrice,
      stopLossPrice: suggestion.stopLossPrice,
      targetPrice: suggestion.targetPrice,
      note: item.note || `系統預設：${suggestion.logic}`,
    });
  }

  async function autoFillDraft() {
    try {
      setLoadingQuoteId("draft");

      const quote = await fetchQuote(draft.symbol);
      const suggestion = getSuggestedLevels(quote.lastClose, draft.strategy);

      setDraft((previous) => ({
        ...previous,
        symbol: quote.symbol,
        name: quote.stockName || previous.name,
        currentPrice: String(quote.lastClose ?? previous.currentPrice),
        entryPrice: previous.entryPrice || suggestion.entryPrice,
        stopLossPrice: previous.stopLossPrice || suggestion.stopLossPrice,
        targetPrice: previous.targetPrice || suggestion.targetPrice,
        quoteDate: quote.lastDate || previous.quoteDate,
        note: previous.note || `系統預設：${suggestion.logic}`,
        updatedAt: nowText(),
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : "查詢失敗");
    } finally {
      setLoadingQuoteId(null);
    }
  }

  async function refreshItemQuote(id: string) {
    const item = items.find((row) => row.id === id);

    if (!item) return;

    try {
      setLoadingQuoteId(id);

      const quote = await fetchQuote(item.symbol);
      const suggestion = getSuggestedLevels(quote.lastClose, item.strategy);

      updateItem(id, {
        symbol: quote.symbol,
        name: quote.stockName || item.name,
        currentPrice: String(quote.lastClose ?? item.currentPrice),
        entryPrice: item.entryPrice || suggestion.entryPrice,
        stopLossPrice: item.stopLossPrice || suggestion.stopLossPrice,
        targetPrice: item.targetPrice || suggestion.targetPrice,
        quoteDate: quote.lastDate || item.quoteDate,
        note: item.note || `系統預設：${suggestion.logic}`,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "查詢失敗");
    } finally {
      setLoadingQuoteId(null);
    }
  }

  async function refreshAllQuotes() {
    const activeItems = items.filter((item) => item.symbol.trim());

    if (activeItems.length === 0) {
      alert("目前沒有可更新的股票");
      return;
    }

    for (const item of activeItems) {
      try {
        setLoadingQuoteId(item.id);

        const quote = await fetchQuote(item.symbol);
        const suggestion = getSuggestedLevels(quote.lastClose, item.strategy);

        setItems((previous) =>
          previous.map((row) =>
            row.id === item.id
              ? {
                  ...row,
                  symbol: quote.symbol,
                  name: quote.stockName || row.name,
                  currentPrice: String(quote.lastClose ?? row.currentPrice),
                  entryPrice: row.entryPrice || suggestion.entryPrice,
                  stopLossPrice: row.stopLossPrice || suggestion.stopLossPrice,
                  targetPrice: row.targetPrice || suggestion.targetPrice,
                  quoteDate: quote.lastDate || row.quoteDate,
                  note: row.note || `系統預設：${suggestion.logic}`,
                  updatedAt: nowText(),
                }
              : row
          )
        );
      } catch {
        // 單檔失敗不阻斷全部
      }
    }

    setLoadingQuoteId(null);
  }

  async function addDraft() {
    if (!draft.symbol.trim()) {
      alert("請先輸入股票代號");
      return;
    }

    let nextItem: WatchItem = {
      ...draft,
      id: createId(),
      symbol: draft.symbol.trim(),
      name: draft.name.trim(),
      updatedAt: nowText(),
    };

    if (!nextItem.currentPrice || !nextItem.name) {
      try {
        setLoadingQuoteId("draft");

        const quote = await fetchQuote(nextItem.symbol);
        const suggestion = getSuggestedLevels(quote.lastClose, nextItem.strategy);

        nextItem = {
          ...nextItem,
          symbol: quote.symbol,
          name: quote.stockName || nextItem.name,
          currentPrice: String(quote.lastClose ?? nextItem.currentPrice),
          entryPrice: nextItem.entryPrice || suggestion.entryPrice,
          stopLossPrice: nextItem.stopLossPrice || suggestion.stopLossPrice,
          targetPrice: nextItem.targetPrice || suggestion.targetPrice,
          quoteDate: quote.lastDate || nextItem.quoteDate,
          note: nextItem.note || `系統預設：${suggestion.logic}`,
          updatedAt: nowText(),
        };
      } catch {
        const suggestion = getSuggestedLevels(
          parseNumber(nextItem.currentPrice),
          nextItem.strategy
        );

        nextItem = {
          ...nextItem,
          entryPrice: nextItem.entryPrice || suggestion.entryPrice,
          stopLossPrice: nextItem.stopLossPrice || suggestion.stopLossPrice,
          targetPrice: nextItem.targetPrice || suggestion.targetPrice,
          note: nextItem.note || `系統預設：${suggestion.logic}`,
        };
      } finally {
        setLoadingQuoteId(null);
      }
    } else {
      const suggestion = getSuggestedLevels(
        parseNumber(nextItem.currentPrice),
        nextItem.strategy
      );

      nextItem = {
        ...nextItem,
        entryPrice: nextItem.entryPrice || suggestion.entryPrice,
        stopLossPrice: nextItem.stopLossPrice || suggestion.stopLossPrice,
        targetPrice: nextItem.targetPrice || suggestion.targetPrice,
        note: nextItem.note || `系統預設：${suggestion.logic}`,
      };
    }

    setItems((previous) => [nextItem, ...previous]);
    setDraft(makeBlankItem());
  }

  function deleteItem(id: string) {
    const item = items.find((row) => row.id === id);

    if (!item) return;

    if (!confirm(`確定刪除 ${item.symbol} ${item.name || ""}？`)) return;

    setItems((previous) => previous.filter((row) => row.id !== id));
  }

  function duplicateItem(id: string) {
    const item = items.find((row) => row.id === id);

    if (!item) return;

    setItems((previous) => [
      {
        ...item,
        id: createId(),
        symbol: `${item.symbol}`,
        name: item.name ? `${item.name} 複製` : "",
        updatedAt: nowText(),
      },
      ...previous,
    ]);
  }

  function exportJson() {
    const text = JSON.stringify(items, null, 2);

    navigator.clipboard
      .writeText(text)
      .then(() => alert("Watchlist JSON 已複製"))
      .catch(() => {
        setImportText(text);
        alert("無法自動複製，已放到匯入框中，請手動複製");
      });
  }

  function importJson() {
    try {
      const parsed = JSON.parse(importText);

      if (!Array.isArray(parsed)) {
        alert("格式錯誤：必須是陣列");
        return;
      }

      const nextItems = parsed
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          ...makeBlankItem(),
          ...item,
          id: item.id || createId(),
          updatedAt: nowText(),
        }));

      setItems(nextItems);
      alert("匯入成功");
    } catch {
      alert("JSON 格式錯誤，請確認內容");
    }
  }

  function clearAll() {
    if (!confirm("確定清空全部 Watchlist？")) return;
    setItems([]);
  }

  function getSymbolsQuery() {
    const symbols = items
      .map((item) => item.symbol.trim())
      .filter(Boolean)
      .join(", ");

    return symbols
      ? `/flow-lab?symbols=${encodeURIComponent(symbols)}`
      : "/flow-lab";
  }

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 md:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-6 shadow-sm">
          載入 Watchlist...
        </div>
      </main>
    );
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
                WATCHLIST ALERT CENTER
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-5xl">
                自選股觀察清單
                <span className="block text-red-300">與進場提醒中心</span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                輸入股票代號後可以自動帶入台股名稱、最新收盤價，並依策略自動預設理想買點、停損與停利。
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/"
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  回首頁
                </a>

                <a
                  href={getSymbolsQuery()}
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  檢查法人籌碼
                </a>

                <button
                  onClick={refreshAllQuotes}
                  disabled={loadingQuoteId !== null}
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15 disabled:opacity-60"
                >
                  {loadingQuoteId ? "更新中..." : "更新全部現價"}
                </button>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
              <div className="grid gap-3 md:grid-cols-2">
                <HeroMetric label="總觀察" value={`${summary.total}`} note="Watchlist items" />
                <HeroMetric label="啟用提醒" value={`${summary.active}`} note="Active alerts" />
                <HeroMetric label="進入買點" value={`${summary.entry}`} note="Price ≤ entry" />
                <HeroMetric label="接近買點" value={`${summary.near}`} note={`Tolerance ${tolerancePct}%`} />
              </div>

              <div className="mt-4 rounded-3xl bg-slate-900/80 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-slate-400">Alert Distribution</p>
                  <p className="text-xs text-slate-500">
                    部位總額 NT${formatNumber(summary.totalPosition)}
                  </p>
                </div>

                <div className="grid gap-3">
                  <HeroBar label="買點" value={summary.entry} total={Math.max(summary.total, 1)} className="bg-red-400" />
                  <HeroBar label="接近" value={summary.near} total={Math.max(summary.total, 1)} className="bg-amber-300" />
                  <HeroBar label="停損" value={summary.stop} total={Math.max(summary.total, 1)} className="bg-green-400" />
                  <HeroBar label="停利" value={summary.target} total={Math.max(summary.total, 1)} className="bg-sky-300" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h2 className="text-xl font-black text-slate-900">新增觀察標的</h2>
              <p className="mt-1 text-sm text-slate-500">
                輸入代號後按「自動帶入資料」，會抓名稱、最新收盤價，並自動填入建議買點、停損與停利。
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Input label="股票代號" value={draft.symbol} onChange={(value) => setDraft({ ...draft, symbol: value })} placeholder="2330 / 00878" />
                <Input label="名稱" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} placeholder="自動帶入或手動輸入" />

                <Select
                  label="策略"
                  value={draft.strategy}
                  onChange={(value) => setDraft({ ...draft, strategy: value })}
                  options={strategyOptions}
                />

                <Input label="現價" value={draft.currentPrice} onChange={(value) => setDraft({ ...draft, currentPrice: value })} placeholder="自動帶入或手動輸入" />
                <Input label="理想買點" value={draft.entryPrice} onChange={(value) => setDraft({ ...draft, entryPrice: value })} placeholder="系統自動建議" />
                <Input label="停損價" value={draft.stopLossPrice} onChange={(value) => setDraft({ ...draft, stopLossPrice: value })} placeholder="系統自動建議" />
                <Input label="停利價" value={draft.targetPrice} onChange={(value) => setDraft({ ...draft, targetPrice: value })} placeholder="系統自動建議" />
                <Input label="預計部位金額" value={draft.positionAmount} onChange={(value) => setDraft({ ...draft, positionAmount: value })} placeholder="100000" />
              </div>

              {draft.currentPrice && (
                <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-700">
                  <p className="font-bold">目前策略建議</p>
                  <p className="mt-1">{draftSuggestion.logic}</p>
                  <p className="mt-1">
                    建議買點 {draftSuggestion.entryPrice || "-"}｜停損{" "}
                    {draftSuggestion.stopLossPrice || "-"}｜停利{" "}
                    {draftSuggestion.targetPrice || "-"}
                  </p>
                </div>
              )}

              {draft.quoteDate && (
                <p className="mt-2 text-xs text-slate-500">
                  最新價格日期：{draft.quoteDate}
                </p>
              )}

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Input label="標籤" value={draft.tags} onChange={(value) => setDraft({ ...draft, tags: value })} placeholder="AI, 半導體, 權值股" />
                <Input label="備註" value={draft.note} onChange={(value) => setDraft({ ...draft, note: value })} placeholder="回測月線觀察" />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={autoFillDraft}
                  disabled={loadingQuoteId === "draft"}
                  className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100 disabled:opacity-60"
                >
                  {loadingQuoteId === "draft" ? "查詢中..." : "自動帶入資料"}
                </button>

                <button
                  onClick={() => applySuggestedLevelsToDraft(true)}
                  className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-700 transition hover:-translate-y-0.5 hover:bg-amber-100"
                >
                  重算建議價位
                </button>

                <button
                  onClick={addDraft}
                  disabled={loadingQuoteId === "draft"}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-700 disabled:opacity-60"
                >
                  加入 Watchlist
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-black text-slate-900">提醒設定</h3>

              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-bold text-slate-700">
                  接近買點容忍範圍 %
                </span>
                <input
                  type="number"
                  value={tolerancePct}
                  onChange={(event) => setTolerancePct(Number(event.target.value))}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </label>

              <div className="mt-4 grid gap-2">
                <FilterButton label="全部" active={filter === "all"} onClick={() => setFilter("all")} />
                <FilterButton label="進入買點" active={filter === "entry"} onClick={() => setFilter("entry")} />
                <FilterButton label="接近買點" active={filter === "near"} onClick={() => setFilter("near")} />
                <FilterButton label="跌破停損" active={filter === "stop"} onClick={() => setFilter("stop")} />
                <FilterButton label="達到停利" active={filter === "target"} onClick={() => setFilter("target")} />
              </div>

              <div className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-600">
                <p className="font-bold text-slate-900">自動價位邏輯</p>
                <p className="mt-1">法人 / 趨勢：買點 -2%、停損 -7%、停利 +12%</p>
                <p>突破：買點接近現價、停損 -6%、停利 +15%</p>
                <p>低接 / RSI：買點 -4%、停損 -9%、停利 +10%</p>
                <p>ETF：買點 -3%、停損 -10%、停利 +10%</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          {filteredItems.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-500">
              目前沒有符合條件的觀察標的。
            </div>
          ) : (
            filteredItems.map(({ item, status }) => (
              <WatchCard
                key={item.id}
                item={item}
                status={status}
                tolerancePct={tolerancePct}
                updateItem={updateItem}
                deleteItem={deleteItem}
                duplicateItem={duplicateItem}
                refreshItemQuote={refreshItemQuote}
                isLoadingQuote={loadingQuoteId === item.id}
                applySuggestedLevelsToItem={applySuggestedLevelsToItem}
              />
            ))
          )}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">匯入 / 匯出</h2>
              <p className="mt-1 text-sm text-slate-500">
                可以複製 Watchlist JSON，換電腦或重建專案時再匯入。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportJson}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                複製 JSON
              </button>

              <button
                onClick={importJson}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                匯入 JSON
              </button>

              <button
                onClick={clearAll}
                className="rounded-2xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-100"
              >
                清空
              </button>
            </div>
          </div>

          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            placeholder="貼上 Watchlist JSON..."
            className="mt-4 h-32 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-xs outline-none focus:border-blue-500"
          />
        </section>
      </div>
    </main>
  );
}

function WatchCard({
  item,
  status,
  tolerancePct,
  updateItem,
  deleteItem,
  duplicateItem,
  refreshItemQuote,
  isLoadingQuote,
  applySuggestedLevelsToItem,
}: {
  item: WatchItem;
  status: AlertStatus;
  tolerancePct: number;
  updateItem: (id: string, patch: Partial<WatchItem>) => void;
  deleteItem: (id: string) => void;
  duplicateItem: (id: string) => void;
  refreshItemQuote: (id: string) => void;
  isLoadingQuote: boolean;
  applySuggestedLevelsToItem: (id: string) => void;
}) {
  const current = parseNumber(item.currentPrice);
  const entry = parseNumber(item.entryPrice);
  const stop = parseNumber(item.stopLossPrice);
  const target = parseNumber(item.targetPrice);
  const riskAmount = Math.max(0, current - stop);
  const rewardAmount = Math.max(0, target - current);
  const rr = riskAmount > 0 ? rewardAmount / riskAmount : 0;
  const suggestion = getSuggestedLevels(current, item.strategy);

  const flowHref = item.symbol
    ? `/flow-lab?symbols=${encodeURIComponent(item.symbol)}`
    : "/flow-lab";

  return (
    <div className={`rounded-[2rem] border p-5 shadow-sm ${status.tone}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-black text-slate-900">
              {item.symbol || "未填代號"}{" "}
              <span className="text-base font-semibold text-slate-500">
                {item.name}
              </span>
            </h3>

            <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.badge}`}>
              {status.label}
            </span>

            {!item.active && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                暫停
              </span>
            )}
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-600">{status.description}</p>

          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            {item.quoteDate && <span>價格日期：{item.quoteDate}</span>}
            {item.updatedAt && <span>更新：{item.updatedAt}</span>}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {item.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
              .map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-600"
                >
                  #{tag}
                </span>
              ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => refreshItemQuote(item.id)}
            disabled={isLoadingQuote}
            className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
          >
            {isLoadingQuote ? "更新中..." : "更新現價"}
          </button>

          <button
            onClick={() => applySuggestedLevelsToItem(item.id)}
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 hover:bg-amber-100"
          >
            重算價位
          </button>

          <a
            href={flowHref}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
          >
            法人籌碼
          </a>

          <button
            onClick={() => duplicateItem(item.id)}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            複製
          </button>

          <button
            onClick={() => deleteItem(item.id)}
            className="rounded-2xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-100"
          >
            刪除
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <EditableMetric label="現價" value={item.currentPrice} onChange={(value) => updateItem(item.id, { currentPrice: value })} />
          <EditableMetric label="理想買點" value={item.entryPrice} onChange={(value) => updateItem(item.id, { entryPrice: value })} />
          <EditableMetric label="停損價" value={item.stopLossPrice} onChange={(value) => updateItem(item.id, { stopLossPrice: value })} />
          <EditableMetric label="停利價" value={item.targetPrice} onChange={(value) => updateItem(item.id, { targetPrice: value })} />
        </div>

        <div className="rounded-3xl bg-white/70 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <InfoMetric label="距買點" value={formatPct(getDistancePct(current, entry))} />
            <InfoMetric label="風報比" value={rr > 0 ? rr.toFixed(2) : "-"} />
            <InfoMetric label="部位" value={`NT$${formatNumber(parseNumber(item.positionAmount))}`} />
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-red-500"
              style={{
                width: `${Math.max(
                  5,
                  Math.min(100, 100 - Math.max(0, getDistancePct(current, entry)))
                )}%`,
              }}
            />
          </div>

          <p className="mt-2 text-xs text-slate-500">
            容忍範圍：理想買點 + {tolerancePct}%
          </p>

          {current > 0 && (
            <div className="mt-3 rounded-2xl bg-white p-3 text-xs leading-5 text-slate-600">
              <p className="font-bold text-slate-900">系統建議</p>
              <p>{suggestion.logic}</p>
              <p className="mt-1">
                買點 {suggestion.entryPrice}｜停損 {suggestion.stopLossPrice}
                ｜停利 {suggestion.targetPrice}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Input
          label="策略"
          value={item.strategy}
          onChange={(value) => updateItem(item.id, { strategy: value })}
        />

        <Input
          label="預計部位金額"
          value={item.positionAmount}
          onChange={(value) => updateItem(item.id, { positionAmount: value })}
        />

        <Input
          label="標籤"
          value={item.tags}
          onChange={(value) => updateItem(item.id, { tags: value })}
        />

        <Input
          label="備註"
          value={item.note}
          onChange={(value) => updateItem(item.id, { note: value })}
        />
      </div>

      <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <input
            type="checkbox"
            checked={item.active}
            onChange={(event) => updateItem(item.id, { active: event.target.checked })}
          />
          啟用提醒
        </label>
      </div>
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

function HeroBar({
  label,
  value,
  total,
  className,
}: {
  label: string;
  value: number;
  total: number;
  className: string;
}) {
  const width = Math.max(4, Math.min(100, (value / total) * 100));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-bold text-white">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${className}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
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

function EditableMetric({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="rounded-2xl bg-white/70 p-3">
      <span className="block text-xs font-bold text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full bg-transparent text-lg font-black text-slate-900 outline-none"
      />
    </label>
  );
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-left text-sm font-bold transition ${
        active
          ? "bg-slate-900 text-white"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}