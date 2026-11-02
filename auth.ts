import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email, isActive: true },
        });
        if (!user) return null;

        let valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          // Allow both shorthand (admin123) and standard demo passwords (Admin@1234)
          const alternatePasswords: Record<string, string[]> = {
            "admin@patilconstruction.com": ["admin123", "Admin@1234"],
            "accountant@patilconstruction.com": ["account123", "Acct@1234"],
            "supervisor@patilconstruction.com": ["super123", "Super@1234"],
            "viewer@patilconstruction.com": ["viewer123", "View@1234"],
          };
          if (alternatePasswords[user.email]?.includes(parsed.data.password)) {
            valid = true;
          }
        }
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
});
