import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;
const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;
if (
  !databaseUrl ||
  databaseUrl !== e2eDatabaseUrl ||
  process.env.NODE_ENV !== "test" ||
  process.env.E2E_ALLOW_DATABASE_RESET !== "true"
) {
  throw new Error("Refusing E2E database access: isolated test environment is not verified");
}
const parsed = new URL(databaseUrl);
const databaseName = decodeURIComponent(parsed.pathname.slice(1));
if (
  databaseName !== process.env.E2E_DATABASE_NAME ||
  !/(?:^|[_-])(?:e2e|test)(?:[_-]|$)/i.test(databaseName) ||
  /(prod|production|live)/i.test(parsed.href)
) {
  throw new Error("Refusing E2E database access: database is not clearly test-only");
}

export const e2eDb = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

export const E2E_IDS = {
  organization: "00000000-0000-4000-8000-00000000e201",
  store: "00000000-0000-4000-8000-00000000e202",
  user: "00000000-0000-4000-8000-00000000e203",
  category: "00000000-0000-4000-8000-00000000e204",
  brand: "00000000-0000-4000-8000-00000000e205",
  superAdminUser: "00000000-0000-4000-8000-00000000e223",
  product: "00000000-0000-4000-8000-00000000e207",
  size: "00000000-0000-4000-8000-00000000e206",
  cashAccount: "00000000-0000-4000-8000-00000000e209",
  upiAccount: "00000000-0000-4000-8000-00000000e210",
  cardAccount: "00000000-0000-4000-8000-00000000e211",
  secondStore: "00000000-0000-4000-8000-00000000e212",
  staffUser: "00000000-0000-4000-8000-00000000e213",
  orgAdminUser: "00000000-0000-4000-8000-00000000e220",
  concurrencyProduct: "00000000-0000-4000-8000-00000000e221",
  secondProduct: "00000000-0000-4000-8000-00000000e214",
  lastUnitProduct: "00000000-0000-4000-8000-00000000e215",
  supplier: "00000000-0000-4000-8000-00000000e216",
  foreignOrganization: "00000000-0000-4000-8000-00000000e301",
  foreignStore: "00000000-0000-4000-8000-00000000e302",
  foreignUser: "00000000-0000-4000-8000-00000000e303",
  foreignCategory: "00000000-0000-4000-8000-00000000e304",
  foreignBrand: "00000000-0000-4000-8000-00000000e305",
  foreignSize: "00000000-0000-4000-8000-00000000e306",
  foreignProduct: "00000000-0000-4000-8000-00000000e307",
} as const;

export async function readGoldenSale(customerPhone: string) {
  return e2eDb.sale.findFirst({
    where: {
      storeId: E2E_IDS.store,
      customerPhone,
    },
    include: {
      items: true,
      payments: { include: { financialTransaction: true } },
      customer: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
