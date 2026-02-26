"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList,
} from "recharts";
import { formatCurrency } from "@/lib/constants";

type EntryData = {
  departmentId: string;
  departmentName: string;
  year: number;
  month: number;
  grossBookedSales: number;
  gmPercent: number;
  cpPercent: number;
};

type WaterfallProps = {
  entries: EntryData[];
};

// AOP targets (same as dashboard)
const AOP_SALES = 57_050_000;

// Color palette
const COLORS = {
  aop: "#1e293b",        // slate-800 (dark, authoritative)
  forecast: "#7F8D40",   // brand olive
  increase: "#0d9488",   // teal-600
  decrease: "#e11d48",   // rose-600
  refLine: "#94a3b8",    // slate-400
};

export default function BudgetFcstWaterfall({ entries }: WaterfallProps) {
  // Calculate 2026 forecast total per department
  const deptMap = new Map<string, { name: string; total2026: number }>();
  for (const e of entries) {
    if (e.year !== 2026) continue;
    const existing = deptMap.get(e.departmentId) || { name: e.departmentName, total2026: 0 };
    existing.total2026 += e.grossBookedSales;
    deptMap.set(e.departmentId, existing);
  }

  const fcstTotal = Array.from(deptMap.values()).reduce((s, d) => s + d.total2026, 0);
  const totalVariance = fcstTotal - AOP_SALES;

  // 2025 dept mix to allocate AOP to departments
  const dept2025Totals = new Map<string, number>();
  let total2025 = 0;
  for (const e of entries) {
    if (e.year !== 2025) continue;
    dept2025Totals.set(e.departmentId, (dept2025Totals.get(e.departmentId) || 0) + e.grossBookedSales);
    total2025 += e.grossBookedSales;
  }

  // Department variances
  const deptVariances: { name: string; variance: number }[] = [];
  for (const [deptId, data] of deptMap.entries()) {
    const dept2025Share = total2025 ? (dept2025Totals.get(deptId) || 0) / total2025 : 0;
    const deptAop = AOP_SALES * dept2025Share;
    const variance = data.total2026 - deptAop;
    deptVariances.push({ name: data.name, variance });
  }

  // Sort: negatives first (largest negative), then positives (smallest to largest)
  deptVariances.sort((a, b) => a.variance - b.variance);

  // Build waterfall data — all bars use bases relative to the waterfall flow
  type WaterfallItem = {
    name: string;
    value: number;
    base: number;
    displayValue: number; // actual value for tooltip
    fill: string;
    isTotal: boolean;
    variance?: number; // signed variance for labels
  };

  const waterfallData: WaterfallItem[] = [];

  // Track min/max for Y-axis zoom
  let minVal = AOP_SALES;
  let maxVal = AOP_SALES;

  // Starting bar: AOP — use a base so it fits the zoomed axis
  waterfallData.push({
    name: "AOP",
    value: AOP_SALES,
    base: 0,
    displayValue: AOP_SALES,
    fill: COLORS.aop,
    isTotal: true,
  });

  // Department variance bars
  let runningTotal = AOP_SALES;
  for (const dv of deptVariances) {
    if (Math.abs(dv.variance) < 1000) continue; // skip negligible
    const base = dv.variance >= 0 ? runningTotal : runningTotal + dv.variance;
    const top = dv.variance >= 0 ? runningTotal + dv.variance : runningTotal;

    waterfallData.push({
      name: dv.name.length > 10 ? dv.name.slice(0, 9) + "…" : dv.name,
      value: Math.abs(dv.variance),
      base,
      displayValue: dv.variance,
      fill: dv.variance >= 0 ? COLORS.increase : COLORS.decrease,
      isTotal: false,
      variance: dv.variance,
    });

    runningTotal += dv.variance;
    minVal = Math.min(minVal, base, top);
    maxVal = Math.max(maxVal, base, top);
  }

  // Ending bar: 2026 Forecast
  waterfallData.push({
    name: "2026 Fcst",
    value: fcstTotal,
    base: 0,
    displayValue: fcstTotal,
    fill: COLORS.forecast,
    isTotal: true,
  });

  minVal = Math.min(minVal, fcstTotal);
  maxVal = Math.max(maxVal, fcstTotal);

  // Y-axis domain: zoom to show variance detail
  // Add 15% padding above and below the variance range
  const range = maxVal - minVal;
  const padding = Math.max(range * 0.4, 500_000); // at least $500K padding
  const yMin = Math.floor((minVal - padding) / 1_000_000) * 1_000_000;
  const yMax = Math.ceil((maxVal + padding) / 1_000_000) * 1_000_000;

  // For total bars (AOP, Forecast), clip them to start at yMin instead of 0
  // so they render properly in the zoomed view
  const clippedData = waterfallData.map((d) => {
    if (d.isTotal) {
      return { ...d, base: yMin, value: d.displayValue - yMin };
    }
    return d;
  });

  const fmtAxis = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

  const fmtVariance = (v: number) => {
    const abs = Math.abs(v);
    const prefix = v >= 0 ? "+" : "-";
    if (abs >= 1_000_000) return `${prefix}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${prefix}$${(abs / 1_000).toFixed(0)}K`;
    return `${prefix}$${abs.toFixed(0)}`;
  };

  const variancePct = AOP_SALES ? ((fcstTotal - AOP_SALES) / AOP_SALES * 100) : 0;
  const varianceColor = totalVariance >= 0 ? "text-teal-600" : "text-rose-600";

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Budget vs Forecast Bridge</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Variance by department (Fcst vs AOP)</p>
        </div>
        <div className="text-right">
          <div className="text-xs">
            <span className="text-gray-500">AOP</span>
            <span className="font-semibold text-gray-800 ml-1">{formatCurrency(AOP_SALES)}</span>
            <span className="mx-1.5 text-gray-300">→</span>
            <span className="text-gray-500">Fcst</span>
            <span className="font-semibold text-gray-800 ml-1">{formatCurrency(fcstTotal)}</span>
          </div>
          <div className={`text-sm font-bold ${varianceColor}`}>
            {totalVariance >= 0 ? "+" : ""}{fmtVariance(totalVariance)} ({variancePct >= 0 ? "+" : ""}{variancePct.toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS.increase }} /> Favorable
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS.decrease }} /> Unfavorable
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS.aop }} /> AOP
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS.forecast }} /> Forecast
        </span>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={clippedData} barCategoryGap="15%" margin={{ top: 20, right: 10, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, fill: "#64748b" }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={65}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickFormatter={fmtAxis}
            domain={[yMin, yMax]}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0]?.payload;
              if (!data) return null;
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                  <p className="font-semibold text-gray-800 mb-1">{data.name}</p>
                  {data.isTotal ? (
                    <p className="text-gray-600">Total: <span className="font-medium">{formatCurrency(data.displayValue)}</span></p>
                  ) : (
                    <p className={data.variance >= 0 ? "text-teal-600" : "text-rose-600"}>
                      Variance: <span className="font-medium">{fmtVariance(data.variance)}</span>
                    </p>
                  )}
                </div>
              );
            }}
          />
          <Bar dataKey="base" stackId="waterfall" fill="transparent" radius={0}>
            <LabelList content={() => null} />
          </Bar>
          <Bar dataKey="value" stackId="waterfall" radius={[3, 3, 0, 0]}>
            {clippedData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.fill}
                opacity={entry.isTotal ? 1 : 0.9}
              />
            ))}
            <LabelList
              content={(props) => {
                const { x, y, width, index } = props as { x: number; y: number; width: number; index: number };
                const item = clippedData[index];
                if (!item || item.isTotal) return null;
                const label = fmtVariance(item.variance || 0);
                const color = (item.variance || 0) >= 0 ? COLORS.increase : COLORS.decrease;
                return (
                  <text
                    x={x + width / 2}
                    y={y - 6}
                    textAnchor="middle"
                    fill={color}
                    fontSize={8}
                    fontWeight={600}
                  >
                    {label}
                  </text>
                );
              }}
            />
          </Bar>
          <ReferenceLine
            y={AOP_SALES}
            stroke={COLORS.refLine}
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: "AOP",
              position: "right",
              fontSize: 9,
              fill: COLORS.refLine,
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
