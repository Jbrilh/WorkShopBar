import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "../../auth.config";

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = z
          .object({ password: z.string().min(1) })
          .safeParse(credentials);

        if (!parsed.success) return null;

        const { password } = parsed.data;

        // Try each user's password — owner first so owner gets priority
        const users = await prisma.user.findMany({
          orderBy: { role: "asc" }, // BARTENDER < OWNER alphabetically; swap with explicit sort
        });

        // Sort so OWNER is checked first
        const sorted = users.sort((a, b) =>
          a.role === "OWNER" ? -1 : b.role === "OWNER" ? 1 : 0
        );

        for (const user of sorted) {
          const match = await bcrypt.compare(password, user.hashedPassword);
          if (match) {
            return { id: user.id, email: user.email, name: user.name, role: user.role };
          }
        }

        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
});
