"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { MONTHS, formatCurrency, formatPct, type MetricKey } from "./constants";

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

function computeSummary(entries: EntryData[], year: number) {
  const yearEntries = entries.filter((e) => e.year === year);
  const totalSales = yearEntries.reduce((s, e) => s + e.grossBookedSales, 0);
  const totalGmDollars = yearEntries.reduce((s, e) => s + e.grossBookedSales * e.gmPercent, 0);
  const totalCpDollars = yearEntries.reduce((s, e) => s + e.grossBookedSales * e.cpPercent, 0);
  const gmPct = totalSales ? totalGmDollars / totalSales : 0;
  const cpPct = totalSales ? totalCpDollars / totalSales : 0;
  return { totalSales, totalGmDollars, totalCpDollars, gmPct, cpPct };
}

const AOP_SALES = 57_050_000;
const AOP_GM_PCT = 0.505;
const AOP_CP_PCT = 0.467;

const BRAND = [127, 141, 64] as [number, number, number]; // #7F8D40
const DARK = [30, 41, 59] as [number, number, number]; // slate-800

export function exportDashboardToPdf(entries: EntryData[], activeMetric: MetricKey) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // --- Page 1: Executive Summary ---
  // Header bar
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("KKH ROLLING FORECAST — EXECUTIVE SUMMARY", 14, 12);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(dateStr, pageW - 14, 12, { align: "right" });

  // Summary data
  const s25 = computeSummary(entries, 2025);
  const s26 = computeSummary(entries, 2026);
  const aopGmDollars = AOP_SALES * AOP_GM_PCT;
  const aopCpDollars = AOP_SALES * AOP_CP_PCT;

  // KPI boxes
  const kpis = [
    { label: "2026 Forecast Sales", value: formatCurrency(s26.totalSales), delta: `${((s26.totalSales - AOP_SALES) / AOP_SALES * 100).toFixed(1)}% vs AOP` },
    { label: "Gross Margin %", value: formatPct(s26.gmPct), delta: `${((s26.gmPct - AOP_GM_PCT) * 100).toFixed(1)}pp vs AOP` },
    { label: "Contribution Profit %", value: formatPct(s26.cpPct), delta: `${((s26.cpPct - AOP_CP_PCT) * 100).toFixed(1)}pp vs AOP` },
    { label: "YoY Growth", value: `${((s26.totalSales - s25.totalSales) / s25.totalSales * 100).toFixed(1)}%`, delta: `${formatCurrency(s26.totalSales - s25.totalSales)} delta` },
  ];

  const boxW = (pageW - 28 - 18) / 4; // 4 boxes with gaps
  let boxX = 14;
  const boxY = 24;

  for (const kpi of kpis) {
    // Box background
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(boxX, boxY, boxW, 28, 2, 2, "F");
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(boxX, boxY, boxW, 28, 2, 2, "S");

    // Label
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text(kpi.label.toUpperCase(), boxX + 4, boxY + 7);

    // Value
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(kpi.value, boxX + 4, boxY + 18);

    // Delta
    doc.setTextColor(...BRAND);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(kpi.delta, boxX + 4, boxY + 24);

    boxX += boxW + 6;
  }

  // FY Summary Table
  doc.setTextColor(...DARK);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("FY SUMMARY", 14, 62);

  const summaryRows = [
    ["Gross Booked Sales", formatCurrency(s25.totalSales), formatCurrency(AOP_SALES), formatCurrency(s26.totalSales), `${((s26.totalSales - AOP_SALES) / AOP_SALES * 100).toFixed(1)}%`, `${((s26.totalSales - s25.totalSales) / s25.totalSales * 100).toFixed(1)}%`],
    ["GM $", formatCurrency(s25.totalGmDollars), formatCurrency(aopGmDollars), formatCurrency(s26.totalGmDollars), `${((s26.totalGmDollars - aopGmDollars) / aopGmDollars * 100).toFixed(1)}%`, `${((s26.totalGmDollars - s25.totalGmDollars) / s25.totalGmDollars * 100).toFixed(1)}%`],
    ["GM %", formatPct(s25.gmPct), formatPct(AOP_GM_PCT), formatPct(s26.gmPct), `${((s26.gmPct - AOP_GM_PCT) * 100).toFixed(1)}pp`, `${((s26.gmPct - s25.gmPct) * 100).toFixed(1)}pp`],
    ["CP $", formatCurrency(s25.totalCpDollars), formatCurrency(aopCpDollars), formatCurrency(s26.totalCpDollars), `${((s26.totalCpDollars - aopCpDollars) / aopCpDollars * 100).toFixed(1)}%`, `${((s26.totalCpDollars - s25.totalCpDollars) / s25.totalCpDollars * 100).toFixed(1)}%`],
    ["CP %", formatPct(s25.cpPct), formatPct(AOP_CP_PCT), formatPct(s26.cpPct), `${((s26.cpPct - AOP_CP_PCT) * 100).toFixed(1)}pp`, `${((s26.cpPct - s25.cpPct) * 100).toFixed(1)}pp`],
  ];

  autoTable(doc, {
    startY: 66,
    head: [["Metric", "2025 (A)", "AOP", "2026 (F)", "Δ vs Plan", "Δ vs LY"]],
    body: summaryRows,
    theme: "grid",
    headStyles: { fillColor: DARK, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold", halign: "center" },
    bodyStyles: { fontSize: 7.5, textColor: [55, 65, 81] },
    columnStyles: {
      0: { fontStyle: "bold", halign: "left" },
      1: { halign: "right" },
      2: { halign: "right", textColor: [59, 130, 246] },
      3: { halign: "right", fontStyle: "bold" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
    margin: { left: 14, right: 14 },
    styles: { cellPadding: 2.5 },
  });

  // Department Breakdown Table
  const deptMap = new Map<string, string>();
  for (const e of entries) {
    if (!deptMap.has(e.departmentId)) deptMap.set(e.departmentId, e.departmentName);
  }
  const depts = Array.from(deptMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastTableY = (doc as any).lastAutoTable?.finalY || 100;

  doc.setTextColor(...DARK);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DEPARTMENT BREAKDOWN — GROSS BOOKED SALES", 14, lastTableY + 10);

  const deptRows = depts.map((dept) => {
    const sales25 = entries.filter((e) => e.departmentId === dept.id && e.year === 2025).reduce((s, e) => s + e.grossBookedSales, 0);
    const sales26 = entries.filter((e) => e.departmentId === dept.id && e.year === 2026).reduce((s, e) => s + e.grossBookedSales, 0);
    const de = entries.filter((e) => e.departmentId === dept.id && e.year === 2026);
    const ts = de.reduce((s, e) => s + e.grossBookedSales, 0);
    const gm26 = ts ? de.reduce((s, e) => s + e.grossBookedSales * e.gmPercent, 0) / ts : 0;
    const cp26 = ts ? de.reduce((s, e) => s + e.grossBookedSales * e.cpPercent, 0) / ts : 0;
    const delta = sales25 !== 0 ? ((sales26 - sales25) / sales25 * 100) : 0;
    return [dept.name, formatCurrency(sales25), formatCurrency(sales26), `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`, formatPct(gm26), formatPct(cp26)];
  });

  // Grand total row
  const totalDelta = s25.totalSales !== 0 ? ((s26.totalSales - s25.totalSales) / s25.totalSales * 100) : 0;
  deptRows.push(["TOTAL", formatCurrency(s25.totalSales), formatCurrency(s26.totalSales), `${totalDelta >= 0 ? "+" : ""}${totalDelta.toFixed(1)}%`, formatPct(s26.gmPct), formatPct(s26.cpPct)]);

  autoTable(doc, {
    startY: lastTableY + 14,
    head: [["Department", "2025 Sales", "2026 Forecast", "YoY %", "GM %", "CP %"]],
    body: deptRows,
    theme: "grid",
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold", halign: "center" },
    bodyStyles: { fontSize: 7.5, textColor: [55, 65, 81] },
    columnStyles: {
      0: { fontStyle: "bold", halign: "left" },
      1: { halign: "right" },
      2: { halign: "right", fontStyle: "bold" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
    margin: { left: 14, right: 14 },
    styles: { cellPadding: 2.5 },
    didParseCell: (data) => {
      // Bold total row
      if (data.row.index === deptRows.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [243, 244, 246];
      }
    },
  });

  // --- Page 2: Monthly Detail ---
  doc.addPage("a4", "landscape");

  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("MONTHLY DETAIL BY DEPARTMENT", 14, 12);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(dateStr, pageW - 14, 12, { align: "right" });

  const isPct = activeMetric === "gmPercent" || activeMetric === "cpPercent" || activeMetric === "salesMix";
  const monthTotals: Record<string, number> = {};
  for (const e of entries) {
    const key = `${e.year}-${e.month}`;
    monthTotals[key] = (monthTotals[key] || 0) + e.grossBookedSales;
  }

  const getVal = (deptId: string, year: number, month: number): number => {
    const matching = entries.filter((e) => e.departmentId === deptId && e.year === year && e.month === month);
    if (matching.length === 0) return 0;
    if (activeMetric === "salesMix") {
      const total = monthTotals[`${year}-${month}`] || 0;
      return total ? matching.reduce((s, e) => s + e.grossBookedSales, 0) / total : 0;
    }
    if (isPct) {
      const ts = matching.reduce((s, e) => s + e.grossBookedSales, 0);
      if (!ts) return 0;
      return matching.reduce((s, e) => s + e.grossBookedSales * computeMetric(e, activeMetric), 0) / ts;
    }
    return matching.reduce((s, e) => s + computeMetric(e, activeMetric), 0);
  };

  const fmtVal = (v: number) => isPct ? formatPct(v) : formatCurrency(v);

  const monthlyRows: string[][] = [];
  for (const dept of depts) {
    // 2025 row
    const row25 = [dept.name, "2025"];
    for (let m = 1; m <= 12; m++) {
      const v = getVal(dept.id, 2025, m);
      row25.push(v ? fmtVal(v) : "—");
    }
    monthlyRows.push(row25);

    // 2026 row
    const row26 = ["", "2026"];
    for (let m = 1; m <= 12; m++) {
      const v = getVal(dept.id, 2026, m);
      row26.push(v ? fmtVal(v) : "—");
    }
    monthlyRows.push(row26);
  }

  autoTable(doc, {
    startY: 24,
    head: [["Department", "Year", ...MONTHS]],
    body: monthlyRows,
    theme: "grid",
    headStyles: { fillColor: DARK, textColor: [255, 255, 255], fontSize: 6, fontStyle: "bold", halign: "center" },
    bodyStyles: { fontSize: 6, textColor: [55, 65, 81], halign: "right" },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", cellWidth: 28 },
      1: { halign: "center", cellWidth: 12 },
    },
    margin: { left: 8, right: 8 },
    styles: { cellPadding: 1.5, overflow: "ellipsize" },
    didParseCell: (data) => {
      // Alternate department shading
      if (data.section === "body" && Math.floor(data.row.index / 2) % 2 === 1) {
        data.cell.styles.fillColor = [249, 250, 251];
      }
    },
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(6);
    doc.setTextColor(156, 163, 175);
    doc.setFont("helvetica", "normal");
    doc.text("KKH Rolling Forecast — Confidential", 14, pageH - 6);
    doc.text(`Page ${p} of ${totalPages}`, pageW - 14, pageH - 6, { align: "right" });
    doc.text(`Generated ${now.toLocaleString()}`, pageW / 2, pageH - 6, { align: "center" });
  }

  doc.save(`KKH_Forecast_${now.toISOString().slice(0, 10)}.pdf`);
}
