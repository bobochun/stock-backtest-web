from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import random

app = FastAPI()


class BacktestRequest(BaseModel):
    symbol: str
    strategy: str
    capital: str
    positionSize: str


def clean_capital(capital: str) -> float:
    try:
        return float(str(capital).replace(",", ""))
    except ValueError:
        return 0


def generate_equity_curve(initial_capital: float, annual_return: float):
    curve = []

    strategy_equity = initial_capital
    benchmark_equity = initial_capital

    monthly_strategy_return = annual_return / 100 / 12
    monthly_benchmark_return = 0.08 / 12

    for month in range(1, 13):
        strategy_noise = random.uniform(-0.03, 0.05)
        benchmark_noise = random.uniform(-0.015, 0.025)

        strategy_equity = strategy_equity * (
            1 + monthly_strategy_return + strategy_noise
        )

        benchmark_equity = benchmark_equity * (
            1 + monthly_benchmark_return + benchmark_noise
        )

        curve.append(
            {
                "period": f"第 {month} 月",
                "strategy": round(strategy_equity),
                "benchmark": round(benchmark_equity),
            }
        )

    return curve


def generate_trade_records(symbol: str, initial_capital: float):
    records = []
    trade_count = random.randint(4, 8)

    for i in range(1, trade_count + 1):
        entry_price = round(random.uniform(50, 550), 1)
        return_pct = round(random.uniform(-10, 14), 1)
        exit_price = round(entry_price * (1 + return_pct / 100), 1)

        position_value = initial_capital * 0.2
        shares = max(100, int(position_value / entry_price))

        pnl = round((exit_price - entry_price) * shares)

        entry_month = str(i).zfill(2)
        exit_month = str(i + 1).zfill(2)

        records.append(
            {
                "id": i,
                "symbol": symbol,
                "entryDate": f"2025-{entry_month}-10",
                "exitDate": f"2025-{exit_month}-15",
                "entryPrice": entry_price,
                "exitPrice": exit_price,
                "shares": shares,
                "pnl": pnl,
                "pnlPct": return_pct,
                "result": "獲利" if pnl >= 0 else "虧損",
            }
        )

    return records


@app.get("/")
def read_root():
    return {"message": "Taiwan stock backtest API is running"}


@app.post("/backtest")
def run_backtest(request: BacktestRequest):
    symbol = request.symbol.strip()
    strategy = request.strategy.strip()
    capital = clean_capital(request.capital)

    if not symbol:
        raise HTTPException(status_code=400, detail="請輸入股票代號，例如 2330")

    if capital <= 0:
        raise HTTPException(status_code=400, detail="請輸入正確的初始資金，例如 1000000")

    annual_return = round(random.uniform(5, 30), 1)
    max_drawdown = round(-random.uniform(5, 25), 1)
    win_rate = round(random.uniform(45, 70), 1)
    trades = random.randint(10, 70)

    result = {
        "symbol": symbol,
        "strategy": strategy,
        "annualReturn": annual_return,
        "maxDrawdown": max_drawdown,
        "winRate": win_rate,
        "trades": trades,
    }

    equity_curve = generate_equity_curve(capital, annual_return)
    trade_records = generate_trade_records(symbol, capital)

    return {
        "result": result,
        "equityCurve": equity_curve,
        "tradeRecords": trade_records,
    }