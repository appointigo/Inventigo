import { prisma } from "../src/lib/db.ts";
import { MockMetaWhatsAppClient } from "../src/modules/whatsapp/testing/MockMetaWhatsAppClient.ts";
import { WhatsAppTemplateReconciliationService } from "../src/modules/whatsapp/services/WhatsAppTemplateReconciliationService.ts";

const service = new WhatsAppTemplateReconciliationService(prisma, new MockMetaWhatsAppClient());
await service.seedInvoiceV1();
console.log("WhatsApp platform template definitions seeded.");
await prisma.$disconnect();
