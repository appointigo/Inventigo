import type { CreateSaleInput, SaleFilters, SaleSummary } from "../types";

/**
 * Billing Service — STUB
 *
 * This service defines the interface for the billing module.
 * Implementation will be completed in Phase 8.
 *
 * When implemented, this service will:
 * 1. Create sales with line items in a transaction
 * 2. Call stockService.adjustStock() for each item (type=SALE)
 * 3. Generate invoice numbers
 * 4. Handle refunds (reversing stock via stockService)
 *
 * The key design: stock mutations are delegated to the shared stockService,
 * NOT handled directly here. This ensures consistent stock tracking.
 */
export const billingService = {
  async createSale(_input: CreateSaleInput): Promise<{ id: string; invoiceNumber: string }> {
    // TODO: Phase 8 — Implement with:
    // 1. Generate invoice number (INV-YYYYMMDD-XXXX)
    // 2. Create Sale record
    // 3. Create SaleItem records
    // 4. For each item: stockService.adjustStock({ type: 'SALE', referenceType: 'SALE' })
    // 5. Return sale ID and invoice number
    throw new Error("Billing module not yet implemented. See Phase 8 in PLAN.md.");
  },

  async getSaleById(_id: string) {
    // TODO: Phase 8
    throw new Error("Billing module not yet implemented. See Phase 8 in PLAN.md.");
  },

  async getSales(_filters: SaleFilters): Promise<{ items: SaleSummary[]; total: number }> {
    // TODO: Phase 8
    throw new Error("Billing module not yet implemented. See Phase 8 in PLAN.md.");
  },

  async refundSale(_saleId: string): Promise<void> {
    // TODO: Phase 8 — Implement with:
    // 1. Update Sale status to REFUNDED
    // 2. For each SaleItem: stockService.adjustStock({ type: 'RETURN', referenceType: 'SALE' })
    throw new Error("Billing module not yet implemented. See Phase 8 in PLAN.md.");
  },

  async generateInvoice(_saleId: string): Promise<Buffer> {
    // TODO: Phase 8 — Generate PDF invoice
    throw new Error("Billing module not yet implemented. See Phase 8 in PLAN.md.");
  },
};
