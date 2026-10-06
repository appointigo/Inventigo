import "server-only";
import {
  ExpensePaymentStatus,
  FinancialAccountType,
  FinancialDirection,
  FinancialReferenceType,
  PaymentMethod,
  Prisma,
  RefundLiabilityStatus,
  SupplierPayableStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { accountBalance, cashCoverage, operatingWorkingCapital, payableAging, payableState, refundState, roundMoney } from "./financeRules";
import type { FinanceSummary } from "./types";

type Db = Prisma.TransactionClient;
const money = (value: Prisma.Decimal | number | null | undefined) => Number(value ?? 0);
const positive = (value: unknown, label: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be greater than zero`);
  return roundMoney(parsed);
};
const date = (value: unknown, label: string) => {
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label} is invalid`);
  return parsed;
};

async function assertAccount(db: Db | typeof prisma, orgId: string, accountId: string, storeId?: string | null) {
  const account = await db.financialAccount.findFirst({ where: { id: accountId, orgId, isActive: true } });
  if (!account) throw new Error("Financial account not found");
  if (storeId && account.storeId && account.storeId !== storeId) throw new Error("Financial account is outside the store scope");
  return account;
}

async function mappedAccountId(db: Db, orgId: string, storeId: string, method: PaymentMethod) {
  return (await db.paymentMethodAccountMapping.findUnique({
    where: { orgId_storeId_paymentMethod: { orgId, storeId, paymentMethod: method } },
    select: { accountId: true },
  }))?.accountId ?? null;
}

export async function postSalePayment(db: Db, salePaymentId: string, orgId: string) {
  const payment = await db.salePayment.findFirst({
    where: { id: salePaymentId, sale: { store: { orgId } } },
    include: { sale: { select: { storeId: true, invoiceNumber: true } } },
  });
  if (!payment) throw new Error("Sale payment not found");
  if (money(payment.amount) <= 0) return null;
  const accountId = await mappedAccountId(db, orgId, payment.sale.storeId, payment.method);
  return db.financialTransaction.upsert({
    where: { idempotencyKey: `SALE_PAYMENT:${payment.id}` },
    update: {},
    create: {
      orgId,
      storeId: payment.sale.storeId,
      accountId,
      direction: FinancialDirection.INFLOW,
      amount: payment.amount,
      businessDate: payment.businessDate,
      referenceType: FinancialReferenceType.SALE_PAYMENT,
      referenceId: payment.id,
      idempotencyKey: `SALE_PAYMENT:${payment.id}`,
      category: "CUSTOMER_PAYMENT",
      description: `Payment for invoice ${payment.sale.invoiceNumber}`,
      createdBy: payment.createdBy,
      salePaymentId: payment.id,
      metadata: { paymentMethod: payment.method },
    },
  });
}

export const financeService = {
  async createAccount(orgId: string, userId: string, input: { storeId?: string | null; name: string; type: FinancialAccountType; openingBalance?: number; openingBalanceAsOf?: string | null; currency?: string }) {
    if (!input.name?.trim()) throw new Error("Account name is required");
    if (input.storeId) {
      const store = await prisma.store.findFirst({ where: { id: input.storeId, orgId } });
      if (!store) throw new Error("Store not found");
    }
    return prisma.financialAccount.create({ data: { orgId, storeId: input.storeId ?? null, name: input.name.trim(), type: input.type, openingBalance: input.openingBalance ?? 0, openingBalanceAsOf: input.openingBalanceAsOf ? date(input.openingBalanceAsOf, "Opening balance date") : null, currency: input.currency?.trim() || "INR", createdBy: userId } });
  },

  async mapPaymentMethod(orgId: string, userId: string, input: { storeId: string; paymentMethod: PaymentMethod; accountId: string }, fixedStoreId?: string | null) {
    const store = await prisma.store.findFirst({ where: { id: input.storeId, orgId, isActive: true } });
    if (!store) throw new Error("Store not found");
    const account = await assertAccount(prisma, orgId, input.accountId);
    if (account.storeId && account.storeId !== input.storeId) throw new Error("Financial account is outside the store scope");
    if (fixedStoreId && (input.storeId !== fixedStoreId || account.storeId !== fixedStoreId)) throw new Error("Financial account is outside the store scope");
    return prisma.paymentMethodAccountMapping.upsert({
      where: { orgId_storeId_paymentMethod: { orgId, storeId: input.storeId, paymentMethod: input.paymentMethod } },
      update: { accountId: input.accountId, createdBy: userId },
      create: { orgId, storeId: input.storeId, paymentMethod: input.paymentMethod, accountId: input.accountId, createdBy: userId },
    });
  },

  async getAccounts(orgId: string, storeId: string | null) {
    const accounts = await prisma.financialAccount.findMany({
      where: { orgId, isActive: true, ...(storeId ? { storeId } : {}) },
      include: { store: { select: { name: true } }, paymentMappings: { include: { store: { select: { name: true } } } } },
      orderBy: [{ storeId: "asc" }, { name: "asc" }],
    });
    return accounts.map((row) => ({ ...row, openingBalance: money(row.openingBalance) }));
  },

  async transfer(orgId: string, userId: string, input: { sourceAccountId: string; destinationAccountId: string; amount: number; businessDate: string; idempotencyKey: string; reference?: string; notes?: string }, fixedStoreId?: string | null) {
    if (input.sourceAccountId === input.destinationAccountId) throw new Error("Source and destination accounts must differ");
    if (!input.idempotencyKey?.trim()) throw new Error("Idempotency key is required");
    const amount = positive(input.amount, "Transfer amount");
    const key = `ACCOUNT_TRANSFER:${orgId}:${input.idempotencyKey.trim()}`;
    const existing = await prisma.financialAccountTransfer.findUnique({ where: { idempotencyKey: key } });
    if (existing) return existing;
    return prisma.$transaction(async (tx) => {
      const [source, destination] = await Promise.all([
        assertAccount(tx, orgId, input.sourceAccountId),
        assertAccount(tx, orgId, input.destinationAccountId),
      ]);
      if (fixedStoreId && (source.storeId !== fixedStoreId || destination.storeId !== fixedStoreId)) throw new Error("Financial account is outside the store scope");
      if (source.currency !== destination.currency) throw new Error("Cross-currency transfers are not supported");
      const transfer = await tx.financialAccountTransfer.create({ data: { orgId, storeId: source.storeId ?? destination.storeId, sourceAccountId: source.id, destinationAccountId: destination.id, amount, businessDate: date(input.businessDate, "Business date"), reference: input.reference, notes: input.notes, createdBy: userId, idempotencyKey: key } });
      await tx.financialTransaction.createMany({ data: [
        { orgId, storeId: source.storeId, accountId: source.id, direction: FinancialDirection.OUTFLOW, amount, businessDate: transfer.businessDate, referenceType: FinancialReferenceType.ACCOUNT_TRANSFER, referenceId: transfer.id, idempotencyKey: `ACCOUNT_TRANSFER:${transfer.id}:OUT`, category: "INTERNAL_TRANSFER", description: `Transfer to ${destination.name}`, createdBy: userId, transferId: transfer.id },
        { orgId, storeId: destination.storeId, accountId: destination.id, direction: FinancialDirection.INFLOW, amount, businessDate: transfer.businessDate, referenceType: FinancialReferenceType.ACCOUNT_TRANSFER, referenceId: transfer.id, idempotencyKey: `ACCOUNT_TRANSFER:${transfer.id}:IN`, category: "INTERNAL_TRANSFER", description: `Transfer from ${source.name}`, createdBy: userId, transferId: transfer.id },
      ] });
      return transfer;
    });
  },

  async adjust(orgId: string, userId: string, input: { accountId: string; direction: FinancialDirection; amount: number; businessDate: string; idempotencyKey: string; category?: string; description?: string }, fixedStoreId?: string | null) {
    if (!input.idempotencyKey?.trim()) throw new Error("Idempotency key is required");
    if (!Object.values(FinancialDirection).includes(input.direction)) throw new Error("Invalid adjustment direction");
    const amount = positive(input.amount, "Adjustment amount");
    const account = await assertAccount(prisma, orgId, input.accountId);
    if (fixedStoreId && account.storeId !== fixedStoreId) throw new Error("Financial account is outside the store scope");
    const key = `ADJUSTMENT:${orgId}:${input.idempotencyKey.trim()}`;
    return prisma.financialTransaction.upsert({
      where: { idempotencyKey: key },
      update: {},
      create: {
        orgId,
        storeId: account.storeId,
        accountId: account.id,
        direction: input.direction,
        amount,
        businessDate: date(input.businessDate, "Business date"),
        referenceType: FinancialReferenceType.ADJUSTMENT,
        referenceId: key,
        idempotencyKey: key,
        category: input.category?.trim() || "MANUAL_ADJUSTMENT",
        description: input.description?.trim() || null,
        createdBy: userId,
      },
    });
  },

  async createPayable(orgId: string, userId: string, input: { receiptId: string; supplierInvoiceNumber?: string; invoiceDate: string; dueDate?: string | null; originalAmount: number; notes?: string }, fixedStoreId?: string | null) {
    const amount = positive(input.originalAmount, "Original amount");
    const receipt = await prisma.purchaseOrderReceipt.findFirst({ where: { id: input.receiptId, purchaseOrder: { store: { orgId }, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) } }, include: { purchaseOrder: true } });
    if (!receipt) throw new Error("Received purchase evidence not found");
    return prisma.supplierPayable.create({ data: { orgId, storeId: receipt.purchaseOrder.storeId, supplierId: receipt.purchaseOrder.supplierId, purchaseOrderId: receipt.purchaseOrderId, receiptId: receipt.id, supplierInvoiceNumber: input.supplierInvoiceNumber?.trim() || receipt.supplierInvoiceNumber, invoiceDate: date(input.invoiceDate, "Invoice date"), dueDate: input.dueDate ? date(input.dueDate, "Due date") : null, originalAmount: amount, outstandingAmount: amount, notes: input.notes, createdBy: userId } });
  },

  async paySupplier(orgId: string, userId: string, payableId: string, input: { amount: number; accountId?: string | null; method?: string; paymentDate: string; idempotencyKey: string; reference?: string; notes?: string }, fixedStoreId?: string | null) {
    const amount = positive(input.amount, "Payment amount");
    if (!input.idempotencyKey?.trim()) throw new Error("Idempotency key is required");
    const key = `SUPPLIER_PAYMENT:${orgId}:${input.idempotencyKey.trim()}`;
    const existing = await prisma.supplierPayment.findUnique({ where: { idempotencyKey: key } });
    if (existing) return existing;
    return prisma.$transaction(async (tx) => {
      const payable = await tx.supplierPayable.findFirst({ where: { id: payableId, orgId, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) }, select: { id: true, storeId: true, originalAmount: true, paidAmount: true, outstandingAmount: true, status: true } });
      if (!payable || payable.status === SupplierPayableStatus.CANCELLED) throw new Error("Open supplier payable not found");
      if (input.accountId) await assertAccount(tx, orgId, input.accountId, payable.storeId);
      const claimed = await tx.supplierPayable.updateMany({
        where: { id: payableId, orgId, status: { in: [SupplierPayableStatus.OPEN, SupplierPayableStatus.PARTIALLY_PAID] }, outstandingAmount: { gte: amount } },
        data: { paidAmount: { increment: amount }, outstandingAmount: { decrement: amount } },
      });
      if (claimed.count !== 1) throw new Error("Payment exceeds outstanding amount or payable is closed");
      const updatedPayable = await tx.supplierPayable.findUniqueOrThrow({ where: { id: payableId }, select: { originalAmount: true, paidAmount: true } });
      const state = payableState(money(updatedPayable.originalAmount), money(updatedPayable.paidAmount));
      await tx.supplierPayable.update({ where: { id: payableId }, data: { status: state.status } });
      const payment = await tx.supplierPayment.create({ data: { orgId, storeId: payable.storeId, payableId, accountId: input.accountId ?? null, amount, method: input.method, paymentDate: date(input.paymentDate, "Payment date"), reference: input.reference, notes: input.notes, createdBy: userId, idempotencyKey: key } });
      await tx.financialTransaction.create({ data: { orgId, storeId: payable.storeId, accountId: input.accountId ?? null, direction: FinancialDirection.OUTFLOW, amount, businessDate: payment.paymentDate, referenceType: FinancialReferenceType.SUPPLIER_PAYMENT, referenceId: payment.id, idempotencyKey: `SUPPLIER_PAYMENT:${payment.id}`, category: "SUPPLIER_PAYMENT", description: "Supplier payable payment", createdBy: userId, supplierPaymentId: payment.id } });
      return payment;
    });
  },

  async createRefundLiability(orgId: string, userId: string, returnTransactionId: string, fixedStoreId?: string | null) {
    const transaction = await prisma.returnTransaction.findFirst({ where: { id: returnTransactionId, store: { orgId }, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) } });
    if (!transaction || money(transaction.refundAmount) <= 0) throw new Error("Refund-bearing return not found");
    return prisma.refundLiability.upsert({ where: { returnTransactionId }, update: {}, create: { orgId, storeId: transaction.storeId, returnTransactionId, liabilityAmount: transaction.refundAmount, outstandingAmount: transaction.refundAmount, createdBy: userId } });
  },

  async settleRefund(orgId: string, userId: string, liabilityId: string, input: { amount: number; accountId?: string | null; method?: string; settledAt: string; idempotencyKey: string; reference?: string; notes?: string }, fixedStoreId?: string | null) {
    const amount = positive(input.amount, "Settlement amount");
    if (!input.idempotencyKey?.trim()) throw new Error("Idempotency key is required");
    const key = `REFUND_SETTLEMENT:${orgId}:${input.idempotencyKey.trim()}`;
    const existing = await prisma.refundSettlement.findUnique({ where: { idempotencyKey: key } });
    if (existing) return existing;
    return prisma.$transaction(async (tx) => {
      const liability = await tx.refundLiability.findFirst({ where: { id: liabilityId, orgId, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) } });
      if (!liability || liability.status === RefundLiabilityStatus.CANCELLED) throw new Error("Open refund liability not found");
      if (input.accountId) await assertAccount(tx, orgId, input.accountId, liability.storeId);
      const claimed = await tx.refundLiability.updateMany({
        where: { id: liabilityId, orgId, status: { in: [RefundLiabilityStatus.PENDING, RefundLiabilityStatus.PARTIAL] }, outstandingAmount: { gte: amount } },
        data: { settledAmount: { increment: amount }, outstandingAmount: { decrement: amount } },
      });
      if (claimed.count !== 1) throw new Error("Settlement exceeds pending refund or liability is closed");
      const updatedLiability = await tx.refundLiability.findUniqueOrThrow({ where: { id: liabilityId }, select: { liabilityAmount: true, settledAmount: true } });
      const state = refundState(money(updatedLiability.liabilityAmount), money(updatedLiability.settledAmount));
      await tx.refundLiability.update({ where: { id: liabilityId }, data: { status: state.status } });
      const settlement = await tx.refundSettlement.create({ data: { orgId, storeId: liability.storeId, liabilityId, accountId: input.accountId ?? null, amount, method: input.method, settledAt: date(input.settledAt, "Settlement date"), reference: input.reference, notes: input.notes, createdBy: userId, idempotencyKey: key } });
      await tx.financialTransaction.create({ data: { orgId, storeId: liability.storeId, accountId: input.accountId ?? null, direction: FinancialDirection.OUTFLOW, amount, businessDate: settlement.settledAt, referenceType: FinancialReferenceType.REFUND_SETTLEMENT, referenceId: settlement.id, idempotencyKey: `REFUND_SETTLEMENT:${settlement.id}`, category: "CUSTOMER_REFUND", description: "Customer refund settlement", createdBy: userId, refundSettlementId: settlement.id } });
      return settlement;
    });
  },

  async settleExpense(orgId: string, userId: string, expenseId: string, input: { accountId?: string | null; paidAt: string }, fixedStoreId?: string | null) {
    return prisma.$transaction(async (tx) => {
      const expense = await tx.storeExpense.findFirst({ where: { id: expenseId, orgId, ...(fixedStoreId ? { storeId: fixedStoreId } : {}) } });
      if (!expense || expense.status !== "APPROVED") throw new Error("Approved expense not found");
      if (expense.paymentStatus === ExpensePaymentStatus.PAID) throw new Error("Expense is already paid");
      if (input.accountId) await assertAccount(tx, orgId, input.accountId, expense.storeId);
      const paidAt = date(input.paidAt, "Paid date");
      const updated = await tx.storeExpense.update({ where: { id: expense.id }, data: { paymentStatus: ExpensePaymentStatus.PAID, paidAt, financialAccountId: input.accountId ?? null } });
      await tx.financialTransaction.create({ data: { orgId, storeId: expense.storeId, accountId: input.accountId ?? null, direction: FinancialDirection.OUTFLOW, amount: expense.amount, businessDate: paidAt, referenceType: FinancialReferenceType.EXPENSE, referenceId: expense.id, idempotencyKey: `EXPENSE:${expense.id}`, category: `EXPENSE:${expense.category}`, description: expense.note, createdBy: userId, expenseId: expense.id } });
      return updated;
    });
  },

  async getLedger(orgId: string, storeId: string | null, page = 1, pageSize = 50) {
    const where: Prisma.FinancialTransactionWhereInput = { orgId, ...(storeId ? { storeId } : {}) };
    const safeSize = Math.min(100, Math.max(1, pageSize));
    const [items, total] = await Promise.all([
      prisma.financialTransaction.findMany({ where, include: { account: { select: { name: true, storeId: true } }, store: { select: { name: true } } }, orderBy: [{ businessDate: "desc" }, { postedAt: "desc" }], skip: (Math.max(1, page) - 1) * safeSize, take: safeSize }),
      prisma.financialTransaction.count({ where }),
    ]);
    return { items: items.map((row) => ({ ...row, account: storeId && row.account?.storeId !== storeId ? null : row.account, amount: money(row.amount) })), total, page: Math.max(1, page), pageSize: safeSize };
  },

  async getPayables(orgId: string, storeId: string | null) {
    const now = new Date();
    const rows = await prisma.supplierPayable.findMany({ where: { orgId, ...(storeId ? { storeId } : {}), status: { not: SupplierPayableStatus.CANCELLED } }, include: { supplier: { select: { name: true } }, store: { select: { name: true } } }, orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }] });
    return rows.map((row) => ({ ...row, originalAmount: money(row.originalAmount), paidAmount: money(row.paidAmount), outstandingAmount: money(row.outstandingAmount), agingBucket: row.status === SupplierPayableStatus.PAID ? null : payableAging(row.dueDate, now) }));
  },

  async getRefunds(orgId: string, storeId: string | null) {
    const rows = await prisma.refundLiability.findMany({
      where: { orgId, ...(storeId ? { storeId } : {}) },
      include: { store: { select: { name: true } }, returnTransaction: { select: { referenceNumber: true, businessDate: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({ ...row, liabilityAmount: money(row.liabilityAmount), settledAmount: money(row.settledAmount), outstandingAmount: money(row.outstandingAmount) }));
  },

  async summary(orgId: string, storeId: string | null): Promise<FinanceSummary> {
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const in7 = new Date(dayStart.getTime() + 7 * 86_400_000);
    const in30 = new Date(dayStart.getTime() + 30 * 86_400_000);
    const accountWhere: Prisma.FinancialAccountWhereInput = { orgId, isActive: true, ...(storeId ? { storeId } : {}) };
    const rowWhere = storeId ? { orgId, storeId } : { orgId };
    const [accounts, movement, payables, refunds, receivables, stocks, unmappedCount, store, inboundOrders, excessRecommendations, unknownExpenseCount] = await Promise.all([
      prisma.financialAccount.findMany({ where: accountWhere, orderBy: { name: "asc" } }),
      prisma.financialTransaction.groupBy({ by: ["direction"], where: { ...rowWhere, businessDate: { gte: from, lt: to }, referenceType: { not: FinancialReferenceType.ACCOUNT_TRANSFER } }, _sum: { amount: true } }),
      prisma.supplierPayable.findMany({ where: { ...rowWhere, status: { in: [SupplierPayableStatus.OPEN, SupplierPayableStatus.PARTIALLY_PAID] } }, select: { outstandingAmount: true, dueDate: true } }),
      prisma.refundLiability.findMany({ where: { ...rowWhere, status: { in: [RefundLiabilityStatus.PENDING, RefundLiabilityStatus.PARTIAL] } }, select: { outstandingAmount: true } }),
      prisma.sale.aggregate({ where: { ...(storeId ? { storeId } : { store: { orgId } }), amountDue: { gt: 0 } }, _sum: { amountDue: true } }),
      prisma.stockEntry.findMany({ where: { ...(storeId ? { storeId } : { store: { orgId } }), quantity: { gt: 0 } }, select: { quantity: true, product: { select: { costPrice: true } } } }),
      prisma.financialTransaction.count({ where: { ...rowWhere, ...(storeId ? { OR: [{ accountId: null }, { account: { storeId: null } }, { account: { storeId: { not: storeId } } }] } : { accountId: null }) } }),
      storeId ? prisma.store.findFirst({ where: { id: storeId, orgId }, select: { name: true } }) : Promise.resolve(null),
      prisma.purchaseOrder.findMany({
        where: { ...(storeId ? { storeId } : { store: { orgId } }), status: { in: ["ORDERED", "PARTIALLY_RECEIVED"] } },
        select: { items: { select: { quantity: true, unitCost: true, receiptItems: { select: { quantityAccepted: true } } } } },
      }),
      prisma.replenishmentRecommendation.findMany({
        where: { ...rowWhere, type: { in: ["OVERSTOCK", "MARKDOWN_CANDIDATE"] }, disposition: "OPEN" },
        select: { productId: true, sizeId: true, evidence: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.storeExpense.count({ where: { ...rowWhere, paymentStatus: ExpensePaymentStatus.UNKNOWN } }),
    ]);
    const accountIds = accounts.map((account) => account.id);
    const accountGroups = accountIds.length ? await prisma.financialTransaction.groupBy({ by: ["accountId", "direction"], where: { accountId: { in: accountIds } }, _sum: { amount: true } }) : [];
    const accountRows = accounts.map((account) => {
      const inflows = money(accountGroups.find((g) => g.accountId === account.id && g.direction === FinancialDirection.INFLOW)?._sum.amount);
      const outflows = money(accountGroups.find((g) => g.accountId === account.id && g.direction === FinancialDirection.OUTFLOW)?._sum.amount);
      return { id: account.id, name: account.name, type: account.type, storeId: account.storeId, openingBalance: money(account.openingBalance), inflows, outflows, balance: accountBalance(money(account.openingBalance), inflows, outflows) };
    });
    const available = roundMoney(accountRows.reduce((sum, account) => sum + account.balance, 0));
    const inflows = money(movement.find((row) => row.direction === FinancialDirection.INFLOW)?._sum.amount);
    const outflows = money(movement.find((row) => row.direction === FinancialDirection.OUTFLOW)?._sum.amount);
    const payableOutstanding = roundMoney(payables.reduce((sum, row) => sum + money(row.outstandingAmount), 0));
    const pendingRefunds = roundMoney(refunds.reduce((sum, row) => sum + money(row.outstandingAmount), 0));
    const dueBetween = (end: Date) => payables.filter((row) => row.dueDate && row.dueDate >= dayStart && row.dueDate <= end).reduce((sum, row) => sum + money(row.outstandingAmount), 0);
    const overdue = payables.filter((row) => row.dueDate && row.dueDate < dayStart).reduce((sum, row) => sum + money(row.outstandingAmount), 0);
    const dueToday = payables.filter((row) => row.dueDate?.getTime() === dayStart.getTime()).reduce((sum, row) => sum + money(row.outstandingAmount), 0);
    const sevenObligations = roundMoney(dueBetween(in7) + overdue + pendingRefunds);
    const thirtyObligations = roundMoney(dueBetween(in30) + overdue + pendingRefunds);
    const sevenDay = { obligations: sevenObligations, ...cashCoverage(available, sevenObligations) };
    const thirtyDay = { obligations: thirtyObligations, ...cashCoverage(available, thirtyObligations) };
    const inventoryValue = roundMoney(stocks.reduce((sum, row) => sum + row.quantity * money(row.product.costPrice), 0));
    const inboundInventoryValue = roundMoney(inboundOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => {
      const accepted = item.receiptItems.reduce((received, receipt) => received + receipt.quantityAccepted, 0);
      return itemSum + Math.max(0, item.quantity - accepted) * money(item.unitCost);
    }, 0), 0));
    const latestExcess = new Map<string, number>();
    for (const row of excessRecommendations) {
      const key = `${row.productId}:${row.sizeId}`;
      if (latestExcess.has(key)) continue;
      const evidence = row.evidence && typeof row.evidence === "object" && !Array.isArray(row.evidence) ? row.evidence as Record<string, unknown> : {};
      latestExcess.set(key, Math.max(0, Number(evidence.excessInventoryValue ?? 0) || 0));
    }
    const excessInventoryValue = roundMoney([...latestExcess.values()].reduce((sum, value) => sum + value, 0));
    const receivableValue = money(receivables._sum.amountDue);
    const completeness = [
      ...(unmappedCount ? ["UNMAPPED_PAYMENT_ACCOUNT"] : []),
      ...(payables.some((row) => !row.dueDate) ? ["MISSING_SUPPLIER_DUE_DATE"] : []),
      ...(accounts.some((row) => !row.openingBalanceAsOf) ? ["MISSING_OPENING_BALANCE"] : []),
      "LEGACY_FINANCIAL_HISTORY_NOT_BACKFILLED",
      ...(unknownExpenseCount ? ["UNPAID_EXPENSE_STATUS_UNKNOWN"] : []),
    ];
    const actions: FinanceSummary["actions"] = [];
    if (overdue > 0) actions.push({ code: "SUPPLIER_PAYMENT_OVERDUE", severity: "CRITICAL", title: "Supplier payments overdue", reason: "Received supplier invoices are past their due dates.", amount: roundMoney(overdue) });
    if (dueBetween(in7) > 0) actions.push({ code: "SUPPLIER_PAYMENT_DUE", severity: "WARNING", title: "Supplier payments due within 7 days", reason: "Confirmed supplier liabilities fall due soon.", amount: roundMoney(dueBetween(in7)) });
    if (pendingRefunds > 0) actions.push({ code: "REFUND_PENDING", severity: "WARNING", title: "Customer refunds pending", reason: "Refund liabilities exist without full settlement.", amount: pendingRefunds });
    if (!sevenDay.isCovered) actions.push({ code: "LOW_7_DAY_CASH_COVERAGE", severity: "CRITICAL", title: "7-day obligations exceed available cash", reason: "Posted account balances do not cover known obligations due within 7 days.", amount: sevenDay.gap });
    if (!thirtyDay.isCovered) actions.push({ code: "30_DAY_CASH_GAP", severity: "WARNING", title: "30-day cash gap", reason: "Posted account balances do not cover known obligations due within 30 days.", amount: thirtyDay.gap });
    if (unmappedCount) actions.push({ code: "CASH_ACCOUNT_UNMAPPED", severity: "WARNING", title: "Cash movements need account mapping", reason: `${unmappedCount} posted movement(s) have no configured financial account.` });
    const missingDueDates = payables.filter((row) => !row.dueDate).length;
    if (missingDueDates) actions.push({ code: "MISSING_SUPPLIER_DUE_DATE", severity: "INFO", title: "Supplier due dates missing", reason: `${missingDueDates} payable(s) cannot be placed in an upcoming or overdue bucket.` });
    if (receivableValue > available && receivableValue > 0) actions.push({ code: "HIGH_RECEIVABLES", severity: "INFO", title: "Receivables exceed available cash", reason: "Collection follow-up may improve cash coverage; receivables are not included as cash.", amount: roundMoney(receivableValue) });
    if (completeness.length > 2) actions.push({ code: "FINANCIAL_DATA_INCOMPLETE", severity: "INFO", title: "Financial evidence is incomplete", reason: completeness.join(", ") });
    return {
      generatedAt: now.toISOString(), scope: { type: storeId ? "STORE" : "ORGANIZATION", storeId, storeName: store?.name ?? "Organization" },
      cash: { total: available, unmappedMovementCount: unmappedCount, accounts: accountRows },
      movement: { inflows, outflows, net: roundMoney(inflows - outflows), from: from.toISOString(), to: to.toISOString() },
      payables: { outstanding: payableOutstanding, dueToday: roundMoney(dueToday), dueNext7Days: roundMoney(dueBetween(in7)), dueNext30Days: roundMoney(dueBetween(in30)), overdue: roundMoney(overdue), count: payables.length, dueDateMissing: payables.filter((row) => !row.dueDate).length },
      refunds: { outstanding: pendingRefunds, count: refunds.length }, receivables: roundMoney(receivableValue),
      obligations: {
        today: roundMoney(dueToday),
        next7Days: roundMoney(dueBetween(in7) - dueToday),
        days8To30: roundMoney(dueBetween(in30) - dueBetween(in7)),
        over30Days: roundMoney(payables.filter((row) => row.dueDate && row.dueDate > in30).reduce((sum, row) => sum + money(row.outstandingAmount), 0)),
        dueDateMissing: roundMoney(payables.filter((row) => !row.dueDate).reduce((sum, row) => sum + money(row.outstandingAmount), 0)),
        pendingRefunds,
      },
      workingCapital: { inventoryValue, excessInventoryValue, inboundInventoryValue, operatingWorkingCapital: operatingWorkingCapital(receivableValue, inventoryValue, payableOutstanding), limitations: ["Retail operating snapshot, not a statutory balance sheet.", "Excludes taxes, payroll, loans and unmodeled current assets/liabilities.", "Inventory uses current sellable quantity × current product cost.", "Excess value uses the latest open replenishment evidence per variant; inbound value uses unreceived ordered PO quantities."] },
      coverage: { sevenDay, thirtyDay }, actions, completeness,
    };
  },
};
