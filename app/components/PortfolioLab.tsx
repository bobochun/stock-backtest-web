"use client";

import { useEffect, useMemo, useState } from "react";

type PortfolioHolding = {
  id: string;
  symbol: string;
  name: string;
  securityType: string;
  shares: string;
  avgCost: string;
  currentPrice: string;
  stopLossPrice: string;
  targetPrice: string;
  note: string;
  tags: string;
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

type PortfolioRow = {
  item: PortfolioHolding;
  shares: number;
  avgCost: number;
  currentPrice: number;
  stopLossPrice: number;
  targetPrice: number;
  costValue: number;
  marketValue: number;
  pnl: number;
  pnlPct: number;
  allocationPct: number;
  stopRisk: number;
  stopRiskPct: number;
  upside: number;
  upsidePct: number;
  isEtf: boolean;
};

const PORTFOLIO_STORAGE_KEY = "stock-backtest-web-portfolio-lab-v1";
const WATCHLIST_STORAGE_KEY = "stock-backtest-web-watchlist-alerts-v3";

const defaultHoldings: PortfolioHolding[] = [
  {
    id: "portfolio-0050",
    symbol: "0050",
    name: "元大台灣50",
    securityType: "ETF",
    shares: "1000",
    avgCost: "175",
    currentPrice: "180",
    stopLossPrice: "162",
    targetPrice: "198",
    note: "核心 ETF 部位，長期配置。",
    tags: "ETF, 核心部位",
    updatedAt: "",
    quoteDate: "",
  },
  {
    id: "portfolio-2330",
    symbol: "2330",
    name: "台積電",
    securityType: "股票",
    shares: "200",
    avgCost: "920",
    currentPrice: "950",
    stopLossPrice: "880",
    targetPrice: "1060",
    note: "AI 權值股觀察部位。",
    tags: "AI, 半導體",
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
  return `portfolio-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseNumber(value: string | number | undefined | null) {
  const cleaned = String(value ?? "")
    .replaceAll(",", "")
    .replaceAll("，", "")
    .trim();

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "-";

  return `NT$${Math.round(value).toLocaleString("zh-TW")}`;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "-";

  return value.toLocaleString("zh-TW", {
    maximumFractionDigits: 2,
  });
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

function pnlClass(value: number) {
  if (value > 0) return "text-red-600";
  if (value < 0) return "text-green-600";
  return "text-slate-500";
}

function barWidth(value: number) {
  if (!Number.isFinite(value)) return 4;

  return Math.max(4, Math.min(100, value));
}

function isLikelyEtf(item: PortfolioHolding) {
  const text = `${item.securityType} ${item.symbol} ${item.name}`.toLowerCase();

  return (
    text.includes("etf") ||
    item.symbol.startsWith("00") ||
    item.name.includes("ETF")
  );
}

function roundTaiwanPrice(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";

  if (value < 50) return value.toFixed(2);
  if (value < 500) return value.toFixed(1);

  return Math.round(value).toString();
}

function getSuggestedRiskLevels(price: number, isEtf: boolean) {
  if (!Number.isFinite(price) || price <= 0) {
    return {
      stopLossPrice: "",
      targetPrice: "",
    };
  }

  if (isEtf) {
    return {
      stopLossPrice: roundTaiwanPrice(price * 0.9),
      targetPrice: roundTaiwanPrice(price * 1.1),
    };
  }

  return {
    stopLossPrice: roundTaiwanPrice(price * 0.92),
    targetPrice: roundTaiwanPrice(price * 1.15),
  };
}

function makeBlankHolding(): PortfolioHolding {
  return {
    id: createId(),
    symbol: "",
    name: "",
    securityType: "",
    shares: "",
    avgCost: "",
    currentPrice: "",
    stopLossPrice: "",
    targetPrice: "",
    note: "",
    tags: "",
    updatedAt: nowText(),
    quoteDate: "",
  };
}

async function fetchQuote(symbol: string): Promise<QuoteResult> {
  const cleanSymbol = symbol.trim();

  if (!cleanSymbol) {
    throw new Error("請先輸入股票代號");
  }

  const response = await fetch(`/api/quote?symbol=${encodeURIComponent(cleanSymbol)}`, {
    cache: "no-store",
  });

  const data = (await response.json()) as QuoteResult;

  if (!response.ok) {
    throw new Error(data.error || "查詢失敗");
  }

  return data;
}

function loadWatchlistItems(): WatchItem[] {
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

function exportCsv(rows: PortfolioRow[]) {
  const header = [
    "symbol",
    "name",
    "shares",
    "avgCost",
    "currentPrice",
    "costValue",
    "marketValue",
    "pnl",
    "pnlPct",
    "allocationPct",
    "stopLossPrice",
    "targetPrice",
    "stopRisk",
    "tags",
  ];

  const body = rows.map((row) => [
    row.item.symbol,
    row.item.name,
    row.shares,
    row.avgCost,
    row.currentPrice,
    Math.round(row.costValue),
    Math.round(row.marketValue),
    Math.round(row.pnl),
    row.pnlPct.toFixed(2),
    row.allocationPct.toFixed(2),
    row.stopLossPrice,
    row.targetPrice,
    Math.round(row.stopRisk),
    row.item.tags,
  ]);

  return [header, ...body]
    .map((line) =>
      line
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");
}

export default function PortfolioLab() {
  const [mounted, setMounted] = useState(false);
  const [cash, setCash] = useState("100000");
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [draft, setDraft] = useState<PortfolioHolding>(makeBlankHolding());
  const [loadingQuoteId, setLoadingQuoteId] = useState<string | null>(null);
  const [watchlistItems, setWatchlistItems] = useState<WatchItem[]>([]);
  const [showImportPanel, setShowImportPanel] = useState(false);

  useEffect(() => {
    setMounted(true);

    try {
      const saved = localStorage.getItem(PORTFOLIO_STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (parsed && Array.isArray(parsed.holdings)) {
          setHoldings(parsed.holdings);
          setCash(String(parsed.cash ?? "100000"));
          setWatchlistItems(loadWatchlistItems());
          return;
        }
      }
    } catch {
      // ignore invalid localStorage
    }

    setHoldings(
      defaultHoldings.map((item) => ({
        ...item,
        updatedAt: nowText(),
      }))
    );
    setWatchlistItems(loadWatchlistItems());
  }, []);

  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem(
      PORTFOLIO_STORAGE_KEY,
      JSON.stringify({
        cash,
        holdings,
      })
    );
  }, [cash, holdings, mounted]);

  const rows = useMemo<PortfolioRow[]>(() => {
    const baseRows = holdings.map((item) => {
      const shares = parseNumber(item.shares);
      const avgCost = parseNumber(item.avgCost);
      const currentPrice = parseNumber(item.currentPrice);
      const stopLossPrice = parseNumber(item.stopLossPrice);
      const targetPrice = parseNumber(item.targetPrice);

      const costValue = shares * avgCost;
      const marketValue = shares * currentPrice;
      const pnl = marketValue - costValue;
      const pnlPct = costValue > 0 ? (pnl / costValue) * 100 : 0;

      const stopRisk =
        stopLossPrice > 0 && shares > 0
          ? Math.max(0, (currentPrice - stopLossPrice) * shares)
          : 0;

      const stopRiskPct =
        marketValue > 0 ? (stopRisk / marketValue) * 100 : 0;

      const upside =
        targetPrice > 0 && shares > 0
          ? Math.max(0, (targetPrice - currentPrice) * shares)
          : 0;

      const upsidePct =
        marketValue > 0 ? (upside / marketValue) * 100 : 0;

      return {
        item,
        shares,
        avgCost,
        currentPrice,
        stopLossPrice,
        targetPrice,
        costValue,
        marketValue,
        pnl,
        pnlPct,
        allocationPct: 0,
        stopRisk,
        stopRiskPct,
        upside,
        upsidePct,
        isEtf: isLikelyEtf(item),
      };
    });

    const totalMarketValue = baseRows.reduce(
      (sum, row) => sum + row.marketValue,
      0
    );

    return baseRows
      .map((row) => ({
        ...row,
        allocationPct:
          totalMarketValue > 0 ? (row.marketValue / totalMarketValue) * 100 : 0,
      }))
      .sort((a, b) => b.marketValue - a.marketValue);
  }, [holdings]);

  const summary = useMemo(() => {
    const totalCost = rows.reduce((sum, row) => sum + row.costValue, 0);
    const totalMarketValue = rows.reduce((sum, row) => sum + row.marketValue, 0);
    const totalPnl = totalMarketValue - totalCost;
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
    const cashValue = parseNumber(cash);
    const totalAssets = totalMarketValue + cashValue;
    const stockExposurePct =
      totalAssets > 0 ? (totalMarketValue / totalAssets) * 100 : 0;
    const cashPct = totalAssets > 0 ? (cashValue / totalAssets) * 100 : 0;

    const etfValue = rows
      .filter((row) => row.isEtf)
      .reduce((sum, row) => sum + row.marketValue, 0);

    const stockValue = rows
      .filter((row) => !row.isEtf)
      .reduce((sum, row) => sum + row.marketValue, 0);

    const etfPct = totalMarketValue > 0 ? (etfValue / totalMarketValue) * 100 : 0;
    const stockPct =
      totalMarketValue > 0 ? (stockValue / totalMarketValue) * 100 : 0;

    const stopRisk = rows.reduce((sum, row) => sum + row.stopRisk, 0);
    const stopRiskPct =
      totalAssets > 0 ? (stopRisk / totalAssets) * 100 : 0;

    const concentration = rows[0]?.allocationPct || 0;

    return {
      totalCost,
      totalMarketValue,
      totalPnl,
      totalPnlPct,
      cashValue,
      totalAssets,
      stockExposurePct,
      cashPct,
      etfValue,
      stockValue,
      etfPct,
      stockPct,
      stopRisk,
      stopRiskPct,
      concentration,
    };
  }, [cash, rows]);

  function updateHolding(id: string, patch: Partial<PortfolioHolding>) {
    setHoldings((previous) =>
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

  async function autoFillDraft() {
    try {
      setLoadingQuoteId("draft");

      const quote = await fetchQuote(draft.symbol);
      const isEtf =
        String(quote.securityType || "").toLowerCase().includes("etf") ||
        quote.symbol.startsWith("00");
      const suggestion = getSuggestedRiskLevels(quote.lastClose, isEtf);

      setDraft((previous) => ({
        ...previous,
        symbol: quote.symbol,
        name: quote.stockName || previous.name,
        securityType: quote.securityType || previous.securityType,
        currentPrice: String(quote.lastClose ?? previous.currentPrice),
        stopLossPrice: previous.stopLossPrice || suggestion.stopLossPrice,
        targetPrice: previous.targetPrice || suggestion.targetPrice,
        quoteDate: quote.lastDate || previous.quoteDate,
        updatedAt: nowText(),
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : "查詢失敗");
    } finally {
      setLoadingQuoteId(null);
    }
  }

  async function refreshHoldingQuote(id: string) {
    const item = holdings.find((row) => row.id === id);

    if (!item) return;

    try {
      setLoadingQuoteId(id);

      const quote = await fetchQuote(item.symbol);
      const isEtf =
        String(quote.securityType || item.securityType || "")
          .toLowerCase()
          .includes("etf") || quote.symbol.startsWith("00");
      const suggestion = getSuggestedRiskLevels(quote.lastClose, isEtf);

      updateHolding(id, {
        symbol: quote.symbol,
        name: quote.stockName || item.name,
        securityType: quote.securityType || item.securityType,
        currentPrice: String(quote.lastClose ?? item.currentPrice),
        stopLossPrice: item.stopLossPrice || suggestion.stopLossPrice,
        targetPrice: item.targetPrice || suggestion.targetPrice,
        quoteDate: quote.lastDate || item.quoteDate,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "查詢失敗");
    } finally {
      setLoadingQuoteId(null);
    }
  }

  async function refreshAllQuotes() {
    const list = holdings.filter((item) => item.symbol.trim());

    if (list.length === 0) {
      alert("目前沒有可更新的持股");
      return;
    }

    for (const item of list) {
      try {
        setLoadingQuoteId(item.id);

        const quote = await fetchQuote(item.symbol);
        const isEtf =
          String(quote.securityType || item.securityType || "")
            .toLowerCase()
            .includes("etf") || quote.symbol.startsWith("00");
        const suggestion = getSuggestedRiskLevels(quote.lastClose, isEtf);

        setHoldings((previous) =>
          previous.map((row) =>
            row.id === item.id
              ? {
                  ...row,
                  symbol: quote.symbol,
                  name: quote.stockName || row.name,
                  securityType: quote.securityType || row.securityType,
                  currentPrice: String(quote.lastClose ?? row.currentPrice),
                  stopLossPrice: row.stopLossPrice || suggestion.stopLossPrice,
                  targetPrice: row.targetPrice || suggestion.targetPrice,
                  quoteDate: quote.lastDate || row.quoteDate,
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

    if (!draft.shares.trim() || !draft.avgCost.trim()) {
      alert("請輸入股數與平均成本");
      return;
    }

    let nextItem: PortfolioHolding = {
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
        const isEtf =
          String(quote.securityType || "")
            .toLowerCase()
            .includes("etf") || quote.symbol.startsWith("00");
        const suggestion = getSuggestedRiskLevels(quote.lastClose, isEtf);

        nextItem = {
          ...nextItem,
          symbol: quote.symbol,
          name: quote.stockName || nextItem.name,
          securityType: quote.securityType || nextItem.securityType,
          currentPrice: String(quote.lastClose ?? nextItem.currentPrice),
          stopLossPrice: nextItem.stopLossPrice || suggestion.stopLossPrice,
          targetPrice: nextItem.targetPrice || suggestion.targetPrice,
          quoteDate: quote.lastDate || nextItem.quoteDate,
          updatedAt: nowText(),
        };
      } catch {
        // 允許手動加入
      } finally {
        setLoadingQuoteId(null);
      }
    }

    setHoldings((previous) => [nextItem, ...previous]);
    setDraft(makeBlankHolding());
  }

  function deleteHolding(id: string) {
    const item = holdings.find((row) => row.id === id);

    if (!item) return;

    if (!confirm(`確定刪除 ${item.symbol} ${item.name || ""}？`)) return;

    setHoldings((previous) => previous.filter((row) => row.id !== id));
  }

  function duplicateHolding(id: string) {
    const item = holdings.find((row) => row.id === id);

    if (!item) return;

    setHoldings((previous) => [
      {
        ...item,
        id: createId(),
        name: item.name ? `${item.name} 複製` : "",
        updatedAt: nowText(),
      },
      ...previous,
    ]);
  }

  function importFromWatchlist(item: WatchItem) {
    const existing = holdings.find((row) => row.symbol === item.symbol);

    if (existing) {
      if (!confirm(`${item.symbol} 已在投組中，要覆蓋基本資料嗎？`)) return;

      updateHolding(existing.id, {
        name: item.name || existing.name,
        currentPrice: item.currentPrice || existing.currentPrice,
        stopLossPrice: item.stopLossPrice || existing.stopLossPrice,
        targetPrice: item.targetPrice || existing.targetPrice,
        note: existing.note || item.note,
        tags: existing.tags || item.tags,
        quoteDate: item.quoteDate || existing.quoteDate,
      });

      return;
    }

    const nextItem: PortfolioHolding = {
      id: createId(),
      symbol: item.symbol,
      name: item.name,
      securityType: item.symbol.startsWith("00") ? "ETF" : "股票",
      shares: "",
      avgCost: item.entryPrice || item.currentPrice,
      currentPrice: item.currentPrice,
      stopLossPrice: item.stopLossPrice,
      targetPrice: item.targetPrice,
      note: `由 Watchlist 匯入。${item.note || ""}`,
      tags: item.tags,
      updatedAt: nowText(),
      quoteDate: item.quoteDate,
    };

    setHoldings((previous) => [nextItem, ...previous]);
    alert(`${item.symbol} 已匯入投組，請補上股數。`);
  }

  function reloadWatchlist() {
    setWatchlistItems(loadWatchlistItems());
    setShowImportPanel(true);
  }

  function copyCsv() {
    const csv = exportCsv(rows);

    navigator.clipboard
      .writeText(csv)
      .then(() => alert("Portfolio CSV 已複製"))
      .catch(() => alert("無法複製 CSV"));
  }

  function clearPortfolio() {
    if (!confirm("確定清空整個投組？")) return;

    setHoldings([]);
  }

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 md:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-6 shadow-sm">
          載入 Portfolio...
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
                PORTFOLIO MANAGEMENT LAB
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-5xl">
                投組管理中心
                <span className="block text-red-300">持股、曝險、損益與停損風險</span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                管理已進場持股，追蹤成本、現價、未實現損益、持股比例與跌到停損時的最大可能虧損。
                可以從 Watchlist 匯入標的，也可以一鍵更新全部現價。
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={refreshAllQuotes}
                  disabled={loadingQuoteId !== null}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:opacity-60"
                >
                  {loadingQuoteId ? "更新中..." : "更新全部現價"}
                </button>

                <button
                  onClick={reloadWatchlist}
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  從 Watchlist 匯入
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
                <HeroMetric label="總資產" value={formatMoney(summary.totalAssets)} note="Market value + cash" />
                <HeroMetric label="持股市值" value={formatMoney(summary.totalMarketValue)} note={`${formatPct(summary.stockExposurePct)} exposure`} />
                <HeroMetric label="未實現損益" value={formatMoney(summary.totalPnl)} note={formatPct(summary.totalPnlPct)} />
                <HeroMetric label="停損風險" value={formatMoney(summary.stopRisk)} note={`${formatPct(summary.stopRiskPct)} of assets`} />
              </div>

              <div className="mt-4 rounded-3xl bg-slate-900/80 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-slate-400">Asset Allocation</p>
                  <p className="text-xs text-slate-500">
                    Cash {formatPct(summary.cashPct)}
                  </p>
                </div>

                <AllocationBar
                  label="個股"
                  value={summary.stockPct}
                  className="bg-red-400"
                />
                <AllocationBar
                  label="ETF"
                  value={summary.etfPct}
                  className="bg-sky-300"
                />
                <AllocationBar
                  label="現金"
                  value={summary.cashPct}
                  className="bg-amber-300"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="總成本" value={formatMoney(summary.totalCost)} note="Cost basis" />
          <SummaryCard label="現金部位" value={formatMoney(summary.cashValue)} note={formatPct(summary.cashPct)} />
          <SummaryCard label="最大單檔集中度" value={formatPct(summary.concentration)} note="Top holding allocation" />
          <SummaryCard label="持股數量" value={`${holdings.length}`} note="Positions" />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h2 className="text-xl font-black text-slate-900">新增持股</h2>
              <p className="mt-1 text-sm text-slate-500">
                輸入股票代號後可自動帶入名稱與現價。股數與成本仍需依照你的實際成交填寫。
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Input label="股票代號" value={draft.symbol} onChange={(value) => setDraft({ ...draft, symbol: value })} placeholder="2330 / 00878" />
                <Input label="名稱" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} placeholder="自動帶入或手動輸入" />
                <Input label="股數" value={draft.shares} onChange={(value) => setDraft({ ...draft, shares: value })} placeholder="1000" />
                <Input label="平均成本" value={draft.avgCost} onChange={(value) => setDraft({ ...draft, avgCost: value })} placeholder="100" />
                <Input label="現價" value={draft.currentPrice} onChange={(value) => setDraft({ ...draft, currentPrice: value })} placeholder="自動帶入" />
                <Input label="停損價" value={draft.stopLossPrice} onChange={(value) => setDraft({ ...draft, stopLossPrice: value })} placeholder="系統建議或手動" />
                <Input label="目標價" value={draft.targetPrice} onChange={(value) => setDraft({ ...draft, targetPrice: value })} placeholder="系統建議或手動" />
                <Input label="類型" value={draft.securityType} onChange={(value) => setDraft({ ...draft, securityType: value })} placeholder="股票 / ETF" />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Input label="標籤" value={draft.tags} onChange={(value) => setDraft({ ...draft, tags: value })} placeholder="AI, ETF, 收息" />
                <Input label="備註" value={draft.note} onChange={(value) => setDraft({ ...draft, note: value })} placeholder="進場理由、計畫" />
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
                  onClick={addDraft}
                  disabled={loadingQuoteId === "draft"}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-700 disabled:opacity-60"
                >
                  加入投組
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-black text-slate-900">投組設定</h3>

              <Input
                label="現金部位"
                value={cash}
                onChange={setCash}
                placeholder="100000"
              />

              <div className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-600">
                <p className="font-bold text-slate-900">風控提醒</p>
                <p className="mt-1">單檔集中度過高時，代表投組容易受單一股票影響。</p>
                <p>停損風險代表全部持股若跌到停損價，可能損失的金額。</p>
                <p>ETF / 個股比例可協助判斷目前是核心配置或主動交易偏重。</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={copyCsv}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  複製 CSV
                </button>

                <button
                  onClick={clearPortfolio}
                  className="rounded-2xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-100"
                >
                  清空投組
                </button>
              </div>
            </div>
          </div>
        </section>

        {showImportPanel && (
          <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold text-blue-600">WATCHLIST IMPORT</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">從 Watchlist 匯入</h2>
                <p className="mt-2 text-sm text-slate-500">
                  匯入後請補上實際股數。若已存在投組，可覆蓋基本資料。
                </p>
              </div>

              <button
                onClick={() => setShowImportPanel(false)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                收合
              </button>
            </div>

            {watchlistItems.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                目前 Watchlist 沒有資料。
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {watchlistItems.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="font-black text-slate-900">
                      {item.symbol}{" "}
                      <span className="font-medium text-slate-500">{item.name}</span>
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">
                      現價 {item.currentPrice || "-"}｜買點 {item.entryPrice || "-"}
                    </p>

                    <p className="mt-2 line-clamp-2 text-xs text-slate-400">
                      {item.tags}
                    </p>

                    <button
                      onClick={() => importFromWatchlist(item)}
                      className="mt-4 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
                    >
                      匯入投組
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="grid gap-4">
          {rows.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-500">
              目前沒有持股。
            </div>
          ) : (
            rows.map((row) => (
              <HoldingCard
                key={row.item.id}
                row={row}
                updateHolding={updateHolding}
                refreshHoldingQuote={refreshHoldingQuote}
                deleteHolding={deleteHolding}
                duplicateHolding={duplicateHolding}
                isLoadingQuote={loadingQuoteId === row.item.id}
              />
            ))
          )}
        </section>
      </div>
    </main>
  );
}

function HoldingCard({
  row,
  updateHolding,
  refreshHoldingQuote,
  deleteHolding,
  duplicateHolding,
  isLoadingQuote,
}: {
  row: PortfolioRow;
  updateHolding: (id: string, patch: Partial<PortfolioHolding>) => void;
  refreshHoldingQuote: (id: string) => void;
  deleteHolding: (id: string) => void;
  duplicateHolding: (id: string) => void;
  isLoadingQuote: boolean;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-black text-slate-900">
              {row.item.symbol || "未填代號"}{" "}
              <span className="text-base font-semibold text-slate-500">
                {row.item.name}
              </span>
            </h3>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {row.isEtf ? "ETF" : "股票"}
            </span>

            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
              row.pnl >= 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}>
              {row.pnl >= 0 ? "獲利" : "虧損"} {formatPct(row.pnlPct)}
            </span>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {row.item.note || "尚未填寫進場理由或投資計畫。"}
          </p>

          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            {row.item.quoteDate && <span>價格日期：{row.item.quoteDate}</span>}
            {row.item.updatedAt && <span>更新：{row.item.updatedAt}</span>}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {row.item.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
              .map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  #{tag}
                </span>
              ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => refreshHoldingQuote(row.item.id)}
            disabled={isLoadingQuote}
            className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
          >
            {isLoadingQuote ? "更新中..." : "更新現價"}
          </button>

          <button
            onClick={() => duplicateHolding(row.item.id)}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            複製
          </button>

          <button
            onClick={() => deleteHolding(row.item.id)}
            className="rounded-2xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-100"
          >
            刪除
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <InfoMetric label="市值" value={formatMoney(row.marketValue)} />
        <InfoMetric label="成本" value={formatMoney(row.costValue)} />
        <InfoMetric label="損益" value={formatMoney(row.pnl)} valueClassName={pnlClass(row.pnl)} />
        <InfoMetric label="損益率" value={formatPct(row.pnlPct)} valueClassName={pnlClass(row.pnl)} />
        <InfoMetric label="持股比例" value={formatPct(row.allocationPct)} />
        <InfoMetric label="停損風險" value={formatMoney(row.stopRisk)} valueClassName="text-green-600" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <EditableMetric label="股數" value={row.item.shares} onChange={(value) => updateHolding(row.item.id, { shares: value })} />
          <EditableMetric label="平均成本" value={row.item.avgCost} onChange={(value) => updateHolding(row.item.id, { avgCost: value })} />
          <EditableMetric label="現價" value={row.item.currentPrice} onChange={(value) => updateHolding(row.item.id, { currentPrice: value })} />
          <EditableMetric label="停損價" value={row.item.stopLossPrice} onChange={(value) => updateHolding(row.item.id, { stopLossPrice: value })} />
          <EditableMetric label="目標價" value={row.item.targetPrice} onChange={(value) => updateHolding(row.item.id, { targetPrice: value })} />
        </div>

        <div className="rounded-3xl bg-slate-50 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <SmallMetric label="停損風險率" value={formatPct(row.stopRiskPct)} />
            <SmallMetric label="目標上行" value={formatMoney(row.upside)} />
            <SmallMetric label="上行幅度" value={formatPct(row.upsidePct)} />
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full ${
                row.allocationPct >= 30 ? "bg-red-500" : "bg-blue-500"
              }`}
              style={{ width: `${barWidth(row.allocationPct)}%` }}
            />
          </div>

          <p className="mt-2 text-xs text-slate-500">
            單檔持股比例 {formatPct(row.allocationPct)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Input
          label="標籤"
          value={row.item.tags}
          onChange={(value) => updateHolding(row.item.id, { tags: value })}
        />

        <Input
          label="備註"
          value={row.item.note}
          onChange={(value) => updateHolding(row.item.id, { note: value })}
        />
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

function AllocationBar({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-bold text-white">{formatPct(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${className}`} style={{ width: `${barWidth(value)}%` }} />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function InfoMetric({
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

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
    </div>
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
    <label className="rounded-2xl bg-slate-50 p-3">
      <span className="block text-xs font-bold text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full bg-transparent text-lg font-black text-slate-900 outline-none"
      />
    </label>
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