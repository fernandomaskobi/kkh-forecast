import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
