// Migration script to populate variantSku for existing stock entries
// Usage: npx ts-node --esm scripts/migrate-variant-skus.ts

import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

// Helper functions
const computeEan13CheckDigit = (digits12: string): string => {
  const digits = digits12.split("").map((d) => Number(d) || 0);
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return String(check);
};

const normalizeSizeLabel = (label: string): string =>
  label.trim().toUpperCase().replace(/\s+/g, "");

const buildVariantSku = (productSku: string, sizeLabel: string): string => {
  const key = `${productSku}|${normalizeSizeLabel(sizeLabel)}`;
  const hash = createHash("sha256").update(key).digest();
  const headHex = hash.slice(0, 8).toString("hex");
  const num = BigInt(`0x${headHex}`) % BigInt(10) ** BigInt(12);
  const payload = num.toString().padStart(12, "0");
  return payload + computeEan13CheckDigit(payload);
};

async function migrateVariantSkus() {
  console.log("🔄 Starting variantSku migration...");

  try {
    // Find all StockEntry records where variantSku is NULL
    const stockEntriesNull = await prisma.stockEntry.findMany({
      where: {
        variantSku: null,
      },
      include: {
        product: { select: { id: true, sku: true } },
        size: { select: { id: true, label: true } },
      },
    });

    console.log(`📊 Found ${stockEntriesNull.length} records with NULL variantSku`);

    if (stockEntriesNull.length === 0) {
      console.log("✅ All records already have variantSku!");
      await prisma.$disconnect();
      return;
    }

    // Update each record
    let updated = 0;
    let errors = 0;

    for (const entry of stockEntriesNull) {
      try {
        const newVariantSku = buildVariantSku(entry.product.sku, entry.size.label);

        await prisma.stockEntry.update({
          where: { id: entry.id },
          data: { variantSku: newVariantSku },
        });

        updated++;
        console.log(`✓ ${entry.product.sku} - ${entry.size.label} → ${newVariantSku}`);
      } catch (err) {
        errors++;
        console.error(
          `✗ Failed to update ${entry.id}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`  ✅ Updated: ${updated}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`\n✨ Migration complete!`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateVariantSkus();
