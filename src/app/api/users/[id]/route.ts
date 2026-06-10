import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
