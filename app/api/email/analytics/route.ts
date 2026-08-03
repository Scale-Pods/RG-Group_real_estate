import { NextResponse } from 'next/server';
import dns from 'node:dns';
import { getMockEmailDailyAnalytics } from '@/lib/mock-data';

try {
    dns.setDefaultResultOrder('ipv4first');
} catch (e) {
    // ignore
}

export async function GET(request: Request) {
    try {
        const apiKey = process.env.INSTANTLY_API_KEY;

        const { searchParams } = new URL(request.url);
        // Default to last 30 days if not specified
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const start = searchParams.get('start_date') || startDate.toISOString().split('T')[0];
        const end = searchParams.get('end_date') || endDate.toISOString().split('T')[0];

        // No Instantly key configured (demo/mock mode) — return realistic
        // daily analytics instead of a 500 so the dashboard still renders.
        if (!apiKey) {
            return NextResponse.json(getMockEmailDailyAnalytics(start, end));
        }

        // Construct URL with query parameters
        const apiUrl = new URL('https://api.instantly.ai/api/v2/accounts/analytics/daily');
        apiUrl.searchParams.append('start_date', start);
        apiUrl.searchParams.append('end_date', end);

        // We might need to specify emails or campaigns ID if the API requires it. 
        // Based on user prompt, assuming it returns data for all accounts or requires no extra body for GET.
        // However, usually 'daily' analytics might need a campaign_id or similar. 
        // If this endpoint returns aggregate for the account associated with the API key, then fine.
        // If it requires post body, I would change to POST. But user said GET.

        const response = await fetch(apiUrl.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Instantly Analytics API Error:', response.status, errorText);
            return NextResponse.json(
                { error: `Instantly API error: ${response.status}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Filter for specific emails
        const targetEmails = ["info@rggroup.ae", "sales@rggroup.ae"];

        let filteredData = data;
        if (Array.isArray(data)) {
            filteredData = data.filter((item: any) => targetEmails.includes(item.email_account));
        }

        return NextResponse.json(filteredData);

    } catch (error) {
        console.error('Analytics API Route Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
