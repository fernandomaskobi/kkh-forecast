"use client";

import React from "react";
import { MONTHS, formatCurrency, formatPct, formatVariance, type MetricKey } from "@/lib/constants";

type EntryData = {
  departmentId: string;
  departmentName: string;
  year: number;
  month: number;
  grossBookedSales: number;
  gmPercent: number;
  cpPercent: number;
};

type RollupTableProps = {
  entries: EntryData[];
  metric: MetricKey;
  title: string;
};

function computeMetric(entry: EntryData, metric: MetricKey): number {
  switch (metric) {
    case "grossBookedSales": return entry.grossBookedSales;
    case "gmPercent": return entry.gmPercent;
    case "gmDollars": return entry.grossBookedSales * entry.gmPercent;
    case "cpPercent": return entry.cpPercent;
    case "cpDollars": return entry.grossBookedSales * entry.cpPercent;
    case "salesMix": return entry.grossBookedSales;
    default: return 0;
  }
}

function fmtVal(metric: MetricKey, value: number): string {
  if (metric === "gmPercent" || metric === "cpPercent" || metric === "salesMix") {
    return formatPct(value);
  }
  return formatCurrency(value);
}

export default function RollupTable({ entries, metric, title }: RollupTableProps) {
  const departments = new Map<string, { name: string; id: string }>();
  for (const e of entries) {
    if (!departments.has(e.departmentId)) {
      departments.set(e.departmentId, { name: e.departmentName, id: e.departmentId });
    }
  }

  const deptList = Array.from(departments.values()).sort((a, b) => a.name.localeCompare(b.name));

  const isPctMetric = metric === "gmPercent" || metric === "cpPercent" || metric === "salesMix";

  // Sales totals for mix calculations
  const monthTotals: Record<string, number> = {};
  for (const e of entries) {
    const key = `${e.year}-${e.month}`;
    monthTotals[key] = (monthTotals[key] || 0) + e.grossBookedSales;
  }

  // Get metric value for a dept/year/month
  const getVal = (deptId: string, year: number, month: number): number => {
    const matching = entries.filter(
      (e) => e.departmentId === deptId && e.year === year && e.month === month
    );
    if (matching.length === 0) return 0;
    if (metric === "salesMix") {
      const total = monthTotals[`${year}-${month}`] || 0;
      const deptSales = matching.reduce((s, e) => s + e.grossBookedSales, 0);
      return total ? deptSales / total : 0;
    }
    if (metric === "gmPercent" || metric === "cpPercent") {
      const totalSales = matching.reduce((s, e) => s + e.grossBookedSales, 0);
      if (!totalSales) return 0;
      return matching.reduce((s, e) => s + e.grossBookedSales * computeMetric(e, metric), 0) / totalSales;
    }
    return matching.reduce((s, e) => s + computeMetric(e, metric), 0);
  };

  // FY total for a dept/year
  const getFyTotal = (deptId: string, year: number): number => {
    if (isPctMetric) {
      if (metric === "salesMix") {
        const deptTotal = entries.filter((e) => e.departmentId === deptId && e.year === year).reduce((s, e) => s + e.grossBookedSales, 0);
        const yearTotal = entries.filter((e) => e.year === year).reduce((s, e) => s + e.grossBookedSales, 0);
        return yearTotal ? deptTotal / yearTotal : 0;
      }
      const deptEntries = entries.filter((e) => e.departmentId === deptId && e.year === year);
      const ts = deptEntries.reduce((s, e) => s + e.grossBookedSales, 0);
      return ts ? deptEntries.reduce((s, e) => s + e.grossBookedSales * computeMetric(e, metric), 0) / ts : 0;
    }
    return MONTHS.reduce((s, _, i) => s + getVal(deptId, year, i + 1), 0);
  };

  // Grand total across all depts for a year/month
  const getGrandVal = (year: number, month: number): number => {
    if (isPctMetric && metric !== "salesMix") {
      const yearMonth = entries.filter((e) => e.year === year && e.month === month);
      const ts = yearMonth.reduce((s, e) => s + e.grossBookedSales, 0);
      return ts ? yearMonth.reduce((s, e) => s + e.grossBookedSales * computeMetric(e, metric), 0) / ts : 0;
    }
    if (metric === "salesMix") return 1;
    return deptList.reduce((sum, dept) => sum + getVal(dept.id, year, month), 0);
  };

  const getGrandFy = (year: number): number => {
    if (isPctMetric) {
      if (metric === "salesMix") return 1;
      const ye = entries.filter((e) => e.year === year);
      const ts = ye.reduce((s, e) => s + e.grossBookedSales, 0);
      return ts ? ye.reduce((s, e) => s + e.grossBookedSales * computeMetric(e, metric), 0) / ts : 0;
    }
    return MONTHS.reduce((s, _, i) => s + getGrandVal(year, i + 1), 0);
  };

  // Variance helper
  const calcVar = (val: number, base: number): number => {
    if (isPctMetric) return val - base; // difference in pct points
    return base !== 0 ? ((val - base) / Math.abs(base)) * 100 : 0;
  };

  const fmtVar = (val: number, base: number): string => {
    if (isPctMetric) {
      const diff = val - base;
      return `${diff >= 0 ? "+" : ""}${(diff * 100).toFixed(1)}pp`;
    }
    return base !== 0 ? formatVariance(((val - base) / Math.abs(base)) * 100) : "—";
  };

  const varColor = (val: number, base: number): string => {
    const diff = isPctMetric ? val - base : (base !== 0 ? val - base : 0);
    return diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-400";
  };

  // Row config for data rows
  const dataRows = [
    { key: "2025a", label: "2025 (A)", year: 2025, style: "text-gray-500" },
    { key: "2026f", label: "2026 (F)", year: 2026, style: "" },
    { key: "2026a", label: "2026 (A)", year: null, style: "text-blue-600" }, // no data yet
  ];

  // Render a department block (8 rows: 3 data + 5 variance)
  const renderDeptBlock = (dept: { id: string; name: string } | null, label: string) => {
    const isDeptLevel = dept !== null;
    const deptRowSpan = 6;

    const getMonthly = (year: number, month: number) =>
      isDeptLevel ? getVal(dept!.id, year, month) : getGrandVal(year, month);
    const getFy = (year: number) =>
      isDeptLevel ? getFyTotal(dept!.id, year) : getGrandFy(year);

    const bgClass = isDeptLevel ? "" : "bg-gray-100 font-semibold";
    const stickyBg = isDeptLevel ? "bg-white" : "bg-gray-100";

    return (
      <React.Fragment key={label}>
        {/* Data rows: 2025(A), 2026(F), 2026(A) */}
        {dataRows.map((row, rowIdx) => {
          const monthlyVals = MONTHS.map((_, i) => row.year ? getMonthly(row.year, i + 1) : 0);
          const fyVal = row.year ? getFy(row.year) : 0;

          return (
            <tr key={`${label}-${row.key}`} className={`${bgClass} ${row.style} hover:bg-gray-50`}>
              {rowIdx === 0 && (
                <td className={`px-2 py-1.5 border font-medium sticky left-0 ${stickyBg} z-10 min-w-[120px]`} rowSpan={deptRowSpan}>
                  {isDeptLevel ? (
                    <a href={`/department/${dept!.id}`} className="text-brand hover:underline">{label}</a>
                  ) : (
                    label
                  )}
                </td>
              )}
              <td className="px-2 py-1.5 border text-center font-medium text-[10px] whitespace-nowrap">{row.label}</td>
              {monthlyVals.map((val, i) => (
                <td key={i} className="px-2 py-1.5 border text-right">
                  {row.year === null ? "—" : (val ? fmtVal(metric, val) : "—")}
                </td>
              ))}
              <td className="px-2 py-1.5 border text-right font-semibold bg-gray-50">
                {row.year === null ? "—" : (fyVal ? fmtVal(metric, fyVal) : "—")}
              </td>
            </tr>
          );
        })}

        {/* Variance rows */}
        {(() => {
          const fy26f = getFy(2026);
          const fy25a = getFy(2025);

          const varRows = [
            {
              key: "a-vs-fcst",
              label: "A vs Fcst",
              // 2026(A) vs 2026(F) — no actuals yet, so show —
              hasData: false,
              getMonthVar: () => ({ str: "—", color: "text-gray-400" }),
              fyStr: "—",
              fyColor: "text-gray-400",
            },
            {
              key: "a-vs-ly",
              label: "A vs LY",
              // 2026(A) vs 2025(A) — no 2026 actuals yet, so show —
              hasData: false,
              getMonthVar: () => ({ str: "—", color: "text-gray-400" }),
              fyStr: "—",
              fyColor: "text-gray-400",
            },
            {
              key: "f-vs-ly",
              label: "F vs LY",
              // 2026(F) vs 2025(A)
              hasData: true,
              getMonthVar: (month: number) => {
                const v26 = getMonthly(2026, month);
                const v25 = getMonthly(2025, month);
                if (!v25 && !v26) return { str: "—", color: "text-gray-400" };
                return { str: fmtVar(v26, v25), color: varColor(v26, v25) };
              },
              fyStr: fmtVar(fy26f, fy25a),
              fyColor: varColor(fy26f, fy25a),
            },
          ];

          return varRows.map((vr) => (
            <tr key={`${label}-${vr.key}`} className="bg-yellow-50/50">
              <td className="px-2 py-1 border text-center text-[10px] font-medium text-gray-400 whitespace-nowrap">{vr.label}</td>
              {MONTHS.map((_, i) => {
                if (!vr.hasData) {
                  return <td key={i} className="px-2 py-1 border text-right text-[10px] text-gray-400">—</td>;
                }
                const { str, color } = vr.getMonthVar(i + 1);
                return <td key={i} className={`px-2 py-1 border text-right text-[10px] ${color}`}>{str}</td>;
              })}
              <td className={`px-2 py-1 border text-right text-[10px] font-semibold ${vr.fyColor}`}>
                {vr.fyStr}
              </td>
            </tr>
          ));
        })()}
      </React.Fragment>
    );
  };

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left px-2 py-2 border font-medium sticky left-0 bg-gray-100 z-10 min-w-[120px]">Department</th>
              <th className="px-2 py-2 border font-medium bg-gray-200 text-center min-w-[70px]"></th>
              {MONTHS.map((m) => (
                <th key={m} className="px-2 py-2 border text-center font-medium">{m}</th>
              ))}
              <th className="px-2 py-2 border text-center font-semibold bg-gray-200">FY Total</th>
            </tr>
          </thead>
          <tbody>
            {/* Department rows */}
            {deptList.map((dept) => renderDeptBlock(dept, dept.name))}

            {/* Grand total */}
            {deptList.length > 1 && renderDeptBlock(null, "TOTAL")}
          </tbody>
        </table>
      </div>
    </div>
  );
}
