import { auth } from '@/lib/auth';
import { env } from 'cloudflare:workers';
import type { InboxCategory, InboxMessage, InboxStatus } from '@/lib/inbox';

const DEFAULT_INBOX_DOMAIN = 'task-tuck.com';

function makeInboxAlias() {
  return 'tt-' + crypto.randomUUID().replaceAll('-', '').slice(0, 18);
}

function safeParseMessages(value: string | null | undefined): InboxMessage[] {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed as InboxMessage[] : [];
  } catch {
    return [];
  }
}

function safeParseSettings(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

async function getUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

function getDomain() {
  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  return (runtimeEnv.TASKTUCK_INBOUND_DOMAIN || DEFAULT_INBOX_DOMAIN).trim().toLowerCase();
}

function inboxAddress(alias: string) {
  return 'inbox+' + alias + '@' + getDomain();
}

export async function GET(request: Request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await env.task_tuck_db
    .prepare('SELECT inbox_alias, inbox_json, settings_json FROM workspace WHERE user_id = ?')
    .bind(user.id)
    .first<{ inbox_alias: string | null; inbox_json: string; settings_json: string }>();

  const alias = existing?.inbox_alias || makeInboxAlias();
  const settings = safeParseSettings(existing?.settings_json);
  const messages = safeParseMessages(existing?.inbox_json);

  if (!existing) {
    const now = Date.now();
    await env.task_tuck_db
      .prepare('INSERT INTO workspace (user_id, briefs_json, quotes_json, jobs_json, settings_json, created_at, updated_at, inbox_alias, inbox_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(user.id, '[]', '[]', '[]', '{}', now, now, alias, '[]')
      .run();
  } else if (!existing.inbox_alias) {
    await env.task_tuck_db
      .prepare('UPDATE workspace SET inbox_alias = ?, updated_at = ? WHERE user_id = ?')
      .bind(alias, Date.now(), user.id)
      .run();
  }

  const unread = messages.filter((item) => item.status === 'new').length;
  const needsReview = messages.filter((item) => item.needsHumanReview).length;

  return Response.json({
    data: {
      messages,
      inboxAlias: alias,
      inboxAddress: inboxAddress(alias),
      baseAddress: 'inbox@' + getDomain(),
      unread,
      needsReview,
      settings,
    },
  });
}

export async function PATCH(request: Request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    messageId?: string;
    status?: InboxStatus;
    category?: InboxCategory;
    needsHumanReview?: boolean;
  } | null;

  if (!body?.messageId) return Response.json({ error: 'Message ID is required.' }, { status: 400 });

  const row = await env.task_tuck_db
    .prepare('SELECT inbox_json FROM workspace WHERE user_id = ?')
    .bind(user.id)
    .first<{ inbox_json: string }>();

  if (!row) return Response.json({ error: 'Workspace not found.' }, { status: 404 });

  const messages = safeParseMessages(row.inbox_json);
  const message = messages.find((item) => item.id === body.messageId);
  if (!message) return Response.json({ error: 'Inbox message not found.' }, { status: 404 });

  if (body.status && ['new', 'in_progress', 'resolved', 'archived'].includes(body.status)) {
    message.status = body.status;
  }
  if (body.category && ['inquiry', 'query', 'feedback', 'complaint', 'quote_response', 'spam', 'other'].includes(body.category)) {
    message.category = body.category;
  }
  if (typeof body.needsHumanReview === 'boolean') {
    message.needsHumanReview = body.needsHumanReview;
  }

  await env.task_tuck_db
    .prepare('UPDATE workspace SET inbox_json = ?, updated_at = ? WHERE user_id = ?')
    .bind(JSON.stringify(messages), Date.now(), user.id)
    .run();

  return Response.json({ ok: true, message });
}
