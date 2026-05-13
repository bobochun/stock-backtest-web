import {
  ChecklistKey,
  CHECKLIST_LABELS,
  FlowRecord,
  PositionResult,
  ResearchItem,
  STATUS_LABELS,
} from "./types";

export function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function todayText() {
  return new Date().toISOString().slice(0, 10);
}

export function emptyChecklist(): Record<ChecklistKey, boolean> {
  return {
    trend: false,
    flow: false,
    base: false,
    risk: false,
    catalyst: false,
    valuation: false,
  };
}

export function normalizeSymbols(input: string) {
  return input
    .split(/[,，\s\n]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.replace(".TW", "").replace(".TWO", ""))
    .filter((value, index, arr) => arr.indexOf(value) === index);
}

export function toNumber(value: string) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

export function formatNumber(value?: number, digits = 0) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "-";
  }

  return value.toLocaleString("zh-TW", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatPct(value?: number, digits = 1) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "-";
  }

  return `${value.toFixed(digits)}%`;
}

export function calcChecklistScore(item: ResearchItem) {
  const checkedCount = Object.values(item.checklist).filter(Boolean).length;
  const totalCount = Object.keys(CHECKLIST_LABELS).length;

  return Math.round((checkedCount / totalCount) * 100);
}

export function calcCompositeScore(item: ResearchItem) {
  const checklistScore = calcChecklistScore(item);
  const flowScore = item.flowScore ?? 50;
  const riskScore = item.entry && item.stop && item.entry > item.stop ? 75 : 45;

  return Math.round(checklistScore * 0.4 + flowScore * 0.4 + riskScore * 0.2);
}

export function calcPosition(
  item: ResearchItem,
  accountSize: number,
  riskPct: number
): PositionResult {
  if (!item.entry || !item.stop || item.entry <= 0 || item.stop <= 0) {
    return {
      riskPerShare: 0,
      maxRisk: accountSize * (riskPct / 100),
      shares: 0,
      lots: 0,
      capital: 0,
      rewardRisk: 0,
    };
  }

  const riskPerShare = Math.abs(item.entry - item.stop);
  const maxRisk = accountSize * (riskPct / 100);
  const shares = riskPerShare > 0 ? Math.floor(maxRisk / riskPerShare) : 0;
  const lots = Math.floor(shares / 1000);
  const capital = shares * item.entry;

  const rewardRisk =
    item.target && item.target > item.entry
      ? (item.target - item.entry) / riskPerShare
      : 0;

  return {
    riskPerShare,
    maxRisk,
    shares,
    lots,
    capital,
    rewardRisk,
  };
}

export function extractFlowRecords(data: unknown): FlowRecord[] {
  if (Array.isArray(data)) {
    return data as FlowRecord[];
  }

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;

    const candidates = [
      obj.records,
      obj.items,
      obj.data,
      obj.results,
      obj.flowRecords,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as FlowRecord[];
      }
    }
  }

  return [];
}

export function createDefaultItems(): ResearchItem[] {
  return [
    {
      id: uid(),
      symbol: "2330",
      name: "台積電",
      status: "watching",
      thesis: "大型權值股核心觀察，適合作為台股趨勢與半導體資金風向指標。",
      notes: "等待技術面轉強或回測重要均線後再評估。",
      tags: ["權值", "半導體", "AI"],
      entry: undefined,
      stop: undefined,
      target: undefined,
      score: 60,
      updatedAt: todayText(),
      checklist: {
        ...emptyChecklist(),
        trend: true,
        base: true,
      },
    },
    {
      id: uid(),
      symbol: "0050",
      name: "元大台灣50",
      status: "watching",
      thesis: "大盤核心 ETF，適合長期配置與大盤回檔分批。",
      notes: "可搭配定期定額與回檔加碼策略。",
      tags: ["ETF", "大盤", "長期"],
      entry: undefined,
      stop: undefined,
      target: undefined,
      score: 55,
      updatedAt: todayText(),
      checklist: {
        ...emptyChecklist(),
        risk: true,
        valuation: true,
      },
    },
  ];
}

export function makeMarkdownReport(
  items: ResearchItem[],
  accountSize: number,
  riskPct: number
) {
  const lines: string[] = [];

  lines.push("# 台股研究工作台報告");
  lines.push("");
  lines.push(`產生日期：${todayText()}`);
  lines.push(`帳戶資金：${formatNumber(accountSize)} 元`);
  lines.push(`單筆風險：${riskPct}%`);
  lines.push("");

  const sorted = [...items].sort(
    (a, b) => calcCompositeScore(b) - calcCompositeScore(a)
  );

  for (const item of sorted) {
    const position = calcPosition(item, accountSize, riskPct);

    lines.push(`## ${item.symbol} ${item.name}`);
    lines.push("");
    lines.push(`- 狀態：${STATUS_LABELS[item.status]}`);
    lines.push(`- 綜合分數：${calcCompositeScore(item)}`);
    lines.push(`- 法人分數：${item.flowScore ?? "-"}`);
    lines.push(`- 法人訊號：${item.flowSignal ?? "-"}`);
    lines.push(`- 進場：${formatNumber(item.entry, 2)}`);
    lines.push(`- 停損：${formatNumber(item.stop, 2)}`);
    lines.push(`- 停利：${formatNumber(item.target, 2)}`);
    lines.push(`- 建議股數：${formatNumber(position.shares)}`);
    lines.push(`- 建議張數：${formatNumber(position.lots)}`);
    lines.push(`- 預估投入金額：${formatNumber(position.capital)}`);
    lines.push(
      `- 報酬風險比：${
        position.rewardRisk ? position.rewardRisk.toFixed(2) : "-"
      }`
    );
    lines.push("");
    lines.push("### 研究理由");
    lines.push(item.thesis || "-");
    lines.push("");
    lines.push("### 筆記");
    lines.push(item.notes || "-");
    lines.push("");
    lines.push("### 法人摘要");
    lines.push(item.flowReason || "-");
    lines.push("");
  }

  return lines.join("\n");
}