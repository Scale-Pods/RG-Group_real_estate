import { NextResponse } from 'next/server';
import { getMockLeadsRawResponse } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

/**
 * Raw (unfiltered, select=*) leads dump — served from the mock dataset.
 * Shape: { nr_wf, followup, nurture }
 */
export async function GET() {
    try {
        return NextResponse.json(getMockLeadsRawResponse());
    } catch (error: any) {
        console.error('Raw fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
