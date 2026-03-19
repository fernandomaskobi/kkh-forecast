"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList,
} from "recharts";

export type BridgeItem = {
  name: string;
  value: number;
  isTotal?: boolean;
};

type FinancialBridgeProps = {
  title: string;
  subtitle?: string;
  items: BridgeItem[];
  height?: number;
};

const COLORS = {
  total: "#1e293b",
  increase: "#0d9488",
  decrease: "#e11d48",
  refLine: "#94a3b8",
};

function fmtAxis(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtVariance(v: number) {
  const abs = Math.abs(v);
  const prefix = v >= 0 ? "+" : "-";
  if (abs >= 1_000_000) return `${prefix}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefix}$${(abs / 1_000).toFixed(0)}K`;
  return `${prefix}$${abs.toFixed(0)}`;
}

export default function FinancialBridge({ title, subtitle, items, height = 320 }: FinancialBridgeProps) {
  if (!items.length) return null;

  // Build waterfall data
  type WaterfallItem = {
    name: string;
    value: number;
    base: number;
    displayValue: number;
    fill: string;
    isTotal: boolean;
    variance?: number;
  };

  const waterfallData: WaterfallItem[] = [];
  let runningTotal = 0;
  let minVal = Infinity;
  let maxVal = -Infinity;

  for (const item of items) {
    if (item.isTotal) {
      waterfallData.push({
        name: item.name,
        value: item.value,
        base: 0,
        displayValue: item.value,
        fill: COLORS.total,
        isTotal: true,
      });
      runningTotal = item.value;
      minVal = Math.min(minVal, item.value);
      maxVal = Math.max(maxVal, item.value);
    } else {
      const base = item.value >= 0 ? runningTotal : runningTotal + item.value;
      const top = item.value >= 0 ? runningTotal + item.value : runningTotal;
      waterfallData.push({
        name: item.name,
        value: Math.abs(item.value),
        base,
        displayValue: item.value,
        fill: item.value >= 0 ? COLORS.increase : COLORS.decrease,
        isTotal: false,
        variance: item.value,
      });
      runningTotal += item.value;
      minVal = Math.min(minVal, base, top);
      maxVal = Math.max(maxVal, base, top);
    }
  }

  // Y-axis zoom
  const range = maxVal - minVal;
  const padding = Math.max(range * 0.4, 500);
  const yMin = Math.floor((minVal - padding) / 1_000) * 1_000;
  const yMax = Math.ceil((maxVal + padding) / 1_000) * 1_000;

  // Clip total bars to start at yMin
  const clippedData = waterfallData.map((d) => {
    if (d.isTotal) {
      return { ...d, base: yMin, value: d.displayValue - yMin };
    }
    return d;
  });

  // Reference line at first total value
  const firstTotal = items.find((i) => i.isTotal)?.value || 0;

  // Summary: start and end totals
  const totals = items.filter((i) => i.isTotal);
  const startVal = totals[0]?.value || 0;
  const endVal = totals[totals.length - 1]?.value || 0;
  const totalVariance = endVal - startVal;
  const variancePct = startVal ? ((endVal - startVal) / Math.abs(startVal)) * 100 : 0;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--charcoal)" }}>{title}</h3>
          {subtitle && <p className="text-[10px] mt-0.5" style={{ color: "var(--light-accessible)" }}>{subtitle}</p>}
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: "var(--mid)" }}>
            {fmtAxis(startVal)} → {fmtAxis(endVal)}
          </div>
          <div className={`text-sm font-bold ${totalVariance >= 0 ? "text-teal-600" : "text-rose-600"}`}>
            {fmtVariance(totalVariance)} ({variancePct >= 0 ? "+" : ""}{variancePct.toFixed(1)}%)
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-3 text-[10px]" style={{ color: "var(--light-accessible)" }}>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS.increase }} /> Favorable
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS.decrease }} /> Unfavorable
        </span>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={clippedData} barCategoryGap="15%" margin={{ top: 20, right: 10, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, fill: "#64748b" }}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={55}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickFormatter={fmtAxis}
            domain={[yMin, yMax]}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0]?.payload;
              if (!data) return null;
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                  <p className="font-semibold text-gray-800 mb-1">{data.name}</p>
                  {data.isTotal ? (
                    <p className="text-gray-600">Total: <span className="font-medium">{fmtAxis(data.displayValue)}</span></p>
                  ) : (
                    <p className={data.variance >= 0 ? "text-teal-600" : "text-rose-600"}>
                      Variance: <span className="font-medium">{fmtVariance(data.variance)}</span>
                    </p>
                  )}
                </div>
              );
            }}
          />
          <Bar dataKey="base" stackId="waterfall" fill="transparent" radius={0}>
            <LabelList content={() => null} />
          </Bar>
          <Bar dataKey="value" stackId="waterfall" radius={[3, 3, 0, 0]}>
            {clippedData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} opacity={entry.isTotal ? 1 : 0.9} />
            ))}
            <LabelList
              content={(props) => {
                const { x, y, width, index } = props as { x: number; y: number; width: number; index: number };
                const item = clippedData[index];
                if (!item || item.isTotal) return null;
                const label = fmtVariance(item.variance || 0);
                const color = (item.variance || 0) >= 0 ? COLORS.increase : COLORS.decrease;
                return (
                  <text x={x + width / 2} y={y - 6} textAnchor="middle" fill={color} fontSize={8} fontWeight={600}>
                    {label}
                  </text>
                );
              }}
            />
          </Bar>
          <ReferenceLine
            y={firstTotal}
            stroke={COLORS.refLine}
            strokeDasharray="6 3"
            strokeWidth={1.5}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
