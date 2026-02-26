"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { MONTHS, formatCurrency, formatPct, METRIC_LABELS, type MetricKey } from "@/lib/constants";

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
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">{label}</p>
        {payload.map((p: { name: string; value: number; color: string }, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-xs text-gray-500">{p.name}</span>
            </span>
            <span className="text-xs font-bold text-gray-900">{fmtTooltip(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">{METRIC_LABELS[metric]} by month</p>
        </div>
        <div className="flex gap-3 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            <span className="text-gray-400 font-medium">2025</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-brand" />
            <span className="text-gray-600 font-medium">2026</span>
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
          <defs>
            <linearGradient id="grad2025" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="grad2026" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7F8D40" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#7F8D40" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="month"
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
            dataKey="2025"
            stroke="#94a3b8"
            strokeWidth={2}
            fill="url(#grad2025)"
            dot={{ r: 3, fill: "#94a3b8", strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 5, fill: "#94a3b8", strokeWidth: 2, stroke: "#fff" }}
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="2026"
            stroke="#7F8D40"
            strokeWidth={2.5}
            fill="url(#grad2026)"
            dot={{ r: 3, fill: "#7F8D40", strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 5, fill: "#7F8D40", strokeWidth: 2, stroke: "#fff" }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
