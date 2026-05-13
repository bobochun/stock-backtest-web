"use client";

import { useEffect, useMemo, useState } from "react";
import ResearchDeskHeader from "./ResearchDeskHeader";
import ResearchDeskList from "./ResearchDeskList";
import ResearchDeskSidePanel from "./ResearchDeskSidePanel";
import {
  ResearchDeskStorage,
  ResearchItem,
  ResearchStatus,
  STATUS_LABELS,
  STORAGE_KEY,
} from "./types";
import {
  calcCompositeScore,
  calcPosition,
  createDefaultItems,
  extractFlowRecords,
  makeMarkdownReport,
  normalizeSymbols,
  todayText,
  uid,
  emptyChecklist,
} from "./utils";

type FilterMode = "all" | "highScore" | ResearchStatus;

function getErrorMessage(data: unknown) {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;

    if (typeof obj.error === "string") return obj.error;
    if (typeof obj.detail === "string") return obj.detail;
    if (typeof obj.message === "string") return obj.message;
  }

  return "API 回傳錯誤。";
}

export default function ResearchDeskPro() {
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [symbolInput, setSymbolInput] = useState("2330, 0050, 2317, 2454");
  const [accountSize, setAccountSize] = useState(500000);
  const [riskPct, setRiskPct] = useState(1);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [selectedId, setSelectedId] = useState("");
  const [loadingFlow, setLoadingFlow] = useState(false);
  const [message, setMessage] = useState("");
  const [importText, setImportText] = useState("");

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      const defaults = createDefaultItems();
      setItems(defaults);
      setSelectedId(defaults[0]?.id || "");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<ResearchDeskStorage>;
      const savedItems = parsed.items?.length ? parsed.items : createDefaultItems();

      setItems(savedItems);
      setAccountSize(parsed.accountSize || 500000);
      setRiskPct(parsed.riskPct || 1);
      setSelectedId(savedItems[0]?.id || "");
    } catch {
      const defaults = createDefaultItems();
      setItems(defaults);
      setSelectedId(defaults[0]?.id || "");
    }
  }, []);

  useEffect(() => {
    if (!items.length) return;

    const payload: ResearchDeskStorage = {
      version: 1,
      exportedAt: new Date().toISOString(),
      accountSize,
      riskPct,
      items,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [items, accountSize, riskPct]);

  const selectedItem = useMemo(() => {
    return items.find((item) => item.id === selectedId) || items[0];
  }, [items, selectedId]);

  const filteredItems = useMemo(() => {
    return [...items]
      .filter((item) => {
        if (filter === "all") return true;
        if (filter === "highScore") return calcCompositeScore(item) >= 70;
        return item.status === filter;
      })
      .sort((a, b) => calcCompositeScore(b) - calcCompositeScore(a));
  }, [items, filter]);

  const kpi = useMemo(() => {
    const highScore = items.filter((item) => calcCompositeScore(item) >= 70).length;
    const ready = items.filter((item) => item.status === "ready").length;
    const missingRisk = items.filter((item) => !item.entry || !item.stop).length;

    const avgScore =
      items.length > 0
        ? Math.round(
            items.reduce((sum, item) => sum + calcCompositeScore(item), 0) /
              items.length
          )
        : 0;

    return {
      total: items.length,
      highScore,
      ready,
      missingRisk,
      avgScore,
    };
  }, [items]);

  const selectedPosition = selectedItem
    ? calcPosition(selectedItem, accountSize, riskPct)
    : undefined;

  function updateItem(id: string, patch: Partial<ResearchItem>) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              updatedAt: todayText(),
            }
          : item
      )
    );
  }

  function addSymbols() {
    const symbols = normalizeSymbols(symbolInput);

    if (!symbols.length) {
      setMessage("請先輸入股票代號。");
      return;
    }

    const existing = new Set(items.map((item) => item.symbol));
    const nextItems: ResearchItem[] = [];

    for (const symbol of symbols) {
      if (existing.has(symbol)) continue;

      nextItems.push({
        id: uid(),
        symbol,
        name: symbol,
        status: "watching",
        thesis: "",
        notes: "",
        tags: [],
        entry: undefined,
        stop: undefined,
        target: undefined,
        currentPrice: undefined,
        score: 50,
        updatedAt: todayText(),
        checklist: emptyChecklist(),
      });
    }

    if (!nextItems.length) {
      setMessage("輸入的股票都已經在研究清單中。");
      return;
    }

    setItems((prev) => [...nextItems, ...prev]);
    setSelectedId(nextItems[0].id);
    setMessage(`已新增 ${nextItems.length} 檔股票到 Research Desk。`);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));

    if (selectedId === id) {
      const remain = items.filter((item) => item.id !== id);
      setSelectedId(remain[0]?.id || "");
    }
  }

  function duplicateItem(item: ResearchItem) {
    const copy: ResearchItem = {
      ...item,
      id: uid(),
      name: `${item.name} 複本`,
      status: "watching",
      updatedAt: todayText(),
    };

    setItems((prev) => [copy, ...prev]);
    setSelectedId(copy.id);
    setMessage(`已複製 ${item.symbol}。`);
  }

  async function refreshFlow() {
    const symbols = items.map((item) => item.symbol).join(",");

    if (!symbols) {
      setMessage("清單沒有股票可查。");
      return;
    }

    setLoadingFlow(true);
    setMessage("正在更新法人籌碼資料...");

    try {
      const response = await fetch("/api/institutional-flow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbols,
          date: "",
          lookbackDays: 5,
          accumulationDays: 20,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(getErrorMessage(data));
        return;
      }

      const records = extractFlowRecords(data);

      if (!records.length) {
        setMessage("法人籌碼查詢完成，但沒有找到 records。");
        return;
      }

      const recordMap = new Map(
        records
          .filter((record) => record.symbol)
          .map((record) => [String(record.symbol), record])
      );

      setItems((prev) =>
        prev.map((item) => {
          const record = recordMap.get(item.symbol);
          if (!record) return item;

          const flowScore =
            typeof record.score === "number" && Number.isFinite(record.score)
              ? record.score
              : item.flowScore;

          return {
            ...item,
            name: record.name || item.name,
            flowScore,
            flowSignal: record.signal || item.flowSignal,
            flowReason: record.reason || item.flowReason,
            foreignNetLots: record.foreignNetLots,
            trustNetLots: record.trustNetLots,
            dealerNetLots: record.dealerNetLots,
            totalNetLots: record.totalNetLots,
            checklist: {
              ...item.checklist,
              flow: (flowScore ?? 0) >= 65,
            },
            status:
              (flowScore ?? 0) >= 75 && item.entry && item.stop
                ? "ready"
                : item.status,
            updatedAt: todayText(),
          };
        })
      );

      setMessage(`法人籌碼已更新：${records.length} 筆。`);
    } catch (error) {
      console.error(error);
      setMessage("法人籌碼更新失敗，請確認 API_BASE_URL 與後端服務。");
    } finally {
      setLoadingFlow(false);
    }
  }

  function exportJson() {
    const payload: ResearchDeskStorage = {
      version: 1,
      exportedAt: new Date().toISOString(),
      accountSize,
      riskPct,
      items,
    };

    const text = JSON.stringify(payload, null, 2);

    navigator.clipboard
      .writeText(text)
      .then(() => setMessage("JSON 已複製到剪貼簿。"))
      .catch(() => {
        setImportText(text);
        setMessage("剪貼簿失敗，已放到匯入框，請手動複製。");
      });
  }

  function copyMarkdown() {
    const report = makeMarkdownReport(items, accountSize, riskPct);

    navigator.clipboard
      .writeText(report)
      .then(() => setMessage("Markdown 報告已複製到剪貼簿。"))
      .catch(() => {
        setImportText(report);
        setMessage("剪貼簿失敗，已放到匯入框，請手動複製。");
      });
  }

  function importJson() {
    try {
      const parsed = JSON.parse(importText) as Partial<ResearchDeskStorage>;

      if (!parsed.items || !Array.isArray(parsed.items)) {
        setMessage("匯入失敗：JSON 裡找不到 items。");
        return;
      }

      setItems(parsed.items);
      setAccountSize(parsed.accountSize || accountSize);
      setRiskPct(parsed.riskPct || riskPct);
      setSelectedId(parsed.items[0]?.id || "");
      setImportText("");
      setMessage("匯入完成。");
    } catch {
      setMessage("匯入失敗：JSON 格式不正確。");
    }
  }

  function clearDesk() {
    const defaults = createDefaultItems();

    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    setMessage("已重設為預設研究清單。");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <ResearchDeskHeader
          message={message}
          loadingFlow={loadingFlow}
          kpi={kpi}
          onRefreshFlow={refreshFlow}
          onCopyMarkdown={copyMarkdown}
          onExportJson={exportJson}
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl">
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="flex-1">
                  <label className="text-sm font-bold text-slate-700">
                    快速新增股票
                  </label>

                  <textarea
                    value={symbolInput}
                    onChange={(event) => setSymbolInput(event.target.value)}
                    rows={2}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none ring-cyan-300 transition focus:ring-2"
                    placeholder="例如：2330, 0050, 2317, 2454"
                  />
                </div>

                <button
                  onClick={addSymbols}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
                >
                  加入研究清單
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(
                  [
                    "all",
                    "highScore",
                    "watching",
                    "ready",
                    "entered",
                    "avoid",
                  ] as FilterMode[]
                ).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilter(mode)}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                      filter === mode
                        ? "bg-cyan-500 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {mode === "all"
                      ? "全部"
                      : mode === "highScore"
                        ? "高分"
                        : STATUS_LABELS[mode]}
                  </button>
                ))}
              </div>
            </div>

            <ResearchDeskList
              items={filteredItems}
              selectedId={selectedId}
              accountSize={accountSize}
              riskPct={riskPct}
              onSelect={setSelectedId}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
              onDuplicateItem={duplicateItem}
            />
          </section>

          <ResearchDeskSidePanel
            selectedItem={selectedItem}
            selectedPosition={selectedPosition}
            accountSize={accountSize}
            riskPct={riskPct}
            importText={importText}
            setAccountSize={setAccountSize}
            setRiskPct={setRiskPct}
            setImportText={setImportText}
            onImportJson={importJson}
            onClearDesk={clearDesk}
          />
        </div>
      </section>
    </main>
  );
}