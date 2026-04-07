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

        // Gracefully handle DB unavailability (demo mode without a database)
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
              emailVerified: true,
              org: { select: { name: true } },
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
          orgName: user.org?.name ?? null,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role ?? "OWNER";
        token.storeId = user.storeId ?? null;
        token.orgId = user.orgId ?? null;
        token.orgName = (user as { orgName?: string | null }).orgName ?? null;
        token.emailVerified = (user as { emailVerified?: boolean }).emailVerified ?? false;
      }
      // Google OAuth: email already verified by Google, needs onboarding to create org
      if (account?.provider === "google") {
        token.emailVerified = true;
        if (!token.role) {
          token.role = "OWNER";
          token.storeId = null;
          token.orgId = null;
        }
      }
      // Refresh session after onboarding / explicit update() calls.
      if (trigger === "update") {
        // When update(data) is called with explicit values (e.g. right after
        // onboarding completes), apply them directly — no DB round-trip means
        // no timing race between the write and this read.
        const payload = session as {
          orgId?: string | null;
          storeId?: string | null;
          role?: string;
          orgName?: string | null;
        } | undefined;

        if (payload?.orgId) {
          token.orgId = payload.orgId;
          token.storeId = payload.storeId ?? token.storeId;
          if (payload.role) token.role = payload.role as typeof token.role;
          token.orgName =
            "orgName" in (payload as object)
              ? (payload.orgName ?? null)
              : token.orgName;
        } else if (token.id) {
          // No data passed — fall back to DB re-read (e.g. dashboard layout
          // calling bare update() as a staleness check).
          try {
            const fresh = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: {
                orgId: true,
                storeId: true,
                role: true,
                emailVerified: true,
                org: { select: { name: true } },
              },
            });
            if (fresh) {
              token.orgId = fresh.orgId;
              token.storeId = fresh.storeId;
              token.role = fresh.role;
              token.emailVerified = fresh.emailVerified;
              token.orgName = fresh.org?.name ?? null;
            }
          } catch {
            // DB unavailable — keep existing token values
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.storeId = token.storeId;
        session.user.orgId = token.orgId;
        session.user.orgName = token.orgName ?? null;
        // Cast to our augmented type — emailVerified is boolean in our schema, not Date
        (session.user as { emailVerified: boolean }).emailVerified =
          (token.emailVerified as boolean) ?? false;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
