"use client";

import { useMemo, useState } from "react";

type ResearchStatus = "watching" | "ready" | "entered" | "avoid";

type ResearchItem = {
  id: string;
  symbol: string;
  name: string;
  status: ResearchStatus;
  thesis: string;
  notes: string;
  tags: string[];
  entry?: number;
  stop?: number;
  target?: number;
  currentPrice?: number;
  score: number;
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

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function makeItem({
  symbol,
  name,
  entry,
  stop,
  target,
  thesis,
}: {
  symbol: string;
  name: string;
  entry?: number;
  stop?: number;
  target?: number;
  thesis: string;
}): ResearchItem {
  return {
    id: uid(),
    symbol,
    name: name || symbol,
    status: entry && stop ? "ready" : "watching",
    thesis,
    notes: "",
    tags: ["quick-add"],
    entry,
    stop,
    target,
    currentPrice: undefined,
    score: 50,
    updatedAt: todayText(),
    checklist: {
      trend: false,
      flow: false,
      base: false,
      risk: Boolean(entry && stop),
      catalyst: false,
      valuation: false,
    },
  };
}

export default function QuickResearchAdd() {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("2330");
  const [name, setName] = useState("");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");
  const [thesis, setThesis] = useState("快速加入觀察，等待回測與法人籌碼確認。");
  const [message, setMessage] = useState("");

  const preview = useMemo(() => {
    const entryValue = toNumber(entry);
    const stopValue = toNumber(stop);
    const targetValue = toNumber(target);

    const risk =
      entryValue && stopValue
        ? Math.abs(entryValue - stopValue)
        : undefined;

    const reward =
      entryValue && targetValue
        ? Math.abs(targetValue - entryValue)
        : undefined;

    const rr = risk && reward ? reward / risk : undefined;

    return {
      entryValue,
      stopValue,
      targetValue,
      rr,
    };
  }, [entry, stop, target]);

  function addToResearchDesk() {
    const cleanSymbol = symbol.trim().toUpperCase();

    if (!cleanSymbol) {
      setMessage("請輸入股票代號。");
      return;
    }

    const item = makeItem({
      symbol: cleanSymbol,
      name: name.trim() || cleanSymbol,
      entry: preview.entryValue,
      stop: preview.stopValue,
      target: preview.targetValue,
      thesis,
    });

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw
        ? (JSON.parse(raw) as { items?: ResearchItem[]; accountSize?: number; riskPct?: number })
        : {};

      const items = parsed.items || [];
      const exists = items.some((existing) => existing.symbol === cleanSymbol);

      const nextItems = exists
        ? items.map((existing) =>
            existing.symbol === cleanSymbol
              ? {
                  ...existing,
                  ...item,
                  id: existing.id,
                  notes: existing.notes,
                  tags: Array.from(new Set([...(existing.tags || []), "quick-add"])),
                }
              : existing
          )
        : [item, ...items];

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          exportedAt: new Date().toISOString(),
          accountSize: parsed.accountSize || 500000,
          riskPct: parsed.riskPct || 1,
          items: nextItems,
        })
      );

      setMessage(exists ? "已更新 Research Desk 既有標的。" : "已加入 Research Desk。");
      setOpen(false);
    } catch {
      setMessage("加入失敗：localStorage 寫入錯誤。");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-300"
      >
        + 加入研究
      </button>

      {message && !open && (
        <div className="fixed bottom-5 right-5 z-[90] max-w-sm rounded-2xl border border-cyan-300/20 bg-slate-900 px-4 py-3 text-sm font-bold text-cyan-100 shadow-2xl">
          {message}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] bg-slate-950/75 px-4 py-8 backdrop-blur-md">
          <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-5 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                  Quick Add
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  快速加入 Research Desk
                </h2>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/15"
              >
                關閉
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="股票代號" value={symbol} onChange={setSymbol} />
              <Field label="股票名稱" value={name} onChange={setName} placeholder="可空白" />
              <Field label="進場價" value={entry} onChange={setEntry} type="number" />
              <Field label="停損價" value={stop} onChange={setStop} type="number" />
              <Field label="停利價" value={target} onChange={setTarget} type="number" />
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold text-slate-400">R/R 預估</p>
                <p className="mt-2 text-2xl font-black text-cyan-200">
                  {preview.rr ? preview.rr.toFixed(2) : "-"}
                </p>
              </div>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                研究理由
              </span>
              <textarea
                value={thesis}
                onChange={(event) => setThesis(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-300"
              />
            </label>

            <button
              onClick={addToResearchDesk}
              className="mt-5 w-full rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300"
            >
              加入 / 更新 Research Desk
            </button>
          </div>
        </div>
      )}
    </>
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
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-300"
      />
    </label>
  );
}