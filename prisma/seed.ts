import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create categories
  const spirits = await prisma.category.upsert({
    where: { name: "Spirits" },
    update: {},
    create: { name: "Spirits" },
  });
  const beer = await prisma.category.upsert({
    where: { name: "Beer" },
    update: {},
    create: { name: "Beer" },
  });
  const cocktails = await prisma.category.upsert({
    where: { name: "Cocktails" },
    update: {},
    create: { name: "Cocktails" },
  });
  const nonAlcoholic = await prisma.category.upsert({
    where: { name: "Non-Alcoholic" },
    update: {},
    create: { name: "Non-Alcoholic" },
  });

  // Create menu items
  const menuItems = [
    { name: "Whiskey (shot)", price: 5.0, categoryId: spirits.id },
    { name: "Vodka (shot)", price: 4.5, categoryId: spirits.id },
    { name: "Rum (shot)", price: 4.5, categoryId: spirits.id },
    { name: "Gin (shot)", price: 5.0, categoryId: spirits.id },
    { name: "Draft Beer", price: 4.0, categoryId: beer.id },
    { name: "Bottled Beer", price: 3.5, categoryId: beer.id },
    { name: "Mojito", price: 8.0, categoryId: cocktails.id },
    { name: "Margarita", price: 8.5, categoryId: cocktails.id },
    { name: "Long Island Iced Tea", price: 10.0, categoryId: cocktails.id },
    { name: "Soda", price: 2.0, categoryId: nonAlcoholic.id },
    { name: "Juice", price: 2.5, categoryId: nonAlcoholic.id },
    { name: "Water", price: 1.0, categoryId: nonAlcoholic.id },
  ];

  for (const item of menuItems) {
    const created = await prisma.menuItem.upsert({
      where: { id: `seed-${item.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}` },
      update: {},
      create: {
        id: `seed-${item.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        ...item,
        price: item.price,
      },
    });

    // Add inventory tracking
    await prisma.inventoryItem.upsert({
      where: { menuItemId: created.id },
      update: {},
      create: {
        menuItemId: created.id,
        quantity: 50,
        unit: "units",
        lowThreshold: 10,
      },
    });
  }

  // Create owner account
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

  // Create bartender account
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
  console.log("Owner: owner@workshopbar.com / owner123");
  console.log("Bartender: bartender@workshopbar.com / bartender123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
