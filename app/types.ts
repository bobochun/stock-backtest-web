export type EquityPoint = {
  date?: string;
  value?: number;
  equity?: number;
  close?: number;
  price?: number;
  cash?: number;
  shares?: number;
  position?: number;
  drawdown?: number;
  drawdown_pct?: number;
  drawdownPct?: number;

  [key: string]: any;
};

export type TradeRecord = {
  date?: string;
  action?: "BUY" | "SELL" | "buy" | "sell" | string;
  price?: number;
  shares?: number;
  quantity?: number;
  amount?: number;
  reason?: string;

  [key: string]: any;
};

export type BacktestResult = {
  symbol?: string;
  name?: string;
  stockName?: string;
  stock_name?: string;
  strategy?: string;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;

  initialCash?: number;
  initial_cash?: number;
  finalEquity?: number;
  final_equity?: number;
  finalValue?: number;
  final_value?: number;
  totalInvested?: number;
  total_invested?: number;

  totalReturn?: number;
  total_return?: number;
  totalReturnPct?: number;
  total_return_pct?: number;
  annualizedReturn?: number;
  annualized_return?: number;
  annualizedReturnPct?: number;
  annualized_return_pct?: number;

  maxDrawdown?: number;
  max_drawdown?: number;
  maxDrawdownPct?: number;
  max_drawdown_pct?: number;
  volatility?: number;
  volatility_pct?: number;
  sharpeRatio?: number;
  sharpe_ratio?: number;

  winRate?: number;
  win_rate?: number;
  tradeCount?: number;
  trade_count?: number;
  buyCount?: number;
  buy_count?: number;
  sellCount?: number;
  sell_count?: number;

  buyAndHoldReturn?: number;
  buy_and_hold_return?: number;
  buyAndHoldReturnPct?: number;
  buy_and_hold_return_pct?: number;

  lastPrice?: number;
  last_price?: number;
  currentPrice?: number;
  current_price?: number;
  avgCost?: number;
  avg_cost?: number;
  shares?: number;
  cash?: number;

  equityCurve?: EquityPoint[];
  equity_curve?: EquityPoint[];
  trades?: TradeRecord[];

  opportunityScore?: number;
  opportunity_score?: number;
  signal?: string;
  suggestion?: string;
  actionSuggestion?: string;
  action_suggestion?: string;
  riskLevel?: string;
  risk_level?: string;

  supportPrice?: number;
  support_price?: number;
  resistancePrice?: number;
  resistance_price?: number;
  entryPrice?: number;
  entry_price?: number;
  stopLossPrice?: number;
  stop_loss_price?: number;
  takeProfitPrice?: number;
  take_profit_price?: number;

  message?: string;
  error?: string;

  [key: string]: any;
};

export type ScanError = {
  symbol?: string;
  name?: string;
  message?: string;
  error?: string;

  [key: string]: any;
};

export type ScanResult = {
  symbol: string;
  name?: string;
  stockName?: string;
  stock_name?: string;
  price?: number;
  currentPrice?: number;
  current_price?: number;

  score?: number;
  opportunityScore?: number;
  opportunity_score?: number;

  signal?: string;
  suggestion?: string;
  actionSuggestion?: string;
  action_suggestion?: string;

  reason?: string;
  thesis?: string;
  riskNote?: string;
  risk_note?: string;

  tags?: string[];
  tagText?: string;
  tag_text?: string;

  supportPrice?: number;
  support_price?: number;
  resistancePrice?: number;
  resistance_price?: number;
  entryPrice?: number;
  entry_price?: number;
  stopLossPrice?: number;
  stop_loss_price?: number;
  takeProfitPrice?: number;
  take_profit_price?: number;

  error?: string;

  [key: string]: any;
};

export type EtfQuickItem = {
  symbol: string;
  name: string;
  description?: string;
  category?: string;

  [key: string]: any;
};

export type OptimizationResult = {
  params?: Record<string, number | string | boolean>;
  totalReturnPct?: number;
  total_return_pct?: number;
  maxDrawdownPct?: number;
  max_drawdown_pct?: number;
  sharpeRatio?: number;
  sharpe_ratio?: number;
  winRate?: number;
  win_rate?: number;
  tradeCount?: number;
  trade_count?: number;

  [key: string]: any;
};
export type SecurityOption = {
  symbol: string;
  name: string;
  market?: string;
  exchange?: string;
  type?: string;
  label?: string;
  value?: string;
  industry?: string;
};
