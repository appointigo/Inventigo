-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "FeatureKey" AS ENUM ('WHATSAPP');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'OWNER', 'ADMIN', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "WhatsAppProvider" AS ENUM ('META');

-- CreateEnum
CREATE TYPE "WhatsAppIntegrationStatus" AS ENUM ('PENDING', 'CONNECTED', 'ACTION_REQUIRED', 'SUSPENDED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "WhatsAppBusinessAccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'RESTRICTED', 'DISABLED');

-- CreateEnum
CREATE TYPE "WhatsAppPhoneNumberStatus" AS ENUM ('PENDING', 'ACTIVE', 'RESTRICTED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "WhatsAppSenderPurpose" AS ENUM ('DEFAULT', 'TRANSACTIONAL', 'MARKETING', 'SUPPORT');

-- CreateEnum
CREATE TYPE "WhatsAppTemplateScope" AS ENUM ('PLATFORM', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "WhatsAppTemplateSource" AS ENUM ('SYSTEM', 'MERCHANT', 'META_IMPORTED');

-- CreateEnum
CREATE TYPE "WhatsAppTemplateCategory" AS ENUM ('UTILITY', 'MARKETING', 'AUTHENTICATION');

-- CreateEnum
CREATE TYPE "WhatsAppTemplatePurpose" AS ENUM ('INVOICE', 'PAYMENT_RECEIPT', 'PAYMENT_REMINDER', 'ORDER_CONFIRMATION', 'ORDER_STATUS', 'MARKETING_PROMOTION', 'PRODUCT_LAUNCH', 'COUPON', 'OTP', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WhatsAppTemplateStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "WhatsAppMessageDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "WhatsAppMessageType" AS ENUM ('TEMPLATE', 'TEXT', 'IMAGE', 'DOCUMENT', 'VIDEO', 'INTERACTIVE');

-- CreateEnum
CREATE TYPE "WhatsAppMessagePurpose" AS ENUM ('INVOICE', 'PAYMENT', 'MARKETING', 'ORDER', 'SUPPORT', 'OTP', 'OTHER');

-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('QUEUED', 'SUBMITTED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsAppWebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsAppConversationRoutingStatus" AS ENUM ('RESOLVED', 'UNRESOLVED');

-- CreateEnum
CREATE TYPE "WhatsAppConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "WhatsAppConsentPurpose" AS ENUM ('TRANSACTIONAL', 'MARKETING');

-- CreateEnum
CREATE TYPE "WhatsAppConsentStatus" AS ENUM ('GRANTED', 'REVOKED', 'PENDING');

-- CreateEnum
CREATE TYPE "WhatsAppCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'QUEUED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WhatsAppCampaignRecipientStatus" AS ENUM ('ELIGIBLE', 'EXCLUDED', 'QUEUED', 'PROCESSING', 'SUBMITTED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "WhatsAppAutomationTrigger" AS ENUM ('SALE_COMPLETED', 'PAYMENT_DUE', 'CUSTOMER_INACTIVE');

-- CreateEnum
CREATE TYPE "WhatsAppAutomationExecutionStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SUBMITTED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "OrgPlan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'SALE', 'RETURN', 'EXCHANGE_IN', 'EXCHANGE_OUT', 'TRANSFER_IN', 'TRANSFER_OUT');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('PO', 'SALE', 'MANUAL', 'RETURN', 'EXCHANGE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "StockTransferStatus" AS ENUM ('DRAFT', 'APPROVED', 'DISPATCHED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReplenishmentRecommendationType" AS ENUM ('REORDER', 'NO_REORDER', 'STOCKOUT_RISK', 'INBOUND_COVERS_DEMAND', 'OVERSTOCK', 'MARKDOWN_CANDIDATE', 'MONITOR');

-- CreateEnum
CREATE TYPE "RecommendationEvidenceQuality" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "RecommendationDisposition" AS ENUM ('OPEN', 'ACCEPTED', 'DISMISSED', 'IGNORED');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('RECORDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'UPI');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'REFUNDED', 'EXCHANGED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PARTIAL', 'PENDING');

-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('CASH', 'BANK', 'UPI_SETTLEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "FinancialDirection" AS ENUM ('INFLOW', 'OUTFLOW');

-- CreateEnum
CREATE TYPE "FinancialReferenceType" AS ENUM ('SALE_PAYMENT', 'EXPENSE', 'SUPPLIER_PAYMENT', 'REFUND_SETTLEMENT', 'ACCOUNT_TRANSFER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ExpensePaymentStatus" AS ENUM ('UNKNOWN', 'UNPAID', 'PAID');

-- CreateEnum
CREATE TYPE "SupplierPayableStatus" AS ENUM ('OPEN', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RefundLiabilityStatus" AS ENUM ('PENDING', 'PARTIAL', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ForecastReadiness" AS ENUM ('READY', 'LIMITED', 'NOT_READY');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('NONE', 'PARTIAL', 'FULL');

-- CreateEnum
CREATE TYPE "ReturnType" AS ENUM ('RETURN', 'EXCHANGE', 'RETURN_EXCHANGE');

-- CreateEnum
CREATE TYPE "VisitOutcome" AS ENUM ('CONVERTED', 'NOT_CONVERTED', 'PARTIALLY_CONVERTED', 'BROWSING', 'MAY_RETURN');

-- CreateEnum
CREATE TYPE "ExpectedReturnPeriod" AS ENUM ('TOMORROW', 'TWO_TO_THREE_DAYS', 'WITHIN_A_WEEK', 'NOT_SURE');

-- CreateEnum
CREATE TYPE "VisitReturnOutcome" AS ENUM ('PURCHASED', 'DID_NOT_PURCHASE');

-- CreateEnum
CREATE TYPE "CustomerFollowUpType" AS ENUM ('GENERAL', 'REPEAT_PURCHASE', 'AT_RISK', 'RESTOCK', 'RETURN_RESOLUTION', 'OTHER');

-- CreateEnum
CREATE TYPE "CustomerFollowUpPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "CustomerFollowUpStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DemandRequestStatus" AS ENUM ('FULFILLED', 'PARTIALLY_FULFILLED', 'UNFULFILLED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "DemandReasonCode" AS ENUM ('OUT_OF_STOCK', 'VARIANT_UNAVAILABLE', 'PRODUCT_UNAVAILABLE', 'BRAND_UNAVAILABLE', 'FEATURE_UNAVAILABLE', 'PRICE_TOO_HIGH', 'COLOR_UNAVAILABLE', 'SIZE_UNAVAILABLE', 'CUSTOMER_CHANGED_MIND', 'JUST_BROWSING', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'OFF', 'LEAVE');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('SICK', 'CASUAL', 'PAID');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ColorSourceType" AS ENUM ('PREDEFINED', 'USER_CREATED', 'AUTO_GENERATED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "plan" "OrgPlan" NOT NULL DEFAULT 'FREE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_invoice_settings" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "designKey" TEXT NOT NULL DEFAULT 'CLASSIC',
    "designVersion" INTEGER NOT NULL DEFAULT 1,
    "defaultWhatsAppEnabled" BOOLEAN NOT NULL DEFAULT false,
    "activePolicyVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_invoice_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_policy_versions" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "termsText" TEXT,
    "exchangePolicyText" TEXT,
    "returnPolicyText" TEXT,
    "thankYouMessage" TEXT,
    "storeSubtitle" TEXT,
    "footerNote" TEXT,
    "signatureText" TEXT,
    "qrHelperText" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "storeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "semantic" TEXT,
    "source" "ColorSourceType" NOT NULL,
    "aliases" TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "attributeSchema" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "externalBarcode" TEXT,
    "categoryId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "costPrice" DECIMAL(10,2) NOT NULL,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mrp" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sizes" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_entries" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "variantSku" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 5,
    "reorderQuantity" INTEGER NOT NULL DEFAULT 10,
    "lastRestockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "deltaQuantity" INTEGER,
    "quantityBefore" INTEGER,
    "quantityAfter" INTEGER,
    "reason" TEXT,
    "referenceType" "ReferenceType",
    "referenceId" TEXT,
    "createdBy" TEXT NOT NULL,
    "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "orderedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "expectedDeliveryDate" DATE,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_receipts" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedBy" TEXT NOT NULL,
    "supplierInvoiceNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_receipt_items" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "purchaseOrderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "quantityReceived" INTEGER NOT NULL,
    "quantityAccepted" INTEGER NOT NULL,
    "quantityRejected" INTEGER NOT NULL DEFAULT 0,
    "quantityDamaged" INTEGER NOT NULL DEFAULT 0,
    "rejectionReason" TEXT,
    "unitCostActual" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_suppliers" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "supplierSku" TEXT,
    "lastPurchaseCost" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replenishment_recommendations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "type" "ReplenishmentRecommendationType" NOT NULL,
    "severity" TEXT NOT NULL,
    "recommendedQuantity" INTEGER,
    "reasonCodes" TEXT[],
    "reasons" TEXT[],
    "evidence" JSONB NOT NULL,
    "evidenceQuality" "RecommendationEvidenceQuality" NOT NULL,
    "observationFrom" TIMESTAMP(3) NOT NULL,
    "observationTo" TIMESTAMP(3) NOT NULL,
    "horizonDays" INTEGER NOT NULL,
    "disposition" "RecommendationDisposition" NOT NULL DEFAULT 'OPEN',
    "linkedPurchaseOrderId" TEXT,
    "outcome" JSONB,
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "replenishment_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sourceStoreId" TEXT NOT NULL,
    "destinationStoreId" TEXT NOT NULL,
    "status" "StockTransferStatus" NOT NULL DEFAULT 'DRAFT',
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "dispatchedById" TEXT,
    "receivedById" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "expectedArrivalAt" TIMESTAMP(3),
    "notes" TEXT,
    "recommendationEvidence" JSONB,
    "outcome" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfer_items" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "requestedQuantity" INTEGER NOT NULL,
    "approvedQuantity" INTEGER NOT NULL DEFAULT 0,
    "dispatchedQuantity" INTEGER NOT NULL DEFAULT 0,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "damagedQuantity" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "supplierId" TEXT,
    "purchaseNumber" TEXT NOT NULL,
    "purchaseDate" DATE NOT NULL,
    "supplierNameSnapshot" TEXT NOT NULL,
    "supplierInvoiceNumber" TEXT,
    "manufacturerSnapshot" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'RECORDED',
    "notes" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "additionalCharges" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "categoryId" TEXT,
    "categoryNameSnapshot" TEXT NOT NULL,
    "attributesSnapshot" JSONB NOT NULL DEFAULT '{}',
    "unitSnapshot" TEXT,
    "totalQuantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_item_options" (
    "id" TEXT NOT NULL,
    "purchaseItemId" TEXT NOT NULL,
    "sizeId" TEXT,
    "optionLabelSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_item_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "calculatedTotal" DECIMAL(10,2),
    "roundOffAmount" DECIMAL(10,2) DEFAULT 0,
    "finalPayableAmount" DECIMAL(10,2),
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PAID',
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amountDue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "returnStatus" "ReturnStatus" NOT NULL DEFAULT 'NONE',
    "promoVoided" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "promoCodeId" TEXT,
    "customerId" TEXT,
    "invoicePolicyVersionId" TEXT,
    "invoiceSnapshot" JSONB,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "originalUnitPrice" DECIMAL(10,2),
    "itemDiscountType" TEXT,
    "itemDiscountValue" DECIMAL(10,2),
    "netLineAmount" DECIMAL(10,2),
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "mrp" DECIMAL(10,2),
    "sellingPrice" DECIMAL(10,2),
    "discountType" TEXT,
    "appliedDiscountPercent" DECIMAL(10,2),
    "allocatedDiscount" DECIMAL(10,2) DEFAULT 0,
    "taxableAmount" DECIMAL(10,2) DEFAULT 0,
    "taxAmount" DECIMAL(10,2) DEFAULT 0,
    "finalUnitPrice" DECIMAL(10,2) DEFAULT 0,
    "finalLineAmount" DECIMAL(10,2) DEFAULT 0,
    "effectiveUnitPrice" DECIMAL(10,2) DEFAULT 0,
    "costPrice" DECIMAL(10,2),
    "pricingSnapshotDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_payments" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "businessDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_transactions" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "referenceNumber" TEXT NOT NULL,
    "originalSaleId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT,
    "type" "ReturnType" NOT NULL,
    "returnedItems" JSONB NOT NULL DEFAULT '[]',
    "exchangedItems" JSONB NOT NULL DEFAULT '[]',
    "netAmount" DECIMAL(10,2) NOT NULL,
    "offsetAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "refundAmount" DECIMAL(10,2) NOT NULL,
    "discountType" TEXT,
    "discountPercent" DECIMAL(5,2),
    "discountAmount" DECIMAL(10,2) DEFAULT 0,
    "taxRate" DECIMAL(5,2),
    "calculatedTotal" DECIMAL(10,2),
    "roundOffAmount" DECIMAL(10,2) DEFAULT 0,
    "finalPayable" DECIMAL(10,2),
    "splitPaymentData" JSONB,
    "refundMethod" TEXT,
    "reason" TEXT,
    "condition" TEXT,
    "notes" TEXT,
    "transactionDate" TIMESTAMP(3),
    "businessDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "invoicePolicyVersionId" TEXT,
    "invoiceSnapshot" JSONB,

    CONSTRAINT "return_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_transaction_items" (
    "returnedLineAmount" DECIMAL(10,2),
    "id" TEXT NOT NULL,
    "returnTransactionId" TEXT NOT NULL,
    "returnedProductId" TEXT,
    "returnedSizeId" TEXT,
    "returnedQuantity" INTEGER NOT NULL,
    "returnedUnitPrice" DECIMAL(10,2) NOT NULL,
    "newProductId" TEXT,
    "newSizeId" TEXT,
    "newQuantity" INTEGER,
    "newUnitPrice" DECIMAL(10,2),
    "newCostPrice" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_transaction_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "notes" TEXT,
    "lastVisitAt" TIMESTAMP(3),
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "preferredStoreId" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_visits" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" "VisitOutcome" NOT NULL,
    "expectedReturnPeriod" "ExpectedReturnPeriod",
    "returnConfirmedAt" TIMESTAMP(3),
    "returnOutcome" "VisitReturnOutcome",
    "linkedSaleId" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "customerId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_follow_ups" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "createdBy" TEXT NOT NULL,
    "visitId" TEXT,
    "demandRequestId" TEXT,
    "type" "CustomerFollowUpType" NOT NULL,
    "status" "CustomerFollowUpStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "CustomerFollowUpPriority" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reason" TEXT,
    "note" TEXT,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastContactedAt" TIMESTAMP(3),
    "sourceReference" TEXT,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_requests" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "categoryId" TEXT,
    "brandId" TEXT,
    "productId" TEXT,
    "requestedQuantity" INTEGER NOT NULL DEFAULT 1,
    "fulfilledQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "DemandRequestStatus" NOT NULL,
    "reasonCode" "DemandReasonCode" NOT NULL,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demand_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_configs" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT,
    "productId" TEXT,
    "categoryId" TEXT,
    "threshold" INTEGER NOT NULL DEFAULT 5,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifySMS" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_codes" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "desc" TEXT NOT NULL DEFAULT '',
    "discountPct" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxUses" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_category_options" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorKey" TEXT NOT NULL DEFAULT 'default',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_category_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_expenses" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "paymentMode" TEXT,
    "receiptUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceFreq" TEXT,
    "vendorGstin" TEXT,
    "gstRate" DECIMAL(5,2),
    "gstAmount" DECIMAL(10,2),
    "isItcEligible" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentStatus" "ExpensePaymentStatus" NOT NULL DEFAULT 'UNKNOWN',
    "paidAt" TIMESTAMP(3),
    "financialAccountId" TEXT,

    CONSTRAINT "store_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_accounts" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT,
    "name" TEXT NOT NULL,
    "type" "FinancialAccountType" NOT NULL,
    "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "openingBalanceAsOf" DATE,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_method_account_mappings" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_method_account_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT,
    "accountId" TEXT,
    "direction" "FinancialDirection" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "businessDate" DATE NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceType" "FinancialReferenceType" NOT NULL,
    "referenceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salePaymentId" TEXT,
    "expenseId" TEXT,
    "supplierPaymentId" TEXT,
    "refundSettlementId" TEXT,
    "transferId" TEXT,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_account_transfers" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT,
    "sourceAccountId" TEXT NOT NULL,
    "destinationAccountId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "businessDate" DATE NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_account_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_payables" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "receiptId" TEXT,
    "supplierInvoiceNumber" TEXT,
    "invoiceDate" DATE NOT NULL,
    "dueDate" DATE,
    "originalAmount" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "outstandingAmount" DECIMAL(14,2) NOT NULL,
    "status" "SupplierPayableStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_payables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_payments" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "payableId" TEXT NOT NULL,
    "accountId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" TEXT,
    "paymentDate" DATE NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_liabilities" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "returnTransactionId" TEXT NOT NULL,
    "liabilityAmount" DECIMAL(14,2) NOT NULL,
    "settledAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "outstandingAmount" DECIMAL(14,2) NOT NULL,
    "status" "RefundLiabilityStatus" NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_liabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_settlements" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "liabilityId" TEXT NOT NULL,
    "accountId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" TEXT,
    "settledAt" DATE NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_forecasts" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horizonDays" INTEGER NOT NULL,
    "readiness" "ForecastReadiness" NOT NULL,
    "evidenceQuality" "RecommendationEvidenceQuality" NOT NULL,
    "method" TEXT,
    "expectedQuantity" DECIMAL(12,3),
    "lowerBound" DECIMAL(12,3),
    "upperBound" DECIMAL(12,3),
    "trend" TEXT NOT NULL,
    "historyFrom" DATE,
    "historyTo" DATE,
    "modelVersion" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "evaluation" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demand_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_forecast_outcomes" (
    "id" TEXT NOT NULL,
    "forecastId" TEXT NOT NULL,
    "actualQuantity" DECIMAL(12,3) NOT NULL,
    "absoluteError" DECIMAL(12,3) NOT NULL,
    "bias" DECIMAL(12,3) NOT NULL,
    "stockoutDistorted" BOOLEAN NOT NULL DEFAULT false,
    "actualFrom" DATE NOT NULL,
    "actualTo" DATE NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demand_forecast_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_budgets" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_attendances" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "totalMinutes" INTEGER,
    "note" TEXT,
    "source" TEXT NOT NULL DEFAULT 'SYSTEM',
    "overrideReason" TEXT,
    "overriddenBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerComment" TEXT,
    "reviewedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_offs" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_offs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_leave_policies" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "allocated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_leave_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "year" INTEGER NOT NULL,
    "allocated" INTEGER NOT NULL DEFAULT 0,
    "used" INTEGER NOT NULL DEFAULT 0,
    "carryForward" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetName" TEXT,
    "performedBy" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "key" TEXT NOT NULL,
    "value" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_features" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "feature" "FeatureKey" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "targetPlan" TEXT,
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_integrations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "WhatsAppProvider" NOT NULL DEFAULT 'META',
    "status" "WhatsAppIntegrationStatus" NOT NULL DEFAULT 'PENDING',
    "credentialRef" TEXT,
    "metaBusinessId" TEXT,
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_credentials" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "WhatsAppProvider" NOT NULL DEFAULT 'META',
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_business_accounts" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "metaWabaId" TEXT NOT NULL,
    "businessName" TEXT,
    "status" "WhatsAppBusinessAccountStatus" NOT NULL DEFAULT 'PENDING',
    "timezone" TEXT,
    "currency" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_business_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_phone_numbers" (
    "id" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "metaPhoneNumberId" TEXT NOT NULL,
    "displayPhoneNumber" TEXT NOT NULL,
    "normalizedPhoneNumber" TEXT,
    "verifiedName" TEXT,
    "qualityRating" TEXT,
    "messagingLimitTier" TEXT,
    "status" "WhatsAppPhoneNumberStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_phone_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_whatsapp_senders" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "purpose" "WhatsAppSenderPurpose" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_whatsapp_senders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_whatsapp_profiles" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "signature" TEXT,
    "supportPhone" TEXT,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "defaultInvoiceTemplateInstanceId" TEXT,
    "defaultExchangeInvoiceTemplateInstanceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_whatsapp_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_template_definitions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "scope" "WhatsAppTemplateScope" NOT NULL,
    "source" "WhatsAppTemplateSource" NOT NULL DEFAULT 'SYSTEM',
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "purpose" "WhatsAppTemplatePurpose" NOT NULL,
    "category" "WhatsAppTemplateCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "displayLabel" TEXT,
    "header" JSONB,
    "body" TEXT NOT NULL,
    "footer" TEXT,
    "buttons" JSONB,
    "variables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_template_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_template_instances" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "metaTemplateId" TEXT,
    "metaTemplateName" TEXT NOT NULL,
    "status" "WhatsAppTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_template_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT,
    "phoneNumberId" TEXT NOT NULL,
    "templateInstanceId" TEXT,
    "campaignRecipientId" TEXT,
    "automationExecutionId" TEXT,
    "conversationId" TEXT,
    "idempotencyKey" TEXT,
    "dispatchClaimedAt" TIMESTAMP(3),
    "metaMessageId" TEXT,
    "direction" "WhatsAppMessageDirection" NOT NULL,
    "type" "WhatsAppMessageType" NOT NULL,
    "purpose" "WhatsAppMessagePurpose" NOT NULL,
    "fromPhone" TEXT,
    "toPhone" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "payload" JSONB,
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "queuedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_message_events" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metaStatus" TEXT,
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_message_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_webhook_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "providerEventId" TEXT,
    "dedupeKey" TEXT,
    "eventType" TEXT,
    "payload" JSONB NOT NULL,
    "processingStatus" "WhatsAppWebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "processingAttempts" INTEGER NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_conversations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "contactId" TEXT,
    "storeId" TEXT,
    "externalPhone" TEXT NOT NULL,
    "routingStatus" "WhatsAppConversationRoutingStatus" NOT NULL DEFAULT 'UNRESOLVED',
    "unresolvedReason" TEXT,
    "status" "WhatsAppConversationStatus" NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_contacts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "normalizedPhone" TEXT NOT NULL,
    "displayPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_contact_stores" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_contact_stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_consents" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "purpose" "WhatsAppConsentPurpose" NOT NULL,
    "status" "WhatsAppConsentStatus" NOT NULL DEFAULT 'PENDING',
    "source" TEXT,
    "evidence" JSONB,
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_campaigns" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "templateDefinitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "WhatsAppCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "audienceFilters" JSONB NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "launchedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_campaign_stores" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,

    CONSTRAINT "whatsapp_campaign_stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_campaign_recipients" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "storeId" TEXT,
    "senderId" TEXT,
    "templateInstanceId" TEXT,
    "status" "WhatsAppCampaignRecipientStatus" NOT NULL,
    "exclusionReason" TEXT,
    "snapshot" JSONB,
    "jobId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "availableAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockToken" TEXT,
    "lastError" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_campaign_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_automations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT,
    "templateDefinitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" "WhatsAppAutomationTrigger" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "conditions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_automation_executions" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "storeId" TEXT,
    "contactId" TEXT,
    "recipientPhone" TEXT,
    "payload" JSONB NOT NULL,
    "status" "WhatsAppAutomationExecutionStatus" NOT NULL DEFAULT 'QUEUED',
    "skipReason" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockToken" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_automation_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "stores_orgId_idx" ON "stores"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "stores_code_orgId_key" ON "stores"("code", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "store_invoice_settings_storeId_key" ON "store_invoice_settings"("storeId");

-- CreateIndex
CREATE INDEX "store_invoice_settings_activePolicyVersionId_idx" ON "store_invoice_settings"("activePolicyVersionId");

-- CreateIndex
CREATE INDEX "invoice_policy_versions_storeId_effectiveFrom_idx" ON "invoice_policy_versions"("storeId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_policy_versions_storeId_version_key" ON "invoice_policy_versions"("storeId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_orgId_idx" ON "users"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_orgId_idx" ON "invitations"("orgId");

-- CreateIndex
CREATE INDEX "invitations_storeId_idx" ON "invitations"("storeId");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "colors_name_key" ON "colors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "colors_hex_key" ON "colors"("hex");

-- CreateIndex
CREATE INDEX "colors_category_idx" ON "colors"("category");

-- CreateIndex
CREATE INDEX "colors_semantic_idx" ON "colors"("semantic");

-- CreateIndex
CREATE INDEX "colors_createdBy_idx" ON "colors"("createdBy");

-- CreateIndex
CREATE INDEX "categories_orgId_idx" ON "categories"("orgId");

-- CreateIndex
CREATE INDEX "categories_storeId_idx" ON "categories"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_orgId_key" ON "categories"("name", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_orgId_key" ON "categories"("slug", "orgId");

-- CreateIndex
CREATE INDEX "brands_orgId_idx" ON "brands"("orgId");

-- CreateIndex
CREATE INDEX "brands_storeId_idx" ON "brands"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_orgId_key" ON "brands"("name", "orgId");

-- CreateIndex
CREATE INDEX "products_orgId_idx" ON "products"("orgId");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_brandId_idx" ON "products"("brandId");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_orgId_externalBarcode_idx" ON "products"("orgId", "externalBarcode");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_orgId_key" ON "products"("sku", "orgId");

-- CreateIndex
CREATE INDEX "sizes_categoryId_idx" ON "sizes"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "sizes_label_categoryId_key" ON "sizes"("label", "categoryId");

-- CreateIndex
CREATE INDEX "stock_entries_storeId_idx" ON "stock_entries"("storeId");

-- CreateIndex
CREATE INDEX "stock_entries_productId_idx" ON "stock_entries"("productId");

-- CreateIndex
CREATE INDEX "stock_entries_sizeId_quantity_idx" ON "stock_entries"("sizeId", "quantity");

-- CreateIndex
CREATE INDEX "stock_entries_storeId_sizeId_quantity_idx" ON "stock_entries"("storeId", "sizeId", "quantity");

-- CreateIndex
CREATE INDEX "stock_entries_variantSku_idx" ON "stock_entries"("variantSku");

-- CreateIndex
CREATE UNIQUE INDEX "stock_entries_productId_sizeId_storeId_key" ON "stock_entries"("productId", "sizeId", "storeId");

-- CreateIndex
CREATE INDEX "stock_movements_productId_idx" ON "stock_movements"("productId");

-- CreateIndex
CREATE INDEX "stock_movements_storeId_idx" ON "stock_movements"("storeId");

-- CreateIndex
CREATE INDEX "stock_movements_storeId_movementDate_idx" ON "stock_movements"("storeId", "movementDate");

-- CreateIndex
CREATE INDEX "stock_movements_movementDate_idx" ON "stock_movements"("movementDate");

-- CreateIndex
CREATE INDEX "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_referenceType_referenceId_idx" ON "stock_movements"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "suppliers_orgId_idx" ON "suppliers"("orgId");

-- CreateIndex
CREATE INDEX "purchase_orders_storeId_idx" ON "purchase_orders"("storeId");

-- CreateIndex
CREATE INDEX "purchase_orders_supplierId_idx" ON "purchase_orders"("supplierId");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_order_receipts_purchaseOrderId_receivedAt_idx" ON "purchase_order_receipts"("purchaseOrderId", "receivedAt");

-- CreateIndex
CREATE INDEX "purchase_order_receipts_receivedBy_idx" ON "purchase_order_receipts"("receivedBy");

-- CreateIndex
CREATE INDEX "purchase_order_receipt_items_receiptId_idx" ON "purchase_order_receipt_items"("receiptId");

-- CreateIndex
CREATE INDEX "purchase_order_receipt_items_purchaseOrderItemId_idx" ON "purchase_order_receipt_items"("purchaseOrderItemId");

-- CreateIndex
CREATE INDEX "purchase_order_receipt_items_productId_sizeId_idx" ON "purchase_order_receipt_items"("productId", "sizeId");

-- CreateIndex
CREATE INDEX "product_suppliers_supplierId_isActive_idx" ON "product_suppliers"("supplierId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "product_suppliers_productId_supplierId_key" ON "product_suppliers"("productId", "supplierId");

-- CreateIndex
CREATE INDEX "replenishment_recommendations_orgId_storeId_createdAt_idx" ON "replenishment_recommendations"("orgId", "storeId", "createdAt");

-- CreateIndex
CREATE INDEX "replenishment_recommendations_storeId_type_disposition_idx" ON "replenishment_recommendations"("storeId", "type", "disposition");

-- CreateIndex
CREATE UNIQUE INDEX "replenishment_recommendations_storeId_productId_sizeId_obse_key" ON "replenishment_recommendations"("storeId", "productId", "sizeId", "observationFrom", "observationTo", "type");

-- CreateIndex
CREATE INDEX "stock_transfers_orgId_status_createdAt_idx" ON "stock_transfers"("orgId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "stock_transfers_sourceStoreId_status_idx" ON "stock_transfers"("sourceStoreId", "status");

-- CreateIndex
CREATE INDEX "stock_transfers_destinationStoreId_status_idx" ON "stock_transfers"("destinationStoreId", "status");

-- CreateIndex
CREATE INDEX "stock_transfer_items_productId_sizeId_idx" ON "stock_transfer_items"("productId", "sizeId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfer_items_transferId_productId_sizeId_key" ON "stock_transfer_items"("transferId", "productId", "sizeId");

-- CreateIndex
CREATE INDEX "purchases_orgId_storeId_purchaseDate_idx" ON "purchases"("orgId", "storeId", "purchaseDate");

-- CreateIndex
CREATE INDEX "purchases_orgId_supplierId_idx" ON "purchases"("orgId", "supplierId");

-- CreateIndex
CREATE INDEX "purchases_orgId_status_idx" ON "purchases"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_orgId_purchaseNumber_key" ON "purchases"("orgId", "purchaseNumber");

-- CreateIndex
CREATE INDEX "purchase_items_purchaseId_idx" ON "purchase_items"("purchaseId");

-- CreateIndex
CREATE INDEX "purchase_items_categoryId_idx" ON "purchase_items"("categoryId");

-- CreateIndex
CREATE INDEX "purchase_item_options_purchaseItemId_idx" ON "purchase_item_options"("purchaseItemId");

-- CreateIndex
CREATE INDEX "purchase_item_options_sizeId_idx" ON "purchase_item_options"("sizeId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoiceNumber_key" ON "sales"("invoiceNumber");

-- CreateIndex
CREATE INDEX "sales_storeId_idx" ON "sales"("storeId");

-- CreateIndex
CREATE INDEX "sales_storeId_transactionDate_idx" ON "sales"("storeId", "transactionDate");

-- CreateIndex
CREATE INDEX "sales_transactionDate_idx" ON "sales"("transactionDate");

-- CreateIndex
CREATE INDEX "sales_customerId_idx" ON "sales"("customerId");

-- CreateIndex
CREATE INDEX "sales_createdAt_idx" ON "sales"("createdAt");

-- CreateIndex
CREATE INDEX "sales_status_idx" ON "sales"("status");

-- CreateIndex
CREATE INDEX "sales_promoCodeId_idx" ON "sales"("promoCodeId");

-- CreateIndex
CREATE INDEX "sales_invoicePolicyVersionId_idx" ON "sales"("invoicePolicyVersionId");

-- CreateIndex
CREATE INDEX "sale_items_saleId_idx" ON "sale_items"("saleId");

-- CreateIndex
CREATE INDEX "sale_items_productId_idx" ON "sale_items"("productId");

-- CreateIndex
CREATE INDEX "sale_payments_saleId_idx" ON "sale_payments"("saleId");

-- CreateIndex
CREATE INDEX "sale_payments_businessDate_idx" ON "sale_payments"("businessDate");

-- CreateIndex
CREATE INDEX "sale_payments_paidAt_idx" ON "sale_payments"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "return_transactions_idempotencyKey_key" ON "return_transactions"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "return_transactions_referenceNumber_key" ON "return_transactions"("referenceNumber");

-- CreateIndex
CREATE INDEX "return_transactions_originalSaleId_idx" ON "return_transactions"("originalSaleId");

-- CreateIndex
CREATE INDEX "return_transactions_storeId_idx" ON "return_transactions"("storeId");

-- CreateIndex
CREATE INDEX "return_transactions_storeId_businessDate_idx" ON "return_transactions"("storeId", "businessDate");

-- CreateIndex
CREATE INDEX "return_transactions_customerId_idx" ON "return_transactions"("customerId");

-- CreateIndex
CREATE INDEX "return_transactions_businessDate_idx" ON "return_transactions"("businessDate");

-- CreateIndex
CREATE INDEX "return_transactions_createdAt_idx" ON "return_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "return_transactions_invoicePolicyVersionId_idx" ON "return_transactions"("invoicePolicyVersionId");

-- CreateIndex
CREATE INDEX "return_transaction_items_returnTransactionId_idx" ON "return_transaction_items"("returnTransactionId");

-- CreateIndex
CREATE INDEX "return_transaction_items_returnedProductId_idx" ON "return_transaction_items"("returnedProductId");

-- CreateIndex
CREATE INDEX "return_transaction_items_newProductId_idx" ON "return_transaction_items"("newProductId");

-- CreateIndex
CREATE INDEX "customers_orgId_idx" ON "customers"("orgId");

-- CreateIndex
CREATE INDEX "customers_mobile_idx" ON "customers"("mobile");

-- CreateIndex
CREATE INDEX "customers_orgId_preferredStoreId_idx" ON "customers"("orgId", "preferredStoreId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_orgId_mobile_key" ON "customers"("orgId", "mobile");

-- CreateIndex
CREATE UNIQUE INDEX "customer_visits_linkedSaleId_key" ON "customer_visits"("linkedSaleId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_visits_idempotencyKey_key" ON "customer_visits"("idempotencyKey");

-- CreateIndex
CREATE INDEX "customer_visits_orgId_idx" ON "customer_visits"("orgId");

-- CreateIndex
CREATE INDEX "customer_visits_storeId_visitedAt_idx" ON "customer_visits"("storeId", "visitedAt");

-- CreateIndex
CREATE INDEX "customer_visits_outcome_idx" ON "customer_visits"("outcome");

-- CreateIndex
CREATE INDEX "customer_visits_storeId_outcome_returnConfirmedAt_idx" ON "customer_visits"("storeId", "outcome", "returnConfirmedAt");

-- CreateIndex
CREATE INDEX "customer_visits_orgId_customerId_visitedAt_idx" ON "customer_visits"("orgId", "customerId", "visitedAt");

-- CreateIndex
CREATE UNIQUE INDEX "customer_follow_ups_dedupeKey_key" ON "customer_follow_ups"("dedupeKey");

-- CreateIndex
CREATE INDEX "customer_follow_ups_orgId_storeId_status_dueAt_idx" ON "customer_follow_ups"("orgId", "storeId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "customer_follow_ups_customerId_createdAt_idx" ON "customer_follow_ups"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "customer_follow_ups_visitId_idx" ON "customer_follow_ups"("visitId");

-- CreateIndex
CREATE INDEX "customer_follow_ups_demandRequestId_idx" ON "customer_follow_ups"("demandRequestId");

-- CreateIndex
CREATE INDEX "customer_follow_ups_createdBy_idx" ON "customer_follow_ups"("createdBy");

-- CreateIndex
CREATE INDEX "demand_requests_storeId_createdAt_idx" ON "demand_requests"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "demand_requests_visitId_idx" ON "demand_requests"("visitId");

-- CreateIndex
CREATE INDEX "demand_requests_categoryId_idx" ON "demand_requests"("categoryId");

-- CreateIndex
CREATE INDEX "demand_requests_productId_idx" ON "demand_requests"("productId");

-- CreateIndex
CREATE INDEX "demand_requests_reasonCode_idx" ON "demand_requests"("reasonCode");

-- CreateIndex
CREATE INDEX "alert_configs_orgId_idx" ON "alert_configs"("orgId");

-- CreateIndex
CREATE INDEX "promo_codes_orgId_idx" ON "promo_codes"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_orgId_key" ON "promo_codes"("code", "orgId");

-- CreateIndex
CREATE INDEX "expense_category_options_orgId_idx" ON "expense_category_options"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_category_options_orgId_name_key" ON "expense_category_options"("orgId", "name");

-- CreateIndex
CREATE INDEX "store_expenses_orgId_idx" ON "store_expenses"("orgId");

-- CreateIndex
CREATE INDEX "store_expenses_storeId_idx" ON "store_expenses"("storeId");

-- CreateIndex
CREATE INDEX "store_expenses_date_idx" ON "store_expenses"("date");

-- CreateIndex
CREATE INDEX "store_expenses_status_idx" ON "store_expenses"("status");

-- CreateIndex
CREATE INDEX "store_expenses_paymentStatus_paidAt_idx" ON "store_expenses"("paymentStatus", "paidAt");

-- CreateIndex
CREATE INDEX "store_expenses_financialAccountId_idx" ON "store_expenses"("financialAccountId");

-- CreateIndex
CREATE INDEX "financial_accounts_orgId_storeId_isActive_idx" ON "financial_accounts"("orgId", "storeId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "financial_accounts_orgId_name_key" ON "financial_accounts"("orgId", "name");

-- CreateIndex
CREATE INDEX "payment_method_account_mappings_accountId_idx" ON "payment_method_account_mappings"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_account_mappings_orgId_storeId_paymentMethod_key" ON "payment_method_account_mappings"("orgId", "storeId", "paymentMethod");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_idempotencyKey_key" ON "financial_transactions"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_salePaymentId_key" ON "financial_transactions"("salePaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_expenseId_key" ON "financial_transactions"("expenseId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_supplierPaymentId_key" ON "financial_transactions"("supplierPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_refundSettlementId_key" ON "financial_transactions"("refundSettlementId");

-- CreateIndex
CREATE INDEX "financial_transactions_orgId_businessDate_idx" ON "financial_transactions"("orgId", "businessDate");

-- CreateIndex
CREATE INDEX "financial_transactions_storeId_businessDate_idx" ON "financial_transactions"("storeId", "businessDate");

-- CreateIndex
CREATE INDEX "financial_transactions_accountId_businessDate_idx" ON "financial_transactions"("accountId", "businessDate");

-- CreateIndex
CREATE INDEX "financial_transactions_referenceType_referenceId_idx" ON "financial_transactions"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_account_transfers_idempotencyKey_key" ON "financial_account_transfers"("idempotencyKey");

-- CreateIndex
CREATE INDEX "financial_account_transfers_orgId_businessDate_idx" ON "financial_account_transfers"("orgId", "businessDate");

-- CreateIndex
CREATE INDEX "financial_account_transfers_sourceAccountId_idx" ON "financial_account_transfers"("sourceAccountId");

-- CreateIndex
CREATE INDEX "financial_account_transfers_destinationAccountId_idx" ON "financial_account_transfers"("destinationAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payables_receiptId_key" ON "supplier_payables"("receiptId");

-- CreateIndex
CREATE INDEX "supplier_payables_orgId_storeId_status_dueDate_idx" ON "supplier_payables"("orgId", "storeId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "supplier_payables_supplierId_status_idx" ON "supplier_payables"("supplierId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payables_orgId_receiptId_supplierInvoiceNumber_key" ON "supplier_payables"("orgId", "receiptId", "supplierInvoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payments_idempotencyKey_key" ON "supplier_payments"("idempotencyKey");

-- CreateIndex
CREATE INDEX "supplier_payments_orgId_paymentDate_idx" ON "supplier_payments"("orgId", "paymentDate");

-- CreateIndex
CREATE INDEX "supplier_payments_payableId_paymentDate_idx" ON "supplier_payments"("payableId", "paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "refund_liabilities_returnTransactionId_key" ON "refund_liabilities"("returnTransactionId");

-- CreateIndex
CREATE INDEX "refund_liabilities_orgId_storeId_status_idx" ON "refund_liabilities"("orgId", "storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "refund_settlements_idempotencyKey_key" ON "refund_settlements"("idempotencyKey");

-- CreateIndex
CREATE INDEX "refund_settlements_orgId_settledAt_idx" ON "refund_settlements"("orgId", "settledAt");

-- CreateIndex
CREATE INDEX "refund_settlements_liabilityId_settledAt_idx" ON "refund_settlements"("liabilityId", "settledAt");

-- CreateIndex
CREATE INDEX "demand_forecasts_orgId_storeId_snapshotDate_idx" ON "demand_forecasts"("orgId", "storeId", "snapshotDate");

-- CreateIndex
CREATE INDEX "demand_forecasts_storeId_readiness_horizonDays_idx" ON "demand_forecasts"("storeId", "readiness", "horizonDays");

-- CreateIndex
CREATE UNIQUE INDEX "demand_forecasts_storeId_productId_sizeId_snapshotDate_hori_key" ON "demand_forecasts"("storeId", "productId", "sizeId", "snapshotDate", "horizonDays", "modelVersion");

-- CreateIndex
CREATE UNIQUE INDEX "demand_forecast_outcomes_forecastId_key" ON "demand_forecast_outcomes"("forecastId");

-- CreateIndex
CREATE INDEX "demand_forecast_outcomes_evaluatedAt_idx" ON "demand_forecast_outcomes"("evaluatedAt");

-- CreateIndex
CREATE INDEX "expense_budgets_orgId_idx" ON "expense_budgets"("orgId");

-- CreateIndex
CREATE INDEX "expense_budgets_storeId_idx" ON "expense_budgets"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_budgets_storeId_category_month_year_key" ON "expense_budgets"("storeId", "category", "month", "year");

-- CreateIndex
CREATE INDEX "email_verifications_email_idx" ON "email_verifications"("email");

-- CreateIndex
CREATE INDEX "staff_attendances_orgId_storeId_date_idx" ON "staff_attendances"("orgId", "storeId", "date");

-- CreateIndex
CREATE INDEX "staff_attendances_userId_date_idx" ON "staff_attendances"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "staff_attendances_userId_date_key" ON "staff_attendances"("userId", "date");

-- CreateIndex
CREATE INDEX "leave_requests_orgId_storeId_status_idx" ON "leave_requests"("orgId", "storeId", "status");

-- CreateIndex
CREATE INDEX "leave_requests_userId_startDate_endDate_idx" ON "leave_requests"("userId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "weekly_offs_orgId_storeId_idx" ON "weekly_offs"("orgId", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_offs_storeId_dayOfWeek_key" ON "weekly_offs"("storeId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "store_leave_policies_orgId_storeId_idx" ON "store_leave_policies"("orgId", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "store_leave_policies_storeId_leaveType_key" ON "store_leave_policies"("storeId", "leaveType");

-- CreateIndex
CREATE INDEX "leave_balances_orgId_userId_idx" ON "leave_balances"("orgId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_userId_leaveType_year_key" ON "leave_balances"("userId", "leaveType", "year");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");

-- CreateIndex
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "feature_flags_key_idx" ON "feature_flags"("key");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_orgId_key_key" ON "feature_flags"("orgId", "key");

-- CreateIndex
CREATE INDEX "tenant_features_organizationId_idx" ON "tenant_features"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_features_organizationId_feature_key" ON "tenant_features"("organizationId", "feature");

-- CreateIndex
CREATE INDEX "announcements_isActive_idx" ON "announcements"("isActive");

-- CreateIndex
CREATE INDEX "announcements_createdAt_idx" ON "announcements"("createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_integrations_organizationId_idx" ON "whatsapp_integrations"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_integrations_organizationId_provider_idx" ON "whatsapp_integrations"("organizationId", "provider");

-- CreateIndex
CREATE INDEX "whatsapp_integrations_status_idx" ON "whatsapp_integrations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_integrations_organizationId_provider_key" ON "whatsapp_integrations"("organizationId", "provider");

-- CreateIndex
CREATE INDEX "whatsapp_credentials_organizationId_provider_idx" ON "whatsapp_credentials"("organizationId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_business_accounts_metaWabaId_key" ON "whatsapp_business_accounts"("metaWabaId");

-- CreateIndex
CREATE INDEX "whatsapp_business_accounts_integrationId_idx" ON "whatsapp_business_accounts"("integrationId");

-- CreateIndex
CREATE INDEX "whatsapp_business_accounts_status_idx" ON "whatsapp_business_accounts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_phone_numbers_metaPhoneNumberId_key" ON "whatsapp_phone_numbers"("metaPhoneNumberId");

-- CreateIndex
CREATE INDEX "whatsapp_phone_numbers_wabaId_idx" ON "whatsapp_phone_numbers"("wabaId");

-- CreateIndex
CREATE INDEX "whatsapp_phone_numbers_status_idx" ON "whatsapp_phone_numbers"("status");

-- CreateIndex
CREATE INDEX "whatsapp_phone_numbers_normalizedPhoneNumber_idx" ON "whatsapp_phone_numbers"("normalizedPhoneNumber");

-- CreateIndex
CREATE INDEX "store_whatsapp_senders_storeId_purpose_isActive_idx" ON "store_whatsapp_senders"("storeId", "purpose", "isActive");

-- CreateIndex
CREATE INDEX "store_whatsapp_senders_phoneNumberId_idx" ON "store_whatsapp_senders"("phoneNumberId");

-- CreateIndex
CREATE INDEX "store_whatsapp_senders_storeId_purpose_priority_idx" ON "store_whatsapp_senders"("storeId", "purpose", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "store_whatsapp_senders_storeId_phoneNumberId_purpose_key" ON "store_whatsapp_senders"("storeId", "phoneNumberId", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "store_whatsapp_profiles_storeId_key" ON "store_whatsapp_profiles"("storeId");

-- CreateIndex
CREATE INDEX "store_whatsapp_profiles_defaultInvoiceTemplateInstanceId_idx" ON "store_whatsapp_profiles"("defaultInvoiceTemplateInstanceId");

-- CreateIndex
CREATE INDEX "store_whatsapp_profiles_defaultExchangeInvoiceTemplateInsta_idx" ON "store_whatsapp_profiles"("defaultExchangeInvoiceTemplateInstanceId");

-- CreateIndex
CREATE INDEX "whatsapp_template_definitions_scope_key_isActive_idx" ON "whatsapp_template_definitions"("scope", "key", "isActive");

-- CreateIndex
CREATE INDEX "whatsapp_template_definitions_organizationId_idx" ON "whatsapp_template_definitions"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_template_definitions_purpose_category_idx" ON "whatsapp_template_definitions"("purpose", "category");

-- CreateIndex
CREATE INDEX "whatsapp_template_definitions_source_idx" ON "whatsapp_template_definitions"("source");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_template_instances_metaTemplateId_key" ON "whatsapp_template_instances"("metaTemplateId");

-- CreateIndex
CREATE INDEX "whatsapp_template_instances_wabaId_status_idx" ON "whatsapp_template_instances"("wabaId", "status");

-- CreateIndex
CREATE INDEX "whatsapp_template_instances_definitionId_idx" ON "whatsapp_template_instances"("definitionId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_template_instances_wabaId_definitionId_key" ON "whatsapp_template_instances"("wabaId", "definitionId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_idempotencyKey_key" ON "whatsapp_messages"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_metaMessageId_key" ON "whatsapp_messages"("metaMessageId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_organizationId_createdAt_idx" ON "whatsapp_messages"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_messages_storeId_createdAt_idx" ON "whatsapp_messages"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_messages_phoneNumberId_createdAt_idx" ON "whatsapp_messages"("phoneNumberId", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_messages_status_idx" ON "whatsapp_messages"("status");

-- CreateIndex
CREATE INDEX "whatsapp_messages_metaMessageId_idx" ON "whatsapp_messages"("metaMessageId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_referenceType_referenceId_idx" ON "whatsapp_messages"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_campaignRecipientId_createdAt_idx" ON "whatsapp_messages"("campaignRecipientId", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_messages_automationExecutionId_createdAt_idx" ON "whatsapp_messages"("automationExecutionId", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_messages_conversationId_createdAt_idx" ON "whatsapp_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_message_events_messageId_occurredAt_idx" ON "whatsapp_message_events"("messageId", "occurredAt");

-- CreateIndex
CREATE INDEX "whatsapp_message_events_occurredAt_idx" ON "whatsapp_message_events"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_webhook_events_dedupeKey_key" ON "whatsapp_webhook_events"("dedupeKey");

-- CreateIndex
CREATE INDEX "whatsapp_webhook_events_processingStatus_createdAt_idx" ON "whatsapp_webhook_events"("processingStatus", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_webhook_events_providerEventId_idx" ON "whatsapp_webhook_events"("providerEventId");

-- CreateIndex
CREATE INDEX "whatsapp_webhook_events_organizationId_createdAt_idx" ON "whatsapp_webhook_events"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_organizationId_lastMessageAt_idx" ON "whatsapp_conversations"("organizationId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_phoneNumberId_externalPhone_status_idx" ON "whatsapp_conversations"("phoneNumberId", "externalPhone", "status");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_storeId_lastMessageAt_idx" ON "whatsapp_conversations"("storeId", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_contacts_customerId_key" ON "whatsapp_contacts"("customerId");

-- CreateIndex
CREATE INDEX "whatsapp_contacts_organizationId_createdAt_idx" ON "whatsapp_contacts"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_contacts_organizationId_normalizedPhone_key" ON "whatsapp_contacts"("organizationId", "normalizedPhone");

-- CreateIndex
CREATE INDEX "whatsapp_contact_stores_storeId_idx" ON "whatsapp_contact_stores"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_contact_stores_contactId_storeId_key" ON "whatsapp_contact_stores"("contactId", "storeId");

-- CreateIndex
CREATE INDEX "whatsapp_consents_status_purpose_idx" ON "whatsapp_consents"("status", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_consents_contactId_purpose_key" ON "whatsapp_consents"("contactId", "purpose");

-- CreateIndex
CREATE INDEX "whatsapp_campaigns_organizationId_createdAt_idx" ON "whatsapp_campaigns"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_campaigns_organizationId_status_idx" ON "whatsapp_campaigns"("organizationId", "status");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_stores_senderId_idx" ON "whatsapp_campaign_stores"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_campaign_stores_campaignId_storeId_key" ON "whatsapp_campaign_stores"("campaignId", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_campaign_recipients_jobId_key" ON "whatsapp_campaign_recipients"("jobId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_recipients_campaignId_status_idx" ON "whatsapp_campaign_recipients"("campaignId", "status");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_recipients_contactId_idx" ON "whatsapp_campaign_recipients"("contactId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_recipients_status_availableAt_lockedAt_idx" ON "whatsapp_campaign_recipients"("status", "availableAt", "lockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_campaign_recipients_campaignId_contactId_key" ON "whatsapp_campaign_recipients"("campaignId", "contactId");

-- CreateIndex
CREATE INDEX "whatsapp_automations_organizationId_trigger_isActive_idx" ON "whatsapp_automations"("organizationId", "trigger", "isActive");

-- CreateIndex
CREATE INDEX "whatsapp_automation_executions_status_availableAt_lockedAt_idx" ON "whatsapp_automation_executions"("status", "availableAt", "lockedAt");

-- CreateIndex
CREATE INDEX "whatsapp_automation_executions_automationId_createdAt_idx" ON "whatsapp_automation_executions"("automationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_automation_executions_automationId_eventKey_key" ON "whatsapp_automation_executions"("automationId", "eventKey");

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_invoice_settings" ADD CONSTRAINT "store_invoice_settings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_invoice_settings" ADD CONSTRAINT "store_invoice_settings_activePolicyVersionId_fkey" FOREIGN KEY ("activePolicyVersionId") REFERENCES "invoice_policy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_policy_versions" ADD CONSTRAINT "invoice_policy_versions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "colors" ADD CONSTRAINT "colors_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sizes" ADD CONSTRAINT "sizes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_entries" ADD CONSTRAINT "stock_entries_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_entries" ADD CONSTRAINT "stock_entries_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_entries" ADD CONSTRAINT "stock_entries_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_receipts" ADD CONSTRAINT "purchase_order_receipts_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_receipts" ADD CONSTRAINT "purchase_order_receipts_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_receipt_items" ADD CONSTRAINT "purchase_order_receipt_items_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "purchase_order_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_receipt_items" ADD CONSTRAINT "purchase_order_receipt_items_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "purchase_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_receipt_items" ADD CONSTRAINT "purchase_order_receipt_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_receipt_items" ADD CONSTRAINT "purchase_order_receipt_items_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replenishment_recommendations" ADD CONSTRAINT "replenishment_recommendations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replenishment_recommendations" ADD CONSTRAINT "replenishment_recommendations_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replenishment_recommendations" ADD CONSTRAINT "replenishment_recommendations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replenishment_recommendations" ADD CONSTRAINT "replenishment_recommendations_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "sizes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replenishment_recommendations" ADD CONSTRAINT "replenishment_recommendations_linkedPurchaseOrderId_fkey" FOREIGN KEY ("linkedPurchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_sourceStoreId_fkey" FOREIGN KEY ("sourceStoreId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_destinationStoreId_fkey" FOREIGN KEY ("destinationStoreId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_dispatchedById_fkey" FOREIGN KEY ("dispatchedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "stock_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_item_options" ADD CONSTRAINT "purchase_item_options_purchaseItemId_fkey" FOREIGN KEY ("purchaseItemId") REFERENCES "purchase_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_item_options" ADD CONSTRAINT "purchase_item_options_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "sizes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_invoicePolicyVersionId_fkey" FOREIGN KEY ("invoicePolicyVersionId") REFERENCES "invoice_policy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transactions" ADD CONSTRAINT "return_transactions_originalSaleId_fkey" FOREIGN KEY ("originalSaleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transactions" ADD CONSTRAINT "return_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transactions" ADD CONSTRAINT "return_transactions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transactions" ADD CONSTRAINT "return_transactions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transactions" ADD CONSTRAINT "return_transactions_invoicePolicyVersionId_fkey" FOREIGN KEY ("invoicePolicyVersionId") REFERENCES "invoice_policy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transaction_items" ADD CONSTRAINT "return_transaction_items_returnTransactionId_fkey" FOREIGN KEY ("returnTransactionId") REFERENCES "return_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transaction_items" ADD CONSTRAINT "return_transaction_items_returnedProductId_fkey" FOREIGN KEY ("returnedProductId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transaction_items" ADD CONSTRAINT "return_transaction_items_returnedSizeId_fkey" FOREIGN KEY ("returnedSizeId") REFERENCES "sizes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transaction_items" ADD CONSTRAINT "return_transaction_items_newProductId_fkey" FOREIGN KEY ("newProductId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transaction_items" ADD CONSTRAINT "return_transaction_items_newSizeId_fkey" FOREIGN KEY ("newSizeId") REFERENCES "sizes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_preferredStoreId_fkey" FOREIGN KEY ("preferredStoreId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_visits" ADD CONSTRAINT "customer_visits_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_visits" ADD CONSTRAINT "customer_visits_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_visits" ADD CONSTRAINT "customer_visits_linkedSaleId_fkey" FOREIGN KEY ("linkedSaleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_visits" ADD CONSTRAINT "customer_visits_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_visits" ADD CONSTRAINT "customer_visits_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_follow_ups" ADD CONSTRAINT "customer_follow_ups_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_follow_ups" ADD CONSTRAINT "customer_follow_ups_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_follow_ups" ADD CONSTRAINT "customer_follow_ups_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_follow_ups" ADD CONSTRAINT "customer_follow_ups_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_follow_ups" ADD CONSTRAINT "customer_follow_ups_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_follow_ups" ADD CONSTRAINT "customer_follow_ups_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "customer_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_follow_ups" ADD CONSTRAINT "customer_follow_ups_demandRequestId_fkey" FOREIGN KEY ("demandRequestId") REFERENCES "demand_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_requests" ADD CONSTRAINT "demand_requests_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_requests" ADD CONSTRAINT "demand_requests_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_requests" ADD CONSTRAINT "demand_requests_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "customer_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_requests" ADD CONSTRAINT "demand_requests_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_requests" ADD CONSTRAINT "demand_requests_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_requests" ADD CONSTRAINT "demand_requests_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_configs" ADD CONSTRAINT "alert_configs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_configs" ADD CONSTRAINT "alert_configs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_configs" ADD CONSTRAINT "alert_configs_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_category_options" ADD CONSTRAINT "expense_category_options_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_expenses" ADD CONSTRAINT "store_expenses_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_expenses" ADD CONSTRAINT "store_expenses_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_expenses" ADD CONSTRAINT "store_expenses_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_expenses" ADD CONSTRAINT "store_expenses_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_method_account_mappings" ADD CONSTRAINT "payment_method_account_mappings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_method_account_mappings" ADD CONSTRAINT "payment_method_account_mappings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_method_account_mappings" ADD CONSTRAINT "payment_method_account_mappings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_method_account_mappings" ADD CONSTRAINT "payment_method_account_mappings_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_salePaymentId_fkey" FOREIGN KEY ("salePaymentId") REFERENCES "sale_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "store_expenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_supplierPaymentId_fkey" FOREIGN KEY ("supplierPaymentId") REFERENCES "supplier_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_refundSettlementId_fkey" FOREIGN KEY ("refundSettlementId") REFERENCES "refund_settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "financial_account_transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account_transfers" ADD CONSTRAINT "financial_account_transfers_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account_transfers" ADD CONSTRAINT "financial_account_transfers_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account_transfers" ADD CONSTRAINT "financial_account_transfers_sourceAccountId_fkey" FOREIGN KEY ("sourceAccountId") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account_transfers" ADD CONSTRAINT "financial_account_transfers_destinationAccountId_fkey" FOREIGN KEY ("destinationAccountId") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_account_transfers" ADD CONSTRAINT "financial_account_transfers_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payables" ADD CONSTRAINT "supplier_payables_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payables" ADD CONSTRAINT "supplier_payables_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payables" ADD CONSTRAINT "supplier_payables_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payables" ADD CONSTRAINT "supplier_payables_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payables" ADD CONSTRAINT "supplier_payables_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "purchase_order_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payables" ADD CONSTRAINT "supplier_payables_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "supplier_payables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_liabilities" ADD CONSTRAINT "refund_liabilities_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_liabilities" ADD CONSTRAINT "refund_liabilities_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_liabilities" ADD CONSTRAINT "refund_liabilities_returnTransactionId_fkey" FOREIGN KEY ("returnTransactionId") REFERENCES "return_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_liabilities" ADD CONSTRAINT "refund_liabilities_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_settlements" ADD CONSTRAINT "refund_settlements_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_settlements" ADD CONSTRAINT "refund_settlements_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_settlements" ADD CONSTRAINT "refund_settlements_liabilityId_fkey" FOREIGN KEY ("liabilityId") REFERENCES "refund_liabilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_settlements" ADD CONSTRAINT "refund_settlements_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_settlements" ADD CONSTRAINT "refund_settlements_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_forecasts" ADD CONSTRAINT "demand_forecasts_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_forecasts" ADD CONSTRAINT "demand_forecasts_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_forecasts" ADD CONSTRAINT "demand_forecasts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_forecasts" ADD CONSTRAINT "demand_forecasts_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "sizes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_forecast_outcomes" ADD CONSTRAINT "demand_forecast_outcomes_forecastId_fkey" FOREIGN KEY ("forecastId") REFERENCES "demand_forecasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_budgets" ADD CONSTRAINT "expense_budgets_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_budgets" ADD CONSTRAINT "expense_budgets_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendances" ADD CONSTRAINT "staff_attendances_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendances" ADD CONSTRAINT "staff_attendances_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendances" ADD CONSTRAINT "staff_attendances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_offs" ADD CONSTRAINT "weekly_offs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_offs" ADD CONSTRAINT "weekly_offs_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_leave_policies" ADD CONSTRAINT "store_leave_policies_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_leave_policies" ADD CONSTRAINT "store_leave_policies_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_features" ADD CONSTRAINT "tenant_features_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_integrations" ADD CONSTRAINT "whatsapp_integrations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_credentials" ADD CONSTRAINT "whatsapp_credentials_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_business_accounts" ADD CONSTRAINT "whatsapp_business_accounts_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "whatsapp_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_phone_numbers" ADD CONSTRAINT "whatsapp_phone_numbers_wabaId_fkey" FOREIGN KEY ("wabaId") REFERENCES "whatsapp_business_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_whatsapp_senders" ADD CONSTRAINT "store_whatsapp_senders_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_whatsapp_senders" ADD CONSTRAINT "store_whatsapp_senders_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "whatsapp_phone_numbers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_whatsapp_profiles" ADD CONSTRAINT "store_whatsapp_profiles_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_whatsapp_profiles" ADD CONSTRAINT "store_whatsapp_profiles_defaultInvoiceTemplateInstanceId_fkey" FOREIGN KEY ("defaultInvoiceTemplateInstanceId") REFERENCES "whatsapp_template_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_whatsapp_profiles" ADD CONSTRAINT "store_whatsapp_profiles_defaultExchangeInvoiceTemplateInst_fkey" FOREIGN KEY ("defaultExchangeInvoiceTemplateInstanceId") REFERENCES "whatsapp_template_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_template_definitions" ADD CONSTRAINT "whatsapp_template_definitions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_template_instances" ADD CONSTRAINT "whatsapp_template_instances_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "whatsapp_template_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_template_instances" ADD CONSTRAINT "whatsapp_template_instances_wabaId_fkey" FOREIGN KEY ("wabaId") REFERENCES "whatsapp_business_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "whatsapp_phone_numbers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_templateInstanceId_fkey" FOREIGN KEY ("templateInstanceId") REFERENCES "whatsapp_template_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_campaignRecipientId_fkey" FOREIGN KEY ("campaignRecipientId") REFERENCES "whatsapp_campaign_recipients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_automationExecutionId_fkey" FOREIGN KEY ("automationExecutionId") REFERENCES "whatsapp_automation_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "whatsapp_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_message_events" ADD CONSTRAINT "whatsapp_message_events_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "whatsapp_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_webhook_events" ADD CONSTRAINT "whatsapp_webhook_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "whatsapp_phone_numbers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "whatsapp_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_contact_stores" ADD CONSTRAINT "whatsapp_contact_stores_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "whatsapp_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_contact_stores" ADD CONSTRAINT "whatsapp_contact_stores_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_consents" ADD CONSTRAINT "whatsapp_consents_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "whatsapp_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaigns" ADD CONSTRAINT "whatsapp_campaigns_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaigns" ADD CONSTRAINT "whatsapp_campaigns_templateDefinitionId_fkey" FOREIGN KEY ("templateDefinitionId") REFERENCES "whatsapp_template_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_stores" ADD CONSTRAINT "whatsapp_campaign_stores_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "whatsapp_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_stores" ADD CONSTRAINT "whatsapp_campaign_stores_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_stores" ADD CONSTRAINT "whatsapp_campaign_stores_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "store_whatsapp_senders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_recipients" ADD CONSTRAINT "whatsapp_campaign_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "whatsapp_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_recipients" ADD CONSTRAINT "whatsapp_campaign_recipients_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "whatsapp_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_recipients" ADD CONSTRAINT "whatsapp_campaign_recipients_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_recipients" ADD CONSTRAINT "whatsapp_campaign_recipients_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "store_whatsapp_senders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_recipients" ADD CONSTRAINT "whatsapp_campaign_recipients_templateInstanceId_fkey" FOREIGN KEY ("templateInstanceId") REFERENCES "whatsapp_template_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_automations" ADD CONSTRAINT "whatsapp_automations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_automations" ADD CONSTRAINT "whatsapp_automations_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_automations" ADD CONSTRAINT "whatsapp_automations_templateDefinitionId_fkey" FOREIGN KEY ("templateDefinitionId") REFERENCES "whatsapp_template_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_automation_executions" ADD CONSTRAINT "whatsapp_automation_executions_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "whatsapp_automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
