"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MONTHS, CURRENT_MONTH, formatCurrency, formatPct, formatVariance, type MetricKey } from "@/lib/constants";
import AnnotationBubble from "./AnnotationBubble";

type EntryData = {
  departmentId: string;
  departmentName: string;
  year: number;
  month: number;
  type: string; // "actual" | "forecast"
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

type AnnotationType = {
  id: string;
  departmentId: string;
  year: number;
  month: number;
  text: string;
  author: string;
  createdAt: string;
};

export default function RollupTable({ entries, metric, title }: RollupTableProps) {
  const [annotations, setAnnotations] = useState<AnnotationType[]>([]);

  const loadAnnotations = useCallback(async () => {
    try {
      const res = await fetch("/api/annotations");
      if (res.ok) {
        const data = await res.json();
        setAnnotations(data);
      }
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    loadAnnotations();
  }, [loadAnnotations]);

  const addAnnotation = async (departmentId: string, year: number, month: number, text: string) => {
    const res = await fetch("/api/annotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departmentId, year, month, text }),
    });
    if (res.ok) {
      await loadAnnotations();
    }
  };

  const deleteAnnotation = async (id: string) => {
    await fetch(`/api/annotations?id=${id}`, { method: "DELETE" });
    await loadAnnotations();
  };

  const getAnnotations = (deptId: string, year: number, month: number) =>
    annotations.filter((a) => a.departmentId === deptId && a.year === year && a.month === month);

  const departments = new Map<string, { name: string; id: string }>();
  for (const e of entries) {
    if (!departments.has(e.departmentId)) {
      departments.set(e.departmentId, { name: e.departmentName, id: e.departmentId });
    }
  }

  const deptList = Array.from(departments.values()).sort((a, b) => a.name.localeCompare(b.name));

  const isPctMetric = metric === "gmPercent" || metric === "cpPercent" || metric === "salesMix";

  // Separate forecast and actual entries
  const forecastEntries = entries.filter((e) => e.type !== "actual");
  const actualEntries = entries.filter((e) => e.type === "actual");

  // Sales totals for mix calculations (by type)
  const monthTotals: Record<string, number> = {};
  for (const e of forecastEntries) {
    const key = `${e.year}-${e.month}`;
    monthTotals[key] = (monthTotals[key] || 0) + e.grossBookedSales;
  }
  const actualMonthTotals: Record<string, number> = {};
  for (const e of actualEntries) {
    const key = `${e.year}-${e.month}`;
    actualMonthTotals[key] = (actualMonthTotals[key] || 0) + e.grossBookedSales;
  }

  // Get metric value for a dept/year/month with type filter
  const getVal = (deptId: string, year: number, month: number, entryType?: string): number => {
    const source = entryType === "actual" ? actualEntries : forecastEntries;
    const totals = entryType === "actual" ? actualMonthTotals : monthTotals;
    const matching = source.filter(
      (e) => e.departmentId === deptId && e.year === year && e.month === month
    );
    if (matching.length === 0) return 0;
    if (metric === "salesMix") {
      const total = totals[`${year}-${month}`] || 0;
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
  const getFyTotal = (deptId: string, year: number, entryType?: string): number => {
    const source = entryType === "actual" ? actualEntries : forecastEntries;
    if (isPctMetric) {
      if (metric === "salesMix") {
        const deptTotal = source.filter((e) => e.departmentId === deptId && e.year === year).reduce((s, e) => s + e.grossBookedSales, 0);
        const yearTotal = source.filter((e) => e.year === year).reduce((s, e) => s + e.grossBookedSales, 0);
        return yearTotal ? deptTotal / yearTotal : 0;
      }
      const de = source.filter((e) => e.departmentId === deptId && e.year === year);
      const ts = de.reduce((s, e) => s + e.grossBookedSales, 0);
      return ts ? de.reduce((s, e) => s + e.grossBookedSales * computeMetric(e, metric), 0) / ts : 0;
    }
    return MONTHS.reduce((s, _, i) => s + getVal(deptId, year, i + 1, entryType), 0);
  };

  // Grand total across all depts for a year/month
  const getGrandVal = (year: number, month: number, entryType?: string): number => {
    const source = entryType === "actual" ? actualEntries : forecastEntries;
    if (isPctMetric && metric !== "salesMix") {
      const yearMonth = source.filter((e) => e.year === year && e.month === month);
      const ts = yearMonth.reduce((s, e) => s + e.grossBookedSales, 0);
      return ts ? yearMonth.reduce((s, e) => s + e.grossBookedSales * computeMetric(e, metric), 0) / ts : 0;
    }
    if (metric === "salesMix") return 1;
    return deptList.reduce((sum, dept) => sum + getVal(dept.id, year, month, entryType), 0);
  };

  const getGrandFy = (year: number, entryType?: string): number => {
    const source = entryType === "actual" ? actualEntries : forecastEntries;
    if (isPctMetric) {
      if (metric === "salesMix") return 1;
      const ye = source.filter((e) => e.year === year);
      const ts = ye.reduce((s, e) => s + e.grossBookedSales, 0);
      return ts ? ye.reduce((s, e) => s + e.grossBookedSales * computeMetric(e, metric), 0) / ts : 0;
    }
    return MONTHS.reduce((s, _, i) => s + getGrandVal(year, i + 1, entryType), 0);
  };

  // YTD helpers
  // For actuals: only sum months that have actual data
  const maxActualMonth = actualEntries.length > 0
    ? Math.max(...actualEntries.filter((e) => e.year === 2026).map((e) => e.month))
    : 0;
  const ytdMonth = CURRENT_MONTH;

  const getYtd = (deptId: string, year: number, entryType?: string): number => {
    const source = entryType === "actual" ? actualEntries : forecastEntries;
    // For actuals, YTD only sums months with actual data
    const cutoff = entryType === "actual" ? maxActualMonth : ytdMonth;
    if (cutoff === 0) return 0;
    if (isPctMetric) {
      if (metric === "salesMix") {
        const deptYtd = source.filter((e) => e.departmentId === deptId && e.year === year && e.month <= cutoff).reduce((s, e) => s + e.grossBookedSales, 0);
        const totalYtd = source.filter((e) => e.year === year && e.month <= cutoff).reduce((s, e) => s + e.grossBookedSales, 0);
        return totalYtd ? deptYtd / totalYtd : 0;
      }
      const de = source.filter((e) => e.departmentId === deptId && e.year === year && e.month <= cutoff);
      const ts = de.reduce((s, e) => s + e.grossBookedSales, 0);
      return ts ? de.reduce((s, e) => s + e.grossBookedSales * computeMetric(e, metric), 0) / ts : 0;
    }
    let sum = 0;
    for (let m = 1; m <= cutoff; m++) sum += getVal(deptId, year, m, entryType);
    return sum;
  };

  const getGrandYtd = (year: number, entryType?: string): number => {
    const source = entryType === "actual" ? actualEntries : forecastEntries;
    const cutoff = entryType === "actual" ? maxActualMonth : ytdMonth;
    if (cutoff === 0) return 0;
    if (isPctMetric) {
      if (metric === "salesMix") return 1;
      const ye = source.filter((e) => e.year === year && e.month <= cutoff);
      const ts = ye.reduce((s, e) => s + e.grossBookedSales, 0);
      return ts ? ye.reduce((s, e) => s + e.grossBookedSales * computeMetric(e, metric), 0) / ts : 0;
    }
    let sum = 0;
    for (let m = 1; m <= cutoff; m++) sum += getGrandVal(year, m, entryType);
    return sum;
  };

  // Variance helper
  const fmtVar = (val: number, base: number): string => {
    if (isPctMetric) {
      const diff = val - base;
      return `${diff >= 0 ? "+" : ""}${(diff * 100).toFixed(1)}pp`;
    }
    return base !== 0 ? formatVariance(((val - base) / Math.abs(base)) * 100) : "—";
  };

  const varColor = (val: number, base: number): string => {
    const diff = isPctMetric ? val - base : (base !== 0 ? val - base : 0);
    return diff > 0 ? "text-emerald-600" : diff < 0 ? "text-rose-600" : "text-gray-400";
  };

  // Row config for data rows
  const dataRows = [
    { key: "2025a", label: "2025 (A)", year: 2025, entryType: undefined as string | undefined, style: "text-gray-400" },
    { key: "2026f", label: "2026 (F)", year: 2026, entryType: "forecast" as string | undefined, style: "text-gray-900" },
    { key: "2026a", label: "2026 (A)", year: 2026, entryType: "actual" as string | undefined, style: "text-blue-600 font-medium" },
  ];

  // Render a department block
  const renderDeptBlock = (dept: { id: string; name: string } | null, label: string, deptIdx: number) => {
    const isDeptLevel = dept !== null;
    const deptRowSpan = 6;

    const getMonthly = (year: number, month: number, entryType?: string) =>
      isDeptLevel ? getVal(dept!.id, year, month, entryType) : getGrandVal(year, month, entryType);
    const getFy = (year: number, entryType?: string) =>
      isDeptLevel ? getFyTotal(dept!.id, year, entryType) : getGrandFy(year, entryType);
    const getYtdVal = (year: number, entryType?: string) =>
      isDeptLevel ? getYtd(dept!.id, year, entryType) : getGrandYtd(year, entryType);

    const isEvenDept = deptIdx % 2 === 0;
    const baseBg = !isDeptLevel ? "bg-gray-800/[0.03]" : (isEvenDept ? "" : "bg-gray-50/50");
    const stickyBg = !isDeptLevel ? "bg-[#f7f7f7]" : (isEvenDept ? "bg-white" : "bg-[#fbfbfb]");

    return (
      <React.Fragment key={label}>
        {/* Data rows: 2025(A), 2026(F), 2026(A) */}
        {dataRows.map((row, rowIdx) => {
          const monthlyVals = MONTHS.map((_, i) => row.year ? getMonthly(row.year, i + 1, row.entryType) : 0);
          const ytdVal = row.year ? getYtdVal(row.year, row.entryType) : 0;
          const fyVal = row.year ? getFy(row.year, row.entryType) : 0;
          const is2026f = row.key === "2026f";
          const is2026a = row.key === "2026a";

          return (
            <tr key={`${label}-${row.key}`} className={`${baseBg} ${row.style} ${is2026f && isDeptLevel ? "font-medium" : ""}`}>
              {rowIdx === 0 && (
                <td className={`px-3 py-1.5 font-medium sticky left-0 ${stickyBg} z-10 min-w-[130px] border-r border-gray-100 ${!isDeptLevel ? "font-bold text-[11px] uppercase tracking-wider text-gray-700" : ""}`} rowSpan={deptRowSpan}>
                  {isDeptLevel ? (
                    <a href={`/department/${dept!.id}`} className="text-brand hover:text-brand-dark hover:underline transition-colors">{label}</a>
                  ) : (
                    label
                  )}
                </td>
              )}
              <td className={`px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider whitespace-nowrap border-r border-gray-100 ${row.style}`}>{row.label}</td>
              {monthlyVals.map((val, i) => (
                <td key={i} className="px-2 py-1.5 text-right tabular-nums">
                  <div className="flex items-center justify-end gap-0.5">
                    {is2026f && isDeptLevel && (
                      <AnnotationBubble
                        departmentId={dept!.id}
                        departmentName={label}
                        year={2026}
                        month={i + 1}
                        annotations={getAnnotations(dept!.id, 2026, i + 1)}
                        onAdd={(text) => addAnnotation(dept!.id, 2026, i + 1, text)}
                        onDelete={deleteAnnotation}
                      />
                    )}
                    <span>
                      {val ? fmtVal(metric, val) : <span className="text-gray-300">—</span>}
                    </span>
                  </div>
                </td>
              ))}
              <td className={`px-2 py-1.5 text-right font-semibold tabular-nums ${is2026f ? "bg-brand-50/60" : is2026a ? "bg-blue-50/40" : "bg-blue-50/40"} border-l border-gray-100`}>
                {ytdVal ? fmtVal(metric, ytdVal) : <span className="text-gray-300">—</span>}
              </td>
              <td className={`px-2 py-1.5 text-right font-semibold tabular-nums ${is2026f ? "bg-gray-100/60" : "bg-gray-50/60"} border-l border-gray-100`}>
                {fyVal ? fmtVal(metric, fyVal) : <span className="text-gray-300">—</span>}
              </td>
            </tr>
          );
        })}

        {/* Variance rows */}
        {(() => {
          const fy26f = getFy(2026, "forecast");
          const fy25a = getFy(2025);
          const fy26a = getFy(2026, "actual");
          const ytd26f = getYtdVal(2026, "forecast");
          const ytd25a = getYtdVal(2025);
          const ytd26a = getYtdVal(2026, "actual");

          const varRows = [
            {
              key: "a-vs-fcst",
              label: "A vs Fcst",
              hasData: true,
              getMonthVar: (month: number) => {
                const va = getMonthly(2026, month, "actual");
                const vf = getMonthly(2026, month, "forecast");
                if (!va) return { str: "—", color: "text-gray-300" };
                return { str: fmtVar(va, vf), color: varColor(va, vf) };
              },
              ytdStr: ytd26a ? fmtVar(ytd26a, ytd26f) : "—",
              ytdColor: ytd26a ? varColor(ytd26a, ytd26f) : "text-gray-300",
              fyStr: fy26a ? fmtVar(fy26a, fy26f) : "—",
              fyColor: fy26a ? varColor(fy26a, fy26f) : "text-gray-300",
            },
            {
              key: "a-vs-ly",
              label: "A vs LY",
              hasData: true,
              getMonthVar: (month: number) => {
                const va = getMonthly(2026, month, "actual");
                const v25 = getMonthly(2025, month);
                if (!va) return { str: "—", color: "text-gray-300" };
                return { str: fmtVar(va, v25), color: varColor(va, v25) };
              },
              ytdStr: ytd26a ? fmtVar(ytd26a, ytd25a) : "—",
              ytdColor: ytd26a ? varColor(ytd26a, ytd25a) : "text-gray-300",
              fyStr: fy26a ? fmtVar(fy26a, fy25a) : "—",
              fyColor: fy26a ? varColor(fy26a, fy25a) : "text-gray-300",
            },
            {
              key: "f-vs-ly",
              label: "F vs LY",
              hasData: true,
              getMonthVar: (month: number) => {
                const v26 = getMonthly(2026, month, "forecast");
                const v25 = getMonthly(2025, month);
                if (!v25 && !v26) return { str: "—", color: "text-gray-300" };
                return { str: fmtVar(v26, v25), color: varColor(v26, v25) };
              },
              ytdStr: fmtVar(ytd26f, ytd25a),
              ytdColor: varColor(ytd26f, ytd25a),
              fyStr: fmtVar(fy26f, fy25a),
              fyColor: varColor(fy26f, fy25a),
            },
          ];

          return varRows.map((vr) => (
            <tr key={`${label}-${vr.key}`} className={`${baseBg} bg-amber-50/30`}>
              <td className="px-2 py-1 text-center text-[9px] font-semibold text-gray-400 whitespace-nowrap uppercase tracking-wider border-r border-gray-100">{vr.label}</td>
              {MONTHS.map((_, i) => {
                if (!vr.hasData) {
                  return <td key={i} className="px-2 py-1 text-right text-[10px] text-gray-300">—</td>;
                }
                const { str, color } = vr.getMonthVar(i + 1);
                return <td key={i} className={`px-2 py-1 text-right text-[10px] font-medium tabular-nums ${color}`}>{str}</td>;
              })}
              <td className={`px-2 py-1 text-right text-[10px] font-bold tabular-nums bg-brand-50/40 border-l border-gray-100 ${vr.ytdColor}`}>
                {vr.ytdStr}
              </td>
              <td className={`px-2 py-1 text-right text-[10px] font-bold tabular-nums bg-gray-50/60 border-l border-gray-100 ${vr.fyColor}`}>
                {vr.fyStr}
              </td>
            </tr>
          ));
        })()}

        {/* Separator between dept blocks */}
        {isDeptLevel && (
          <tr>
            <td colSpan={MONTHS.length + 4} className="h-px bg-gray-200/80" />
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">{title}</h3>
        <span className="text-[10px] text-gray-400 font-medium">
          {deptList.length} department{deptList.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-[11px] border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="bg-gray-900 text-white">
                <th className="text-left px-3 py-2.5 font-semibold sticky left-0 bg-gray-900 z-30 min-w-[130px] text-[10px] uppercase tracking-wider">Department</th>
                <th className="px-2 py-2.5 font-semibold text-center min-w-[60px] text-[10px] uppercase tracking-wider border-l border-gray-700 bg-gray-900"></th>
                {MONTHS.map((m) => (
                  <th key={m} className="px-2 py-2.5 text-center font-semibold text-[10px] uppercase tracking-wider bg-gray-900">{m}</th>
                ))}
                <th className="px-2 py-2.5 text-center font-bold text-[10px] uppercase tracking-wider bg-brand-dark border-l border-brand/30">
                  YTD{maxActualMonth > 0 && <span className="block text-[8px] font-normal opacity-70">A: thru {MONTHS[maxActualMonth - 1]}</span>}
                </th>
                <th className="px-2 py-2.5 text-center font-bold text-[10px] uppercase tracking-wider bg-gray-800 border-l border-gray-700">FY</th>
              </tr>
            </thead>
            <tbody>
              {deptList.map((dept, idx) => renderDeptBlock(dept, dept.name, idx))}
              {deptList.length > 1 && renderDeptBlock(null, "TOTAL", -1)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
