export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const CURRENT_MONTH = new Date().getMonth() + 1; // 1-12
export const CURRENT_YEAR = new Date().getFullYear();

export type MetricKey =
  | "grossBookedSales"
  | "gmDollars"
  | "gmPercent"
  | "cpDollars"
  | "cpPercent"
  | "salesMix";

export const METRIC_LABELS: Record<MetricKey, string> = {
  grossBookedSales: "Gross Booked Sales",
  gmDollars: "GM $",
  gmPercent: "GM %",
  cpDollars: "CP $",
  cpPercent: "CP %",
  salesMix: "Sales Mix",
};

export function formatCurrency(value: number): string {
  const millions = value / 1_000_000;
  const abs = Math.abs(millions);
  if (abs >= 10) return `$${millions.toFixed(1)}M`;
  if (abs >= 1) return `$${millions.toFixed(2)}M`;
  if (abs >= 0.01) return `$${millions.toFixed(3)}M`;
  if (value === 0) return "$0";
  return `$${millions.toFixed(3)}M`;
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatVariance(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function formatMetricValue(metric: MetricKey, value: number): string {
  if (metric === "gmPercent" || metric === "cpPercent" || metric === "salesMix") {
    return formatPct(value);
  }
  return formatCurrency(value);
}
