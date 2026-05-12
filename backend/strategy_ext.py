from statistics import mean, pstdev


STRATEGIES = [
    "MA20 / MA60 黃金交叉",
    "MA5 / MA20 短線轉強",
    "突破整理區策略",
    "創 20 日新高動能策略",
    "週線多頭排列策略",
    "RSI 低檔反彈策略",
    "布林通道下緣反彈",
    "KD 低檔黃金交叉",
    "跌深乖離率修復策略",
    "外資投信同步買超 + MA20 趨勢過濾",
    "投信連買動能 + 月線防守",
    "外資回補反彈 + RSI 低檔轉強",
    "三大法人合計買超 + 突破整理",
    "外資投信同步賣超風險過濾",
    "外資連買 3 日 + 價格站上季線",
    "投信作帳季策略",
    "Buy and Hold 長期持有",
    "ETF 定期定額策略",
    "ETF 回檔分批加碼",
    "股債平衡再平衡策略",
    "高殖利率低波動策略",
    "營收創高成長策略",
    "低本益比轉強策略",
    "移動停損保護策略",
    "最大回撤限制策略",
]


FLOW_STRATEGY_NAMES = [
    "外資投信同步買超 + MA20 趨勢過濾",
    "投信連買動能 + 月線防守",
    "外資回補反彈 + RSI 低檔轉強",
    "三大法人合計買超 + 突破整理",
    "外資投信同步賣超風險過濾",
    "外資連買 3 日 + 價格站上季線",
    "投信作帳季策略",
]


def canonical_strategy(strategy_name: str) -> str:
    name = str(strategy_name or "").strip()

    mapping = {
        "MA20 / MA60 黃金交叉": "MA_CROSS",
        "MA5 / MA20 短線轉強": "FAST_MA_CROSS",
        "回測月線反彈": "MA_PULLBACK",
        "突破 60 日新高": "BREAKOUT_60",
        "突破整理區策略": "BREAKOUT_20",
        "創 20 日新高動能策略": "NEW_HIGH_20",
        "週線多頭排列策略": "WEEKLY_TREND",
        "RSI 低檔反彈策略": "RSI_REBOUND",
        "布林通道下緣反彈": "BOLLINGER_REBOUND",
        "KD 低檔黃金交叉": "KD_CROSS",
        "跌深乖離率修復策略": "DEEP_DEVIATION",
        "投信連買 + 站上月線": "TRUST_MA20",
        "外資投信同步買超 + MA20 趨勢過濾": "FLOW_SYNC_MA20",
        "投信連買動能 + 月線防守": "TRUST_MA20",
        "外資回補反彈 + RSI 低檔轉強": "FOREIGN_RSI_REBOUND",
        "三大法人合計買超 + 突破整理": "FLOW_BREAKOUT",
        "外資投信同步賣超風險過濾": "FLOW_RISK_FILTER",
        "外資連買 3 日 + 價格站上季線": "FOREIGN_SEASON_TREND",
        "投信作帳季策略": "TRUST_WINDOW_DRESSING",
        "Buy and Hold 長期持有": "BUY_AND_HOLD",
        "ETF 定期定額策略": "BUY_AND_HOLD",
        "ETF 回檔分批加碼": "ETF_PULLBACK",
        "股債平衡再平衡策略": "BUY_AND_HOLD",
        "高殖利率低波動策略": "LOW_VOL_DIVIDEND",
        "營收創高成長策略": "GROWTH_BREAKOUT",
        "低本益比轉強策略": "VALUE_TURNAROUND",
        "移動停損保護策略": "TRAILING_PROTECT",
        "最大回撤限制策略": "DRAWDOWN_GUARD",
    }

    return mapping.get(name, "MA_CROSS")


def is_flow_strategy(strategy_name: str) -> bool:
    return str(strategy_name or "").strip() in FLOW_STRATEGY_NAMES


def normalize_date_key(value) -> str:
    text = str(value or "").strip().replace("-", "").replace("/", "")

    if len(text) >= 8:
        return text[:8]

    return text


def value_at(series, index):
    if index < 0 or index >= len(series):
        return None

    return series[index]


def rolling_mean(values, index, window):
    if index + 1 < window:
        return None

    window_values = values[index + 1 - window : index + 1]

    return sum(window_values) / window


def rolling_high(values, index, window, exclude_current=True):
    if exclude_current:
        if index < window:
            return None

        window_values = values[index - window : index]
    else:
        if index + 1 < window:
            return None

        window_values = values[index + 1 - window : index + 1]

    return max(window_values) if window_values else None


def rolling_low(values, index, window, exclude_current=True):
    if exclude_current:
        if index < window:
            return None

        window_values = values[index - window : index]
    else:
        if index + 1 < window:
            return None

        window_values = values[index + 1 - window : index + 1]

    return min(window_values) if window_values else None


def calculate_rsi(values, index, period=14):
    if index < period:
        return None

    gains = []
    losses = []

    for i in range(index - period + 1, index + 1):
        change = values[i] - values[i - 1]

        if change >= 0:
            gains.append(change)
            losses.append(0)
        else:
            gains.append(0)
            losses.append(abs(change))

    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period

    if avg_loss == 0:
        return 100

    rs = avg_gain / avg_loss

    return 100 - (100 / (1 + rs))


def calculate_bollinger(values, index, window=20, std_multiplier=2):
    if index + 1 < window:
        return None, None, None

    window_values = values[index + 1 - window : index + 1]
    basis = mean(window_values)
    std = pstdev(window_values)

    upper = basis + std_multiplier * std
    lower = basis - std_multiplier * std

    return basis, upper, lower


def calculate_kd(values, index, period=9):
    if index < period:
        return None, None

    k_values = []

    for i in range(index - 2, index + 1):
        if i < period:
            continue

        low = rolling_low(values, i, period, exclude_current=False)
        high = rolling_high(values, i, period, exclude_current=False)

        if low is None or high is None or high == low:
            continue

        k = ((values[i] - low) / (high - low)) * 100
        k_values.append(k)

    if not k_values:
        return None, None

    k = k_values[-1]
    d = sum(k_values) / len(k_values)

    return k, d


def crossed_above(previous_a, previous_b, current_a, current_b):
    return (
        previous_a is not None
        and previous_b is not None
        and current_a is not None
        and current_b is not None
        and previous_a <= previous_b
        and current_a > current_b
    )


def crossed_below(previous_a, previous_b, current_a, current_b):
    return (
        previous_a is not None
        and previous_b is not None
        and current_a is not None
        and current_b is not None
        and previous_a >= previous_b
        and current_a < current_b
    )


def stop_take_profit_signal(
    shares,
    close,
    entry_price,
    stop_loss_rate,
    take_profit_rate,
):
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

    return stop_loss_signal or take_profit_signal


def neutral_flow_record():
    return {
        "hasFlowData": False,
        "score": 50,
        "foreignNetLots": 0,
        "trustNetLots": 0,
        "dealerNetLots": 0,
        "totalNetLots": 0,
        "signal": "無法人資料",
        "strategies": [],
        "reason": "沒有法人資料，僅使用技術訊號。",
    }


def get_flow_record_for_index(
    i: int,
    price_dates=None,
    flow_context=None,
):
    if not flow_context or price_dates is None:
        return neutral_flow_record()

    if i < 0 or i >= len(price_dates):
        return neutral_flow_record()

    date_key = normalize_date_key(price_dates[i])

    return flow_context.get(date_key) or neutral_flow_record()


def flow_score(record) -> float:
    try:
        return float(record.get("score", 50))
    except Exception:
        return 50


def foreign_lots(record) -> float:
    try:
        return float(record.get("foreignNetLots", 0))
    except Exception:
        return 0


def trust_lots(record) -> float:
    try:
        return float(record.get("trustNetLots", 0))
    except Exception:
        return 0


def total_lots(record) -> float:
    try:
        return float(record.get("totalNetLots", 0))
    except Exception:
        return 0


def has_flow(record) -> bool:
    return bool(record.get("hasFlowData"))


def flow_positive(record, min_score=60) -> bool:
    return has_flow(record) and flow_score(record) >= min_score


def flow_strong(record) -> bool:
    return has_flow(record) and flow_score(record) >= 75


def flow_negative(record) -> bool:
    return has_flow(record) and flow_score(record) <= 35


def foreign_buy(record, min_lots=0) -> bool:
    return has_flow(record) and foreign_lots(record) >= min_lots


def trust_buy(record, min_lots=0) -> bool:
    return has_flow(record) and trust_lots(record) >= min_lots


def sync_foreign_trust_buy(record, min_foreign_lots=0, min_trust_lots=0) -> bool:
    return foreign_buy(record, min_foreign_lots) and trust_buy(record, min_trust_lots)


def sync_foreign_trust_sell(record, max_foreign_lots=-1, max_trust_lots=-1) -> bool:
    return (
        has_flow(record)
        and foreign_lots(record) <= max_foreign_lots
        and trust_lots(record) <= max_trust_lots
    )


def get_current_signal(
    strategy_name: str,
    closes,
    fast_ma,
    slow_ma,
    high_window,
    latest_flow_record=None,
):
    strategy = canonical_strategy(strategy_name)

    close = closes[-1]
    previous_close = closes[-2] if len(closes) >= 2 else close

    ma5 = rolling_mean(closes, len(closes) - 1, 5)
    ma20 = rolling_mean(closes, len(closes) - 1, 20)
    ma60 = rolling_mean(closes, len(closes) - 1, 60)

    high20 = rolling_high(closes, len(closes) - 1, 20)
    high60 = rolling_high(closes, len(closes) - 1, 60)

    rsi = calculate_rsi(closes, len(closes) - 1)
    basis, upper, lower = calculate_bollinger(closes, len(closes) - 1)
    k, d = calculate_kd(closes, len(closes) - 1)

    flow_record = latest_flow_record or neutral_flow_record()

    if strategy in ["FLOW_SYNC_MA20", "TRUST_MA20", "FOREIGN_SEASON_TREND", "TRUST_WINDOW_DRESSING"]:
        if flow_strong(flow_record) and ma20 is not None and close > ma20:
            return "法人籌碼偏強且站上月線"
        if flow_positive(flow_record) and ma20 is not None and close > ma20:
            return "法人籌碼偏多"
        if flow_negative(flow_record):
            return "法人籌碼偏弱"
        return "法人籌碼觀察"

    if strategy == "FOREIGN_RSI_REBOUND":
        if foreign_buy(flow_record, 1000) and rsi is not None and rsi < 55:
            return "外資回補且 RSI 轉強"
        if rsi is not None and rsi < 35:
            return "RSI 低檔"
        if flow_negative(flow_record):
            return "法人籌碼偏弱"
        return "外資回補觀察"

    if strategy == "FLOW_BREAKOUT":
        if flow_positive(flow_record) and high20 is not None and close >= high20 * 0.97:
            return "法人偏多且接近突破"
        if high20 is not None and close > high20:
            return "已突破區間新高"
        return "等待法人與突破共振"

    if strategy == "FLOW_RISK_FILTER":
        if sync_foreign_trust_sell(flow_record, -1000, -300):
            return "法人同步賣超風險"
        if ma20 is not None and close > ma20:
            return "風險過濾通過"
        return "風險過濾觀察"

    if strategy in ["MA_CROSS", "WEEKLY_TREND"]:
        if ma20 is not None and ma60 is not None and ma20 > ma60 and close > ma20:
            return "均線偏多"
        if ma20 is not None and ma60 is not None and ma20 < ma60:
            return "均線偏空"
        return "觀望"

    if strategy == "FAST_MA_CROSS":
        if ma5 is not None and ma20 is not None and ma5 > ma20 and close > ma5:
            return "短線轉強"
        return "短線觀望"

    if strategy in ["BREAKOUT_20", "NEW_HIGH_20", "GROWTH_BREAKOUT"]:
        if high20 is not None and close > high20:
            return "已突破區間新高"
        if high20 is not None and close >= high20 * 0.97:
            return "接近突破"
        return "尚未突破"

    if strategy == "BREAKOUT_60":
        if high60 is not None and close > high60:
            return "已突破區間新高"
        if high60 is not None and close >= high60 * 0.97:
            return "接近突破"
        return "尚未突破"

    if strategy == "RSI_REBOUND":
        if rsi is not None and rsi < 35:
            return "RSI 低檔"
        if rsi is not None and 35 <= rsi <= 55 and close > previous_close:
            return "RSI 低檔轉強"
        if rsi is not None and rsi > 70:
            return "RSI 過熱"
        return "RSI 中性"

    if strategy == "BOLLINGER_REBOUND":
        if lower is not None and close <= lower:
            return "接近布林下緣"
        if basis is not None and close > basis:
            return "收回布林中線"
        return "布林區間內"

    if strategy == "KD_CROSS":
        if k is not None and d is not None and k > d and k < 35:
            return "KD 低檔轉強"
        if k is not None and k > 80:
            return "KD 高檔"
        return "KD 中性"

    if strategy == "DEEP_DEVIATION":
        if ma20 is not None and close <= ma20 * 0.92:
            return "跌深乖離"
        if ma20 is not None and close > ma20:
            return "乖離修復"
        return "修復觀察"

    if strategy == "BUY_AND_HOLD":
        return "長期持有"

    if strategy == "ETF_PULLBACK":
        if ma20 is not None and close <= ma20 * 1.02:
            return "ETF 回檔區"
        return "等待回檔"

    if strategy == "VALUE_TURNAROUND":
        if ma20 is not None and ma60 is not None and ma20 > ma60:
            return "價值修復轉強"
        return "價值觀察"

    if strategy in ["TRAILING_PROTECT", "DRAWDOWN_GUARD"]:
        if ma20 is not None and close > ma20:
            return "風控續抱"
        return "風控減碼"

    if strategy == "LOW_VOL_DIVIDEND":
        return "低波動配置"

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
    price_dates=None,
    flow_context=None,
):
    strategy = canonical_strategy(strategy_name)

    close = closes[i]
    previous_close = closes[i - 1]

    current_fast_ma = fast_ma[i]
    previous_fast_ma = fast_ma[i - 1]

    current_slow_ma = slow_ma[i]
    previous_slow_ma = slow_ma[i - 1]

    current_high = high_window[i]

    ma5 = rolling_mean(closes, i, 5)
    prev_ma5 = rolling_mean(closes, i - 1, 5)
    ma20 = rolling_mean(closes, i, 20)
    prev_ma20 = rolling_mean(closes, i - 1, 20)
    ma60 = rolling_mean(closes, i, 60)
    prev_ma60 = rolling_mean(closes, i - 1, 60)

    high20 = rolling_high(closes, i, 20)

    rsi = calculate_rsi(closes, i)
    prev_rsi = calculate_rsi(closes, i - 1)

    basis, upper, lower = calculate_bollinger(closes, i)
    prev_basis, prev_upper, prev_lower = calculate_bollinger(closes, i - 1)

    k, d = calculate_kd(closes, i)
    prev_k, prev_d = calculate_kd(closes, i - 1)

    flow_record = get_flow_record_for_index(
        i=i,
        price_dates=price_dates,
        flow_context=flow_context,
    )

    buy_signal = False
    sell_signal = False

    if strategy == "MA_CROSS":
        buy_signal = shares == 0 and crossed_above(
            previous_fast_ma,
            previous_slow_ma,
            current_fast_ma,
            current_slow_ma,
        )
        sell_signal = shares > 0 and crossed_below(
            previous_fast_ma,
            previous_slow_ma,
            current_fast_ma,
            current_slow_ma,
        )

    elif strategy == "FAST_MA_CROSS":
        buy_signal = shares == 0 and crossed_above(prev_ma5, prev_ma20, ma5, ma20)
        sell_signal = shares > 0 and (
            crossed_below(prev_ma5, prev_ma20, ma5, ma20)
            or (ma20 is not None and close < ma20)
        )

    elif strategy == "MA_PULLBACK":
        buy_signal = (
            shares == 0
            and prev_ma20 is not None
            and ma20 is not None
            and previous_close < prev_ma20
            and close > ma20
            and close > previous_close
        )
        sell_signal = shares > 0 and ma20 is not None and close < ma20

    elif strategy in ["BREAKOUT_20", "NEW_HIGH_20"]:
        buy_signal = shares == 0 and high20 is not None and close > high20
        sell_signal = shares > 0 and ma20 is not None and close < ma20

    elif strategy == "BREAKOUT_60":
        buy_signal = shares == 0 and current_high is not None and close > current_high
        sell_signal = shares > 0 and ma20 is not None and close < ma20

    elif strategy == "WEEKLY_TREND":
        buy_signal = (
            shares == 0
            and ma20 is not None
            and ma60 is not None
            and close > ma20
            and ma20 > ma60
        )
        sell_signal = shares > 0 and (
            (ma20 is not None and close < ma20)
            or (ma20 is not None and ma60 is not None and ma20 < ma60)
        )

    elif strategy == "RSI_REBOUND":
        buy_signal = (
            shares == 0
            and prev_rsi is not None
            and rsi is not None
            and prev_rsi < 35
            and rsi >= 35
            and close > previous_close
        )
        sell_signal = shares > 0 and (
            (rsi is not None and rsi > 70)
            or (ma20 is not None and close < ma20)
        )

    elif strategy == "BOLLINGER_REBOUND":
        buy_signal = (
            shares == 0
            and prev_lower is not None
            and lower is not None
            and previous_close < prev_lower
            and close > lower
            and close > previous_close
        )
        sell_signal = shares > 0 and (
            (upper is not None and close > upper)
            or (ma20 is not None and close < ma20)
        )

    elif strategy == "KD_CROSS":
        buy_signal = (
            shares == 0
            and prev_k is not None
            and prev_d is not None
            and k is not None
            and d is not None
            and prev_k <= prev_d
            and k > d
            and k < 35
        )
        sell_signal = shares > 0 and (
            (k is not None and k > 80)
            or (ma20 is not None and close < ma20)
        )

    elif strategy == "DEEP_DEVIATION":
        buy_signal = (
            shares == 0
            and ma20 is not None
            and close <= ma20 * 0.92
            and close > previous_close
        )
        sell_signal = shares > 0 and (
            (ma20 is not None and close >= ma20)
            or (entry_price is not None and close < entry_price * 0.93)
        )

    elif strategy == "FLOW_SYNC_MA20":
        buy_signal = (
            shares == 0
            and sync_foreign_trust_buy(flow_record, min_foreign_lots=0, min_trust_lots=0)
            and flow_score(flow_record) >= 60
            and ma20 is not None
            and close > ma20
        )
        sell_signal = shares > 0 and (
            sync_foreign_trust_sell(flow_record, max_foreign_lots=-500, max_trust_lots=-100)
            or flow_negative(flow_record)
            or (ma20 is not None and close < ma20)
        )

    elif strategy == "TRUST_MA20":
        buy_signal = (
            shares == 0
            and trust_buy(flow_record, min_lots=0)
            and flow_score(flow_record) >= 55
            and ma20 is not None
            and close > ma20
        )
        sell_signal = shares > 0 and (
            (has_flow(flow_record) and trust_lots(flow_record) < 0)
            or (ma20 is not None and close < ma20)
        )

    elif strategy == "FOREIGN_RSI_REBOUND":
        buy_signal = (
            shares == 0
            and foreign_buy(flow_record, min_lots=0)
            and prev_rsi is not None
            and rsi is not None
            and prev_rsi < 45
            and rsi >= 40
            and close > previous_close
        )
        sell_signal = shares > 0 and (
            (has_flow(flow_record) and foreign_lots(flow_record) < 0)
            or (rsi is not None and rsi > 72)
            or (ma20 is not None and close < ma20)
        )

    elif strategy == "FLOW_BREAKOUT":
        buy_signal = (
            shares == 0
            and flow_positive(flow_record, min_score=60)
            and total_lots(flow_record) > 0
            and high20 is not None
            and close > high20
        )
        sell_signal = shares > 0 and (
            flow_negative(flow_record)
            or (ma20 is not None and close < ma20)
        )

    elif strategy == "FLOW_RISK_FILTER":
        buy_signal = (
            shares == 0
            and not sync_foreign_trust_sell(flow_record, max_foreign_lots=-500, max_trust_lots=-100)
            and not flow_negative(flow_record)
            and ma20 is not None
            and ma60 is not None
            and close > ma20
            and ma20 > ma60
        )
        sell_signal = shares > 0 and (
            sync_foreign_trust_sell(flow_record, max_foreign_lots=-500, max_trust_lots=-100)
            or flow_negative(flow_record)
            or (ma20 is not None and close < ma20)
            or (ma60 is not None and close < ma60)
        )

    elif strategy == "FOREIGN_SEASON_TREND":
        buy_signal = (
            shares == 0
            and foreign_buy(flow_record, min_lots=0)
            and flow_score(flow_record) >= 55
            and ma60 is not None
            and close > ma60
        )
        sell_signal = shares > 0 and (
            (has_flow(flow_record) and foreign_lots(flow_record) < 0)
            or (ma60 is not None and close < ma60)
        )

    elif strategy == "TRUST_WINDOW_DRESSING":
        buy_signal = (
            shares == 0
            and trust_buy(flow_record, min_lots=0)
            and flow_score(flow_record) >= 55
            and ma20 is not None
            and close > ma20
        )
        sell_signal = shares > 0 and (
            (has_flow(flow_record) and trust_lots(flow_record) < 0)
            or (ma20 is not None and close < ma20)
        )

    elif strategy == "BUY_AND_HOLD":
        buy_signal = shares == 0 and close > 0
        sell_signal = False

    elif strategy == "ETF_PULLBACK":
        buy_signal = (
            shares == 0
            and ma20 is not None
            and ma60 is not None
            and close <= ma20 * 1.02
            and ma20 >= ma60 * 0.98
        )
        sell_signal = shares > 0 and ma60 is not None and close < ma60

    elif strategy == "LOW_VOL_DIVIDEND":
        buy_signal = shares == 0 and ma20 is not None and ma60 is not None and close > ma60
        sell_signal = shares > 0 and ma60 is not None and close < ma60

    elif strategy == "GROWTH_BREAKOUT":
        buy_signal = shares == 0 and high20 is not None and close > high20
        sell_signal = shares > 0 and ma20 is not None and close < ma20

    elif strategy == "VALUE_TURNAROUND":
        buy_signal = shares == 0 and crossed_above(prev_ma20, prev_ma60, ma20, ma60)
        sell_signal = shares > 0 and ma20 is not None and close < ma20

    elif strategy == "TRAILING_PROTECT":
        buy_signal = shares == 0 and crossed_above(
            previous_fast_ma,
            previous_slow_ma,
            current_fast_ma,
            current_slow_ma,
        )
        sell_signal = shares > 0 and ma20 is not None and close < ma20

    elif strategy == "DRAWDOWN_GUARD":
        buy_signal = (
            shares == 0
            and ma20 is not None
            and ma60 is not None
            and close > ma20
            and ma20 > ma60
        )
        sell_signal = shares > 0 and ma60 is not None and close < ma60

    if stop_take_profit_signal(
        shares=shares,
        close=close,
        entry_price=entry_price,
        stop_loss_rate=stop_loss_rate,
        take_profit_rate=take_profit_rate,
    ):
        sell_signal = True

    return buy_signal, sell_signal


def generate_optimization_grid(strategy_name: str):
    strategy = canonical_strategy(strategy_name)

    stop_loss_candidates = [0.05, 0.08, 0.10]
    take_profit_candidates = [0.10, 0.15, 0.20]
    position_candidates = [0.10, 0.20, 0.30]

    if strategy in ["FAST_MA_CROSS"]:
        ma_pairs = [(5, 20), (8, 24), (10, 30)]
        breakout_candidates = [20]

    elif strategy in ["BREAKOUT_20", "NEW_HIGH_20", "FLOW_BREAKOUT", "GROWTH_BREAKOUT"]:
        ma_pairs = [(10, 30), (20, 60)]
        breakout_candidates = [20, 40, 60]

    elif strategy in ["WEEKLY_TREND", "FLOW_RISK_FILTER", "LOW_VOL_DIVIDEND", "DRAWDOWN_GUARD", "FOREIGN_SEASON_TREND"]:
        ma_pairs = [(20, 60), (30, 90), (40, 120)]
        breakout_candidates = [60]

    elif strategy in ["FLOW_SYNC_MA20", "TRUST_MA20", "TRUST_WINDOW_DRESSING"]:
        ma_pairs = [(10, 30), (20, 60)]
        breakout_candidates = [20, 60]

    else:
        ma_pairs = [(5, 20), (10, 30), (20, 60)]
        breakout_candidates = [20, 60]

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
# ============================================================
# V3 hotfix: relaxed institutional flow strategy signals
# Reason:
# In fast mode, one latest institutional flow record is reused
# across the backtest period. If flow is treated as a hard gate,
# flow strategies may produce zero trades. This override makes
# flow a soft filter unless the flow risk is clearly negative.
# ============================================================

try:
    _STRICT_FLOW_GET_SIGNALS = get_signals
except NameError:
    _STRICT_FLOW_GET_SIGNALS = None


def _flow_severe_risk(record) -> bool:
    return (
        has_flow(record)
        and (
            flow_score(record) <= 25
            or sync_foreign_trust_sell(
                record,
                max_foreign_lots=-500,
                max_trust_lots=-100,
            )
        )
    )


def _flow_soft_ok(record) -> bool:
    if not has_flow(record):
        return True

    return (
        flow_score(record) >= 35
        or foreign_lots(record) > 0
        or trust_lots(record) > 0
        or total_lots(record) > 0
    )


def _flow_buy_boost(record) -> bool:
    if not has_flow(record):
        return False

    return (
        flow_score(record) >= 60
        or foreign_lots(record) > 0
        or trust_lots(record) > 0
        or total_lots(record) > 500
    )


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
    price_dates=None,
    flow_context=None,
):
    strategy = canonical_strategy(strategy_name)

    flow_strategy_codes = {
        "FLOW_SYNC_MA20",
        "TRUST_MA20",
        "FOREIGN_RSI_REBOUND",
        "FLOW_BREAKOUT",
        "FLOW_RISK_FILTER",
        "FOREIGN_SEASON_TREND",
        "TRUST_WINDOW_DRESSING",
    }

    if strategy not in flow_strategy_codes:
        if _STRICT_FLOW_GET_SIGNALS is None:
            return False, False

        return _STRICT_FLOW_GET_SIGNALS(
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
            price_dates=price_dates,
            flow_context=flow_context,
        )

    close = closes[i]
    previous_close = closes[i - 1]

    ma20 = rolling_mean(closes, i, 20)
    prev_ma20 = rolling_mean(closes, i - 1, 20)
    ma60 = rolling_mean(closes, i, 60)

    high20 = rolling_high(closes, i, 20)

    rsi = calculate_rsi(closes, i)
    prev_rsi = calculate_rsi(closes, i - 1)

    flow_record = get_flow_record_for_index(
        i=i,
        price_dates=price_dates,
        flow_context=flow_context,
    )

    severe_risk = _flow_severe_risk(flow_record)
    soft_ok = _flow_soft_ok(flow_record)
    flow_boost = _flow_buy_boost(flow_record)

    trend_reclaim = (
        prev_ma20 is not None
        and ma20 is not None
        and previous_close <= prev_ma20
        and close > ma20
    )

    trend_hold = (
        ma20 is not None
        and close > ma20
        and (
            ma60 is None
            or ma20 >= ma60 * 0.98
        )
    )

    rsi_rebound = (
        prev_rsi is not None
        and rsi is not None
        and prev_rsi < 45
        and rsi >= 40
        and close > previous_close
    )

    breakout = high20 is not None and close > high20

    buy_signal = False
    sell_signal = False

    if strategy == "FLOW_SYNC_MA20":
        buy_signal = (
            shares == 0
            and not severe_risk
            and trend_hold
            and (
                trend_reclaim
                or flow_boost
                or close > previous_close
            )
        )

        sell_signal = (
            shares > 0
            and (
                severe_risk
                or (ma20 is not None and close < ma20)
            )
        )

    elif strategy == "TRUST_MA20":
        buy_signal = (
            shares == 0
            and not severe_risk
            and trend_hold
            and (
                trend_reclaim
                or flow_boost
                or soft_ok
            )
        )

        sell_signal = (
            shares > 0
            and (
                severe_risk
                or (
                    has_flow(flow_record)
                    and trust_lots(flow_record) < -300
                )
                or (ma20 is not None and close < ma20)
            )
        )

    elif strategy == "FOREIGN_RSI_REBOUND":
        buy_signal = (
            shares == 0
            and not severe_risk
            and (
                rsi_rebound
                or (
                    rsi is not None
                    and 35 <= rsi <= 60
                    and close > previous_close
                    and soft_ok
                )
            )
        )

        sell_signal = (
            shares > 0
            and (
                severe_risk
                or (
                    has_flow(flow_record)
                    and foreign_lots(flow_record) < -1000
                )
                or (rsi is not None and rsi > 72)
                or (ma20 is not None and close < ma20)
            )
        )

    elif strategy == "FLOW_BREAKOUT":
        buy_signal = (
            shares == 0
            and not severe_risk
            and (
                breakout
                or (
                    flow_boost
                    and trend_hold
                    and close > previous_close
                )
            )
        )

        sell_signal = (
            shares > 0
            and (
                severe_risk
                or (ma20 is not None and close < ma20)
            )
        )

    elif strategy == "FLOW_RISK_FILTER":
        buy_signal = (
            shares == 0
            and not severe_risk
            and ma20 is not None
            and ma60 is not None
            and close > ma20
            and ma20 >= ma60 * 0.98
        )

        sell_signal = (
            shares > 0
            and (
                severe_risk
                or (ma20 is not None and close < ma20)
                or (ma60 is not None and close < ma60)
            )
        )

    elif strategy == "FOREIGN_SEASON_TREND":
        buy_signal = (
            shares == 0
            and not severe_risk
            and ma60 is not None
            and close > ma60
            and (
                flow_boost
                or not has_flow(flow_record)
                or foreign_lots(flow_record) >= 0
            )
        )

        sell_signal = (
            shares > 0
            and (
                severe_risk
                or (
                    has_flow(flow_record)
                    and foreign_lots(flow_record) < -1000
                )
                or (ma60 is not None and close < ma60)
            )
        )

    elif strategy == "TRUST_WINDOW_DRESSING":
        buy_signal = (
            shares == 0
            and not severe_risk
            and trend_hold
            and (
                flow_boost
                or not has_flow(flow_record)
                or trust_lots(flow_record) >= 0
            )
        )

        sell_signal = (
            shares > 0
            and (
                severe_risk
                or (
                    has_flow(flow_record)
                    and trust_lots(flow_record) < -300
                )
                or (ma20 is not None and close < ma20)
            )
        )

    if stop_take_profit_signal(
        shares=shares,
        close=close,
        entry_price=entry_price,
        stop_loss_rate=stop_loss_rate,
        take_profit_rate=take_profit_rate,
    ):
        sell_signal = True

    return buy_signal, sell_signal