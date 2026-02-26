"use client";

import { useState, useEffect, useCallback } from "react";
import { MONTHS, CURRENT_MONTH, formatCurrency, formatPct } from "@/lib/constants";

type Entry = {
  month: number;
  grossBookedSales: number;
  gmPercent: number;
  cpPercent: number;
};

type MonthlyGridProps = {
  departmentId: string;
  departmentName: string;
  year: number;
  onSaved?: () => void;
};

const INPUT_METRICS = ["grossBookedSales", "gmPercent", "cpPercent"] as const;
const INPUT_LABELS: Record<string, string> = {
  grossBookedSales: "Gross Booked Sales",
  gmPercent: "GM %",
  cpPercent: "CP %",
};

export default function MonthlyGrid({
  departmentId,
  departmentName,
  year,
  onSaved,
}: MonthlyGridProps) {
  const [data, setData] = useState<Entry[]>(
    Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      grossBookedSales: 0,
      gmPercent: 0,
      cpPercent: 0,
    }))
  );
  const [priorYear, setPriorYear] = useState<Entry[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadData = useCallback(async () => {
    const [currentRes, priorRes] = await Promise.all([
      fetch(`/api/entries?departmentId=${departmentId}&year=${year}`),
      fetch(`/api/entries?departmentId=${departmentId}&year=${year - 1}`),
    ]);
    const currentEntries = await currentRes.json();
    const priorEntries = await priorRes.json();

    const newData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1, grossBookedSales: 0, gmPercent: 0, cpPercent: 0,
    }));
    for (const e of currentEntries) {
      const idx = e.month - 1;
      if (idx >= 0 && idx < 12) {
        newData[idx].grossBookedSales = e.grossBookedSales;
        newData[idx].gmPercent = e.gmPercent;
        newData[idx].cpPercent = e.cpPercent;
      }
    }
    setData(newData);

    const priorData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1, grossBookedSales: 0, gmPercent: 0, cpPercent: 0,
    }));
    for (const e of priorEntries) {
      const idx = e.month - 1;
      if (idx >= 0 && idx < 12) {
        priorData[idx].grossBookedSales = e.grossBookedSales;
        priorData[idx].gmPercent = e.gmPercent;
        priorData[idx].cpPercent = e.cpPercent;
      }
    }
    setPriorYear(priorData);
    setLoaded(true);
  }, [departmentId, year]);

  useEffect(() => {
    if (departmentId) loadData();
  }, [departmentId, loadData]);

  const updateCell = (month: number, metric: string, value: string) => {
    setData((prev) =>
      prev.map((entry) => {
        if (entry.month !== month) return entry;
        const numVal = parseFloat(value) || 0;
        const stored =
          metric === "gmPercent" || metric === "cpPercent"
            ? numVal / 100
            : numVal;
        return { ...entry, [metric]: stored };
      })
    );
  };

  const getDisplayValue = (entry: Entry, metric: string): string => {
    const val = entry[metric as keyof Entry] as number;
    if (!val) return "";
    if (metric === "gmPercent" || metric === "cpPercent") {
      return (val * 100).toFixed(1);
    }
    return val.toString();
  };

  const save = async () => {
    setSaving(true);
    const isCurrentYear = year === new Date().getFullYear();
    // updatedBy is now set server-side from the JWT session
    const entries = data.map((entry) => ({
      departmentId,
      year,
      month: entry.month,
      type: isCurrentYear && entry.month > CURRENT_MONTH ? "forecast" : "actual",
      grossBookedSales: entry.grossBookedSales,
      gmPercent: entry.gmPercent,
      cpPercent: entry.cpPercent,
    }));
    await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    setSaving(false);
    onSaved?.();
  };

  if (!departmentId) {
    return (
      <div className="text-gray-500 text-center py-12">
        Select a department to begin entering data.
      </div>
    );
  }

  const isCurrentYear = year === new Date().getFullYear();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{departmentName} &mdash; {year}</h2>
        <button onClick={save} disabled={saving}
          className="bg-brand text-white px-4 py-2 rounded text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {loaded && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left px-3 py-2 border font-medium w-36">Metric</th>
                {MONTHS.map((m, i) => {
                  const isActual = !isCurrentYear || i + 1 <= CURRENT_MONTH;
                  return (
                    <th key={m} className={`px-3 py-2 border text-center font-medium ${isActual ? "bg-gray-100" : "bg-brand-50"}`}>
                      {m}
                      <div className="text-[10px] font-normal text-gray-400">{isActual ? "ACT" : "YTG"}</div>
                    </th>
                  );
                })}
                <th className="px-3 py-2 border text-center font-medium bg-gray-200">Total</th>
              </tr>
            </thead>
            <tbody>
              {INPUT_METRICS.map((metric) => {
                const isPct = metric === "gmPercent" || metric === "cpPercent";
                const total = isPct
                  ? (() => {
                      const totalSales = data.reduce((s, e) => s + e.grossBookedSales, 0);
                      return totalSales ? data.reduce((s, e) => s + e.grossBookedSales * (e[metric] || 0), 0) / totalSales : 0;
                    })()
                  : data.reduce((s, e) => s + (e[metric] || 0), 0);

                return (
                  <tr key={metric} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border font-medium text-xs">{INPUT_LABELS[metric]}</td>
                    {data.map((entry, i) => {
                      const isActual = !isCurrentYear || entry.month <= CURRENT_MONTH;
                      return (
                        <td key={i} className={`px-1 py-1 border ${isActual ? "bg-white" : "bg-brand-50/50"}`}>
                          <input type="number" step={isPct ? "0.1" : "1"}
                            value={getDisplayValue(entry, metric)}
                            onChange={(e) => updateCell(entry.month, metric, e.target.value)}
                            className="w-full text-right px-2 py-1 rounded border-0 bg-transparent focus:bg-white focus:ring-2 focus:ring-brand-light text-sm"
                            placeholder={isPct ? "0.0" : "0"} />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 border text-right font-semibold bg-gray-50 text-xs">
                      {isPct ? formatPct(total) : formatCurrency(total)}
                    </td>
                  </tr>
                );
              })}

              {/* Calculated: GM $, CP $ */}
              {(["gm", "cp"] as const).map((prefix) => {
                const pctKey = `${prefix}Percent` as keyof Entry;
                const label = prefix === "gm" ? "GM $" : "CP $";
                const vals = data.map((e) => e.grossBookedSales * ((e[pctKey] as number) || 0));
                const total = vals.reduce((a, b) => a + b, 0);
                return (
                  <tr key={`calc-${prefix}`} className="bg-green-50/50">
                    <td className="px-3 py-2 border font-medium text-xs text-green-700">
                      {label} <span className="text-[10px] text-gray-400">(calc)</span>
                    </td>
                    {vals.map((val, i) => (
                      <td key={i} className="px-2 py-2 border text-right text-xs text-green-700">
                        {val ? formatCurrency(val) : "—"}
                      </td>
                    ))}
                    <td className="px-3 py-2 border text-right font-semibold bg-green-50 text-xs text-green-700">
                      {total ? formatCurrency(total) : "—"}
                    </td>
                  </tr>
                );
              })}

              {/* Prior year reference */}
              {priorYear.length > 0 && (
                <>
                  <tr>
                    <td colSpan={14} className="px-3 py-1 border bg-gray-200 text-xs font-medium text-gray-500">
                      {year - 1} ACTUALS (reference)
                    </td>
                  </tr>
                  {INPUT_METRICS.map((metric) => {
                    const isPct = metric === "gmPercent" || metric === "cpPercent";
                    const total = isPct
                      ? (() => {
                          const ts = priorYear.reduce((s, e) => s + e.grossBookedSales, 0);
                          return ts ? priorYear.reduce((s, e) => s + e.grossBookedSales * (e[metric] || 0), 0) / ts : 0;
                        })()
                      : priorYear.reduce((s, e) => s + (e[metric] || 0), 0);
                    return (
                      <tr key={`prior-${metric}`} className="text-gray-400">
                        <td className="px-3 py-1 border text-xs">{INPUT_LABELS[metric]}</td>
                        {priorYear.map((entry, i) => {
                          const val = entry[metric] as number;
                          return (
                            <td key={i} className="px-2 py-1 border text-right text-xs">
                              {val ? (isPct ? formatPct(val) : formatCurrency(val)) : "—"}
                            </td>
                          );
                        })}
                        <td className="px-2 py-1 border text-right text-xs font-medium">
                          {isPct ? formatPct(total) : formatCurrency(total)}
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
