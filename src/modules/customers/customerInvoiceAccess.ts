export function canAccessCustomerInvoice(input: {
  customerId: string;
  saleCustomerId?: string | null;
  saleStoreId: string;
  authorizedStoreId?: string | null;
}) {
  return (
    input.saleCustomerId === input.customerId &&
    (!input.authorizedStoreId || input.saleStoreId === input.authorizedStoreId)
  );
}
