import { env } from 'cloudflare:workers';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const DEFAULT_PROVIDER = 'ollama';
const DEFAULT_WORKERS_AI_MODEL = '@cf/google/gemma-4-26b-a4b-it';
const DEFAULT_OLLAMA_MODEL = 'llama3.2';
const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

const SYSTEM_PROMPT = `You are TaskTuck, a cleaning-operations intake assistant.
Your job is to turn messy customer inquiries into a concise, quote-ready operations brief for a professional cleaning company.

Extract only information supported by the customer message. Do not invent prices, square footage, room counts, dates, access details, or services. Mark unknown items as "Not provided".

Important date rule: distinguish the cleaning appointment from any other date in the message. Under "Requested date/time", include only the date/time the customer wants the cleaning performed. Under "Requested date", include a different related date such as a move-out date, event date, lease date, or deadline when one is explicitly mentioned. If a date could be either, preserve the ambiguity instead of guessing.

Return markdown with these sections in this order:
## Customer
- Name / contact details if provided

## Property
- Property type, size, rooms, occupancy, and other useful context

## Service scope
- Requested cleaning services and any special tasks

## Timing & access
- Requested date/time for the cleaning
- Requested date for a related deadline or other non-cleaning date, when relevant
- Frequency, entry instructions, parking, keys, concierge, loading, or other logistics

## Constraints & signals
- Pets, urgency, condition, special requests, questions, or anything that could affect quoting

## Follow-up checklist
- The specific missing or ambiguous details the operator should confirm before quoting or scheduling

Keep the brief practical and easy to scan. Do not provide a final price unless the customer explicitly supplied one.`;

function getProvider() {
  const configured = process.env.TASKTUCK_AI_PROVIDER?.trim().toLowerCase();
  if (configured) return configured;

  // Local builds/dev use Ollama when OLLAMA_URL is present.
  // Cloudflare production has no OLLAMA_URL, so it naturally uses Workers AI.
  return process.env.OLLAMA_URL ? DEFAULT_PROVIDER : 'workers-ai';
}

async function analyzeWithWorkersAI(inquiry: string) {
  const model = process.env.WORKERS_AI_MODEL?.trim() || DEFAULT_WORKERS_AI_MODEL;

  const response = await env.AI.run(model, {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: inquiry },
    ],
    temperature: 0.2,
    chat_template_kwargs: {
      enable_thinking: false,
    },
  });

  const result = (() => {
    if (!response || typeof response !== 'object') return '';
    const payload = response as {
      response?: unknown;
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    if (typeof payload.response === 'string') return payload.response.trim();
    const content = payload.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content.trim() : '';
  })();

  if (!result) {
    return NextResponse.json(
      { error: 'The Workers AI model returned no usable text.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ result, model });
}

async function analyzeWithOllama(inquiry: string) {
  const ollamaUrl = (process.env.OLLAMA_URL || DEFAULT_OLLAMA_URL).replace(/\/$/, '');
  const model = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;

  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: inquiry },
      ],
      stream: false,
      options: {
        temperature: 0.2,
      },
    }),
  });

  const rawText = await response.text();

  if (!response.ok) {
    let detail = rawText;
    try {
      const parsed: { error?: string } = JSON.parse(rawText);
      detail = parsed.error || rawText;
    } catch {
      // Keep the original response text when Ollama does not return JSON.
    }
    return NextResponse.json(
      { error: `Local AI request failed (${response.status}): ${detail}` },
      { status: 502 },
    );
  }

  try {
    const data: { message?: { content?: string } } = JSON.parse(rawText);
    const result = typeof data.message?.content === 'string' ? data.message.content.trim() : '';

    if (!result) {
      return NextResponse.json({ error: 'The local AI model returned an empty brief.' }, { status: 502 });
    }

    return NextResponse.json({ result, model });
  } catch {
    return NextResponse.json(
      { error: 'The local AI server returned an unreadable response.' },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const inquiry = typeof body?.inquiry === 'string' ? body.inquiry.trim() : '';

    if (!inquiry) {
      return NextResponse.json({ error: 'Please paste a customer inquiry first.' }, { status: 400 });
    }

    if (inquiry.length > 20000) {
      return NextResponse.json(
        { error: 'That inquiry is too long. Keep it under 20,000 characters.' },
        { status: 413 },
      );
    }

    const provider = getProvider();

    if (provider === 'workers-ai') {
      return await analyzeWithWorkersAI(inquiry);
    }

    if (provider === 'ollama') {
      return await analyzeWithOllama(inquiry);
    }

    return NextResponse.json(
      { error: `Unsupported TaskTuck AI provider: ${provider}` },
      { status: 500 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { error: `AI analysis failed: ${message}` },
      { status: 502 },
    );
  }
}
