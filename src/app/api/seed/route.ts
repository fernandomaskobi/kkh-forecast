import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  const departments = [
    "Art",
    "Bedding & Bath",
    "Decor",
    "Dining & Bar",
    "Furniture",
    "Kids Shop",
    "Lighting",
    "Mirrors",
    "Outdoor",
    "Rugs",
    "Upholstery",
    "Wallpaper",
  ];

  for (const name of departments) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name, category: "merch" },
    });
  }

  const existing = await prisma.user.findFirst({ where: { name: "Admin" } });
  if (!existing) {
    await prisma.user.create({
      data: { name: "Admin", role: "admin" },
    });
  }

  return NextResponse.json({ ok: true, message: "Seeded successfully" });
}
