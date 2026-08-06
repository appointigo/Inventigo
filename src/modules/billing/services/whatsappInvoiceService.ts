import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import puppeteer from "puppeteer";
import type { Sale, SaleItem, ReturnTransactionHistory } from "../types";
import { buildPrintableInvoiceHtml } from "./invoiceHtmlBuilder";

export type NotificationDeliveryStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";

export type InvoiceNotificationPayload = {
  orgId: string;
  storeId: string;
  saleId: string;
  invoiceNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  amount: number;
  currency?: string;
  saleDate?: Date | string;
  storeName?: string | null;
  items?: SaleItem[];
  returnTransactions?: ReturnTransactionHistory[];
  paymentMethod?: Sale["paymentMethod"] | null;
  paymentStatus?: Sale["paymentStatus"] | null;
  status?: Sale["status"] | null;
  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  amountPaid?: number;
  amountDue?: number;
  transactionDate?: Date | string | null;
};

type WhatsAppConfig = {
  enabled: boolean;
  provider: string;
  accessToken?: string;
  phoneNumberId?: string;
  templateName: string;
  templateLanguage: string;
  apiUrl: string;
  testMode: boolean;
};

type WhatsAppTemplateTextParameter = {
  type: "text";
  text: string;
};

type WhatsAppTemplateDocumentParameter = {
  type: "document";
  document: {
    id: string;
    filename: string;
  };
};

type WhatsAppTemplateComponent = {
  type: "header" | "body";
  parameters: Array<WhatsAppTemplateTextParameter | WhatsAppTemplateDocumentParameter>;
};

type WhatsAppTemplateMessage = {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: { code: string };
    components: WhatsAppTemplateComponent[];
  };
};

type DeliveryRecord = {
  id: string;
  status: NotificationDeliveryStatus;
  provider: string;
  error?: string | null;
};

export type WhatsAppInvoiceDebugSteps = {
  pdfGenerated: boolean;
  pdfSize?: number;
  mediaUploaded: boolean;
  mediaId?: string;
  messageSent: boolean;
  messageId?: string | null;
  failedStep?: "generatePdf" | "uploadMedia" | "sendMessage" | "validateConfig" | "validateRecipient" | "unknown";
  error?: {
    code?: number;
    message: string;
  };
};

export type WhatsAppInvoiceDebugResult = {
  success: boolean;
  steps: WhatsAppInvoiceDebugSteps;
  deliveryRecord?: DeliveryRecord;
};

type WhatsAppDeliveryExecutionResult = {
  success: boolean;
  steps: WhatsAppInvoiceDebugSteps;
  deliveryRecord: DeliveryRecord;
};

const DEFAULT_TEMPLATE_NAME = "invoice_delivery";
const DEFAULT_API_URL = "https://graph.facebook.com/v22.0";
const DEBUG_RECIPIENT_PHONE = "+917007785178";

const normalizePhone = (value?: string | null): string | null => {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  return `+${digits}`;
};

const parseScopedConfig = (raw: string | undefined, orgId: string, storeId: string): Partial<WhatsAppConfig> | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, any>;
    const scoped = parsed?.[orgId] ?? parsed?.[storeId] ?? parsed?.default ?? null;
    if (!scoped || typeof scoped !== "object") return null;
    return scoped as Partial<WhatsAppConfig>;
  } catch {
    return null;
  }
};

const getWhatsAppConfig = (orgId: string, storeId: string): WhatsAppConfig => {
  const scoped = parseScopedConfig(process.env.WHATSAPP_CONFIG_JSON, orgId, storeId);
  const enabled = (scoped?.enabled ?? process.env.WHATSAPP_ENABLED) === true || ["1", "true", "yes"].includes(String(scoped?.enabled ?? process.env.WHATSAPP_ENABLED ?? "").toLowerCase());
  const phoneNumberId = scoped?.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = scoped?.accessToken ?? process.env.WHATSAPP_ACCESS_TOKEN;
  const provider = scoped?.provider ?? process.env.WHATSAPP_PROVIDER ?? "meta";
  const apiUrl = scoped?.apiUrl ?? process.env.WHATSAPP_API_URL ?? DEFAULT_API_URL;
  const templateName = scoped?.templateName ?? process.env.WHATSAPP_TEMPLATE_NAME ?? DEFAULT_TEMPLATE_NAME;
  const templateLanguage = scoped?.templateLanguage ?? process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "en_US";
  const testMode = (scoped?.testMode ?? process.env.WHATSAPP_TEST_MODE) === true || ["1", "true", "yes"].includes(String(scoped?.testMode ?? process.env.WHATSAPP_TEST_MODE ?? "").toLowerCase());

  console.log(`[WHATSAPP_DEBUG] Configuration loaded. OrgId=${orgId} StoreId=${storeId} Enabled=${enabled} Provider=${provider} ApiUrl=${apiUrl} PhoneNumberId=${phoneNumberId ? "***masked***" : "missing"} TemplateName=${templateName} AccessTokenPresent=${Boolean(accessToken)}`);

  return {
    enabled,
    provider,
    accessToken,
    phoneNumberId,
    templateName,
    templateLanguage,
    apiUrl,
    testMode,
  };
};

const maskToken = (token?: string): string => {
  if (!token) return "missing";
  return `${token.slice(0, 6)}...${token.slice(-6)}`;
};

type TemplateBodyParameterName = "customer_name" | "order_id" | "order_date";

const TEMPLATE_DEFINITIONS: Record<string, {
  headerType: "document";
  bodyParameterNames: TemplateBodyParameterName[];
  fallbackValues: Record<TemplateBodyParameterName, string>;
}> = {
  invoice_delivery: {
    headerType: "document",
    bodyParameterNames: ["customer_name", "order_id", "order_date"],
    fallbackValues: {
      customer_name: "Customer",
      order_id: "N/A",
      order_date: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date()),
    },
  },
};

const formatInvoiceDateForTemplate = (value?: Date | string | null): string => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
  }

  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

const getTemplateBodyParamValues = (payload: InvoiceNotificationPayload): Record<TemplateBodyParameterName, string> => {
  const customerName = payload.customerName?.trim() || "Customer";
  const orderId = payload.invoiceNumber?.trim() || payload.saleId || "N/A";
  const orderDate = formatInvoiceDateForTemplate(payload.transactionDate ?? payload.saleDate ?? new Date());

  return {
    customer_name: customerName,
    order_id: orderId,
    order_date: orderDate,
  };
};

const buildWhatsAppTemplatePayload = (
  recipientPhone: string,
  mediaId: string | null,
  payload: InvoiceNotificationPayload,
  config: WhatsAppConfig
): WhatsAppTemplateMessage => {
  const definition = TEMPLATE_DEFINITIONS[config.templateName];
  if (!definition) {
    throw new Error(`Unsupported WhatsApp template name: ${config.templateName}`);
  }

  if (definition.headerType === "document" && !mediaId) {
    throw new Error(`Template ${config.templateName} requires a document header media id.`);
  }

  const filename = `${payload.invoiceNumber || payload.saleId}.pdf`;
  const components: WhatsAppTemplateComponent[] = [];

  if (mediaId) {
    components.push({
      type: "header",
      parameters: [
        {
          type: "document",
          document: {
            id: mediaId,
            filename,
          },
        },
      ],
    });
  }

  const templateParameterValues = getTemplateBodyParamValues(payload);
  const bodyParameters: Array<WhatsAppTemplateTextParameter & { parameter_name: TemplateBodyParameterName }> = definition.bodyParameterNames.map((parameterName) => {
    const resolvedValue = templateParameterValues[parameterName] || definition.fallbackValues[parameterName] || "N/A";
    return {
      type: "text",
      parameter_name: parameterName,
      text: resolvedValue,
    };
  });

  const expectedBodyParameterCount = definition.bodyParameterNames.length;
  if (bodyParameters.length !== expectedBodyParameterCount) {
    throw new Error(`Template ${config.templateName} expects ${expectedBodyParameterCount} body parameters, but built ${bodyParameters.length}.`);
  }

  const emptyParameters = bodyParameters.filter((param) => !param.text.trim());
  if (emptyParameters.length > 0) {
    throw new Error(`Template ${config.templateName} contains empty body parameters.`);
  }

  console.log(`[WHATSAPP_DEBUG] Template Parameters ${JSON.stringify(templateParameterValues, null, 2)}`);
  console.log(`[WHATSAPP_DEBUG] Final body parameters array: ${JSON.stringify(bodyParameters, null, 2)}`);
  components.push({ type: "body", parameters: bodyParameters });

  const messagePayload: WhatsAppTemplateMessage = {
    messaging_product: "whatsapp",
    to: recipientPhone,
    type: "template",
    template: {
      name: config.templateName,
      language: { code: config.templateLanguage },
      components,
    },
  };

  console.log(`[WHATSAPP_DEBUG] Final WhatsApp template payload: ${JSON.stringify(messagePayload)}`);
  return messagePayload;
};

const executeInvoiceDelivery = async (
  payload: InvoiceNotificationPayload,
  config: WhatsAppConfig,
  recipientPhone: string,
  record: DeliveryRecord
): Promise<WhatsAppDeliveryExecutionResult> => {
  const steps: WhatsAppInvoiceDebugSteps = {
    pdfGenerated: false,
    mediaUploaded: false,
    messageSent: false,
  };

  console.log(`[WHATSAPP_DEBUG] Recipient selected. Phone=${recipientPhone}`);
  console.log(`[WHATSAPP_DEBUG] Phone Number ID loaded. Present=${Boolean(config.phoneNumberId)} Masked=${config.phoneNumberId ? "***masked***" : "missing"}`);
  console.log(`[WHATSAPP_DEBUG] Template selected. Name=${config.templateName} Language=${config.templateLanguage}`);

  const pdfBuffer = await renderPdfBuffer(payload);
  if (!pdfBuffer) {
    const errorMessage = "Invoice PDF generation failed; WhatsApp invoice template requires a document header media.";
    steps.failedStep = "generatePdf";
    steps.error = { message: errorMessage };

    await updateDeliveryRecord(record.id, "FAILED", { error: errorMessage, metadata: { reason: "pdf_generation_failed" } });
    return { success: false, steps, deliveryRecord: { ...record, status: "FAILED", error: errorMessage } };
  }

  steps.pdfGenerated = true;
  steps.pdfSize = pdfBuffer.byteLength;

  console.log(`[WHATSAPP_DEBUG] Media upload started. SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId}`);
  const mediaId = await uploadWhatsappMedia(config, payload, pdfBuffer);
  if (!mediaId) {
    const errorMessage = "WhatsApp media upload failed; invoice template requires uploaded document header media.";
    steps.failedStep = "uploadMedia";
    steps.error = { message: errorMessage };

    await updateDeliveryRecord(record.id, "FAILED", { error: errorMessage, metadata: { reason: "media_upload_failed" } });
    return { success: false, steps, deliveryRecord: { ...record, status: "FAILED", error: errorMessage } };
  }

  steps.mediaUploaded = true;
  steps.mediaId = mediaId;
  console.log(`[WHATSAPP_DEBUG] Media upload completed. SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} MediaId=${mediaId}`);

  if (!config.phoneNumberId) {
    const errorMessage = "WhatsApp Phone Number ID is missing.";
    steps.failedStep = "validateConfig";
    steps.error = { message: errorMessage };
    await updateDeliveryRecord(record.id, "FAILED", { error: errorMessage, metadata: { reason: "missing_phone_number_id" } });
    return { success: false, steps, deliveryRecord: { ...record, status: "FAILED", error: errorMessage } };
  }

  const requestUrl = `${config.apiUrl.replace(/\/$/, "")}/${encodeURIComponent(config.phoneNumberId)}/messages`;
  console.log(`[WHATSAPP_DEBUG] Graph API endpoint prepared. POST ${requestUrl}`);
  const messagePayload = buildWhatsAppTemplatePayload(recipientPhone, mediaId, payload, config);
  console.log(`[WHATSAPP_DEBUG] Message payload created. Payload=${JSON.stringify(messagePayload)}`);
  const response = await sendWhatsappTemplate(requestUrl, messagePayload, config, "document_template");
  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage = responseBody?.error?.message ?? `WhatsApp delivery failed with status ${response.status}`;
    console.error(`[WHATSAPP_DEBUG] Meta response failed. SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} HttpStatus=${response.status} ResponseBody=${JSON.stringify(responseBody)}`);
    steps.failedStep = "sendMessage";
    steps.error = { code: responseBody?.error?.code, message: errorMessage };

    await updateDeliveryRecord(record.id, "FAILED", { error: errorMessage, metadata: { responseBody } });
    return { success: false, steps, deliveryRecord: { ...record, status: "FAILED", error: errorMessage } };
  }

  const messageId = responseBody?.messages?.[0]?.id ?? null;
  steps.messageSent = true;
  steps.messageId = messageId;
  console.log(`[WHATSAPP_DEBUG] Meta response succeeded. SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} HttpStatus=${response.status} MessageId=${messageId ?? "n/a"} ResponseBody=${JSON.stringify(responseBody)}`);

  await updateDeliveryRecord(record.id, "SENT", { metadata: { messageId, mediaId, recipientPhone } });

  return { success: true, steps, deliveryRecord: { ...record, status: "SENT", error: null } };
};

export const sendInvoiceDeliveryDebug = async (payload: InvoiceNotificationPayload): Promise<WhatsAppInvoiceDebugResult> => {
  const config = getWhatsAppConfig(payload.orgId, payload.storeId);

  if (!config.enabled) {
    return {
      success: false,
      steps: {
        pdfGenerated: false,
        mediaUploaded: false,
        messageSent: false,
        failedStep: "validateConfig",
        error: { message: "WhatsApp delivery disabled" },
      },
    };
  }

  if (!config.accessToken) {
    return {
      success: false,
      steps: {
        pdfGenerated: false,
        mediaUploaded: false,
        messageSent: false,
        failedStep: "validateConfig",
        error: { message: "Missing WhatsApp access token" },
      },
    };
  }

  if (!config.phoneNumberId) {
    return {
      success: false,
      steps: {
        pdfGenerated: false,
        mediaUploaded: false,
        messageSent: false,
        failedStep: "validateConfig",
        error: { message: "WhatsApp Phone Number ID is missing." },
      },
    };
  }

  const recipientPhone = DEBUG_RECIPIENT_PHONE;
  console.log(`[WHATSAPP_DEBUG] Debug recipient selected. Phone=${recipientPhone}`);
  const record = await upsertDeliveryRecord(payload, "PENDING", config.provider, { metadata: { phone: recipientPhone, originalPhone: normalizePhone(payload.customerPhone) } });
  const result = await executeInvoiceDelivery(payload, config, recipientPhone, record);

  return {
    success: result.success,
    steps: result.steps,
    deliveryRecord: result.deliveryRecord,
  };
};

const sendWhatsappTemplate = async (
  requestUrl: string,
  messagePayload: WhatsAppTemplateMessage,
  config: WhatsAppConfig,
  messageType: "document_template" | "template"
): Promise<Response> => {
  const startedAt = Date.now();
  const requestConfig = {
    url: requestUrl,
    method: "POST",
    headers: {
      Authorization: `Bearer ${maskToken(config.accessToken)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messagePayload),
  };

  console.log(`[WHATSAPP_DEBUG] Step 8 - Sending template. RequestUrl=${requestUrl} Method=POST MessageType=${messageType}`);
  console.log(`[WHATSAPP_DEBUG] WhatsApp /messages ${messageType} request config: ${JSON.stringify(requestConfig)}`);

  try {
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: requestConfig.body,
    });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const responseBody = await response.clone().json().catch(() => null);
    console.log(`[WHATSAPP_DEBUG] Step 9 - Meta API responded. Status=${response.status} DurationMs=${Date.now() - startedAt} Headers=${JSON.stringify(responseHeaders)} Body=${JSON.stringify(responseBody)}`);

    return response;
  } catch (error) {
    console.error(`[WHATSAPP_DEBUG] Step 9 - Meta API failure. RequestUrl=${requestUrl} Error=${error instanceof Error ? error.message : String(error)} Stack=${error instanceof Error ? error.stack : ""}`);
    throw error;
  }
};

const buildInvoiceHtml = (payload: InvoiceNotificationPayload): string => {
  const normalizedTransactionDate =
    typeof payload.transactionDate === "string"
      ? payload.transactionDate
      : payload.transactionDate instanceof Date
        ? payload.transactionDate.toISOString()
        : typeof payload.saleDate === "string"
          ? payload.saleDate
          : payload.saleDate instanceof Date
            ? payload.saleDate.toISOString()
            : new Date().toISOString();

  return buildPrintableInvoiceHtml(
    {
      invoiceNumber: payload.invoiceNumber,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerEmail: payload.customerEmail,
      status: payload.status ?? "COMPLETED",
      paymentMethod: payload.paymentMethod ?? "CASH",
      paymentStatus: payload.paymentStatus ?? "PAID",
      subtotal: payload.subtotal ?? payload.amount,
      discountAmount: payload.discountAmount ?? 0,
      taxAmount: payload.taxAmount ?? 0,
      total: payload.amount,
      amountPaid: payload.amountPaid ?? payload.amount,
      amountDue: payload.amountDue ?? 0,
      items: payload.items ?? [],
      returnTransactions: payload.returnTransactions ?? [],
      transactionDate: normalizedTransactionDate,
    },
    { storeName: payload.storeName }
  );
};

const renderPdfBuffer = async (payload: InvoiceNotificationPayload): Promise<Buffer | null> => {
  const html = buildInvoiceHtml(payload);
  const startedAt = Date.now();

  console.log(`[WHATSAPP_DEBUG] Step 4 - PDF generation started. SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId}`);

  try {
    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfData = await page.pdf({ format: "A4", printBackground: true });
      const pdfBuffer = Buffer.isBuffer(pdfData) ? pdfData : Buffer.from(pdfData);
      console.log(`[WHATSAPP_DEBUG] Step 5 - PDF generated successfully. SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} PdfSize=${pdfBuffer.byteLength} DurationMs=${Date.now() - startedAt}`);
      return pdfBuffer;
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error(`[WHATSAPP_DEBUG] Step 5 - PDF generation failed. SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} CustomerMobile=${payload.customerPhone ? "***masked***" : "missing"} Error=${error instanceof Error ? error.message : String(error)} Stack=${error instanceof Error ? error.stack : ""} DurationMs=${Date.now() - startedAt}`);
    return null;
  }
};

const uploadWhatsappMedia = async (config: WhatsAppConfig, payload: InvoiceNotificationPayload, pdfBuffer: Buffer): Promise<string | null> => {
  const filename = `${payload.invoiceNumber || payload.saleId}.pdf`;
  const startedAt = Date.now();
  const phoneNumberId = config.phoneNumberId;

  if (!phoneNumberId) {
    console.error(`[WHATSAPP_DEBUG] Step 6 - Media upload aborted. SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} Reason=Missing phoneNumberId`);
    return null;
  }

  console.log(`[WHATSAPP_DEBUG] Step 6 - Media upload started. SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} PhoneNumberId=${phoneNumberId ? "***masked***" : "missing"} Filename=${filename}`);

  try {
    const pdfBytes = new Uint8Array(pdfBuffer);
    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("file", new Blob([pdfBytes], { type: "application/pdf" }), filename);
    formData.append("type", "application/pdf");

    const response = await fetch(`${config.apiUrl.replace(/\/$/, "")}/${encodeURIComponent(phoneNumberId)}/media`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: formData,
    });

    const responseBody = await response.json().catch(() => null);
    if (!response.ok) {
      console.error(`[WHATSAPP_DEBUG] Step 6 - Media upload failed. SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} HttpStatus=${response.status} ResponseBody=${JSON.stringify(responseBody)} DurationMs=${Date.now() - startedAt}`);
      return null;
    }

    const mediaId = responseBody?.id ?? responseBody?.media_id ?? null;
    if (!mediaId) {
      console.error(`[WHATSAPP_DEBUG] Step 6 - Media upload response missing media_id. SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} ResponseBody=${JSON.stringify(responseBody)} DurationMs=${Date.now() - startedAt}`);
      return null;
    }

    console.log(`[WHATSAPP_DEBUG] Step 7 - Media upload completed. SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} MediaId=${mediaId} DurationMs=${Date.now() - startedAt}`);
    return mediaId;
  } catch (error) {
    console.warn(`[WHATSAPP_DEBUG] Step 6 - Media upload error. SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} CustomerMobile=${payload.customerPhone ? "***masked***" : "missing"} Error=${error instanceof Error ? error.message : String(error)} Stack=${error instanceof Error ? error.stack : ""}`);
    return null;
  }
};

const ensureDeliveryTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS notification_deliveries (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      sale_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL,
      provider TEXT NOT NULL,
      error TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_notification_deliveries_org_store_sale
    ON notification_deliveries (org_id, store_id, sale_id)
  `);
};

const upsertDeliveryRecord = async (payload: InvoiceNotificationPayload, status: NotificationDeliveryStatus, provider: string, details?: { error?: string | null; metadata?: Record<string, unknown> }) => {
  const id = randomUUID();
  const startedAt = Date.now();
  try {
    await ensureDeliveryTable();
    console.log(`[WHATSAPP_DEBUG] Step 2 - Delivery record created. SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} Status=${status} Provider=${provider} DeliveryId=${id}`);

    const metadata = JSON.stringify(details?.metadata ?? {});
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO notification_deliveries (id, org_id, store_id, sale_id, channel, status, provider, error, metadata, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      id,
      payload.orgId,
      payload.storeId,
      payload.saleId,
      "WHATSAPP",
      status,
      provider,
      details?.error ?? null,
      metadata
    );

    const result = await prisma.$queryRawUnsafe<Array<{ id: string; status: string; provider: string; error: string | null }>>(
      `SELECT id, status, provider, error FROM notification_deliveries WHERE id = $1`,
      id
    );

    const deliveryRecord = (result[0] ? { id: result[0].id, status: result[0].status as NotificationDeliveryStatus, provider: result[0].provider, error: result[0].error } : { id, status, provider, error: details?.error ?? null }) as DeliveryRecord;
    console.log(`[WHATSAPP_DEBUG] Step 2 - Delivery record saved successfully. SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} Status=${deliveryRecord.status} DeliveryId=${deliveryRecord.id} DurationMs=${Date.now() - startedAt}`);
    return deliveryRecord;
  } catch (error) {
    console.warn(`[WHATSAPP_DEBUG] Step 2 - Delivery record persistence skipped. SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} Status=${status} Error=${error instanceof Error ? error.message : String(error)} Stack=${error instanceof Error ? error.stack : ""} DurationMs=${Date.now() - startedAt}`);
    return { id, status, provider, error: details?.error ?? null } as DeliveryRecord;
  }
};

const updateDeliveryRecord = async (recordId: string, status: NotificationDeliveryStatus, details?: { error?: string | null; metadata?: Record<string, unknown> }) => {
  const startedAt = Date.now();
  try {
    await ensureDeliveryTable();
    const metadata = JSON.stringify(details?.metadata ?? {});
    console.log(`[WHATSAPP_DEBUG] Step 10 - Delivery record update started. RecordId=${recordId} Status=${status}`);
    await prisma.$executeRawUnsafe(
      `
        UPDATE notification_deliveries
        SET status = $2, error = $3, metadata = $4::jsonb, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      recordId,
      status,
      details?.error ?? null,
      metadata
    );
    console.log(`[WHATSAPP_DEBUG] Step 10 - Delivery record update completed. RecordId=${recordId} Status=${status} DurationMs=${Date.now() - startedAt}`);
  } catch (error) {
    console.warn(`[WHATSAPP_DEBUG] Step 10 - Delivery record update skipped. RecordId=${recordId} Status=${status} Error=${error instanceof Error ? error.message : String(error)} Stack=${error instanceof Error ? error.stack : ""} DurationMs=${Date.now() - startedAt}`);
  }
};

export const whatsappInvoiceService = {
  async queueInvoiceDelivery(payload: InvoiceNotificationPayload): Promise<DeliveryRecord> {
    const startedAt = Date.now();
    // TODO: Remove temporary debug logs before production
    console.log(`[WHATSAPP_DEBUG] queueInvoiceDelivery entered. SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} CustomerMobile=${payload.customerPhone ? "***masked***" : "missing"}`);

    const config = getWhatsAppConfig(payload.orgId, payload.storeId);
    if (!config.enabled) {
      // TODO: Remove temporary debug logs before production
      console.log(`[WHATSAPP_DEBUG] Validation failed. Stage=WhatsAppEnabled SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} Reason=WhatsApp delivery disabled`);
      return upsertDeliveryRecord(payload, "SKIPPED", config.provider, { error: "WhatsApp delivery disabled", metadata: { reason: "disabled" } });
    }

    if (!config.accessToken || !config.phoneNumberId) {
      // TODO: Remove temporary debug logs before production
      console.log(`[WHATSAPP_DEBUG] Validation failed. Stage=Credentials SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} Reason=Missing WhatsApp credentials`);
      return upsertDeliveryRecord(payload, "SKIPPED", config.provider, { error: "Missing WhatsApp credentials", metadata: { reason: "missing-config" } });
    }

    const normalizedPhone = normalizePhone(payload.customerPhone);
    const recipientPhone = DEBUG_RECIPIENT_PHONE; // TODO: Remove hardcoded recipient and use customer's mobile number.

    // TODO: Remove temporary debug logs before production
    console.log(`[WHATSAPP_DEBUG] Validation passed. SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} CustomerMobile=${normalizedPhone ?? "missing"} DebugRecipient=${recipientPhone}`);

    const record = await upsertDeliveryRecord(payload, "PENDING", config.provider, { metadata: { phone: recipientPhone, originalPhone: normalizedPhone } });

    try {
      const pdfBuffer = await renderPdfBuffer(payload);
      let mediaId: string | null = null;

      if (!pdfBuffer) {
        const error = "Invoice PDF generation failed; WhatsApp invoice template requires a document header media.";
        console.warn(`[WHATSAPP_DEBUG] ${error} SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId}`);
        await updateDeliveryRecord(record.id, "FAILED", { error, metadata: { reason: "pdf_generation_failed" } });
        return { ...record, status: "FAILED", error };
      }

      mediaId = await uploadWhatsappMedia(config, payload, pdfBuffer);
      if (!mediaId) {
        const error = "WhatsApp media upload failed; invoice template requires uploaded document header media.";
        console.warn(`[WHATSAPP_DEBUG] ${error} SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId}`);
        await updateDeliveryRecord(record.id, "FAILED", { error, metadata: { reason: "media_upload_failed" } });
        return { ...record, status: "FAILED", error };
      }

      const requestUrl = `${config.apiUrl.replace(/\/$/, "")}/${encodeURIComponent(config.phoneNumberId)}/messages`;
      const messagePayload = buildWhatsAppTemplatePayload(recipientPhone, mediaId, payload, config);
      const response = await sendWhatsappTemplate(requestUrl, messagePayload, config, "document_template");

      const responseStartedAt = Date.now();
      const responseBody = await response.clone().json().catch(() => null);
      if (!response.ok) {
        const error = responseBody?.error?.message ?? `WhatsApp delivery failed with status ${response.status}`;
        // TODO: Remove temporary debug logs before production
        console.error(`[WHATSAPP_DEBUG] Meta API response failed. SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} HttpStatus=${response.status} ResponseBody=${JSON.stringify(responseBody)} DurationMs=${Date.now() - responseStartedAt}`);
        await updateDeliveryRecord(record.id, "FAILED", { error, metadata: { responseBody } });
        return { ...record, status: "FAILED", error };
      }

      // TODO: Remove temporary debug logs before production
      console.log(`[WHATSAPP_DEBUG] Meta API response succeeded. SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} HttpStatus=${response.status} MessageId=${responseBody?.messages?.[0]?.id ?? "n/a"} ResponseBody=${JSON.stringify(responseBody)} DurationMs=${Date.now() - responseStartedAt}`);

      await updateDeliveryRecord(record.id, "SENT", { metadata: { messageId: responseBody?.messages?.[0]?.id ?? null, mediaId, recipientPhone } });
      return { ...record, status: "SENT", error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected WhatsApp delivery failure";
      // TODO: Remove temporary debug logs before production
      console.error(`[WHATSAPP_DEBUG] Background task exception. Stage=QueueInvoiceDelivery SaleId=${payload.saleId} InvoiceNumber=${payload.invoiceNumber} OrgId=${payload.orgId} CustomerMobile=${payload.customerPhone ? "***masked***" : "missing"} Error=${message} Stack=${error instanceof Error ? error.stack : ""}`);
      await updateDeliveryRecord(record.id, "FAILED", { error: message, metadata: { reason: "exception" } });
      return { ...record, status: "FAILED", error: message };
    }
  },
};
