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
          console.warn("[auth authorize] missing credentials payload");
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();

        // Gracefully handle DB unavailability (demo mode without a database)
        let user = null;
        try {
          user = await prisma.user.findUnique({
            where: { email },
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
              org: { select: { name: true, saasBillingRequired: true } },
            },
          });
        } catch (error) {
          console.error("[auth authorize] user lookup failed", { email, error });
          return null;
        }

        if (!user) {
          console.warn("[auth authorize] user not found", { email });
          return null;
        }

        if (!user.isActive) {
          console.warn("[auth authorize] inactive user blocked", { email, userId: user.id });
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isPasswordValid) {
          console.warn("[auth authorize] password mismatch", { email, userId: user.id });
          return null;
        }

        console.info("[auth authorize] login success", {
          email,
          userId: user.id,
          role: user.role,
          orgId: user.orgId,
          storeId: user.storeId,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          storeId: user.storeId,
          orgId: user.orgId,
          orgName: user.org?.name ?? null,
          saasBillingRequired: user.org?.saasBillingRequired ?? false,
          emailVerified: user.emailVerified,
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
        token.role = user.role ?? "OWNER";
        token.storeId = user.storeId ?? null;
        token.orgId = user.orgId ?? null;
        token.orgName = (user as { orgName?: string | null }).orgName ?? null;
        token.saasBillingRequired = (user as { saasBillingRequired?: boolean }).saasBillingRequired ?? false;
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

      // JWTs carry identity only. Revocable authorization state is refreshed
      // from the database whenever an existing session is read.
      if (!user && token.id) {
        try {
          const fresh = await prisma.user.findFirst({
            where: {
              OR: [
                { id: token.id as string },
                ...(token.email ? [{ email: token.email }] : []),
              ],
            },
            select: {
              id: true,
              isActive: true,
              orgId: true,
              storeId: true,
              role: true,
              emailVerified: true,
              org: { select: { name: true, saasBillingRequired: true } },
            },
          });
          if (!fresh?.isActive) return null;
          token.id = fresh.id;
          token.orgId = fresh.orgId;
          token.storeId = fresh.storeId;
          token.role = fresh.role;
          token.emailVerified = fresh.emailVerified;
          token.orgName = fresh.org?.name ?? null;
          token.saasBillingRequired = fresh.org?.saasBillingRequired ?? false;
        } catch (error) {
          console.error("[auth jwt] authoritative user lookup failed", {
            userId: token.id,
            error,
          });
          return null;
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
        session.user.saasBillingRequired = token.saasBillingRequired ?? false;
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
