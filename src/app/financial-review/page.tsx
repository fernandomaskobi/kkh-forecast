"use client";

import { useState } from "react";
import KpiCard from "@/components/KpiCard";
import PeriodSelector, { FINANCIAL_PERIODS } from "@/components/PeriodSelector";
import PnlTable from "@/components/PnlTable";
import type { PnlLineItem } from "@/components/PnlTable";
import FinancialBridge from "@/components/FinancialBridge";
import financialData from "@/data/financial-data.json";

function fmtK(v: number | null): string {
  if (v === null) return "\u2014";
  if (v === 0) return "$0";
  const abs = Math.abs(v);
  if (abs >= 10_000) return `$${(v / 1_000).toFixed(1)}M`;
  return `$${v.toFixed(0)}K`;
}

function fmtPct(v: number | null): string {
  if (v === null) return "\u2014";
  return `${(v * 100).toFixed(1)}%`;
}

export default function FinancialReviewPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("FY");

  // Cast lineItems to PnlLineItem[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineItems = financialData.lineItems as any as PnlLineItem[];

  // Helper to get a line item's value for the selected period
  const getValue = (id: string, type: "actuals" | "fcst" | "aop" | "ly"): number | null => {
    const item = financialData.lineItems.find((i) => i.id === id);
    if (!item) return null;
    const pd = (item.data as Record<string, Record<string, number | null>>)[selectedPeriod];
    if (!pd) return null;
    return (pd as Record<string, number | null>)[type] ?? null;
  };

  // KPI data
  const netSalesFcst = getValue("net_shipped_sales", "fcst");
  const netSalesAop = getValue("net_shipped_sales", "aop");
  const netSalesLy = getValue("net_shipped_sales", "ly");
  const gmPctFcst = getValue("gm_percent", "fcst");
  const gmPctAop = getValue("gm_percent", "aop");
  const gmPctLy = getValue("gm_percent", "ly");
  const gpFcst = getValue("gross_profit", "fcst");
  const gpAop = getValue("gross_profit", "aop");
  const gpLy = getValue("gross_profit", "ly");
  const ebitdaFcst = getValue("ebitda", "fcst");
  const ebitdaAop = getValue("ebitda", "aop");
  const ebitdaLy = getValue("ebitda", "ly");

  // Helper for badges
  const pctDelta = (val: number | null, ref: number | null): { text: string; positive: boolean } => {
    if (val === null || ref === null || ref === 0) return { text: "\u2014", positive: true };
    const pct = ((val - ref) / Math.abs(ref)) * 100;
    return { text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, positive: pct >= 0 };
  };

  const ppDelta = (val: number | null, ref: number | null): { text: string; positive: boolean } => {
    if (val === null || ref === null) return { text: "\u2014", positive: true };
    const bp = (val - ref) * 100;
    return { text: `${bp >= 0 ? "+" : ""}${bp.toFixed(1)}pp`, positive: bp >= 0 };
  };

  const salesVsPlan = pctDelta(netSalesFcst, netSalesAop);
  const salesVsLy = pctDelta(netSalesFcst, netSalesLy);
  const gmVsPlan = ppDelta(gmPctFcst, gmPctAop);
  const gmVsLy = ppDelta(gmPctFcst, gmPctLy);
  const gpVsPlan = pctDelta(gpFcst, gpAop);
  const gpVsLy = pctDelta(gpFcst, gpLy);
  const ebitdaVsPlan = pctDelta(ebitdaFcst, ebitdaAop);
  const ebitdaVsLy = pctDelta(ebitdaFcst, ebitdaLy);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-[0.6875rem] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--accent-light)" }}>
            Kathy Kuo Home
          </p>
          <h1 className="text-3xl leading-tight" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: "var(--charcoal)" }}>
            Financial Review
          </h1>
          <p className="text-[0.8125rem] mt-1" style={{ color: "var(--light-accessible)" }}>
            2026 P&L Summary, Bridges & Variance Analysis
          </p>
        </div>
        <PeriodSelector
          periods={FINANCIAL_PERIODS}
          selected={selectedPeriod}
          onChange={setSelectedPeriod}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label={`Net Sales (${selectedPeriod})`}
          value={fmtK(netSalesFcst)}
          badges={[
            { text: `${salesVsPlan.text} vs Plan`, positive: salesVsPlan.positive },
            { text: `${salesVsLy.text} vs LY`, positive: salesVsLy.positive },
          ]}
          accentColor="var(--accent-light)"
          animationDelay={1}
        />
        <KpiCard
          label={`GM% (${selectedPeriod})`}
          value={fmtPct(gmPctFcst)}
          badges={[
            { text: `${gmVsPlan.text} vs Plan`, positive: gmVsPlan.positive },
            { text: `${gmVsLy.text} vs LY`, positive: gmVsLy.positive },
          ]}
          accentColor="var(--green)"
          animationDelay={2}
        />
        <KpiCard
          label={`Gross Profit (${selectedPeriod})`}
          value={fmtK(gpFcst)}
          badges={[
            { text: `${gpVsPlan.text} vs Plan`, positive: gpVsPlan.positive },
            { text: `${gpVsLy.text} vs LY`, positive: gpVsLy.positive },
          ]}
          accentColor="var(--mid)"
          animationDelay={3}
        />
        <KpiCard
          label={`EBITDA (${selectedPeriod})`}
          value={fmtK(ebitdaFcst)}
          badges={[
            { text: `${ebitdaVsPlan.text} vs Plan`, positive: ebitdaVsPlan.positive },
            { text: `${ebitdaVsLy.text} vs LY`, positive: ebitdaVsLy.positive },
          ]}
          accentColor="var(--charcoal)"
          animationDelay={4}
        />
      </div>

      {/* P&L Table */}
      <div className="mb-6 animate-fade-in">
        <div className="mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--charcoal)" }}>
            P&L Summary &mdash; {selectedPeriod}
          </h2>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--light-accessible)" }}>
            All values in $K &middot; Source: {financialData.metadata.sourceFile}
          </p>
        </div>
        <PnlTable lineItems={lineItems} selectedPeriod={selectedPeriod} />
      </div>

      {/* Bridge Charts */}
      <div className="mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--charcoal)" }}>
          Variance Bridges &mdash; FY
        </h2>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--light-accessible)" }}>
          LY to Forecast waterfall analysis
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 animate-fade-in">
        <FinancialBridge
          title={financialData.bridges.sales.title}
          subtitle={financialData.bridges.sales.subtitle}
          items={financialData.bridges.sales.items}
          height={320}
        />
        <FinancialBridge
          title={financialData.bridges.grossProfit.title}
          subtitle={financialData.bridges.grossProfit.subtitle}
          items={financialData.bridges.grossProfit.items}
          height={320}
        />
        <FinancialBridge
          title={financialData.bridges.ebitda.title}
          subtitle={financialData.bridges.ebitda.subtitle}
          items={financialData.bridges.ebitda.items}
          height={320}
        />
      </div>
    </div>
  );
}
