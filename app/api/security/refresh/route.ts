
const BACKEND_URL = process.env.API_BASE_URL || process.env.BACKEND_URL || "http://127.0.0.1:8000";
export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/security-master/refresh`);

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: data.detail || "刷新台股商品資料庫失敗" },
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