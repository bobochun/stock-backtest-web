"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const quickSymbols = [
  { symbol: "2330", name: "台積電" },
  { symbol: "0050", name: "元大台灣50" },
  { symbol: "006208", name: "富邦台50" },
  { symbol: "00878", name: "國泰永續高股息" },
  { symbol: "2317", name: "鴻海" },
  { symbol: "2454", name: "聯發科" },
  { symbol: "2382", name: "廣達" },
  { symbol: "2303", name: "聯電" },
  { symbol: "2603", name: "長榮" },
  { symbol: "2618", name: "長榮航" },
];

function cleanSymbol(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(".TW", "")
    .replace(".TWO", "")
    .replace(/\s+/g, "");
}

export default function StockQuickJump() {
  const router = useRouter();
  const [symbol, setSymbol] = useState("2330");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const clean = useMemo(() => cleanSymbol(symbol), [symbol]);

  function goStockCockpit(targetSymbol = clean) {
    const next = cleanSymbol(targetSymbol);
    if (!next) return;
    router.push(`/stock/${encodeURIComponent(next)}`);
    setOpen(false);
  }

  function goFlowLab(targetSymbol = clean) {
    const next = cleanSymbol(targetSymbol);
    if (!next) return;
    router.push(`/flow-lab?symbols=${encodeURIComponent(next)}`);
    setOpen(false);
  }

  function goHomeBacktest(targetSymbol = clean) {
    const next = cleanSymbol(targetSymbol);
    if (!next) return;
    router.push(`/?symbol=${encodeURIComponent(next)}`);
    setOpen(false);
  }

  function copyStockLink() {
    const next = cleanSymbol(clean);
    if (!next) return;

    const url = `${window.location.origin}/stock/${encodeURIComponent(next)}`;

    navigator.clipboard
      .writeText(url)
      .then(() => setMessage("Stock Cockpit 連結已複製。"))
      .catch(() => setMessage("複製失敗。"));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15"
      >
        股票快查
      </button>

      {message && !open && (
        <div className="fixed bottom-5 right-5 z-[90] max-w-sm rounded-2xl border border-cyan-300/20 bg-slate-900 px-4 py-3 text-sm font-bold text-cyan-100 shadow-2xl">
          {message}
        </div>
      )}

      {open && (
        <div className="absolute right-0 top-12 z-[80] w-[min(92vw,460px)] rounded-3xl border border-white/10 bg-slate-900 p-4 text-white shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                Stock Quick Jump
              </p>
              <h2 className="mt-1 text-lg font-black">股票快速操作</h2>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/15"
            >
              關閉
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  goStockCockpit();
                }
              }}
              placeholder="輸入股票代號，例如 2330"
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-300"
            />

            <button
              onClick={() => goStockCockpit()}
              className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300"
            >
              開啟
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => goStockCockpit()}
              className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15"
            >
              Stock Cockpit
            </button>

            <button
              onClick={() => goFlowLab()}
              className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15"
            >
              Flow Lab
            </button>

            <button
              onClick={() => goHomeBacktest()}
              className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15"
            >
              首頁回測
            </button>

            <button
              onClick={copyStockLink}
              className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15"
            >
              複製連結
            </button>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
              常用股票
            </p>

            <div className="flex flex-wrap gap-2">
              {quickSymbols.map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => goStockCockpit(item.symbol)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-cyan-100"
                >
                  {item.symbol} {item.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-xs leading-5 text-cyan-100">
            建議流程：先開 Stock Cockpit → 一鍵回測 → 更新法人 → 加入 Research Desk。
          </div>
        </div>
      )}
    </div>
  );
}