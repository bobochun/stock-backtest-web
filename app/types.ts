export type BacktestResult = {
  symbol: string;
  strategy: string;
  annualReturn: number;
  maxDrawdown: number;
  winRate: number;
  trades: number;
};

export type EquityPoint = {
  period: string;
  strategy: number;
  benchmark: number;
};

export type TradeRecord = {
  id: number;
  symbol: string;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  shares: number;
  pnl: number;
  pnlPct: number;
  result: "獲利" | "虧損";
};