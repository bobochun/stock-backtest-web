"use client";

import { ChangeEvent } from "react";
import { PositionResult, ResearchItem } from "./types";
import { formatNumber, toNumber } from "./utils";

type ResearchDeskSidePanelProps = {
  selectedItem?: ResearchItem;
  selectedPosition?: PositionResult;
  accountSize: number;
  riskPct: number;
  importText: string;
  setAccountSize: (value: number) => void;
  setRiskPct: (value: number) => void;
  setImportText: (value: string) => void;
  onImportJson: () => void;
  onClearDesk: () => void;
};

export default function ResearchDeskSidePanel({
  selectedItem,
  selectedPosition,
  accountSize,
  riskPct,
  importText,
  setAccountSize,
  setRiskPct,
  setImportText,
  onImportJson,
  onClearDesk,
}: ResearchDeskSidePanelProps) {
  function handleAccountSizeChange(event: ChangeEvent<HTMLInputElement>) {
    setAccountSize(toNumber(event.target.value) ?? 0);
  }

  function handleRiskPctChange(event: ChangeEvent<HTMLInputElement>) {
    setRiskPct(toNumber(event.target.value) ?? 0);
  }

  return (
    <aside className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl">
        <h2 className="text-xl font-black">部位控管計算器</h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          依照帳戶資金與單筆風險，估算最大股數、張數與投入金額。
        </p>

        <div className="mt-5 grid gap-4">
          <NumberField
            label="帳戶資金"
            value={accountSize}
            onChange={handleAccountSizeChange}
          />

          <NumberField
            label="單筆風險 %"
            value={riskPct}
            onChange={handleRiskPctChange}
          />
        </div>

        {selectedItem && selectedPosition && (
          <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-white">
            <p className="text-sm text-slate-400">目前選取</p>

            <h3 className="mt-1 text-2xl font-black">
              {selectedItem.symbol} {selectedItem.name}
            </h3>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <DarkMetric
                label="最大承受虧損"
                value={formatNumber(selectedPosition.maxRisk)}
              />
              <DarkMetric
                label="單股風險"
                value={formatNumber(selectedPosition.riskPerShare, 2)}
              />
              <DarkMetric
                label="建議股數"
                value={formatNumber(selectedPosition.shares)}
              />
              <DarkMetric
                label="建議張數"
                value={formatNumber(selectedPosition.lots)}
              />
              <DarkMetric
                label="投入資金"
                value={formatNumber(selectedPosition.capital)}
              />
              <DarkMetric
                label="R/R"
                value={
                  selectedPosition.rewardRisk
                    ? selectedPosition.rewardRisk.toFixed(2)
                    : "-"
                }
              />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl">
        <h2 className="text-xl font-black">實戰流程</h2>

        <div className="mt-4 space-y-3">
          {[
            "Screener Lab 找候選股",
            "Flow Lab 確認法人是否同步偏多",
            "首頁回測驗證策略是否有歷史優勢",
            "Research Desk 設定買點 / 停損 / 停利",
            "Pro Lab 檢查最大回撤與部位風險",
            "Report Lab 產生投資紀錄",
          ].map((text, index) => (
            <div
              key={text}
              className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
                {index + 1}
              </div>

              <p className="text-sm font-semibold text-slate-700">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl">
        <h2 className="text-xl font-black">JSON 匯入</h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          從「匯出 JSON」複製後，可在這裡貼回來恢復清單。
        </p>

        <textarea
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          rows={6}
          className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
          placeholder="貼上 JSON..."
        />

        <div className="mt-4 flex gap-2">
          <button
            onClick={onImportJson}
            className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-700"
          >
            匯入
          </button>

          <button
            onClick={onClearDesk}
            className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
          >
            重設
          </button>
        </div>
      </div>
    </aside>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <input
        type="number"
        value={value ?? ""}
        onChange={onChange}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-cyan-200"
      />
    </label>
  );
}

function DarkMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}