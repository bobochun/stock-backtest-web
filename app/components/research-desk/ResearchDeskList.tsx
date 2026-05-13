"use client";

import { ChangeEvent } from "react";
import {
  CHECKLIST_LABELS,
  ChecklistKey,
  ResearchItem,
  ResearchStatus,
  STATUS_LABELS,
  STATUS_STYLES,
} from "./types";
import { calcCompositeScore, calcPosition, formatNumber, toNumber } from "./utils";

type ResearchDeskListProps = {
  items: ResearchItem[];
  selectedId: string;
  accountSize: number;
  riskPct: number;
  onSelect: (id: string) => void;
  onUpdateItem: (id: string, patch: Partial<ResearchItem>) => void;
  onRemoveItem: (id: string) => void;
  onDuplicateItem: (item: ResearchItem) => void;
};

export default function ResearchDeskList({
  items,
  selectedId,
  accountSize,
  riskPct,
  onSelect,
  onUpdateItem,
  onRemoveItem,
  onDuplicateItem,
}: ResearchDeskListProps) {
  if (!items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        目前沒有研究股票，請先新增股票代號。
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => {
        const score = calcCompositeScore(item);
        const position = calcPosition(item, accountSize, riskPct);

        return (
          <article
            key={item.id}
            className={`rounded-3xl border bg-white p-5 text-slate-900 shadow-lg transition ${
              selectedId === item.id
                ? "border-cyan-300 ring-2 ring-cyan-200"
                : "border-slate-200"
            }`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <button onClick={() => onSelect(item.id)} className="text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-black text-slate-950">
                    {item.symbol}
                  </h2>

                  <input
                    value={item.name}
                    onChange={(event) =>
                      onUpdateItem(item.id, { name: event.target.value })
                    }
                    onClick={(event) => event.stopPropagation()}
                    className="rounded-xl border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700"
                  />

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${STATUS_STYLES[item.status]}`}
                  >
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </button>

              <div className="grid grid-cols-3 gap-2 text-center sm:min-w-72">
                <MiniMetric label="綜合分" value={score} />
                <MiniMetric label="法人分" value={item.flowScore ?? "-"} />
                <MiniMetric
                  label="R/R"
                  value={position.rewardRisk ? position.rewardRisk.toFixed(2) : "-"}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-4">
              <NumberField
                label="進場價"
                value={item.entry}
                onChange={(event) =>
                  onUpdateItem(item.id, { entry: toNumber(event.target.value) })
                }
              />

              <NumberField
                label="停損價"
                value={item.stop}
                onChange={(event) =>
                  onUpdateItem(item.id, { stop: toNumber(event.target.value) })
                }
              />

              <NumberField
                label="停利價"
                value={item.target}
                onChange={(event) =>
                  onUpdateItem(item.id, { target: toNumber(event.target.value) })
                }
              />

              <NumberField
                label="現價"
                value={item.currentPrice}
                onChange={(event) =>
                  onUpdateItem(item.id, {
                    currentPrice: toNumber(event.target.value),
                  })
                }
              />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div>
                <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                  研究理由
                </label>

                <textarea
                  value={item.thesis}
                  onChange={(event) =>
                    onUpdateItem(item.id, { thesis: event.target.value })
                  }
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-cyan-200"
                  placeholder="為什麼觀察這檔？題材、位階、籌碼、技術面..."
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                  筆記
                </label>

                <textarea
                  value={item.notes}
                  onChange={(event) =>
                    onUpdateItem(item.id, { notes: event.target.value })
                  }
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-cyan-200"
                  placeholder="等待條件、風險、新聞、觀察重點..."
                />
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {(Object.entries(CHECKLIST_LABELS) as [ChecklistKey, string][]).map(
                ([key, label]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={!!item.checklist[key]}
                      onChange={(event) =>
                        onUpdateItem(item.id, {
                          checklist: {
                            ...item.checklist,
                            [key]: event.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4"
                    />

                    {label}
                  </label>
                )
              )}
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-4">
              <MiniMetric label="建議股數" value={formatNumber(position.shares)} />
              <MiniMetric label="建議張數" value={formatNumber(position.lots)} />
              <MiniMetric label="投入金額" value={formatNumber(position.capital)} />
              <MiniMetric
                label="單股風險"
                value={formatNumber(position.riskPerShare, 2)}
              />
            </div>

            {item.flowReason && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-black">法人摘要：{item.flowSignal || "-"}</p>

                <p className="mt-1 leading-6">{item.flowReason}</p>

                <p className="mt-2 text-xs text-emerald-700">
                  外資 {formatNumber(item.foreignNetLots, 1)} 張｜投信{" "}
                  {formatNumber(item.trustNetLots, 1)} 張｜自營{" "}
                  {formatNumber(item.dealerNetLots, 1)} 張｜合計{" "}
                  {formatNumber(item.totalNetLots, 1)} 張
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {(["watching", "ready", "entered", "avoid"] as ResearchStatus[]).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => onUpdateItem(item.id, { status })}
                      className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                        item.status === status
                          ? STATUS_STYLES[status]
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {STATUS_LABELS[status]}
                    </button>
                  )
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onDuplicateItem(item)}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                >
                  複製
                </button>

                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                >
                  刪除
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-slate-100 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
    </div>
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