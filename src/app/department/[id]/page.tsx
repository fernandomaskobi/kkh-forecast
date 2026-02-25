"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import ForecastChart from "@/components/ForecastChart";
import {
  MONTHS, METRIC_LABELS, formatCurrency, formatPct, formatVariance,
  type MetricKey,
} from "@/lib/constants";

type Entry = {
  year: number;
  month: number;
  type: string;
  grossBookedSales: number;
  gmPercent: number;
  cpPercent: number;
  updatedBy: string | null;
  updatedAt: string;
};

type Department = { id: string; name: string };

const CHART_METRICS: MetricKey[] = ["grossBookedSales", "gmDollars", "gmPercent", "cpDollars", "cpPercent"];

function calcMetric(e: Entry, metric: MetricKey): number {
  switch (metric) {
    case "grossBookedSales": return e.grossBookedSales;
    case "gmDollars": return e.grossBookedSales * e.gmPercent;
    case "gmPercent": return e.gmPercent;
    case "cpDollars": return e.grossBookedSales * e.cpPercent;
    case "cpPercent": return e.cpPercent;
    default: return 0;
  }
}

function fmtVal(metric: MetricKey, value: number): string {
  if (metric === "gmPercent" || metric === "cpPercent") return formatPct(value);
  return formatCurrency(value);
}

export default function DepartmentDetail() {
  const params = useParams();
  const id = params.id as string;

  const [dept, setDept] = useState<Department | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [deptRes, e2025Res, e2026Res] = await Promise.all([
      fetch("/api/departments"),
      fetch(`/api/entries?departmentId=${id}&year=2025`),
      fetch(`/api/entries?departmentId=${id}&year=2026`),
    ]);

    const depts: Department[] = await deptRes.json();
    setDept(depts.find((d) => d.id === id) || null);

    const e2025: Entry[] = await e2025Res.json();
    const e2026: Entry[] = await e2026Res.json();
    setEntries([...e2025, ...e2026]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>;
  }
  if (!dept) {
    return <div className="text-center py-20 text-gray-500">Department not found.</div>;
  }

  const getVal = (year: number, month: number, metric: MetricKey): number => {
    const entry = entries.find((e) => e.year === year && e.month === month);
    if (!entry) return 0;
    return calcMetric(entry, metric);
  };

  const isPct = (m: MetricKey) => m === "gmPercent" || m === "cpPercent";

  const tableMetrics: MetricKey[] = ["grossBookedSales", "gmDollars", "gmPercent", "cpDollars", "cpPercent"];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <a href="/" className="text-gray-400 hover:text-gray-600 text-sm">&larr; Dashboard</a>
        <h1 className="text-2xl font-bold text-gray-800">{dept.name}</h1>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {(["grossBookedSales", "gmDollars", "cpDollars"] as MetricKey[]).map((metric) => (
          <ForecastChart
            key={metric}
            entries={entries}
            metric={metric}
            title={`${METRIC_LABELS[metric]} — 2025 vs 2026`}
          />
        ))}
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Monthly Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left px-2 py-2 border font-medium min-w-[130px]">Metric</th>
                <th className="px-2 py-2 border font-medium text-center">Year</th>
                {MONTHS.map((m) => (
                  <th key={m} className="px-2 py-2 border text-center font-medium">{m}</th>
                ))}
                <th className="px-2 py-2 border text-center font-semibold bg-gray-200">FY Total</th>
              </tr>
            </thead>
            <tbody>
              {tableMetrics.map((metric) => (
                <React.Fragment key={metric}>
                  {[2025, 2026].map((year) => {
                    const vals = MONTHS.map((_, i) => getVal(year, i + 1, metric));
                    const total = isPct(metric)
                      ? (() => {
                          const ye = entries.filter((e) => e.year === year);
                          const ts = ye.reduce((s, e) => s + e.grossBookedSales, 0);
                          if (!ts) return 0;
                          return ye.reduce((s, e) => s + e.grossBookedSales * calcMetric(e, metric), 0) / ts;
                        })()
                      : vals.reduce((a, b) => a + b, 0);

                    return (
                      <tr key={`${metric}-${year}`} className={`hover:bg-gray-50 ${year === 2025 ? "text-gray-400" : ""}`}>
                        {year === 2025 ? (
                          <td className="px-2 py-1.5 border font-medium" rowSpan={3}>{METRIC_LABELS[metric]}</td>
                        ) : null}
                        <td className="px-2 py-1.5 border text-center text-[10px] font-medium">{year}</td>
                        {vals.map((val, i) => (
                          <td key={i} className="px-2 py-1.5 border text-right">
                            {val ? fmtVal(metric, val) : "—"}
                          </td>
                        ))}
                        <td className="px-2 py-1.5 border text-right font-semibold bg-gray-50">
                          {total ? fmtVal(metric, total) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Variance row */}
                  <tr key={`${metric}-var`} className="bg-yellow-50/50">
                    <td className="px-2 py-1 border text-center text-[10px] font-medium text-gray-400">Var%</td>
                    {MONTHS.map((_, i) => {
                      const v25 = getVal(2025, i + 1, metric);
                      const v26 = getVal(2026, i + 1, metric);
                      const pct = v25 !== 0 ? ((v26 - v25) / Math.abs(v25)) * 100 : 0;
                      return (
                        <td key={i} className={`px-2 py-1 border text-right text-[10px] ${pct > 0 ? "text-green-600" : pct < 0 ? "text-red-600" : "text-gray-400"}`}>
                          {v25 || v26 ? formatVariance(pct) : "—"}
                        </td>
                      );
                    })}
                    {(() => {
                      const t25 = MONTHS.reduce((s, _, i) => s + getVal(2025, i + 1, metric), 0);
                      const t26 = MONTHS.reduce((s, _, i) => s + getVal(2026, i + 1, metric), 0);
                      const pct = t25 !== 0 ? ((t26 - t25) / Math.abs(t25)) * 100 : 0;
                      return (
                        <td className={`px-2 py-1 border text-right text-[10px] font-semibold ${pct > 0 ? "text-green-600" : pct < 0 ? "text-red-600" : "text-gray-400"}`}>
                          {t25 || t26 ? formatVariance(pct) : "—"}
                        </td>
                      );
                    })()}
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Last updated info */}
      {entries.length > 0 && (
        <div className="mt-4 text-xs text-gray-400">
          Last updated:{" "}
          {new Date(Math.max(...entries.map((e) => new Date(e.updatedAt).getTime()))).toLocaleString()}
          {entries.find((e) => e.updatedBy) && ` by ${entries.find((e) => e.updatedBy)?.updatedBy}`}
        </div>
      )}
    </div>
  );
}
