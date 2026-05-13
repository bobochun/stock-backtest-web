import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.API_BASE_URL || process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = String(searchParams.get("symbol") || "").trim();

    if (!symbol) {
      return NextResponse.json(
        {
          error: "請輸入股票代號",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${BACKEND_URL}/quote/${encodeURIComponent(symbol)}`,
      {
        cache: "no-store",
      }
    );

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        error: "無法連線到後端 quote API，請確認 FastAPI port 8000 有啟動",
      },
      { status: 500 }
    );
  }
}