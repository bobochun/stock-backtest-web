
const BACKEND_URL = process.env.API_BASE_URL || process.env.BACKEND_URL || "http://127.0.0.1:8000";
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/compare`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: data.detail || "Python 策略比較 API 發生錯誤" },
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