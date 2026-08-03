import { NextResponse } from 'next/server';
import { MOCK_NR_WF, MOCK_NURTURE } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

function endOfDay(iso: string): string {
    const d = new Date(iso);
    if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
        d.setUTCHours(23, 59, 59, 999);
    }
    return d.toISOString();
}

function inRange(value: any, fromMs: number, toMs: number): boolean {
    if (!value) return false;
    const t = new Date(value).getTime();
    if (isNaN(t)) return false;
    return t >= fromMs && t <= toMs;
}

/**
 * WhatsApp panel feed — served from the mock dataset (lib/mock-data.ts).
 *
 * Mirrors the previous Supabase behaviour: the union of
 *   a) leads with W.P_1 set and whatsapp_last_contacted in range, and
 *   b) leads with an actual conversation (whatsapp_message_count > 0) in range,
 * deduplicated by "Lead ID", tagged with source_loop / _loop_label /
 * wp1_parsed_date.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const fromISO = from || new Date(Date.now() - 90 * 86400000).toISOString();
    const toISO = to ? endOfDay(to) : endOfDay(new Date().toISOString());

    const fromMs = new Date(fromISO).getTime();
    const toMs = new Date(toISO).getTime();

    try {
        // a) W.P_1 set + whatsapp_last_contacted in range
        const nr_wf_wp1 = MOCK_NR_WF.filter(
            r => r['W.P_1'] && inRange(r['whatsapp_last_contacted'], fromMs, toMs)
        );

        // b) conversation-based leads (W.P_1 may be null)
        const nr_wf_conv = MOCK_NR_WF.filter(
            r => (r['whatsapp_message_count'] || 0) > 0 && inRange(r['whatsapp_last_contacted'], fromMs, toMs)
        );

        const nurture = MOCK_NURTURE.filter(
            r => r['W.P_1'] && inRange(r['whatsapp_last_contacted'], fromMs, toMs)
        );

        // Deduplicate nr_wf leads by Lead ID (union of wp1 + conv leads)
        const nr_wf_map = new Map<string, any>();
        for (const r of nr_wf_wp1) nr_wf_map.set(r['Lead ID'], r);
        for (const r of nr_wf_conv) {
            if (!nr_wf_map.has(r['Lead ID'])) nr_wf_map.set(r['Lead ID'], r);
        }
        const nr_wf = Array.from(nr_wf_map.values());

        const parseTs = (val: any): string | null => {
            if (!val) return null;
            const d = new Date(String(val).trim());
            return isNaN(d.getTime()) ? null : d.toISOString();
        };

        const nr_wf_tagged = nr_wf.map(r => ({
            ...r,
            source_loop: 'nr_wf',
            _loop_label: 'Intro Loop',
            wp1_parsed_date: parseTs(r['W.P_1 TS']) ?? parseTs(r['W.P_2 TS']),
        }));

        const nurture_tagged = nurture.map(r => ({
            ...r,
            source_loop: 'nurture',
            _loop_label: 'Nurture Loop',
            wp1_parsed_date: parseTs(r['W.P_1 TS']),
        }));

        // Newest conversation first
        const byLastContacted = (a: any, b: any) =>
            String(b['whatsapp_last_contacted'] || '').localeCompare(String(a['whatsapp_last_contacted'] || ''));

        return new NextResponse(
            JSON.stringify({
                nr_wf: nr_wf_tagged.sort(byLastContacted),
                followup: [],
                nurture: nurture_tagged.sort(byLastContacted),
                owners: [],
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                },
            }
        );
    } catch (err: any) {
        console.error('[whatsapp-leads] mock data error:', err);
        return NextResponse.json({ error: 'Fetch failed', detail: err.message }, { status: 500 });
    }
}
