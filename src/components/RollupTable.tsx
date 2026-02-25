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
    case "salesMix": return entry.grossBookedSales; // handled separately
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
  const years = [2025, 2026];

  // For sales mix: get total per month per year
  const monthTotals: Record<string, number> = {};
  for (const e of entries) {
    const key = `${e.year}-${e.month}`;
    monthTotals[key] = (monthTotals[key] || 0) + e.grossBookedSales;
  }

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
      // Weighted average by sales
      const totalSales = matching.reduce((s, e) => s + e.grossBookedSales, 0);
      if (!totalSales) return 0;
      return matching.reduce((s, e) => s + e.grossBookedSales * computeMetric(e, metric), 0) / totalSales;
    }
    return matching.reduce((s, e) => s + computeMetric(e, metric), 0);
  };

  const isPctMetric = metric === "gmPercent" || metric === "cpPercent" || metric === "salesMix";

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left px-2 py-2 border font-medium sticky left-0 bg-gray-100 z-10 min-w-[120px]">Department</th>
              <th className="px-2 py-2 border font-medium bg-gray-200 text-center">Year</th>
              {MONTHS.map((m) => (
                <th key={m} className="px-2 py-2 border text-center font-medium">{m}</th>
              ))}
              <th className="px-2 py-2 border text-center font-semibold bg-gray-200">FY 2025</th>
              <th className="px-2 py-2 border text-center font-semibold bg-gray-200">FY 2026</th>
              <th className="px-2 py-2 border text-center font-semibold bg-gray-300">Delta</th>
            </tr>
          </thead>
          <tbody>
            {deptList.map((dept) => {
              const getFyTotal = (year: number) => {
                if (isPctMetric) {
                  if (metric === "salesMix") {
                    const deptTotal = entries.filter((e) => e.departmentId === dept.id && e.year === year).reduce((s, e) => s + e.grossBookedSales, 0);
                    const yearTotal = entries.filter((e) => e.year === year).reduce((s, e) => s + e.grossBookedSales, 0);
                    return yearTotal ? deptTotal / yearTotal : 0;
                  }
                  const deptEntries = entries.filter((e) => e.departmentId === dept.id && e.year === year);
                  const ts = deptEntries.reduce((s, e) => s + e.grossBookedSales, 0);
                  return ts ? deptEntries.reduce((s, e) => s + e.grossBookedSales * computeMetric(e, metric), 0) / ts : 0;
                }
                return MONTHS.reduce((s, _, i) => s + getVal(dept.id, year, i + 1), 0);
              };
              const fy25 = getFyTotal(2025);
              const fy26 = getFyTotal(2026);
              const fyDeltaPct = fy25 !== 0 ? ((fy26 - fy25) / Math.abs(fy25)) * 100 : 0;
              const hasFyData = fy25 !== 0 || fy26 !== 0;

              return (
                <React.Fragment key={dept.id}>
                  {years.map((year) => {
                    const monthlyVals = MONTHS.map((_, i) => getVal(dept.id, year, i + 1));
                    return (
                      <tr key={`${dept.id}-${year}`} className={`hover:bg-gray-50 ${year === 2025 ? "text-gray-500" : ""}`}>
                        {year === 2025 ? (
                          <td className="px-2 py-1.5 border font-medium sticky left-0 bg-white z-10" rowSpan={3}>
                            <a href={`/department/${dept.id}`} className="text-brand hover:underline">{dept.name}</a>
                          </td>
                        ) : null}
                        <td className="px-2 py-1.5 border text-center font-medium text-[10px]">{year}</td>
                        {monthlyVals.map((val, i) => (
                          <td key={i} className="px-2 py-1.5 border text-right">{val ? fmtVal(metric, val) : "—"}</td>
                        ))}
                        {year === 2025 ? (
                          <>
                            <td className="px-2 py-1.5 border text-right font-semibold bg-gray-50" rowSpan={1}>{fy25 ? fmtVal(metric, fy25) : "—"}</td>
                            <td className="px-2 py-1.5 border text-right font-semibold bg-gray-50" rowSpan={1}>{fy26 ? fmtVal(metric, fy26) : "—"}</td>
                            <td className={`px-2 py-1.5 border text-right font-semibold text-[10px] ${fyDeltaPct > 0 ? "bg-green-50 text-green-700" : fyDeltaPct < 0 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-400"}`} rowSpan={1}>
                              {hasFyData ? formatVariance(fyDeltaPct) : "—"}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-2 py-1.5 border bg-gray-50" rowSpan={1}></td>
                            <td className="px-2 py-1.5 border bg-gray-50" rowSpan={1}></td>
                            <td className="px-2 py-1.5 border bg-gray-50" rowSpan={1}></td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {/* Variance row */}
                  <tr key={`${dept.id}-var`} className="bg-yellow-50/50">
                    <td className="px-2 py-1 border text-center text-[10px] font-medium text-gray-400">Var%</td>
                    {MONTHS.map((_, i) => {
                      const v25 = getVal(dept.id, 2025, i + 1);
                      const v26 = getVal(dept.id, 2026, i + 1);
                      const pct = v25 !== 0 ? ((v26 - v25) / Math.abs(v25)) * 100 : 0;
                      return (
                        <td key={i} className={`px-2 py-1 border text-right text-[10px] ${pct > 0 ? "text-green-600" : pct < 0 ? "text-red-600" : "text-gray-400"}`}>
                          {v25 || v26 ? formatVariance(pct) : "—"}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 border bg-yellow-50/50" colSpan={3}></td>
                  </tr>
                </React.Fragment>
              );
            })}

            {/* Grand total */}
            {deptList.length > 1 && (() => {
              const getGrandTotal = (year: number) => {
                if (isPctMetric) {
                  if (metric === "salesMix") return 1;
                  const ye = entries.filter((e) => e.year === year);
                  const ts = ye.reduce((s, e) => s + e.grossBookedSales, 0);
                  return ts ? ye.reduce((s, e) => s + e.grossBookedSales * computeMetric(e, metric), 0) / ts : 0;
                }
                return MONTHS.reduce((s, _, i) => {
                  return s + deptList.reduce((sum, dept) => sum + getVal(dept.id, year, i + 1), 0);
                }, 0);
              };
              const gt25 = getGrandTotal(2025);
              const gt26 = getGrandTotal(2026);
              const gtDeltaPct = gt25 !== 0 ? ((gt26 - gt25) / Math.abs(gt25)) * 100 : 0;
              const hasGtData = gt25 !== 0 || gt26 !== 0;

              return years.map((year) => {
                const monthlyTotals = MONTHS.map((_, i) => {
                  if (isPctMetric && metric !== "salesMix") {
                    const yearMonth = entries.filter((e) => e.year === year && e.month === i + 1);
                    const ts = yearMonth.reduce((s, e) => s + e.grossBookedSales, 0);
                    return ts ? yearMonth.reduce((s, e) => s + e.grossBookedSales * computeMetric(e, metric), 0) / ts : 0;
                  }
                  if (metric === "salesMix") return 1;
                  return deptList.reduce((sum, dept) => sum + getVal(dept.id, year, i + 1), 0);
                });

                return (
                  <tr key={`total-${year}`} className="bg-gray-100 font-semibold">
                    {year === 2025 ? (
                      <td className="px-2 py-1.5 border sticky left-0 bg-gray-100 z-10" rowSpan={2}>TOTAL</td>
                    ) : null}
                    <td className="px-2 py-1.5 border text-center text-[10px]">{year}</td>
                    {monthlyTotals.map((val, i) => (
                      <td key={i} className="px-2 py-1.5 border text-right">{val ? fmtVal(metric, val) : "—"}</td>
                    ))}
                    {year === 2025 ? (
                      <>
                        <td className="px-2 py-1.5 border text-right bg-gray-200">{gt25 ? fmtVal(metric, gt25) : "—"}</td>
                        <td className="px-2 py-1.5 border text-right bg-gray-200">{gt26 ? fmtVal(metric, gt26) : "—"}</td>
                        <td className={`px-2 py-1.5 border text-right text-[10px] ${gtDeltaPct > 0 ? "bg-green-100 text-green-700" : gtDeltaPct < 0 ? "bg-red-100 text-red-600" : "bg-gray-200 text-gray-400"}`}>
                          {hasGtData ? formatVariance(gtDeltaPct) : "—"}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-1.5 border bg-gray-200"></td>
                        <td className="px-2 py-1.5 border bg-gray-200"></td>
                        <td className="px-2 py-1.5 border bg-gray-200"></td>
                      </>
                    )}
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
