from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import date, timedelta
import math
import random

import pandas as pd
import yfinance as yf

app = FastAPI()

FEE_RATE = 0.001425
TAX_RATE = 0.003


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


def parse_position_size(position_size: str) -> float:
    value = str(position_size).replace("%", "").strip()

    try:
        number = float(value)
    except ValueError:
        return 0.2

    if number > 1:
        number = number / 100

    return min(max(number, 0.01), 1)


def normalize_ticker_candidates(symbol: str):
    """
    使用者輸入 2330，就先試 2330.TW，再試 2330.TWO。
    使用者如果直接輸入 2330.TW，就直接使用。
    """
    clean_symbol = symbol.strip().upper()

    if "." in clean_symbol:
        return [clean_symbol]

    return [f"{clean_symbol}.TW", f"{clean_symbol}.TWO"]


def fetch_real_price_series(symbol: str):
    """
    從 yfinance 抓最近 3 年日線資料。
    回傳格式：
    [
      {"date": "2024-01-02", "close": 590.0},
      ...
    ]
    """
    ticker_candidates = normalize_ticker_candidates(symbol)

    for ticker in ticker_candidates:
        try:
            df = yf.download(
                ticker,
                period="3y",
                interval="1d",
                auto_adjust=True,
                progress=False,
            )

            if df is None or df.empty:
                continue

            if isinstance(df.columns, pd.MultiIndex):
                df.columns = [col[0] for col in df.columns]

            if "Close" not in df.columns:
                continue

            df = df.dropna(subset=["Close"])

            if len(df) < 120:
                continue

            price_data = []

            for index, row in df.iterrows():
                close_value = float(row["Close"])

                if close_value <= 0:
                    continue

                price_data.append(
                    {
                        "date": index.strftime("%Y-%m-%d"),
                        "close": round(close_value, 2),
                    }
                )

            if len(price_data) >= 120:
                return price_data

        except Exception:
            continue

    raise HTTPException(
        status_code=404,
        detail=f"找不到 {symbol} 的足夠歷史股價資料。可試試 2330、2454、2317，或直接輸入 2330.TW。",
    )


def generate_price_series(symbol: str, trading_days: int = 420):
    """
    備用模擬資料。
    如果之後想離線測試，可以改回使用這個。
    """
    seed = sum(ord(char) for char in symbol)
    rng = random.Random(seed)

    start_price = 80 + seed % 500
    current_date = date(2024, 1, 2)

    data = []

    while len(data) < trading_days:
        if current_date.weekday() < 5:
            i = len(data)

            trend = 1 + i * 0.00025
            cycle = 1 + 0.12 * math.sin(i / 18) + 0.08 * math.sin(i / 45)
            noise = 1 + rng.uniform(-0.018, 0.018)

            close = max(10, start_price * trend * cycle * noise)

            data.append(
                {
                    "date": current_date.isoformat(),
                    "close": round(close, 2),
                }
            )

        current_date += timedelta(days=1)

    return data


def moving_average(values, window: int):
    result = []

    for i in range(len(values)):
        if i + 1 < window:
            result.append(None)
            continue

        window_values = values[i + 1 - window : i + 1]
        result.append(sum(window_values) / window)

    return result


def calculate_max_drawdown(equity_values):
    peak = equity_values[0]
    max_drawdown = 0

    for equity in equity_values:
        if equity > peak:
            peak = equity

        drawdown = (equity - peak) / peak

        if drawdown < max_drawdown:
            max_drawdown = drawdown

    return round(max_drawdown * 100, 1)


def compress_equity_curve(daily_curve):
    monthly = {}

    for item in daily_curve:
        month_key = item["date"][:7]
        monthly[month_key] = item

    latest_12 = list(monthly.values())[-12:]

    return [
        {
            "period": item["date"][:7],
            "strategy": round(item["strategy"]),
            "benchmark": round(item["benchmark"]),
        }
        for item in latest_12
    ]


def run_ma20_ma60_backtest(
    symbol: str,
    strategy_name: str,
    initial_capital: float,
    position_fraction: float,
):
    price_data = fetch_real_price_series(symbol)

    closes = [item["close"] for item in price_data]
    ma20 = moving_average(closes, 20)
    ma60 = moving_average(closes, 60)

    cash = initial_capital
    shares = 0

    entry_date = None
    entry_price = None
    entry_cost = 0

    trade_records = []
    daily_curve = []

    benchmark_start_price = closes[59]

    for i in range(60, len(price_data)):
        today = price_data[i]
        yesterday_index = i - 1

        close = today["close"]

        current_ma20 = ma20[i]
        current_ma60 = ma60[i]
        previous_ma20 = ma20[yesterday_index]
        previous_ma60 = ma60[yesterday_index]

        buy_signal = (
            shares == 0
            and previous_ma20 is not None
            and previous_ma60 is not None
            and previous_ma20 <= previous_ma60
            and current_ma20 > current_ma60
        )

        sell_signal = (
            shares > 0
            and previous_ma20 is not None
            and previous_ma60 is not None
            and previous_ma20 >= previous_ma60
            and current_ma20 < current_ma60
        )

        if buy_signal:
            position_budget = cash * position_fraction

            buy_shares = int(position_budget // (close * 100)) * 100
            total_cost = buy_shares * close * (1 + FEE_RATE)

            if buy_shares > 0 and total_cost <= cash:
                shares = buy_shares
                cash -= total_cost

                entry_date = today["date"]
                entry_price = close
                entry_cost = total_cost

        if sell_signal and shares > 0:
            sell_value = shares * close
            proceeds = sell_value * (1 - FEE_RATE - TAX_RATE)

            pnl = proceeds - entry_cost
            pnl_pct = (pnl / entry_cost) * 100

            trade_records.append(
                {
                    "id": len(trade_records) + 1,
                    "symbol": symbol,
                    "entryDate": entry_date,
                    "exitDate": today["date"],
                    "entryPrice": entry_price,
                    "exitPrice": close,
                    "shares": shares,
                    "pnl": round(pnl),
                    "pnlPct": round(pnl_pct, 1),
                    "result": "獲利" if pnl >= 0 else "虧損",
                }
            )

            cash += proceeds
            shares = 0
            entry_date = None
            entry_price = None
            entry_cost = 0

        current_equity = cash + shares * close
        benchmark_equity = initial_capital * close / benchmark_start_price

        daily_curve.append(
            {
                "date": today["date"],
                "strategy": current_equity,
                "benchmark": benchmark_equity,
            }
        )

    if shares > 0:
        final_day = price_data[-1]
        final_close = final_day["close"]

        sell_value = shares * final_close
        proceeds = sell_value * (1 - FEE_RATE - TAX_RATE)

        pnl = proceeds - entry_cost
        pnl_pct = (pnl / entry_cost) * 100

        trade_records.append(
            {
                "id": len(trade_records) + 1,
                "symbol": symbol,
                "entryDate": entry_date,
                "exitDate": final_day["date"],
                "entryPrice": entry_price,
                "exitPrice": final_close,
                "shares": shares,
                "pnl": round(pnl),
                "pnlPct": round(pnl_pct, 1),
                "result": "獲利" if pnl >= 0 else "虧損",
            }
        )

        cash += proceeds
        shares = 0
        daily_curve[-1]["strategy"] = cash

    final_equity = daily_curve[-1]["strategy"]
    years = len(daily_curve) / 252

    annual_return = ((final_equity / initial_capital) ** (1 / years) - 1) * 100

    equity_values = [item["strategy"] for item in daily_curve]
    max_drawdown = calculate_max_drawdown(equity_values)

    trade_count = len(trade_records)
    win_count = len([trade for trade in trade_records if trade["pnl"] > 0])
    win_rate = (win_count / trade_count * 100) if trade_count > 0 else 0

    result = {
        "symbol": symbol,
        "strategy": strategy_name,
        "annualReturn": round(annual_return, 1),
        "maxDrawdown": max_drawdown,
        "winRate": round(win_rate, 1),
        "trades": trade_count,
    }

    equity_curve = compress_equity_curve(daily_curve)

    return {
        "result": result,
        "equityCurve": equity_curve,
        "tradeRecords": trade_records,
    }


@app.get("/")
def read_root():
    return {"message": "Taiwan stock backtest API is running"}


@app.post("/backtest")
def run_backtest(request: BacktestRequest):
    symbol = request.symbol.strip()
    strategy = request.strategy.strip()
    capital = clean_capital(request.capital)
    position_fraction = parse_position_size(request.positionSize)

    if not symbol:
        raise HTTPException(status_code=400, detail="請輸入股票代號，例如 2330")

    if capital <= 0:
        raise HTTPException(
            status_code=400,
            detail="請輸入正確的初始資金，例如 1000000",
        )

    return run_ma20_ma60_backtest(
        symbol=symbol,
        strategy_name=strategy,
        initial_capital=capital,
        position_fraction=position_fraction,
    )