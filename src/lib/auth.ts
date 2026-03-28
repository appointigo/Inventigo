import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

// ========================== TEST CREDENTIALS ==========================
// TODO: Remove before production deployment
// Hardcoded test users for development without a database connection.
// Admin:  admin@stockiva.com / admin123
// Staff:  staff@stockiva.com / staff123
const TEST_USERS = [
  {
    id: "test-admin-001",
    name: "Test Admin",
    email: "admin@stockiva.com",
    password: "admin123",
    role: "ADMIN" as const,
    storeId: "test-store-001",
  },
  {
    id: "test-staff-001",
    name: "Test Staff",
    email: "staff@stockiva.com",
    password: "staff123",
    role: "STAFF" as const,
    storeId: "test-store-001",
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
          const testUser = TEST_USERS.find(
            (u) =>
              u.email === credentials.email &&
              u.password === credentials.password
          );
          if (testUser) {
            return {
              id: testUser.id,
              name: testUser.name,
              email: testUser.email,
              role: testUser.role,
              storeId: testUser.storeId,
            };
          }

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
        token.storeId = user.storeId ?? "test-store-001";
      }
      // Google OAuth: populate defaults if not set
      if (account?.provider === "google" && !token.role) {
        token.role = "ADMIN";
        token.storeId = "test-store-001";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.storeId = token.storeId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
