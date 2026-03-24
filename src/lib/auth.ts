import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

// ========================== TEST CREDENTIALS ==========================
// TODO: Remove before production deployment
// Hardcoded test users for development without a database connection.
// Admin:  admin@inventigo.com / admin123
// Staff:  staff@inventigo.com / staff123
const TEST_USERS = [
  {
    id: "test-admin-001",
    name: "Test Admin",
    email: "admin@inventigo.com",
    password: "admin123",
    role: "ADMIN" as const,
    storeId: "test-store-001",
  },
  {
    id: "test-staff-001",
    name: "Test Staff",
    email: "staff@inventigo.com",
    password: "staff123",
    role: "STAFF" as const,
    storeId: "test-store-001",
  },
];
// ======================== END TEST CREDENTIALS ========================

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.storeId = user.storeId;
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
