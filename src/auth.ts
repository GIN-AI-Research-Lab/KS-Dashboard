import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      teamId: string | null;
      departmentId: string | null;
    };
  }
  interface User {
    id: string;
    role: Role;
    teamId: string | null;
    departmentId: string | null;
  }
}

interface AppTokenFields {
  id: string;
  role: Role;
  teamId: string | null;
  departmentId: string | null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          teamId: user.teamId,
          departmentId: user.departmentId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const t = token as typeof token & AppTokenFields;
      if (user) {
        const u = user as typeof user & AppTokenFields;
        t.id = u.id;
        t.role = u.role;
        t.teamId = u.teamId;
        t.departmentId = u.departmentId;
      }
      return t;
    },
    async session({ session, token }) {
      const t = token as typeof token & AppTokenFields;
      session.user.id = t.id;
      session.user.role = t.role;
      session.user.teamId = t.teamId;
      session.user.departmentId = t.departmentId;
      return session;
    },
  },
});
