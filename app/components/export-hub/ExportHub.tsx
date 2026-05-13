"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildResearchMarkdown,
  readResearchDeskStorage,
  ResearchItem,
  ResearchDeskStorage,
  STATUS_LABELS,
  formatResearchNumber,
} from "../../lib/researchDeskStore";

export default function ExportHub() {
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [storage, setStorage] = useState<ResearchDeskStorage | undefined>();
  const [message, setMessage] = useState("");

  function loadData() {
    const nextStorage = readResearchDeskStorage();
    setStorage(nextStorage);
    setItems(nextStorage.items);
  }

  useEffect(() => {
    loadData();
  }, []);

  const rawJson = useMemo(() => {
    return JSON.stringify(
      storage || {
        version: 1,
        accountSize: 500000,
        riskPct: 1,
        items: [],
      },
      null,
      2
    );
  }, [storage]);

  const markdown = useMemo(() => {
    return buildResearchMarkdown(items);
  }, [items]);

  const tableMarkdown = useMemo(() => {
    const lines = [
      "# Research Desk 表格摘要",
      "",
      "| 股票 | 狀態 | 進場 | 停損 | 停利 | 法人分數 | 法人訊號 |",
      "|---|---|---:|---:|---:|---:|---|",
    ];

    for (const item of items) {
      lines.push(
        `| ${item.symbol} ${item.name} | ${STATUS_LABELS[item.status]} | ${formatResearchNumber(item.entry, 2)} | ${formatResearchNumber(item.stop, 2)} | ${formatResearchNumber(item.target, 2)} | ${item.flowScore ?? "-"} | ${item.flowSignal ?? "-"} |`
      );
    }

    return lines.join("\n");
  }, [items]);

  function copyText(text: string, label: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => setMessage(`${label} 已複製。`))
      .catch(() => setMessage(`${label} 複製失敗。`));
  }

  function downloadText(filename: string, text: string) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const element = document.createElement("a");

    element.href = url;
    element.download = filename;
    element.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
            Export Hub
          </p>

          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black text-white">
                投資研究匯出中心
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                讀取統一 Research Desk Store，產生 JSON、Markdown、表格摘要，
                方便貼到 Notion、Google Docs、GitHub 或投資日誌。
              </p>
            </div>

            <button
              onClick={loadData}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15"
            >
              重新讀取資料
            </button>
          </div>

          {message && (
            <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
              {message}
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <Kpi label="研究標的" value={items.length} />
            <Kpi
              label="接近進場"
              value={items.filter((item) => item.status === "ready").length}
            />
            <Kpi
              label="法人高分"
              value={items.filter((item) => (item.flowScore || 0) >= 70).length}
            />
            <Kpi
              label="缺風控"
              value={items.filter((item) => !item.entry || !item.stop).length}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ExportCard
            title="完整 Markdown 報告"
            description="包含每檔股票的狀態、分數、買點、研究理由與法人摘要。"
            text={markdown}
            filename="research-report.md"
            onCopy={(text) => copyText(text, "完整 Markdown")}
            onDownload={downloadText}
          />

          <ExportCard
            title="表格 Markdown"
            description="適合貼到 Notion / GitHub issue / Google Docs 的精簡表格。"
            text={tableMarkdown}
            filename="research-table.md"
            onCopy={(text) => copyText(text, "表格 Markdown")}
            onDownload={downloadText}
          />

          <ExportCard
            title="JSON 備份"
            description="完整備份 Research Desk，之後可以匯入恢復。"
            text={rawJson}
            filename="research-desk-backup.json"
            onCopy={(text) => copyText(text, "JSON")}
            onDownload={downloadText}
          />

          <section className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl">
            <h2 className="text-2xl font-black">研究清單預覽</h2>
            <p className="mt-2 text-sm text-slate-500">
              這裡確認目前 localStorage 內的 Research Desk 資料。
            </p>

            <div className="mt-5 space-y-3">
              {items.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                  尚無資料，請先到 Research Desk 或 Stock Cockpit 新增股票。
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-lg font-black text-slate-950">
                      {item.symbol} {item.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {STATUS_LABELS[item.status]}｜法人分數{" "}
                      {item.flowScore ?? "-"}｜進場{" "}
                      {formatResearchNumber(item.entry, 2)}｜停損{" "}
                      {formatResearchNumber(item.stop, 2)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function ExportCard({
  title,
  description,
  text,
  filename,
  onCopy,
  onDownload,
}: {
  title: string;
  description: string;
  text: string;
  filename: string;
  onCopy: (text: string) => void;
  onDownload: (filename: string, text: string) => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => onCopy(text)}
          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
        >
          複製
        </button>

        <button
          onClick={() => onDownload(filename, text)}
          className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700"
        >
          下載
        </button>
      </div>

      <textarea
        value={text}
        readOnly
        rows={18}
        className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-700"
      />
    </section>
  );
}