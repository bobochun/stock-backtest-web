"use client";

import type { ReactNode } from "react";

type BacktestFormProps = {
  symbol: string;
  watchlistSymbols: string;
  strategy: string;
  capital: string;
  positionSize: string;
  stopLoss: string;
  takeProfit: string;
  startDate: string;
  endDate: string;

  isLoading: boolean;
  isComparing: boolean;
  isScanning: boolean;
  isOptimizing: boolean;

  setSymbol: (value: string) => void;
  setWatchlistSymbols: (value: string) => void;
  setStrategy: (value: string) => void;
  setCapital: (value: string) => void;
  setPositionSize: (value: string) => void;
  setStopLoss: (value: string) => void;
  setTakeProfit: (value: string) => void;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;

  runBacktest: () => void;
  compareStrategies: () => void;
  scanWatchlist: () => void;
  optimizeParameters: () => void;
};

type StrategyGroup =
  | "趨勢動能"
  | "均值回歸"
  | "法人籌碼"
  | "ETF / 長期配置"
  | "價值 / 殖利率"
  | "風險控管";

type StrategyOption = {
  value: string;
  label: string;
  group: StrategyGroup;
  description: string;
  bestFor: string;
  riskNote: string;
  flowLinked?: boolean;
  profile: {
    momentum: number;
    stability: number;
    risk: number;
    chip: number;
    curve: number[];
  };
};

const GROUP_ORDER: StrategyGroup[] = [
  "趨勢動能",
  "均值回歸",
  "法人籌碼",
  "ETF / 長期配置",
  "價值 / 殖利率",
  "風險控管",
];

const STRATEGY_OPTIONS: StrategyOption[] = [
  {
    value: "MA20 / MA60 黃金交叉",
    label: "MA20 / MA60 黃金交叉",
    group: "趨勢動能",
    description:
      "短均線向上突破長均線，代表中期趨勢可能轉強。適合趨勢股與大盤多頭段。",
    bestFor: "中期波段、權值股、ETF",
    riskNote: "盤整盤容易頻繁假突破，需要搭配停損或量能過濾。",
    profile: {
      momentum: 78,
      stability: 70,
      risk: 48,
      chip: 35,
      curve: [35, 39, 42, 45, 51, 48, 57, 64, 68, 73, 79, 84],
    },
  },
  {
    value: "MA5 / MA20 短線轉強",
    label: "MA5 / MA20 短線轉強",
    group: "趨勢動能",
    description:
      "用短均線快速捕捉股價轉強，適合短線動能股與題材剛啟動的股票。",
    bestFor: "短線交易、題材股、成交量放大股",
    riskNote: "訊號較敏感，停損要嚴格，避免來回洗價。",
    profile: {
      momentum: 88,
      stability: 45,
      risk: 72,
      chip: 40,
      curve: [34, 42, 39, 55, 49, 66, 60, 76, 69, 84, 79, 91],
    },
  },
  {
    value: "突破整理區策略",
    label: "突破整理區策略",
    group: "趨勢動能",
    description:
      "股價突破近期盤整區間，搭配成交量放大，代表可能進入新的趨勢段。",
    bestFor: "箱型突破、AI 概念股、強勢股",
    riskNote: "假突破常見，最好搭配量能、法人買超或回測不破確認。",
    profile: {
      momentum: 92,
      stability: 52,
      risk: 68,
      chip: 50,
      curve: [30, 34, 38, 41, 58, 54, 62, 71, 67, 82, 89, 96],
    },
  },
  {
    value: "創 20 日新高動能策略",
    label: "創 20 日新高動能策略",
    group: "趨勢動能",
    description:
      "股價創近期新高，代表市場願意用更高價格買進，適合追蹤強者恆強標的。",
    bestFor: "強勢股、主流題材、成交量擴張",
    riskNote: "容易追高，建議搭配移動停損或分批進場。",
    profile: {
      momentum: 95,
      stability: 48,
      risk: 75,
      chip: 42,
      curve: [28, 36, 43, 39, 61, 58, 70, 66, 82, 76, 90, 98],
    },
  },
  {
    value: "週線多頭排列策略",
    label: "週線多頭排列策略",
    group: "趨勢動能",
    description:
      "用週線判斷中長期趨勢，只在大方向偏多時進場，降低短線雜訊。",
    bestFor: "中長線、波段投資、低頻交易",
    riskNote: "進場較慢，可能錯過早期漲幅，但穩定性較高。",
    profile: {
      momentum: 70,
      stability: 82,
      risk: 38,
      chip: 30,
      curve: [40, 42, 45, 49, 52, 55, 59, 63, 66, 70, 74, 78],
    },
  },

  {
    value: "RSI 低檔反彈策略",
    label: "RSI 低檔反彈策略",
    group: "均值回歸",
    description:
      "股價短線過度修正後，等待 RSI 從低檔轉強，抓反彈與支撐區機會。",
    bestFor: "回檔反彈、ETF 低接、非崩跌型修正",
    riskNote: "弱勢股可能越跌越低，必須搭配趨勢過濾或停損。",
    profile: {
      momentum: 50,
      stability: 60,
      risk: 58,
      chip: 25,
      curve: [42, 38, 35, 44, 49, 46, 55, 53, 61, 59, 68, 72],
    },
  },
  {
    value: "布林通道下緣反彈",
    label: "布林通道下緣反彈",
    group: "均值回歸",
    description:
      "價格接近布林通道下緣，等待止跌或收回通道內，適合短線反彈與區間盤。",
    bestFor: "區間震盪、ETF、金融股",
    riskNote: "趨勢空頭時下緣可能一路下移，不適合無腦攤平。",
    profile: {
      momentum: 42,
      stability: 64,
      risk: 54,
      chip: 22,
      curve: [50, 42, 38, 45, 51, 48, 54, 58, 56, 64, 62, 70],
    },
  },
  {
    value: "KD 低檔黃金交叉",
    label: "KD 低檔黃金交叉",
    group: "均值回歸",
    description:
      "KD 指標在低檔黃金交叉，代表短線賣壓可能趨緩，適合搭配支撐區。",
    bestFor: "短線反彈、回測支撐、區間整理",
    riskNote: "訊號頻繁，建議與成交量或均線方向搭配。",
    profile: {
      momentum: 55,
      stability: 52,
      risk: 61,
      chip: 20,
      curve: [44, 39, 46, 42, 53, 50, 58, 55, 63, 60, 69, 73],
    },
  },
  {
    value: "跌深乖離率修復策略",
    label: "跌深乖離率修復策略",
    group: "均值回歸",
    description:
      "當股價明顯低於均線，等待跌深反彈。適合觀察恐慌賣壓後的短線修復。",
    bestFor: "跌深反彈、短線交易、非基本面惡化股",
    riskNote: "不能用在基本面轉壞或法人連續倒貨的股票。",
    profile: {
      momentum: 48,
      stability: 42,
      risk: 76,
      chip: 24,
      curve: [55, 42, 31, 36, 48, 43, 58, 51, 65, 57, 70, 76],
    },
  },

  {
    value: "外資投信同步買超 + MA20 趨勢過濾",
    label: "外資投信同步買超 + MA20 趨勢過濾",
    group: "法人籌碼",
    description:
      "外資與投信同向買超時，只挑股價維持在 MA20 上方的標的，讓籌碼與技術面方向一致。",
    bestFor: "法人主導股、權值股、波段交易",
    riskNote: "若股價已大漲乖離過大，不適合追高，需等待回測。",
    flowLinked: true,
    profile: {
      momentum: 86,
      stability: 74,
      risk: 52,
      chip: 96,
      curve: [36, 39, 45, 52, 58, 56, 66, 72, 78, 82, 88, 93],
    },
  },
  {
    value: "投信連買動能 + 月線防守",
    label: "投信連買動能 + 月線防守",
    group: "法人籌碼",
    description:
      "投信通常偏中期配置，投信買超動能出現時，以月線作為防守觀察波段行情。",
    bestFor: "中小型股、投信作帳股、波段追蹤",
    riskNote: "投信轉賣時常會快速修正，需要觀察連買是否中斷。",
    flowLinked: true,
    profile: {
      momentum: 82,
      stability: 68,
      risk: 58,
      chip: 92,
      curve: [34, 38, 43, 50, 57, 64, 62, 70, 76, 81, 86, 89],
    },
  },
  {
    value: "外資回補反彈 + RSI 低檔轉強",
    label: "外資回補反彈 + RSI 低檔轉強",
    group: "法人籌碼",
    description:
      "外資由賣轉買或大幅回補，搭配 RSI 低檔轉強，觀察權值股反彈機會。",
    bestFor: "大型電子、半導體、金融權值股",
    riskNote: "若只是單日回補但趨勢仍弱，容易反彈失敗。",
    flowLinked: true,
    profile: {
      momentum: 76,
      stability: 55,
      risk: 62,
      chip: 88,
      curve: [46, 38, 35, 44, 49, 57, 54, 66, 63, 75, 72, 82],
    },
  },
  {
    value: "三大法人合計買超 + 突破整理",
    label: "三大法人合計買超 + 突破整理",
    group: "法人籌碼",
    description:
      "三大法人合計買超，且股價突破整理區，代表籌碼與技術面同時轉強。",
    bestFor: "突破股、法人同步布局股、題材主流股",
    riskNote: "若突破當天爆大量長上影，需小心短線出貨。",
    flowLinked: true,
    profile: {
      momentum: 90,
      stability: 62,
      risk: 64,
      chip: 90,
      curve: [32, 36, 41, 47, 60, 58, 69, 75, 72, 86, 90, 97],
    },
  },
  {
    value: "外資投信同步賣超風險過濾",
    label: "外資投信同步賣超風險過濾",
    group: "法人籌碼",
    description:
      "當外資與投信同步賣超時，即使技術線型尚可，也降低進場權重或避免追價。",
    bestFor: "風險控管、避免追高、盤勢轉弱過濾",
    riskNote: "這是過濾條件，不一定是單獨買進策略。",
    flowLinked: true,
    profile: {
      momentum: 35,
      stability: 78,
      risk: 30,
      chip: 94,
      curve: [60, 61, 59, 62, 63, 64, 66, 65, 68, 69, 71, 72],
    },
  },
  {
    value: "外資連買 3 日 + 價格站上季線",
    label: "外資連買 3 日 + 價格站上季線",
    group: "法人籌碼",
    description:
      "外資連續買超，且股價站上季線，代表中期資金可能重新回流。",
    bestFor: "權值股、景氣循環股、半導體",
    riskNote: "第一版選單先支援，後端連買天數需要下一步正式接資料。",
    flowLinked: true,
    profile: {
      momentum: 80,
      stability: 72,
      risk: 48,
      chip: 91,
      curve: [38, 41, 44, 50, 55, 60, 66, 68, 73, 79, 83, 87],
    },
  },
  {
    value: "投信作帳季策略",
    label: "投信作帳季策略",
    group: "法人籌碼",
    description:
      "季底或年底觀察投信持續買超且股價維持強勢的標的，適合做中短期波段研究。",
    bestFor: "投信認養股、季底作帳行情",
    riskNote: "題材結束或投信轉賣時容易快速回檔。",
    flowLinked: true,
    profile: {
      momentum: 84,
      stability: 56,
      risk: 70,
      chip: 95,
      curve: [31, 37, 42, 48, 61, 68, 64, 77, 70, 83, 80, 88],
    },
  },

  {
    value: "Buy and Hold 長期持有",
    label: "Buy and Hold 長期持有",
    group: "ETF / 長期配置",
    description:
      "買進後長期持有，用來當基準組，確認主動策略是否真的有超額報酬。",
    bestFor: "長期投資、基準比較、核心部位",
    riskNote: "遇到長期空頭時回撤可能很大，但交易成本最低。",
    profile: {
      momentum: 45,
      stability: 78,
      risk: 40,
      chip: 10,
      curve: [40, 41, 43, 45, 48, 50, 53, 55, 58, 60, 63, 66],
    },
  },
  {
    value: "ETF 定期定額策略",
    label: "ETF 定期定額策略",
    group: "ETF / 長期配置",
    description:
      "固定時間投入固定金額，適合 0050、006208、00878 等 ETF，降低擇時壓力。",
    bestFor: "長期資產累積、薪資投資、核心 ETF",
    riskNote: "長期需要紀律，短線績效不一定漂亮。",
    profile: {
      momentum: 38,
      stability: 88,
      risk: 28,
      chip: 5,
      curve: [38, 39, 41, 43, 45, 48, 50, 53, 56, 59, 62, 66],
    },
  },
  {
    value: "ETF 回檔分批加碼",
    label: "ETF 回檔分批加碼",
    group: "ETF / 長期配置",
    description:
      "ETF 回檔到重要均線或跌幅達條件時分批加碼，結合長期配置與低接邏輯。",
    bestFor: "0050、006208、市值型 ETF",
    riskNote: "如果大盤進入長空，分批加碼仍會有長時間浮虧。",
    profile: {
      momentum: 42,
      stability: 82,
      risk: 36,
      chip: 8,
      curve: [43, 40, 39, 44, 47, 51, 53, 57, 59, 63, 66, 70],
    },
  },
  {
    value: "股債平衡再平衡策略",
    label: "股債平衡再平衡策略",
    group: "ETF / 長期配置",
    description:
      "設定股債比例，定期再平衡，降低單一資產大幅波動帶來的風險。",
    bestFor: "穩健型資產配置、退休投資",
    riskNote: "上漲行情可能輸給純股票，但回撤通常較低。",
    profile: {
      momentum: 30,
      stability: 92,
      risk: 22,
      chip: 3,
      curve: [40, 41, 42, 44, 45, 47, 49, 51, 53, 55, 57, 59],
    },
  },

  {
    value: "高殖利率低波動策略",
    label: "高殖利率低波動策略",
    group: "價值 / 殖利率",
    description:
      "挑選殖利率相對較高且價格波動較低的標的，適合偏防守配置。",
    bestFor: "金融股、高股息 ETF、防守型投資",
    riskNote: "高殖利率不等於安全，需注意除息後填息能力與基本面。",
    profile: {
      momentum: 35,
      stability: 80,
      risk: 32,
      chip: 18,
      curve: [42, 43, 44, 46, 47, 49, 52, 53, 55, 58, 60, 62],
    },
  },
  {
    value: "營收創高成長策略",
    label: "營收創高成長策略",
    group: "價值 / 殖利率",
    description:
      "觀察營收創高或年增率改善的公司，搭配股價轉強，尋找基本面成長股。",
    bestFor: "成長股、電子股、景氣復甦股",
    riskNote: "基本面資料需要額外接資料源，目前選單先支援策略分類。",
    profile: {
      momentum: 78,
      stability: 60,
      risk: 58,
      chip: 35,
      curve: [35, 39, 44, 48, 54, 61, 58, 67, 74, 80, 86, 92],
    },
  },
  {
    value: "低本益比轉強策略",
    label: "低本益比轉強策略",
    group: "價值 / 殖利率",
    description:
      "從估值偏低的股票中，挑選技術面開始轉強者，尋找價值修復機會。",
    bestFor: "價值股、景氣循環股、低基期股",
    riskNote: "低估值可能是基本面惡化，需要避開價值陷阱。",
    profile: {
      momentum: 58,
      stability: 68,
      risk: 45,
      chip: 25,
      curve: [38, 37, 40, 43, 47, 50, 52, 56, 61, 65, 69, 73],
    },
  },

  {
    value: "移動停損保護策略",
    label: "移動停損保護策略",
    group: "風險控管",
    description:
      "股價上漲後逐步提高停損位置，保護既有獲利，避免獲利回吐。",
    bestFor: "波段交易、強勢股續抱",
    riskNote: "停損設太近容易被洗出場，設太遠又保護不足。",
    profile: {
      momentum: 62,
      stability: 78,
      risk: 34,
      chip: 20,
      curve: [40, 44, 46, 51, 55, 58, 62, 65, 69, 72, 75, 78],
    },
  },
  {
    value: "最大回撤限制策略",
    label: "最大回撤限制策略",
    group: "風險控管",
    description:
      "當策略或投組回撤超過上限時降低部位，避免單一策略失控。",
    bestFor: "資金控管、多人策略組合、保守投資",
    riskNote: "可能在反彈前先被迫降低部位，但能避免災難性虧損。",
    profile: {
      momentum: 32,
      stability: 90,
      risk: 18,
      chip: 10,
      curve: [40, 41, 43, 42, 45, 47, 49, 50, 53, 55, 56, 58],
    },
  },
];

function getSelectedStrategy(strategy: string) {
  return (
    STRATEGY_OPTIONS.find((item) => item.value === strategy) ||
    STRATEGY_OPTIONS.find((item) => item.value === "MA20 / MA60 黃金交叉") ||
    STRATEGY_OPTIONS[0]
  );
}

function getFlowLabHref(symbol: string, watchlistSymbols: string) {
  const text = symbol.trim() || watchlistSymbols.trim();

  if (!text) return "/flow-lab";

  return `/flow-lab?symbols=${encodeURIComponent(text)}`;
}

function makeSvgPath(values: number[], width = 420, height = 150) {
  if (values.length === 0) return "";

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function toneClass(value: number, inverse = false) {
  const score = inverse ? 100 - value : value;

  if (score >= 75) return "bg-red-500";
  if (score >= 55) return "bg-amber-400";
  return "bg-sky-400";
}

export default function BacktestForm({
  symbol,
  watchlistSymbols,
  strategy,
  capital,
  positionSize,
  stopLoss,
  takeProfit,
  startDate,
  endDate,

  isLoading,
  isComparing,
  isScanning,
  isOptimizing,

  setSymbol,
  setWatchlistSymbols,
  setStrategy,
  setCapital,
  setPositionSize,
  setStopLoss,
  setTakeProfit,
  setStartDate,
  setEndDate,

  runBacktest,
  compareStrategies,
  scanWatchlist,
  optimizeParameters,
}: BacktestFormProps) {
  const selectedStrategy = getSelectedStrategy(strategy);
  const anyLoading = isLoading || isComparing || isScanning || isOptimizing;
  const flowHref = getFlowLabHref(symbol, watchlistSymbols);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-bold text-blue-600">STRATEGY BUILDER</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">
            策略選擇與回測參數
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            這版新增更多策略分類，並加入策略視覺化線圖。選到法人籌碼策略時，可以直接連到法人籌碼實驗室檢查外資與投信買賣超。
          </p>
        </div>

        <a
          href={flowHref}
          className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100"
        >
          法人籌碼實驗室 →
        </a>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickStrategyCard
          title="趨勢動能"
          description="MA、突破、新高策略"
          onClick={() => setStrategy("突破整理區策略")}
        />
        <QuickStrategyCard
          title="均值回歸"
          description="RSI、KD、布林反彈"
          onClick={() => setStrategy("RSI 低檔反彈策略")}
        />
        <QuickStrategyCard
          title="法人籌碼"
          description="外資、投信、三大法人"
          onClick={() => setStrategy("外資投信同步買超 + MA20 趨勢過濾")}
        />
        <QuickStrategyCard
          title="ETF 長期配置"
          description="定期定額、再平衡"
          onClick={() => setStrategy("ETF 定期定額策略")}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="股票代號">
              <input
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                placeholder="例如 2330"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </Field>

            <Field label="策略選單">
              <select
                value={strategy}
                onChange={(event) => setStrategy(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                {GROUP_ORDER.map((group) => (
                  <optgroup key={group} label={group}>
                    {STRATEGY_OPTIONS.filter((item) => item.group === group).map(
                      (item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      )
                    )}
                  </optgroup>
                ))}
              </select>
            </Field>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black text-slate-900">
                    {selectedStrategy.label}
                  </h3>

                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
                    {selectedStrategy.group}
                  </span>

                  {selectedStrategy.flowLinked && (
                    <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                      外資 / 投信連動
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {selectedStrategy.description}
                </p>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <InfoPill label="適合" value={selectedStrategy.bestFor} />
                  <InfoPill label="風險" value={selectedStrategy.riskNote} />
                </div>
              </div>

              {selectedStrategy.flowLinked && (
                <a
                  href={flowHref}
                  className="shrink-0 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
                >
                  檢查法人籌碼
                </a>
              )}
            </div>
          </div>

          <Field label="觀察清單">
            <textarea
              value={watchlistSymbols}
              onChange={(event) => setWatchlistSymbols(event.target.value)}
              placeholder="例如 2330, 2454, 2317, 2382, 0050"
              className="h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="初始資金">
              <input
                value={capital}
                onChange={(event) => setCapital(event.target.value)}
                placeholder="例如 1000000"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </Field>

            <Field label="單檔部位比例">
              <input
                value={positionSize}
                onChange={(event) => setPositionSize(event.target.value)}
                placeholder="例如 20%"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </Field>

            <Field label="停損">
              <input
                value={stopLoss}
                onChange={(event) => setStopLoss(event.target.value)}
                placeholder="例如 8%"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </Field>

            <Field label="停利">
              <input
                value={takeProfit}
                onChange={(event) => setTakeProfit(event.target.value)}
                placeholder="例如 15%"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </Field>

            <Field label="開始日期">
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </Field>

            <Field label="結束日期">
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </Field>
          </div>
        </div>

        <StrategyVisualPanel strategy={selectedStrategy} />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ActionButton
          label={isLoading ? "回測中..." : "執行單股回測"}
          onClick={runBacktest}
          disabled={anyLoading}
          primary
        />
        <ActionButton
          label={isComparing ? "比較中..." : "策略比較"}
          onClick={compareStrategies}
          disabled={anyLoading}
        />
        <ActionButton
          label={isScanning ? "掃描中..." : "掃描觀察清單"}
          onClick={scanWatchlist}
          disabled={anyLoading}
        />
        <ActionButton
          label={isOptimizing ? "最佳化中..." : "參數最佳化"}
          onClick={optimizeParameters}
          disabled={anyLoading}
        />
      </div>

      <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="font-black text-slate-900">目前策略庫</h3>
            <p className="mt-1 text-sm text-slate-500">
              共 {STRATEGY_OPTIONS.length} 種策略，包含趨勢、回歸、法人籌碼、ETF、價值與風控。
            </p>
          </div>

          <div className="text-sm font-bold text-slate-600">
            法人連動策略：
            {STRATEGY_OPTIONS.filter((item) => item.flowLinked).length} 種
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {GROUP_ORDER.map((group) => {
            const count = STRATEGY_OPTIONS.filter(
              (item) => item.group === group
            ).length;

            return (
              <div
                key={group}
                className="rounded-2xl border border-slate-200 bg-white p-3"
              >
                <p className="text-sm font-black text-slate-900">{group}</p>
                <p className="mt-1 text-xs text-slate-500">{count} 種策略</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StrategyVisualPanel({ strategy }: { strategy: StrategyOption }) {
  const path = makeSvgPath(strategy.profile.curve);

  return (
    <aside className="rounded-[2rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-400">STRATEGY PROFILE</p>
          <h3 className="mt-1 text-xl font-black">{strategy.label}</h3>
        </div>

        <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">
          {strategy.group}
        </div>
      </div>

      <div className="mt-5 rounded-3xl bg-white/10 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-300">模擬策略線圖</p>
          <p className="text-xs text-slate-400">Visual only</p>
        </div>

        <svg viewBox="0 0 420 150" className="h-48 w-full overflow-visible">
          <defs>
            <linearGradient id="strategyLine" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="60%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#fb7185" />
            </linearGradient>
            <linearGradient id="strategyArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path
            d={`${path} L 420 150 L 0 150 Z`}
            fill="url(#strategyArea)"
            opacity="0.8"
          />
          <path
            d={path}
            fill="none"
            stroke="url(#strategyLine)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {strategy.profile.curve.map((value, index) => {
            const x =
              (index / Math.max(strategy.profile.curve.length - 1, 1)) * 420;
            const min = Math.min(...strategy.profile.curve);
            const max = Math.max(...strategy.profile.curve);
            const range = max - min || 1;
            const y = 150 - ((value - min) / range) * 150;

            if (index % 3 !== 0 && index !== strategy.profile.curve.length - 1) {
              return null;
            }

            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill="#ffffff"
                opacity="0.9"
              />
            );
          })}
        </svg>
      </div>

      <div className="mt-5 grid gap-3">
        <ProfileBar label="動能強度" value={strategy.profile.momentum} />
        <ProfileBar label="穩定度" value={strategy.profile.stability} />
        <ProfileBar label="風險程度" value={strategy.profile.risk} inverse />
        <ProfileBar label="籌碼依賴" value={strategy.profile.chip} />
      </div>

      <div className="mt-5 rounded-3xl border border-white/10 bg-white/10 p-4">
        <p className="text-xs font-bold text-slate-300">策略判讀</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          {strategy.bestFor}
        </p>
        <p className="mt-3 text-xs leading-5 text-slate-400">
          {strategy.riskNote}
        </p>
      </div>

      {strategy.flowLinked && (
        <div className="mt-4 rounded-3xl border border-red-400/20 bg-red-400/10 p-4">
          <p className="text-sm font-black text-red-200">法人籌碼連動策略</p>
          <p className="mt-2 text-xs leading-5 text-red-100">
            這類策略建議先到 /flow-lab 確認外資、投信、自營商買賣超，再回來跑技術回測。
          </p>
        </div>
      )}
    </aside>
  );
}

function ProfileBar({
  label,
  value,
  inverse,
}: {
  label: string;
  value: number;
  inverse?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-bold text-white">{value}</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${toneClass(value, inverse)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-sm leading-5 text-slate-700">{value}</p>
    </div>
  );
}

function QuickStrategyCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:shadow-md"
    >
      <p className="text-sm font-black text-slate-900">{title}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </button>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  primary,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl px-5 py-3 text-sm font-bold transition disabled:opacity-60 ${
        primary
          ? "bg-slate-900 text-white hover:-translate-y-0.5 hover:bg-slate-700"
          : "border border-slate-300 bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}