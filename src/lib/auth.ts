import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

// ========================== TEST CREDENTIALS ==========================
// TODO: Remove before production deployment
//
// Platform Admin
//   superadmin@stockiva.com / superadmin123   (SUPER_ADMIN → /admin)
//
// Org A — Rare Thread (clothing/apparel)  orgId: test-org-001
//   owner@rarethread.com   / password   (OWNER)
//   admin@rarethread.com   / password   (ADMIN)
//   manager@rarethread.com / password   (MANAGER)
//   staff@rarethread.com   / password   (STAFF)
//
// Org B — Scent & Soul (fragrance/perfume)  orgId: test-org-002
//   owner@scentandsoul.com   / password   (OWNER)
//   admin@scentandsoul.com   / password   (ADMIN)
//   manager@scentandsoul.com / password   (MANAGER)
//   staff@scentandsoul.com   / password   (STAFF)
const TEST_USERS = [
  // ── Platform Admin ──────────────────────────────────────────────────────
  {
    id: "test-superadmin-001",
    name: "Stockiva Admin",
    email: "superadmin@stockiva.com",
    password: "superadmin123",
    role: "SUPER_ADMIN" as const,
    storeId: null,
    orgId: null,
  },

  // ── Org A: Rare Thread (clothing/apparel) ────────────────────────────────
  {
    id: "test-a-owner-001",
    name: "Minhaj Ahmad Khan",
    email: "owner@rarethread.com",
    password: "password",
    role: "OWNER" as const,
    storeId: "test-store-001",
    orgId: "test-org-001",
  },
  {
    id: "test-a-admin-001",
    name: "Urooj Ahmad",
    email: "admin@rarethread.com",
    password: "password",
    role: "ADMIN" as const,
    storeId: "test-store-001",
    orgId: "test-org-001",
  },
  {
    id: "test-a-manager-001",
    name: "Osama",
    email: "manager@rarethread.com",
    password: "password",
    role: "MANAGER" as const,
    storeId: "test-store-001",
    orgId: "test-org-001",
  },
  {
    id: "test-a-staff-001",
    name: "Irfan Khan",
    email: "staff@rarethread.com",
    password: "password",
    role: "STAFF" as const,
    storeId: "test-store-001",
    orgId: "test-org-001",
  },

  // ── Org B: Scent & Soul (fragrance/perfume) ──────────────────────────────
  {
    id: "test-b-owner-001",
    name: "Urooj Ahmad",
    email: "owner@scentandsoul.com",
    password: "password",
    role: "OWNER" as const,
    storeId: "test-store-002",
    orgId: "test-org-002",
  },
  {
    id: "test-b-admin-001",
    name: "Shad Mirza",
    email: "admin@scentandsoul.com",
    password: "password",
    role: "ADMIN" as const,
    storeId: "test-store-002",
    orgId: "test-org-002",
  },
  {
    id: "test-b-manager-001",
    name: "Meera Joshi",
    email: "manager@scentandsoul.com",
    password: "password",
    role: "MANAGER" as const,
    storeId: "test-store-002",
    orgId: "test-org-002",
  },
  {
    id: "test-b-staff-001",
    name: "Rohit Sharma",
    email: "staff@scentandsoul.com",
    password: "password",
    role: "STAFF" as const,
    storeId: "test-store-002",
    orgId: "test-org-002",
  },
];
// ======================== END TEST CREDENTIALS ========================

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

        // --- TEST CREDENTIALS (dev + demo mode) ---
        if (process.env.NODE_ENV === "development" || process.env.DEMO_MODE === "true") {
          // const testUser = TEST_USERS.find(
          //   (u) =>
          //     u.email === credentials.email &&
          //     u.password === credentials.password
          // );
          // if (testUser) {
          //   return {
          //     id: testUser.id,
          //     name: testUser.name,
          //     email: testUser.email,
          //     role: testUser.role,
          //     storeId: testUser.storeId,
          //     orgId: testUser.orgId,
          //   };
          // }

          // Check in-memory registered users (created via /api/auth/register in demo mode)
          try {
            const { demoRegisteredUsers } = await import(
              "@/app/api/auth/register/route"
            );
            const demoUser = demoRegisteredUsers.find(
              (u) => u.email === (credentials.email as string).toLowerCase().trim()
            );
            if (demoUser) {
              const valid = await bcrypt.compare(
                credentials.password as string,
                demoUser.passwordHash
              );
              if (valid) {
                return {
                  id: demoUser.id,
                  name: demoUser.name,
                  email: demoUser.email,
                  role: demoUser.role,
                  storeId: demoUser.storeId,
                  orgId: demoUser.orgId,
                  emailVerified: demoUser.emailVerified,
                };
              }
            }
          } catch {
            // module import failed — continue
          }
        }
        // --- END TEST CREDENTIALS ---

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
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role ?? "OWNER";
        token.storeId = user.storeId ?? null;
        token.orgId = user.orgId ?? null;
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
      // Refresh from DB after onboarding completes (client calls session.update())
      if (trigger === "update" && token.id) {
        try {
          const fresh = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { orgId: true, storeId: true, role: true, emailVerified: true },
          });
          if (fresh) {
            token.orgId = fresh.orgId;
            token.storeId = fresh.storeId;
            token.role = fresh.role;
            token.emailVerified = fresh.emailVerified;
          }
        } catch {
          // DB unavailable — keep existing token values
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
