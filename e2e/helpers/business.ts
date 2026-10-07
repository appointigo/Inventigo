import { expect, type APIResponse, type Page } from "@playwright/test";
import { toMinorUnits } from "../../src/modules/analytics/utils/canonicalMetrics";
import { E2E_IDS } from "./database";

export const expectMoney = (actual: unknown, expected: number) => {
  expect(toMinorUnits(actual as number | string)).toBe(toMinorUnits(expected));
};

export const saleItem = (overrides: Record<string, unknown> = {}) => ({
  productId: E2E_IDS.product,
  productName: "E2E Classic Tee",
  sku: "E2E-P0-TEE",
  sizeId: E2E_IDS.size,
  sizeLabel: "M",
  attributes: {},
  quantity: 1,
  unitPrice: 1000,
  ...overrides,
});

export const salePayload = (
  phone: string,
  overrides: Record<string, unknown> = {},
) => ({
  items: [saleItem()],
  paymentMethod: "CASH",
  discountAmount: 0,
  taxAmount: 0,
  amountPaid: 1000,
  customerName: "E Two E Customer",
  customerPhone: phone,
  whatsappInvoice: { enabled: false },
  ...overrides,
});

const isBrowserApiResponse = (
  response: APIResponse | { status: number; body: unknown },
): response is { status: number; body: unknown } => typeof response.status === "number";

export async function expectJson<T = Record<string, unknown>>(
  response: APIResponse | { status: number; body: unknown },
  status: number,
) {
  const browserResponse = isBrowserApiResponse(response);
  const body = (browserResponse ? response.body : await response.json()) as T;
  const actualStatus = browserResponse ? response.status : response.status();
  expect(actualStatus, JSON.stringify(body)).toBe(status);
  return body;
}

export async function apiFetch(
  page: Page,
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    data?: unknown;
    headers?: Record<string, string>;
  } = {},
) {
  if (!page.url().startsWith(process.env.E2E_BASE_URL!)) {
    await page.goto("/dashboard");
  }
  return page.evaluate(
    async ({ requestPath, method, data, headers }) => {
      const response = await fetch(requestPath, {
        method,
        credentials: "same-origin",
        headers: {
          ...(data === undefined ? {} : { "content-type": "application/json" }),
          ...headers,
        },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      const contentType = response.headers.get("content-type") ?? "";
      const disposition = response.headers.get("content-disposition");
      const bytes = new Uint8Array(await response.arrayBuffer());
      const text = new TextDecoder().decode(bytes);
      let body: unknown = text;
      if (contentType.includes("json")) {
        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          // Keep malformed JSON as text for useful assertion diagnostics.
        }
      }
      return {
        status: response.status,
        body,
        contentType,
        disposition,
        byteLength: bytes.byteLength,
      };
    },
    {
      requestPath: path,
      method: options.method ?? "GET",
      data: options.data,
      headers: options.headers,
    },
  );
}

export async function createSale(
  page: Page,
  phone: string,
  overrides: Record<string, unknown> = {},
) {
  const response = await apiFetch(page, "/api/billing", {
    method: "POST",
    data: salePayload(phone, overrides),
    headers: { "x-request-id": `e2e-sale-${phone}` },
  });
  return expectJson<{ id: string; invoiceNumber: string }>(response, 201);
}
