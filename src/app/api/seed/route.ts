import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";

export async function POST() {
  // Seed departments
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

  // Seed admin user (fernando@kathykuohome.com)
  const adminEmail = "fernando@kathykuohome.com";
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  if (!existing) {
    const passwordHash = await hashPassword("ChangeMe123!");
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Fernando",
        role: "admin",
        passwordHash,
      },
    });
  }

  return NextResponse.json({ ok: true, message: "Seeded successfully" });
}
