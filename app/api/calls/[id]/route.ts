import { NextRequest, NextResponse } from 'next/server';
import { getMockCallById, getMockLeadNameByPhone } from '@/lib/mock-data';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

const ASSISTANT_ID_TO_PHONE: Record<string, string> = {
    '70f05e16-18f3-4f6e-964a-f47b299c6c1d': '97148714150',
    'b35e3032-7865-4913-ba22-a913b5d4117b': '14782159151',
    '918c25eb-9882-452e-86df-b4851d464852': '447462179309',
    '9ac979c3-a0b3-4af6-bb0d-07ddf9c0d1cd': '447462179309',
    '1ef6ea66-0a75-45f5-b025-1743e048dc90': '14782159151',
    'd91ba874-2522-4d62-adf6-681f2a0bf4fe': '97148714150',
    '4a7e7a31-0bbc-4fde-831e-2489119ee226': '17624000439',
    'e66fe46b-9fe2-4628-a32b-08ced680bc04': '97144396291',
    '4baf3613-ba3d-4860-9ea1-62156686b6f1': '447462179309',
    '66dff692-d2a5-47d4-bbe0-245509dc7404': '14782159151',
};

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const elApiKey = process.env.ELEVENLABS_API_KEY;
        const vapiPrivKey = process.env.VAPI_PRIVATE_KEY;
        const { id } = await context.params;

        // Leads phone -> name map for name resolution (from the mock dataset)
        const leadsMap = getMockLeadNameByPhone();

        const vapiPhoneMap = new Map<string, string>();
        // Manual Overrides (User Provided) for high-fidelity identification
        vapiPhoneMap.set('4a7e7a31-0bbc-4fde-831e-2489119ee226', '17624000439');
        vapiPhoneMap.set('e66fe46b-9fe2-4628-a32b-08ced680bc04', '97144396291');
        vapiPhoneMap.set('4baf3613-ba3d-4860-9ea1-62156686b6f1', '447462179309');
        vapiPhoneMap.set('66dff692-d2a5-47d4-bbe0-245509dc7404', '14782159151');
        vapiPhoneMap.set('d91ba874-2522-4d62-adf6-681f2a0bf4fe', '97148714150');

        if (vapiPrivKey) {
            try {
                const res = await fetch('https://api.vapi.ai/phone-number', {
                    headers: { 'Authorization': `Bearer ${vapiPrivKey}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    (Array.isArray(data) ? data : (data.data || [])).forEach((p: any) => {
                        if (p.id && (p.number || p.phoneNumber)) vapiPhoneMap.set(p.id, String(p.number || p.phoneNumber).replace(/\D/g, ''));
                    });
                }
            } catch (e) { }
        }

        const resolveName = (rawName: string, phone: string) => {
            const cleanPhone = String(phone || "").replace(/\D/g, '');
            if (leadsMap.has(cleanPhone)) return leadsMap.get(cleanPhone);
            if (rawName && /^\d+$/.test(rawName.replace(/\D/g, '')) && rawName.length > 5) return "Guest";
            return rawName || "Guest";
        };

        // Since Vapi is currently the primary provider, try it first for speed
        if (vapiPrivKey) {
            try {
                const vapiRes = await fetch(`https://api.vapi.ai/call/${id}`, {
                    headers: { 'Authorization': `Bearer ${vapiPrivKey}`, 'Content-Type': 'application/json' }
                });

                if (vapiRes.ok) {
                    const data = await vapiRes.json();
                    const customer = data.customer || {};
                    const isInbound = data.type?.toLowerCase().includes('inbound');

                    // GUEST NUMBER ALWAYS COMES FROM CUSTOMER (STRICT)
                    let customerPhone = String(customer.number || "Unknown").replace(/\D/g, '');
                    if (customerPhone.length > 15) customerPhone = "Unknown";

                    // BOT NUMBER ALWAYS COMES FROM PHONENUMBER OBJECT OR CACHE
                    const rawAssistant = data.phoneNumber?.number || vapiPhoneMap.get(data.phoneNumberId) || data.phoneNumberId || "Unknown";
                    let assistantPhone = String(rawAssistant).replace(/\D/g, '');
                    if (assistantPhone.length > 15) assistantPhone = "Internal-Line";

                    return NextResponse.json({
                        ...data,
                        id: data.id,
                        name: resolveName(customer.name, customerPhone),
                        startedAt: data.startedAt,
                        durationSeconds: data.durationSeconds || 0,
                        cost: typeof data.cost === 'number' ? `$${data.cost.toFixed(3)}` : (data.cost || "$0.00"),
                        phoneNumber: assistantPhone, // Bot
                        customer_number: customerPhone, // Guest
                        phone: customerPhone !== "Unknown" ? `+${customerPhone}` : "Unknown", // Add 'phone' for modal compatibility
                        type: isInbound ? "Inbound" : "Outbound",
                        isInbound,
                        source: 'vapi',
                        audio_url: data.recordingUrl
                    });
                }
            } catch (err) { }
        }

        // Fallback to ElevenLabs
        if (elApiKey) {
            try {
                const elResponse = await fetch(`${ELEVENLABS_BASE_URL}/convai/conversations/${id}`, {
                    headers: { 'xi-api-key': elApiKey, 'Content-Type': 'application/json' }
                });

                if (elResponse.ok) {
                    const data = await elResponse.json();
                    const dynamicVars = data.conversation_initiation_client_data?.dynamic_variables || {};
                    const durationSeconds = data.metadata?.call_duration_secs || data.call_duration_secs || data.analysis?.call_duration_secs || 0;
                    const phone = String(data.metadata?.caller_number || dynamicVars.caller_number || "Unknown").replace(/\D/g, '');
                    const rawName = data.metadata?.user_name || data.metadata?.name || dynamicVars.user_name || dynamicVars.name || "Guest";

                    return NextResponse.json({
                        ...data,
                        id: data.conversation_id,
                        name: resolveName(rawName, phone),
                        durationSeconds,
                        phoneNumber: phone,
                        source: 'elevenlabs',
                        audio_url: `${ELEVENLABS_BASE_URL}/convai/conversations/${id}/audio`
                    });
                }
            } catch (err) { }
        }

        // LAST RESORT: Look the call up in the mock archive (lib/mock-data.ts).
        // Mirrors the shape the Supabase archive branch used to construct.
        try {
            const call = getMockCallById(id);
            if (call) {
                const raw = call.raw_data || {};
                const assistantId = call.assistantId || raw.assistantId || null;
                const customerPhone = call.customer_phone;

                return NextResponse.json({
                    ...raw, // Spreads any raw provider fields back out
                    id: call.id,
                    name: resolveName(call.customer_name, customerPhone),
                    transcript: call.transcript || raw.transcript || [],
                    analysis: { ...raw.analysis, summary: call.summary },
                    callSummary: call.summary,
                    startedAt: call.started_at,
                    durationSeconds: call.duration_seconds || raw.duration_seconds || raw.durationSeconds || 0,
                    status: call.status || raw.status || 'unknown',
                    // No real audio exists in mock mode — the player will show no source.
                    recordingUrl: call.recording_url || '',
                    source: call.source === 'elevenlabs' ? 'elevenlabs' : 'vapi',
                    customer_number: customerPhone,
                    phone: customerPhone,
                    phoneNumber: call.assistant_phone || raw.phoneNumber || raw.number || (assistantId ? ASSISTANT_ID_TO_PHONE[assistantId] : null) || "Unknown",
                    assistantId: assistantId,
                    type: call.type === 'inboundPhoneCall' ? 'Inbound' : 'Outbound',
                    isInbound: call.type === 'inboundPhoneCall',
                });
            }
        } catch (e) { }

        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch conversation details" }, { status: 500 });
    }
}
