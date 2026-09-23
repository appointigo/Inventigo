export type InvoiceTemplateVariableContext = {
  customerName: string;
  reference: string;
  storeName: string;
  amount: number;
  transactionDate: string;
};

const supportedNamedVariables = new Set([
  "customer_name",
  "customer",
  "order_id",
  "invoice_number",
  "invoice_no",
  "reference",
  "order_date",
  "invoice_date",
  "date",
  "store_name",
  "total_amount",
  "amount",
]);

export function extractBodyVariableKeys(body: string) {
  return [...new Set([...body.matchAll(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*|\d+)\s*\}\}/g)].map(match => match[1]))];
}

export function hasSupportedInvoiceVariableMapping(body: string) {
  const keys = extractBodyVariableKeys(body);
  if (keys.length > 4) return false;
  const numeric = keys.filter(key => /^\d+$/.test(key)).map(Number).sort((a, b) => a - b);
  if (numeric.length === keys.length) return numeric.every((position, index) => position === index + 1);
  if (numeric.length > 0) return false;
  return keys.every(key => supportedNamedVariables.has(key));
}

export function resolveInvoiceTemplateVariables(
  keys: string[],
  input: InvoiceTemplateVariableContext
) {
  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(input.amount);
  const formattedDate = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(new Date(input.transactionDate));
  const positionalValues = [
    input.customerName,
    input.reference,
    input.storeName,
    formattedAmount,
  ];
  const namedValues: Record<string, string> = {
    customer_name: input.customerName,
    customer: input.customerName,
    order_id: input.reference,
    invoice_number: input.reference,
    invoice_no: input.reference,
    reference: input.reference,
    order_date: formattedDate,
    invoice_date: formattedDate,
    date: formattedDate,
    store_name: input.storeName,
    total_amount: formattedAmount,
    amount: formattedAmount,
  };

  return Object.fromEntries(keys.map(key => {
    const value = /^\d+$/.test(key) ? positionalValues[Number(key) - 1] : namedValues[key];
    if (!value) throw new Error("INVOICE_TEMPLATE_VARIABLES_UNSUPPORTED");
    return [key, value];
  }));
}
