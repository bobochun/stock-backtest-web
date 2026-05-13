"use client";

import Link from "next/link";

const steps = [
  {
    title: "1 選股",
    href: "/screener-lab",
    desc: "盤後找候選",
  },
  {
    title: "2 籌碼",
    href: "/flow-lab?symbols=2330%2C%200050",
    desc: "法人確認",
  },
  {
    title: "3 回測",
    href: "/",
    desc: "策略驗證",
  },
  {
    title: "4 研究",
    href: "/research-desk",
    desc: "筆記與買點",
  },
  {
    title: "5 風控",
    href: "/quick-plan",
    desc: "部位張數",
  },
  {
    title: "6 報告",
    href: "/export-hub",
    desc: "匯出紀錄",
  },
];

export default function WorkflowBar() {
  return (
    <div className="border-b border-white/10 bg-slate-950">
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
        {steps.map((step) => (
          <Link
            key={step.href}
            href={step.href}
            className="min-w-[140px] shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
          >
            <p className="text-sm font-black text-white">{step.title}</p>
            <p className="mt-1 text-xs text-slate-400">{step.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}