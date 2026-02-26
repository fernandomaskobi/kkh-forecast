"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatPct, METRIC_LABELS, type MetricKey } from "@/lib/constants";

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

  // Generate T12 data points from Dec 2025 through Dec 2026
  const dataPoints: { label: string; t12: number }[] = [];

  for (let endYear = 2025; endYear <= 2026; endYear++) {
    const startMonth = endYear === 2025 ? 12 : 1;
    const endMonth = endYear === 2025 ? 12 : 12;

    for (let endMo = startMonth; endMo <= endMonth; endMo++) {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
        <p className="text-sm font-bold text-gray-900">
          {fmtTooltip(payload[0].value)}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">Trailing 12 months</p>
      </div>
    );
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Trailing 12-Month Trend</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">{METRIC_LABELS[metric]} — rolling sum</p>
        </div>
        {dataPoints.length > 0 && (
          <div className="text-right">
            <span className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Open Sans', sans-serif" }}>
              {fmtTooltip(dataPoints[dataPoints.length - 1].t12)}
            </span>
            <span className="text-[10px] text-gray-400 block">Latest T12</span>
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={dataPoints} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
          <defs>
            <linearGradient id="t12Gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7F8D40" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#7F8D40" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickFormatter={fmtAxis}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="t12"
            name="T12"
            stroke="#7F8D40"
            strokeWidth={2.5}
            fill="url(#t12Gradient)"
            dot={{ r: 3, fill: "#7F8D40", strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 5, fill: "#7F8D40", strokeWidth: 2, stroke: "#fff" }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
