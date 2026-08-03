import { NextResponse } from 'next/server';
import { getMockNrWf, getMockNurture } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

export interface WhatsappMetrics {
    totalReachouts: number;
    totalReplies: number;
    replyRate: number;
    dailyTrend: { date: string; reachouts: number; replies: number }[];
    ownerReachouts: number;
    ownerReplies: number;
    introReachouts: number;
    nurtureReachouts: number;
    introReplies: number;
    nurtureReplies: number;
}

function endOfDay(iso: string): string {
    const d = new Date(iso);
    if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
        d.setUTCHours(23, 59, 59, 999);
    }
    return d.toISOString();
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const fromISO = searchParams.get('from') || new Date(Date.now() - 7 * 86400000).toISOString();
    const toISO   = searchParams.get('to') ? endOfDay(searchParams.get('to')!) : endOfDay(new Date().toISOString());

    // ── Computed directly from the mock nr_wf + nurture datasets ────────
    // Mirrors the previous PostgREST filter: "W.P_1" not null, "Created At" in range.
    try {
        const nrWfRows    = getMockNrWf(fromISO, toISO).filter(r => r['W.P_1']);
        const nurtureRows = getMockNurture(fromISO, toISO).filter(r => r['W.P_1']);

        function calcStats(rows: any[]) {
            let reachouts = 0, replies = 0;
            const dailyMap: Record<string, { reachouts: number; replies: number }> = {};
            rows.forEach(r => {
                if (!r['W.P_1']) return;
                reachouts++;
                const wp = r['WP_Replied_track'];
                const hasReplied = !!(wp && String(wp).trim() && !['no', 'none'].includes(String(wp).trim().toLowerCase()));
                if (hasReplied) replies++;
                const dateRef = r['W.P_1 TS'] ?? r['whatsapp_last_contacted'] ?? r['Created At'];
                if (dateRef) {
                    const key = new Date(dateRef).toISOString().slice(0, 10);
                    if (!dailyMap[key]) dailyMap[key] = { reachouts: 0, replies: 0 };
                    dailyMap[key].reachouts++;
                    if (hasReplied) dailyMap[key].replies++;
                }
            });
            return { reachouts, replies, dailyMap };
        }

        const intro   = calcStats(nrWfRows);
        const nurture = calcStats(nurtureRows);

        const totalReachouts = intro.reachouts + nurture.reachouts;
        const totalReplies   = intro.replies   + nurture.replies;

        // Merge daily maps
        const mergedDailyMap: Record<string, { reachouts: number; replies: number }> = {};
        [intro.dailyMap, nurture.dailyMap].forEach(dm => {
            Object.entries(dm).forEach(([date, vals]) => {
                if (!mergedDailyMap[date]) mergedDailyMap[date] = { reachouts: 0, replies: 0 };
                mergedDailyMap[date].reachouts += vals.reachouts;
                mergedDailyMap[date].replies   += vals.replies;
            });
        });
        const dailyTrend = Object.entries(mergedDailyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, v]) => ({ date, ...v }));

        const metrics: WhatsappMetrics = {
            totalReachouts,
            totalReplies,
            replyRate: totalReachouts > 0 ? Math.round((totalReplies / totalReachouts) * 100) : 0,
            dailyTrend,
            ownerReachouts: 0,
            ownerReplies:   0,
            introReachouts:   intro.reachouts,
            nurtureReachouts: nurture.reachouts,
            introReplies:     intro.replies,
            nurtureReplies:   nurture.replies,
        };

        return new NextResponse(JSON.stringify(metrics), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
    } catch (err: any) {
        console.error('[whatsapp-metrics] fallback error:', err);
        return NextResponse.json({ error: 'Fetch failed', detail: err.message }, { status: 500 });
    }
}
