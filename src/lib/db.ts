import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const adapter = new PrismaPg({
    connectionString,
    // Prisma 7's pg adapter defaults to no connection timeout and evicts idle
    // connections after 10 seconds. Keep Vercel unchanged, while local dev gets
    // bounded Neon wake-up time and fewer reconnects after short idle periods.
    ...(process.env.NODE_ENV === "development"
      ? { connectionTimeoutMillis: 15_000, idleTimeoutMillis: 300_000 }
      : {}),
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
