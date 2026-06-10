import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true, createdAt: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(users);
}

const createSchema = z.object({
  name: z.string().min(1),
  password: z.string().min(4),
  role: z.enum(["OWNER", "BARTENDER"]).default("BARTENDER"),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, password, role } = parsed.data;
  const hashedPassword = await bcrypt.hash(password, 12);

  // Use a unique placeholder email since schema requires it
  const email = `${name.toLowerCase().replace(/\s+/g, ".")}.${Date.now()}@workshopbar.local`;

  const user = await prisma.user.create({
    data: { name, email, hashedPassword, role },
    select: { id: true, name: true, role: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
