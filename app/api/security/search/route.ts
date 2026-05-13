
const BACKEND_URL = process.env.API_BASE_URL || process.env.BACKEND_URL || "http://127.0.0.1:8000";
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const limit = searchParams.get("limit") || "20";

    const response = await fetch(
      `${BACKEND_URL}/security/search?q=${encodeURIComponent(
        q
      )}&limit=${encodeURIComponent(limit)}`
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: data.detail || "搜尋台股商品失敗" },
        { status: response.status }
      );
    }

    return Response.json(data);
  } catch {
    return Response.json(
      { error: "無法連線到 Python FastAPI，請確認 port 8000 有啟動" },
      { status: 500 }
    );
  }
}