"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatPct, type MetricKey } from "@/lib/constants";

type EntryData = {
  departmentId: string;
  departmentName: string;
  year: number;
  month: number;
  grossBookedSales: number;
  gmPercent: number;
  cpPercent: number;
};

type T12TrendChartProps = {
  entries: EntryData[];
  metric: MetricKey;
};

function calcMetric(e: EntryData, metric: MetricKey): number {
  switch (metric) {
    case "grossBookedSales": return e.grossBookedSales;
    case "gmDollars": return e.grossBookedSales * e.gmPercent;
    case "gmPercent": return e.gmPercent;
    case "cpDollars": return e.grossBookedSales * e.cpPercent;
    case "cpPercent": return e.cpPercent;
    default: return e.grossBookedSales;
  }
}

export default function T12TrendChart({ entries, metric }: T12TrendChartProps) {
  const isPct = metric === "gmPercent" || metric === "cpPercent" || metric === "salesMix";

  // Build a map of (year, month) -> aggregated metric value
  const monthMap = new Map<string, { totalSales: number; weightedMetric: number; rawSum: number }>();
  for (const e of entries) {
    const key = `${e.year}-${e.month}`;
    const existing = monthMap.get(key) || { totalSales: 0, weightedMetric: 0, rawSum: 0 };
    existing.totalSales += e.grossBookedSales;
    existing.weightedMetric += e.grossBookedSales * calcMetric(e, metric);
    existing.rawSum += calcMetric(e, metric);
    monthMap.set(key, existing);
  }

  const getMonthVal = (year: number, month: number): number => {
    const data = monthMap.get(`${year}-${month}`);
    if (!data) return 0;
    if (isPct) return data.totalSales ? data.weightedMetric / data.totalSales : 0;
    return data.rawSum;
  };

  // Generate T12 data points from Dec 2025 through Dec 2026
  // Each point = sum/avg of the trailing 12 months ending at that month
  const dataPoints: { label: string; t12: number }[] = [];

  for (let endYear = 2025; endYear <= 2026; endYear++) {
    const startMonth = endYear === 2025 ? 12 : 1; // Start from Dec 2025
    const endMonth = endYear === 2025 ? 12 : 12;

    for (let endMo = startMonth; endMo <= endMonth; endMo++) {
      // Collect 12 months ending at (endYear, endMo)
      let totalSales = 0;
      let weightedSum = 0;
      let rawSum = 0;
      let hasData = false;

      for (let offset = 0; offset < 12; offset++) {
        let mo = endMo - offset;
        let yr = endYear;
        while (mo <= 0) { mo += 12; yr -= 1; }

        const data = monthMap.get(`${yr}-${mo}`);
        if (data && data.totalSales > 0) {
          hasData = true;
          totalSales += data.totalSales;
          weightedSum += data.weightedMetric;
          rawSum += data.rawSum;
        }
      }

      if (hasData) {
        const t12Val = isPct ? (totalSales ? weightedSum / totalSales : 0) : rawSum;
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        dataPoints.push({
          label: `${monthNames[endMo - 1]} ${String(endYear).slice(2)}`,
          t12: t12Val,
        });
      }
    }
  }

  const fmtTooltip = (value: number) => isPct ? formatPct(value) : formatCurrency(value);
  const fmtAxis = (v: number) => {
    if (isPct) return `${(v * 100).toFixed(0)}%`;
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Trailing 12-Month Trend</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={dataPoints}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtAxis} />
          <Tooltip formatter={(value) => fmtTooltip(Number(value))} contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="t12"
            name="T12"
            stroke="#7F8D40"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#7F8D40" }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
