import type { AgingBucket } from "./receivableAging";
export type ReceivableRow = {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  customer: string;
  customerPhone: string | null;
  saleDate: string;
  originalAmount: number;
  paid: number;
  outstanding: number;
  age: number;
  bucket: AgingBucket;
  lastPayment: string | null;
  paymentStatus: string;
};
export type CustomerReceivableRow = {
  customerId: string | null;
  customer: string;
  outstanding: number;
  invoiceCount: number;
  oldestAge: number;
  lastPayment: string | null;
};
export type ReceivablesResponse = {
  generatedAt: string;
  scope: { type: "STORE"; storeId: string; storeName: string };
  outstandingAsOf: string;
  collectionRange: { start: string; end: string; label: string };
  kpis: {
    totalOutstanding: number;
    invoiceCount: number;
    averageAge: number;
    oldestAge: number;
    collectedInPeriod: number;
    averageCollectionLag: number | null;
  };
  buckets: Array<{ bucket: AgingBucket; amount: number; count: number }>;
  items: ReceivableRow[];
  customers: CustomerReceivableRow[];
  total: number;
  page: number;
  pageSize: number;
};
