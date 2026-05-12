from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import json
import time
import requests


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
FLOW_CACHE_DIR = DATA_DIR / "institutional_flow"

FLOW_CACHE_DIR.mkdir(parents=True, exist_ok=True)

TWSE_T86_URL = "https://www.twse.com.tw/rwd/zh/fund/T86"

DEFAULT_LOOKBACK_DAYS = 5
DEFAULT_MAX_FETCH_DAYS = 180
REQUEST_SLEEP_SECONDS = 0.08


@dataclass
class InstitutionalFlowRecord:
    symbol: str
    name: str
    market: str
    date: str

    foreignNetShares: int
    foreignNetLots: float

    trustNetShares: int
    trustNetLots: float

    dealerNetShares: int
    dealerNetLots: float

    totalNetShares: int
    totalNetLots: float

    score: int
    signal: str
    strategies: List[str]
    reason: str

    hasFlowData: bool = True


def normalize_symbol(symbol: str) -> str:
    return str(symbol or "").strip().upper().replace(".TW", "").replace(".TWO", "")


def normalize_date_text(value: str | date | datetime) -> str:
    if isinstance(value, datetime):
        return value.strftime("%Y%m%d")

    if isinstance(value, date):
        return value.strftime("%Y%m%d")

    text = str(value or "").strip().replace("-", "").replace("/", "")

    if len(text) == 8 and text.isdigit():
        return text

    return datetime.today().strftime("%Y%m%d")


def date_text_to_date(date_text: str) -> date:
    clean = normalize_date_text(date_text)
    return date(int(clean[:4]), int(clean[4:6]), int(clean[6:8]))


def date_to_text(value: date) -> str:
    return value.strftime("%Y%m%d")


def iso_to_twse_date(value: str) -> str:
    return normalize_date_text(value)


def twse_to_iso_date(value: str) -> str:
    clean = normalize_date_text(value)

    return f"{clean[:4]}-{clean[4:6]}-{clean[6:8]}"


def parse_number(value) -> int:
    if isinstance(value, int):
        return value

    if isinstance(value, float):
        return int(value)

    if value is None:
        return 0

    text = (
        str(value)
        .replace(",", "")
        .replace("--", "0")
        .replace("—", "0")
        .replace("－", "-")
        .replace(" ", "")
        .strip()
    )

    if not text:
        return 0

    try:
        return int(float(text))
    except Exception:
        return 0


def cache_file_for_date(date_text: str) -> Path:
    clean = normalize_date_text(date_text)

    return FLOW_CACHE_DIR / f"twse_t86_{clean}.json"


def load_cached_raw_response(date_text: str) -> Optional[dict]:
    path = cache_file_for_date(date_text)

    if not path.exists():
        return None

    try:
        with path.open("r", encoding="utf-8") as file:
            payload = json.load(file)

        if isinstance(payload, dict) and payload.get("data"):
            return payload

        return None
    except Exception:
        return None


def save_cached_raw_response(date_text: str, payload: dict) -> None:
    path = cache_file_for_date(date_text)

    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False)


def find_index(fields: List[str], candidates: List[str]) -> int:
    for index, field in enumerate(fields):
        field_text = str(field)

        for candidate in candidates:
            if candidate in field_text:
                return index

    return -1


def pick_value(row: List[str], index: int) -> int:
    if index < 0 or index >= len(row):
        return 0

    return parse_number(row[index])


def score_flow_record(base: dict) -> Tuple[int, str, List[str], str]:
    strategies: List[str] = []
    reasons: List[str] = []

    score = 50

    foreign_lots = float(base.get("foreignNetLots", 0))
    trust_lots = float(base.get("trustNetLots", 0))
    dealer_lots = float(base.get("dealerNetLots", 0))
    total_lots = float(base.get("totalNetLots", 0))

    if foreign_lots > 0:
        score += 6
        strategies.append("外資買超")
        reasons.append(f"外資買超 {round(foreign_lots):,} 張")

    if foreign_lots >= 1000:
        score += 14
        strategies.append("外資買超動能")

    if trust_lots > 0:
        score += 8
        strategies.append("投信買超")
        reasons.append(f"投信買超 {round(trust_lots):,} 張")

    if trust_lots >= 300:
        score += 18
        strategies.append("投信買超動能")

    if dealer_lots > 0:
        score += 4
        strategies.append("自營商偏多")

    if total_lots >= 1000:
        score += 8
        strategies.append("三大法人合計買超")
        reasons.append(f"三大法人合計買超 {round(total_lots):,} 張")

    if foreign_lots >= 1000 and trust_lots >= 300:
        score += 18
        strategies.append("外資投信同步買超")
        reasons.append("外資與投信同向買超，籌碼方向一致")

    if foreign_lots < 0:
        score -= 6
        strategies.append("外資賣超")

    if foreign_lots <= -1000:
        score -= 14
        strategies.append("外資賣壓警示")
        reasons.append(f"外資賣超 {abs(round(foreign_lots)):,} 張")

    if trust_lots < 0:
        score -= 8
        strategies.append("投信賣超")

    if trust_lots <= -300:
        score -= 14
        strategies.append("投信調節警示")
        reasons.append(f"投信賣超 {abs(round(trust_lots)):,} 張")

    if foreign_lots <= -1000 and trust_lots <= -300:
        score -= 20
        strategies.append("法人同步賣超風險")
        reasons.append("外資與投信同步賣超，短線需控管風險")

    score = max(0, min(100, int(round(score))))

    if score >= 80:
        signal = "強勢買盤"
    elif score >= 65:
        signal = "偏多觀察"
    elif score >= 50:
        signal = "中性"
    elif score >= 35:
        signal = "籌碼偏弱"
    else:
        signal = "賣壓風險"

    unique_strategies = list(dict.fromkeys(strategies))

    reason = "；".join(reasons) if reasons else "法人買賣超訊號不明顯，先列入觀察。"

    return score, signal, unique_strategies, reason


def neutral_flow_record(symbol: str, date_text: str, name: str = "") -> dict:
    clean_symbol = normalize_symbol(symbol)
    clean_date = normalize_date_text(date_text)

    record = InstitutionalFlowRecord(
        symbol=clean_symbol,
        name=name or clean_symbol,
        market="TWSE",
        date=clean_date,
        foreignNetShares=0,
        foreignNetLots=0,
        trustNetShares=0,
        trustNetLots=0,
        dealerNetShares=0,
        dealerNetLots=0,
        totalNetShares=0,
        totalNetLots=0,
        score=50,
        signal="無法人資料",
        strategies=[],
        reason="這個日期沒有可用法人買賣超資料，回測先以技術訊號為主。",
        hasFlowData=False,
    )

    return asdict(record)


def fetch_twse_t86_raw(date_text: str, force_refresh: bool = False) -> dict:
    clean_date = normalize_date_text(date_text)

    if not force_refresh:
        cached = load_cached_raw_response(clean_date)

        if cached is not None:
            return cached

    params = {
        "date": clean_date,
        "selectType": "ALLBUT0999",
        "response": "json",
        "_": str(int(time.time() * 1000)),
    }

    response = requests.get(
        TWSE_T86_URL,
        params=params,
        timeout=10,
        headers={
            "User-Agent": "Mozilla/5.0 stock-backtest-web",
            "Accept": "application/json,text/plain,*/*",
        },
    )

    response.raise_for_status()

    payload = response.json()

    if not isinstance(payload, dict):
        raise ValueError("TWSE T86 response is not a JSON object")

    fields = payload.get("fields")
    rows = payload.get("data")

    if not isinstance(fields, list) or not isinstance(rows, list):
        raise ValueError("TWSE T86 response format invalid")

    if len(rows) == 0:
        raise ValueError(f"TWSE T86 no data for {clean_date}")

    save_cached_raw_response(clean_date, payload)

    time.sleep(REQUEST_SLEEP_SECONDS)

    return payload


def parse_twse_t86_raw(payload: dict, date_text: str) -> Dict[str, dict]:
    fields = payload.get("fields") or []
    rows = payload.get("data") or []

    symbol_index = find_index(fields, ["證券代號"])
    name_index = find_index(fields, ["證券名稱"])

    foreign_net_index = find_index(
        fields,
        [
            "外陸資買賣超股數",
            "外資買賣超股數",
            "外資及陸資買賣超股數",
        ],
    )

    trust_net_index = find_index(fields, ["投信買賣超股數"])

    dealer_total_index = find_index(fields, ["自營商買賣超股數"])
    dealer_self_index = find_index(fields, ["自營商買賣超股數(自行買賣)"])
    dealer_hedge_index = find_index(fields, ["自營商買賣超股數(避險)"])

    result: Dict[str, dict] = {}

    for row in rows:
        if not isinstance(row, list):
            continue

        symbol = str(row[symbol_index]).strip() if symbol_index >= 0 else ""
        name = str(row[name_index]).strip() if name_index >= 0 else symbol

        if not symbol or not any(char.isdigit() for char in symbol):
            continue

        clean_symbol = normalize_symbol(symbol)

        foreign_net_shares = pick_value(row, foreign_net_index)
        trust_net_shares = pick_value(row, trust_net_index)

        dealer_net_shares = pick_value(row, dealer_total_index)

        if dealer_net_shares == 0 and (dealer_self_index >= 0 or dealer_hedge_index >= 0):
            dealer_net_shares = pick_value(row, dealer_self_index) + pick_value(row, dealer_hedge_index)

        total_net_shares = foreign_net_shares + trust_net_shares + dealer_net_shares

        base = {
            "symbol": clean_symbol,
            "name": name,
            "market": "TWSE",
            "date": normalize_date_text(date_text),
            "foreignNetShares": foreign_net_shares,
            "foreignNetLots": foreign_net_shares / 1000,
            "trustNetShares": trust_net_shares,
            "trustNetLots": trust_net_shares / 1000,
            "dealerNetShares": dealer_net_shares,
            "dealerNetLots": dealer_net_shares / 1000,
            "totalNetShares": total_net_shares,
            "totalNetLots": total_net_shares / 1000,
        }

        score, signal, strategies, reason = score_flow_record(base)

        result[clean_symbol] = {
            **base,
            "score": score,
            "signal": signal,
            "strategies": strategies,
            "reason": reason,
            "hasFlowData": True,
        }

    return result


def get_daily_flow_map(date_text: str, force_refresh: bool = False) -> Dict[str, dict]:
    clean_date = normalize_date_text(date_text)
    payload = fetch_twse_t86_raw(clean_date, force_refresh=force_refresh)

    return parse_twse_t86_raw(payload, clean_date)


def get_latest_available_daily_flow_map(
    date_text: str,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
    force_refresh: bool = False,
) -> Tuple[str, Dict[str, dict]]:
    clean_date = normalize_date_text(date_text)
    start = date_text_to_date(clean_date)

    safe_lookback = max(0, min(int(lookback_days), 14))

    last_error = ""

    for offset in range(safe_lookback + 1):
        current_date = start - timedelta(days=offset)
        current_text = date_to_text(current_date)

        try:
            flow_map = get_daily_flow_map(current_text, force_refresh=force_refresh)
            return current_text, flow_map
        except Exception as error:
            last_error = str(error)

    raise ValueError(f"找不到最近 {safe_lookback + 1} 天的法人資料：{last_error}")


def get_flow_record_for_symbol(
    symbol: str,
    date_text: str,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
) -> dict:
    clean_symbol = normalize_symbol(symbol)
    clean_date = normalize_date_text(date_text)

    try:
        used_date, flow_map = get_latest_available_daily_flow_map(
            clean_date,
            lookback_days=lookback_days,
        )

        record = flow_map.get(clean_symbol)

        if record:
            return record

        return neutral_flow_record(clean_symbol, used_date)
    except Exception:
        return neutral_flow_record(clean_symbol, clean_date)


def is_flow_positive(record: dict) -> bool:
    return bool(record.get("hasFlowData")) and float(record.get("score", 50)) >= 60


def is_flow_strong_positive(record: dict) -> bool:
    return bool(record.get("hasFlowData")) and float(record.get("score", 50)) >= 75


def is_flow_negative(record: dict) -> bool:
    return bool(record.get("hasFlowData")) and float(record.get("score", 50)) <= 35


def is_foreign_buy(record: dict, min_lots: float = 0) -> bool:
    return bool(record.get("hasFlowData")) and float(record.get("foreignNetLots", 0)) >= min_lots


def is_trust_buy(record: dict, min_lots: float = 0) -> bool:
    return bool(record.get("hasFlowData")) and float(record.get("trustNetLots", 0)) >= min_lots


def is_sync_foreign_trust_buy(
    record: dict,
    min_foreign_lots: float = 0,
    min_trust_lots: float = 0,
) -> bool:
    return is_foreign_buy(record, min_foreign_lots) and is_trust_buy(record, min_trust_lots)


def is_sync_foreign_trust_sell(
    record: dict,
    min_foreign_lots: float = -1,
    min_trust_lots: float = -1,
) -> bool:
    if not bool(record.get("hasFlowData")):
        return False

    return (
        float(record.get("foreignNetLots", 0)) <= min_foreign_lots
        and float(record.get("trustNetLots", 0)) <= min_trust_lots
    )


def build_flow_context_for_price_dates(
    symbol: str,
    price_dates: Iterable[str],
    max_fetch_days: int = DEFAULT_MAX_FETCH_DAYS,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
) -> Dict[str, dict]:
    clean_symbol = normalize_symbol(symbol)

    unique_dates = []

    for item in price_dates:
        clean_date = normalize_date_text(item)

        if clean_date not in unique_dates:
            unique_dates.append(clean_date)

    if max_fetch_days > 0:
        unique_dates = unique_dates[-max_fetch_days:]

    context: Dict[str, dict] = {}

    last_available_record: Optional[dict] = None

    for current_date in unique_dates:
        try:
            used_date, flow_map = get_latest_available_daily_flow_map(
                current_date,
                lookback_days=lookback_days,
            )

            record = flow_map.get(clean_symbol)

            if record:
                last_available_record = record
                context[current_date] = record
            elif last_available_record:
                context[current_date] = {
                    **last_available_record,
                    "date": current_date,
                    "reason": "當日無個股法人資料，沿用最近一筆可用法人資料作為參考。",
                }
            else:
                context[current_date] = neutral_flow_record(clean_symbol, current_date)

        except Exception:
            if last_available_record:
                context[current_date] = {
                    **last_available_record,
                    "date": current_date,
                    "reason": "當日法人資料讀取失敗，沿用最近一筆可用法人資料作為參考。",
                }
            else:
                context[current_date] = neutral_flow_record(clean_symbol, current_date)

    return context


def summarize_flow_context(flow_context: Dict[str, dict]) -> dict:
    records = [record for record in flow_context.values() if record.get("hasFlowData")]

    if not records:
        return {
            "flowDataDays": 0,
            "flowScoreAvg": 50,
            "foreignNetLotsSum": 0,
            "trustNetLotsSum": 0,
            "dealerNetLotsSum": 0,
            "flowSignal": "無法人資料",
        }

    foreign_sum = sum(float(record.get("foreignNetLots", 0)) for record in records)
    trust_sum = sum(float(record.get("trustNetLots", 0)) for record in records)
    dealer_sum = sum(float(record.get("dealerNetLots", 0)) for record in records)
    score_avg = sum(float(record.get("score", 50)) for record in records) / len(records)

    if score_avg >= 75:
        flow_signal = "法人籌碼偏強"
    elif score_avg >= 60:
        flow_signal = "法人籌碼偏多"
    elif score_avg <= 35:
        flow_signal = "法人籌碼偏弱"
    else:
        flow_signal = "法人籌碼中性"

    return {
        "flowDataDays": len(records),
        "flowScoreAvg": round(score_avg, 1),
        "foreignNetLotsSum": round(foreign_sum, 1),
        "trustNetLotsSum": round(trust_sum, 1),
        "dealerNetLotsSum": round(dealer_sum, 1),
        "flowSignal": flow_signal,
    }
# ============================================================
# Fast mode override
# Avoid long historical TWSE fetching during backtest.
# It fetches only the latest available flow record and reuses it
# across the requested backtest dates.
# ============================================================

def build_flow_context_for_price_dates(
    symbol: str,
    price_dates,
    max_fetch_days: int = DEFAULT_MAX_FETCH_DAYS,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
):
    clean_symbol = normalize_symbol(symbol)

    unique_dates = []

    for item in price_dates:
        clean_date = normalize_date_text(item)

        if clean_date not in unique_dates:
            unique_dates.append(clean_date)

    if not unique_dates:
        return {}

    latest_date = unique_dates[-1]

    try:
        used_date, flow_map = get_latest_available_daily_flow_map(
            latest_date,
            lookback_days=min(int(lookback_days), 3),
        )

        latest_record = flow_map.get(clean_symbol)

        if not latest_record:
            latest_record = neutral_flow_record(clean_symbol, used_date)

    except Exception:
        latest_record = neutral_flow_record(clean_symbol, latest_date)

    return {
        current_date: {
            **latest_record,
            "date": current_date,
            "reason": (
                latest_record.get("reason", "")
                + "｜快速模式：回測期間暫以最近一筆法人資料作為籌碼濾網。"
            ),
        }
        for current_date in unique_dates
    }
# ============================================================
# Normal mode override
# Use historical daily TWSE T86 institutional flow records.
# Conservative version: fetches only the recent max_fetch_days
# to avoid timeout, then cache will make future runs faster.
# ============================================================

def build_flow_context_for_price_dates(
    symbol: str,
    price_dates,
    max_fetch_days: int = DEFAULT_MAX_FETCH_DAYS,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
):
    clean_symbol = normalize_symbol(symbol)

    unique_dates = []

    for item in price_dates:
        clean_date = normalize_date_text(item)

        if clean_date not in unique_dates:
            unique_dates.append(clean_date)

    if max_fetch_days > 0:
        unique_dates = unique_dates[-max_fetch_days:]

    context = {}
    last_available_record = None

    for current_date in unique_dates:
        try:
            used_date, flow_map = get_latest_available_daily_flow_map(
                current_date,
                lookback_days=min(int(lookback_days), 2),
            )

            record = flow_map.get(clean_symbol)

            if record:
                last_available_record = record
                context[current_date] = record
            elif last_available_record:
                context[current_date] = {
                    **last_available_record,
                    "date": current_date,
                    "reason": (
                        last_available_record.get("reason", "")
                        + "｜正常模式：當日無個股法人資料，沿用最近一筆可用資料。"
                    ),
                }
            else:
                context[current_date] = neutral_flow_record(clean_symbol, current_date)

        except Exception:
            if last_available_record:
                context[current_date] = {
                    **last_available_record,
                    "date": current_date,
                    "reason": (
                        last_available_record.get("reason", "")
                        + "｜正常模式：當日法人資料讀取失敗，沿用最近一筆可用資料。"
                    ),
                }
            else:
                context[current_date] = neutral_flow_record(clean_symbol, current_date)

    return context
# ============================================================
# FinMind range mode override
# Use FinMind TaiwanStockInstitutionalInvestorsBuySell.
# This fetches institutional flow by stock_id + date range
# in ONE request instead of TWSE T86 one request per day.
# ============================================================

FINMIND_API_URL = "https://api.finmindtrade.com/api/v4/data"


def finmind_cache_file_for_range(symbol: str, start_date: str, end_date: str) -> Path:
    clean_symbol = normalize_symbol(symbol)
    clean_start = normalize_date_text(start_date)
    clean_end = normalize_date_text(end_date)

    return FLOW_CACHE_DIR / f"finmind_institutional_{clean_symbol}_{clean_start}_{clean_end}.json"


def date_text_to_iso_for_finmind(date_text: str) -> str:
    clean = normalize_date_text(date_text)
    return f"{clean[:4]}-{clean[4:6]}-{clean[6:8]}"


def load_cached_finmind_range(symbol: str, start_date: str, end_date: str):
    path = finmind_cache_file_for_range(symbol, start_date, end_date)

    if not path.exists():
        return None

    try:
        with path.open("r", encoding="utf-8") as file:
            payload = json.load(file)

        if isinstance(payload, dict) and isinstance(payload.get("data"), list):
            return payload

        return None
    except Exception:
        return None


def save_cached_finmind_range(symbol: str, start_date: str, end_date: str, payload: dict) -> None:
    path = finmind_cache_file_for_range(symbol, start_date, end_date)

    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False)


def fetch_finmind_institutional_range(
    symbol: str,
    start_date: str,
    end_date: str,
    force_refresh: bool = False,
):
    clean_symbol = normalize_symbol(symbol)
    clean_start = normalize_date_text(start_date)
    clean_end = normalize_date_text(end_date)

    if not force_refresh:
        cached = load_cached_finmind_range(clean_symbol, clean_start, clean_end)

        if cached is not None:
            return cached

    params = {
        "dataset": "TaiwanStockInstitutionalInvestorsBuySell",
        "data_id": clean_symbol,
        "start_date": date_text_to_iso_for_finmind(clean_start),
        "end_date": date_text_to_iso_for_finmind(clean_end),
    }

    response = requests.get(
        FINMIND_API_URL,
        params=params,
        timeout=15,
        headers={
            "User-Agent": "Mozilla/5.0 stock-backtest-web",
            "Accept": "application/json,text/plain,*/*",
        },
    )

    response.raise_for_status()

    payload = response.json()

    if not isinstance(payload, dict):
        raise ValueError("FinMind response is not JSON object")

    if int(payload.get("status", 0)) not in [200, 201]:
        raise ValueError(str(payload.get("msg", "FinMind institutional flow request failed")))

    if not isinstance(payload.get("data"), list):
        raise ValueError("FinMind response data format invalid")

    save_cached_finmind_range(clean_symbol, clean_start, clean_end, payload)

    return payload


def classify_finmind_investor_name(name: str) -> str:
    text = str(name or "").lower()

    # FinMind 常見 name 可能是英文或中文，這裡都一起容錯。
    if (
        "foreign" in text
        or "外資" in text
        or "外陸資" in text
        or "外資及陸資" in text
    ):
        return "foreign"

    if (
        "investment_trust" in text
        or "investment trust" in text
        or "投信" in text
    ):
        return "trust"

    if (
        "dealer" in text
        or "自營" in text
        or "自營商" in text
    ):
        return "dealer"

    return "other"


def parse_finmind_institutional_payload(
    symbol: str,
    payload: dict,
) -> Dict[str, dict]:
    clean_symbol = normalize_symbol(symbol)
    rows = payload.get("data") or []

    grouped: Dict[str, dict] = {}

    for row in rows:
        if not isinstance(row, dict):
            continue

        row_symbol = normalize_symbol(row.get("stock_id", clean_symbol))

        if row_symbol != clean_symbol:
            continue

        date_key = normalize_date_text(row.get("date", ""))

        if not date_key:
            continue

        investor_type = classify_finmind_investor_name(str(row.get("name", "")))

        buy = parse_number(row.get("buy", 0))
        sell = parse_number(row.get("sell", 0))
        net_shares = buy - sell

        if date_key not in grouped:
            grouped[date_key] = {
                "symbol": clean_symbol,
                "name": clean_symbol,
                "market": "FinMind",
                "date": date_key,
                "foreignNetShares": 0,
                "trustNetShares": 0,
                "dealerNetShares": 0,
            }

        if investor_type == "foreign":
            grouped[date_key]["foreignNetShares"] += net_shares
        elif investor_type == "trust":
            grouped[date_key]["trustNetShares"] += net_shares
        elif investor_type == "dealer":
            grouped[date_key]["dealerNetShares"] += net_shares

    result: Dict[str, dict] = {}

    for date_key, base in grouped.items():
        foreign_net_shares = int(base.get("foreignNetShares", 0))
        trust_net_shares = int(base.get("trustNetShares", 0))
        dealer_net_shares = int(base.get("dealerNetShares", 0))
        total_net_shares = foreign_net_shares + trust_net_shares + dealer_net_shares

        flow_base = {
            "symbol": clean_symbol,
            "name": clean_symbol,
            "market": "FinMind",
            "date": date_key,
            "foreignNetShares": foreign_net_shares,
            "foreignNetLots": foreign_net_shares / 1000,
            "trustNetShares": trust_net_shares,
            "trustNetLots": trust_net_shares / 1000,
            "dealerNetShares": dealer_net_shares,
            "dealerNetLots": dealer_net_shares / 1000,
            "totalNetShares": total_net_shares,
            "totalNetLots": total_net_shares / 1000,
        }

        score, signal, strategies, reason = score_flow_record(flow_base)

        result[date_key] = {
            **flow_base,
            "score": score,
            "signal": signal,
            "strategies": strategies,
            "reason": reason + "｜資料來源：FinMind 區間查詢。",
            "hasFlowData": True,
        }

    return result


def build_flow_context_for_price_dates(
    symbol: str,
    price_dates,
    max_fetch_days: int = DEFAULT_MAX_FETCH_DAYS,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
):
    clean_symbol = normalize_symbol(symbol)

    unique_dates = []

    for item in price_dates:
        clean_date = normalize_date_text(item)

        if clean_date and clean_date not in unique_dates:
            unique_dates.append(clean_date)

    if not unique_dates:
        return {}

    if max_fetch_days > 0:
        unique_dates = unique_dates[-max_fetch_days:]

    start_date = unique_dates[0]
    end_date = unique_dates[-1]

    try:
        payload = fetch_finmind_institutional_range(
            symbol=clean_symbol,
            start_date=start_date,
            end_date=end_date,
            force_refresh=False,
        )

        flow_by_date = parse_finmind_institutional_payload(
            symbol=clean_symbol,
            payload=payload,
        )

    except Exception as error:
        # 這裡故意不 fallback TWSE，避免又變成逐日抓資料卡住。
        return {
            current_date: {
                **neutral_flow_record(clean_symbol, current_date),
                "reason": f"FinMind 法人資料讀取失敗：{error}。本次回測先以技術訊號為主。",
            }
            for current_date in unique_dates
        }

    context = {}
    last_available_record = None

    for current_date in unique_dates:
        record = flow_by_date.get(current_date)

        if record:
            last_available_record = record
            context[current_date] = record
        elif last_available_record:
            context[current_date] = {
                **last_available_record,
                "date": current_date,
                "reason": (
                    last_available_record.get("reason", "")
                    + "｜FinMind 區間模式：當日無資料，沿用最近一筆法人資料。"
                ),
            }
        else:
            context[current_date] = {
                **neutral_flow_record(clean_symbol, current_date),
                "reason": "FinMind 區間模式：此日期前尚無可用法人資料，先以技術訊號為主。",
            }

    return context
# ============================================================
# Hybrid latest-first institutional flow mode
# Priority:
# 1. Latest available TWSE T86 official daily data
# 2. FinMind range data for historical backtest context
# 3. Neutral fallback if both fail
#
# This avoids slow TWSE daily-by-daily fetching.
# Only ONE latest TWSE request + ONE FinMind range request.
# ============================================================

def get_latest_twse_record_for_symbol(
    symbol: str,
    end_date: str,
    lookback_days: int = 5,
):
    clean_symbol = normalize_symbol(symbol)
    clean_end = normalize_date_text(end_date)

    try:
        used_date, flow_map = get_latest_available_daily_flow_map(
            clean_end,
            lookback_days=lookback_days,
            force_refresh=False,
        )

        record = flow_map.get(clean_symbol)

        if not record:
            return None, f"TWSE 最新資料有抓到 {used_date}，但找不到 {clean_symbol}"

        return {
            **record,
            "date": used_date,
            "sourceMode": "TWSE_LATEST_PRIORITY",
            "reason": (
                record.get("reason", "")
                + "｜最新優先模式：使用 TWSE T86 最近可用官方法人資料。"
            ),
        }, ""

    except Exception as error:
        return None, f"TWSE 最新資料讀取失敗：{error}"


def build_finmind_range_context_for_dates(
    symbol: str,
    unique_dates,
):
    clean_symbol = normalize_symbol(symbol)

    if not unique_dates:
        return {}, "沒有日期可查詢"

    start_date = unique_dates[0]
    end_date = unique_dates[-1]

    try:
        payload = fetch_finmind_institutional_range(
            symbol=clean_symbol,
            start_date=start_date,
            end_date=end_date,
            force_refresh=False,
        )

        flow_by_date = parse_finmind_institutional_payload(
            symbol=clean_symbol,
            payload=payload,
        )

    except Exception as error:
        return {}, f"FinMind 區間法人資料讀取失敗：{error}"

    context = {}
    last_available_record = None

    for current_date in unique_dates:
        record = flow_by_date.get(current_date)

        if record:
            last_available_record = record
            context[current_date] = {
                **record,
                "sourceMode": "FINMIND_RANGE",
                "reason": (
                    record.get("reason", "")
                    + "｜歷史區間資料來源：FinMind。"
                ),
            }
        elif last_available_record:
            context[current_date] = {
                **last_available_record,
                "date": current_date,
                "sourceMode": "FINMIND_RANGE_CARRY_FORWARD",
                "reason": (
                    last_available_record.get("reason", "")
                    + "｜FinMind 區間模式：當日無資料，沿用最近一筆法人資料。"
                ),
            }
        else:
            context[current_date] = neutral_flow_record(clean_symbol, current_date)

    return context, ""


def build_flow_context_for_price_dates(
    symbol: str,
    price_dates,
    max_fetch_days: int = DEFAULT_MAX_FETCH_DAYS,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
):
    clean_symbol = normalize_symbol(symbol)

    unique_dates = []

    for item in price_dates:
        clean_date = normalize_date_text(item)

        if clean_date and clean_date not in unique_dates:
            unique_dates.append(clean_date)

    if not unique_dates:
        return {}

    if max_fetch_days > 0:
        unique_dates = unique_dates[-max_fetch_days:]

    latest_price_date = unique_dates[-1]

    latest_twse_record, twse_error = get_latest_twse_record_for_symbol(
        symbol=clean_symbol,
        end_date=latest_price_date,
        lookback_days=5,
    )

    finmind_context, finmind_error = build_finmind_range_context_for_dates(
        symbol=clean_symbol,
        unique_dates=unique_dates,
    )

    context = {}

    for current_date in unique_dates:
        finmind_record = finmind_context.get(current_date)

        if finmind_record and finmind_record.get("hasFlowData"):
            context[current_date] = finmind_record
        elif latest_twse_record:
            context[current_date] = {
                **latest_twse_record,
                "date": current_date,
                "sourceMode": "TWSE_LATEST_CARRY_FORWARD",
                "reason": (
                    latest_twse_record.get("reason", "")
                    + "｜因歷史區間資料不足，暫以 TWSE 最新法人資料作為籌碼濾網。"
                ),
            }
        else:
            context[current_date] = {
                **neutral_flow_record(clean_symbol, current_date),
                "reason": (
                    "法人資料讀取失敗，回測先以技術訊號為主。"
                    f"｜TWSE：{twse_error or '無錯誤'}"
                    f"｜FinMind：{finmind_error or '無錯誤'}"
                ),
            }

    if latest_twse_record:
        context[latest_price_date] = {
            **latest_twse_record,
            "date": latest_price_date,
            "sourceMode": "TWSE_LATEST_PRIORITY",
            "reason": (
                latest_twse_record.get("reason", "")
                + "｜最新一日採用 TWSE 官方最新資料優先。"
            ),
        }

    return context