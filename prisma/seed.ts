import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const main = async () => {
  console.log("🌱 Seeding database...");

  // ─── Organization ─────────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "stockiva-demo" },
    update: {},
    create: {
      name: "Stockiva Demo",
      slug: "stockiva-demo",
    },
  });
  console.log(`✅ Organization: ${org.name}`);

  // ─── Store ────────────────────────────────────────────────────────────────────
  const store = await prisma.store.upsert({
    where: { code_orgId: { code: "MAIN", orgId: org.id } },
    update: {},
    create: {
      orgId: org.id,
      name: "Main Store",
      code: "MAIN",
      address: "123 Main Street, City Center",
      phone: "+91-9876543210",
    },
  });
  console.log(`✅ Store: ${store.name}`);

  // ─── Users ────────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("password123", 12);

  const _superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@stockiva.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "superadmin@stockiva.com",
      passwordHash,
      role: Role.SUPER_ADMIN,
      orgId: null,
      storeId: null,
    },
  });

  const _owner = await prisma.user.upsert({
    where: { email: "owner@stockiva.com" },
    update: {},
    create: {
      name: "Demo Owner",
      email: "owner@stockiva.com",
      passwordHash,
      role: Role.OWNER,
      orgId: org.id,
      storeId: null,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@stockiva.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@stockiva.com",
      passwordHash,
      role: Role.ADMIN,
      orgId: org.id,
      storeId: null, // Admin has access to all stores within org
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@stockiva.com" },
    update: {},
    create: {
      name: "Store Manager",
      email: "manager@stockiva.com",
      passwordHash,
      role: Role.MANAGER,
      orgId: org.id,
      storeId: store.id,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staff@stockiva.com" },
    update: {},
    create: {
      name: "Staff Member",
      email: "staff@stockiva.com",
      passwordHash,
      role: Role.STAFF,
      orgId: org.id,
      storeId: store.id,
    },
  });
  console.log(`✅ Users: superadmin, owner, admin, manager, staff (password: password123)`);

  // ─── Categories with Attribute Schemas ──────────────────────────────────────
  const categoriesData = [
    {
      name: "T-Shirts",
      slug: "t-shirts",
      description: "Casual t-shirts for men and women",
      attributeSchema: {
        fields: [
          { name: "sleeve", type: "select", options: ["Half Sleeve", "Full Sleeve", "Sleeveless"], required: true },
          { name: "neckType", type: "select", options: ["Round Neck", "V-Neck", "Polo", "Crew Neck"], required: true },
          { name: "color", type: "text", required: true },
        ],
      },
      sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    },
    {
      name: "Shirts",
      slug: "shirts",
      description: "Formal and casual shirts",
      attributeSchema: {
        fields: [
          { name: "sleeve", type: "select", options: ["Half Sleeve", "Full Sleeve"], required: true },
          { name: "fit", type: "select", options: ["Slim Fit", "Regular Fit", "Relaxed Fit"], required: true },
          { name: "pattern", type: "select", options: ["Solid", "Striped", "Checked", "Printed"], required: false },
          { name: "color", type: "text", required: true },
        ],
      },
      sizes: ["S", "M", "L", "XL", "XXL"],
    },
    {
      name: "Jeans",
      slug: "jeans",
      description: "Denim jeans in various fits",
      attributeSchema: {
        fields: [
          { name: "fit", type: "select", options: ["Slim", "Regular", "Relaxed", "Skinny", "Bootcut"], required: true },
          { name: "rise", type: "select", options: ["Low Rise", "Mid Rise", "High Rise"], required: false },
          { name: "wash", type: "select", options: ["Light", "Medium", "Dark", "Black"], required: true },
          { name: "color", type: "text", required: true },
        ],
      },
      sizes: ["28", "30", "32", "34", "36", "38", "40"],
    },
    {
      name: "Pants",
      slug: "pants",
      description: "Formal and casual trousers",
      attributeSchema: {
        fields: [
          { name: "fit", type: "select", options: ["Slim Fit", "Regular Fit", "Tapered"], required: true },
          { name: "material", type: "select", options: ["Cotton", "Polyester", "Linen", "Blend"], required: false },
          { name: "color", type: "text", required: true },
        ],
      },
      sizes: ["28", "30", "32", "34", "36", "38", "40"],
    },
    {
      name: "Dry-Fit T-Shirts",
      slug: "dry-fit-tshirts",
      description: "Moisture-wicking performance t-shirts",
      attributeSchema: {
        fields: [
          { name: "sleeve", type: "select", options: ["Half Sleeve", "Full Sleeve", "Sleeveless"], required: true },
          { name: "sport", type: "select", options: ["Running", "Gym", "Cricket", "General"], required: false },
          { name: "color", type: "text", required: true },
        ],
      },
      sizes: ["S", "M", "L", "XL", "XXL"],
    },
    {
      name: "Lowers",
      slug: "lowers",
      description: "Track pants and joggers",
      attributeSchema: {
        fields: [
          { name: "type", type: "select", options: ["Track Pants", "Joggers", "Sweatpants"], required: true },
          { name: "material", type: "select", options: ["Cotton", "Polyester", "Fleece", "Blend"], required: false },
          { name: "color", type: "text", required: true },
        ],
      },
      sizes: ["S", "M", "L", "XL", "XXL"],
    },
    {
      name: "Shorts",
      slug: "shorts",
      description: "Casual and sports shorts",
      attributeSchema: {
        fields: [
          { name: "type", type: "select", options: ["Casual", "Sports", "Cargo", "Denim"], required: true },
          { name: "length", type: "select", options: ["Above Knee", "Knee Length", "Below Knee"], required: false },
          { name: "color", type: "text", required: true },
        ],
      },
      sizes: ["S", "M", "L", "XL", "XXL"],
    },
  ];

  const categories: Record<string, { id: string; sizes: Record<string, string> }> = {};

  for (const cat of categoriesData) {
    const category = await prisma.category.upsert({
      where: { slug_orgId: { slug: cat.slug, orgId: org.id } },
      update: {},
      create: {
        orgId: org.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        attributeSchema: cat.attributeSchema,
      },
    });

    const sizeMap: Record<string, string> = {};
    for (let i = 0; i < cat.sizes.length; i++) {
      const size = await prisma.size.upsert({
        where: { label_categoryId: { label: cat.sizes[i], categoryId: category.id } },
        update: {},
        create: {
          label: cat.sizes[i],
          sortOrder: i,
          categoryId: category.id,
        },
      });
      sizeMap[cat.sizes[i]] = size.id;
    }

    categories[cat.slug] = { id: category.id, sizes: sizeMap };
  }
  console.log(`✅ Categories: ${Object.keys(categories).length} with sizes`);

  // ─── Brands ─────────────────────────────────────────────────────────────────
  const brandsData = ["Nike", "Adidas", "Puma", "Levi's", "Allen Solly"];
  const brands: Record<string, string> = {};

  for (const brandName of brandsData) {
    const brand = await prisma.brand.upsert({
      where: { name_orgId: { name: brandName, orgId: org.id } },
      update: {},
      create: { orgId: org.id, name: brandName },
    });
    brands[brandName] = brand.id;
  }
  console.log(`✅ Brands: ${brandsData.join(", ")}`);

  // ─── Products with Stock ─────────────────────────────────────────────────────
  const productsData = [
    {
      name: "Nike Dri-FIT Running Tee",
      sku: "NK-DFT-001",
      categorySlug: "dry-fit-tshirts",
      brand: "Nike",
      basePrice: 1499,
      costPrice: 900,
      attributes: { sleeve: "Half Sleeve", sport: "Running", color: "Black" },
      stockSizes: { S: 15, M: 25, L: 20, XL: 10, XXL: 5 },
    },
    {
      name: "Adidas Classic Round Neck Tee",
      sku: "AD-RN-001",
      categorySlug: "t-shirts",
      brand: "Adidas",
      basePrice: 999,
      costPrice: 550,
      attributes: { sleeve: "Half Sleeve", neckType: "Round Neck", color: "White" },
      stockSizes: { S: 20, M: 30, L: 25, XL: 15, XXL: 8 },
    },
    {
      name: "Puma Polo T-Shirt",
      sku: "PM-PT-001",
      categorySlug: "t-shirts",
      brand: "Puma",
      basePrice: 1299,
      costPrice: 750,
      attributes: { sleeve: "Half Sleeve", neckType: "Polo", color: "Navy Blue" },
      stockSizes: { S: 10, M: 20, L: 18, XL: 12, XXL: 5 },
    },
    {
      name: "Levi's 511 Slim Fit Jeans",
      sku: "LV-511-001",
      categorySlug: "jeans",
      brand: "Levi's",
      basePrice: 2999,
      costPrice: 1800,
      attributes: { fit: "Slim", rise: "Mid Rise", wash: "Dark", color: "Indigo" },
      stockSizes: { "28": 8, "30": 15, "32": 20, "34": 12, "36": 6 },
    },
    {
      name: "Levi's 501 Regular Fit Jeans",
      sku: "LV-501-001",
      categorySlug: "jeans",
      brand: "Levi's",
      basePrice: 3499,
      costPrice: 2100,
      attributes: { fit: "Regular", rise: "Mid Rise", wash: "Medium", color: "Blue" },
      stockSizes: { "30": 12, "32": 18, "34": 15, "36": 8, "38": 4 },
    },
    {
      name: "Allen Solly Formal Shirt",
      sku: "AS-FS-001",
      categorySlug: "shirts",
      brand: "Allen Solly",
      basePrice: 1799,
      costPrice: 1000,
      attributes: { sleeve: "Full Sleeve", fit: "Slim Fit", pattern: "Solid", color: "Sky Blue" },
      stockSizes: { S: 10, M: 20, L: 15, XL: 8, XXL: 4 },
    },
    {
      name: "Allen Solly Checked Casual Shirt",
      sku: "AS-CS-001",
      categorySlug: "shirts",
      brand: "Allen Solly",
      basePrice: 1599,
      costPrice: 900,
      attributes: { sleeve: "Half Sleeve", fit: "Regular Fit", pattern: "Checked", color: "Red/White" },
      stockSizes: { S: 12, M: 18, L: 14, XL: 10 },
    },
    {
      name: "Nike Dri-FIT Joggers",
      sku: "NK-JG-001",
      categorySlug: "lowers",
      brand: "Nike",
      basePrice: 1999,
      costPrice: 1200,
      attributes: { type: "Joggers", material: "Polyester", color: "Grey" },
      stockSizes: { S: 8, M: 15, L: 12, XL: 6 },
    },
    {
      name: "Puma Cotton Track Pants",
      sku: "PM-TP-001",
      categorySlug: "lowers",
      brand: "Puma",
      basePrice: 1499,
      costPrice: 850,
      attributes: { type: "Track Pants", material: "Cotton", color: "Black" },
      stockSizes: { S: 10, M: 20, L: 15, XL: 8, XXL: 5 },
    },
    {
      name: "Adidas Sport Shorts",
      sku: "AD-SS-001",
      categorySlug: "shorts",
      brand: "Adidas",
      basePrice: 899,
      costPrice: 500,
      attributes: { type: "Sports", length: "Above Knee", color: "Black" },
      stockSizes: { S: 15, M: 25, L: 20, XL: 10 },
    },
    {
      name: "Nike Cargo Shorts",
      sku: "NK-CS-001",
      categorySlug: "shorts",
      brand: "Nike",
      basePrice: 1299,
      costPrice: 750,
      attributes: { type: "Cargo", length: "Knee Length", color: "Olive Green" },
      stockSizes: { S: 8, M: 14, L: 12, XL: 6 },
    },
    {
      name: "Puma Slim Pants",
      sku: "PM-SP-001",
      categorySlug: "pants",
      brand: "Puma",
      basePrice: 1799,
      costPrice: 1050,
      attributes: { fit: "Slim Fit", material: "Cotton", color: "Khaki" },
      stockSizes: { "28": 5, "30": 12, "32": 15, "34": 10, "36": 5 },
    },
    {
      name: "Allen Solly Formal Trousers",
      sku: "AS-FT-001",
      categorySlug: "pants",
      brand: "Allen Solly",
      basePrice: 2199,
      costPrice: 1300,
      attributes: { fit: "Regular Fit", material: "Polyester", color: "Charcoal" },
      stockSizes: { "30": 10, "32": 18, "34": 14, "36": 8, "38": 4 },
    },
    {
      name: "Nike Pro Compression Tee",
      sku: "NK-PCT-001",
      categorySlug: "dry-fit-tshirts",
      brand: "Nike",
      basePrice: 1799,
      costPrice: 1050,
      attributes: { sleeve: "Half Sleeve", sport: "Gym", color: "Red" },
      stockSizes: { S: 10, M: 18, L: 15, XL: 8 },
    },
    {
      name: "Adidas V-Neck Tee",
      sku: "AD-VN-001",
      categorySlug: "t-shirts",
      brand: "Adidas",
      basePrice: 899,
      costPrice: 500,
      attributes: { sleeve: "Half Sleeve", neckType: "V-Neck", color: "Grey Melange" },
      stockSizes: { S: 18, M: 28, L: 22, XL: 12, XXL: 6 },
    },
  ];

  for (const prod of productsData) {
    const cat = categories[prod.categorySlug];
    if (!cat) continue;

    const product = await prisma.product.upsert({
      where: { sku_orgId: { sku: prod.sku, orgId: org.id } },
      update: {},
      create: {
        orgId: org.id,
        name: prod.name,
        sku: prod.sku,
        categoryId: cat.id,
        brandId: brands[prod.brand],
        basePrice: prod.basePrice,
        costPrice: prod.costPrice,
        attributes: prod.attributes,
      },
    });

    // Create stock entries per size, per store
    for (const [sizeLabel, qty] of Object.entries(prod.stockSizes)) {
      const sizeId = cat.sizes[sizeLabel];
      if (!sizeId) continue;

      await prisma.stockEntry.upsert({
        where: {
          productId_sizeId_storeId: {
            productId: product.id,
            sizeId,
            storeId: store.id,
          },
        },
        update: {},
        create: {
          productId: product.id,
          sizeId,
          storeId: store.id,
          quantity: qty,
          reorderLevel: 5,
          reorderQuantity: 20,
        },
      });
    }
  }
  console.log(`✅ Products: ${productsData.length} with stock entries`);

  // ─── Suppliers ──────────────────────────────────────────────────────────────
  const suppliersData = [
    {
      name: "Fashion Wholesale Co.",
      contactPerson: "Rajesh Kumar",
      email: "rajesh@fashionwholesale.com",
      phone: "+91-9876500001",
      address: "Wholesale Market, Surat, Gujarat",
    },
    {
      name: "Denim Hub Suppliers",
      contactPerson: "Amit Patel",
      email: "amit@denimhub.com",
      phone: "+91-9876500002",
      address: "Textile Zone, Ahmedabad, Gujarat",
    },
    {
      name: "Sportswear Direct",
      contactPerson: "Priya Singh",
      email: "priya@sportsweardirect.com",
      phone: "+91-9876500003",
      address: "Industrial Area, Mumbai, Maharashtra",
    },
  ];

  for (const sup of suppliersData) {
    const existing = await prisma.supplier.findFirst({ where: { name: sup.name, orgId: org.id } });
    if (!existing) {
      await prisma.supplier.create({ data: { ...sup, orgId: org.id } });
    }
  }
  console.log(`✅ Suppliers: ${suppliersData.length}`);

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📋 Login credentials:");
  console.log("   Super Admin: superadmin@stockiva.com / password123");
  console.log("   Owner:       owner@stockiva.com / password123");
  console.log("   Admin:       admin@stockiva.com / password123");
  console.log("   Manager:     manager@stockiva.com / password123");
  console.log("   Staff:       staff@stockiva.com / password123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
