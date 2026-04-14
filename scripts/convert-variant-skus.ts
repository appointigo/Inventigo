import { prisma } from "../src/lib/db";
import { createHash } from "crypto";

const normalizeSizeLabel = (label: string) => label.trim().toUpperCase().replace(/\s+/g, "");

const computeEan13CheckDigit = (digits12: string): string => {
  const digits = digits12.split("").map((d) => Number(d) || 0);
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return String(check);
};

const buildVariantSku = (productSku: string, sizeLabel: string) => {
  const key = `${productSku}|${normalizeSizeLabel(sizeLabel)}`;
  const hash = createHash("sha256").update(key).digest();
  const headHex = hash.slice(0, 8).toString("hex");
  const num = BigInt(`0x${headHex}`) % (BigInt(10) ** BigInt(12));
  const payload = num.toString().padStart(12, "0");
  return payload + computeEan13CheckDigit(payload);
};

async function main() {
  const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

  console.log(`Starting variant SKU migration (dryRun=${DRY_RUN})`);

  // Fetch stock entries with associated product sku and size label
  const entries = await prisma.stockEntry.findMany({
    include: { product: { select: { id: true, sku: true } }, size: { select: { id: true, label: true } } },
  });

  const toUpdate = entries
    .filter((e) => {
      if (!e.product?.sku || !e.size?.label) return false;
      if (!e.variantSku) return true;
      return !/^\d{13}$/.test(e.variantSku);
    })
    .map((e) => ({ id: e.id, productSku: e.product!.sku, sizeLabel: e.size!.label, old: e.variantSku ?? null }));

  console.log(`Found ${toUpdate.length} stock entries to update (out of ${entries.length})`);

  const batchSize = 100;
  let updated = 0;

  for (let i = 0; i < toUpdate.length; i += batchSize) {
    const batch = toUpdate.slice(i, i + batchSize);

    if (!DRY_RUN) {
      const tx = await prisma.$transaction(
        batch.map((b) =>
          prisma.stockEntry.update({ where: { id: b.id }, data: { variantSku: buildVariantSku(b.productSku, b.sizeLabel) } })
        )
      );
      updated += tx.length;
    } else {
      updated += batch.length;
    }

    console.log(`Processed ${Math.min(i + batchSize, toUpdate.length)} / ${toUpdate.length}`);
  }

  console.log(`Migration complete. Dry run: ${DRY_RUN}. Updated: ${updated}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
