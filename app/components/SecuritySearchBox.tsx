"use client";

import { useEffect, useState } from "react";
import type { SecurityOption } from "../types";

type SecuritySearchBoxProps = {
  onSelectSymbol: (symbol: string) => void;
  onAddToWatchlist: (symbol: string) => void;
};

export default function SecuritySearchBox({
  onSelectSymbol,
  onAddToWatchlist,
}: SecuritySearchBoxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SecurityOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setMessage("");

      try {
        const response = await fetch(
          `/api/security/search?q=${encodeURIComponent(query)}&limit=12`
        );

        const data = await response.json();

        if (!response.ok) {
          setMessage(data.error || "搜尋失敗");
          setResults([]);
          return;
        }

        setResults(data.results || []);
      } catch {
        setMessage("搜尋時無法連線到後端");
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  async function refreshSecurityMaster() {
    setIsRefreshing(true);
    setMessage("正在刷新台股商品資料庫，可能需要幾秒到十幾秒...");

    try {
      const response = await fetch("/api/security/refresh");
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "刷新失敗");
        return;
      }

      setMessage(`刷新完成，共 ${data.count} 筆商品`);
    } catch {
      setMessage("刷新時無法連線到後端");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">股票 / ETF 搜尋</h2>
          <p className="mt-1 text-sm text-slate-500">
            可輸入代號、中文名稱、ETF、stock、listed、otc 等關鍵字。
          </p>
        </div>

        <button
          onClick={refreshSecurityMaster}
          disabled={isRefreshing}
          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 disabled:opacity-60"
        >
          {isRefreshing ? "刷新中..." : "刷新台股商品庫"}
        </button>
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-3"
        placeholder="例如：台積、高股息、0050、ETF、半導體"
      />

      {message && <p className="mt-3 text-sm text-blue-700">{message}</p>}

      {isSearching && <p className="mt-3 text-sm text-slate-500">搜尋中...</p>}

      {results.length > 0 && (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {results.map((item) => (
            <div
              key={`${item.symbol}-${item.name}`}
              className="rounded-2xl bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">
                    {item.symbol}｜{item.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {item.type || "-"}｜{item.market || "-"}｜
                    {item.industry || "-"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => onSelectSymbol(item.symbol)}
                  className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white"
                >
                  設為單一回測
                </button>

                <button
                  onClick={() => onAddToWatchlist(item.symbol)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700"
                >
                  加入觀察清單
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}