export type BacktestResult = {
  symbol: string;
  stockName?: string;
  market?: string;
  securityType?: string;
  strategy: string;

  annualReturn: number;
  maxDrawdown: number;
  winRate: number;
  trades: number;

  tickerUsed?: string;
  dataSource?: string;
  dataStartDate?: string;
  dataEndDate?: string;

  lastClose?: number;
  ma20?: number | null;
  ma60?: number | null;
  high60?: number | null;

  distanceToMa20Pct?: number | null;
  distanceToMa60Pct?: number | null;
  distanceToHigh60Pct?: number | null;

  currentSignal?: string;

  finalEquity?: number;
  totalReturn?: number;
  benchmarkReturn?: number;
  alphaReturn?: number;

  profitFactor?: number;
  avgTradeReturn?: number;
  bestTradeReturn?: number;
  worstTradeReturn?: number;
  payoffRatio?: number;
  maxConsecutiveLosses?: number;
  riskLevel?: string;
  opportunityScore?: number;

  optimizeScore?: number;
  fastMaWindow?: number;
  slowMaWindow?: number;
  breakoutWindow?: number;
  stopLossPct?: number;
  takeProfitPct?: number;
  positionSizePct?: number;
};

export type EquityPoint = {
  period: string;
  strategy: number;
  benchmark: number;
};

export type TradeRecord = {
  id: number;
  symbol: string;
  stockName?: string;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  shares: number;
  pnl: number;
  pnlPct: number;
  result: "獲利" | "虧損";
};

export type ScanError = {
  symbol: string;
  stockName?: string;
  market?: string;
  securityType?: string;
  message: string;
};

export type SecurityOption = {
  symbol: string;
  name: string;
  market?: string;
  marketText?: string;
  type?: string;
  industry?: string;
  isin?: string;
  listedDate?: string;
  source?: string;
  yfinanceCandidates?: string[];
};