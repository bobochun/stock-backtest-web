export type ResearchStatus = "watching" | "ready" | "entered" | "avoid";

export type ChecklistKey =
  | "trend"
  | "flow"
  | "base"
  | "risk"
  | "catalyst"
  | "valuation";

export type ResearchChecklist = Record<ChecklistKey, boolean>;

export type ResearchItem = {
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
  flowScore?: number;
  flowSignal?: string;
  flowReason?: string;
  foreignNetLots?: number;
  trustNetLots?: number;
  dealerNetLots?: number;
  totalNetLots?: number;
  updatedAt: string;
  checklist: ResearchChecklist;
};

export type ResearchDeskStorage = {
  version: number;
  exportedAt?: string;
  accountSize: number;
  riskPct: number;
  items: ResearchItem[];
};

export type ResearchUpsertInput = {
  symbol: string;
  name?: string;
  status?: ResearchStatus;
  thesis?: string;
  notes?: string;
  tags?: string[];
  entry?: number;
  stop?: number;
  target?: number;
  currentPrice?: number;
  flowScore?: number;
  flowSignal?: string;
  flowReason?: string;
  foreignNetLots?: number;
  trustNetLots?: number;
  dealerNetLots?: number;
  totalNetLots?: number;
  checklist?: Partial<ResearchChecklist>;
};

export const RESEARCH_DESK_STORAGE_KEY = "stock-research-desk-pro-v1";

export const STATUS_LABELS: Record<ResearchStatus, string> = {
  watching: "觀察中",
  ready: "接近進場",
  entered: "已進場",
  avoid: "暫避",
};

export const CHECKLIST_LABELS: Record<ChecklistKey, string> = {
  trend: "技術趨勢轉強",
  flow: "法人籌碼支持",
  base: "基期不過高",
  risk: "停損明確",
  catalyst: "題材 / 財報 / 產業催化",
  valuation: "估值合理",
};

export function createResearchId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function todayText() {
  return new Date().toISOString().slice(0, 10);
}

export function cleanResearchSymbol(symbol: string) {
  return symbol
    .trim()
    .toUpperCase()
    .replace(".TW", "")
    .replace(".TWO", "")
    .replace(/\s+/g, "");
}

export function emptyChecklist(): ResearchChecklist {
  return {
    trend: false,
    flow: false,
    base: false,
    risk: false,
    catalyst: false,
    valuation: false,
  };
}

export function normalizeResearchTags(tags?: string[]) {
  return Array.from(
    new Set((tags || []).map((tag) => String(tag).trim()).filter(Boolean))
  );
}

export function createDefaultResearchItems(): ResearchItem[] {
  return [
    {
      id: createResearchId(),
      symbol: "2330",
      name: "台積電",
      status: "watching",
      thesis: "大型權值股核心觀察，適合作為台股趨勢與半導體資金風向指標。",
      notes: "等待技術面轉強或回測重要均線後再評估。",
      tags: ["權值", "半導體", "AI"],
      score: 60,
      updatedAt: todayText(),
      checklist: {
        ...emptyChecklist(),
        trend: true,
        base: true,
      },
    },
    {
      id: createResearchId(),
      symbol: "0050",
      name: "元大台灣50",
      status: "watching",
      thesis: "大盤核心 ETF，適合長期配置與大盤回檔分批。",
      notes: "可搭配定期定額與回檔加碼策略。",
      tags: ["ETF", "大盤", "長期"],
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

export function normalizeResearchItem(item: Partial<ResearchItem>): ResearchItem {
  const symbol = cleanResearchSymbol(item.symbol || "");

  return {
    id: item.id || createResearchId(),
    symbol,
    name: item.name || symbol || "UNKNOWN",
    status: item.status || "watching",
    thesis: item.thesis || "",
    notes: item.notes || "",
    tags: normalizeResearchTags(item.tags),
    entry: item.entry,
    stop: item.stop,
    target: item.target,
    currentPrice: item.currentPrice,
    score: typeof item.score === "number" ? item.score : 50,
    flowScore: item.flowScore,
    flowSignal: item.flowSignal,
    flowReason: item.flowReason,
    foreignNetLots: item.foreignNetLots,
    trustNetLots: item.trustNetLots,
    dealerNetLots: item.dealerNetLots,
    totalNetLots: item.totalNetLots,
    updatedAt: item.updatedAt || todayText(),
    checklist: {
      ...emptyChecklist(),
      ...(item.checklist || {}),
    },
  };
}

export function readResearchDeskStorage(): ResearchDeskStorage {
  if (typeof window === "undefined") {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      accountSize: 500000,
      riskPct: 1,
      items: [],
    };
  }

  try {
    const raw = window.localStorage.getItem(RESEARCH_DESK_STORAGE_KEY);

    if (!raw) {
      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        accountSize: 500000,
        riskPct: 1,
        items: createDefaultResearchItems(),
      };
    }

    const parsed = JSON.parse(raw) as Partial<ResearchDeskStorage>;

    return {
      version: parsed.version || 1,
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      accountSize: parsed.accountSize || 500000,
      riskPct: parsed.riskPct || 1,
      items: Array.isArray(parsed.items)
        ? parsed.items.map(normalizeResearchItem)
        : createDefaultResearchItems(),
    };
  } catch {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      accountSize: 500000,
      riskPct: 1,
      items: createDefaultResearchItems(),
    };
  }
}

export function writeResearchDeskStorage(payload: ResearchDeskStorage) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    RESEARCH_DESK_STORAGE_KEY,
    JSON.stringify({
      version: payload.version || 1,
      exportedAt: new Date().toISOString(),
      accountSize: payload.accountSize || 500000,
      riskPct: payload.riskPct || 1,
      items: payload.items.map(normalizeResearchItem),
    })
  );
}

export function makeResearchItem(input: ResearchUpsertInput): ResearchItem {
  const symbol = cleanResearchSymbol(input.symbol);
  const hasRisk = Boolean(input.entry && input.stop);
  const hasFlow = (input.flowScore || 0) >= 65;

  return normalizeResearchItem({
    id: createResearchId(),
    symbol,
    name: input.name || symbol,
    status: input.status || (hasRisk && hasFlow ? "ready" : "watching"),
    thesis: input.thesis || "",
    notes: input.notes || "",
    tags: normalizeResearchTags(input.tags),
    entry: input.entry,
    stop: input.stop,
    target: input.target,
    currentPrice: input.currentPrice,
    score: 50,
    flowScore: input.flowScore,
    flowSignal: input.flowSignal,
    flowReason: input.flowReason,
    foreignNetLots: input.foreignNetLots,
    trustNetLots: input.trustNetLots,
    dealerNetLots: input.dealerNetLots,
    totalNetLots: input.totalNetLots,
    updatedAt: todayText(),
    checklist: {
      ...emptyChecklist(),
      risk: hasRisk,
      flow: hasFlow,
      ...(input.checklist || {}),
    },
  });
}

export function upsertResearchItem(input: ResearchUpsertInput) {
  const storage = readResearchDeskStorage();
  const nextItem = makeResearchItem(input);

  const exists = storage.items.some((item) => item.symbol === nextItem.symbol);

  const nextItems = exists
    ? storage.items.map((item) => {
        if (item.symbol !== nextItem.symbol) return item;

        return normalizeResearchItem({
          ...item,
          ...nextItem,
          id: item.id,
          notes: nextItem.notes || item.notes,
          tags: normalizeResearchTags([
            ...(item.tags || []),
            ...(nextItem.tags || []),
          ]),
          checklist: {
            ...item.checklist,
            ...nextItem.checklist,
          },
          updatedAt: todayText(),
        });
      })
    : [nextItem, ...storage.items];

  const nextStorage = {
    ...storage,
    items: nextItems,
  };

  writeResearchDeskStorage(nextStorage);

  return {
    item: nextItem,
    existed: exists,
    storage: nextStorage,
  };
}

export function calcChecklistScore(item: ResearchItem) {
  const checkedCount = Object.values(item.checklist).filter(Boolean).length;
  return Math.round((checkedCount / Object.keys(CHECKLIST_LABELS).length) * 100);
}

export function calcResearchScore(item: ResearchItem) {
  const checklistScore = calcChecklistScore(item);
  const flowScore = item.flowScore ?? 50;
  const riskScore = item.entry && item.stop && item.entry > item.stop ? 75 : 45;

  return Math.round(checklistScore * 0.4 + flowScore * 0.4 + riskScore * 0.2);
}

export function calcResearchPosition({
  item,
  accountSize,
  riskPct,
}: {
  item: ResearchItem;
  accountSize: number;
  riskPct: number;
}) {
  const maxRisk = accountSize * (riskPct / 100);

  if (!item.entry || !item.stop || item.entry <= 0 || item.stop <= 0) {
    return {
      maxRisk,
      riskPerShare: 0,
      shares: 0,
      lots: 0,
      capital: 0,
      rewardRisk: 0,
    };
  }

  const riskPerShare = Math.abs(item.entry - item.stop);
  const shares = riskPerShare > 0 ? Math.floor(maxRisk / riskPerShare) : 0;
  const lots = Math.floor(shares / 1000);
  const capital = shares * item.entry;

  const rewardRisk =
    item.target && item.target > item.entry
      ? (item.target - item.entry) / riskPerShare
      : 0;

  return {
    maxRisk,
    riskPerShare,
    shares,
    lots,
    capital,
    rewardRisk,
  };
}

export function formatResearchNumber(value?: number, digits = 0) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "-";
  }

  return value.toLocaleString("zh-TW", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function buildResearchMarkdown(items: ResearchItem[]) {
  const lines: string[] = [];

  lines.push("# Research Desk 研究清單");
  lines.push("");
  lines.push(`產生時間：${new Date().toLocaleString("zh-TW")}`);
  lines.push("");

  const sorted = [...items].sort(
    (a, b) => calcResearchScore(b) - calcResearchScore(a)
  );

  for (const item of sorted) {
    lines.push(`## ${item.symbol} ${item.name}`);
    lines.push("");
    lines.push(`- 狀態：${STATUS_LABELS[item.status]}`);
    lines.push(`- 綜合分數：${calcResearchScore(item)}`);
    lines.push(`- 法人分數：${item.flowScore ?? "-"}`);
    lines.push(`- 法人訊號：${item.flowSignal ?? "-"}`);
    lines.push(`- 進場：${formatResearchNumber(item.entry, 2)}`);
    lines.push(`- 停損：${formatResearchNumber(item.stop, 2)}`);
    lines.push(`- 停利：${formatResearchNumber(item.target, 2)}`);
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