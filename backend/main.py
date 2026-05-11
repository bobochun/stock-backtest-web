from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import pandas as pd
import yfinance as yf

app = FastAPI()

FEE_RATE = 0.001425
TAX_RATE = 0.003
STOP_LOSS_RATE = 0.08


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
    clean_symbol = symbol.strip().upper()

    if "." in clean_symbol:
        return [clean_symbol]

    return [f"{clean_symbol}.TW", f"{clean_symbol}.TWO"]


def fetch_real_price_series(symbol: str):
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


def moving_average(values, window: int):
    result = []

    for i in range(len(values)):
        if i + 1 < window:
            result.append(None)
            continue

        window_values = values[i + 1 - window : i + 1]
        result.append(sum(window_values) / window)

    return result


def previous_high(values, window: int):
    """
    回傳「前 window 天最高收盤價」。
    注意：不包含今天，避免偷看未來。
    """
    result = []

    for i in range(len(values)):
        if i < window:
            result.append(None)
            continue

        window_values = values[i - window : i]
        result.append(max(window_values))

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


def get_signals(
    strategy_name: str,
    i: int,
    closes,
    ma20,
    ma60,
    high60,
    shares: int,
    entry_price,
):
    close = closes[i]
    previous_close = closes[i - 1]

    current_ma20 = ma20[i]
    previous_ma20 = ma20[i - 1]

    current_ma60 = ma60[i]
    previous_ma60 = ma60[i - 1]

    current_high60 = high60[i]

    buy_signal = False
    sell_signal = False

    stop_loss_signal = (
        shares > 0
        and entry_price is not None
        and close <= entry_price * (1 - STOP_LOSS_RATE)
    )

    # 策略 A：MA20 / MA60 黃金交叉
    if strategy_name == "MA20 / MA60 黃金交叉":
        buy_signal = (
            shares == 0
            and previous_ma20 is not None
            and previous_ma60 is not None
            and current_ma20 is not None
            and current_ma60 is not None
            and previous_ma20 <= previous_ma60
            and current_ma20 > current_ma60
        )

        sell_signal = (
            shares > 0
            and previous_ma20 is not None
            and previous_ma60 is not None
            and current_ma20 is not None
            and current_ma60 is not None
            and previous_ma20 >= previous_ma60
            and current_ma20 < current_ma60
        )

    # 策略 B：回測月線反彈
    elif strategy_name == "回測月線反彈":
        buy_signal = (
            shares == 0
            and previous_ma20 is not None
            and current_ma20 is not None
            and previous_close < previous_ma20
            and close > current_ma20
            and close > previous_close
        )

        sell_signal = (
            shares > 0
            and current_ma20 is not None
            and close < current_ma20
        )

    # 策略 C：突破 60 日新高
    elif strategy_name == "突破 60 日新高":
        buy_signal = (
            shares == 0
            and current_high60 is not None
            and close > current_high60
        )

        sell_signal = (
            shares > 0
            and current_ma20 is not None
            and close < current_ma20
        )

    # 策略 D：投信連買 + 站上月線
    # 目前還沒有法人資料，先用「重新站上 MA20」代替。
    elif strategy_name == "投信連買 + 站上月線":
        buy_signal = (
            shares == 0
            and previous_ma20 is not None
            and current_ma20 is not None
            and previous_close <= previous_ma20
            and close > current_ma20
        )

        sell_signal = (
            shares > 0
            and current_ma20 is not None
            and close < current_ma20
        )

    else:
        # 如果前端傳來未知策略，預設使用 MA20 / MA60。
        buy_signal = (
            shares == 0
            and previous_ma20 is not None
            and previous_ma60 is not None
            and current_ma20 is not None
            and current_ma60 is not None
            and previous_ma20 <= previous_ma60
            and current_ma20 > current_ma60
        )

        sell_signal = (
            shares > 0
            and previous_ma20 is not None
            and previous_ma60 is not None
            and current_ma20 is not None
            and current_ma60 is not None
            and previous_ma20 >= previous_ma60
            and current_ma20 < current_ma60
        )

    if stop_loss_signal:
        sell_signal = True

    return buy_signal, sell_signal


def run_strategy_backtest(
    symbol: str,
    strategy_name: str,
    initial_capital: float,
    position_fraction: float,
):
    price_data = fetch_real_price_series(symbol)

    closes = [item["close"] for item in price_data]

    ma20 = moving_average(closes, 20)
    ma60 = moving_average(closes, 60)
    high60 = previous_high(closes, 60)

    cash = initial_capital
    shares = 0

    entry_date = None
    entry_price = None
    entry_cost = 0

    trade_records = []
    daily_curve = []

    start_index = 60
    benchmark_start_price = closes[start_index]

    for i in range(start_index, len(price_data)):
        today = price_data[i]
        close = today["close"]

        buy_signal, sell_signal = get_signals(
            strategy_name=strategy_name,
            i=i,
            closes=closes,
            ma20=ma20,
            ma60=ma60,
            high60=high60,
            shares=shares,
            entry_price=entry_price,
        )

        if buy_signal:
            position_budget = cash * position_fraction

            # 台股一張是 1000 股，但為了小資金測試，這裡先用 100 股為最小單位。
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

    # 最後一天如果還有持股，強制用最後收盤價出場
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

    return run_strategy_backtest(
        symbol=symbol,
        strategy_name=strategy,
        initial_capital=capital,
        position_fraction=position_fraction,
    )