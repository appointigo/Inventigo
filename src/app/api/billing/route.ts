import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Billing module not implemented yet. See Phase 8." },
    { status: 501 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Billing module not implemented yet. See Phase 8." },
    { status: 501 }
  );
}
