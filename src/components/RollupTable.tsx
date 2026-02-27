"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MONTHS, CURRENT_MONTH, formatCurrency, formatPct, formatVariance, type MetricKey } from "@/lib/constants";
import AnnotationBubble from "./AnnotationBubble";

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

  // YTD helpers (through current month)
  const ytdMonth = CURRENT_MONTH;

  const getYtd = (deptId: string, year: number): number => {
    if (isPctMetric) {
      if (metric === "salesMix") {
        const deptYtd = entries.filter((e) => e.departmentId === deptId && e.year === year && e.month <= ytdMonth).reduce((s, e) => s + e.grossBookedSales, 0);
        const totalYtd = entries.filter((e) => e.year === year && e.month <= ytdMonth).reduce((s, e) => s + e.grossBookedSales, 0);
        return totalYtd ? deptYtd / totalYtd : 0;
      }
      const deptEntries = entries.filter((e) => e.departmentId === deptId && e.year === year && e.month <= ytdMonth);
      const ts = deptEntries.reduce((s, e) => s + e.grossBookedSales, 0);
      return ts ? deptEntries.reduce((s, e) => s + e.grossBookedSales * computeMetric(e, metric), 0) / ts : 0;
    }
    let sum = 0;
    for (let m = 1; m <= ytdMonth; m++) sum += getVal(deptId, year, m);
    return sum;
  };

  const getGrandYtd = (year: number): number => {
    if (isPctMetric) {
      if (metric === "salesMix") return 1;
      const ye = entries.filter((e) => e.year === year && e.month <= ytdMonth);
      const ts = ye.reduce((s, e) => s + e.grossBookedSales, 0);
      return ts ? ye.reduce((s, e) => s + e.grossBookedSales * computeMetric(e, metric), 0) / ts : 0;
    }
    let sum = 0;
    for (let m = 1; m <= ytdMonth; m++) sum += getGrandVal(year, m);
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
    { key: "2025a", label: "2025 (A)", year: 2025, style: "text-gray-400" },
    { key: "2026f", label: "2026 (F)", year: 2026, style: "text-gray-900" },
    { key: "2026a", label: "2026 (A)", year: null, style: "text-blue-600" },
  ];

  // Render a department block
  const renderDeptBlock = (dept: { id: string; name: string } | null, label: string, deptIdx: number) => {
    const isDeptLevel = dept !== null;
    const deptRowSpan = 6;

    const getMonthly = (year: number, month: number) =>
      isDeptLevel ? getVal(dept!.id, year, month) : getGrandVal(year, month);
    const getFy = (year: number) =>
      isDeptLevel ? getFyTotal(dept!.id, year) : getGrandFy(year);
    const getYtdVal = (year: number) =>
      isDeptLevel ? getYtd(dept!.id, year) : getGrandYtd(year);

    const isEvenDept = deptIdx % 2 === 0;
    const baseBg = !isDeptLevel ? "bg-gray-800/[0.03]" : (isEvenDept ? "" : "bg-gray-50/50");
    const stickyBg = !isDeptLevel ? "bg-[#f7f7f7]" : (isEvenDept ? "bg-white" : "bg-[#fbfbfb]");

    return (
      <React.Fragment key={label}>
        {/* Data rows: 2025(A), 2026(F), 2026(A) */}
        {dataRows.map((row, rowIdx) => {
          const monthlyVals = MONTHS.map((_, i) => row.year ? getMonthly(row.year, i + 1) : 0);
          const ytdVal = row.year ? getYtdVal(row.year) : 0;
          const fyVal = row.year ? getFy(row.year) : 0;
          const is2026f = row.key === "2026f";

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
                      {row.year === null ? <span className="text-gray-300">—</span> : (val ? fmtVal(metric, val) : <span className="text-gray-300">—</span>)}
                    </span>
                  </div>
                </td>
              ))}
              <td className={`px-2 py-1.5 text-right font-semibold tabular-nums ${is2026f ? "bg-brand-50/60" : "bg-blue-50/40"} border-l border-gray-100`}>
                {row.year === null ? <span className="text-gray-300">—</span> : (ytdVal ? fmtVal(metric, ytdVal) : <span className="text-gray-300">—</span>)}
              </td>
              <td className={`px-2 py-1.5 text-right font-semibold tabular-nums ${is2026f ? "bg-gray-100/60" : "bg-gray-50/60"} border-l border-gray-100`}>
                {row.year === null ? <span className="text-gray-300">—</span> : (fyVal ? fmtVal(metric, fyVal) : <span className="text-gray-300">—</span>)}
              </td>
            </tr>
          );
        })}

        {/* Variance rows */}
        {(() => {
          const fy26f = getFy(2026);
          const fy25a = getFy(2025);
          const ytd26f = getYtdVal(2026);
          const ytd25a = getYtdVal(2025);

          const varRows = [
            {
              key: "a-vs-fcst",
              label: "A vs Fcst",
              hasData: false,
              getMonthVar: () => ({ str: "—", color: "text-gray-300" }),
              ytdStr: "—",
              ytdColor: "text-gray-300",
              fyStr: "—",
              fyColor: "text-gray-300",
            },
            {
              key: "a-vs-ly",
              label: "A vs LY",
              hasData: false,
              getMonthVar: () => ({ str: "—", color: "text-gray-300" }),
              ytdStr: "—",
              ytdColor: "text-gray-300",
              fyStr: "—",
              fyColor: "text-gray-300",
            },
            {
              key: "f-vs-ly",
              label: "F vs LY",
              hasData: true,
              getMonthVar: (month: number) => {
                const v26 = getMonthly(2026, month);
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
                <th className="px-2 py-2.5 text-center font-bold text-[10px] uppercase tracking-wider bg-brand-dark border-l border-brand/30">YTD</th>
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
