import { NextResponse } from "next/server";
import { mockTransactions } from "@/lib/mock";

export const dynamic = "force-dynamic";

// Proxies to your Python fraud API if FRAUD_API_URL is set; otherwise returns mock data.
export async function GET() {
  const url = process.env.FRAUD_API_URL;
  if (url) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return NextResponse.json(await res.json());
    } catch {}
  }
  return NextResponse.json(mockTransactions());
}
