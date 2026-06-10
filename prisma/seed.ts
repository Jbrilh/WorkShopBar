import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const ownerPassword = await bcrypt.hash("owner123", 12);
  await prisma.user.upsert({
    where: { email: "owner@workshopbar.com" },
    update: {},
    create: {
      email: "owner@workshopbar.com",
      name: "Bar Owner",
      hashedPassword: ownerPassword,
      role: Role.OWNER,
    },
  });

  const bartenderPassword = await bcrypt.hash("bartender123", 12);
  await prisma.user.upsert({
    where: { email: "bartender@workshopbar.com" },
    update: {},
    create: {
      email: "bartender@workshopbar.com",
      name: "Main Bartender",
      hashedPassword: bartenderPassword,
      role: Role.BARTENDER,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
