import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireOwner() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/dashboard");
  return session;
}

export async function getSession() {
  return auth();
}
