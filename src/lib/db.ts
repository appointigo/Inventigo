import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export class DatabaseConfigurationError extends Error {
  readonly code = "DATABASE_URL_REQUIRED";

  constructor() {
    super("DATABASE_URL is required");
    this.name = "DatabaseConfigurationError";
  }
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new DatabaseConfigurationError();

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

let prismaClient = globalForPrisma.prisma;

export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = createPrismaClient();
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = prismaClient;
    }
  }

  return prismaClient;
}

// Keep the existing `prisma.model` API while deferring adapter construction
// until a request or worker actually performs a database operation. Next.js
// imports route modules while building; imports alone must not require runtime
// credentials. Function properties are bound to the real client so methods
// such as `$transaction` retain PrismaClient as `this`.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, client) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  },
});
