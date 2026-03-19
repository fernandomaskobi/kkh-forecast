"use client";

type TabBarProps = {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onChange: (id: string) => void;
};

export default function TabBar({ tabs, activeTab, onChange }: TabBarProps) {
  return (
    <div className="flex gap-0.5 p-1 mb-6" style={{ background: "var(--warm-white)", border: "1px solid var(--border)" }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 text-[0.6875rem] font-normal uppercase tracking-[0.14em] transition-all ${
            activeTab === tab.id
              ? "text-white shadow-sm"
              : "hover:bg-white/60"
          }`}
          style={
            activeTab === tab.id
              ? { background: "var(--charcoal)" }
              : { color: "var(--light-accessible)" }
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
