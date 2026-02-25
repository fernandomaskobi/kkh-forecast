"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { MONTHS, formatCurrency, formatPct, type MetricKey } from "@/lib/constants";

type ChartEntry = {
  year: number;
  month: number;
  grossBookedSales: number;
  gmPercent: number;
  cpPercent: number;
};

type ForecastChartProps = {
  entries: ChartEntry[];
  metric: MetricKey;
  title: string;
};

function calcMetric(e: ChartEntry, metric: MetricKey): number {
  switch (metric) {
    case "grossBookedSales": return e.grossBookedSales;
    case "gmDollars": return e.grossBookedSales * e.gmPercent;
    case "gmPercent": return e.gmPercent;
    case "cpDollars": return e.grossBookedSales * e.cpPercent;
    case "cpPercent": return e.cpPercent;
    default: return e.grossBookedSales;
  }
}

export default function ForecastChart({ entries, metric, title }: ForecastChartProps) {
  const isPct = metric === "gmPercent" || metric === "cpPercent" || metric === "salesMix";

  const chartData = MONTHS.map((m, i) => {
    const month = i + 1;
    const e25 = entries.filter((e) => e.year === 2025 && e.month === month);
    const e26 = entries.filter((e) => e.year === 2026 && e.month === month);

    const val25 = isPct
      ? (() => { const ts = e25.reduce((s, e) => s + e.grossBookedSales, 0); return ts ? e25.reduce((s, e) => s + e.grossBookedSales * calcMetric(e, metric), 0) / ts : 0; })()
      : e25.reduce((s, e) => s + calcMetric(e, metric), 0);
    const val26 = isPct
      ? (() => { const ts = e26.reduce((s, e) => s + e.grossBookedSales, 0); return ts ? e26.reduce((s, e) => s + e.grossBookedSales * calcMetric(e, metric), 0) / ts : 0; })()
      : e26.reduce((s, e) => s + calcMetric(e, metric), 0);

    return { month: m, "2025": val25 || null, "2026": val26 || null };
  });

  const fmtTooltip = (value: number) => isPct ? formatPct(value) : formatCurrency(value);
  const fmtAxis = (v: number) => isPct ? `${(v * 100).toFixed(0)}%` : formatCurrency(v);

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtAxis} />
          <Tooltip formatter={(value) => fmtTooltip(Number(value))} contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="2025" stroke="#94a3b8" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line type="monotone" dataKey="2026" stroke="#7F8D40" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
