import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Use dynamic import for the generated Prisma client
const { PrismaClient } = await import("../src/generated/prisma/client.ts").catch(() => {
  // Fallback: try require-based approach
  return require("../src/generated/prisma/client");
});

const prisma = new PrismaClient();

const departments = [
  "Women's",
  "Men's",
  "Kids",
  "Accessories",
  "Footwear",
  "Home",
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

console.log("Seeded departments and admin user.");
await prisma.$disconnect();
