import { auth } from '@/lib/auth';
import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';

type Quote = {
  id: string;
  number: string;
  customerName: string;
  customerEmail: string;
  propertySummary: string;
  serviceItems: string[];
  cleaningDate: string;
  relatedDate: string;
  basePrice: string;
  extras: string;
  note: string;
  terms: string;
  followUpItems: string[];
  checkedFollowUps: string[];
  status: string;
  updatedAt: number;
};

type Settings = {
  businessName?: string;
  email?: string;
  phone?: string;
  currency?: string;
  terms?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function money(value: string | number, currency: string) {
  const amount = typeof value === 'number' ? value : Number.parseFloat(value) || 0;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
}

function cleanItem(value: string) {
  return value.replace(/^\s*[-*]\s?/, '').trim();
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null) as { quoteId?: string } | null;
    const quoteId = body?.quoteId?.trim();
    if (!quoteId) return NextResponse.json({ error: 'Quote ID is required.' }, { status: 400 });

    const row = await env.task_tuck_db
      .prepare('SELECT quotes_json, settings_json FROM workspace WHERE user_id = ?')
      .bind(session.user.id)
      .first<{ quotes_json: string; settings_json: string }>();

    if (!row) return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });

    let quotes: Quote[];
    let settings: Settings;
    try {
      quotes = JSON.parse(row.quotes_json) as Quote[];
      settings = JSON.parse(row.settings_json) as Settings;
    } catch {
      return NextResponse.json({ error: 'Your workspace data could not be read.' }, { status: 500 });
    }

    const quote = quotes.find((item) => item.id === quoteId);
    if (!quote) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 });

    if (quote.status !== 'Ready to send') {
      return NextResponse.json({ error: 'Mark the quote ready before sending it.' }, { status: 400 });
    }

    if (!quote.customerName.trim()) {
      return NextResponse.json({ error: 'Add a customer name before sending the quote.' }, { status: 400 });
    }

    const customerEmail = quote.customerEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return NextResponse.json({ error: 'Add a valid customer email before sending the quote.' }, { status: 400 });
    }

    if (quote.checkedFollowUps.length < quote.followUpItems.length) {
      return NextResponse.json({ error: 'Resolve all operator checks before sending the quote.' }, { status: 400 });
    }

    const basePrice = Number.parseFloat(quote.basePrice) || 0;
    const extras = Number.parseFloat(quote.extras) || 0;
    const total = basePrice + extras;
    if (total <= 0) {
      return NextResponse.json({ error: 'Add a quote total above zero before sending.' }, { status: 400 });
    }

    const runtimeEnv = env as unknown as Record<string, string | undefined>;
    const apiKey = runtimeEnv.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Email delivery is not configured yet.' }, { status: 503 });
    }

    const businessName = settings.businessName?.trim() || 'TaskTuck';
    const currency = settings.currency || 'USD';
    const businessEmail = settings.email?.trim() || '';
    const businessPhone = settings.phone?.trim() || '';
    const terms = quote.terms?.trim() || settings.terms?.trim() || '';

    const serviceRows = quote.serviceItems.filter(Boolean).map((item) =>
      '<li style="margin:0 0 8px;color:#334155;">' + escapeHtml(cleanItem(item)) + '</li>',
    ).join('');

    const textServices = quote.serviceItems.filter(Boolean).map((item) => '- ' + cleanItem(item)).join('\n');
    const text = [
      'Hi ' + quote.customerName + ',',
      '',
      quote.note || ('Please find your ' + businessName + ' cleaning quote below.'),
      '',
      businessName + ' — ' + quote.number,
      'Property: ' + (quote.propertySummary || 'Not provided'),
      quote.cleaningDate ? 'Cleaning date: ' + quote.cleaningDate : '',
      quote.relatedDate ? 'Related date: ' + quote.relatedDate : '',
      '',
      'Services:',
      textServices || '- Not provided',
      '',
      'Total: ' + money(total, currency),
      '',
      terms ? 'Terms: ' + terms : '',
      businessEmail || businessPhone ? 'Contact: ' + [businessEmail, businessPhone].filter(Boolean).join(' · ') : '',
      '',
      'Sent from ' + businessName + ' via TaskTuck.',
    ].filter(Boolean).join('\n');

    const html = [
      '<div style="margin:0;background:#f8fafc;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a;">',
      '<div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">',
      '<div style="padding:28px 28px 20px;border-bottom:1px solid #f1f5f9;">',
      '<div style="font-size:20px;font-weight:700;">' + escapeHtml(businessName) + '</div>',
      '<div style="margin-top:5px;color:#64748b;font-size:13px;">Cleaning service quote · ' + escapeHtml(quote.number) + '</div>',
      '</div>',
      '<div style="padding:28px;">',
      '<p style="margin:0 0 18px;font-size:16px;">Hi ' + escapeHtml(quote.customerName) + ',</p>',
      '<p style="margin:0 0 24px;color:#475569;line-height:1.7;white-space:pre-wrap;">' + escapeHtml(quote.note || ('Please find your ' + businessName + ' cleaning quote below.')) + '</p>',
      '<div style="padding:18px;background:#f8fafc;border-radius:12px;margin-bottom:22px;">',
      '<div style="font-size:12px;color:#64748b;margin-bottom:6px;">PROPERTY</div>',
      '<div style="font-size:15px;font-weight:600;">' + escapeHtml(quote.propertySummary || 'Not provided') + '</div>',
      quote.cleaningDate ? '<div style="margin-top:8px;font-size:13px;color:#475569;">Cleaning date: ' + escapeHtml(quote.cleaningDate) + '</div>' : '',
      quote.relatedDate ? '<div style="margin-top:4px;font-size:13px;color:#475569;">Related date: ' + escapeHtml(quote.relatedDate) + '</div>' : '',
      '</div>',
      '<div style="font-size:12px;color:#64748b;margin-bottom:8px;">SERVICES</div>',
      '<ul style="padding-left:20px;margin:0 0 24px;">' + (serviceRows || '<li style="color:#64748b;">Not provided</li>') + '</ul>',
      '<div style="padding:18px 20px;background:#0f172a;border-radius:12px;color:#ffffff;margin-bottom:24px;">',
      '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8;">Quote total</div>',
      '<div style="margin-top:5px;font-size:28px;font-weight:700;">' + escapeHtml(money(total, currency)) + '</div>',
      '</div>',
      terms ? '<div style="border-top:1px solid #f1f5f9;padding-top:18px;font-size:12px;line-height:1.7;color:#64748b;">' + escapeHtml(terms) + '</div>' : '',
      '</div>',
      '<div style="padding:18px 28px;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8;">' + escapeHtml([businessEmail, businessPhone].filter(Boolean).join(' · ')) + '</div>',
      '</div></div>',
    ].join('');

    const idempotencyKey = 'quote-email/' + session.user.id + '/' + quote.id + '/' + quote.updatedAt;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        from: businessName + ' <noreply@task-tuck.com>',
        to: [customerEmail],
        ...(businessEmail ? { reply_to: businessEmail } : {}),
        subject: businessName + ' · Cleaning quote ' + quote.number,
        text,
        html,
      }),
    });

    const payload = await response.json().catch(() => null) as { id?: string; message?: string } | null;

    if (!response.ok) {
      console.error('TaskTuck quote email failed:', response.status, payload);
      return NextResponse.json(
        { error: payload?.message || 'The quote email could not be sent.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, id: payload?.id || '', sentTo: customerEmail });
  } catch (error: unknown) {
    console.error('TaskTuck quote email route failed:', error);
    return NextResponse.json({ error: 'The quote email could not be sent.' }, { status: 500 });
  }
}
