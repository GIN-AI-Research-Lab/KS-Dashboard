import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import type { Provider } from "next-auth/providers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { findUserByIdentity, isAllowedEmailDomain } from "@/lib/identity";
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

const providers: Provider[] = [
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
      if (!user || !user.passwordHash) return null;

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
];

// Only registered when configured -- lets the app run with plain email/password
// login until IT sets up the Entra ID app registration.
if (process.env.AUTH_MICROSOFT_ENTRA_ID_ID && process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      // Omitting `issuer` defaults to the "common" multi-tenant endpoint, which
      // accepts sign-in from any Microsoft 365 tenant -- required here since
      // sint.co.jp and kstns.biz may not be verified domains on the same
      // tenant. The signIn callback below enforces the actual allowlist.
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // The dashboard is reached over multiple hostnames (localhost + a
  // <ip>.nip.io host so other machines on the LAN can view it), so don't pin
  // auth to a single origin. Safe here because it sits on a trusted network.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "microsoft-entra-id") return true; // credentials already gated in authorize()

      const email = (profile?.email as string | undefined) ?? (profile?.preferred_username as string | undefined);
      if (!email) return "/login?error=NoEmailFromProvider";
      if (!isAllowedEmailDomain(email)) return "/login?error=DomainNotAllowed";

      const existing = await findUserByIdentity(email);
      if (!existing) return "/login?error=UnknownEmployee";

      return true;
    },
    async jwt({ token, user, account, profile }) {
      const t = token as typeof token & AppTokenFields;

      if (account?.provider === "microsoft-entra-id") {
        const email =
          (profile?.email as string | undefined) ?? (profile?.preferred_username as string | undefined);
        const matched = email ? await findUserByIdentity(email) : null;
        if (matched) {
          t.id = matched.id;
          t.role = matched.role;
          t.teamId = matched.teamId;
          t.departmentId = matched.departmentId;
          t.email = matched.email;
          t.name = matched.name;
        }
        return t;
      }

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
