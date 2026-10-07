import { NextResponse } from "next/server";
import { demoRequestSchema } from "@/modules/marketing/demoRequestSchema";
import { deliverDemoRequest } from "@/modules/marketing/demoRequestDelivery";

export const runtime = "nodejs";

const attempts = new Map<string, number[]>();
function isRateLimited(key: string) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((value) => now - value < 60 * 60 * 1000);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > 5;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip))
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  const parsed = demoRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Please check the highlighted details and try again." },
      { status: 400 }
    );
  if (parsed.data.website)
    return NextResponse.json({ error: "Unable to process this request." }, { status: 400 });
  const delivery = await deliverDemoRequest(parsed.data);
  if (!delivery.ok && delivery.reason === "unavailable")
    return NextResponse.json(
      { error: "Demo requests are not connected yet. Please try again later." },
      { status: 503 }
    );
  if (!delivery.ok)
    return NextResponse.json(
      { error: "We couldn’t send your request. Please try again later." },
      { status: 502 }
    );
  return NextResponse.json({ accepted: true }, { status: 202 });
}
