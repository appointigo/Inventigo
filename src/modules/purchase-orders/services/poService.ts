/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { adjustStockWithClient } from "@/modules/stock/services/stockService";
import { buildVariantSku } from "@/shared/services/barcodeService";
import { normalizeSku } from "@/shared/utils/normalization";
import { outstandingQuantity, purchaseOrderLineState, purchaseOrderStatus, validateReceiptQuantity } from "@/modules/procurement-intelligence/procurementRules";
import {
  createPurchaseOrderSchema,
  receivePurchaseOrderSchema,
  updatePurchaseOrderSchema,
} from "../purchaseContracts";
import type { PurchaseOrder, POFormValues, POListFilters, POUpdateValues, PurchaseOrderLineInput, ReceiveItemInput } from "../types";

const poInclude = {
  supplier: { select: { name: true } },
  user: { select: { name: true } },
  items: {
    include: {
      product: { select: { name: true, sku: true } },
      size: { select: { label: true } },
      brand: { select: { name: true } },
      category: { select: { name: true } },
    },
  },
  receipts: { include: { items: true }, orderBy: { receivedAt: "asc" as const } },
  _count: { select: { items: true } },
} as const;

type PurchaseDb = Prisma.TransactionClient | typeof prisma;

const transactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

function purchaseTotal(items: Array<{ quantity: number; unitCost: number }>) {
  const cents = items.reduce((sum, item) => sum + item.quantity * Math.round(item.unitCost * 100), 0);
  if (!Number.isSafeInteger(cents) || cents > 9_999_999_999) {
    throw new Error("Purchase order total exceeds the supported amount");
  }
  return new Prisma.Decimal(cents).dividedBy(100);
}

async function assertPurchaseReferences(
  db: PurchaseDb,
  orgId: string,
  storeId: string,
  supplierId: string,
  items: PurchaseOrderLineInput[],
) {
  const catalogItems = items.filter((item) => item.itemKind !== "PROVISIONAL_PRODUCT");
  const provisionalItems = items.filter((item) => item.itemKind === "PROVISIONAL_PRODUCT");
  const productIds = catalogItems.map((item) => item.productId);
  const sizeIds = catalogItems.map((item) => item.sizeId);
  const brandIds = provisionalItems.map((item) => item.brandId);
  const categoryIds = provisionalItems.map((item) => item.categoryId);
  const [store, supplier, products, brands, categories] = await Promise.all([
    db.store.findFirst({ where: { id: storeId, orgId, isActive: true }, select: { id: true } }),
    db.supplier.findFirst({ where: { id: supplierId, orgId, isActive: true }, select: { id: true } }),
    db.product.findMany({
      where: { id: { in: [...new Set(productIds)] }, orgId, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        brandId: true,
        categoryId: true,
        attributes: true,
        imageUrl: true,
        brand: { select: { name: true } },
        category: {
          select: {
            name: true,
            sizes: {
              where: { id: { in: [...new Set(sizeIds)] } },
              select: { id: true, label: true },
            },
          },
        },
      },
    }),
    db.brand.findMany({
      where: { id: { in: [...new Set(brandIds)] }, orgId, isActive: true },
      select: { id: true, name: true },
    }),
    db.category.findMany({
      where: { id: { in: [...new Set(categoryIds)] }, orgId },
      select: { id: true, name: true },
    }),
  ]);
  if (!store) throw new Error("Store is inactive or outside the organization");
  if (!supplier) throw new Error("Supplier is inactive or outside the organization");
  const validVariants = new Set(
    products.flatMap((product) => product.category.sizes.map((size) => `${product.id}:${size.id}`)),
  );
  const invalid = catalogItems.find((item) => !validVariants.has(`${item.productId}:${item.sizeId}`));
  if (invalid) throw new Error("A product or size variant is inactive, invalid, or outside the organization");
  if (brands.length !== new Set(brandIds).size || categories.length !== new Set(categoryIds).size) {
    throw new Error("A provisional product brand or category is invalid or outside the organization");
  }
  return {
    products: new Map(products.map((product) => [product.id, product])),
    brands: new Map(brands.map((brand) => [brand.id, brand])),
    categories: new Map(categories.map((category) => [category.id, category])),
  };
}

async function assertActiveOrgUser(db: PurchaseDb, orgId: string, userId: string) {
  const user = await db.user.findFirst({
    where: { id: userId, orgId, isActive: true },
    select: { id: true },
  });
  if (!user) throw new Error("Receiving user is inactive or outside the organization");
}

type PurchaseReferences = Awaited<ReturnType<typeof assertPurchaseReferences>>;

function purchaseOrderItemData(item: PurchaseOrderLineInput, references: PurchaseReferences) {
  if (item.itemKind === "PROVISIONAL_PRODUCT") {
    const brand = references.brands.get(item.brandId);
    const category = references.categories.get(item.categoryId);
    if (!brand || !category) throw new Error("Invalid provisional product classification");
    return {
      itemKind: "PROVISIONAL_PRODUCT" as const,
      lineGroupId: item.lineGroupId ?? randomUUID(),
      productId: null,
      sizeId: null,
      brandId: item.brandId,
      categoryId: item.categoryId,
      productNameSnapshot: item.productName,
      productSkuSnapshot: item.proposedSku || null,
      brandNameSnapshot: brand.name,
      categoryNameSnapshot: category.name,
      styleModelSnapshot: item.styleModel || null,
      colourSnapshot: item.colour || null,
      sizeLabelSnapshot: item.sizeLabel,
      supplierReference: item.supplierReference || null,
      imageUrlSnapshot: item.imageUrl || null,
      expectedSellingPrice: item.expectedSellingPrice ?? null,
      notes: item.notes || null,
      quantity: item.quantity,
      unitCost: item.unitCost,
    };
  }

  const product = references.products.get(item.productId);
  const size = product?.category.sizes.find((candidate) => candidate.id === item.sizeId);
  if (!product || !size) throw new Error("Invalid catalog product variant");
  const attributes = product.attributes && typeof product.attributes === "object" && !Array.isArray(product.attributes)
    ? product.attributes as Record<string, unknown>
    : {};
  return {
    itemKind: "EXISTING_PRODUCT" as const,
    lineGroupId: item.lineGroupId ?? randomUUID(),
    productId: item.productId,
    sizeId: item.sizeId,
    brandId: product.brandId,
    categoryId: product.categoryId,
    productNameSnapshot: product.name,
    productSkuSnapshot: product.sku,
    brandNameSnapshot: product.brand.name,
    categoryNameSnapshot: product.category.name,
    styleModelSnapshot: typeof attributes.style === "string" ? attributes.style : null,
    colourSnapshot: item.colour || (typeof attributes.colour === "string" ? attributes.colour : typeof attributes.color === "string" ? attributes.color : null),
    sizeLabelSnapshot: size.label,
    supplierReference: item.supplierReference || null,
    imageUrlSnapshot: product.imageUrl,
    notes: item.notes || null,
    quantity: item.quantity,
    unitCost: item.unitCost,
  };
}

async function catalogIdentity(
  tx: Prisma.TransactionClient,
  orgId: string,
  productId: string,
  sizeId: string,
) {
  const product = await tx.product.findFirst({
    where: {
      id: productId,
      orgId,
      isActive: true,
      category: { sizes: { some: { id: sizeId } } },
    },
    select: {
      id: true,
      name: true,
      sku: true,
      brandId: true,
      categoryId: true,
      category: { select: { sizes: { where: { id: sizeId }, select: { id: true, label: true } } } },
    },
  });
  const size = product?.category.sizes[0];
  if (!product || !size) throw new Error("Receipt product or size is invalid or outside the organization");
  return { ...product, sizeId: size.id, sizeLabel: size.label };
}

async function resolveReceiptCatalogIdentity(
  tx: Prisma.TransactionClient,
  orgId: string,
  userId: string,
  item: any,
  received: ReceiveItemInput,
  actualCost: Prisma.Decimal | number,
) {
  if (item.productId && item.sizeId) {
    if (received.catalogResolution) {
      if (
        received.catalogResolution.mode !== "LINK_EXISTING"
        || received.catalogResolution.productId !== item.productId
        || received.catalogResolution.sizeId !== item.sizeId
      ) {
        throw new Error("This purchase order line is already linked to a different catalog variant");
      }
    }
    return catalogIdentity(tx, orgId, item.productId, item.sizeId);
  }

  if (item.itemKind !== "PROVISIONAL_PRODUCT") {
    throw new Error("Purchase order line has no valid catalog identity");
  }
  const resolution = received.catalogResolution;
  if (!resolution) {
    if (received.acceptedQuantity === 0) return null;
    throw new Error(`Resolve provisional item ${item.productNameSnapshot} (${item.sizeLabelSnapshot}) before accepting stock`);
  }

  let identity;
  if (resolution.mode === "LINK_EXISTING") {
    identity = await catalogIdentity(tx, orgId, resolution.productId, resolution.sizeId);
  } else {
    if (received.acceptedQuantity <= 0) {
      return null;
    }
    const sku = normalizeSku(resolution.sku || item.productSkuSnapshot || "");
    if (!sku) throw new Error("A product SKU is required when creating the catalog product");
    const sellingPrice = resolution.sellingPrice ?? (item.expectedSellingPrice === null ? null : Number(item.expectedSellingPrice));
    if (sellingPrice === null || sellingPrice <= 0) {
      throw new Error("A positive selling price is required when creating the catalog product");
    }
    const [brand, category] = await Promise.all([
      tx.brand.findFirst({ where: { id: item.brandId ?? undefined, orgId, isActive: true }, select: { id: true } }),
      tx.category.findFirst({ where: { id: item.categoryId ?? undefined, orgId }, select: { id: true } }),
    ]);
    if (!brand || !category) throw new Error("Provisional product brand or category is no longer valid");

    const sizeLabel = item.sizeLabelSnapshot.trim();
    const existingSize = await tx.size.findFirst({
      where: { categoryId: category.id, label: { equals: sizeLabel, mode: "insensitive" } },
      select: { id: true, label: true },
    });
    const size = existingSize ?? await tx.size.upsert({
      where: { label_categoryId: { label: sizeLabel, categoryId: category.id } },
      create: { label: sizeLabel, categoryId: category.id },
      update: {},
      select: { id: true, label: true },
    });

    const existingProduct = await tx.product.findFirst({
      where: { orgId, sku: { equals: sku, mode: "insensitive" } },
      select: { id: true, brandId: true, categoryId: true, attributes: true },
    });
    if (existingProduct && (existingProduct.brandId !== brand.id || existingProduct.categoryId !== category.id)) {
      throw new Error("The proposed SKU already belongs to a different brand or category");
    }
    const existingAttributes = existingProduct?.attributes
      && typeof existingProduct.attributes === "object"
      && !Array.isArray(existingProduct.attributes)
      ? existingProduct.attributes as Record<string, unknown>
      : {};
    const existingColour = typeof existingAttributes.colour === "string"
      ? existingAttributes.colour
      : typeof existingAttributes.color === "string" ? existingAttributes.color : null;
    if (existingProduct && existingColour && item.colourSnapshot && existingColour.toLowerCase() !== item.colourSnapshot.toLowerCase()) {
      throw new Error("The proposed SKU already belongs to a different colour variant");
    }
    const attributes = {
      ...(item.styleModelSnapshot ? { styleModel: item.styleModelSnapshot } : {}),
      ...(item.colourSnapshot ? { colour: item.colourSnapshot } : {}),
    } satisfies Prisma.JsonObject;
    const product = existingProduct
      ? await tx.product.update({
          where: { id: existingProduct.id },
          data: { isActive: true },
          select: { id: true, name: true, sku: true, brandId: true, categoryId: true },
        })
      : await tx.product.create({
          data: {
            orgId,
            name: item.productNameSnapshot,
            sku,
            externalBarcode: resolution.externalBarcode || null,
            categoryId: category.id,
            brandId: brand.id,
            mrp: sellingPrice,
            basePrice: sellingPrice,
            costPrice: actualCost,
            attributes,
            imageUrl: item.imageUrlSnapshot,
            isActive: true,
          },
          select: { id: true, name: true, sku: true, brandId: true, categoryId: true },
        });
    identity = { ...product, category: { sizes: [size] }, sizeId: size.id, sizeLabel: size.label };
  }

  await tx.purchaseOrderItem.update({
    where: { id: item.id },
    data: {
      productId: identity.id,
      sizeId: identity.sizeId,
      resolvedAt: new Date(),
      resolvedBy: userId,
    },
  });
  return identity;
}

function isTransactionConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

const toDto = (po: any): PurchaseOrder => ({
  id: po.id,
  storeId: po.storeId,
  supplierId: po.supplierId,
  supplierName: po.supplier.name,
  status: po.status,
  totalAmount: Number(po.totalAmount),
  notes: po.notes ?? null,
  orderedAt: po.orderedAt?.toISOString() ?? null,
  receivedAt: po.receivedAt?.toISOString() ?? null,
  closedAt: po.closedAt?.toISOString() ?? null,
  closureReason: po.closureReason ?? null,
  expectedDeliveryDate: po.expectedDeliveryDate?.toISOString().slice(0, 10) ?? null,
  createdBy: po.createdBy,
  createdByName: po.user.name,
  items: po.items.map((item: any) => {
    const receiptItems = po.receipts.flatMap((receipt: any) => receipt.items).filter((received: any) => received.purchaseOrderItemId === item.id);
    const acceptedQuantity = receiptItems.reduce((sum: number, received: any) => sum + received.quantityAccepted, 0);
    const rejectedQuantity = receiptItems.reduce((sum: number, received: any) => sum + received.quantityRejected, 0);
    const damagedQuantity = receiptItems.reduce((sum: number, received: any) => sum + received.quantityDamaged, 0);
    return {
    id: item.id,
    itemKind: item.itemKind,
    lineGroupId: item.lineGroupId,
    productId: item.productId ?? null,
    productName: item.product?.name ?? item.productNameSnapshot,
    productSku: item.product?.sku ?? item.productSkuSnapshot ?? null,
    sizeId: item.sizeId ?? null,
    sizeLabel: item.size?.label ?? item.sizeLabelSnapshot,
    brandName: item.brand?.name ?? item.brandNameSnapshot ?? null,
    categoryName: item.category?.name ?? item.categoryNameSnapshot ?? null,
    styleModel: item.styleModelSnapshot ?? null,
    colour: item.colourSnapshot ?? null,
    supplierReference: item.supplierReference ?? null,
    imageUrl: item.imageUrlSnapshot ?? null,
    expectedSellingPrice: item.expectedSellingPrice === null ? null : Number(item.expectedSellingPrice),
    notes: item.notes ?? null,
    isCatalogResolved: Boolean(item.productId && item.sizeId),
    quantity: item.quantity,
    unitCost: Number(item.unitCost),
    total: item.quantity * Number(item.unitCost),
    acceptedQuantity, rejectedQuantity, damagedQuantity,
    outstandingQuantity: outstandingQuantity(item.quantity, acceptedQuantity),
    receiptStatus: purchaseOrderLineState(item.quantity, acceptedQuantity),
  }}),
  itemCount: po._count.items,
  createdAt: po.createdAt.toISOString(),
  updatedAt: po.updatedAt.toISOString(),
});

export const poService = {
  async list(filters: POListFilters, orgId: string): Promise<PurchaseOrder[]> {
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        store: { orgId },
        ...(filters.storeId && { storeId: filters.storeId }),
        ...(filters.supplierId && { supplierId: filters.supplierId }),
        ...(filters.status && { status: filters.status }),
      },
      include: poInclude,
      orderBy: { createdAt: "desc" },
    });
    return orders.map(toDto);
  },

  async getById(id: string, orgId: string, fixedStoreId?: string | null): Promise<PurchaseOrder | null> {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, store: { orgId }, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) },
      include: poInclude,
    });
    return po ? toDto(po) : null;
  },

  async create(values: POFormValues, userId: string, orgId: string): Promise<PurchaseOrder> {
    const input = createPurchaseOrderSchema.parse(values);
    const po = await prisma.$transaction(async (tx) => {
      await assertActiveOrgUser(tx, orgId, userId);
      const references = await assertPurchaseReferences(tx, orgId, input.storeId, input.supplierId, input.items);
      return tx.purchaseOrder.create({
        data: {
          storeId: input.storeId,
          supplierId: input.supplierId,
          notes: input.notes || null,
          expectedDeliveryDate: input.expectedDeliveryDate ? new Date(`${input.expectedDeliveryDate}T00:00:00.000Z`) : null,
          totalAmount: purchaseTotal(input.items),
          createdBy: userId,
          items: {
            create: input.items.map((item) => purchaseOrderItemData(item, references)),
          },
        },
        include: poInclude,
      });
    }, transactionOptions);
    return toDto(po);
  },

  async submitPO(id: string, orgId: string, fixedStoreId?: string | null): Promise<PurchaseOrder | null> {
    const updated = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({
        where: { id, store: { orgId }, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) },
      });
      if (!po) return null;
      if (po.status !== "DRAFT") throw new Error("Only DRAFT purchase orders can be submitted");
      return tx.purchaseOrder.update({
        where: { id },
        data: { status: "ORDERED", orderedAt: new Date() },
        include: poInclude,
      });
    }, transactionOptions);
    if (!updated) return null;
    return toDto(updated);
  },

  async receivePO(
    id: string,
    orgId: string,
    receivedItems: ReceiveItemInput[],
    userId: string,
    metadata: { confirmationId: string; receivedAt?: string; receiptReference?: string; supplierInvoiceNumber?: string; notes?: string },
    fixedStoreId?: string | null,
  ): Promise<PurchaseOrder | null> {
    const input = receivePurchaseOrderSchema.parse({ ...metadata, items: receivedItems });
    const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const updated = await prisma.$transaction(async (tx) => {
          const scopedOrder = await tx.purchaseOrder.findFirst({
            where: { id, store: { orgId }, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) },
            select: { id: true },
          });
          if (!scopedOrder) return null;

          await tx.$queryRaw`SELECT "id" FROM "purchase_orders" WHERE "id" = ${id} FOR UPDATE`;

          const existingReceipt = await tx.purchaseOrderReceipt.findUnique({
            where: { confirmationId: input.confirmationId },
            select: { purchaseOrderId: true },
          });
          if (existingReceipt) {
            if (existingReceipt.purchaseOrderId !== id) {
              throw new Error("Receipt confirmation is already used by another purchase order");
            }
            return tx.purchaseOrder.findFirst({
              where: { id, store: { orgId }, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) },
              include: poInclude,
            });
          }

          const po = await tx.purchaseOrder.findFirst({
            where: { id, store: { orgId }, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) },
            include: poInclude,
          });
          if (!po) return null;
          if (po.status !== "ORDERED" && po.status !== "PARTIALLY_RECEIVED") {
            throw new Error("Only ordered or partially received purchase orders can be received");
          }
          await assertActiveOrgUser(tx, orgId, userId);
          await assertPurchaseReferences(tx, orgId, po.storeId, po.supplierId, []);

          const receipt = await tx.purchaseOrderReceipt.create({
            data: {
              confirmationId: input.confirmationId,
              purchaseOrderId: id,
              receiptReference: input.receiptReference || null,
              receivedBy: userId,
              receivedAt,
              supplierInvoiceNumber: input.supplierInvoiceNumber || null,
              notes: input.notes || null,
            },
          });

          for (const received of input.items) {
            validateReceiptQuantity({
              received: received.receivedQuantity,
              accepted: received.acceptedQuantity,
              rejected: received.rejectedQuantity,
              damaged: received.damagedQuantity,
            });
            const item = po.items.find((candidate) => candidate.id === received.purchaseOrderItemId);
            if (!item) throw new Error("Receipt contains an item outside this purchase order");
            const priorAccepted = po.receipts
              .flatMap((existingReceipt) => existingReceipt.items)
              .filter((row) => row.purchaseOrderItemId === item.id)
              .reduce((sum, row) => sum + row.quantityAccepted, 0);
            if (priorAccepted + received.acceptedQuantity > item.quantity) {
              throw new Error(`Accepted quantity for ${item.product?.name ?? item.productNameSnapshot} (${item.size?.label ?? item.sizeLabelSnapshot}) exceeds the ordered quantity`);
            }
            const actualCost = received.unitCostActual ?? item.unitCost;
            const identity = await resolveReceiptCatalogIdentity(tx, orgId, userId, item, received, actualCost);
            const receiptItem = await tx.purchaseOrderReceiptItem.create({
              data: {
                receiptId: receipt.id,
                purchaseOrderItemId: item.id,
                productId: identity?.id ?? null,
                sizeId: identity?.sizeId ?? null,
                quantityReceived: received.receivedQuantity,
                quantityAccepted: received.acceptedQuantity,
                quantityRejected: received.rejectedQuantity,
                quantityDamaged: received.damagedQuantity,
                rejectionReason: received.rejectionReason || null,
                batchReference: received.batchReference || null,
                unitCostActual: actualCost,
              },
            });
            if (received.damagedQuantity > 0) {
              await tx.purchaseOrderReceiptDefect.create({
                data: {
                  receiptItemId: receiptItem.id,
                  quantity: received.defectQuantity ?? received.damagedQuantity,
                  reason: received.defectReason || received.rejectionReason!,
                  imageUrls: received.defectImageUrls ?? [],
                  createdBy: userId,
                },
              });
            }
            if (received.acceptedQuantity > 0) {
              if (!identity) throw new Error("Accepted stock requires a resolved catalog product and variant");
              await adjustStockWithClient(tx, {
                orgId,
                productId: identity.id,
                sizeId: identity.sizeId,
                storeId: po.storeId,
                quantity: received.acceptedQuantity,
                variantSku: buildVariantSku(identity.sku, identity.sizeLabel),
                type: "IN",
                referenceType: "PO",
                referenceId: receipt.id,
                reason: `PO receipt ${receipt.id.slice(0, 8).toUpperCase()}`,
                businessDate: receivedAt,
                userId,
              });
            }
            if (identity) {
              await tx.productSupplier.upsert({
                where: { productId_supplierId: { productId: identity.id, supplierId: po.supplierId } },
                create: { productId: identity.id, supplierId: po.supplierId, supplierSku: item.supplierReference, lastPurchaseCost: actualCost },
                update: { isActive: true, ...(item.supplierReference ? { supplierSku: item.supplierReference } : {}), lastPurchaseCost: actualCost },
              });
            }
          }

          const acceptedByLine = po.items.map((item) => ({
            ordered: item.quantity,
            accepted: po.receipts
              .flatMap((existingReceipt) => existingReceipt.items)
              .filter((row) => row.purchaseOrderItemId === item.id)
              .reduce((sum, row) => sum + row.quantityAccepted, 0)
              + (input.items.find((row) => row.purchaseOrderItemId === item.id)?.acceptedQuantity ?? 0),
          }));
          const status = purchaseOrderStatus(acceptedByLine);
          return tx.purchaseOrder.update({
            where: { id },
            data: { status, receivedAt: status === "RECEIVED" ? receivedAt : null },
            include: poInclude,
          });
        }, transactionOptions);
        return updated ? toDto(updated) : null;
      } catch (error) {
        if (isTransactionConflict(error)) {
          if (attempt < 2) continue;
          throw new Error("Receipt could not be confirmed after concurrent updates; retry with the same confirmation ID");
        }
        if (isUniqueConflict(error)) {
          const existing = await prisma.purchaseOrderReceipt.findFirst({
            where: {
              confirmationId: input.confirmationId,
              purchaseOrderId: id,
              purchaseOrder: { store: { orgId }, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) },
            },
            select: { id: true },
          });
          if (existing) return this.getById(id, orgId, fixedStoreId);
        }
        throw error;
      }
    }
    throw new Error("Receipt could not be confirmed after concurrent updates; retry with the same confirmation ID");
  },

  async cancelPO(id: string, orgId: string, fixedStoreId?: string | null): Promise<PurchaseOrder | null> {
    const updated = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({
        where: { id, store: { orgId }, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) },
        include: { _count: { select: { receipts: true } } },
      });
      if (!po) return null;
      if (po.status !== "DRAFT" && po.status !== "ORDERED") {
        throw new Error("Only unreceived draft or ordered purchase orders can be cancelled");
      }
      if (po._count.receipts > 0) {
        throw new Error("An order with receipt evidence cannot be cancelled; close its remaining quantity instead");
      }
      return tx.purchaseOrder.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: poInclude,
      });
    }, transactionOptions);
    if (!updated) return null;
    return toDto(updated);
  },

  async closePO(
    id: string,
    orgId: string,
    userId: string,
    reason: string,
    fixedStoreId?: string | null,
  ): Promise<PurchaseOrder | null> {
    const updated = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({
        where: { id, store: { orgId }, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) },
        include: { _count: { select: { receipts: true } } },
      });
      if (!po) return null;
      if (po.status !== "ORDERED" && po.status !== "PARTIALLY_RECEIVED") {
        throw new Error("Only an open purchase order can be closed short");
      }
      if (po._count.receipts === 0) {
        throw new Error("An unreceived order should be cancelled, not closed short");
      }
      await assertActiveOrgUser(tx, orgId, userId);
      return tx.purchaseOrder.update({
        where: { id },
        data: { status: "CLOSED", closedAt: new Date(), closedBy: userId, closureReason: reason.trim() },
        include: poInclude,
      });
    }, transactionOptions);
    return updated ? toDto(updated) : null;
  },

  async update(
    id: string,
    orgId: string,
    values: POUpdateValues,
    fixedStoreId?: string | null,
  ): Promise<PurchaseOrder | null> {
    const input = updatePurchaseOrderSchema.parse(values);

    const nextTotalAmount =
      input.items !== undefined
        ? purchaseTotal(input.items)
        : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({
        where: { id, store: { orgId }, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) },
        include: { items: true },
      });
      if (!po) return null;
      if (po.status !== "DRAFT") throw new Error("Only DRAFT purchase orders can be edited");
      const supplierId = input.supplierId ?? po.supplierId;
      const items = input.items;
      const references = await assertPurchaseReferences(tx, orgId, po.storeId, supplierId, items ?? []);
      return tx.purchaseOrder.update({
        where: { id },
        data: {
          ...(input.supplierId !== undefined && { supplierId: input.supplierId }),
          ...(input.notes !== undefined && { notes: input.notes || null }),
          ...(input.expectedDeliveryDate !== undefined && { expectedDeliveryDate: input.expectedDeliveryDate ? new Date(`${input.expectedDeliveryDate}T00:00:00.000Z`) : null }),
          ...(nextTotalAmount !== undefined && { totalAmount: nextTotalAmount }),
          ...(items !== undefined && {
            items: {
              deleteMany: {},
              create: items.map((item) => purchaseOrderItemData(item, references)),
            },
          }),
        },
        include: poInclude,
      });
    }, transactionOptions);
    return updated ? toDto(updated) : null;
  },
};
