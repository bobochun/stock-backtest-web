import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.API_BASE_URL || process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/data-status`, {
      cache: "no-store",
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        overallStatus: "error",
        generatedAt: new Date().toISOString(),
        summary: {
          ok: 0,
          warn: 0,
          error: 1,
          total: 1,
        },
        checks: [
          {
            key: "frontend-proxy",
            title: "Next.js Proxy",
            status: "error",
            message:
              "無法連線到後端 data-status API，請確認 FastAPI port 8000 有啟動。",
            detail: {},
            latencyMs: 0,
          },
        ],
      },
      { status: 500 }
    );
  }
}
