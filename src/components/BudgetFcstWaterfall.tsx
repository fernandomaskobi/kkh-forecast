"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
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

  // Sort departments by absolute variance contribution (largest first)
  // For waterfall, distribute AOP evenly across depts (AOP / numDepts) to get dept-level variance
  // OR better: show each dept's forecast vs its proportional share of AOP
  // Since we don't have dept-level AOP, let's show:
  // - AOP total as starting bar
  // - Total variance as a single bridge bar
  // - Each dept's contribution to the FORECAST as % of total, to show composition

  // Actually, the most useful waterfall for FP&A is:
  // AOP → Variance by department → Forecast
  // Since we don't have dept-level AOP, distribute AOP by 2025 dept mix
  const dept2025Totals = new Map<string, number>();
  let total2025 = 0;
  for (const e of entries) {
    if (e.year !== 2025) continue;
    dept2025Totals.set(e.departmentId, (dept2025Totals.get(e.departmentId) || 0) + e.grossBookedSales);
    total2025 += e.grossBookedSales;
  }

  // Build waterfall data
  type WaterfallItem = {
    name: string;
    value: number;
    base: number;
    fill: string;
    isTotal: boolean;
  };

  const waterfallData: WaterfallItem[] = [];

  // Starting bar: AOP
  waterfallData.push({
    name: "AOP",
    value: AOP_SALES,
    base: 0,
    fill: "#3b82f6", // blue
    isTotal: true,
  });

  // Department variances (forecast vs proportional AOP share)
  // Use 2025 actual mix to allocate AOP to departments
  const deptVariances: { name: string; variance: number }[] = [];
  for (const [deptId, data] of deptMap.entries()) {
    const dept2025Share = total2025 ? (dept2025Totals.get(deptId) || 0) / total2025 : 0;
    const deptAop = AOP_SALES * dept2025Share;
    const variance = data.total2026 - deptAop;
    deptVariances.push({ name: data.name, variance });
  }

  // Sort by variance (largest negative first, then positive)
  deptVariances.sort((a, b) => a.variance - b.variance);

  let runningTotal = AOP_SALES;
  for (const dv of deptVariances) {
    if (Math.abs(dv.variance) < 1000) continue; // skip negligible variances
    const base = dv.variance >= 0 ? runningTotal : runningTotal + dv.variance;
    waterfallData.push({
      name: dv.name.length > 12 ? dv.name.slice(0, 11) + "…" : dv.name,
      value: Math.abs(dv.variance),
      base,
      fill: dv.variance >= 0 ? "#16a34a" : "#dc2626", // green / red
      isTotal: false,
    });
    runningTotal += dv.variance;
  }

  // Ending bar: 2026 Forecast
  waterfallData.push({
    name: "2026 Fcst",
    value: fcstTotal,
    base: 0,
    fill: "#7F8D40", // brand olive
    isTotal: true,
  });

  const fmtAxis = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
    if (abs >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

  const variancePct = AOP_SALES ? ((fcstTotal - AOP_SALES) / AOP_SALES * 100) : 0;
  const varianceColor = totalVariance >= 0 ? "text-green-600" : "text-red-600";

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Budget vs Forecast Bridge</h3>
        <div className="text-xs">
          <span className="text-gray-500">AOP: {formatCurrency(AOP_SALES)}</span>
          <span className="mx-2">→</span>
          <span className="font-semibold">Fcst: {formatCurrency(fcstTotal)}</span>
          <span className={`ml-2 font-bold ${varianceColor}`}>
            ({totalVariance >= 0 ? "+" : ""}{variancePct.toFixed(1)}%)
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={waterfallData} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9 }}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtAxis} />
          <Tooltip
            formatter={(value, name) => {
              if (name === "base") return [null, null];
              return [formatCurrency(Number(value)), "Value"];
            }}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="base" stackId="waterfall" fill="transparent" />
          <Bar dataKey="value" stackId="waterfall" radius={[2, 2, 0, 0]}>
            {waterfallData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
          <ReferenceLine y={AOP_SALES} stroke="#3b82f6" strokeDasharray="3 3" strokeWidth={1} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
