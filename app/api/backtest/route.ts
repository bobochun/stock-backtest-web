export async function POST(request: Request) {
  try {
    const body = await request.json();

    const symbol = String(body.symbol || "").trim();
    const strategy = String(body.strategy || "MA20 / MA60 黃金交叉");
    const capital = Number(String(body.capital || "1000000").replaceAll(",", ""));

    if (!symbol) {
      return Response.json(
        { error: "請輸入股票代號，例如 2330" },
        { status: 400 }
      );
    }

    if (!capital || capital <= 0) {
      return Response.json(
        { error: "請輸入正確的初始資金，例如 1000000" },
        { status: 400 }
      );
    }

    const response = await fetch("http://127.0.0.1:8000/backtest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symbol,
        strategy,
        capital: capital.toString(),
        positionSize: body.positionSize || "20%",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: data.detail || "Python 回測 API 發生錯誤" },
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