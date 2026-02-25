import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { rows, departmentId, year, type = "actual" } = body as {
    rows: Array<{
      month: number;
      grossBookedSales: number;
      gmPercent: number;
      cpPercent: number;
    }>;
    departmentId: string;
    year: number;
    type?: string;
  };

  if (!rows || !departmentId || !year) {
    return NextResponse.json(
      { error: "rows, departmentId, and year are required" },
      { status: 400 }
    );
  }

  let count = 0;
  for (const row of rows) {
    await prisma.monthlyEntry.upsert({
      where: {
        departmentId_year_month_type: {
          departmentId,
          year,
          month: row.month,
          type,
        },
      },
      update: {
        grossBookedSales: row.grossBookedSales,
        gmPercent: row.gmPercent,
        cpPercent: row.cpPercent,
        updatedBy: "CSV Import",
      },
      create: {
        departmentId,
        year,
        month: row.month,
        type,
        grossBookedSales: row.grossBookedSales,
        gmPercent: row.gmPercent,
        cpPercent: row.cpPercent,
        updatedBy: "CSV Import",
      },
    });
    count++;
  }

  return NextResponse.json({ ok: true, count });
}
