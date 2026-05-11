import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { EquityPoint } from "../types";
import { formatMoney } from "../lib/fakeBacktest";

type EquityCurveChartProps = {
  equityCurve: EquityPoint[];
};

export default function EquityCurveChart({
  equityCurve,
}: EquityCurveChartProps) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">策略資金曲線</h2>
          <p className="mt-1 text-sm text-slate-500">
            比較策略績效與大盤基準走勢，由後端回測 API 產生。
          </p>
        </div>

        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          期末資金：
          <span className="font-bold text-slate-900">
            {formatMoney(equityCurve[equityCurve.length - 1].strategy)}
          </span>
        </div>
      </div>

      <div className="mt-6 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={equityCurve}
            margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis
              tickFormatter={(value) =>
                `${Math.round(Number(value) / 10000)}萬`
              }
            />
            <Tooltip
              formatter={(value) => formatMoney(Number(value))}
              labelFormatter={(label) => `期間：${label}`}
            />
            <Line
              type="monotone"
              dataKey="strategy"
              name="策略資金"
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="benchmark"
              name="大盤基準"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}