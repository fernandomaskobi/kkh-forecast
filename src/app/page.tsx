"use client";

import { useState, useEffect, useCallback } from "react";
import RollupTable from "@/components/RollupTable";
import ForecastChart from "@/components/ForecastChart";
import SalesMixTable from "@/components/SalesMixTable";
import T12TrendChart from "@/components/T12TrendChart";
import BudgetFcstWaterfall from "@/components/BudgetFcstWaterfall";
import AiInsights from "@/components/AiInsights";
import { METRIC_LABELS, formatCurrency, formatPct, type MetricKey } from "@/lib/constants";
import { exportDashboardToExcel } from "@/lib/exportExcel";
import { exportDashboardToPdf } from "@/lib/exportPdf";

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

// AOP (Annual Operating Plan) targets
const AOP_SALES = 57_050_000;
const AOP_GM_PCT = 0.505;
const AOP_CP_PCT = 0.467;

export default function Dashboard() {
  const [entries, setEntries] = useState<EntryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState<MetricKey>("grossBookedSales");
  const [selectedDept, setSelectedDept] = useState<string>("all");

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
      <div className="space-y-4 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-5">
              <div className="shimmer h-3 w-20 rounded mb-3" />
              <div className="shimmer h-7 w-28 rounded mb-2" />
              <div className="shimmer h-3 w-16 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-4"><div className="shimmer h-[280px] rounded" /></div>
          <div className="card p-4"><div className="shimmer h-[280px] rounded" /></div>
        </div>
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

  // Build department list for dropdown
  const deptMap = new Map<string, string>();
  for (const e of entries) {
    if (!deptMap.has(e.departmentId)) deptMap.set(e.departmentId, e.departmentName);
  }
  const deptOptions = Array.from(deptMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Filter entries for summary based on selected department
  const summaryEntries = selectedDept === "all"
    ? entries
    : entries.filter((e) => e.departmentId === selectedDept);

  const s25 = computeSummary(summaryEntries, 2025);
  const s26 = computeSummary(summaryEntries, 2026);

  const isAllDepts = selectedDept === "all";

  const aopSales = AOP_SALES;
  const aopGmPct = AOP_GM_PCT;
  const aopGmDollars = aopSales * aopGmPct;
  const aopCpPct = AOP_CP_PCT;
  const aopCpDollars = aopSales * aopCpPct;

  // KPI computations
  const salesVsAop = aopSales ? ((s26.totalSales - aopSales) / aopSales) * 100 : 0;
  const salesVsLy = s25.totalSales ? ((s26.totalSales - s25.totalSales) / s25.totalSales) * 100 : 0;
  const gmVsAop = (s26.gmPct - aopGmPct) * 100; // pp
  const cpVsAop = (s26.cpPct - aopCpPct) * 100; // pp

  const selectedDeptName = !isAllDepts ? deptMap.get(selectedDept) : null;

  const kpiCards = [
    {
      label: selectedDeptName ? `${selectedDeptName} — Sales` : "2026 Forecast Sales",
      value: formatCurrency(s26.totalSales),
      badge: isAllDepts ? `${salesVsAop >= 0 ? "+" : ""}${salesVsAop.toFixed(1)}% vs AOP` : `${salesVsLy >= 0 ? "+" : ""}${salesVsLy.toFixed(1)}% vs LY`,
      badgeColor: (isAllDepts ? salesVsAop : salesVsLy) >= 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50",
      accent: "from-brand/20 to-brand/5",
      iconColor: "text-brand",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: selectedDeptName ? `${selectedDeptName} — GM %` : "Gross Margin %",
      value: formatPct(s26.gmPct),
      badge: isAllDepts ? `${gmVsAop >= 0 ? "+" : ""}${gmVsAop.toFixed(1)}pp vs AOP` : `${((s26.gmPct - s25.gmPct) * 100) >= 0 ? "+" : ""}${((s26.gmPct - s25.gmPct) * 100).toFixed(1)}pp vs LY`,
      badgeColor: (isAllDepts ? gmVsAop : (s26.gmPct - s25.gmPct)) >= 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50",
      accent: "from-teal-500/15 to-teal-500/5",
      iconColor: "text-teal-600",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      ),
    },
    {
      label: selectedDeptName ? `${selectedDeptName} — CP %` : "Contribution Profit %",
      value: formatPct(s26.cpPct),
      badge: isAllDepts ? `${cpVsAop >= 0 ? "+" : ""}${cpVsAop.toFixed(1)}pp vs AOP` : `${((s26.cpPct - s25.cpPct) * 100) >= 0 ? "+" : ""}${((s26.cpPct - s25.cpPct) * 100).toFixed(1)}pp vs LY`,
      badgeColor: (isAllDepts ? cpVsAop : (s26.cpPct - s25.cpPct)) >= 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50",
      accent: "from-indigo-500/15 to-indigo-500/5",
      iconColor: "text-indigo-600",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
        </svg>
      ),
    },
    {
      label: selectedDeptName ? `${selectedDeptName} — YoY` : "YoY Growth",
      value: `${salesVsLy >= 0 ? "+" : ""}${salesVsLy.toFixed(1)}%`,
      badge: `${formatCurrency(s26.totalSales - s25.totalSales)} delta`,
      badgeColor: salesVsLy >= 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50",
      accent: salesVsLy >= 0 ? "from-emerald-500/15 to-emerald-500/5" : "from-rose-500/15 to-rose-500/5",
      iconColor: salesVsLy >= 0 ? "text-emerald-600" : "text-rose-600",
      icon: salesVsLy >= 0 ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
        </svg>
      ),
    },
  ];

  const summaryRows = [
    { label: "Gross Booked Sales", val25: s25.totalSales, aop: aopSales, val26: s26.totalSales, fmt: formatCurrency },
    { label: "GM $", val25: s25.totalGmDollars, aop: aopGmDollars, val26: s26.totalGmDollars, fmt: formatCurrency },
    { label: "GM %", val25: s25.gmPct, aop: aopGmPct, val26: s26.gmPct, fmt: formatPct },
    { label: "CP $", val25: s25.totalCpDollars, aop: aopCpDollars, val26: s26.totalCpDollars, fmt: formatCurrency },
    { label: "CP %", val25: s25.cpPct, aop: aopCpPct, val26: s26.cpPct, fmt: formatPct },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            FY Forecast Dashboard
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">2026 Rolling Forecast vs 2025 Actuals</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-0.5 bg-white rounded-lg border p-1 flex-wrap shadow-sm">
            {METRIC_KEYS.map((m) => (
              <button
                key={m}
                onClick={() => setActiveMetric(m)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all ${
                  activeMetric === m
                    ? "bg-brand text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {METRIC_LABELS[m]}
              </button>
            ))}
          </div>
          <button
            onClick={() => exportDashboardToExcel(entries, activeMetric)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-gray-900 text-white hover:bg-gray-700 transition-colors shadow-sm flex items-center gap-1.5"
            title="Export to Excel"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Excel
          </button>
          <button
            onClick={() => exportDashboardToPdf(entries, activeMetric)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-rose-700 text-white hover:bg-rose-600 transition-colors shadow-sm flex items-center gap-1.5"
            title="Export to PDF"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H6.75S5.25 2.25 5.25 3.75v16.5c0 1.5 1.5 1.5 1.5 1.5h10.5c1.5 0 1.5-1.5 1.5-1.5v-.75" />
            </svg>
            PDF
          </button>
        </div>
      </div>

      {/* Department Filter Bar */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">View:</span>
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="text-xs font-medium border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand min-w-[200px] cursor-pointer shadow-sm"
        >
          <option value="all">All Departments</option>
          {deptOptions.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        {!isAllDepts && (
          <button
            onClick={() => setSelectedDept("all")}
            className="text-[10px] font-medium text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear filter
          </button>
        )}
      </div>

      {/* Hero KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiCards.map((kpi, idx) => (
          <div
            key={kpi.label}
            className={`card p-4 relative overflow-hidden animate-fade-in-delay-${idx + 1}`}
          >
            {/* Gradient accent background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${kpi.accent} pointer-events-none`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {kpi.label}
                </span>
                <span className={kpi.iconColor}>{kpi.icon}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1.5" style={{ fontFamily: "'Open Sans', sans-serif" }}>
                {kpi.value}
              </div>
              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${kpi.badgeColor}`}>
                {kpi.badge}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 animate-fade-in">
        <ForecastChart
          entries={summaryEntries}
          metric={activeMetric}
          title={`${METRIC_LABELS[activeMetric]} — 2025 vs 2026${!isAllDepts ? ` (${deptMap.get(selectedDept)})` : ""}`}
        />
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">
              FY Summary {selectedDeptName && <span className="text-brand font-normal text-xs">— {selectedDeptName}</span>}
            </h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2.5 font-semibold text-[10px] uppercase tracking-wider text-gray-400"></th>
                <th className="text-right py-2.5 font-semibold text-[10px] uppercase tracking-wider text-gray-400">2025</th>
                {isAllDepts && <th className="text-right py-2.5 font-semibold text-[10px] uppercase tracking-wider text-gray-400">AOP</th>}
                <th className="text-right py-2.5 font-semibold text-[10px] uppercase tracking-wider text-gray-400">2026 (F)</th>
                {isAllDepts && <th className="text-right py-2.5 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Δ Plan</th>}
                <th className="text-right py-2.5 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Δ LY</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row, i) => {
                const isPct = row.fmt === formatPct;

                // Delta vs Plan: 2026(F) vs AOP
                const dvPlan = isPct ? row.val26 - row.aop : (row.aop !== 0 ? ((row.val26 - row.aop) / Math.abs(row.aop)) * 100 : 0);
                const dvPlanStr = isPct
                  ? `${dvPlan >= 0 ? "+" : ""}${(dvPlan * 100).toFixed(1)}pp`
                  : (row.aop !== 0 ? `${dvPlan >= 0 ? "+" : ""}${dvPlan.toFixed(1)}%` : "—");
                const dvPlanColor = dvPlan > 0 ? "text-emerald-600" : dvPlan < 0 ? "text-rose-600" : "text-gray-400";

                // Delta vs LY: 2026(F) vs 2025
                const dvFcst = isPct ? row.val26 - row.val25 : (row.val25 !== 0 ? ((row.val26 - row.val25) / Math.abs(row.val25)) * 100 : 0);
                const dvFcstStr = isPct
                  ? `${dvFcst >= 0 ? "+" : ""}${(dvFcst * 100).toFixed(1)}pp`
                  : (row.val25 !== 0 ? `${dvFcst >= 0 ? "+" : ""}${dvFcst.toFixed(1)}%` : "—");
                const dvFcstColor = dvFcst > 0 ? "text-emerald-600" : dvFcst < 0 ? "text-rose-600" : "text-gray-400";

                const isLast = i === summaryRows.length - 1;

                return (
                  <tr key={row.label} className={`${!isLast ? "border-b border-gray-50" : ""} hover:bg-gray-50/50 transition-colors`}>
                    <td className="py-3 font-semibold text-[11px] text-gray-600 uppercase tracking-wide">{row.label}</td>
                    <td className="py-3 text-right text-gray-400 tabular-nums">{row.fmt(row.val25)}</td>
                    {isAllDepts && <td className="py-3 text-right text-blue-600/70 font-medium tabular-nums">{row.fmt(row.aop)}</td>}
                    <td className="py-3 text-right font-bold text-gray-900 tabular-nums">{row.fmt(row.val26)}</td>
                    {isAllDepts && <td className={`py-3 text-right font-semibold tabular-nums ${dvPlanColor}`}>{dvPlanStr}</td>}
                    <td className={`py-3 text-right font-semibold tabular-nums ${dvFcstColor}`}>{dvFcstStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* T12 Trend + Budget vs Forecast Waterfall */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 animate-fade-in">
        <T12TrendChart entries={entries} metric={activeMetric} />
        <BudgetFcstWaterfall entries={entries} />
      </div>

      {/* Rollup Table */}
      <div className="animate-fade-in">
        <RollupTable
          entries={entries}
          metric={activeMetric}
          title={`${METRIC_LABELS[activeMetric]} by Department — Monthly`}
        />
      </div>

      {/* Sales Mix Comparison */}
      <div className="animate-fade-in">
        <SalesMixTable entries={entries} />
      </div>

      {/* AI Insights */}
      <div className="animate-fade-in mb-6">
        <AiInsights entries={entries} />
      </div>
    </div>
  );
}
