from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import date, datetime, timedelta
from io import StringIO
from pathlib import Path

import json
import pandas as pd
import requests
import yfinance as yf

app = FastAPI()

FEE_RATE = 0.001425
TAX_RATE = 0.003

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
SECURITY_MASTER_FILE = DATA_DIR / "security_master.json"

DATA_DIR.mkdir(exist_ok=True)

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
    fastMa: str = "20"
    slowMa: str = "60"
    breakoutWindow: str = "60"


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


def parse_int_param(value: str, default_value: int, min_value: int, max_value: int):
    try:
        number = int(str(value).strip())
    except ValueError:
        return default_value

    return min(max(number, min_value), max_value)


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

    return cleaned[:30]


def infer_security_type(code: str, cfi_code: str, remark: str, raw_name: str):
    text = f"{code} {cfi_code} {remark} {raw_name}".upper()

    if "ETF" in text or code.startswith("00"):
        return "etf"

    if "ETN" in text:
        return "etn"

    if "REIT" in text or "受益證券" in text:
        return "beneficiary"

    if "權證" in text or code.startswith("7"):
        return "warrant"

    if code.isdigit() and len(code) == 4:
        return "stock"

    return "other"


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


def load_security_master_from_disk():
    if not SECURITY_MASTER_FILE.exists():
        return {}

    try:
        with SECURITY_MASTER_FILE.open("r", encoding="utf-8") as file:
            payload = json.load(file)

        data = payload.get("data", {})

        if isinstance(data, dict):
            return data

        return {}

    except Exception:
        return {}


def save_security_master_to_disk(data: dict):
    payload = {
        "updatedAt": datetime.now().isoformat(timespec="seconds"),
        "count": len(data),
        "data": data,
    }

    with SECURITY_MASTER_FILE.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)


def build_fallback_security_master():
    return {
        code: {
            "symbol": code,
            "name": name,
            "market": "fallback",
            "type": "unknown",
            "source": "fallback",
            "yfinanceCandidates": [f"{code}.TW", f"{code}.TWO"],
        }
        for code, name in FALLBACK_STOCK_NAME_MAP.items()
    }


def load_security_master_from_web():
    data = {}

    for market, url in SECURITY_MASTER_URLS:
        try:
            response = requests.get(
                url,
                timeout=10,
                headers={"User-Agent": "Mozilla/5.0"},
            )
            response.raise_for_status()

            if not response.encoding or response.encoding.lower() == "iso-8859-1":
                response.encoding = response.apparent_encoding or "big5"

            tables = pd.read_html(StringIO(response.text))

            if len(tables) == 0:
                continue

            table = tables[0]

            for _, row in table.iterrows():
                first_cell = row.iloc[0]
                code, name = parse_security_code_and_name(first_cell)

                if code is None or name is None:
                    continue

                isin = str(row.iloc[1]) if len(row) > 1 else ""
                listed_date = str(row.iloc[2]) if len(row) > 2 else ""
                market_text = str(row.iloc[3]) if len(row) > 3 else market
                industry = str(row.iloc[4]) if len(row) > 4 else ""
                cfi_code = str(row.iloc[5]) if len(row) > 5 else ""
                remark = str(row.iloc[6]) if len(row) > 6 else ""

                security_type = infer_security_type(code, cfi_code, remark, name)

                # 排除大部分權證，避免搜尋結果太雜；保留股票 / ETF / ETN / 受益證券 / 其他普通商品
                if security_type == "warrant":
                    continue

                data[code] = {
                    "symbol": code,
                    "name": name,
                    "market": market,
                    "marketText": market_text,
                    "type": security_type,
                    "industry": industry,
                    "isin": isin,
                    "listedDate": listed_date,
                    "source": "TWSE ISIN",
                    "yfinanceCandidates": [f"{code}.TW", f"{code}.TWO"],
                }

        except Exception:
            continue

    return data


def get_security_master_map(force_refresh: bool = False):
    if not force_refresh:
        loaded_at = SECURITY_MASTER_CACHE["loaded_at"]
        cached_data = SECURITY_MASTER_CACHE["data"]

        if loaded_at is not None and cached_data:
            age = datetime.now() - loaded_at
            if age < timedelta(hours=12):
                return cached_data

        disk_data = load_security_master_from_disk()

        if disk_data:
            SECURITY_MASTER_CACHE["loaded_at"] = datetime.now()
            SECURITY_MASTER_CACHE["data"] = disk_data
            return disk_data

    web_data = load_security_master_from_web()

    if web_data:
        save_security_master_to_disk(web_data)
        SECURITY_MASTER_CACHE["loaded_at"] = datetime.now()
        SECURITY_MASTER_CACHE["data"] = web_data
        return web_data

    fallback_data = build_fallback_security_master()
    SECURITY_MASTER_CACHE["loaded_at"] = datetime.now()
    SECURITY_MASTER_CACHE["data"] = fallback_data
    return fallback_data


def get_security_info(symbol: str):
    code = normalize_symbol_code(symbol)
    security_master = get_security_master_map()

    if code in security_master:
        return security_master[code]

    fallback = build_fallback_security_master()
    return fallback.get(
        code,
        {
            "symbol": code,
            "name": "未找到名稱",
            "market": "",
            "type": "unknown",
            "source": "none",
            "yfinanceCandidates": [f"{code}.TW", f"{code}.TWO"],
        },
    )


def get_stock_name(symbol: str) -> str:
    return get_security_info(symbol).get("name", "未找到名稱")


def get_security_market(symbol: str) -> str:
    return get_security_info(symbol).get("market", "")


def get_security_type(symbol: str) -> str:
    return get_security_info(symbol).get("type", "")


def search_security_master(query: str, limit: int = 20):
    clean_query = str(query).strip().upper()
    security_master = get_security_master_map()

    if not clean_query:
        return list(security_master.values())[:limit]

    matches = []

    for item in security_master.values():
        symbol = str(item.get("symbol", "")).upper()
        name = str(item.get("name", "")).upper()
        security_type = str(item.get("type", "")).upper()
        market = str(item.get("market", "")).upper()

        if (
            clean_query in symbol
            or clean_query in name
            or clean_query in security_type
            or clean_query in market
        ):
            matches.append(item)

    def sort_key(item):
        symbol = str(item.get("symbol", "")).upper()
        name = str(item.get("name", "")).upper()

        if symbol == clean_query:
            return 0
        if symbol.startswith(clean_query):
            return 1
        if clean_query in name:
            return 2
        return 3

    matches = sorted(matches, key=sort_key)

    return matches[:limit]


def fetch_real_price_series(symbol: str, start_date: str, end_date: str):
    security_info = get_security_info(symbol)
    ticker_candidates = security_info.get("yfinanceCandidates") or normalize_ticker_candidates(symbol)

    for ticker in ticker_candidates:
        try:
            df = yf.download(
                ticker,
                start=start_date,
                end=end_date,
                interval="1d",
                auto_adjust=True,
                progress=False,
                threads=False,
                timeout=10,
            )

            if df is None or df.empty:
                continue

            if isinstance(df.columns, pd.MultiIndex):
                df.columns = [col[0] for col in df.columns]

            if "Close" not in df.columns:
                continue

            df = df.dropna(subset=["Close"])

            if len(df) < 80:
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

            if len(price_data) >= 80:
                return price_data, ticker

        except Exception:
            continue

    raise HTTPException(
        status_code=404,
        detail=f"有找到 {symbol} 的商品名稱：{security_info.get('name', '未知')}，但 Yahoo Finance 暫時沒有足夠歷史價格。可試試直接輸入 2330.TW、0050.TW、006208.TW。",
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


def calculate_max_consecutive_losses(trade_records):
    max_losses = 0
    current_losses = 0

    for trade in trade_records:
        if trade["pnl"] < 0:
            current_losses += 1
            max_losses = max(max_losses, current_losses)
        else:
            current_losses = 0

    return max_losses


def safe_round(value, digits=1):
    if value is None:
        return None

    try:
        return round(value, digits)
    except Exception:
        return None


def classify_risk_level(max_drawdown, max_consecutive_losses, profit_factor):
    if max_drawdown <= -30 or max_consecutive_losses >= 5:
        return "高風險"

    if max_drawdown <= -18 or max_consecutive_losses >= 3 or profit_factor < 1:
        return "中風險"

    return "低風險"


def calculate_distance_pct(current_price, reference_price):
    if reference_price is None or reference_price == 0:
        return None

    return ((current_price / reference_price) - 1) * 100


def calculate_advanced_metrics(
    initial_capital,
    final_equity,
    benchmark_start_price,
    benchmark_end_price,
    trade_records,
    max_drawdown,
):
    total_return = ((final_equity / initial_capital) - 1) * 100
    benchmark_return = ((benchmark_end_price / benchmark_start_price) - 1) * 100
    alpha_return = total_return - benchmark_return

    winning_trades = [trade for trade in trade_records if trade["pnl"] > 0]
    losing_trades = [trade for trade in trade_records if trade["pnl"] < 0]

    gross_profit = sum(trade["pnl"] for trade in winning_trades)
    gross_loss = abs(sum(trade["pnl"] for trade in losing_trades))

    if gross_loss > 0:
        profit_factor = gross_profit / gross_loss
    elif gross_profit > 0:
        profit_factor = 999
    else:
        profit_factor = 0

    trade_count = len(trade_records)

    if trade_count > 0:
        avg_trade_return = sum(trade["pnlPct"] for trade in trade_records) / trade_count
        best_trade_return = max(trade["pnlPct"] for trade in trade_records)
        worst_trade_return = min(trade["pnlPct"] for trade in trade_records)
    else:
        avg_trade_return = 0
        best_trade_return = 0
        worst_trade_return = 0

    avg_win = (
        sum(trade["pnlPct"] for trade in winning_trades) / len(winning_trades)
        if winning_trades
        else 0
    )

    avg_loss = (
        abs(sum(trade["pnlPct"] for trade in losing_trades) / len(losing_trades))
        if losing_trades
        else 0
    )

    payoff_ratio = avg_win / avg_loss if avg_loss > 0 else 0
    max_consecutive_losses = calculate_max_consecutive_losses(trade_records)
    risk_level = classify_risk_level(max_drawdown, max_consecutive_losses, profit_factor)

    return {
        "finalEquity": round(final_equity),
        "totalReturn": round(total_return, 1),
        "benchmarkReturn": round(benchmark_return, 1),
        "alphaReturn": round(alpha_return, 1),
        "profitFactor": round(profit_factor, 2),
        "avgTradeReturn": round(avg_trade_return, 1),
        "bestTradeReturn": round(best_trade_return, 1),
        "worstTradeReturn": round(worst_trade_return, 1),
        "payoffRatio": round(payoff_ratio, 2),
        "maxConsecutiveLosses": max_consecutive_losses,
        "riskLevel": risk_level,
    }


def calculate_opportunity_score(
    annual_return,
    max_drawdown,
    win_rate,
    profit_factor,
    current_signal,
):
    score = 50

    score += max(min(annual_return, 40), -40) * 0.5
    score += max_drawdown * 0.6
    score += (win_rate - 50) * 0.4

    if profit_factor >= 2:
        score += 12
    elif profit_factor >= 1.5:
        score += 8
    elif profit_factor >= 1:
        score += 3
    else:
        score -= 8

    if current_signal in ["接近突破", "接近月線反彈區", "均線偏多", "站上月線", "已突破區間新高"]:
        score += 10
    elif current_signal in ["跌破月線", "均線偏空"]:
        score -= 10

    return round(min(max(score, 0), 100))


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


def get_current_signal(strategy_name: str, closes, fast_ma, slow_ma, high_window):
    close = closes[-1]
    latest_fast_ma = fast_ma[-1]
    latest_slow_ma = slow_ma[-1]
    latest_high = high_window[-1]

    if latest_fast_ma is None or latest_slow_ma is None:
        return "資料不足"

    if strategy_name == "MA20 / MA60 黃金交叉":
        if latest_fast_ma > latest_slow_ma and close > latest_fast_ma:
            return "均線偏多"
        if latest_fast_ma < latest_slow_ma:
            return "均線偏空"
        return "觀望"

    if strategy_name == "回測月線反彈":
        if close > latest_fast_ma and close <= latest_fast_ma * 1.03:
            return "接近月線反彈區"
        if close < latest_fast_ma:
            return "跌破月線"
        return "偏離月線"

    if strategy_name == "突破 60 日新高":
        if latest_high is not None and close > latest_high:
            return "已突破區間新高"
        if latest_high is not None and close >= latest_high * 0.97:
            return "接近突破"
        return "尚未突破"

    if strategy_name == "投信連買 + 站上月線":
        if close > latest_fast_ma:
            return "站上月線"
        return "尚未站上月線"

    return "觀望"


def get_signals(
    strategy_name: str,
    i: int,
    closes,
    fast_ma,
    slow_ma,
    high_window,
    shares: int,
    entry_price,
    stop_loss_rate: float,
    take_profit_rate: float,
):
    close = closes[i]
    previous_close = closes[i - 1]

    current_fast_ma = fast_ma[i]
    previous_fast_ma = fast_ma[i - 1]

    current_slow_ma = slow_ma[i]
    previous_slow_ma = slow_ma[i - 1]

    current_high = high_window[i]

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
            and previous_fast_ma is not None
            and previous_slow_ma is not None
            and current_fast_ma is not None
            and current_slow_ma is not None
            and previous_fast_ma <= previous_slow_ma
            and current_fast_ma > current_slow_ma
        )

        sell_signal = (
            shares > 0
            and previous_fast_ma is not None
            and previous_slow_ma is not None
            and current_fast_ma is not None
            and current_slow_ma is not None
            and previous_fast_ma >= previous_slow_ma
            and current_fast_ma < current_slow_ma
        )

    elif strategy_name == "回測月線反彈":
        buy_signal = (
            shares == 0
            and previous_fast_ma is not None
            and current_fast_ma is not None
            and previous_close < previous_fast_ma
            and close > current_fast_ma
            and close > previous_close
        )

        sell_signal = shares > 0 and current_fast_ma is not None and close < current_fast_ma

    elif strategy_name == "突破 60 日新高":
        buy_signal = shares == 0 and current_high is not None and close > current_high
        sell_signal = shares > 0 and current_fast_ma is not None and close < current_fast_ma

    elif strategy_name == "投信連買 + 站上月線":
        buy_signal = (
            shares == 0
            and previous_fast_ma is not None
            and current_fast_ma is not None
            and previous_close <= previous_fast_ma
            and close > current_fast_ma
        )

        sell_signal = shares > 0 and current_fast_ma is not None and close < current_fast_ma

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
    fast_ma_window: int = 20,
    slow_ma_window: int = 60,
    breakout_window: int = 60,
    price_data=None,
    ticker_used=None,
):
    if price_data is None:
        price_data, ticker_used = fetch_real_price_series(symbol, start_date, end_date)

    if ticker_used is None:
        ticker_used = symbol

    closes = [item["close"] for item in price_data]

    fast_ma = moving_average(closes, fast_ma_window)
    slow_ma = moving_average(closes, slow_ma_window)
    high_window = previous_high(closes, breakout_window)

    cash = initial_capital
    shares = 0
    entry_date = None
    entry_price = None
    entry_cost = 0
    trade_records = []
    daily_curve = []

    start_index = max(fast_ma_window, slow_ma_window, breakout_window)

    if start_index >= len(price_data) - 1:
        raise HTTPException(
            status_code=400,
            detail="資料區間太短，無法計算目前參數組合。請拉長日期區間。",
        )

    benchmark_start_price = closes[start_index]

    for i in range(start_index, len(price_data)):
        today = price_data[i]
        close = today["close"]

        buy_signal, sell_signal = get_signals(
            strategy_name=strategy_name,
            i=i,
            closes=closes,
            fast_ma=fast_ma,
            slow_ma=slow_ma,
            high_window=high_window,
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
                    "symbol": normalize_symbol_code(symbol),
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
                "symbol": normalize_symbol_code(symbol),
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

    current_signal = get_current_signal(strategy_name, closes, fast_ma, slow_ma, high_window)

    advanced_metrics = calculate_advanced_metrics(
        initial_capital=initial_capital,
        final_equity=final_equity,
        benchmark_start_price=benchmark_start_price,
        benchmark_end_price=closes[-1],
        trade_records=trade_records,
        max_drawdown=max_drawdown,
    )

    latest_close = closes[-1]
    latest_fast_ma = fast_ma[-1]
    latest_slow_ma = slow_ma[-1]
    latest_high = high_window[-1]

    opportunity_score = calculate_opportunity_score(
        annual_return=annual_return,
        max_drawdown=max_drawdown,
        win_rate=win_rate,
        profit_factor=advanced_metrics["profitFactor"],
        current_signal=current_signal,
    )

    security_info = get_security_info(symbol)

    result = {
        "symbol": normalize_symbol_code(symbol),
        "stockName": security_info.get("name", "未找到名稱"),
        "market": security_info.get("market", ""),
        "securityType": security_info.get("type", ""),
        "strategy": strategy_name,
        "annualReturn": round(annual_return, 1),
        "maxDrawdown": max_drawdown,
        "winRate": round(win_rate, 1),
        "trades": trade_count,
        "tickerUsed": ticker_used,
        "dataSource": "Yahoo Finance via yfinance + TWSE ISIN security master",
        "dataStartDate": price_data[0]["date"],
        "dataEndDate": price_data[-1]["date"],
        "lastClose": latest_close,
        "ma20": round(latest_fast_ma, 2) if latest_fast_ma is not None else None,
        "ma60": round(latest_slow_ma, 2) if latest_slow_ma is not None else None,
        "high60": round(latest_high, 2) if latest_high is not None else None,
        "distanceToMa20Pct": safe_round(calculate_distance_pct(latest_close, latest_fast_ma), 1),
        "distanceToMa60Pct": safe_round(calculate_distance_pct(latest_close, latest_slow_ma), 1),
        "distanceToHigh60Pct": safe_round(calculate_distance_pct(latest_close, latest_high), 1),
        "currentSignal": current_signal,
        "opportunityScore": opportunity_score,
        "fastMaWindow": fast_ma_window,
        "slowMaWindow": slow_ma_window,
        "breakoutWindow": breakout_window,
        "stopLossPct": round(stop_loss_rate * 100, 1),
        "takeProfitPct": round(take_profit_rate * 100, 1),
        "positionSizePct": round(position_fraction * 100, 1),
        **advanced_metrics,
    }

    return {
        "result": result,
        "equityCurve": compress_equity_curve(daily_curve),
        "tradeRecords": trade_records,
    }


def build_common_params(request: BacktestRequest):
    capital = clean_capital(request.capital)
    position_fraction = parse_position_size(request.positionSize)
    stop_loss_rate = parse_percent(request.stopLoss, 0.08)
    take_profit_rate = parse_percent(request.takeProfit, 0.15)
    start_date, end_date = normalize_date_range(request.startDate, request.endDate)
    fast_ma_window = parse_int_param(request.fastMa, 20, 3, 250)
    slow_ma_window = parse_int_param(request.slowMa, 60, 5, 300)
    breakout_window = parse_int_param(request.breakoutWindow, 60, 5, 300)

    if capital <= 0:
        raise HTTPException(status_code=400, detail="請輸入正確的初始資金，例如 1000000")

    if fast_ma_window >= slow_ma_window:
        slow_ma_window = max(fast_ma_window + 5, slow_ma_window)

    return {
        "capital": capital,
        "position_fraction": position_fraction,
        "stop_loss_rate": stop_loss_rate,
        "take_profit_rate": take_profit_rate,
        "start_date": start_date,
        "end_date": end_date,
        "fast_ma_window": fast_ma_window,
        "slow_ma_window": slow_ma_window,
        "breakout_window": breakout_window,
    }


def generate_optimization_grid(strategy_name: str):
    stop_loss_candidates = [0.05, 0.08, 0.10]
    take_profit_candidates = [0.10, 0.15, 0.20]
    position_candidates = [0.10, 0.20, 0.30]

    if strategy_name == "MA20 / MA60 黃金交叉":
        ma_pairs = [(5, 20), (10, 30), (20, 60)]
        breakout_candidates = [60]
    elif strategy_name == "突破 60 日新高":
        ma_pairs = [(10, 60), (20, 60)]
        breakout_candidates = [20, 60]
    else:
        ma_pairs = [(10, 60), (20, 60)]
        breakout_candidates = [60]

    grid = []

    for stop_loss_rate in stop_loss_candidates:
        for take_profit_rate in take_profit_candidates:
            for position_fraction in position_candidates:
                for fast_ma_window, slow_ma_window in ma_pairs:
                    for breakout_window in breakout_candidates:
                        grid.append(
                            {
                                "stop_loss_rate": stop_loss_rate,
                                "take_profit_rate": take_profit_rate,
                                "position_fraction": position_fraction,
                                "fast_ma_window": fast_ma_window,
                                "slow_ma_window": slow_ma_window,
                                "breakout_window": breakout_window,
                            }
                        )

    return grid


@app.get("/")
def read_root():
    return {
        "message": "Taiwan stock backtest API is running",
        "status": "ok",
        "securityMasterFile": str(SECURITY_MASTER_FILE),
        "note": "Security master uses disk cache first. Use /security-master/refresh to force online refresh.",
    }


@app.get("/security-master/refresh")
def refresh_security_master():
    data = get_security_master_map(force_refresh=True)
    return {
        "status": "ok",
        "count": len(data),
        "updatedAt": datetime.now().isoformat(timespec="seconds"),
    }


@app.get("/security/search")
def search_security(q: str = "", limit: int = 20):
    return {
        "query": q,
        "results": search_security_master(q, limit),
    }


@app.get("/security-name/{symbol}")
def read_security_name(symbol: str):
    security_info = get_security_info(symbol)
    return {
        "symbol": normalize_symbol_code(symbol),
        "stockName": security_info.get("name", "未找到名稱"),
        "market": security_info.get("market", ""),
        "securityType": security_info.get("type", ""),
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
        fast_ma_window=params["fast_ma_window"],
        slow_ma_window=params["slow_ma_window"],
        breakout_window=params["breakout_window"],
    )


@app.post("/compare")
def compare_strategies(request: BacktestRequest):
    symbol = request.symbol.strip()

    if not symbol:
        raise HTTPException(status_code=400, detail="請輸入股票代號，例如 2330")

    params = build_common_params(request)
    price_data, ticker_used = fetch_real_price_series(symbol, params["start_date"], params["end_date"])

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
            fast_ma_window=params["fast_ma_window"],
            slow_ma_window=params["slow_ma_window"],
            breakout_window=params["breakout_window"],
            price_data=price_data,
            ticker_used=ticker_used,
        )

        comparison_results.append(backtest["result"])

    comparison_results = sorted(comparison_results, key=lambda item: item["annualReturn"], reverse=True)

    return {
        "symbol": normalize_symbol_code(symbol),
        "stockName": get_stock_name(symbol),
        "market": get_security_market(symbol),
        "securityType": get_security_type(symbol),
        "tickerUsed": ticker_used,
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
                fast_ma_window=params["fast_ma_window"],
                slow_ma_window=params["slow_ma_window"],
                breakout_window=params["breakout_window"],
            )

            results.append(backtest["result"])

        except Exception as error:
            security_info = get_security_info(symbol)
            errors.append(
                {
                    "symbol": normalize_symbol_code(symbol),
                    "stockName": security_info.get("name", "未找到名稱"),
                    "market": security_info.get("market", ""),
                    "securityType": security_info.get("type", ""),
                    "message": str(error),
                }
            )

    results = sorted(
        results,
        key=lambda item: (
            item["currentSignal"] in ["接近突破", "接近月線反彈區", "均線偏多", "站上月線", "已突破區間新高"],
            item["annualReturn"],
        ),
        reverse=True,
    )

    return {"results": results, "errors": errors}


@app.post("/optimize")
def optimize_parameters(request: BacktestRequest):
    symbol = request.symbol.strip()
    strategy_name = request.strategy.strip()

    if not symbol:
        raise HTTPException(status_code=400, detail="請輸入股票代號，例如 2330")

    params = build_common_params(request)
    price_data, ticker_used = fetch_real_price_series(symbol, params["start_date"], params["end_date"])
    grid = generate_optimization_grid(strategy_name)

    optimization_results = []
    errors = []

    for candidate in grid:
        try:
            backtest = run_strategy_backtest(
                symbol=symbol,
                strategy_name=strategy_name,
                initial_capital=params["capital"],
                position_fraction=candidate["position_fraction"],
                stop_loss_rate=candidate["stop_loss_rate"],
                take_profit_rate=candidate["take_profit_rate"],
                start_date=params["start_date"],
                end_date=params["end_date"],
                fast_ma_window=candidate["fast_ma_window"],
                slow_ma_window=candidate["slow_ma_window"],
                breakout_window=candidate["breakout_window"],
                price_data=price_data,
                ticker_used=ticker_used,
            )

            result = backtest["result"]

            optimize_score = (
                result.get("opportunityScore", 0) * 0.5
                + result.get("totalReturn", 0) * 0.25
                + result.get("alphaReturn", 0) * 0.15
                + min(result.get("profitFactor", 0), 3) * 5
            )

            result["optimizeScore"] = round(optimize_score, 1)
            optimization_results.append(result)

        except Exception as error:
            errors.append(str(error))

    optimization_results = sorted(
        optimization_results,
        key=lambda item: (
            item.get("optimizeScore", 0),
            item.get("opportunityScore", 0),
            item.get("totalReturn", 0),
        ),
        reverse=True,
    )

    return {
        "symbol": normalize_symbol_code(symbol),
        "stockName": get_stock_name(symbol),
        "market": get_security_market(symbol),
        "securityType": get_security_type(symbol),
        "strategy": strategy_name,
        "tickerUsed": ticker_used,
        "testedCombinations": len(grid),
        "results": optimization_results[:20],
        "errors": errors[:10],
    }