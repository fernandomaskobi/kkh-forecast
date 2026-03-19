"use client";

type KpiCardProps = {
  label: string;
  value: string;
  badges: { text: string; positive: boolean }[];
  accentColor: string;
  animationDelay?: number; // 1-4
};

export default function KpiCard({ label, value, badges, accentColor, animationDelay = 1 }: KpiCardProps) {
  return (
    <div className={`card p-5 relative overflow-hidden animate-fade-in-delay-${animationDelay}`}>
      {/* Accent top border */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accentColor }} />
      <div className="relative">
        <div className="mb-3">
          <span className="text-[0.6875rem] font-normal uppercase tracking-[0.18em]" style={{ color: "var(--light-accessible)" }}>
            {label}
          </span>
        </div>
        <div
          className="text-[2.5rem] leading-none mb-3"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: "var(--charcoal)", fontWeight: 400 }}
        >
          {value}
        </div>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge, i) => (
            <span
              key={i}
              className="inline-block text-[0.6875rem] font-medium px-2 py-0.5"
              style={{
                color: badge.positive ? "var(--green)" : "#9B4444",
                background: badge.positive ? "rgba(93,101,86,0.1)" : "rgba(155,68,68,0.1)",
              }}
            >
              {badge.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
