import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId");
    const year = searchParams.get("year");

    const where: Record<string, unknown> = {};
    if (departmentId) where.departmentId = departmentId;
    if (year) where.year = parseInt(year);

    const entries = await prisma.monthlyEntry.findMany({
      where,
      include: { department: true },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });
    return NextResponse.json(entries);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("GET /api/entries error:", message);
    return NextResponse.json(
      { error: message, tursoUrl: process.env.TURSO_DATABASE_URL ? "set" : "NOT SET" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Get authenticated user name from middleware headers
  const updatedBy = request.headers.get("x-user-name") || "Unknown";

  const body = await request.json();
  const { entries } = body as {
    entries: Array<{
      departmentId: string;
      year: number;
      month: number;
      type: string;
      grossBookedSales: number;
      gmPercent: number;
      cpPercent: number;
    }>;
  };

  if (!entries || !Array.isArray(entries)) {
    return NextResponse.json(
      { error: "entries array is required" },
      { status: 400 }
    );
  }

  const results = [];
  for (const entry of entries) {
    const result = await prisma.monthlyEntry.upsert({
      where: {
        departmentId_year_month_type: {
          departmentId: entry.departmentId,
          year: entry.year,
          month: entry.month,
          type: entry.type,
        },
      },
      update: {
        grossBookedSales: entry.grossBookedSales,
        gmPercent: entry.gmPercent,
        cpPercent: entry.cpPercent,
        updatedBy,
      },
      create: {
        departmentId: entry.departmentId,
        year: entry.year,
        month: entry.month,
        type: entry.type,
        grossBookedSales: entry.grossBookedSales,
        gmPercent: entry.gmPercent,
        cpPercent: entry.cpPercent,
        updatedBy,
      },
    });
    results.push(result);
  }

  return NextResponse.json({ ok: true, count: results.length });
}
