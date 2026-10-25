import { primaryRole } from "./permissions";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import bcrypt from "bcryptjs";
import { consumeRateLimit } from "./rate-limit";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const rateLimit = consumeRateLimit(
          `login:${credentials.email.trim().toLowerCase()}`,
          10,
          15 * 60 * 1000
        );
        if (!rateLimit.allowed) return null;
        const user = await db.user.findFirst({
          where: { email: { equals: credentials.email.trim().toLowerCase(), mode: "insensitive" } },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: primaryRole(user.roles.length ? user.roles : [user.role]),
          roles: user.roles.length ? user.roles : [user.role],
          organizationId: user.organizationId,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.sessionVersion = user.sessionVersion ?? 0;
        token.role = user.role;
        token.roles = user.roles;
        token.organizationId = user.organizationId;
      }
      if (token.id) {
        const current = await db.user.findUnique({ where: { id: token.id as string }, select: { roles: true, role: true, organizationId: true, isActive: true, sessionVersion: true } });
        token.active = !!current?.isActive && (token.sessionVersion ?? 0) === current.sessionVersion;
        if (current) { token.roles = current.roles.length ? current.roles : [current.role]; token.role = primaryRole(token.roles as string[]); token.organizationId = current.organizationId; }
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.active || !token.id) return null as unknown as typeof session;
      session.user.id = token.id as string;
      session.user.sessionVersion = (token.sessionVersion as number | undefined) ?? 0;
      session.user.roles = token.roles as string[];
      session.user.role = token.role as string;
      session.user.organizationId = token.organizationId as string | null;
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
};
