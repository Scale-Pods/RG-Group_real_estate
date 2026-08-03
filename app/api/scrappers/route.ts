import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        const webhookUrl = process.env.LEADS_SCRAPPER_WEBHOOK_URL;
        if (!webhookUrl) {
            // Demo/mock mode: no scrapper webhook configured. Acknowledge the
            // request instead of erroring so the UI flow completes cleanly.
            console.warn("LEADS_SCRAPPER_WEBHOOK_URL not set — returning mock acknowledgement");
            return NextResponse.json({
                success: true,
                mock: true,
                message: "Scrapper request accepted (demo mode — no live scrapper connected).",
                queued: Array.isArray(body?.queries) ? body.queries.length : 1,
            });
        }

        console.log("Forwarding scrapper payload to webhook:", webhookUrl);
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Webhook responded with error:", response.status, errorText);
            return NextResponse.json(
                { error: `Webhook response error (${response.status}): ${errorText || response.statusText}` },
                { status: response.status }
            );
        }

        let responseData;
        try {
            responseData = await response.json();
        } catch {
            responseData = { message: "Success (No JSON response)" };
        }

        return NextResponse.json(responseData);
    } catch (error: any) {
        console.error("Error triggering scrapper webhook:", error);
        return NextResponse.json(
            { error: error.message || "Failed to trigger webhook" },
            { status: 500 }
        );
    }
}
