import type { EquityPoint, TradeRecord } from "../types";

export function formatMoney(value: number) {
  return `NT$ ${Math.round(value).toLocaleString("zh-TW")}`;
}

export function formatNumber(value: number) {
  return Math.round(value).toLocaleString("zh-TW");
}

export function generateEquityCurve(
  initialCapital: number,
  annualReturn: number
) {
  const curve: EquityPoint[] = [];

  let strategyEquity = initialCapital;
  let benchmarkEquity = initialCapital;

  const monthlyStrategyReturn = annualReturn / 100 / 12;
  const monthlyBenchmarkReturn = 0.08 / 12;

  for (let month = 1; month <= 12; month++) {
    const strategyNoise = Math.random() * 0.08 - 0.03;
    const benchmarkNoise = Math.random() * 0.04 - 0.015;

    strategyEquity =
      strategyEquity * (1 + monthlyStrategyReturn + strategyNoise);

    benchmarkEquity =
      benchmarkEquity * (1 + monthlyBenchmarkReturn + benchmarkNoise);

    curve.push({
      period: `第 ${month} 月`,
      strategy: Math.round(strategyEquity),
      benchmark: Math.round(benchmarkEquity),
    });
  }

  return curve;
}

export function generateTradeRecords(symbol: string, initialCapital: number) {
  const records: TradeRecord[] = [];
  const tradeCount = Math.floor(Math.random() * 5 + 4);

  for (let i = 1; i <= tradeCount; i++) {
    const entryPrice = Number((Math.random() * 500 + 50).toFixed(1));
    const returnPct = Number((Math.random() * 24 - 10).toFixed(1));
    const exitPrice = Number((entryPrice * (1 + returnPct / 100)).toFixed(1));

    const positionValue = initialCapital * 0.2;
    const shares = Math.max(100, Math.floor(positionValue / entryPrice));
    const pnl = Math.round((exitPrice - entryPrice) * shares);

    const entryMonth = String(i).padStart(2, "0");
    const exitMonth = String(i + 1).padStart(2, "0");

    records.push({
      id: i,
      symbol,
      entryDate: `2025-${entryMonth}-10`,
      exitDate: `2025-${exitMonth}-15`,
      entryPrice,
      exitPrice,
      shares,
      pnl,
      pnlPct: returnPct,
      result: pnl >= 0 ? "獲利" : "虧損",
    });
  }

  return records;
}