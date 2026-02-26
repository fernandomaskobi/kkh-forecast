"use client";

import React from "react";
import { MONTHS } from "@/lib/constants";

type EntryData = {
  departmentId: string;
  departmentName: string;
  year: number;
  month: number;
  grossBookedSales: number;
  gmPercent: number;
  cpPercent: number;
};

type SalesMixTableProps = {
  entries: EntryData[];
};

function fmtPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function fmtDelta(value: number): string {
  const pp = value * 100;
  return `${pp >= 0 ? "+" : ""}${pp.toFixed(1)}`;
}

export default function SalesMixTable({ entries }: SalesMixTableProps) {
  // Build department list
  const departments = new Map<string, { name: string; id: string }>();
  for (const e of entries) {
    if (!departments.has(e.departmentId)) {
      departments.set(e.departmentId, { name: e.departmentName, id: e.departmentId });
    }
  }
  const deptList = Array.from(departments.values()).sort((a, b) => a.name.localeCompare(b.name));

  // Compute monthly totals per year
  const monthTotals: Record<string, number> = {};
  for (const e of entries) {
    const key = `${e.year}-${e.month}`;
    monthTotals[key] = (monthTotals[key] || 0) + e.grossBookedSales;
  }

  // Compute FY totals per year
  const fyTotals: Record<number, number> = {};
  for (const e of entries) {
    fyTotals[e.year] = (fyTotals[e.year] || 0) + e.grossBookedSales;
  }

  // Get dept sales for a year/month
  const getDeptSales = (deptId: string, year: number, month: number): number => {
    return entries
      .filter((e) => e.departmentId === deptId && e.year === year && e.month === month)
      .reduce((s, e) => s + e.grossBookedSales, 0);
  };

  // Get dept FY sales
  const getDeptFySales = (deptId: string, year: number): number => {
    return entries
      .filter((e) => e.departmentId === deptId && e.year === year)
      .reduce((s, e) => s + e.grossBookedSales, 0);
  };

  // Get mix percentage
  const getMix = (deptId: string, year: number, month: number): number => {
    const total = monthTotals[`${year}-${month}`] || 0;
    if (!total) return 0;
    return getDeptSales(deptId, year, month) / total;
  };

  const getFyMix = (deptId: string, year: number): number => {
    const total = fyTotals[year] || 0;
    if (!total) return 0;
    return getDeptFySales(deptId, year) / total;
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
          Department Sales Mix — 2025 vs 2026
        </h3>
        <span className="text-[10px] text-gray-400 font-medium">
          {deptList.length} department{deptList.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              {/* Month header row */}
              <tr className="bg-gray-900 text-white">
                <th className="text-left px-3 py-2.5 font-semibold sticky left-0 bg-gray-900 z-10 min-w-[130px] text-[10px] uppercase tracking-wider" rowSpan={2}>
                  Department
                </th>
                {MONTHS.map((m) => (
                  <th key={m} className="px-1 py-1.5 text-center font-semibold text-[10px] uppercase tracking-wider" colSpan={3}>
                    {m}
                  </th>
                ))}
                <th className="px-1 py-1.5 text-center font-bold text-[10px] uppercase tracking-wider bg-gray-800 border-l border-gray-700" colSpan={3}>
                  FY Total
                </th>
              </tr>
              {/* Sub-header: 25 / 26 / Δ for each month */}
              <tr className="bg-gray-800 text-gray-300">
                {[...MONTHS, "FY"].map((m) => (
                  <React.Fragment key={m}>
                    <th className="px-1 py-1 text-center text-[8px] font-medium min-w-[38px]">25</th>
                    <th className="px-1 py-1 text-center text-[8px] font-medium min-w-[38px]">26</th>
                    <th className="px-1 py-1 text-center text-[8px] font-medium bg-gray-700/50 min-w-[34px]">Δpp</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {deptList.map((dept, idx) => {
                const fyMix25 = getFyMix(dept.id, 2025);
                const fyMix26 = getFyMix(dept.id, 2026);
                const fyDelta = fyMix26 - fyMix25;
                const isEven = idx % 2 === 0;

                return (
                  <tr key={dept.id} className={`${isEven ? "" : "bg-gray-50/50"} hover:bg-gray-100/50 transition-colors`}>
                    <td className={`px-3 py-1.5 font-medium sticky left-0 ${isEven ? "bg-white" : "bg-[#fbfbfb]"} z-10 border-r border-gray-100`}>
                      <a href={`/department/${dept.id}`} className="text-brand hover:text-brand-dark hover:underline transition-colors">
                        {dept.name}
                      </a>
                    </td>
                    {MONTHS.map((_, i) => {
                      const month = i + 1;
                      const mix25 = getMix(dept.id, 2025, month);
                      const mix26 = getMix(dept.id, 2026, month);
                      const delta = mix26 - mix25;
                      const deltaColor =
                        delta > 0.001 ? "text-emerald-600 bg-emerald-50/60" : delta < -0.001 ? "text-rose-600 bg-rose-50/60" : "text-gray-300";

                      return (
                        <React.Fragment key={i}>
                          <td className="px-1 py-1.5 text-right text-gray-400 tabular-nums">{mix25 ? fmtPct(mix25) : "—"}</td>
                          <td className="px-1 py-1.5 text-right tabular-nums">{mix26 ? fmtPct(mix26) : "—"}</td>
                          <td className={`px-1 py-1.5 text-right text-[10px] font-medium tabular-nums ${deltaColor}`}>
                            {mix25 || mix26 ? fmtDelta(delta) : "—"}
                          </td>
                        </React.Fragment>
                      );
                    })}
                    {/* FY Total columns */}
                    <td className="px-1 py-1.5 text-right text-gray-400 bg-gray-50/60 font-semibold tabular-nums border-l border-gray-100">
                      {fyMix25 ? fmtPct(fyMix25) : "—"}
                    </td>
                    <td className="px-1 py-1.5 text-right bg-gray-50/60 font-semibold tabular-nums">
                      {fyMix26 ? fmtPct(fyMix26) : "—"}
                    </td>
                    <td
                      className={`px-1 py-1.5 text-right text-[10px] font-bold tabular-nums ${
                        fyDelta > 0.001 ? "bg-emerald-100/80 text-emerald-700" : fyDelta < -0.001 ? "bg-rose-100/80 text-rose-600" : "bg-gray-100/60 text-gray-400"
                      }`}
                    >
                      {fyMix25 || fyMix26 ? fmtDelta(fyDelta) : "—"}
                    </td>
                  </tr>
                );
              })}

              {/* Total row */}
              <tr className="bg-gray-800/[0.03] font-semibold border-t border-gray-200">
                <td className="px-3 py-1.5 sticky left-0 bg-[#f7f7f7] z-10 border-r border-gray-100 text-[11px] uppercase tracking-wider text-gray-700">TOTAL</td>
                {MONTHS.map((_, i) => (
                  <React.Fragment key={i}>
                    <td className="px-1 py-1.5 text-right text-gray-400 tabular-nums">100.0%</td>
                    <td className="px-1 py-1.5 text-right tabular-nums">100.0%</td>
                    <td className="px-1 py-1.5 text-right text-gray-300 text-[10px] tabular-nums">0.0</td>
                  </React.Fragment>
                ))}
                <td className="px-1 py-1.5 text-right text-gray-400 bg-gray-100/60 tabular-nums border-l border-gray-100">100.0%</td>
                <td className="px-1 py-1.5 text-right bg-gray-100/60 tabular-nums">100.0%</td>
                <td className="px-1 py-1.5 text-right text-gray-300 bg-gray-100/60 text-[10px] tabular-nums">0.0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
