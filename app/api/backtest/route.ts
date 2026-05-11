import type { BacktestResult } from "../../types";
import {
  generateEquityCurve,
  generateTradeRecords,
} from "../../lib/fakeBacktest";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const symbol = String(body.symbol || "").trim();
    const strategy = String(body.strategy || "MA20 / MA60 黃金交叉");
    const capital = Number(String(body.capital || "1000000").replaceAll(",", ""));

    if (!symbol) {
      return Response.json(
        { error: "請輸入股票代號，例如 2330" },
        { status: 400 }
      );
    }

    if (!capital || capital <= 0) {
      return Response.json(
        { error: "請輸入正確的初始資金，例如 1000000" },
        { status: 400 }
      );
    }

    const fakeAnnualReturn = Number((Math.random() * 25 + 5).toFixed(1));
    const fakeMaxDrawdown = Number(-(Math.random() * 20 + 5).toFixed(1));
    const fakeWinRate = Number((Math.random() * 25 + 45).toFixed(1));
    const fakeTrades = Math.floor(Math.random() * 60 + 10);

    const result: BacktestResult = {
      symbol,
      strategy,
      annualReturn: fakeAnnualReturn,
      maxDrawdown: fakeMaxDrawdown,
      winRate: fakeWinRate,
      trades: fakeTrades,
    };

    const equityCurve = generateEquityCurve(capital, fakeAnnualReturn);
    const tradeRecords = generateTradeRecords(symbol, capital);

    return Response.json({
      result,
      equityCurve,
      tradeRecords,
    });
  } catch {
    return Response.json(
      { error: "回測 API 發生錯誤" },
      { status: 500 }
    );
  }
}