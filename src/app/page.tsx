"use client";

import { useState, useEffect, useCallback } from "react";
import RollupTable from "@/components/RollupTable";
import ForecastChart from "@/components/ForecastChart";
import { METRIC_LABELS, formatCurrency, formatPct, type MetricKey } from "@/lib/constants";
import { exportDashboardToExcel } from "@/lib/exportExcel";

type EntryData = {
  departmentId: string;
  departmentName: string;
  year: number;
  month: number;
  grossBookedSales: number;
  gmPercent: number;
  cpPercent: number;
};

type RawEntry = {
  departmentId: string;
  department: { name: string };
  year: number;
  month: number;
  grossBookedSales: number;
  gmPercent: number;
  cpPercent: number;
};

const METRIC_KEYS: MetricKey[] = [
  "grossBookedSales", "gmDollars", "gmPercent", "cpDollars", "cpPercent", "salesMix",
];

function computeSummary(entries: EntryData[], year: number) {
  const yearEntries = entries.filter((e) => e.year === year);
  const totalSales = yearEntries.reduce((s, e) => s + e.grossBookedSales, 0);
  const totalGmDollars = yearEntries.reduce((s, e) => s + e.grossBookedSales * e.gmPercent, 0);
  const totalCpDollars = yearEntries.reduce((s, e) => s + e.grossBookedSales * e.cpPercent, 0);
  const gmPct = totalSales ? totalGmDollars / totalSales : 0;
  const cpPct = totalSales ? totalCpDollars / totalSales : 0;
  return { totalSales, totalGmDollars, totalCpDollars, gmPct, cpPct };
}

export default function Dashboard() {
  const [entries, setEntries] = useState<EntryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState<MetricKey>("grossBookedSales");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [res2025, res2026] = await Promise.all([
      fetch("/api/entries?year=2025"),
      fetch("/api/entries?year=2026"),
    ]);
    const data2025: RawEntry[] = await res2025.json();
    const data2026: RawEntry[] = await res2026.json();

    const all = [...data2025, ...data2026].map((e) => ({
      departmentId: e.departmentId,
      departmentName: e.department.name,
      year: e.year,
      month: e.month,
      grossBookedSales: e.grossBookedSales,
      gmPercent: e.gmPercent,
      cpPercent: e.cpPercent,
    }));

    setEntries(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Loading dashboard...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          KKH Rolling Forecast
        </h1>
        <p className="text-gray-500 mb-6">
          No data yet. Start by seeding departments in Admin, then enter numbers
          on the Input page.
        </p>
        <div className="flex gap-3 justify-center">
          <a href="/admin" className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-neutral-800 transition-colors">
            Go to Admin
          </a>
          <a href="/input" className="bg-brand text-white px-4 py-2 rounded text-sm font-medium hover:bg-brand-dark transition-colors">
            Go to Input
          </a>
        </div>
      </div>
    );
  }

  const s25 = computeSummary(entries, 2025);
  const s26 = computeSummary(entries, 2026);

  const summaryRows = [
    { label: "Gross Booked Sales", val26: s26.totalSales, val25: s25.totalSales, fmt: formatCurrency },
    { label: "GM $", val26: s26.totalGmDollars, val25: s25.totalGmDollars, fmt: formatCurrency },
    { label: "GM %", val26: s26.gmPct, val25: s25.gmPct, fmt: formatPct },
    { label: "CP $", val26: s26.totalCpDollars, val25: s25.totalCpDollars, fmt: formatCurrency },
    { label: "CP %", val26: s26.cpPct, val25: s25.cpPct, fmt: formatPct },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">
          FY Forecast Dashboard
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-neutral-100 rounded p-1 flex-wrap">
            {METRIC_KEYS.map((m) => (
              <button
                key={m}
                onClick={() => setActiveMetric(m)}
                className={`px-3 py-1.5 rounded text-xs font-medium uppercase tracking-wide transition-colors ${
                  activeMetric === m
                    ? "bg-brand text-white shadow"
                    : "text-neutral-500 hover:text-black"
                }`}
              >
                {METRIC_LABELS[m]}
              </button>
            ))}
          </div>
          <button
            onClick={() => exportDashboardToExcel(entries, activeMetric)}
            className="px-4 py-1.5 rounded text-xs font-medium uppercase tracking-wide bg-black text-white hover:bg-neutral-800 transition-colors"
          >
            Export to Excel
          </button>
        </div>
      </div>

      {/* Charts + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <ForecastChart
          entries={entries}
          metric={activeMetric}
          title={`${METRIC_LABELS[activeMetric]} — 2025 vs 2026`}
        />
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            FY Summary
          </h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium text-gray-400 uppercase"></th>
                <th className="text-right py-2 font-medium text-gray-400 uppercase">2025</th>
                <th className="text-right py-2 font-medium text-gray-400 uppercase">2026</th>
                <th className="text-right py-2 font-medium text-gray-400 uppercase">Delta</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row) => {
                const isPct = row.fmt === formatPct;
                const delta = isPct ? row.val26 - row.val25 : (row.val25 !== 0 ? ((row.val26 - row.val25) / Math.abs(row.val25)) * 100 : 0);
                const deltaStr = isPct
                  ? `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)}pp`
                  : (row.val25 !== 0 ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%` : "—");
                const deltaColor = delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-gray-400";
                return (
                  <tr key={row.label} className="border-b last:border-0">
                    <td className="py-2.5 font-semibold text-gray-600 uppercase">{row.label}</td>
                    <td className="py-2.5 text-right text-gray-500">{row.fmt(row.val25)}</td>
                    <td className="py-2.5 text-right font-bold">{row.fmt(row.val26)}</td>
                    <td className={`py-2.5 text-right font-semibold ${deltaColor}`}>{deltaStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rollup Table */}
      <RollupTable
        entries={entries}
        metric={activeMetric}
        title={`${METRIC_LABELS[activeMetric]} by Department — Monthly`}
      />
    </div>
  );
}
