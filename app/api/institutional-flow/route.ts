import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/institutional-flow/latest-v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symbols: body.symbols || "2330, 2454, 2317",
        date: body.date || "",
        lookbackDays: body.lookbackDays || 5,
        accumulationDays: body.accumulationDays || 5,
      }),
      cache: "no-store",
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "無法連線到後端 institutional-flow latest-v2 API，請確認 FastAPI port 8000 有啟動。",
      },
      { status: 500 }
    );
  }
}