"use client";

import { useState, Fragment } from "react";

type PeriodData = {
  actuals: number | null;
  fcst: number | null;
  aop: number | null;
  ly: number | null;
};

export type PnlLineItem = {
  id: string;
  label: string;
  row: number;
  format: "$" | "%";
  isBold: boolean;
  data: Record<string, PeriodData>;
};

type PnlTableProps = {
  lineItems: PnlLineItem[];
  selectedPeriod: string;
};

type RowGroup = {
  header: PnlLineItem;
  headerIdx: number;
  children: { item: PnlLineItem; idx: number }[];
};

function fmtDollar(v: number | null): string {
  if (v === null || v === undefined) return "\u2014";
  if (v === 0) return "$0";
  const abs = Math.abs(v);
  // Values are already in $K from Excel
  if (abs >= 10_000) return `$${(v / 1_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(2)}M`;
  if (abs >= 1) return `$${v.toFixed(0)}K`;
  return `$${v.toFixed(1)}K`;
}

function fmtPct(v: number | null): string {
  if (v === null || v === undefined) return "\u2014";
  return `${(v * 100).toFixed(1)}%`;
}

function deltaText(val: number | null, ref: number | null, isPct: boolean): { text: string; positive: boolean | null } {
  if (val === null || ref === null) return { text: "\u2014", positive: null };
  if (isPct) {
    const bp = (val - ref) * 100;
    return { text: `${bp >= 0 ? "+" : ""}${bp.toFixed(1)}pp`, positive: bp > 0 ? true : bp < 0 ? false : null };
  }
  if (ref === 0) return { text: "\u2014", positive: null };
  const pct = ((val - ref) / Math.abs(ref)) * 100;
  return { text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, positive: pct > 0 ? true : pct < 0 ? false : null };
}

function buildGroups(items: PnlLineItem[]): RowGroup[] {
  const groups: RowGroup[] = [];
  let current: RowGroup | null = null;

  items.forEach((item, idx) => {
    if (item.isBold) {
      // Push previous group
      if (current) groups.push(current);
      current = { header: item, headerIdx: idx, children: [] };
    } else {
      if (current) {
        current.children.push({ item, idx });
      } else {
        // Non-bold before any bold — treat as standalone group
        groups.push({ header: item, headerIdx: idx, children: [] });
      }
    }
  });
  if (current) groups.push(current);
  return groups;
}

export default function PnlTable({ lineItems, selectedPeriod }: PnlTableProps) {
  const groups = buildGroups(lineItems);
  const [collapsed, setCollapsed] = useState<Set<number>>(() => {
    // Start with all groups collapsed
    return new Set(groups.filter(g => g.children.length > 0).map(g => g.headerIdx));
  });

  const toggle = (headerIdx: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(headerIdx)) next.delete(headerIdx);
      else next.add(headerIdx);
      return next;
    });
  };

  const fmt = (item: PnlLineItem, v: number | null) =>
    item.format === "%" ? fmtPct(v) : fmtDollar(v);

  const deltaColor = (d: { positive: boolean | null }) =>
    d.positive === true ? "var(--green)" : d.positive === false ? "#9B4444" : "var(--light-accessible)";

  const renderRow = (item: PnlLineItem, idx: number, isChild: boolean) => {
    const d = item.data[selectedPeriod] || { actuals: null, fcst: null, aop: null, ly: null };
    const isPct = item.format === "%";

    const actVsPlan = deltaText(d.actuals, d.aop, isPct);
    const actVsLy = deltaText(d.actuals, d.ly, isPct);
    const fcstVsPlan = deltaText(d.fcst, d.aop, isPct);
    const fcstVsLy = deltaText(d.fcst, d.ly, isPct);

    const rowBg = item.isBold
      ? "rgba(184,147,90,0.08)"
      : idx % 2 === 0
        ? "transparent"
        : "rgba(0,0,0,0.015)";
    const borderBottom = item.isBold
      ? "2px solid rgba(184,147,90,0.25)"
      : "1px solid var(--border)";

    return (
      <tr
        key={item.id + "-" + idx}
        className="transition-colors hover:bg-white/40"
        style={{ borderBottom, background: rowBg }}
      >
        <td
          className={`py-2.5 px-4 sticky left-0 z-10 ${item.isBold ? "font-semibold" : "font-normal"} ${isPct ? "italic" : ""}`}
          style={{
            color: item.isBold ? "var(--charcoal)" : isPct ? "#2d6a6a" : "var(--mid)",
            background: rowBg === "transparent" ? "var(--warm-white)" : rowBg,
            fontSize: item.isBold ? "0.75rem" : "0.6875rem",
            paddingLeft: isChild ? "2rem" : "1rem",
          }}
        >
          {item.label}
        </td>
        <td className="py-2.5 px-3 text-right tabular-nums font-medium" style={{ color: "var(--charcoal)" }}>{fmt(item, d.actuals)}</td>
        <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "var(--mid)" }}>{fmt(item, d.fcst)}</td>
        <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "var(--light-accessible)" }}>{fmt(item, d.aop)}</td>
        <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "var(--light-accessible)" }}>{fmt(item, d.ly)}</td>
        <td className="py-2.5 px-3 text-right tabular-nums font-medium" style={{ color: deltaColor(actVsPlan) }}>{actVsPlan.text}</td>
        <td className="py-2.5 px-3 text-right tabular-nums font-medium" style={{ color: deltaColor(actVsLy) }}>{actVsLy.text}</td>
        <td className="py-2.5 px-3 text-right tabular-nums font-medium" style={{ color: deltaColor(fcstVsPlan) }}>{fcstVsPlan.text}</td>
        <td className="py-2.5 px-3 text-right tabular-nums font-medium" style={{ color: deltaColor(fcstVsLy) }}>{fcstVsLy.text}</td>
      </tr>
    );
  };

  return (
    <div className="card overflow-hidden">
      <div className="overflow-auto" style={{ maxHeight: "70vh" }}>
        <table className="w-full text-xs" style={{ minWidth: 900 }}>
          <thead className="sticky top-0 z-20">
            <tr style={{ background: "var(--charcoal)" }}>
              <th className="text-left py-3 px-4 text-[0.625rem] uppercase tracking-[0.14em] font-normal text-white sticky left-0 z-30" style={{ background: "var(--charcoal)", minWidth: 220 }}>
                Line Item
              </th>
              <th className="text-right py-3 px-3 text-[0.625rem] uppercase tracking-[0.14em] font-normal text-white">Actuals</th>
              <th className="text-right py-3 px-3 text-[0.625rem] uppercase tracking-[0.14em] font-normal text-white">Fcst</th>
              <th className="text-right py-3 px-3 text-[0.625rem] uppercase tracking-[0.14em] font-normal text-white">AOP</th>
              <th className="text-right py-3 px-3 text-[0.625rem] uppercase tracking-[0.14em] font-normal text-white">LY</th>
              <th className="text-right py-3 px-3 text-[0.625rem] uppercase tracking-[0.14em] font-normal" style={{ color: "rgba(255,255,255,0.6)", background: "var(--charcoal)" }}>Act vs Plan</th>
              <th className="text-right py-3 px-3 text-[0.625rem] uppercase tracking-[0.14em] font-normal" style={{ color: "rgba(255,255,255,0.6)", background: "var(--charcoal)" }}>Act vs LY</th>
              <th className="text-right py-3 px-3 text-[0.625rem] uppercase tracking-[0.14em] font-normal" style={{ color: "rgba(255,255,255,0.6)", background: "var(--charcoal)" }}>Fcst vs Plan</th>
              <th className="text-right py-3 px-3 text-[0.625rem] uppercase tracking-[0.14em] font-normal" style={{ color: "rgba(255,255,255,0.6)", background: "var(--charcoal)" }}>Fcst vs LY</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const hasChildren = group.children.length > 0;
              const isCollapsed = collapsed.has(group.headerIdx);
              const item = group.header;
              const d = item.data[selectedPeriod] || { actuals: null, fcst: null, aop: null, ly: null };
              const isPct = item.format === "%";

              const actVsPlan = deltaText(d.actuals, d.aop, isPct);
              const actVsLy = deltaText(d.actuals, d.ly, isPct);
              const fcstVsPlan = deltaText(d.fcst, d.aop, isPct);
              const fcstVsLy = deltaText(d.fcst, d.ly, isPct);

              const rowBg = item.isBold
                ? "rgba(184,147,90,0.08)"
                : group.headerIdx % 2 === 0
                  ? "transparent"
                  : "rgba(0,0,0,0.015)";
              const borderBottom = item.isBold
                ? "2px solid rgba(184,147,90,0.25)"
                : "1px solid var(--border)";

              return (
                <Fragment key={item.id + "-" + group.headerIdx}>
                  {/* Group header row */}
                  <tr
                    className={`transition-colors ${hasChildren ? "cursor-pointer" : ""} hover:bg-white/40`}
                    style={{ borderBottom, background: rowBg }}
                    onClick={hasChildren ? () => toggle(group.headerIdx) : undefined}
                  >
                    <td
                      className={`py-2.5 px-4 sticky left-0 z-10 ${item.isBold ? "font-semibold" : "font-normal"} ${isPct ? "italic" : ""} select-none`}
                      style={{
                        color: item.isBold ? "var(--charcoal)" : isPct ? "#2d6a6a" : "var(--mid)",
                        background: rowBg === "transparent" ? "var(--warm-white)" : rowBg,
                        fontSize: item.isBold ? "0.75rem" : "0.6875rem",
                        paddingLeft: "1rem",
                      }}
                    >
                      <span className="flex items-center gap-1.5">
                        {hasChildren && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-3 w-3 flex-shrink-0 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            style={{ opacity: 0.4 }}
                          >
                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                          </svg>
                        )}
                        {!hasChildren && <span className="w-3 flex-shrink-0" />}
                        {item.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-medium" style={{ color: "var(--charcoal)" }}>{fmt(item, d.actuals)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "var(--mid)" }}>{fmt(item, d.fcst)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "var(--light-accessible)" }}>{fmt(item, d.aop)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: "var(--light-accessible)" }}>{fmt(item, d.ly)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-medium" style={{ color: deltaColor(actVsPlan) }}>{actVsPlan.text}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-medium" style={{ color: deltaColor(actVsLy) }}>{actVsLy.text}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-medium" style={{ color: deltaColor(fcstVsPlan) }}>{fcstVsPlan.text}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-medium" style={{ color: deltaColor(fcstVsLy) }}>{fcstVsLy.text}</td>
                  </tr>
                  {/* Child rows */}
                  {!isCollapsed && group.children.map((child) => renderRow(child.item, child.idx, true))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
