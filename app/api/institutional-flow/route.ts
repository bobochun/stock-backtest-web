import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type TwseRawResponse = {
  stat?: string;
  date?: string;
  title?: string;
  fields?: string[];
  data?: string[][];
  notes?: string[];
};

type FlowRecord = {
  symbol: string;
  name: string;
  market: "TWSE";
  date: string;
  foreignNetLots: number;
  trustNetLots: number;
  dealerNetLots: number;
  totalNetLots: number;
  score: number;
  signal: string;
  strategies: string[];
  reason: string;
};

function parseNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;

  const cleaned = value
    .replaceAll(",", "")
    .replaceAll("--", "0")
    .replaceAll("—", "0")
    .replaceAll(" ", "")
    .trim();

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSymbol(value: string) {
  return value.trim().replace(".TW", "").replace(".TWO", "");
}

function formatDateToTwse(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function formatInputDate(value?: string) {
  if (!value) return formatDateToTwse(new Date());

  const cleaned = value.replaceAll("-", "").trim();

  if (/^\d{8}$/.test(cleaned)) return cleaned;

  return formatDateToTwse(new Date());
}

function subtractDays(dateText: string, days: number) {
  const yyyy = Number(dateText.slice(0, 4));
  const mm = Number(dateText.slice(4, 6));
  const dd = Number(dateText.slice(6, 8));

  const date = new Date(yyyy, mm - 1, dd);
  date.setDate(date.getDate() - days);

  return formatDateToTwse(date);
}

function findIndex(fields: string[], candidates: string[]) {
  return fields.findIndex((field) =>
    candidates.some((candidate) => field.includes(candidate))
  );
}

function pickValue(row: string[], index: number) {
  if (index < 0) return 0;
  return parseNumber(row[index]);
}

function scoreRecord(base: {
  foreignNetLots: number;
  trustNetLots: number;
  dealerNetLots: number;
  totalNetLots: number;
}) {
  const strategies: string[] = [];
  const reasons: string[] = [];

  let score = 0;

  if (base.foreignNetLots > 1000) {
    score += 25;
    strategies.push("外資買超動能");
    reasons.push(`外資買超 ${Math.round(base.foreignNetLots).toLocaleString()} 張`);
  }

  if (base.trustNetLots > 300) {
    score += 30;
    strategies.push("投信買超動能");
    reasons.push(`投信買超 ${Math.round(base.trustNetLots).toLocaleString()} 張`);
  }

  if (base.foreignNetLots > 1000 && base.trustNetLots > 300) {
    score += 30;
    strategies.push("外資投信同步買超");
    reasons.push("外資與投信同向買超，籌碼方向一致");
  }

  if (base.totalNetLots > 1500) {
    score += 10;
    strategies.push("三大法人合計買超");
    reasons.push(`三大法人合計買超 ${Math.round(base.totalNetLots).toLocaleString()} 張`);
  }

  if (base.dealerNetLots > 300) {
    score += 5;
    strategies.push("自營商偏多");
    reasons.push(`自營商買超 ${Math.round(base.dealerNetLots).toLocaleString()} 張`);
  }

  if (base.foreignNetLots < -1000 && base.trustNetLots < -300) {
    score -= 40;
    strategies.push("法人同步賣超風險");
    reasons.push("外資與投信同步賣超，短線需控管風險");
  }

  if (base.foreignNetLots < -2000) {
    score -= 20;
    strategies.push("外資賣壓警示");
    reasons.push(`外資賣超 ${Math.abs(Math.round(base.foreignNetLots)).toLocaleString()} 張`);
  }

  if (base.trustNetLots < -500) {
    score -= 20;
    strategies.push("投信調節警示");
    reasons.push(`投信賣超 ${Math.abs(Math.round(base.trustNetLots)).toLocaleString()} 張`);
  }

  score = Math.max(0, Math.min(100, score));

  let signal = "觀察";

  if (score >= 80) {
    signal = "強勢買盤";
  } else if (score >= 60) {
    signal = "偏多觀察";
  } else if (score >= 40) {
    signal = "中性偏多";
  } else if (score <= 20) {
    signal = "籌碼偏弱";
  }

  return {
    score,
    signal,
    strategies: Array.from(new Set(strategies)),
    reason: reasons.length > 0 ? reasons.join("；") : "法人買賣超訊號不明顯，先列入觀察。",
  };
}

async function fetchTwseT86(dateText: string) {
  const url = `https://www.twse.com.tw/rwd/zh/fund/T86?date=${dateText}&selectType=ALLBUT0999&response=json&_=${Date.now()}`;

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 stock-backtest-web",
      Accept: "application/json,text/plain,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`TWSE request failed: ${response.status}`);
  }

  const data = (await response.json()) as TwseRawResponse;

  if (!Array.isArray(data.fields) || !Array.isArray(data.data)) {
    throw new Error("TWSE response format invalid");
  }

  if (data.data.length === 0) {
    throw new Error("TWSE no data for this date");
  }

  return data;
}

async function fetchLatestAvailableTwse(startDate: string, lookbackDays: number) {
  const safeLookback = Math.max(0, Math.min(14, lookbackDays));

  let lastError = "";

  for (let i = 0; i <= safeLookback; i++) {
    const dateText = subtractDays(startDate, i);

    try {
      const data = await fetchTwseT86(dateText);

      return {
        dateText,
        data,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "unknown error";
    }
  }

  throw new Error(`找不到最近 ${safeLookback + 1} 天的 TWSE 三大法人資料：${lastError}`);
}

function parseTwseRows(data: TwseRawResponse, dateText: string): FlowRecord[] {
  const fields = data.fields || [];
  const rows = data.data || [];

  const symbolIndex = findIndex(fields, ["證券代號"]);
  const nameIndex = findIndex(fields, ["證券名稱"]);

  const foreignNetIndex = findIndex(fields, [
    "外陸資買賣超股數",
    "外資買賣超股數",
    "外資及陸資買賣超股數",
  ]);

  const trustNetIndex = findIndex(fields, ["投信買賣超股數"]);

  const dealerTotalIndex = findIndex(fields, ["自營商買賣超股數"]);
  const dealerSelfIndex = findIndex(fields, ["自營商買賣超股數(自行買賣)"]);
  const dealerHedgeIndex = findIndex(fields, ["自營商買賣超股數(避險)"]);

  const parsed = rows
    .map((row): FlowRecord | null => {
      const symbol = symbolIndex >= 0 ? String(row[symbolIndex] || "").trim() : "";
      const name = nameIndex >= 0 ? String(row[nameIndex] || "").trim() : "";

      if (!symbol || !/^\d{4,6}$/.test(symbol)) return null;

      const foreignNetShares = pickValue(row, foreignNetIndex);
      const trustNetShares = pickValue(row, trustNetIndex);

      let dealerNetShares = pickValue(row, dealerTotalIndex);

      if (dealerNetShares === 0 && (dealerSelfIndex >= 0 || dealerHedgeIndex >= 0)) {
        dealerNetShares = pickValue(row, dealerSelfIndex) + pickValue(row, dealerHedgeIndex);
      }

      const foreignNetLots = foreignNetShares / 1000;
      const trustNetLots = trustNetShares / 1000;
      const dealerNetLots = dealerNetShares / 1000;
      const totalNetLots = foreignNetLots + trustNetLots + dealerNetLots;

      const base = {
        symbol,
        name,
        market: "TWSE" as const,
        date: dateText,
        foreignNetLots,
        trustNetLots,
        dealerNetLots,
        totalNetLots,
      };

      const score = scoreRecord(base);

      return {
        ...base,
        ...score,
      };
    })
    .filter(Boolean) as FlowRecord[];

  return parsed;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const symbolsText = String(body.symbols || "");
    const dateText = formatInputDate(String(body.date || ""));
    const lookbackDays = Number(body.lookbackDays || 7);

    const symbols = symbolsText
      .replaceAll("，", ",")
      .split(",")
      .map((item) => normalizeSymbol(item))
      .filter(Boolean);

    const { dateText: usedDate, data } = await fetchLatestAvailableTwse(
      dateText,
      lookbackDays
    );

    let records = parseTwseRows(data, usedDate);

    if (symbols.length > 0) {
      const symbolSet = new Set(symbols);
      records = records.filter((record) => symbolSet.has(record.symbol));
    }

    records = records.sort(
      (a, b) => b.score - a.score || b.totalNetLots - a.totalNetLots
    );

    return NextResponse.json({
      ok: true,
      source: "TWSE T86 三大法人買賣超日報",
      market: "TWSE",
      requestedDate: dateText,
      usedDate,
      count: records.length,
      records,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "無法取得法人買賣超資料",
      },
      { status: 500 }
    );
  }
}