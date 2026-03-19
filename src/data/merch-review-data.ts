// Static merch review data — representative values from KKH operational reports
// This can later be connected to a live API

export type MonthlyMerchData = {
  month: string;
  booked: number;
  shipped: number;
  cancels: number;
  returns: number;
  fillRate: number;
  orders: number;
};

export type DeptBreakdown = {
  department: string;
  booked: number;
  shipped: number;
  cancels: number;
  net: number;
  fillRate: number;
  avgShipDays: number;
};

export type CancelReason = {
  reason: string;
  amount: number;
  count: number;
};

export type PnlCompRow = {
  label: string;
  actual: number;
  aop: number;
  isBold?: boolean;
  format: "$" | "%";
};

// Monthly trend data (2025 vs 2026 YTD)
export const monthly2025: MonthlyMerchData[] = [
  { month: "Jan", booked: 5050, shipped: 4298, cancels: 376, returns: 179, fillRate: 0.85, orders: 3210 },
  { month: "Feb", booked: 5049, shipped: 4505, cancels: 375, returns: 178, fillRate: 0.89, orders: 3180 },
  { month: "Mar", booked: 5200, shipped: 4650, cancels: 390, returns: 185, fillRate: 0.89, orders: 3350 },
  { month: "Apr", booked: 4980, shipped: 4410, cancels: 365, returns: 172, fillRate: 0.89, orders: 3120 },
  { month: "May", booked: 5150, shipped: 4580, cancels: 378, returns: 180, fillRate: 0.89, orders: 3280 },
  { month: "Jun", booked: 5320, shipped: 4730, cancels: 395, returns: 188, fillRate: 0.89, orders: 3400 },
  { month: "Jul", booked: 4850, shipped: 4310, cancels: 350, returns: 168, fillRate: 0.89, orders: 3050 },
  { month: "Aug", booked: 5100, shipped: 4520, cancels: 372, returns: 176, fillRate: 0.89, orders: 3230 },
  { month: "Sep", booked: 5400, shipped: 4810, cancels: 400, returns: 190, fillRate: 0.89, orders: 3450 },
  { month: "Oct", booked: 5600, shipped: 4980, cancels: 415, returns: 197, fillRate: 0.89, orders: 3580 },
  { month: "Nov", booked: 5900, shipped: 5250, cancels: 435, returns: 206, fillRate: 0.89, orders: 3780 },
  { month: "Dec", booked: 5650, shipped: 5020, cancels: 420, returns: 198, fillRate: 0.89, orders: 3610 },
];

export const monthly2026: MonthlyMerchData[] = [
  { month: "Jan", booked: 5556, shipped: 3912, cancels: 392, returns: 101, fillRate: 0.82, orders: 3520 },
  { month: "Feb", booked: 5008, shipped: 4330, cancels: 341, returns: 177, fillRate: 0.86, orders: 3200 },
];

// Department breakdown (current month - Feb 2026)
export const deptBreakdown: DeptBreakdown[] = [
  { department: "Kathy Kuo Home", booked: 2450, shipped: 2120, cancels: 165, net: 2285, fillRate: 0.87, avgShipDays: 12 },
  { department: "Studio", booked: 380, shipped: 310, cancels: 28, net: 352, fillRate: 0.82, avgShipDays: 15 },
  { department: "Trade", booked: 1580, shipped: 1350, cancels: 112, net: 1468, fillRate: 0.85, avgShipDays: 14 },
  { department: "One Kings Lane", booked: 450, shipped: 390, cancels: 25, net: 425, fillRate: 0.87, avgShipDays: 10 },
  { department: "Perigold", booked: 148, shipped: 160, cancels: 11, net: 137, fillRate: 0.92, avgShipDays: 8 },
];

// Cancellation reasons (YTD 2026)
export const cancelReasons: CancelReason[] = [
  { reason: "Changed Mind: Size Issue", amount: 285, count: 42 },
  { reason: "Backordered / Long Lead", amount: 198, count: 31 },
  { reason: "Found Better Price", amount: 142, count: 28 },
  { reason: "Design Direction Change", amount: 118, count: 19 },
  { reason: "Damaged in Transit", amount: 62, count: 8 },
  { reason: "Wrong Item Received", amount: 45, count: 6 },
  { reason: "Other", amount: 83, count: 15 },
];

// P&L Comparison (Feb 2026 Actuals vs AOP)
export const pnlComparison: PnlCompRow[] = [
  { label: "Gross Booked Sales", actual: 5556, aop: 5098, isBold: true, format: "$" },
  { label: "Discounts", actual: -568, aop: -498, format: "$" },
  { label: "Cancels", actual: -392, aop: -347, format: "$" },
  { label: "Returns", actual: -101, aop: -181, format: "$" },
  { label: "Net Booked", actual: 4785, aop: 4343, isBold: true, format: "$" },
  { label: "Gross Shipped Sales", actual: 3912, aop: 4343, isBold: true, format: "$" },
  { label: "Net Shipped Sales", actual: 4078, aop: 4340, isBold: true, format: "$" },
  { label: "GM%", actual: 0.52, aop: 0.51, format: "%" },
  { label: "Gross Profit", actual: 1890, aop: 2020, isBold: true, format: "$" },
  { label: "Marketing", actual: 668, aop: 650, format: "$" },
  { label: "Total SG&A", actual: 1240, aop: 1200, isBold: true, format: "$" },
  { label: "EBITDA", actual: -18, aop: 50, isBold: true, format: "$" },
];
