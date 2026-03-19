"use client";

import { useState, useEffect, useCallback } from "react";
import RollupTable from "@/components/RollupTable";
import ForecastChart from "@/components/ForecastChart";
import SalesMixTable from "@/components/SalesMixTable";
import T12TrendChart from "@/components/T12TrendChart";
import BudgetFcstWaterfall from "@/components/BudgetFcstWaterfall";
import AiInsights from "@/components/AiInsights";
import { MONTHS, CURRENT_MONTH, METRIC_LABELS, formatCurrency, formatPct, type MetricKey } from "@/lib/constants";
import { exportDashboardToExcel, exportAllMetricsToExcel } from "@/lib/exportExcel";
import { exportDashboardToPdf } from "@/lib/exportPdf";

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

type RawEntry = {
  departmentId: string;
  department: { name: string };
  year: number;
  month: number;
  type: string;
  grossBookedSales: number;
  gmPercent: number;
  cpPercent: number;
};

const METRIC_KEYS: MetricKey[] = [
  "grossBookedSales", "gmDollars", "gmPercent", "cpDollars", "cpPercent", "salesMix",
];

function computeSummary(entries: EntryData[], year: number, typeFilter?: string) {
  let yearEntries = entries.filter((e) => e.year === year);
  if (typeFilter) yearEntries = yearEntries.filter((e) => e.type === typeFilter);
  const totalSales = yearEntries.reduce((s, e) => s + e.grossBookedSales, 0);
  const totalGmDollars = yearEntries.reduce((s, e) => s + e.grossBookedSales * e.gmPercent, 0);
  const totalCpDollars = yearEntries.reduce((s, e) => s + e.grossBookedSales * e.cpPercent, 0);
  const gmPct = totalSales ? totalGmDollars / totalSales : 0;
  const cpPct = totalSales ? totalCpDollars / totalSales : 0;
  return { totalSales, totalGmDollars, totalCpDollars, gmPct, cpPct };
}

// Build blended entries: use actuals where available, forecast otherwise
function blendEntries(entries: EntryData[]): EntryData[] {
  const actualKeys = new Set<string>();
  for (const e of entries) {
    if (e.type === "actual") actualKeys.add(`${e.departmentId}-${e.year}-${e.month}`);
  }
  return entries.filter((e) => {
    if (e.type === "actual") return true;
    // Include forecast only if no actual exists for this dept/year/month
    return !actualKeys.has(`${e.departmentId}-${e.year}-${e.month}`);
  });
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
  const [selectedPeriod, setSelectedPeriod] = useState<string>("fy");

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
      type: e.type || "forecast",
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
              <div className="shimmer h-3 w-20 mb-3" />
              <div className="shimmer h-7 w-28 mb-2" />
              <div className="shimmer h-3 w-16" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-4"><div className="shimmer h-[280px]" /></div>
          <div className="card p-4"><div className="shimmer h-[280px]" /></div>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl text-kkh-charcoal mb-2">
          KKH Rolling Forecast
        </h1>
        <p className="text-kkh-mid mb-6">
          No data yet. Start by seeding departments in Admin, then enter numbers
          on the Input page.
        </p>
        <div className="flex gap-3 justify-center">
          <a href="/admin" className="btn-brand inline-block">
            Go to Admin
          </a>
          <a href="/input" className="btn-brand btn-brand-sage inline-block">
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
  const deptEntries = selectedDept === "all"
    ? entries
    : entries.filter((e) => e.departmentId === selectedDept);

  // Compute latest actualized month from actual entries
  const actualEntries2026 = entries.filter((e) => e.type === "actual" && e.year === 2026);
  const maxActualMonth = actualEntries2026.length > 0
    ? Math.max(...actualEntries2026.map((e) => e.month))
    : 0;

  // Filter by selected period for KPI cards and summary
  // YTD uses maxActualMonth (only actualized months), not CURRENT_MONTH
  const filterByPeriod = (data: EntryData[]): EntryData[] => {
    if (selectedPeriod === "fy") return data;
    if (selectedPeriod === "ytd") return data.filter((e) => e.month <= maxActualMonth);
    const month = parseInt(selectedPeriod);
    return data.filter((e) => e.month === month);
  };

  const summaryEntries = deptEntries; // all entries for RollupTable (needs both types)
  // For charts: use only forecast for 2026, all 2025
  const chartEntries = deptEntries.filter((e) => e.year === 2025 || e.type !== "actual");
  const blendedDeptEntries = blendEntries(deptEntries); // actuals where available, forecast otherwise
  const periodEntries = filterByPeriod(blendedDeptEntries); // period-filtered for KPIs

  const s25 = computeSummary(periodEntries, 2025);
  const s26 = computeSummary(periodEntries, 2026);

  // YTD Actuals: sum only actual entries thru maxActualMonth (for the summary table)
  const ytdActualEntries = deptEntries.filter((e) => e.type === "actual" && e.year === 2026 && e.month <= maxActualMonth);
  const s26a = computeSummary(ytdActualEntries, 2026, "actual");

  // Period label for display
  const ytdLabel = maxActualMonth > 0 ? `YTD thru ${MONTHS[maxActualMonth - 1]}` : "YTD";
  const periodLabel = selectedPeriod === "fy" ? "FY" : selectedPeriod === "ytd" ? ytdLabel : MONTHS[parseInt(selectedPeriod) - 1];

  const isAllDepts = selectedDept === "all";

  // Prorate AOP based on selected period (percentages stay the same, dollar amounts scale)
  const periodMonthCount = selectedPeriod === "fy" ? 12 : selectedPeriod === "ytd" ? maxActualMonth : 1;
  const aopSales = AOP_SALES * (periodMonthCount / 12);
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

  const periodSuffix = selectedPeriod !== "fy" ? ` (${periodLabel})` : "";

  // Pre-compute vs LY deltas for all KPI cards
  const gmVsLy = (s26.gmPct - s25.gmPct) * 100;
  const cpVsLy = (s26.cpPct - s25.cpPct) * 100;
  const cpDolVsAop = aopCpDollars ? ((s26.totalCpDollars - aopCpDollars) / Math.abs(aopCpDollars)) * 100 : 0;
  const cpDolVsLy = s25.totalCpDollars ? ((s26.totalCpDollars - s25.totalCpDollars) / Math.abs(s25.totalCpDollars)) * 100 : 0;

  const kpiCards = [
    {
      label: selectedDeptName ? `${selectedDeptName} — Sales${periodSuffix}` : `2026 Forecast Sales${periodSuffix}`,
      value: formatCurrency(s26.totalSales),
      badge: `${salesVsAop >= 0 ? "+" : ""}${salesVsAop.toFixed(1)}% vs AOP`,
      badgePositive: salesVsAop >= 0,
      badge2: `${salesVsLy >= 0 ? "+" : ""}${salesVsLy.toFixed(1)}% vs LY`,
      badge2Positive: salesVsLy >= 0,
      accentColor: "var(--accent-light)",
    },
    {
      label: selectedDeptName ? `${selectedDeptName} — GM %${periodSuffix}` : `Gross Margin %${periodSuffix}`,
      value: formatPct(s26.gmPct),
      badge: `${gmVsAop >= 0 ? "+" : ""}${gmVsAop.toFixed(1)}pp vs AOP`,
      badgePositive: gmVsAop >= 0,
      badge2: `${gmVsLy >= 0 ? "+" : ""}${gmVsLy.toFixed(1)}pp vs LY`,
      badge2Positive: gmVsLy >= 0,
      accentColor: "var(--green)",
    },
    {
      label: selectedDeptName ? `${selectedDeptName} — CP %${periodSuffix}` : `Contribution Profit %${periodSuffix}`,
      value: formatPct(s26.cpPct),
      badge: `${cpVsAop >= 0 ? "+" : ""}${cpVsAop.toFixed(1)}pp vs AOP`,
      badgePositive: cpVsAop >= 0,
      badge2: `${cpVsLy >= 0 ? "+" : ""}${cpVsLy.toFixed(1)}pp vs LY`,
      badge2Positive: cpVsLy >= 0,
      accentColor: "var(--mid)",
    },
    {
      label: selectedDeptName ? `${selectedDeptName} — CP $${periodSuffix}` : `Contribution Profit $${periodSuffix}`,
      value: formatCurrency(s26.totalCpDollars),
      badge: `${cpDolVsAop >= 0 ? "+" : ""}${cpDolVsAop.toFixed(1)}% (${formatCurrency(s26.totalCpDollars - aopCpDollars)}) vs AOP`,
      badgePositive: cpDolVsAop >= 0,
      badge2: `${cpDolVsLy >= 0 ? "+" : ""}${cpDolVsLy.toFixed(1)}% (${formatCurrency(s26.totalCpDollars - s25.totalCpDollars)}) vs LY`,
      badge2Positive: cpDolVsLy >= 0,
      accentColor: "var(--charcoal)",
    },
  ];

  const hasActuals = maxActualMonth > 0;

  const summaryRows = [
    { label: "Gross Booked Sales", val25: s25.totalSales, aop: aopSales, val26: s26.totalSales, ytdA: s26a.totalSales, fmt: formatCurrency },
    { label: "GM $", val25: s25.totalGmDollars, aop: aopGmDollars, val26: s26.totalGmDollars, ytdA: s26a.totalGmDollars, fmt: formatCurrency },
    { label: "GM %", val25: s25.gmPct, aop: aopGmPct, val26: s26.gmPct, ytdA: s26a.gmPct, fmt: formatPct },
    { label: "CP $", val25: s25.totalCpDollars, aop: aopCpDollars, val26: s26.totalCpDollars, ytdA: s26a.totalCpDollars, fmt: formatCurrency },
    { label: "CP %", val25: s25.cpPct, aop: aopCpPct, val26: s26.cpPct, ytdA: s26a.cpPct, fmt: formatPct },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-[0.6875rem] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--accent-light)" }}>
            Kathy Kuo Home
          </p>
          <h1 className="text-3xl text-kkh-charcoal leading-tight" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            FY Forecast Dashboard
          </h1>
          <p className="text-[0.8125rem] mt-1" style={{ color: "var(--light-accessible)" }}>
            2026 Rolling Forecast vs 2025 Actuals
            {maxActualMonth > 0 && (
              <span className="ml-1.5 font-medium" style={{ color: "var(--mid)" }}>
                · Data as of: {MONTHS[maxActualMonth - 1]} 2026 (A)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-0.5 p-1 flex-wrap" style={{ background: "var(--warm-white)", border: "1px solid var(--border)" }}>
            {METRIC_KEYS.map((m) => (
              <button
                key={m}
                onClick={() => setActiveMetric(m)}
                className={`px-3 py-1.5 text-[0.6875rem] font-normal uppercase tracking-[0.14em] transition-all ${
                  activeMetric === m
                    ? "text-white shadow-sm"
                    : "hover:bg-white/60"
                }`}
                style={
                  activeMetric === m
                    ? { background: "var(--charcoal)" }
                    : { color: "var(--light-accessible)" }
                }
              >
                {METRIC_LABELS[m]}
              </button>
            ))}
          </div>
          <button
            onClick={() => exportDashboardToExcel(blendEntries(entries), activeMetric)}
            className="btn-brand flex items-center gap-1.5"
            title="Export current metric to Excel"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Excel
          </button>
          <button
            onClick={() => exportAllMetricsToExcel(blendEntries(entries))}
            className="btn-brand btn-brand-sage flex items-center gap-1.5"
            title="Export all metrics (one tab per metric)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export All
          </button>
          <button
            onClick={() => exportDashboardToPdf(blendEntries(entries), activeMetric)}
            className="flex items-center gap-1.5"
            title="Export to PDF"
            style={{
              background: "var(--accent-light)",
              color: "#fff",
              padding: "10px 24px",
              fontSize: "0.6875rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase" as const,
              border: "1px solid var(--accent-light)",
              cursor: "pointer",
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H6.75S5.25 2.25 5.25 3.75v16.5c0 1.5 1.5 1.5 1.5 1.5h10.5c1.5 0 1.5-1.5 1.5-1.5v-.75" />
            </svg>
            PDF
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span className="text-[0.6875rem] font-normal uppercase tracking-[0.18em]" style={{ color: "var(--accent-light)" }}>View:</span>
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="text-[0.8125rem] px-3 py-2 min-w-[200px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-light"
          style={{ border: "1px solid var(--border)", color: "var(--charcoal)", background: "var(--warm-white)" }}
        >
          <option value="all">All Departments</option>
          {deptOptions.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="text-[0.8125rem] px-3 py-2 min-w-[120px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-light"
          style={{ border: "1px solid var(--border)", color: "var(--charcoal)", background: "var(--warm-white)" }}
        >
          <option value="fy">Full Year</option>
          <option value="ytd">YTD (thru {maxActualMonth > 0 ? MONTHS[maxActualMonth - 1] : MONTHS[CURRENT_MONTH - 1]})</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={String(i + 1)}>{m}</option>
          ))}
        </select>
        {(!isAllDepts || selectedPeriod !== "fy") && (
          <button
            onClick={() => { setSelectedDept("all"); setSelectedPeriod("fy"); }}
            className="text-[0.6875rem] font-normal transition-colors flex items-center gap-1 uppercase tracking-[0.14em]"
            style={{ color: "var(--accent-light)" }}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear filters
          </button>
        )}
      </div>

      {/* Hero KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiCards.map((kpi, idx) => (
          <div
            key={kpi.label}
            className={`card p-5 relative overflow-hidden animate-fade-in-delay-${idx + 1}`}
          >
            {/* Accent top border */}
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: kpi.accentColor }} />
            <div className="relative">
              <div className="mb-3">
                <span className="text-[0.6875rem] font-normal uppercase tracking-[0.18em]" style={{ color: "var(--light-accessible)" }}>
                  {kpi.label}
                </span>
              </div>
              <div
                className="text-[2.5rem] leading-none mb-3"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: "var(--charcoal)", fontWeight: 400 }}
              >
                {kpi.value}
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className="inline-block text-[0.6875rem] font-medium px-2 py-0.5"
                  style={{
                    color: kpi.badgePositive ? "var(--green)" : "#9B4444",
                    background: kpi.badgePositive ? "rgba(93,101,86,0.1)" : "rgba(155,68,68,0.1)",
                  }}
                >
                  {kpi.badge}
                </span>
                <span
                  className="inline-block text-[0.6875rem] font-medium px-2 py-0.5"
                  style={{
                    color: kpi.badge2Positive ? "var(--green)" : "#9B4444",
                    background: kpi.badge2Positive ? "rgba(93,101,86,0.1)" : "rgba(155,68,68,0.1)",
                  }}
                >
                  {kpi.badge2}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 animate-fade-in">
        <ForecastChart
          entries={chartEntries}
          metric={activeMetric}
          title={`${METRIC_LABELS[activeMetric]} — 2025 vs 2026${!isAllDepts ? ` (${deptMap.get(selectedDept)})` : ""}`}
        />
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[0.8125rem] font-medium uppercase tracking-[0.14em]" style={{ color: "var(--charcoal)" }}>
              {periodLabel} Summary {selectedDeptName && <span style={{ color: "var(--accent-light)" }} className="font-normal text-xs normal-case tracking-normal">— {selectedDeptName}</span>}
            </h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                <th className="text-left py-2.5 text-[0.6875rem] uppercase tracking-[0.14em] font-normal" style={{ color: "var(--light-accessible)" }}></th>
                <th className="text-right py-2.5 text-[0.6875rem] uppercase tracking-[0.14em] font-normal" style={{ color: "var(--light-accessible)" }}>2025</th>
                {isAllDepts && <th className="text-right py-2.5 text-[0.6875rem] uppercase tracking-[0.14em] font-normal" style={{ color: "var(--light-accessible)" }}>AOP</th>}
                <th className="text-right py-2.5 text-[0.6875rem] uppercase tracking-[0.14em] font-normal" style={{ color: "var(--light-accessible)" }}>2026 (F)</th>
                {hasActuals && <th className="text-right py-2.5 text-[0.6875rem] uppercase tracking-[0.14em] font-normal" style={{ color: "var(--accent-light)" }}>YTD (A)</th>}
                {isAllDepts && <th className="text-right py-2.5 text-[0.6875rem] uppercase tracking-[0.14em] font-normal" style={{ color: "var(--light-accessible)" }}>Δ Plan</th>}
                <th className="text-right py-2.5 text-[0.6875rem] uppercase tracking-[0.14em] font-normal" style={{ color: "var(--light-accessible)" }}>Δ LY</th>
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
                const dvPlanColor = dvPlan > 0 ? "var(--green)" : dvPlan < 0 ? "#9B4444" : "var(--light-accessible)";

                // Delta vs LY: 2026(F) vs 2025
                const dvFcst = isPct ? row.val26 - row.val25 : (row.val25 !== 0 ? ((row.val26 - row.val25) / Math.abs(row.val25)) * 100 : 0);
                const dvFcstStr = isPct
                  ? `${dvFcst >= 0 ? "+" : ""}${(dvFcst * 100).toFixed(1)}pp`
                  : (row.val25 !== 0 ? `${dvFcst >= 0 ? "+" : ""}${dvFcst.toFixed(1)}%` : "—");
                const dvFcstColor = dvFcst > 0 ? "var(--green)" : dvFcst < 0 ? "#9B4444" : "var(--light-accessible)";

                const isLast = i === summaryRows.length - 1;

                return (
                  <tr key={row.label} style={{ borderBottom: !isLast ? "1px solid var(--border)" : "none" }} className="transition-colors hover:bg-white/40">
                    <td className="py-3 text-[0.6875rem] uppercase tracking-[0.12em] font-medium" style={{ color: "var(--accent)" }}>{row.label}</td>
                    <td className="py-3 text-right tabular-nums" style={{ color: "var(--light-accessible)" }}>{row.fmt(row.val25)}</td>
                    {isAllDepts && <td className="py-3 text-right font-medium tabular-nums" style={{ color: "var(--accent-light)" }}>{row.fmt(row.aop)}</td>}
                    <td className="py-3 text-right font-bold tabular-nums" style={{ color: "var(--charcoal)" }}>{row.fmt(row.val26)}</td>
                    {hasActuals && <td className="py-3 text-right font-semibold tabular-nums" style={{ color: "var(--accent-light)" }}>{row.fmt(row.ytdA)}</td>}
                    {isAllDepts && <td className="py-3 text-right font-semibold tabular-nums" style={{ color: dvPlanColor }}>{dvPlanStr}</td>}
                    <td className="py-3 text-right font-semibold tabular-nums" style={{ color: dvFcstColor }}>{dvFcstStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* T12 Trend + Budget vs Forecast Waterfall */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 animate-fade-in">
        <T12TrendChart entries={chartEntries} metric={activeMetric} />
        <BudgetFcstWaterfall entries={chartEntries} />
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
