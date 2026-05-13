"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  calcResearchPosition,
  calcResearchScore,
  readResearchDeskStorage,
  ResearchItem,
  STATUS_LABELS,
  formatResearchNumber,
} from "../../lib/researchDeskStore";

const pages = [
  {
    title: "首頁回測工作區",
    href: "/",
    tag: "Backtest",
    desc: "單股回測、策略比較、掃描清單、ETF 快速清單與定期定額。",
  },
  {
    title: "Stock Cockpit",
    href: "/stock/2330",
    tag: "Stock",
    desc: "單股研究駕駛艙：一鍵回測、法人、交易計畫、加入研究。",
  },
  {
    title: "Flow Lab 法人籌碼",
    href: "/flow-lab?symbols=2330%2C%200050",
    tag: "Flow",
    desc: "檢查外資、投信、自營商與近 N 日法人籌碼趨勢。",
  },
  {
    title: "Screener Lab 盤後選股",
    href: "/screener-lab",
    tag: "Screener",
    desc: "從技術面、突破、RSI、法人條件中找候選股。",
  },
  {
    title: "Research Desk Pro",
    href: "/research-desk",
    tag: "Desk",
    desc: "研究筆記、部位控管、法人更新、JSON/Markdown 匯出。",
  },
  {
    title: "Quick Plan 交易計畫",
    href: "/quick-plan",
    tag: "Plan",
    desc: "快速計算進場、停損、停利、張數、R/R 與最大虧損。",
  },
  {
    title: "Optimizer Lite 快速參數",
    href: "/optimizer-lite",
    tag: "Lite",
    desc: "產生少量高品質參數組合，避免 Vercel 上重運算超時。",
  },
  {
    title: "Pro Lab 風險實驗室",
    href: "/pro-lab",
    tag: "Risk",
    desc: "Monte Carlo、Kelly、壓力測試、連敗與回撤風險。",
  },
  {
    title: "Report Lab 報告中心",
    href: "/report-lab",
    tag: "Report",
    desc: "產出回測報告、績效摘要與交易檢討素材。",
  },
  {
    title: "Export Hub 匯出中心",
    href: "/export-hub",
    tag: "Export",
    desc: "把 Research Desk 資料輸出為 Markdown、JSON 與投資筆記。",
  },
];

export default function DashboardHub() {
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [accountSize, setAccountSize] = useState(500000);
  const [riskPct, setRiskPct] = useState(1);
  const [now, setNow] = useState("");

  function loadData() {
    const storage = readResearchDeskStorage();
    setItems(storage.items);
    setAccountSize(storage.accountSize);
    setRiskPct(storage.riskPct);
    setNow(new Date().toLocaleString("zh-TW"));
  }

  useEffect(() => {
    loadData();
  }, []);

  const kpi = useMemo(() => {
    const total = items.length;
    const ready = items.filter((item) => item.status === "ready").length;
    const entered = items.filter((item) => item.status === "entered").length;
    const highFlow = items.filter((item) => (item.flowScore || 0) >= 70).length;
    const missingRisk = items.filter((item) => !item.entry || !item.stop).length;
    const avgScore =
      total > 0
        ? Math.round(
            items.reduce((sum, item) => sum + calcResearchScore(item), 0) / total
          )
        : 0;

    return {
      total,
      ready,
      entered,
      highFlow,
      missingRisk,
      avgScore,
    };
  }, [items]);

  const topItems = useMemo(() => {
    return [...items]
      .sort((a, b) => calcResearchScore(b) - calcResearchScore(a))
      .slice(0, 6);
  }, [items]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
            Stock Backtest Web
          </p>

          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                台股研究總儀表板
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                統一讀取 Research Desk Store，把回測、法人籌碼、盤後選股、
                交易計畫、風險控管與報告輸出串成一套流程。
              </p>
            </div>

            <button
              onClick={loadData}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15"
            >
              重新讀取資料
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-300">
            更新時間：{now || "-"}｜帳戶資金：{formatResearchNumber(accountSize)}｜
            單筆風險：{riskPct}%
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-6">
            <Kpi label="研究股票" value={kpi.total} hint="Research Desk 清單" />
            <Kpi label="接近進場" value={kpi.ready} hint="Ready 狀態" />
            <Kpi label="已進場" value={kpi.entered} hint="Entered 狀態" />
            <Kpi label="法人高分" value={kpi.highFlow} hint="flowScore ≥ 70" />
            <Kpi label="缺風控" value={kpi.missingRisk} hint="尚未設定 entry/stop" />
            <Kpi label="平均分數" value={kpi.avgScore} hint="研究清單品質" />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl">
            <div>
              <h2 className="text-2xl font-black">功能入口</h2>
              <p className="mt-1 text-sm text-slate-500">
                建議流程：Screener → Flow → Stock Cockpit → Research Desk → Pro Lab → Export。
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {pages.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="group rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                        {page.tag}
                      </span>

                      <h3 className="mt-3 text-lg font-black text-slate-950">
                        {page.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {page.desc}
                      </p>
                    </div>

                    <span className="text-2xl text-slate-300 transition group-hover:translate-x-1 group-hover:text-cyan-500">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl">
              <h2 className="text-2xl font-black">今日操作流程</h2>

              <div className="mt-5 space-y-3">
                {[
                  "Screener Lab 找今天盤後轉強候選股",
                  "Flow Lab 檢查法人是否同步買超",
                  "Stock Cockpit 單股回測與交易計畫",
                  "Research Desk 記錄買點、停損、理由",
                  "Quick Plan 算張數與最大虧損",
                  "Export Hub 輸出今日研究紀錄",
                ].map((text, index) => (
                  <div
                    key={text}
                    className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
                      {index + 1}
                    </div>

                    <p className="text-sm font-semibold text-slate-700">{text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl">
              <h2 className="text-2xl font-black">Research Desk 摘要</h2>

              {topItems.length === 0 ? (
                <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  尚未建立 Research Desk 清單。先到 /research-desk 或 /stock/2330 新增股票。
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {topItems.map((item) => {
                    const position = calcResearchPosition({
                      item,
                      accountSize,
                      riskPct,
                    });

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-black text-slate-950">
                              {item.symbol} {item.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {STATUS_LABELS[item.status]}｜綜合分數{" "}
                              {calcResearchScore(item)}｜法人分數{" "}
                              {item.flowScore ?? "-"}
                            </p>

                            <p className="mt-2 text-xs text-slate-500">
                              建議股數 {formatResearchNumber(position.shares)}｜
                              預估投入 {formatResearchNumber(position.capital)}
                            </p>
                          </div>

                          <Link
                            href={`/stock/${item.symbol}`}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                          >
                            Cockpit
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}