CREATE INDEX "products_orgId_externalBarcode_idx"
ON "public"."products"("orgId", "externalBarcode");

CREATE INDEX "stock_entries_sizeId_quantity_idx"
ON "public"."stock_entries"("sizeId", "quantity");

CREATE INDEX "stock_entries_storeId_sizeId_quantity_idx"
ON "public"."stock_entries"("storeId", "sizeId", "quantity");

CREATE INDEX "stock_entries_variantSku_idx"
ON "public"."stock_entries"("variantSku");
