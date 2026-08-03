/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MOCK DATA MODULE — RG Group Dubai
 * ─────────────────────────────────────────────────────────────────────────────
 * The Supabase backend has been removed. This module generates a realistic,
 * deterministic dataset at module-load time so that every API route returns the
 * SAME data for the lifetime of the server process (behaving like a real
 * persistent backend, and avoiding UI flicker between refetches).
 *
 * Row shapes mirror the original Supabase tables exactly, including the quoted /
 * spaced PostgREST column names (`"Lead ID"`, `"W.P_1"`, `"W.P_1 TS"`, ...).
 *
 * No external dependencies — seeded mulberry32 PRNG only.
 */

// ── Seeded PRNG ──────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const SEED = 42;

function makeRng(seed: number = SEED) {
    const rnd = mulberry32(seed);
    return {
        next: rnd,
        int: (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min,
        float: (min: number, max: number, dp = 2) =>
            Number((rnd() * (max - min) + min).toFixed(dp)),
        pick: <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)],
        chance: (p: number) => rnd() < p,
        shuffle: <T,>(arr: T[]): T[] => {
            const a = [...arr];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(rnd() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        },
    };
}

/** Deterministic uuid-v4-shaped string from the rng. */
function makeUuid(rng: ReturnType<typeof makeRng>): string {
    const hex = '0123456789abcdef';
    let out = '';
    for (let i = 0; i < 36; i++) {
        if (i === 8 || i === 13 || i === 18 || i === 23) { out += '-'; continue; }
        if (i === 14) { out += '4'; continue; }
        if (i === 19) { out += hex[(rng.int(0, 15) & 0x3) | 0x8]; continue; }
        out += hex[rng.int(0, 15)];
    }
    return out;
}

// ── Time helpers ─────────────────────────────────────────────────────────────

/**
 * The dataset is anchored to the module-load time so it always looks "recent"
 * relative to whenever the server is started.
 */
const NOW = Date.now();
const DAY = 86400000;

function isoDaysAgo(days: number, hour = 10, minute = 0): string {
    const d = new Date(NOW - days * DAY);
    d.setUTCHours(hour, minute, Math.floor(minute / 2) % 60, 0);
    return d.toISOString();
}

function isoPlusHours(iso: string, hours: number): string {
    return new Date(new Date(iso).getTime() + hours * 3600000).toISOString();
}

export function endOfDayISO(iso: string): string {
    const d = new Date(iso);
    if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
        d.setUTCHours(23, 59, 59, 999);
    }
    return d.toISOString();
}

// ── Reference data (UAE business context) ────────────────────────────────────

const FIRST_NAMES = [
    'Omar', 'Fatima', 'James', 'Priya', 'Khalid', 'Sarah', 'Rajesh', 'Layla',
    'Michael', 'Aisha', 'David', 'Noor', 'Ahmed', 'Emma', 'Sanjay', 'Mariam',
    'Thomas', 'Zainab', 'Hassan', 'Olivia', 'Vikram', 'Huda', 'Daniel', 'Reem',
    'Yusuf', 'Charlotte', 'Arjun', 'Salma', 'Robert', 'Amira', 'Karim', 'Sophia',
    'Imran', 'Hannah', 'Faisal', 'Nadia', 'Christopher', 'Leila', 'Anil', 'Yasmin',
];

const LAST_NAMES = [
    'Al Mansoori', 'Al Suwaidi', 'Hartley', 'Sharma', 'Al Nuaimi', 'Whitfield',
    'Menon', 'Al Blooshi', 'Carter', 'Rahman', 'Okafor', 'Al Marzooqi',
    'Fernandes', 'Al Hashimi', 'Patel', 'Brennan', 'Al Ketbi', 'Nair',
    'Sullivan', 'Al Zaabi', 'Kapoor', 'Al Falasi', 'Bennett', 'Iqbal',
    'Al Shamsi', 'Novak', 'Desai', 'Al Qassimi', 'Grayson', 'Haddad',
];

const COMPANIES = [
    'Emirates Facilities Group', 'Gulf Horizon Trading', 'Deira Logistics LLC',
    'Marina Bay Contracting', 'Al Barsha Industrial', 'JAFZA Metalworks',
    'Sharjah Cold Chain', 'Dubai South Warehousing', 'Palm Hospitality Group',
    'Ras Al Khor Fabrication', 'Abu Dhabi Marine Services', 'Silicon Oasis Datacom',
    'Nakheel Retail Partners', 'Jebel Ali Freight', 'Business Bay Capital',
    'Al Quoz Manufacturing', 'DIFC Advisory Partners', 'Fujairah Port Services',
    'Ajman Textiles Co', 'Sheikh Zayed Developments',
];

const ENQUIRY_CLUSTERS = [
    'Solar Rooftop PV', 'Energy Audit', 'HVAC Retrofit', 'LED Lighting Upgrade',
    'Facility Management', 'Power Factor Correction', 'EV Charging Infrastructure',
    'Building Automation', 'Chiller Optimisation',
];

const LEAD_STATUSES = [
    'New', 'Contacted', 'Qualified', 'Interested', 'Not Interested', 'Converted',
] as const;

const SENTIMENTS = ['positive', 'neutral', 'negative'] as const;

const SENDER_EMAILS = ['info@rggroup.ae', 'sales@rggroup.ae'];

const WA_OUTBOUND_TEMPLATES = [
    'Hi {first}, this is Nadia from RG Group Dubai. We help UAE facilities cut energy spend by 20-35%. Would a short call this week work?',
    'Hello {first} — following up on our note about the RG Group energy audit for {company}. Happy to share a sample report.',
    'Hi {first}, quick one — we just completed a rooftop solar install in Al Quoz with a 3.8 year payback. Worth a 10 min chat for {company}?',
    'Hi {first}, checking in from RG Group Dubai. Are you the right person for facilities and utilities decisions at {company}?',
    'Hello {first}, RG Group here. We have a DEWA-approved retrofit programme opening this quarter — shall I reserve a slot for {company}?',
];

const WA_INBOUND_TEMPLATES = [
    'Thanks for reaching out. Can you send some details by email?',
    'We are already under contract but review annually. Send me the deck.',
    'Interested — what would a rooftop system cost for a 40,000 sq ft warehouse?',
    'Please call me after 4pm, I am in meetings until then.',
    'Not the right person, please contact our facilities manager.',
    'Sounds good, let us set up a call next week.',
    'What is the typical payback period on the retrofit?',
];

const WA_FOLLOWUP_TEMPLATES = [
    'Absolutely — sending the one-pager across now. Which email is best?',
    'Payback is typically 3-4 years in the UAE with current DEWA tariffs.',
    'Noted, I will give you a ring at 4:30pm today.',
    'No problem at all. Could you share their contact and I will reach out directly?',
    'Great — I have availability Tuesday 11am or Wednesday 2pm. Which suits?',
];

const EMAIL_SUBJECTS = [
    'Cutting {company} energy costs by 20-35%',
    'Quick question about {company} facilities spend',
    'RG Group Dubai — DEWA-approved retrofit programme',
    'Sample energy audit for {company}',
    'Following up: rooftop solar for {company}',
    'Re: energy efficiency at {company}',
    'Last note — {company} utilities review',
];

const EMAIL_BODIES = [
    'Hi {first},\n\nRG Group Dubai works with UAE facilities operators to reduce utilities spend through solar PV, HVAC retrofits and smart metering. Our recent projects across Al Quoz and JAFZA delivered 24-38% reductions with sub-4-year paybacks.\n\nWould you be open to a 15 minute call to see whether {company} is a fit?\n\nBest regards,\nNadia Haddad\nRG Group Dubai',
    'Hi {first},\n\nFollowing up on my previous note. I have attached a redacted energy audit we completed for a similar sized facility in Dubai Industrial City — the identified savings came to AED 410,000 per year.\n\nHappy to run the same numbers for {company} at no cost.\n\nBest,\nNadia\nRG Group Dubai',
    'Hi {first},\n\nLast note from me on this. If energy and facilities optimisation is not a priority for {company} this year, no problem — I will close the loop.\n\nIf it is, I can hold a survey slot for the coming month.\n\nRegards,\nNadia Haddad\nRG Group Dubai',
];

// ── Call transcripts, grouped by outcome ─────────────────────────────────────
// Each entry is a full multi-turn AI/User conversation matched to a specific
// call outcome, so the summary, status and transcript always tell one coherent
// story instead of being picked independently.

interface CallScript {
    summary: string;
    transcript: string;
}

const POSITIVE_SCRIPTS: CallScript[] = [
    {
        summary: 'Positive conversation — contact interested in a rooftop solar feasibility study for their warehouse.',
        transcript:
            "AI: Hi, this is Tara calling from RG Group Dubai. Am I speaking with the facilities manager?\n" +
            "User: Yes, speaking. Who's this again?\n" +
            "AI: Tara, from RG Group Dubai — we help UAE facilities cut energy spend through solar PV and retrofit programmes. Do you have two minutes?\n" +
            "User: Sure, go ahead.\n" +
            "AI: Great. We recently completed a rooftop solar install in Al Quoz with a payback under four years. Do you own or lease your warehouse roof space?\n" +
            "User: We own the building, about 40,000 square feet of roof.\n" +
            "AI: Perfect, that's a strong candidate size. Would you be open to a free feasibility study — no cost, just a site visit and a report?\n" +
            "User: Yeah, that sounds useful actually. We've been looking at ways to cut our DEWA bill.\n" +
            "AI: Wonderful. I'll get one of our engineers to call you to schedule the site visit. Is this number the best one to reach you on?\n" +
            "User: Yes, this is my direct line.\n" +
            "AI: Perfect, thank you for your time today.\n" +
            "User: No problem, talk soon.",
    },
    {
        summary: 'Contact asked detailed questions about payback period and DEWA approval timelines. Qualified.',
        transcript:
            "AI: Good afternoon, this is Tara from RG Group Dubai calling about your facility's energy spend.\n" +
            "User: Oh hi, yes I've heard of you — one of our suppliers mentioned RG Group.\n" +
            "AI: That's great to hear. We specialise in HVAC retrofits and LED upgrades for commercial facilities across Dubai. Can I ask what your current biggest utility cost driver is?\n" +
            "User: Honestly it's the chillers, they're original to the building from 2011.\n" +
            "AI: That tracks — older chiller plants are usually 30-40% less efficient than current units. What kind of payback period would make this worth pursuing for you?\n" +
            "User: Anything under five years and I can take it to the board.\n" +
            "AI: We're typically seeing three to four years on chiller optimisation projects in this size range. There's also a DEWA approval process — do you know roughly how long that took last time you did any facility upgrade?\n" +
            "User: About six weeks for our last project.\n" +
            "AI: Good, that lines up with what we usually see. I'll have our technical team put together a proposal with the numbers for your board.\n" +
            "User: Perfect, send it to my email and I'll take a look.\n" +
            "AI: Will do, thanks so much for your time.",
    },
    {
        summary: 'Contact requested pricing for LED retrofit across three sites. Follow up scheduled.',
        transcript:
            "AI: Hello, this is Tara calling from RG Group Dubai regarding energy efficiency for your sites.\n" +
            "User: Yes hi, go ahead.\n" +
            "AI: Thanks. I understand you manage facilities across a few locations — is that right?\n" +
            "User: Yes, three sites, two in Dubai and one in Sharjah.\n" +
            "AI: We could bundle those into one LED retrofit programme, which usually brings the per-site cost down. Would pricing across all three be useful to see?\n" +
            "User: Yes, that would actually help a lot for budgeting next quarter.\n" +
            "AI: I'll get that quote prepared and have someone follow up with you early next week.\n" +
            "User: Sounds good, thank you.\n" +
            "AI: Thank you, have a great day.",
    },
    {
        summary: 'Contact confirmed budget was recently approved and wants to move to a site visit next week.',
        transcript:
            "AI: Hi, this is Tara from RG Group Dubai, calling about the facilities energy programme.\n" +
            "User: Hi Tara, actually good timing — we just got budget approved for this exact thing.\n" +
            "AI: That's excellent news. What's the scope you're looking at?\n" +
            "User: Mainly HVAC and some lighting across our main building.\n" +
            "AI: We can cover both in one assessment. Would next week work for a site visit?\n" +
            "User: Yes, Tuesday or Wednesday morning works for us.\n" +
            "AI: I'll lock in Tuesday morning and send a confirmation with the engineer's details.\n" +
            "User: Perfect, appreciate it.\n" +
            "AI: Thank you, see you then.",
    },
];

const NEUTRAL_SCRIPTS: CallScript[] = [
    {
        summary: 'Contact was in a meeting and asked for a callback later in the week.',
        transcript:
            "AI: Hi, this is Tara calling from RG Group Dubai about your facility's energy costs.\n" +
            "User: Hi, sorry I'm actually heading into a meeting right now.\n" +
            "AI: No problem at all — would later this week work better for a quick call?\n" +
            "User: Thursday afternoon should be fine.\n" +
            "AI: Great, I'll note that down and call back Thursday afternoon.\n" +
            "User: Sounds good, thanks.",
    },
    {
        summary: 'Gatekeeper answered and provided the facilities manager direct line.',
        transcript:
            "AI: Good morning, this is Tara from RG Group Dubai. Could I speak with whoever handles facilities or utilities decisions?\n" +
            "User: That would be our operations manager, but he's not at his desk.\n" +
            "AI: Understood — would you be able to share his direct line or best time to reach him?\n" +
            "User: Sure, try after 2pm, he's usually back from site visits by then.\n" +
            "AI: Perfect, thank you very much for your help.\n" +
            "User: No problem, bye.",
    },
    {
        summary: 'Contact stated they are locked into an existing contract until next year but agreed to a reminder.',
        transcript:
            "AI: Hi, this is Tara calling from RG Group Dubai regarding energy efficiency services.\n" +
            "User: Oh, we actually already have a facilities contractor for this.\n" +
            "AI: Understood — is that a fixed-term contract, or would you be open to comparing quotes at renewal?\n" +
            "User: It runs until around March next year, so not really worth switching now.\n" +
            "AI: That's fair, would it be alright if we followed up closer to your renewal date?\n" +
            "User: Yeah, that's fine, give us a call in February.\n" +
            "AI: Will do, thank you for your time.",
    },
    {
        summary: 'Contact confirmed they handle facilities procurement and requested a proposal by email.',
        transcript:
            "AI: Hello, this is Tara calling from RG Group Dubai. Am I speaking with the right person for facilities procurement?\n" +
            "User: Yes, that's me.\n" +
            "AI: Great — we specialise in energy audits and retrofit programmes for UAE commercial facilities. Would it be alright to send over a proposal by email first?\n" +
            "User: Sure, that works better for me than a call right now.\n" +
            "AI: No problem, I'll get that sent across today.\n" +
            "User: Thanks, I'll take a look when it arrives.",
    },
];

const NEGATIVE_SCRIPTS: CallScript[] = [
    {
        summary: 'Short call, contact declined and asked not to be contacted again.',
        transcript:
            "AI: Hi, this is Tara calling from RG Group Dubai about facility energy savings.\n" +
            "User: No thank you, we're not interested.\n" +
            "AI: Understood, I'll make sure you're not contacted again. Have a good day.\n" +
            "User: Thanks, bye.",
    },
    {
        summary: 'Wrong number, the person reached is not associated with the company.',
        transcript:
            "AI: Hello, is this the facilities team at Marina Bay Contracting?\n" +
            "User: No, sorry, wrong number. I don't know that company.\n" +
            "AI: Apologies for the confusion, thank you and have a good day.\n" +
            "User: No worries, bye.",
    },
    {
        summary: 'Contact was abrupt and ended the call quickly, citing no budget for new projects this year.',
        transcript:
            "AI: Hi, this is Tara from RG Group Dubai calling about energy efficiency for your facility.\n" +
            "User: We don't have budget for anything new this year, sorry.\n" +
            "AI: Understood, thanks for letting me know — have a good day.\n" +
            "User: Bye.",
    },
];

const VOICEMAIL_SCRIPTS: CallScript[] = [
    {
        summary: 'Reached voicemail, no live conversation. Left a short message about the energy audit.',
        transcript:
            "AI: Hi, this is Tara calling from RG Group Dubai. We help UAE facilities reduce energy costs through solar and retrofit programmes. Please give us a call back at your convenience, thank you.",
    },
    {
        summary: 'Reached voicemail. Left a message referencing the recent rooftop solar project in Al Quoz.',
        transcript:
            "AI: Hello, this is Tara with RG Group Dubai. We recently completed a rooftop solar project nearby in Al Quoz with strong results, and wanted to see if a similar assessment could help your facility. Feel free to call us back, thanks so much.",
    },
];

const CALL_SUMMARIES = [
    ...POSITIVE_SCRIPTS.map(s => s.summary),
    ...NEUTRAL_SCRIPTS.map(s => s.summary),
];

// Real-looking assistant IDs already referenced across the codebase.
const ASSISTANT_IDS = [
    '70f05e16-18f3-4f6e-964a-f47b299c6c1d', // UAE bot  -> 97148714150
    'b35e3032-7865-4913-ba22-a913b5d4117b', // US       -> 14782159151
    '918c25eb-9882-452e-86df-b4851d464852', // UK       -> 447462179309
    '9ac979c3-a0b3-4af6-bb0d-07ddf9c0d1cd', // UK       -> 447462179309
    '1ef6ea66-0a75-45f5-b025-1743e048dc90', // US       -> 14782159151
];

const CALL_STATUSES = [
    'ended', 'ended', 'ended', 'customer-ended-call', 'customer-ended-call',
    'no-answer', 'failed', 'voicemail',
] as const;

// ── Primitive generators ─────────────────────────────────────────────────────

function makePhone(rng: ReturnType<typeof makeRng>): string {
    const roll = rng.next();
    if (roll < 0.7) {
        // UAE mobile: +9715XXXXXXXX
        return `+9715${rng.int(0, 9)}${String(rng.int(0, 9999999)).padStart(7, '0')}`;
    }
    if (roll < 0.87) {
        // UK mobile: +447XXXXXXXXX
        return `+447${String(rng.int(0, 999999999)).padStart(9, '0')}`;
    }
    // US: +1XXXXXXXXXX
    return `+1${rng.int(200, 989)}${String(rng.int(0, 9999999)).padStart(7, '0')}`;
}

function slug(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function fill(tpl: string, vars: Record<string, string>): string {
    return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

interface Persona {
    first: string;
    last: string;
    name: string;
    company: string;
    phone: string;
    email: string;
}

function makePersona(rng: ReturnType<typeof makeRng>, i: number): Persona {
    const first = FIRST_NAMES[(i * 7 + rng.int(0, 3)) % FIRST_NAMES.length];
    const last = LAST_NAMES[(i * 11 + rng.int(0, 3)) % LAST_NAMES.length];
    const company = COMPANIES[(i * 5 + rng.int(0, 2)) % COMPANIES.length];
    return {
        first,
        last,
        name: `${first} ${last}`,
        company,
        phone: makePhone(rng),
        email: `${slug(first)}.${slug(last)}@${slug(company).slice(0, 16)}.ae`,
    };
}

/** jsonb-shaped email object, matching what parseJsonbEmailObject() expects. */
function makeEmailJsonb(
    rng: ReturnType<typeof makeRng>,
    p: Persona,
    idx: number,
    timestamp: string,
    sender: string
): Record<string, any> {
    const subject = fill(EMAIL_SUBJECTS[(idx - 1) % EMAIL_SUBJECTS.length], {
        company: p.company,
        first: p.first,
    });
    const body = fill(EMAIL_BODIES[(idx - 1) % EMAIL_BODIES.length], {
        first: p.first,
        company: p.company,
    });
    return {
        subject,
        body_text: body,
        body_html: `<p>${body.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`,
        from: sender,
        to: p.email,
        timestamp,
        status: 'SENT',
    };
}

/** whatsapp_conversation array of {role, text, timestamp}. */
function makeConversation(
    rng: ReturnType<typeof makeRng>,
    p: Persona,
    startIso: string,
    turns: number
): { role: string; text: string; timestamp: string }[] {
    const convo: { role: string; text: string; timestamp: string }[] = [];
    let cursor = startIso;
    for (let t = 0; t < turns; t++) {
        const isAgent = t % 2 === 0;
        const tpl = isAgent
            ? (t === 0
                ? rng.pick(WA_OUTBOUND_TEMPLATES)
                : rng.pick(WA_FOLLOWUP_TEMPLATES))
            : rng.pick(WA_INBOUND_TEMPLATES);
        convo.push({
            role: isAgent ? 'assistant' : 'user',
            text: fill(tpl, { first: p.first, company: p.company }),
            timestamp: cursor,
        });
        cursor = isoPlusHours(cursor, rng.float(0.2, 9, 2));
    }
    return convo;
}

// ═════════════════════════════════════════════════════════════════════════════
// nr_wf (Intro Loop)
// ═════════════════════════════════════════════════════════════════════════════

export function generateMockLeads(count: number, seed = SEED): any[] {
    const rng = makeRng(seed);
    const rows: any[] = [];

    for (let i = 0; i < count; i++) {
        const p = makePersona(rng, i);
        // Spread creation dates across the last 90 days.
        const ageDays = Math.round((i / Math.max(1, count - 1)) * 88) + rng.int(0, 2);
        const createdAt = isoDaysAgo(ageDays, rng.int(6, 18), rng.int(0, 59));
        const sender = rng.pick(SENDER_EMAILS);

        // How far this lead progressed through the sequence.
        const stageRoll = rng.next();
        const emailCount = stageRoll < 0.18 ? 0 : stageRoll < 0.45 ? 1 : stageRoll < 0.75 ? 2 : 3;
        const waCount = stageRoll < 0.12 ? 0 : stageRoll < 0.4 ? 1 : stageRoll < 0.7 ? 2 : rng.int(3, 4);
        const voiceCount = stageRoll < 0.5 ? 0 : stageRoll < 0.8 ? 1 : 2;

        const hasReplied = rng.chance(0.28);
        const hasConversation = waCount > 0 && rng.chance(0.55);
        const bounced = rng.chance(0.07);
        const unsubscribed = rng.chance(0.05);
        const dropped = rng.chance(0.08);

        const row: Record<string, any> = {
            'Lead ID': `RG-NR-${String(1000 + i)}`,
            'Name': p.name,
            'Phone': p.phone,
            'Email': p.email,
            'Country Code': p.phone.startsWith('+971') ? '+971' : p.phone.startsWith('+44') ? '+44' : '+1',
            'Replied': hasReplied ? 'Yes' : 'No',
            'Last Contacted': null,
            'Created At': createdAt,
            'Updated At': createdAt,
            'Sender Email': sender,
            'Dropped': dropped ? 'Yes' : 'No',
            'Dropped_Reason': dropped ? rng.pick(['Invalid number', 'Out of region', 'Duplicate record', 'Do not contact']) : null,
            'Unsubscribed': unsubscribed ? 'Yes' : 'No',
            'Email_Replied': null,
            'Email_Bounced': bounced,
            'Email_Bounced_TS': null,
            'Email_Replied_TS': null,
            'WP_Replied_track': null,
            'Call_replied_track': null,
            'Voice 1': null,
            'Voice 2': null,
            voice_sentiment: null,
            voice_note: null,
            whatsapp_sentiment: null,
            whatsapp_note: null,
            voice_last_contacted: null,
            whatsapp_last_contacted: null,
            curr_lead_status: 'New',
            call_recording_url: '',
            call_lead_status: null,
            whatsapp_conversation: null,
            whatsapp_summary: null,
            whatsapp_message_count: 0,
            whatsapp_first_message_at: null,
            whatsapp_context: null,
            email_reply_summary: null,
            email_reply_reason: null,
            email_interest_score: null,
            email_sentiment: null,
            callback_date: null,
            'enquiry_clusterName': rng.pick(ENQUIRY_CLUSTERS),
            user_email_replied: null,
        };

        // Initialise every W.P_* / TS / Replied / FollowUp column to null so the
        // shape matches the PostgREST select list exactly.
        for (let n = 1; n <= 4; n++) {
            row[`W.P_${n}`] = null;
            row[`W.P_${n} TS`] = null;
        }
        for (let n = 1; n <= 10; n++) {
            row[`W.P_Replied ${n}`] = null;
            row[`W.P_FollowUp ${n}`] = null;
            row[`W.P_FollowUp_TS${n}`] = null;
        }
        for (let n = 1; n <= 3; n++) {
            row[`Email_${n}`] = null;
            row[`Email ${n}_TS`] = null;
        }

        let lastContact = createdAt;

        // ── Emails ────────────────────────────────────────────────────────────
        for (let n = 1; n <= emailCount; n++) {
            const ts = isoPlusHours(createdAt, (n - 1) * 72 + rng.float(1, 20, 1));
            row[`Email_${n}`] = makeEmailJsonb(rng, p, n, ts, sender);
            row[`Email ${n}_TS`] = `SENT | ${ts}`;
            lastContact = ts;
        }
        if (emailCount > 0 && bounced) {
            row['Email_Bounced_TS'] = isoPlusHours(row['Email 1_TS'].split('|')[1].trim(), 0.3);
        }
        if (emailCount > 0 && rng.chance(0.22)) {
            const replyTs = isoPlusHours(lastContact, rng.float(2, 40, 1));
            row['Email_Replied'] = 'Yes';
            row['Email_Replied_TS'] = replyTs;
            row['user_email_replied'] = 'Yes';
            row['email_reply_summary'] = rng.pick([
                'Prospect asked for a detailed proposal and site survey availability.',
                'Prospect is under an existing contract but open to reviewing next quarter.',
                'Prospect forwarded the enquiry to their facilities manager.',
                'Prospect requested pricing for a rooftop PV system.',
                'Prospect declined politely and asked to be removed from the list.',
            ]);
            row['email_reply_reason'] = rng.pick([
                'Requested pricing', 'Requested proposal', 'Not the decision maker',
                'Timing not right', 'Already contracted', 'Interested in site survey',
            ]);
            row['email_sentiment'] = rng.pick(SENTIMENTS);
            row['email_interest_score'] = rng.int(1, 10);
        }

        // ── WhatsApp campaign messages ────────────────────────────────────────
        for (let n = 1; n <= waCount; n++) {
            const ts = isoPlusHours(createdAt, 6 + (n - 1) * 48 + rng.float(0, 12, 1));
            row[`W.P_${n}`] = fill(WA_OUTBOUND_TEMPLATES[(n - 1) % WA_OUTBOUND_TEMPLATES.length], {
                first: p.first,
                company: p.company,
            });
            row[`W.P_${n} TS`] = ts;
            row['whatsapp_last_contacted'] = ts;
            lastContact = ts;
        }

        if (waCount > 0) {
            const replyRoll = rng.next();
            if (replyRoll < 0.34) {
                const replies = rng.int(1, Math.min(4, waCount + 1));
                for (let n = 1; n <= replies; n++) {
                    row[`W.P_Replied ${n}`] = fill(rng.pick(WA_INBOUND_TEMPLATES), {
                        first: p.first,
                        company: p.company,
                    });
                    row[`W.P_FollowUp ${n}`] = fill(rng.pick(WA_FOLLOWUP_TEMPLATES), {
                        first: p.first,
                        company: p.company,
                    });
                    row[`W.P_FollowUp_TS${n}`] = isoPlusHours(row[`W.P_${Math.min(n, waCount)} TS`], rng.float(1, 26, 1));
                }
                row['WP_Replied_track'] = 'Yes';
                row['whatsapp_sentiment'] = rng.pick(SENTIMENTS);
                row['whatsapp_note'] = rng.pick([
                    'Asked for a proposal via email.',
                    'Requested a callback in the afternoon.',
                    'Referred us to the facilities manager.',
                    'Interested in rooftop solar sizing for their warehouse.',
                    'Politely declined, existing supplier in place.',
                ]);
            } else {
                row['WP_Replied_track'] = 'No';
            }
        }

        // ── Conversation thread (WhatsApp inbox view) ─────────────────────────
        if (hasConversation) {
            const startIso = row['W.P_1 TS'] || createdAt;
            const turns = rng.int(2, 9);
            const convo = makeConversation(rng, p, startIso, turns);
            row['whatsapp_conversation'] = convo;
            row['whatsapp_message_count'] = convo.length;
            row['whatsapp_first_message_at'] = convo[0].timestamp;
            row['whatsapp_last_contacted'] = convo[convo.length - 1].timestamp;
            row['whatsapp_summary'] = rng.pick([
                `${p.first} from ${p.company} responded to the intro message and asked for pricing on an energy retrofit.`,
                `${p.first} confirmed they handle facilities decisions and requested a call this week.`,
                `${p.first} said they are mid-contract but asked us to follow up at renewal.`,
                `${p.first} redirected us to their operations lead and shared the contact details.`,
                `${p.first} declined; not exploring energy projects this financial year.`,
            ]);
            row['whatsapp_context'] = rng.pick(ENQUIRY_CLUSTERS);
            if (!row['whatsapp_sentiment']) row['whatsapp_sentiment'] = rng.pick(SENTIMENTS);
            lastContact = row['whatsapp_last_contacted'];
        }

        // ── Voice calls ───────────────────────────────────────────────────────
        let lastVoiceScript: CallScript | null = null;
        let lastVoiceDuration = 0;
        for (let n = 1; n <= voiceCount; n++) {
            const ts = isoPlusHours(createdAt, 24 + (n - 1) * 60 + rng.float(0, 10, 1));
            const outcomeRoll = rng.next();
            const pool = outcomeRoll < 0.4 ? POSITIVE_SCRIPTS : outcomeRoll < 0.75 ? NEUTRAL_SCRIPTS : NEGATIVE_SCRIPTS;
            lastVoiceScript = rng.pick(pool);
            lastVoiceDuration = rng.int(25, 240);
            row[`Voice ${n}`] = lastVoiceScript.summary;
            row['voice_last_contacted'] = ts;
            lastContact = ts;
        }
        if (voiceCount > 0 && lastVoiceScript) {
            row['voice_sentiment'] = rng.pick(SENTIMENTS);
            row['voice_note'] = lastVoiceScript.summary;
            row['call_lead_status'] = rng.pick(['Answered', 'No Answer', 'Voicemail', 'Callback Requested']);
            row['Call_replied_track'] = rng.chance(0.4) ? 'Yes' : 'No';
            row['call_recording_url'] = pickRecordingFor(lastVoiceDuration, rng, false);
            if (rng.chance(0.3)) {
                row['callback_date'] = isoPlusHours(ts_safe(lastContact), rng.int(24, 168));
            }
        }

        // ── Derived status fields ─────────────────────────────────────────────
        row['Last Contacted'] = lastContact;
        row['Updated At'] = lastContact;

        const engaged =
            row['WP_Replied_track'] === 'Yes' ||
            row['Email_Replied'] === 'Yes' ||
            !!row['whatsapp_conversation'];

        if (dropped || unsubscribed) {
            row['curr_lead_status'] = 'Not Interested';
        } else if (engaged) {
            row['curr_lead_status'] = rng.pick(['Contacted', 'Qualified', 'Interested', 'Converted', 'Not Interested']);
        } else if (emailCount + waCount + voiceCount > 0) {
            row['curr_lead_status'] = 'Contacted';
        } else {
            row['curr_lead_status'] = 'New';
        }

        row['Replied'] = engaged ? 'Yes' : 'No';

        rows.push(row);
    }

    // Newest first, mirroring `order="Created At".desc`
    return rows.sort((a, b) => String(b['Created At']).localeCompare(String(a['Created At'])));
}

function ts_safe(v: any): string {
    const d = new Date(v);
    return isNaN(d.getTime()) ? new Date(NOW).toISOString() : d.toISOString();
}

// ═════════════════════════════════════════════════════════════════════════════
// nurture (Nurture Loop)
// ═════════════════════════════════════════════════════════════════════════════

export function generateMockNurtureLeads(count: number, seed = SEED + 1): any[] {
    const rng = makeRng(seed);
    const rows: any[] = [];

    for (let i = 0; i < count; i++) {
        const p = makePersona(rng, i + 100);
        const ageDays = Math.round((i / Math.max(1, count - 1)) * 85) + rng.int(0, 3);
        const createdAt = isoDaysAgo(ageDays, rng.int(7, 17), rng.int(0, 59));
        const sender = rng.pick(SENDER_EMAILS);

        const stageRoll = rng.next();
        const emailCount = stageRoll < 0.2 ? rng.int(1, 3) : stageRoll < 0.6 ? rng.int(3, 6) : rng.int(6, 9);
        const waCount = stageRoll < 0.2 ? rng.int(1, 3) : stageRoll < 0.6 ? rng.int(3, 7) : rng.int(7, 12);
        const weekReached = stageRoll < 0.3 ? 1 : stageRoll < 0.7 ? 2 : 3;

        const row: Record<string, any> = {
            'Lead ID': `RG-NU-${String(2000 + i)}`,
            'Name': p.name,
            'Phone': p.phone,
            'Email': p.email,
            'Country Code': p.phone.startsWith('+971') ? '+971' : p.phone.startsWith('+44') ? '+44' : '+1',
            'Replied': 'No',
            'Last Contacted': null,
            'Created At': createdAt,
            'Updated At': createdAt,
            'Senders email': sender,
            'Dropped': rng.chance(0.06) ? 'Yes' : 'No',
            'Dropped_Reason': null,
            'Unsubscribed': rng.chance(0.05) ? 'Yes' : 'No',
            'Email_Replied': null,
            'Email_Bounced': rng.chance(0.06),
            'Email_Bounced_TS': null,
            'Email_Replied_TS': null,
            'Week 1': null,
            'Week 2': null,
            'Week 3': null,
            'WP_Replied_track': null,
            'Call_replied_track': null,
            voice_sentiment: null,
            voice_note: null,
            whatsapp_sentiment: null,
            whatsapp_note: null,
            voice_last_contacted: null,
            whatsapp_last_contacted: null,
            curr_lead_status: 'Contacted',
            'W1_voice1': null,
            'W1_voice2': null,
            'W2_voice1': null,
            'W2_voice2': null,
            'W4_voice1': null,
            'W4_voice2': null,
        };

        for (let n = 1; n <= 12; n++) {
            row[`W.P_${n}`] = null;
            row[`W.P_${n} TS`] = null;
        }
        for (let n = 1; n <= 10; n++) {
            row[`W.P_Replied ${n}`] = null;
            row[`W.P_FollowUp ${n}`] = null;
            row[`W.P_FollowUp_TS${n}`] = null;
        }
        for (let n = 1; n <= 9; n++) row[`Email_${n}`] = null;

        let lastContact = createdAt;

        for (let n = 1; n <= emailCount; n++) {
            const ts = isoPlusHours(createdAt, (n - 1) * 96 + rng.float(1, 22, 1));
            row[`Email_${n}`] = makeEmailJsonb(rng, p, ((n - 1) % 3) + 1, ts, sender);
            lastContact = ts;
        }
        if (emailCount > 0 && rng.chance(0.18)) {
            row['Email_Replied'] = 'Yes';
            row['Email_Replied_TS'] = isoPlusHours(lastContact, rng.float(2, 48, 1));
        }
        if (row['Email_Bounced']) {
            row['Email_Bounced_TS'] = isoPlusHours(createdAt, rng.float(1, 5, 1));
        }

        for (let n = 1; n <= waCount; n++) {
            const ts = isoPlusHours(createdAt, 12 + (n - 1) * 60 + rng.float(0, 14, 1));
            row[`W.P_${n}`] = fill(WA_OUTBOUND_TEMPLATES[(n - 1) % WA_OUTBOUND_TEMPLATES.length], {
                first: p.first,
                company: p.company,
            });
            row[`W.P_${n} TS`] = ts;
            row['whatsapp_last_contacted'] = ts;
            lastContact = ts;
        }

        if (waCount > 0 && rng.chance(0.3)) {
            const replies = rng.int(1, Math.min(5, waCount));
            for (let n = 1; n <= replies; n++) {
                row[`W.P_Replied ${n}`] = fill(rng.pick(WA_INBOUND_TEMPLATES), { first: p.first, company: p.company });
                row[`W.P_FollowUp ${n}`] = fill(rng.pick(WA_FOLLOWUP_TEMPLATES), { first: p.first, company: p.company });
                row[`W.P_FollowUp_TS${n}`] = isoPlusHours(row[`W.P_${Math.min(n, waCount)} TS`], rng.float(1, 30, 1));
            }
            row['WP_Replied_track'] = 'Yes';
            row['whatsapp_sentiment'] = rng.pick(SENTIMENTS);
            row['whatsapp_note'] = rng.pick([
                'Re-engaged after three months, asked for updated pricing.',
                'Requested the nurture sequence be paused until Q3.',
                'Confirmed budget approval cycle starts next quarter.',
            ]);
        } else if (waCount > 0) {
            row['WP_Replied_track'] = 'No';
        }

        // Nurture voice attempts
        const voiceKeys = ['W1_voice1', 'W1_voice2', 'W2_voice1', 'W2_voice2', 'W4_voice1', 'W4_voice2'];
        const voiceAttempts = stageRoll < 0.3 ? rng.int(0, 1) : stageRoll < 0.7 ? rng.int(1, 3) : rng.int(3, 6);
        for (let n = 0; n < voiceAttempts; n++) {
            row[voiceKeys[n]] = rng.pick(CALL_SUMMARIES);
            row['voice_last_contacted'] = isoPlusHours(createdAt, 48 + n * 96 + rng.float(0, 10, 1));
        }
        if (voiceAttempts > 0) {
            row['voice_sentiment'] = rng.pick(SENTIMENTS);
            row['voice_note'] = rng.pick(CALL_SUMMARIES);
            row['Call_replied_track'] = rng.chance(0.35) ? 'Yes' : 'No';
        }

        if (weekReached >= 1) row['Week 1'] = 'Completed';
        if (weekReached >= 2) row['Week 2'] = 'Completed';
        if (weekReached >= 3) row['Week 3'] = 'Completed';

        row['Last Contacted'] = lastContact;
        row['Updated At'] = lastContact;

        const engaged = row['WP_Replied_track'] === 'Yes' || row['Email_Replied'] === 'Yes';
        row['Replied'] = engaged ? 'Yes' : 'No';
        row['curr_lead_status'] = engaged
            ? rng.pick(['Qualified', 'Interested', 'Converted', 'Contacted'])
            : rng.pick(['Contacted', 'New', 'Not Interested']);

        rows.push(row);
    }

    return rows.sort((a, b) => String(b['Created At']).localeCompare(String(a['Created At'])));
}

// ═════════════════════════════════════════════════════════════════════════════
// vapi_call_logs
// ═════════════════════════════════════════════════════════════════════════════

// Locally-hosted placeholder call recordings (synthetic voice-like audio — no real
// call audio exists in demo mode). Bucketed roughly by length so a call's assigned
// recording is at least in the right ballpark for its duration.
const SAMPLE_RECORDINGS_SHORT = ['/audio/sample-call-4.wav', '/audio/sample-call-6.wav'];
const SAMPLE_RECORDINGS_MEDIUM = ['/audio/sample-call-1.wav', '/audio/sample-call-2.wav'];
const SAMPLE_RECORDINGS_LONG = ['/audio/sample-call-3.wav', '/audio/sample-call-5.wav'];
const SAMPLE_RECORDINGS_VOICEMAIL = ['/audio/sample-voicemail-1.wav'];

function pickRecordingFor(duration: number, rng: ReturnType<typeof makeRng>, isVoicemail: boolean): string {
    if (isVoicemail) return rng.pick(SAMPLE_RECORDINGS_VOICEMAIL);
    if (duration <= 25) return rng.pick(SAMPLE_RECORDINGS_SHORT);
    if (duration <= 70) return rng.pick(SAMPLE_RECORDINGS_MEDIUM);
    return rng.pick(SAMPLE_RECORDINGS_LONG);
}

export function generateMockCalls(count: number, seed = SEED + 2): any[] {
    const rng = makeRng(seed);
    const rows: any[] = [];

    for (let i = 0; i < count; i++) {
        const p = makePersona(rng, i + 200);
        const ageDays = Math.round((i / Math.max(1, count - 1)) * 89);
        const startedAt = isoDaysAgo(ageDays, rng.int(6, 19), rng.int(0, 59));

        const status = rng.pick(CALL_STATUSES);
        const answered = status === 'ended' || status === 'customer-ended-call';
        const isVoicemail = status === 'voicemail';
        const duration = answered
            ? rng.int(20, 600)
            : isVoicemail
                ? rng.int(8, 35)
                : rng.int(0, 6);

        // Cost roughly tracks duration, clamped to the requested 0.01 - 2.50 band.
        const cost = Number(Math.min(2.5, Math.max(0.01, (duration / 60) * rng.float(0.18, 0.42, 3))).toFixed(3));

        const assistantId = rng.pick(ASSISTANT_IDS);
        const isElevenLabs = rng.chance(0.08);
        const type = rng.chance(0.82) ? 'outboundPhoneCall' : 'inboundPhoneCall';

        // Pick a script whose outcome matches the call's status, so summary/transcript/
        // status always tell one coherent story.
        let script: CallScript | null = null;
        if (isVoicemail) {
            script = rng.pick(VOICEMAIL_SCRIPTS);
        } else if (answered) {
            const outcomeRoll = rng.next();
            const pool = outcomeRoll < 0.4 ? POSITIVE_SCRIPTS : outcomeRoll < 0.75 ? NEUTRAL_SCRIPTS : NEGATIVE_SCRIPTS;
            script = rng.pick(pool);
        }

        rows.push({
            id: makeUuid(rng),
            started_at: startedAt,
            customer_phone: p.phone,
            customer_name: rng.chance(0.75) ? p.name : '',
            duration_seconds: duration,
            status,
            cost_usd: cost,
            source: isElevenLabs ? 'elevenlabs' : 'vapi',
            transcript: script?.transcript || '',
            summary: script?.summary || '',
            // Local synthetic placeholder audio — no real call recordings exist in demo mode,
            // but the player needs a genuinely playable source, so every answered/voicemail
            // call gets a duration-matched sample file.
            recording_url: (answered || isVoicemail) ? pickRecordingFor(duration, rng, isVoicemail) : '',
            vapi_account: rng.chance(0.58) ? 'B2B' : 'B2C',
            assistantId,
            type,
        });
    }

    return rows.sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)));
}

// ═════════════════════════════════════════════════════════════════════════════
// owner_data / master_leads (lower priority — small sets)
// ═════════════════════════════════════════════════════════════════════════════

export function generateMockOwnerData(count: number, seed = SEED + 3): any[] {
    const rng = makeRng(seed);
    const rows: any[] = [];
    for (let i = 0; i < count; i++) {
        const p = makePersona(rng, i + 300);
        rows.push({
            id: `OWN-${3000 + i}`,
            ownerName: p.name,
            contactNo: Number(p.phone.replace(/\D/g, '').slice(0, 15)),
            email: p.email,
            company: p.company,
            propertyLocation: rng.pick([
                'Al Quoz Industrial 3', 'Jebel Ali Free Zone', 'Dubai Investments Park',
                'Ras Al Khor Industrial 2', 'Dubai South Logistics District', 'Sharjah Industrial 15',
            ]),
            created_at: isoDaysAgo(rng.int(5, 88), rng.int(8, 17)),
        });
    }
    return rows;
}

export function generateMockMasterLeads(count: number, seed = SEED + 4): any[] {
    const rng = makeRng(seed);
    const rows: any[] = [];
    for (let i = 0; i < count; i++) {
        const p = makePersona(rng, i + 400);
        rows.push({
            'Lead ID': `RG-ML-${4000 + i}`,
            'Name': p.name,
            'Phone': p.phone,
            'Email': p.email,
            'Created At': isoDaysAgo(rng.int(1, 89), rng.int(8, 18)),
            'Updated At': isoDaysAgo(rng.int(0, 5), rng.int(8, 18)),
            lead_status: rng.pick(LEAD_STATUSES),
            company: p.company,
        });
    }
    return rows;
}

// ═════════════════════════════════════════════════════════════════════════════
// Module-load dataset — generated ONCE so every route call sees the same rows.
// ═════════════════════════════════════════════════════════════════════════════

export const MOCK_NR_WF: any[] = generateMockLeads(52);
export const MOCK_NURTURE: any[] = generateMockNurtureLeads(26);
export const MOCK_FOLLOWUP: any[] = [];
export const MOCK_CALL_LOGS: any[] = generateMockCalls(72);
export const MOCK_OWNER_DATA: any[] = generateMockOwnerData(8);
export const MOCK_MASTER_LEADS: any[] = generateMockMasterLeads(12);

// ── Filtering helpers ────────────────────────────────────────────────────────

/** Inclusive date-range filter on an arbitrary date field. */
export function filterByDateField(
    rows: any[],
    field: string,
    fromISO: string | null,
    toISO: string | null
): any[] {
    if (!fromISO && !toISO) return rows;
    const fromMs = fromISO ? new Date(fromISO).getTime() : -Infinity;
    const toMs = toISO ? new Date(toISO).getTime() : Infinity;
    if (isNaN(fromMs) && isNaN(toMs)) return rows;
    return rows.filter(r => {
        const v = r[field];
        if (!v) return false;
        const t = new Date(v).getTime();
        if (isNaN(t)) return false;
        return t >= fromMs && t <= toMs;
    });
}

/** nr_wf rows filtered on "Created At". */
export function getMockNrWf(fromISO: string | null, toISO: string | null): any[] {
    return filterByDateField(MOCK_NR_WF, 'Created At', fromISO, toISO);
}

/** nurture rows filtered on "Created At". */
export function getMockNurture(fromISO: string | null, toISO: string | null): any[] {
    return filterByDateField(MOCK_NURTURE, 'Created At', fromISO, toISO);
}

/**
 * Full leads payload in the exact shape `/api/leads` returns.
 * Pass nulls for both bounds to get everything (the `from=all` mode).
 */
export function getMockLeadsResponse(fromISO: string | null = null, toISO: string | null = null) {
    return {
        nr_wf: getMockNrWf(fromISO, toISO),
        followup: MOCK_FOLLOWUP,
        nurture: getMockNurture(fromISO, toISO),
        master_leads: [] as any[],
    };
}

/** Raw (select=*) payload for `/api/leads-raw`. */
export function getMockLeadsRawResponse() {
    return {
        nr_wf: MOCK_NR_WF,
        followup: MOCK_FOLLOWUP,
        nurture: MOCK_NURTURE,
    };
}

/** vapi_call_logs rows filtered on started_at. */
export function getMockCallLogs(fromISO: string | null = null, toISO: string | null = null): any[] {
    return filterByDateField(MOCK_CALL_LOGS, 'started_at', fromISO, toISO);
}

/** Single call log by id. */
export function getMockCallById(id: string): any | null {
    return MOCK_CALL_LOGS.find(c => c.id === id) || null;
}

/** Phone -> name map used for call name resolution. */
export function getMockLeadNameByPhone(): Map<string, string> {
    const map = new Map<string, string>();
    [...MOCK_NR_WF, ...MOCK_NURTURE, ...MOCK_MASTER_LEADS].forEach(l => {
        const clean = String(l['Phone'] || '').replace(/\D/g, '');
        const name = l['Name'];
        if (clean && name) map.set(clean, String(name));
    });
    return map;
}

// ── Public chat lookup helpers ───────────────────────────────────────────────

function digits(v: any): string {
    return String(v ?? '').replace(/\D/g, '');
}

/**
 * Mirrors the PostgREST `or=(id.eq.X, phone.ilike.*Y*)` lookup pattern.
 */
export function lookupMockRows(
    rows: any[],
    idFields: string[],
    phoneFields: string[],
    rawId: string,
    searchPhone: string
): any[] {
    const lowerId = String(rawId || '').toLowerCase();
    return rows.filter(r => {
        for (const f of idFields) {
            const v = r[f];
            if (v !== undefined && v !== null && String(v).toLowerCase() === lowerId) return true;
        }
        if (searchPhone) {
            for (const f of phoneFields) {
                const v = digits(r[f]);
                if (v && v.includes(searchPhone)) return true;
            }
        }
        return false;
    });
}

// ═════════════════════════════════════════════════════════════════════════════
// Instantly (email) mock analytics
// ═════════════════════════════════════════════════════════════════════════════

/** Daily per-account analytics rows, matching the Instantly v2 daily shape. */
export function getMockEmailDailyAnalytics(startDate: string, endDate: string): any[] {
    const rng = makeRng(SEED + 5);
    const out: any[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return out;

    for (const email of SENDER_EMAILS) {
        for (let d = new Date(start); d <= end; d = new Date(d.getTime() + DAY)) {
            const iso = d.toISOString().slice(0, 10);
            const dow = d.getUTCDay();
            const isWeekend = dow === 5 || dow === 6; // Fri/Sat weekend in the UAE
            const sent = isWeekend ? rng.int(0, 12) : rng.int(35, 120);
            const opened = Math.round(sent * rng.float(0.28, 0.62, 2));
            const replied = Math.round(opened * rng.float(0.04, 0.18, 2));
            const bounced = Math.round(sent * rng.float(0, 0.05, 3));
            const clicks = Math.round(opened * rng.float(0.05, 0.2, 2));
            out.push({
                date: iso,
                email_account: email,
                sent,
                opened,
                unique_opened: Math.round(opened * 0.82),
                replied,
                unique_replied: replied,
                bounced,
                clicks,
                unique_clicks: Math.round(clicks * 0.8),
            });
        }
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Bounces payload matching `/api/email/bounces` response shape. */
export function getMockEmailBounces() {
    const rng = makeRng(SEED + 6);
    const types = ['Hard Bounce', 'Soft Bounce', 'Technical Bounce'];
    const bounced_emails = Array.from({ length: 18 }, (_, i) => {
        const p = makePersona(rng, i + 500);
        return {
            email: p.email,
            type: rng.pick(types),
            from: rng.pick(SENDER_EMAILS),
            date: isoDaysAgo(rng.int(1, 30)).slice(0, 10),
        };
    }).sort((a, b) => b.date.localeCompare(a.date));

    const lower = (s: string) => s.toLowerCase();
    return {
        summary: {
            total_bounces: bounced_emails.length,
            hard_bounces: bounced_emails.filter(b => lower(b.type).includes('hard')).length,
            soft_bounces: bounced_emails.filter(b => lower(b.type).includes('soft')).length,
            technical_bounces: bounced_emails.filter(b => lower(b.type).includes('tech')).length,
        },
        bounced_emails,
    };
}

/** Warmup analytics array matching the processed shape of the real route. */
export function getMockWarmupAnalytics(): any[] {
    const rng = makeRng(SEED + 7);
    return SENDER_EMAILS.map(email => {
        const history = Array.from({ length: 30 }, (_, i) => {
            const date = isoDaysAgo(29 - i).slice(0, 10);
            const sent = rng.int(18, 46);
            const spam = rng.int(0, 4);
            return { date, sent, inbox: sent - spam, spam };
        });
        const total_sent = history.reduce((s, h) => s + h.sent, 0);
        const landed_spam = history.reduce((s, h) => s + h.spam, 0);
        const landed_inbox = total_sent - landed_spam;
        const health_score = rng.int(72, 97);
        const inbox_rate = total_sent > 0 ? (landed_inbox / total_sent) * 100 : 0;
        const spam_rate = total_sent > 0 ? (landed_spam / total_sent) * 100 : 0;
        return {
            email,
            total_sent,
            landed_inbox,
            landed_spam,
            received: Math.round(total_sent * 0.94),
            health_score,
            health_label: `${health_score}%`,
            inbox_rate: Number(inbox_rate.toFixed(2)),
            spam_rate: Number(spam_rate.toFixed(2)),
            status: health_score >= 80 ? 'Healthy' : health_score >= 60 ? 'Medium' : 'Poor',
            history,
        };
    });
}

// ═════════════════════════════════════════════════════════════════════════════
// Provider balance mocks
// ═════════════════════════════════════════════════════════════════════════════

export const MOCK_VAPI_BALANCE = {
    balance: 245.5,
    used: 812.37,
    total_recharge: 1057.87,
    currency: 'USD',
    mock: true,
};

export const MOCK_ELEVENLABS_BALANCE = {
    character_count: 184_320,
    character_limit: 500_000,
    reset_at: Math.floor((NOW + 12 * DAY) / 1000),
    usage_percent: (184_320 / 500_000) * 100,
    status: 'active',
    mock: true,
};

export const MOCK_MAQSAM_BALANCE = {
    balance: 1320.75,
    currency: 'AED',
    credits: 1320.75,
    mock: true,
};

export const MOCK_TWILIO_BALANCE = {
    balance: 187.42,
    used: 463.18,
    total_recharge: 650.6,
    currency: 'USD',
    account_sid: 'ACmock00000000000000000000000000',
    mock: true,
};

/** Maqsam CDR-shaped call list for `/api/maqsam`. */
export function getMockMaqsamCalls(limit = 50): any[] {
    return MOCK_CALL_LOGS.slice(0, limit).map(c => ({
        id: c.id,
        startedAt: c.started_at,
        duration: c.duration_seconds,
        direction: c.type === 'inboundPhoneCall' ? 'inbound' : 'outbound',
        status: c.status,
        from: c.type === 'inboundPhoneCall' ? c.customer_phone : '+97148714150',
        to: c.type === 'inboundPhoneCall' ? '+97148714150' : c.customer_phone,
        source: 'maqsam',
    }));
}

// ═════════════════════════════════════════════════════════════════════════════
// Templates mock (n8n webhooks are unavailable in demo mode)
// ═════════════════════════════════════════════════════════════════════════════

export function getMockTemplates(): any[] {
    const emails = [
        {
            n: 1, loop: 'Intro Loop',
            subject: 'Cutting your facility energy costs by 20-35%',
            body: EMAIL_BODIES[0].replace(/\{first\}/g, '[Name]').replace(/\{company\}/g, '[Company]'),
        },
        {
            n: 2, loop: 'Intro Loop',
            subject: 'Sample energy audit — RG Group Dubai',
            body: EMAIL_BODIES[1].replace(/\{first\}/g, '[Name]').replace(/\{company\}/g, '[Company]'),
        },
        {
            n: 3, loop: 'Intro Loop',
            subject: 'Closing the loop on your utilities review',
            body: EMAIL_BODIES[2].replace(/\{first\}/g, '[Name]').replace(/\{company\}/g, '[Company]'),
        },
        {
            n: 4, loop: 'Follow-Up Loop',
            subject: 'Re: energy efficiency at [Company]',
            body: 'Hi [Name],\n\nJust bumping this to the top of your inbox. We have a DEWA-approved retrofit programme with slots opening this quarter.\n\nWorth a quick look?\n\nRG Group Dubai',
        },
        {
            n: 5, loop: 'Follow-Up Loop',
            subject: 'A 3.8 year payback in Al Quoz',
            body: 'Hi [Name],\n\nWe recently completed a rooftop PV install in Al Quoz with a 3.8 year payback. Happy to share the case study if useful for [Company].\n\nRG Group Dubai',
        },
        {
            n: 7, loop: 'Nurture Loop',
            subject: 'Quarterly energy benchmark — UAE facilities',
            body: 'Hi [Name],\n\nSharing our quarterly UAE facilities energy benchmark. Most sites we survey are 18-30% above their achievable baseline.\n\nRG Group Dubai',
        },
    ];

    const whatsapp = [
        { name: 'Cold Message #1 (Day 0)', loop: 'Intro Loop', body: WA_OUTBOUND_TEMPLATES[0].replace(/\{first\}/g, '[Name]').replace(/\{company\}/g, '[Company]') },
        { name: 'Cold Message #2 (Day 2)', loop: 'Intro Loop', body: WA_OUTBOUND_TEMPLATES[1].replace(/\{first\}/g, '[Name]').replace(/\{company\}/g, '[Company]') },
        { name: 'Follow-Up Message 1', loop: 'Follow-Up Loop', body: WA_OUTBOUND_TEMPLATES[2].replace(/\{first\}/g, '[Name]').replace(/\{company\}/g, '[Company]') },
        { name: 'Call Not Answered', loop: 'Follow-Up Loop', body: 'Hi [Name], tried reaching you just now from RG Group Dubai. Is there a better time to call?' },
        { name: 'Nurture Message 1', loop: 'Nurture Loop', body: WA_OUTBOUND_TEMPLATES[4].replace(/\{first\}/g, '[Name]').replace(/\{company\}/g, '[Company]') },
        { name: 'Nurture Message 2', loop: 'Nurture Loop', body: 'Hi [Name], sharing our latest UAE facilities energy benchmark — happy to run the numbers for [Company] whenever the timing suits.' },
    ];

    return [
        ...emails.map(e => ({
            id: `email-${e.n}`,
            name: `Email ${e.n}`,
            type: 'email',
            category: e.loop,
            subject: e.subject,
            body: e.body,
            content: e.body,
        })),
        ...whatsapp.map((w, i) => ({
            id: `whatsapp-${i}`,
            name: w.name,
            type: 'whatsapp',
            category: w.loop,
            subject: w.name,
            body: w.body,
            content: w.body,
        })),
    ];
}
