import { requireOwner } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { UsersClient } from "./UsersClient";

export default async function UsersPage() {
  await requireOwner();

  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true, createdAt: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return <UsersClient initialUsers={JSON.parse(JSON.stringify(users))} />;
}
