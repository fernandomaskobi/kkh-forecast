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
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
        Department Sales Mix — 2025 vs 2026
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            {/* Month header row */}
            <tr className="bg-gray-100">
              <th className="text-left px-2 py-2 border font-medium sticky left-0 bg-gray-100 z-10 min-w-[120px]" rowSpan={2}>
                Department
              </th>
              {MONTHS.map((m) => (
                <th key={m} className="px-1 py-1 border text-center font-medium" colSpan={3}>
                  {m}
                </th>
              ))}
              <th className="px-1 py-1 border text-center font-semibold bg-gray-200" colSpan={3}>
                FY Total
              </th>
            </tr>
            {/* Sub-header: 25 / 26 / Δ for each month */}
            <tr className="bg-gray-50">
              {[...MONTHS, "FY"].map((m) => (
                <React.Fragment key={m}>
                  <th className="px-1 py-1 border text-center text-[9px] text-gray-400 font-medium min-w-[40px]">25</th>
                  <th className="px-1 py-1 border text-center text-[9px] text-gray-400 font-medium min-w-[40px]">26</th>
                  <th className="px-1 py-1 border text-center text-[9px] text-gray-400 font-medium bg-gray-100 min-w-[36px]">Δpp</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {deptList.map((dept) => {
              const fyMix25 = getFyMix(dept.id, 2025);
              const fyMix26 = getFyMix(dept.id, 2026);
              const fyDelta = fyMix26 - fyMix25;

              return (
                <tr key={dept.id} className="hover:bg-gray-50">
                  <td className="px-2 py-1.5 border font-medium sticky left-0 bg-white z-10">
                    <a href={`/department/${dept.id}`} className="text-brand hover:underline">
                      {dept.name}
                    </a>
                  </td>
                  {MONTHS.map((_, i) => {
                    const month = i + 1;
                    const mix25 = getMix(dept.id, 2025, month);
                    const mix26 = getMix(dept.id, 2026, month);
                    const delta = mix26 - mix25;
                    const deltaColor =
                      delta > 0.001 ? "text-green-600 bg-green-50" : delta < -0.001 ? "text-red-600 bg-red-50" : "text-gray-400";

                    return (
                      <React.Fragment key={i}>
                        <td className="px-1 py-1.5 border text-right text-gray-500">{mix25 ? fmtPct(mix25) : "—"}</td>
                        <td className="px-1 py-1.5 border text-right">{mix26 ? fmtPct(mix26) : "—"}</td>
                        <td className={`px-1 py-1.5 border text-right text-[10px] font-medium ${deltaColor}`}>
                          {mix25 || mix26 ? fmtDelta(delta) : "—"}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  {/* FY Total columns */}
                  <td className="px-1 py-1.5 border text-right text-gray-500 bg-gray-50 font-semibold">
                    {fyMix25 ? fmtPct(fyMix25) : "—"}
                  </td>
                  <td className="px-1 py-1.5 border text-right bg-gray-50 font-semibold">
                    {fyMix26 ? fmtPct(fyMix26) : "—"}
                  </td>
                  <td
                    className={`px-1 py-1.5 border text-right text-[10px] font-bold ${
                      fyDelta > 0.001 ? "bg-green-100 text-green-700" : fyDelta < -0.001 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {fyMix25 || fyMix26 ? fmtDelta(fyDelta) : "—"}
                  </td>
                </tr>
              );
            })}

            {/* Total row — should sum to 100% */}
            <tr className="bg-gray-100 font-semibold">
              <td className="px-2 py-1.5 border sticky left-0 bg-gray-100 z-10">TOTAL</td>
              {MONTHS.map((_, i) => (
                <React.Fragment key={i}>
                  <td className="px-1 py-1.5 border text-right text-gray-500">100.0%</td>
                  <td className="px-1 py-1.5 border text-right">100.0%</td>
                  <td className="px-1 py-1.5 border text-right text-gray-400 text-[10px]">0.0</td>
                </React.Fragment>
              ))}
              <td className="px-1 py-1.5 border text-right text-gray-500 bg-gray-200">100.0%</td>
              <td className="px-1 py-1.5 border text-right bg-gray-200">100.0%</td>
              <td className="px-1 py-1.5 border text-right text-gray-400 bg-gray-200 text-[10px]">0.0</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
