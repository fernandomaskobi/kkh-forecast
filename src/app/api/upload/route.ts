import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows, departmentId, year, type = "actual" } = body as {
      rows: Array<{
        department?: string;
        month: number;
        grossBookedSales: number;
        gmPercent: number;
        cpPercent: number;
      }>;
      departmentId?: string;
      year: number;
      type?: string;
    };

    if (!rows || !year) {
      return NextResponse.json(
        { error: "rows and year are required" },
        { status: 400 }
      );
    }

    // If rows have a "department" column, resolve names to IDs
    const hasDeptColumn = rows.some((r) => r.department);

    let deptNameToId: Map<string, string> | null = null;
    if (hasDeptColumn) {
      const allDepts = await prisma.department.findMany();
      deptNameToId = new Map<string, string>();
      for (const d of allDepts) {
        deptNameToId.set(d.name.toLowerCase(), d.id);
      }
    }

    let count = 0;
    const errors: string[] = [];

    for (const row of rows) {
      let resolvedDeptId = departmentId || "";

      if (hasDeptColumn && row.department) {
        const found = deptNameToId?.get(row.department.toLowerCase());
        if (!found) {
          errors.push(`Department "${row.department}" not found`);
          continue;
        }
        resolvedDeptId = found;
      }

      if (!resolvedDeptId) {
        errors.push(`Row month=${row.month}: no department specified`);
        continue;
      }

      await prisma.monthlyEntry.upsert({
        where: {
          departmentId_year_month_type: {
            departmentId: resolvedDeptId,
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
          departmentId: resolvedDeptId,
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

    return NextResponse.json({ ok: true, count, errors: errors.length ? errors : undefined });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
