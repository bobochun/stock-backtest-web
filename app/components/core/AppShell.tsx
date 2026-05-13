"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";
import CommandPalette, { CommandItem } from "./CommandPalette";
import QuickResearchAdd from "./QuickResearchAdd";
import WorkflowBar from "./WorkflowBar";

const navItems: CommandItem[] = [
  {
    title: "首頁回測",
    href: "/",
    group: "核心",
    desc: "單股回測、策略比較、ETF 快速清單",
    badge: "Backtest",
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    group: "核心",
    desc: "全站研究總儀表板",
    badge: "Hub",
  },
  {
    title: "Research Desk",
    href: "/research-desk",
    group: "核心",
    desc: "研究清單、筆記、部位控管",
    badge: "Desk",
  },
  {
    title: "Flow Lab",
    href: "/flow-lab?symbols=2330%2C%200050",
    group: "籌碼",
    desc: "法人買賣超、籌碼分數",
    badge: "Flow",
  },
  {
    title: "Screener Lab",
    href: "/screener-lab",
    group: "選股",
    desc: "盤後掃描、候選股篩選",
    badge: "Scan",
  },
  {
    title: "Watchlist",
    href: "/watchlist-lab",
    group: "操作",
    desc: "觀察清單、等待買點",
    badge: "Watch",
  },
  {
    title: "Quick Plan",
    href: "/quick-plan",
    group: "操作",
    desc: "進場、停損、停利、張數計算",
    badge: "Plan",
  },
  {
    title: "Optimizer Lite",
    href: "/optimizer-lite",
    group: "策略",
    desc: "Vercel 友善快速參數候選",
    badge: "Lite",
  },
  {
    title: "Pro Lab",
    href: "/pro-lab",
    group: "風控",
    desc: "Monte Carlo、Kelly、壓力測試",
    badge: "Risk",
  },
  {
    title: "Report Lab",
    href: "/report-lab",
    group: "輸出",
    desc: "回測報告、績效摘要",
    badge: "Report",
  },
  {
    title: "Export Hub",
    href: "/export-hub",
    group: "輸出",
    desc: "Markdown、JSON、研究備份",
    badge: "Export",
  },
];

function isActivePath(pathname: string, href: string) {
  const cleanHref = href.split("?")[0];

  if (cleanHref === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(cleanHref);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const activeItem = useMemo(() => {
    return navItems.find((item) => isActivePath(pathname, item.href));
  }, [pathname]);

  const groups = useMemo(() => {
    const result = new Map<string, CommandItem[]>();

    for (const item of navItems) {
      const list = result.get(item.group) || [];
      list.push(item);
      result.set(item.group, list);
    }

    return Array.from(result.entries());
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400 font-black text-slate-950 shadow-lg shadow-cyan-950/40">
              股
            </div>

            <div>
              <p className="text-sm font-black leading-tight tracking-wide">
                Stock Backtest Web
              </p>
              <p className="text-xs text-slate-400">
                台股研究・回測・籌碼・風控
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 xl:flex">
            {navItems.slice(0, 7).map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-2xl px-3 py-2 text-sm font-bold transition ${
                    active
                      ? "bg-cyan-400 text-slate-950"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.title}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-slate-300 lg:block">
              Current：{activeItem?.title || "首頁"}
            </div>

            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15 sm:block"
            >
              搜尋工具
            </button>

            <QuickResearchAdd />

            <button
              onClick={() => setMenuOpen((value) => !value)}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15"
            >
              {menuOpen ? "關閉" : "選單"}
            </button>
          </div>
        </div>

        <div className="border-t border-white/10 bg-slate-900/80">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? "bg-cyan-400 text-slate-950"
                      : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.badge}
                </Link>
              );
            })}
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 bg-slate-950/95">
            <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
              {groups.map(([group, items]) => (
                <section key={group}>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                    {group}
                  </p>

                  <div className="space-y-2">
                    {items.map((item) => {
                      const active = isActivePath(pathname, item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={`block rounded-2xl border p-3 transition ${
                            active
                              ? "border-cyan-300 bg-cyan-300/10"
                              : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-black text-white">
                              {item.title}
                            </p>
                            <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black text-cyan-200">
                              {item.badge}
                            </span>
                          </div>

                          <p className="mt-1 text-xs leading-5 text-slate-400">
                            {item.desc}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </header>

      <WorkflowBar />

      <div className="bg-slate-950">{children}</div>

      <footer className="border-t border-white/10 bg-slate-950 px-4 py-8 text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between">
          <p>
            Stock Backtest Web｜個人台股研究平台｜盤後研究、策略驗證、風險控管
          </p>

          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard" className="hover:text-white">
              Dashboard
            </Link>
            <span>・</span>
            <Link href="/research-desk" className="hover:text-white">
              Research Desk
            </Link>
            <span>・</span>
            <Link href="/quick-plan" className="hover:text-white">
              Quick Plan
            </Link>
            <span>・</span>
            <Link href="/export-hub" className="hover:text-white">
              Export Hub
            </Link>
          </div>
        </div>
      </footer>

      <CommandPalette
        items={navItems}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  );
}