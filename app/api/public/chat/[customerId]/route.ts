import { NextResponse } from 'next/server';
import { consolidateLeads } from "@/lib/leads-utils";
import {
    MOCK_NR_WF,
    MOCK_FOLLOWUP,
    MOCK_NURTURE,
    MOCK_OWNER_DATA,
    MOCK_MASTER_LEADS,
    lookupMockRows,
} from "@/lib/mock-data";

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ customerId: string }> }) {
    const { customerId } = await params;
    const decodedId = decodeURIComponent(customerId);
    const searchVal = decodedId.toLowerCase().trim();
    const searchPhoneRaw = searchVal.replace(/\D/g, '');
    const searchPhone = (searchPhoneRaw.length >= 7 && searchPhoneRaw.length <= 15) ? searchPhoneRaw : '';

    // Handle prefixed IDs (intro-xxx, followup-xxx, nurture-xxx, master-xxx)
    const prefixes = ['intro-', 'followup-', 'nurture-', 'master-', 'owner-'];
    let rawId = searchVal;
    let explicitOwner = false;
    
    if (searchVal.startsWith('owner-')) {
        explicitOwner = true;
    }

    for (const prefix of prefixes) {
        if (searchVal.startsWith(prefix)) {
            rawId = searchVal.slice(prefix.length);
            break;
        }
    }

    try {
        console.log(`Public API: Searching for ${searchVal} (rawId: ${rawId}, phone: ${searchPhone}, explicitOwner: ${explicitOwner})`);

        // Search across all mock datasets.
        // Note: Lead tables use "Lead ID", Owner table uses "id".
        const nr_wf        = lookupMockRows(MOCK_NR_WF, ["Lead ID"], ["Phone"], rawId, searchPhone);
        const followup     = lookupMockRows(MOCK_FOLLOWUP, ["Lead ID"], ["Phone"], rawId, searchPhone);
        const nurture      = lookupMockRows(MOCK_NURTURE, ["Lead ID"], ["Phone"], rawId, searchPhone);
        const owner_data   = lookupMockRows(MOCK_OWNER_DATA, ["id"], ["contactNo"], rawId, searchPhone);
        const master_leads = lookupMockRows(MOCK_MASTER_LEADS, ["Lead ID"], ["Phone", "phone"], rawId, searchPhone);

        console.log(`Public API: Results - nr_wf: ${nr_wf.length}, followup: ${followup.length}, nurture: ${nurture.length}, owner_data: ${owner_data.length}, master_leads: ${master_leads.length}`);

        // Handle results
        const results: any = { lead: null, owner: null };

        if (owner_data.length > 0) {
            console.log("Public API: Found in owner_data");
            results.owner = owner_data[0];
        }

        // Always check leads too
        const consolidated = consolidateLeads({
            nr_wf,
            followup,
            nurture,
            master_leads
        });

        console.log(`Public API: Consolidated leads: ${consolidated.length}`);

        if (consolidated.length > 0) {
            const match = consolidated.find(l => l.id.toLowerCase() === searchVal || l.phone.replace(/\D/g, '') === searchPhone) || consolidated[0];
            console.log(`Public API: Found lead ${match.id}`);
            results.lead = match;
        }

        // If explicit owner was requested, and we found an owner, we can optionally clear the lead 
        // to force the owner tab in the frontend, OR just let the frontend handle it.
        // The frontend currently prefers lead if both exist.

        if (results.lead || results.owner) {
            return NextResponse.json(results);
        }

        console.log("Public API: No match found");
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });


    } catch (error: any) {
        console.error('Public API: Global error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
