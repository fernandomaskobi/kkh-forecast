import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(departments);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, category = "merch" } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const department = await prisma.department.create({
    data: { name, category },
  });
  return NextResponse.json(department);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  await prisma.department.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
