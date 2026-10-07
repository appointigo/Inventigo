import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { z } from "zod";
import type { demoRequestSchema } from "./demoRequestSchema";

type DemoRequestLead = z.infer<typeof demoRequestSchema>;

type DemoDeliveryResult =
  | { ok: true }
  | { ok: false; reason: "unavailable" | "delivery_failed" };

type DemoDeliveryPayload = {
  from: string;
  to: string[];
  reply_to: string;
  subject: string;
  text: string;
};

const E2E_ADAPTER = "capture";
const E2E_CAPTURE_ROOT = path.resolve(process.cwd(), "e2e/test-results");
const TEST_DATABASE_MARKER = /(?:^|[_-])(?:e2e|test)(?:[_-]|$)/i;

function buildPayload(
  lead: DemoRequestLead,
  sender: string,
  recipient: string,
): DemoDeliveryPayload {
  return {
    from: sender,
    to: [recipient],
    reply_to: lead.email,
    subject: `Stockiva demo request — ${lead.businessName}`,
    text: [
      `Name: ${lead.fullName}`,
      `Business: ${lead.businessName}`,
      `Mobile: ${lead.mobile}`,
      `Email: ${lead.email}`,
      `City: ${lead.city}`,
      `Business type: ${lead.businessType}`,
      `Stores: ${lead.storeCount}`,
      `Message: ${lead.message || "—"}`,
    ].join("\n"),
  };
}

function safeE2EAdapterConfiguration() {
  if (!new Set(["test", "development"]).has(process.env.NODE_ENV ?? "")) return null;
  if (process.env.E2E_NEXT_DIST_DIR !== ".next-e2e") return null;
  if (process.env.E2E_ALLOW_DATABASE_RESET !== "true") return null;
  if (process.env.E2E_DEMO_DELIVERY_ADAPTER !== E2E_ADAPTER) return null;
  if (process.env.DATABASE_URL !== process.env.E2E_DATABASE_URL) return null;
  if (process.env.RESEND_API_KEY || process.env.DEMO_REQUEST_RECIPIENT || process.env.DEMO_REQUEST_SENDER) {
    return null;
  }

  try {
    const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
    const baseUrl = new URL(process.env.E2E_BASE_URL ?? "");
    const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ""));
    const capturePath = path.resolve(process.env.E2E_DEMO_DELIVERY_CAPTURE_PATH ?? "");
    const plan = (process.env.E2E_DEMO_DELIVERY_PLAN ?? "")
      .split(",")
      .map((entry) => entry.trim());

    if (!databaseUrl.protocol.startsWith("postgres")) return null;
    if (!TEST_DATABASE_MARKER.test(databaseName)) return null;
    if (!process.env.E2E_DATABASE_NAME || databaseName !== process.env.E2E_DATABASE_NAME) return null;
    if (!["127.0.0.1", "localhost", "::1"].includes(baseUrl.hostname)) return null;
    if (!capturePath.startsWith(`${E2E_CAPTURE_ROOT}${path.sep}`)) return null;
    if (plan.length === 0 || plan.some((result) => !["success", "failure"].includes(result))) {
      return null;
    }

    return { capturePath, plan };
  } catch {
    return null;
  }
}

async function capturedAttemptCount(capturePath: string) {
  try {
    const content = await readFile(capturePath, "utf8");
    return content.split("\n").filter(Boolean).length;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
    throw error;
  }
}

async function deliverWithE2EAdapter(
  lead: DemoRequestLead,
  configuration: NonNullable<ReturnType<typeof safeE2EAdapterConfiguration>>,
): Promise<DemoDeliveryResult> {
  const attempt = (await capturedAttemptCount(configuration.capturePath)) + 1;
  const outcome = configuration.plan[attempt - 1];
  if (!outcome) return { ok: false, reason: "unavailable" };

  const payload = buildPayload(
    lead,
    "stockiva-e2e-sender@stockiva.invalid",
    "stockiva-e2e-recipient@stockiva.invalid",
  );
  await mkdir(path.dirname(configuration.capturePath), { recursive: true });
  await appendFile(
    configuration.capturePath,
    `${JSON.stringify({ attempt, outcome, lead, delivery: payload })}\n`,
    "utf8",
  );

  return outcome === "success"
    ? { ok: true }
    : { ok: false, reason: "delivery_failed" };
}

export async function deliverDemoRequest(lead: DemoRequestLead): Promise<DemoDeliveryResult> {
  if (process.env.E2E_DEMO_DELIVERY_ADAPTER) {
    const configuration = safeE2EAdapterConfiguration();
    if (!configuration) return { ok: false, reason: "unavailable" };
    return deliverWithE2EAdapter(lead, configuration);
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const recipient = process.env.DEMO_REQUEST_RECIPIENT?.trim();
  const sender = process.env.DEMO_REQUEST_SENDER?.trim();
  if (!apiKey || !recipient || !sender) return { ok: false, reason: "unavailable" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(buildPayload(lead, sender, recipient)),
  }).catch(() => null);

  return response?.ok
    ? { ok: true }
    : { ok: false, reason: "delivery_failed" };
}
