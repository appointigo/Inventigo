import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // ── Google OAuth ─────────────────────────────────────────────────────
    // Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars.
    // Obtain from https://console.cloud.google.com → APIs & Services → Credentials
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        let user = null;
        try {
          user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            select: {
              id: true,
              name: true,
              email: true,
              passwordHash: true,
              role: true,
              storeId: true,
              orgId: true,
              isActive: true,
            },
          });
        } catch {
          return null;
        }

        if (!user || !user.isActive) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          storeId: user.storeId,
          orgId: user.orgId,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role ?? "ADMIN";
        token.storeId = user.storeId ?? null;
        token.orgId = user.orgId ?? null;
      }
      // Google OAuth: needs onboarding flow to create/join an org
      if (account?.provider === "google" && !token.role) {
        token.role = "OWNER";
        token.storeId = null;
        token.orgId = null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.storeId = token.storeId;
        session.user.orgId = token.orgId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
