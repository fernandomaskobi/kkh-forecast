import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/annotations?departmentId=xxx&year=2026 or GET /api/annotations (all)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get("departmentId");
  const year = searchParams.get("year");

  const where: Record<string, unknown> = {};
  if (departmentId) where.departmentId = departmentId;
  if (year) where.year = parseInt(year);

  const annotations = await prisma.annotation.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(annotations);
}

// POST /api/annotations — create a new annotation
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { departmentId, year, month, text } = body as {
    departmentId: string;
    year: number;
    month: number;
    text: string;
  };

  if (!departmentId || !year || !month || !text?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const author = request.headers.get("x-user-name") || "Unknown";

  const annotation = await prisma.annotation.create({
    data: {
      departmentId,
      year,
      month,
      text: text.trim(),
      author,
    },
  });

  return NextResponse.json(annotation);
}

// DELETE /api/annotations?id=xxx — delete an annotation
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await prisma.annotation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
