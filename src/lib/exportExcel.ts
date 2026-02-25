import * as XLSX from "xlsx";
import { MONTHS, METRIC_LABELS, type MetricKey } from "./constants";

type EntryData = {
  departmentId: string;
  departmentName: string;
  year: number;
  month: number;
  grossBookedSales: number;
  gmPercent: number;
  cpPercent: number;
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

export function exportDashboardToExcel(entries: EntryData[], activeMetric: MetricKey) {
  const wb = XLSX.utils.book_new();

  // Get departments
  const deptMap = new Map<string, string>();
  for (const e of entries) {
    if (!deptMap.has(e.departmentId)) deptMap.set(e.departmentId, e.departmentName);
  }
  const depts = Array.from(deptMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const isPct = activeMetric === "gmPercent" || activeMetric === "cpPercent" || activeMetric === "salesMix";

  // Month totals for sales mix
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
    if (activeMetric === "salesMix") {
      const total = monthTotals[`${year}-${month}`] || 0;
      const deptSales = matching.reduce((s, e) => s + e.grossBookedSales, 0);
      return total ? deptSales / total : 0;
    }
    if (isPct) {
      const totalSales = matching.reduce((s, e) => s + e.grossBookedSales, 0);
      if (!totalSales) return 0;
      return matching.reduce((s, e) => s + e.grossBookedSales * computeMetric(e, activeMetric), 0) / totalSales;
    }
    return matching.reduce((s, e) => s + computeMetric(e, activeMetric), 0);
  };

  const getFyTotal = (deptId: string, year: number): number => {
    if (isPct) {
      if (activeMetric === "salesMix") {
        const deptTotal = entries.filter((e) => e.departmentId === deptId && e.year === year).reduce((s, e) => s + e.grossBookedSales, 0);
        const yearTotal = entries.filter((e) => e.year === year).reduce((s, e) => s + e.grossBookedSales, 0);
        return yearTotal ? deptTotal / yearTotal : 0;
      }
      const deptEntries = entries.filter((e) => e.departmentId === deptId && e.year === year);
      const ts = deptEntries.reduce((s, e) => s + e.grossBookedSales, 0);
      return ts ? deptEntries.reduce((s, e) => s + e.grossBookedSales * computeMetric(e, activeMetric), 0) / ts : 0;
    }
    return MONTHS.reduce((s, _, i) => s + getVal(deptId, year, i + 1), 0);
  };

  // Build rows
  const rows: (string | number)[][] = [];
  const header = ["Department", "Year", ...MONTHS, "FY Total"];
  rows.push(header);

  for (const dept of depts) {
    for (const year of [2025, 2026]) {
      const row: (string | number)[] = [year === 2025 ? dept.name : "", year];
      for (let m = 1; m <= 12; m++) {
        const val = getVal(dept.id, year, m);
        row.push(isPct ? val * 100 : val);
      }
      row.push(isPct ? getFyTotal(dept.id, year) * 100 : getFyTotal(dept.id, year));
      rows.push(row);
    }
    // Variance row
    const varRow: (string | number)[] = ["", "Var%"];
    for (let m = 1; m <= 12; m++) {
      const v25 = getVal(dept.id, 2025, m);
      const v26 = getVal(dept.id, 2026, m);
      varRow.push(v25 !== 0 ? ((v26 - v25) / Math.abs(v25)) * 100 : 0);
    }
    const fy25 = getFyTotal(dept.id, 2025);
    const fy26 = getFyTotal(dept.id, 2026);
    varRow.push(fy25 !== 0 ? ((fy26 - fy25) / Math.abs(fy25)) * 100 : 0);
    rows.push(varRow);
    rows.push([]); // blank separator
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  ws["!cols"] = [
    { wch: 18 }, { wch: 6 },
    ...MONTHS.map(() => ({ wch: 12 })),
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, METRIC_LABELS[activeMetric]);

  // Also add a full summary sheet
  const summaryRows: (string | number)[][] = [];
  summaryRows.push(["KKH FY Forecast Summary"]);
  summaryRows.push([]);
  summaryRows.push(["Metric", "FY 2025", "FY 2026", "Delta %"]);

  const metrics: { key: MetricKey; label: string }[] = [
    { key: "grossBookedSales", label: "Gross Booked Sales" },
    { key: "gmDollars", label: "GM $" },
    { key: "gmPercent", label: "GM %" },
    { key: "cpDollars", label: "CP $" },
    { key: "cpPercent", label: "CP %" },
  ];

  for (const { key, label } of metrics) {
    const isPctKey = key === "gmPercent" || key === "cpPercent";
    const getTotal = (year: number): number => {
      const ye = entries.filter((e) => e.year === year);
      const ts = ye.reduce((s, e) => s + e.grossBookedSales, 0);
      if (isPctKey) return ts ? ye.reduce((s, e) => s + e.grossBookedSales * computeMetric(e, key), 0) / ts : 0;
      return ye.reduce((s, e) => s + computeMetric(e, key), 0);
    };
    const v25 = getTotal(2025);
    const v26 = getTotal(2026);
    const delta = v25 !== 0 ? ((v26 - v25) / Math.abs(v25)) * 100 : 0;
    summaryRows.push([
      label,
      isPctKey ? `${(v25 * 100).toFixed(1)}%` : v25,
      isPctKey ? `${(v26 * 100).toFixed(1)}%` : v26,
      `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`,
    ]);
  }

  const ws2 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws2["!cols"] = [{ wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, "FY Summary");

  XLSX.writeFile(wb, `KKH_Forecast_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
