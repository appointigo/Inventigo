export type FinanceSummary = {
  generatedAt: string;
  scope: { type: "STORE" | "ORGANIZATION"; storeId: string | null; storeName: string };
  cash: { total: number; unmappedMovementCount: number; accounts: Array<{ id: string; name: string; type: string; storeId: string | null; openingBalance: number; inflows: number; outflows: number; balance: number }> };
  movement: { inflows: number; outflows: number; net: number; from: string; to: string };
  payables: { outstanding: number; dueToday: number; dueNext7Days: number; dueNext30Days: number; overdue: number; count: number; dueDateMissing: number };
  refunds: { outstanding: number; count: number };
  receivables: number;
  obligations: { today: number; next7Days: number; days8To30: number; over30Days: number; dueDateMissing: number; pendingRefunds: number };
  workingCapital: { inventoryValue: number; excessInventoryValue: number; inboundInventoryValue: number; operatingWorkingCapital: number; limitations: string[] };
  coverage: { sevenDay: { obligations: number; buffer: number; gap: number; isCovered: boolean }; thirtyDay: { obligations: number; buffer: number; gap: number; isCovered: boolean } };
  actions: Array<{ code: string; severity: "INFO" | "WARNING" | "CRITICAL"; title: string; reason: string; amount?: number }>;
  completeness: string[];
};
