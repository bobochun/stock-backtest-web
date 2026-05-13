"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type CommandItem = {
  title: string;
  href: string;
  group: string;
  desc: string;
  badge?: string;
};

type CommandPaletteProps = {
  items: CommandItem[];
  open: boolean;
  onClose: () => void;
};

export default function CommandPalette({
  items,
  open,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) {
      return items;
    }

    return items.filter((item) => {
      const text = [
        item.title,
        item.href,
        item.group,
        item.desc,
        item.badge || "",
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(keyword);
    });
  }, [items, query]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/75 px-4 py-10 backdrop-blur-md">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900 text-white shadow-2xl">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                Command Palette
              </p>
              <h2 className="mt-1 text-xl font-black">快速搜尋工具</h2>
            </div>

            <button
              onClick={onClose}
              className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/15"
            >
              Esc 關閉
            </button>
          </div>

          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋：回測、Flow、Watchlist、Report、部位、風控..."
            className="mt-4 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-300"
          />
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-3">
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl bg-white/5 p-6 text-center text-sm text-slate-400">
              找不到符合的工具。
            </div>
          ) : (
            <div className="grid gap-2">
              {filteredItems.map((item) => (
                <Link
                  key={`${item.href}-${item.title}`}
                  href={item.href}
                  onClick={onClose}
                  className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-black text-white">
                          {item.title}
                        </p>

                        {item.badge && (
                          <span className="rounded-full bg-cyan-300/10 px-2 py-1 text-[10px] font-black text-cyan-200">
                            {item.badge}
                          </span>
                        )}

                        <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black text-slate-300">
                          {item.group}
                        </span>
                      </div>

                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        {item.desc}
                      </p>
                    </div>

                    <span className="text-2xl text-slate-500 transition group-hover:translate-x-1 group-hover:text-cyan-300">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}