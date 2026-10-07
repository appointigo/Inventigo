import bcrypt from "bcryptjs";
import { PrismaClient, FinancialAccountType, PaymentMethod, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { assertSafeE2EEnvironment } from "./environment.mjs";

assertSafeE2EEnvironment();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export const E2E_IDS = {
  organization: "00000000-0000-4000-8000-00000000e201",
  store: "00000000-0000-4000-8000-00000000e202",
  user: "00000000-0000-4000-8000-00000000e203",
  superAdminUser: "00000000-0000-4000-8000-00000000e223",
  category: "00000000-0000-4000-8000-00000000e204",
  brand: "00000000-0000-4000-8000-00000000e205",
  size: "00000000-0000-4000-8000-00000000e206",
  product: "00000000-0000-4000-8000-00000000e207",
  stock: "00000000-0000-4000-8000-00000000e208",
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
};

async function seed() {
  const passwordHash = await bcrypt.hash(process.env.E2E_USER_PASSWORD, 10);
  await prisma.organization.create({
    data: {
      id: E2E_IDS.organization,
      name: "Stockiva E2E Organization",
      slug: "stockiva-e2e",
      plan: "PRO",
    },
  });
  await prisma.store.create({
    data: {
      id: E2E_IDS.store,
      orgId: E2E_IDS.organization,
      name: "Stockiva E2E Store",
      code: "E2E-STORE",
      address: "E2E fixture only",
    },
  });
  await prisma.store.create({
    data: {
      id: E2E_IDS.secondStore,
      orgId: E2E_IDS.organization,
      name: "Stockiva E2E Second Store",
      code: "E2E-STORE-2",
      address: "E2E fixture only",
    },
  });
  await prisma.user.create({
    data: {
      id: E2E_IDS.user,
      orgId: E2E_IDS.organization,
      storeId: E2E_IDS.store,
      name: "E2E Owner",
      email: process.env.E2E_USER_EMAIL,
      passwordHash,
      role: Role.OWNER,
      isActive: true,
      emailVerified: true,
    },
  });
  await prisma.user.create({
    data: {
      id: E2E_IDS.superAdminUser,
      orgId: null,
      storeId: null,
      name: "E2E Platform Administrator",
      email: "e2e.super.admin@stockiva.invalid",
      passwordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
      emailVerified: true,
    },
  });
  await prisma.user.create({
    data: {
      id: E2E_IDS.orgAdminUser,
      orgId: E2E_IDS.organization,
      storeId: null,
      name: "E2E Organization Admin",
      email: "e2e.org.admin@stockiva.invalid",
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
      emailVerified: true,
    },
  });
  await prisma.user.create({
    data: {
      id: E2E_IDS.staffUser,
      orgId: E2E_IDS.organization,
      storeId: E2E_IDS.store,
      name: "E2E Staff",
      email: "e2e.staff@stockiva.invalid",
      passwordHash,
      role: Role.STAFF,
      isActive: true,
      emailVerified: true,
    },
  });
  await prisma.category.create({
    data: {
      id: E2E_IDS.category,
      orgId: E2E_IDS.organization,
      storeId: E2E_IDS.store,
      name: "E2E Apparel",
      slug: "e2e-apparel",
      attributeSchema: { fields: [] },
    },
  });
  await prisma.brand.create({
    data: {
      id: E2E_IDS.brand,
      orgId: E2E_IDS.organization,
      storeId: E2E_IDS.store,
      name: "E2E Brand",
    },
  });
  await prisma.size.create({
    data: {
      id: E2E_IDS.size,
      categoryId: E2E_IDS.category,
      label: "M",
      sortOrder: 1,
    },
  });
  await prisma.product.create({
    data: {
      id: E2E_IDS.product,
      orgId: E2E_IDS.organization,
      categoryId: E2E_IDS.category,
      brandId: E2E_IDS.brand,
      name: "E2E Classic Tee",
      sku: "E2E-P0-TEE",
      externalBarcode: "8900000000207",
      basePrice: 1000,
      mrp: 1000,
      costPrice: 600,
      attributes: {},
    },
  });
  await prisma.product.createMany({
    data: [
      {
        id: E2E_IDS.secondProduct,
        orgId: E2E_IDS.organization,
        categoryId: E2E_IDS.category,
        brandId: E2E_IDS.brand,
        name: "E2E Runner Tee",
        sku: "E2E-P1-TEE",
        externalBarcode: "8900000000214",
        basePrice: 500,
        mrp: 500,
        costPrice: 250,
        attributes: {},
      },
      {
        id: E2E_IDS.lastUnitProduct,
        orgId: E2E_IDS.organization,
        categoryId: E2E_IDS.category,
        brandId: E2E_IDS.brand,
        name: "E2E Last Unit Tee",
        sku: "E2E-P2-LAST",
        externalBarcode: "8900000000215",
        basePrice: 750,
        mrp: 750,
        costPrice: 400,
        attributes: {},
      },
      {
        id: E2E_IDS.concurrencyProduct,
        orgId: E2E_IDS.organization,
        categoryId: E2E_IDS.category,
        brandId: E2E_IDS.brand,
        name: "E2E Concurrent Last Unit",
        sku: "E2E-P3-CONCURRENT",
        externalBarcode: "8900000000222",
        basePrice: 800,
        mrp: 800,
        costPrice: 450,
        attributes: {},
      },
    ],
  });
  await prisma.stockEntry.create({
    data: {
      id: E2E_IDS.stock,
      storeId: E2E_IDS.store,
      productId: E2E_IDS.product,
      sizeId: E2E_IDS.size,
      variantSku: "E2E-P0-TEE-M",
      quantity: 100,
      reorderLevel: 2,
      reorderQuantity: 10,
    },
  });
  await prisma.stockEntry.createMany({
    data: [
      {
        id: "00000000-0000-4000-8000-00000000e217",
        storeId: E2E_IDS.store,
        productId: E2E_IDS.secondProduct,
        sizeId: E2E_IDS.size,
        variantSku: "E2E-P1-TEE-M",
        quantity: 100,
        reorderLevel: 2,
        reorderQuantity: 10,
      },
      {
        id: "00000000-0000-4000-8000-00000000e218",
        storeId: E2E_IDS.store,
        productId: E2E_IDS.lastUnitProduct,
        sizeId: E2E_IDS.size,
        variantSku: "E2E-P2-LAST-M",
        quantity: 1,
        reorderLevel: 2,
        reorderQuantity: 10,
      },
      {
        id: "00000000-0000-4000-8000-00000000e219",
        storeId: E2E_IDS.secondStore,
        productId: E2E_IDS.product,
        sizeId: E2E_IDS.size,
        variantSku: "E2E-P0-TEE-M-STORE2",
        quantity: 0,
        reorderLevel: 2,
        reorderQuantity: 10,
      },
      {
        id: "00000000-0000-4000-8000-00000000e222",
        storeId: E2E_IDS.store,
        productId: E2E_IDS.concurrencyProduct,
        sizeId: E2E_IDS.size,
        variantSku: "E2E-P3-CONCURRENT-M",
        quantity: 1,
        reorderLevel: 0,
        reorderQuantity: 1,
      },
    ],
  });
  await prisma.supplier.create({
    data: {
      id: E2E_IDS.supplier,
      orgId: E2E_IDS.organization,
      name: "E2E Supplier",
      contactPerson: "Fixture Supplier",
      email: "supplier@stockiva.invalid",
      phone: "9990000099",
    },
  });

  const accounts = [
    [E2E_IDS.cashAccount, "E2E Cash", FinancialAccountType.CASH, PaymentMethod.CASH],
    [E2E_IDS.upiAccount, "E2E UPI", FinancialAccountType.UPI_SETTLEMENT, PaymentMethod.UPI],
    [E2E_IDS.cardAccount, "E2E Card", FinancialAccountType.BANK, PaymentMethod.CARD],
  ];
  for (const [id, name, type, paymentMethod] of accounts) {
    await prisma.financialAccount.create({
      data: {
        id,
        orgId: E2E_IDS.organization,
        storeId: E2E_IDS.store,
        name,
        type,
        openingBalance: 0,
        currency: "INR",
        createdBy: E2E_IDS.user,
      },
    });
    await prisma.paymentMethodAccountMapping.create({
      data: {
        orgId: E2E_IDS.organization,
        storeId: E2E_IDS.store,
        paymentMethod,
        accountId: id,
        createdBy: E2E_IDS.user,
      },
    });
  }

  await prisma.storeInvoiceSettings.create({
    data: {
      storeId: E2E_IDS.store,
      designKey: "CLASSIC",
      defaultWhatsAppEnabled: false,
    },
  });
  await prisma.expenseCategoryOption.createMany({
    data: ["Rent", "Electricity", "Staff", "Miscellaneous"].map((name) => ({
      orgId: E2E_IDS.organization,
      name,
    })),
  });
  await prisma.tenantFeature.create({
    data: {
      organizationId: E2E_IDS.organization,
      feature: "WHATSAPP",
      enabled: false,
    },
  });

  await prisma.organization.create({
    data: {
      id: E2E_IDS.foreignOrganization,
      name: "Stockiva E2E Foreign Organization",
      slug: "stockiva-e2e-foreign",
      plan: "PRO",
    },
  });
  await prisma.store.create({
    data: {
      id: E2E_IDS.foreignStore,
      orgId: E2E_IDS.foreignOrganization,
      name: "Stockiva E2E Foreign Store",
      code: "E2E-FOREIGN",
    },
  });
  await prisma.user.create({
    data: {
      id: E2E_IDS.foreignUser,
      orgId: E2E_IDS.foreignOrganization,
      storeId: E2E_IDS.foreignStore,
      name: "E2E Foreign Owner",
      email: "e2e.foreign.owner@stockiva.invalid",
      passwordHash,
      role: Role.OWNER,
      isActive: true,
      emailVerified: true,
    },
  });
  await prisma.category.create({
    data: {
      id: E2E_IDS.foreignCategory,
      orgId: E2E_IDS.foreignOrganization,
      storeId: E2E_IDS.foreignStore,
      name: "E2E Foreign Apparel",
      slug: "e2e-foreign-apparel",
      attributeSchema: { fields: [] },
    },
  });
  await prisma.brand.create({
    data: {
      id: E2E_IDS.foreignBrand,
      orgId: E2E_IDS.foreignOrganization,
      storeId: E2E_IDS.foreignStore,
      name: "E2E Foreign Brand",
    },
  });
  await prisma.size.create({
    data: {
      id: E2E_IDS.foreignSize,
      categoryId: E2E_IDS.foreignCategory,
      label: "M",
      sortOrder: 1,
    },
  });
  await prisma.product.create({
    data: {
      id: E2E_IDS.foreignProduct,
      orgId: E2E_IDS.foreignOrganization,
      categoryId: E2E_IDS.foreignCategory,
      brandId: E2E_IDS.foreignBrand,
      name: "E2E Foreign Product",
      sku: "E2E-FOREIGN-PRODUCT",
      basePrice: 999,
      mrp: 999,
      costPrice: 500,
      attributes: {},
    },
  });
  await prisma.stockEntry.create({
    data: {
      storeId: E2E_IDS.foreignStore,
      productId: E2E_IDS.foreignProduct,
      sizeId: E2E_IDS.foreignSize,
      quantity: 25,
      reorderLevel: 2,
      reorderQuantity: 10,
    },
  });
  await prisma.storeInvoiceSettings.create({
    data: {
      storeId: E2E_IDS.foreignStore,
      designKey: "CLASSIC",
      defaultWhatsAppEnabled: false,
    },
  });
  await prisma.tenantFeature.create({
    data: {
      organizationId: E2E_IDS.foreignOrganization,
      feature: "WHATSAPP",
      enabled: false,
    },
  });
}

async function verifySeed() {
  const [
    organization,
    store,
    user,
    product,
    stock,
    accounts,
    mappings,
    invoiceSettings,
    whatsappFeature,
  ] = await Promise.all([
    prisma.organization.findUnique({ where: { id: E2E_IDS.organization } }),
    prisma.store.findUnique({ where: { id: E2E_IDS.store } }),
    prisma.user.findUnique({ where: { id: E2E_IDS.user } }),
    prisma.product.findUnique({ where: { id: E2E_IDS.product } }),
    prisma.stockEntry.findUnique({
      where: {
        productId_sizeId_storeId: {
          productId: E2E_IDS.product,
          sizeId: E2E_IDS.size,
          storeId: E2E_IDS.store,
        },
      },
    }),
    prisma.financialAccount.findMany({
      where: { id: { in: [E2E_IDS.cashAccount, E2E_IDS.upiAccount, E2E_IDS.cardAccount] } },
    }),
    prisma.paymentMethodAccountMapping.findMany({
      where: { orgId: E2E_IDS.organization, storeId: E2E_IDS.store },
    }),
    prisma.storeInvoiceSettings.findUnique({ where: { storeId: E2E_IDS.store } }),
    prisma.tenantFeature.findUnique({
      where: {
        organizationId_feature: {
          organizationId: E2E_IDS.organization,
          feature: "WHATSAPP",
        },
      },
    }),
  ]);

  const expectedMethods = new Set([PaymentMethod.CASH, PaymentMethod.UPI, PaymentMethod.CARD]);
  const seedIsValid =
    organization?.id === E2E_IDS.organization &&
    store?.orgId === E2E_IDS.organization &&
    user?.email === process.env.E2E_USER_EMAIL &&
    user.orgId === E2E_IDS.organization &&
    user.storeId === E2E_IDS.store &&
    user.role === Role.OWNER &&
    user.isActive &&
    product?.categoryId === E2E_IDS.category &&
    product.brandId === E2E_IDS.brand &&
    stock?.quantity === 100 &&
    stock.sizeId === E2E_IDS.size &&
    accounts.length === 3 &&
    mappings.length === 3 &&
    mappings.every((mapping) => expectedMethods.has(mapping.paymentMethod)) &&
    invoiceSettings?.defaultWhatsAppEnabled === false &&
    whatsappFeature?.enabled === false;

  if (!seedIsValid) {
    throw new Error("Deterministic E2E seed verification failed");
  }
  console.info(
    "Verified E2E organization/store owner assignment, product variant stock, payment mappings and disabled external delivery."
  );
}

try {
  await seed();
  console.info("Seeded isolated Stockiva E2E tenant, store, user, product and accounts.");
  await verifySeed();
} finally {
  await prisma.$disconnect();
}
