import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const storeId = "28ae35e7-38d3-4753-a851-6f6c14a4cfd4";

async function test() {
  console.log("Testing categories query...");
  try {
    const cats = await prisma.category.findMany({
      where: { OR: [{ storeId }, { storeId: null }] },
      include: {
        sizes: { orderBy: { sortOrder: "asc" } },
        _count: {
          select: {
            products: { where: { stockEntries: { some: { storeId } } } },
          },
        },
      },
      take: 1,
    });
    console.log("categories OK:", cats.length);
  } catch (e: unknown) {
    const err = e as Error & { code?: string };
    console.error("categories ERROR:", err.message);
    console.error("CODE:", err.code);
  }

  console.log("Testing brands query...");
  try {
    const brands = await prisma.brand.findMany({
      where: { OR: [{ storeId }, { storeId: null }] },
      include: {
        _count: {
          select: {
            products: { where: { stockEntries: { some: { storeId } } } },
          },
        },
      },
      take: 1,
    });
    console.log("brands OK:", brands.length);
  } catch (e: unknown) {
    const err = e as Error & { code?: string };
    console.error("brands ERROR:", err.message);
    console.error("CODE:", err.code);
  }
}

test().finally(() => prisma.$disconnect());

// Test products query too
async function testProducts() {
  console.log("Testing products query...");
  const storeId2 = "28ae35e7-38d3-4753-a851-6f6c14a4cfd4";
  try {
    const products = await prisma.product.findMany({
      where: {
        stockEntries: { some: { storeId: storeId2 } }
      },
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        stockEntries: {
          where: { storeId: storeId2 },
          include: { size: { select: { label: true } } },
        },
      },
      take: 2,
    });
    console.log("products OK:", products.length);
  } catch (e: unknown) {
    const err = e as Error & { code?: string };
    console.error("products ERROR:", err.message);
  }
}
testProducts().finally(() => prisma.$disconnect());
