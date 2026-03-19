"use client";

type PeriodSelectorProps = {
  periods: { value: string; label: string }[];
  selected: string;
  onChange: (value: string) => void;
  variant?: "buttons" | "select";
};

// Default financial periods
export const FINANCIAL_PERIODS = [
  { value: "Jan", label: "Jan" },
  { value: "Feb", label: "Feb" },
  { value: "Mar", label: "Mar" },
  { value: "Q1", label: "Q1" },
  { value: "Apr", label: "Apr" },
  { value: "May", label: "May" },
  { value: "Jun", label: "Jun" },
  { value: "Q2", label: "Q2" },
  { value: "Jul", label: "Jul" },
  { value: "Aug", label: "Aug" },
  { value: "Sep", label: "Sep" },
  { value: "Q3", label: "Q3" },
  { value: "Oct", label: "Oct" },
  { value: "Nov", label: "Nov" },
  { value: "Dec", label: "Dec" },
  { value: "Q4", label: "Q4" },
  { value: "FY", label: "FY" },
];

export default function PeriodSelector({ periods, selected, onChange, variant = "buttons" }: PeriodSelectorProps) {
  if (variant === "select") {
    return (
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="text-[0.8125rem] px-3 py-2 min-w-[120px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-light"
        style={{ border: "1px solid var(--border)", color: "var(--charcoal)", background: "var(--warm-white)" }}
      >
        {periods.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex gap-0.5 p-1 flex-wrap" style={{ background: "var(--warm-white)", border: "1px solid var(--border)" }}>
      {periods.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-2.5 py-1.5 text-[0.6875rem] font-normal uppercase tracking-[0.10em] transition-all ${
            selected === p.value
              ? "text-white shadow-sm"
              : "hover:bg-white/60"
          }`}
          style={
            selected === p.value
              ? { background: "var(--charcoal)" }
              : { color: "var(--light-accessible)" }
          }
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
