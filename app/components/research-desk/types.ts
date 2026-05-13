export type ResearchStatus = "watching" | "ready" | "entered" | "avoid";

export type ChecklistKey =
  | "trend"
  | "flow"
  | "base"
  | "risk"
  | "catalyst"
  | "valuation";

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

  checklist: Record<ChecklistKey, boolean>;
};

export type FlowRecord = {
  symbol?: string;
  name?: string;
  score?: number;
  signal?: string;
  reason?: string;
  foreignNetLots?: number;
  trustNetLots?: number;
  dealerNetLots?: number;
  totalNetLots?: number;
};

export type PositionResult = {
  riskPerShare: number;
  maxRisk: number;
  shares: number;
  lots: number;
  capital: number;
  rewardRisk: number;
};

export type ResearchDeskStorage = {
  version: number;
  exportedAt?: string;
  accountSize: number;
  riskPct: number;
  items: ResearchItem[];
};

export const STORAGE_KEY = "stock-research-desk-pro-v1";

export const CHECKLIST_LABELS: Record<ChecklistKey, string> = {
  trend: "技術趨勢轉強",
  flow: "法人籌碼支持",
  base: "基期不過高",
  risk: "停損明確",
  catalyst: "題材 / 財報 / 產業催化",
  valuation: "估值合理",
};

export const STATUS_LABELS: Record<ResearchStatus, string> = {
  watching: "觀察中",
  ready: "接近進場",
  entered: "已進場",
  avoid: "暫避",
};

export const STATUS_STYLES: Record<ResearchStatus, string> = {
  watching: "bg-slate-100 text-slate-700 border-slate-200",
  ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  entered: "bg-blue-50 text-blue-700 border-blue-200",
  avoid: "bg-rose-50 text-rose-700 border-rose-200",
};