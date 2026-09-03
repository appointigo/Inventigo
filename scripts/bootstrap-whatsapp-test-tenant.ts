import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { bootstrapWhatsAppTestTenant } from "../src/modules/whatsapp/bootstrap/bootstrapTestTenant.ts";
import { loadTestTenantBootstrapConfig } from "../src/modules/whatsapp/bootstrap/config.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

try {
  const config = loadTestTenantBootstrapConfig(process.env);
  await bootstrapWhatsAppTestTenant(prisma, config);
  console.log("WhatsApp development/test tenant bootstrap completed successfully");
} finally {
  await prisma.$disconnect();
}

