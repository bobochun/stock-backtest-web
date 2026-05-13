import StockCockpit from "../../components/stock-cockpit/StockCockpit";

export const metadata = {
  title: "Stock Cockpit | 單股研究駕駛艙",
  description: "單股回測、法人籌碼、交易計畫、部位控管與研究筆記",
};

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;

  return <StockCockpit initialSymbol={decodeURIComponent(symbol)} />;
}