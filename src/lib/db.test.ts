import test from "node:test";
import assert from "node:assert/strict";

test("database module imports without credentials and initializes on first configured use", async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    const { DatabaseConfigurationError, prisma } = await import(
      `./db.ts?missing-database-url=${crypto.randomUUID()}`
    );
    assert.throws(() => prisma.user, DatabaseConfigurationError);

    process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/stockiva_test";
    assert.equal(typeof prisma.user.findMany, "function");
    assert.equal(typeof prisma.$transaction, "function");
    await prisma.$disconnect();
  } finally {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  }
});
