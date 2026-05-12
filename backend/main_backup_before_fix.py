from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import date, datetime, timedelta

import pandas as pd
import yfinance as yf

app = FastAPI()

FEE_RATE = 0.001425
TAX_RATE = 0.003

STRATEGIES = [
    "MA20 / MA60 黃金交叉",
    "回測月線反彈",
    "突破 60 日新高",
    "投信連買 + 站上月線",
]

SECURITY_MASTER_URLS = [
    ("listed", "https://isin.twse.com.tw/isin/C_public.jsp?strMode=2"),
    ("otc", "https://isin.twse.com.tw/isin/C_public.jsp?strMode=4"),
    ("emerging", "https://isin.twse.com.tw/isin/C_public.jsp?strMode=5"),
]

FALLBACK_STOCK_NAME_MAP = {
    "2330": "台積電",
    "2454": "聯發科",
    "2317": "鴻海",
    "2382": "廣達",
    "2308": "台達電",
    "2412": "中華電",
    "0050": "元大台灣50",
    "006208": "富邦台50",
    "00878": "國泰永續高股息",
    "00919": "群益台灣精選高息",
    "6488": "環球晶",
}

SECURITY_MASTER_CACHE = {
    "loaded_at": None,
    "data": {},
}


class BacktestRequest(BaseModel):
    symbol: str = ""
    symbols: str = ""
    strategy: str = "MA20 / MA60 黃金交叉"
    capital: str = "1000000"
    positionSize: str = "20%"
    stopLoss: str = "8%"
    takeProfit: str = "15%"
    startDate: str = "2023-01-01"
    endDate: str = ""


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


def parse_percent(value: str, default_value: float) -> float:
    clean_value = str(value).replace("%", "").strip()

    try:
        number = float(clean_value)
    except ValueError:
        return default_value

    if number > 1:
        number = number / 100

    return min(max(number, 0), 1)


def normalize_date_range(start_date: str, end_date: str):
    today = date.today()

    clean_start = str(start_date).strip()
    clean_end = str(end_date).strip()

    if not clean_start:
        clean_start = (today - timedelta(days=365 * 3)).isoformat()

    if not clean_end:
        clean_end = today.isoformat()

    if clean_start >= clean_end:
        raise HTTPException(status_code=400, detail="開始日期必須早於結束日期")

    return clean_start, clean_end


def normalize_symbol_code(symbol: str) -> str:
    return symbol.strip().upper().split(".")[0]


def normalize_ticker_candidates(symbol: str):
    clean_symbol = symbol.strip().upper()

    if "." in clean_symbol:
        return [clean_symbol]

    return [f"{clean_symbol}.TW", f"{clean_symbol}.TWO"]


def parse_symbol_list(symbols_text: str, fallback_symbol: str):
    source = symbols_text.strip() or fallback_symbol.strip()

    symbols = (
        source.replace("，", ",")
        .replace("\n", ",")
        .replace(" ", ",")
        .split(",")
    )

    cleaned = []

    for item in symbols:
        symbol = item.strip()
        if symbol and symbol not in cleaned:
            cleaned.append(symbol)

    return cleaned[:20]


def parse_security_code_and_name(raw_text: str):
    text = str(raw_text).replace("\u3000", " ").strip()

    if not text:
        return None, None

    parts = text.split(maxsplit=1)

    if len(parts) < 2:
        return None, None

    code = parts[0].strip().upper()
    name = parts[1].strip()

    if not code or not name:
        return None, None

    if not any(char.isdigit() for char in code):
        return None, None

    return code, name


def load_security_master_from_web():
    data = {}

    for market, url in SECURITY_MASTER_URLS:
        try:
            tables = pd.read_html(url)

            if len(tables) == 0:
                continue

            table = tables[0]

            for _, row in table.iterrows():
                first_cell = row.iloc[0]
                code, name = parse_security_code_and_name(first_cell)

                if code is None or name is None:
                    continue

                data[code] = {
                    "name": name,
                    "market": market,
                    "source": "TWSE ISIN",
                }

        except Exception:
            continue

    return data


def get_security_master_map():
    loaded_at = SECURITY_MASTER_CACHE["loaded_at"]
    cached_data = SECURITY_MASTER_CACHE["data"]

    if loaded_at is not None and cached_data:
        age = datetime.now() - loaded_at
        if age < timedelta(hours=12):
            return cached_data

    web_data = load_security_master_from_web()

    if web_data:
        SECURITY_MASTER_CACHE["loaded_at"] = datetime.now()
        SECURITY_MASTER_CACHE["data"] = web_data
        return web_data

    fallback_data = {
        code: {
            "name": name,
            "market": "fallback",
            "source": "fallback",
        }
        for code, name in FALLBACK_STOCK_NAME_MAP.items()
    }

    SECURITY_MASTER_CACHE["loaded_at"] = datetime.now()
    SECURITY_MASTER_CACHE["data"] = fallback_data

    return fallback_data


def get_stock_name(symbol: str) -> str:
    code = normalize_symbol_code(symbol)
    security_master = get_security_master_map()

    if code in security_master:
        return security_master[code]["name"]

    return "未找到名稱"


def get_security_market(symbol: str) -> str:
    code = normalize_symbol_code(symbol)
    security_master = get_security_master_map()

    if code in security_master:
        return security_master[code].get("market", "")

    return ""


def fetch_real_price_series(symbol: str, start_date: str, end_date: str):
    ticker_candidates = normalize_ticker_candidates(symbol)

    for ticker in ticker_candidates:
        try:
            df = yf.download(
                ticker,
                start=start_date,
                end=end_date,
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
                return price_data, ticker

        except Exception:
            continue

    raise HTTPException(
        status_code=404,
        detail=f"找不到 {symbol} 在 {start_date} 到 {end_date} 之間的足夠歷史股價資料。可試試 2330、0050、006208、00878、2454，或直接輸入 2330.TW。",
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


def get_current_signal(strategy_name: str, closes, ma20, ma60, high60):
    close = closes[-1]
    latest_ma20 = ma20[-1]
    latest_ma60 = ma60[-1]
    latest_high60 = high60[-1]

    if latest_ma20 is None or latest_ma60 is None:
        return "資料不足"

    if strategy_name == "MA20 / MA60 黃金交叉":
        if latest_ma20 > latest_ma60 and close > latest_ma20:
            return "均線偏多"
        if latest_ma20 < latest_ma60:
            return "均線偏空"
        return "觀望"

    if strategy_name == "回測月線反彈":
        if close > latest_ma20 and close <= latest_ma20 * 1.03:
            return "接近月線反彈區"
        if close < latest_ma20:
            return "跌破月線"
        return "偏離月線"

    if strategy_name == "突破 60 日新高":
        if latest_high60 is not None and close > latest_high60:
            return "已突破 60 日新高"
        if latest_high60 is not None and close >= latest_high60 * 0.97:
            return "接近突破"
        return "尚未突破"

    if strategy_name == "投信連買 + 站上月線":
        if close > latest_ma20:
            return "站上月線"
        return "尚未站上月線"

    return "觀望"


def get_signals(
    strategy_name: str,
    i: int,
    closes,
    ma20,
    ma60,
    high60,
    shares: int,
    entry_price,
    stop_loss_rate: float,
    take_profit_rate: float,
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
        and stop_loss_rate > 0
        and close <= entry_price * (1 - stop_loss_rate)
    )

    take_profit_signal = (
        shares > 0
        and entry_price is not None
        and take_profit_rate > 0
        and close >= entry_price * (1 + take_profit_rate)
    )

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

    if stop_loss_signal or take_profit_signal:
        sell_signal = True

    return buy_signal, sell_signal


def run_strategy_backtest(
    symbol: str,
    strategy_name: str,
    initial_capital: float,
    position_fraction: float,
    stop_loss_rate: float,
    take_profit_rate: float,
    start_date: str,
    end_date: str,
    price_data=None,
    ticker_used=None,
):
    if price_data is None:
        price_data, ticker_used = fetch_real_price_series(
            symbol, start_date, end_date
        )

    if ticker_used is None:
        ticker_used = symbol

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
            stop_loss_rate=stop_loss_rate,
            take_profit_rate=take_profit_rate,
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
                    "stockName": get_stock_name(symbol),
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
                "stockName": get_stock_name(symbol),
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

    current_signal = get_current_signal(strategy_name, closes, ma20, ma60, high60)

    result = {
        "symbol": symbol,
        "stockName": get_stock_name(symbol),
        "market": get_security_market(symbol),
        "strategy": strategy_name,
        "annualReturn": round(annual_return, 1),
        "maxDrawdown": max_drawdown,
        "winRate": round(win_rate, 1),
        "trades": trade_count,
        "tickerUsed": ticker_used,
        "dataSource": "Yahoo Finance via yfinance + TWSE ISIN security master",
        "dataStartDate": price_data[0]["date"],
        "dataEndDate": price_data[-1]["date"],
        "lastClose": closes[-1],
        "ma20": round(ma20[-1], 2) if ma20[-1] is not None else None,
        "ma60": round(ma60[-1], 2) if ma60[-1] is not None else None,
        "currentSignal": current_signal,
    }

    equity_curve = compress_equity_curve(daily_curve)

    return {
        "result": result,
        "equityCurve": equity_curve,
        "tradeRecords": trade_records,
    }


def build_common_params(request: BacktestRequest):
    capital = clean_capital(request.capital)
    position_fraction = parse_position_size(request.positionSize)
    stop_loss_rate = parse_percent(request.stopLoss, 0.08)
    take_profit_rate = parse_percent(request.takeProfit, 0.15)
    start_date, end_date = normalize_date_range(request.startDate, request.endDate)

    if capital <= 0:
        raise HTTPException(
            status_code=400,
            detail="請輸入正確的初始資金，例如 1000000",
        )

    return {
        "capital": capital,
        "position_fraction": position_fraction,
        "stop_loss_rate": stop_loss_rate,
        "take_profit_rate": take_profit_rate,
        "start_date": start_date,
        "end_date": end_date,
    }


@app.get("/")
def read_root():
    return {
        "message": "Taiwan stock backtest API is running",
        "securityMasterCount": len(get_security_master_map()),
    }


@app.get("/security-name/{symbol}")
def read_security_name(symbol: str):
    return {
        "symbol": symbol,
        "stockName": get_stock_name(symbol),
        "market": get_security_market(symbol),
    }


@app.post("/backtest")
def run_backtest(request: BacktestRequest):
    symbol = request.symbol.strip()

    if not symbol:
        raise HTTPException(status_code=400, detail="請輸入股票代號，例如 2330")

    params = build_common_params(request)

    return run_strategy_backtest(
        symbol=symbol,
        strategy_name=request.strategy.strip(),
        initial_capital=params["capital"],
        position_fraction=params["position_fraction"],
        stop_loss_rate=params["stop_loss_rate"],
        take_profit_rate=params["take_profit_rate"],
        start_date=params["start_date"],
        end_date=params["end_date"],
    )


@app.post("/compare")
def compare_strategies(request: BacktestRequest):
    symbol = request.symbol.strip()

    if not symbol:
        raise HTTPException(status_code=400, detail="請輸入股票代號，例如 2330")

    params = build_common_params(request)

    price_data, ticker_used = fetch_real_price_series(
        symbol, params["start_date"], params["end_date"]
    )

    comparison_results = []

    for strategy_name in STRATEGIES:
        backtest = run_strategy_backtest(
            symbol=symbol,
            strategy_name=strategy_name,
            initial_capital=params["capital"],
            position_fraction=params["position_fraction"],
            stop_loss_rate=params["stop_loss_rate"],
            take_profit_rate=params["take_profit_rate"],
            start_date=params["start_date"],
            end_date=params["end_date"],
            price_data=price_data,
            ticker_used=ticker_used,
        )

        comparison_results.append(backtest["result"])

    comparison_results = sorted(
        comparison_results,
        key=lambda item: item["annualReturn"],
        reverse=True,
    )

    return {
        "symbol": symbol,
        "stockName": get_stock_name(symbol),
        "market": get_security_market(symbol),
        "tickerUsed": ticker_used,
        "dataSource": "Yahoo Finance via yfinance + TWSE ISIN security master",
        "dataStartDate": price_data[0]["date"],
        "dataEndDate": price_data[-1]["date"],
        "results": comparison_results,
    }


@app.post("/scan")
def scan_watchlist(request: BacktestRequest):
    symbols = parse_symbol_list(request.symbols, request.symbol)

    if len(symbols) == 0:
        raise HTTPException(status_code=400, detail="請輸入至少一檔股票代號")

    params = build_common_params(request)

    results = []
    errors = []

    for symbol in symbols:
        try:
            backtest = run_strategy_backtest(
                symbol=symbol,
                strategy_name=request.strategy.strip(),
                initial_capital=params["capital"],
                position_fraction=params["position_fraction"],
                stop_loss_rate=params["stop_loss_rate"],
                take_profit_rate=params["take_profit_rate"],
                start_date=params["start_date"],
                end_date=params["end_date"],
            )

            results.append(backtest["result"])

        except Exception as error:
            errors.append(
                {
                    "symbol": symbol,
                    "stockName": get_stock_name(symbol),
                    "market": get_security_market(symbol),
                    "message": str(error),
                }
            )

    results = sorted(
        results,
        key=lambda item: (
            item["currentSignal"]
            in ["接近突破", "接近月線反彈區", "均線偏多", "站上月線"],
            item["annualReturn"],
        ),
        reverse=True,
    )

    return {
        "results": results,
        "errors": errors,
    }