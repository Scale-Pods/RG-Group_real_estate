import { NextResponse } from 'next/server';
import { MOCK_TWILIO_BALANCE } from '@/lib/mock-data';

export async function GET() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    // No credentials configured (demo/mock mode) — return a plausible balance
    // so the sidebar wallet widget renders instead of breaking.
    if (!accountSid || !authToken) {
        return NextResponse.json(MOCK_TWILIO_BALANCE);
    }

    try {
        const [balRes, usageRes] = await Promise.all([
            fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Balance.json`, {
                headers: { Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64') }
            }),
            fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Usage/Records.json?Category=totalprice`, {
                headers: { Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64') }
            })
        ]);

        if (!balRes.ok) {
            const errorData = await balRes.text();
            console.error('Twilio Balance API Error:', errorData);
            return NextResponse.json(MOCK_TWILIO_BALANCE);
        }

        const data = await balRes.json();
        const usageData = await usageRes.json();

        const balance = parseFloat(data.balance);
        const used = usageData.usage_records?.[0]?.price || 0;

        return NextResponse.json({
            balance: balance,
            used: parseFloat(used),
            total_recharge: balance + parseFloat(used),
            currency: data.currency,
            account_sid: data.account_sid
        });
    } catch (error) {
        console.error('Twilio Balance Fetch Exception:', error);
        return NextResponse.json(MOCK_TWILIO_BALANCE);
    }
}
