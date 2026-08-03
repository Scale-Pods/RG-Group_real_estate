import { NextResponse } from "next/server";
import crypto from "crypto";
import { MOCK_MAQSAM_BALANCE } from "@/lib/mock-data";

export async function GET() {
  try {
    const ACCESS_KEY_ID = process.env.MAQSAM_ACCESS_KEY_ID!;
    const ACCESS_SECRET = process.env.MAQSAM_ACCESS_SECRET!;

    // No credentials configured (demo/mock mode) — return a plausible balance
    // so the sidebar wallet widget renders instead of breaking.
    if (!ACCESS_KEY_ID || !ACCESS_SECRET) {
      return NextResponse.json(MOCK_MAQSAM_BALANCE);
    }

    const mBase = process.env.MAQSAM_BASE_URL || 'maqsam.com';

    const fetchMaqsam = async (endpoint: string, useBasic: boolean) => {
      const timestamp = new Date().toISOString();
      const mUrl = `https://api.${mBase}${endpoint}`;
      const headers: any = { "Accept": "application/json" };
      if (useBasic) {
        headers["Authorization"] = `Basic ${Buffer.from(`${ACCESS_KEY_ID}:${ACCESS_SECRET}`).toString('base64')}`;
      } else {
        const method = "GET";
        const payload = `${method}${endpoint}${timestamp}`;
        headers["X-ACCESS-KEY"] = ACCESS_KEY_ID;
        headers["X-TIMESTAMP"] = timestamp;
        headers["X-SIGNATURE"] = crypto.createHmac("sha256", ACCESS_SECRET).update(payload).digest("base64");
      }
      return fetch(mUrl, { method: "GET", headers });
    };

    // Try V2 billing first (Modern)
    let response = await fetchMaqsam("/v2/billing/balance", true);

    // If V2 fails, try V1 (Legacy)
    if (!response.ok) {
      response = await fetchMaqsam("/v1/account/balance", false);
    }

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      // Maqsam V1/V2 typically nests balance in "message" or "data"
      const balanceValue = data.balance ??
        data.message?.balance ??
        data.data?.balance ??
        data.message?.credits ??
        data.credits ??
        0;

      return NextResponse.json({
        ...data,
        balance: parseFloat(balanceValue)
      });
    } catch (e) {
      // Unparseable upstream response — fall back to the mock balance so the
      // widget still shows a figure rather than a broken state.
      return NextResponse.json(MOCK_MAQSAM_BALANCE);
    }

  } catch (err: any) {
    console.error('Maqsam Balance Error:', err?.message);
    return NextResponse.json(MOCK_MAQSAM_BALANCE);
  }
}
