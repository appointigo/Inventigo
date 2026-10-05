/**
 * Aggregated payment data returned by the payment-method report API.
 * The server is the sole source of payment normalization and aggregation.
 */
export interface PaymentMethodDistribution {
  name: string;
  value: number;
  count: number;
  percentage: number;
}

export interface PaymentMethodDistributionResponse {
  scope?: { type: "STORE"; storeId: string; storeName: string };
  methods: PaymentMethodDistribution[];
  totalReceived: number;
  amountReceivable: number;
}
