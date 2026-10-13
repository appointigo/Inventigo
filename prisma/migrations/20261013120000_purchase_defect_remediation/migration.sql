-- Align provisional line validation with the API contract while preserving catalog identity rules.
ALTER TABLE "purchase_order_items"
DROP CONSTRAINT IF EXISTS "purchase_order_items_provisional_classification_check";

ALTER TABLE "purchase_order_items"
ADD CONSTRAINT "purchase_order_items_provisional_description_check"
CHECK (
  "itemKind" = 'EXISTING_PRODUCT'
  OR (
    "productId" IS NULL
    AND "sizeId" IS NULL
    AND length(btrim("productNameSnapshot")) > 0
    AND length(btrim("sizeLabelSnapshot")) > 0
  )
) NOT VALID;

-- Claim state changes are append-only evidence, separate from the current-state aggregate.
CREATE TABLE "supplier_claim_transitions" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "fromStatus" "SupplierClaimStatus" NOT NULL,
  "toStatus" "SupplierClaimStatus" NOT NULL,
  "action" TEXT NOT NULL,
  "evidence" JSONB,
  "notes" TEXT,
  "performedBy" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplier_claim_transitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_claim_transitions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "supplier_claim_transitions_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "supplier_claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "supplier_claim_transitions_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "supplier_claim_transitions_claimId_occurredAt_idx" ON "supplier_claim_transitions"("claimId", "occurredAt");
CREATE INDEX "supplier_claim_transitions_orgId_occurredAt_idx" ON "supplier_claim_transitions"("orgId", "occurredAt");
