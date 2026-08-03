import { NextResponse } from 'next/server';
import { getMockLeadsResponse } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

function endOfDay(iso: string): string {
    const d = new Date(iso);
    if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
        d.setUTCHours(23, 59, 59, 999);
    }
    return d.toISOString();
}

/**
 * Leads feed — served from the in-memory mock dataset (lib/mock-data.ts).
 * Response shape is identical to the previous Supabase-backed implementation:
 *   { nr_wf, followup, nurture, master_leads }
 * The from/to query params still filter against each row's "Created At".
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const isAllMode = from === 'all';
    const fromISO = isAllMode ? null : (from || new Date(Date.now() - 90 * 86400000).toISOString());
    const toISO = isAllMode ? null : (to ? endOfDay(to) : endOfDay(new Date().toISOString()));

    try {
        const payload = getMockLeadsResponse(fromISO, toISO);

        return new NextResponse(JSON.stringify(payload), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
        });
    } catch (err: any) {
        console.error('[leads] mock data error:', err);
        return NextResponse.json({ error: 'Fetch failed', detail: err.message }, { status: 500 });
    }
}
