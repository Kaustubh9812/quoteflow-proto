import { auth } from '@/lib/auth';
import { env } from 'cloudflare:workers';

type WorkspacePayload = {
  briefs: unknown[];
  quotes: unknown[];
  jobs: unknown[];
  settings: Record<string, unknown>;
};

const DEFAULT_INBOX_DOMAIN = 'task-tuck.com';

function makeInboxAlias() {
  return 'tt-' + crypto.randomUUID().replaceAll('-', '').slice(0, 18);
}

function getInboxAddress(alias: string) {
  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  const domain = (runtimeEnv.TASKTUCK_INBOUND_DOMAIN || DEFAULT_INBOX_DOMAIN).trim().toLowerCase();
  return 'inbox+' + alias + '@' + domain;
}

async function getUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

function parseJson<T>(value: string, fallback: T) {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function GET(request: Request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let row = await env.task_tuck_db
    .prepare('SELECT briefs_json, quotes_json, jobs_json, settings_json, inbox_alias, inbox_json FROM workspace WHERE user_id = ?')
    .bind(user.id)
    .first<{
      briefs_json: string;
      quotes_json: string;
      jobs_json: string;
      settings_json: string;
      inbox_alias: string | null;
      inbox_json: string;
    }>();

  if (!row) {
    const now = Date.now();
    const alias = makeInboxAlias();
    await env.task_tuck_db
      .prepare('INSERT INTO workspace (user_id, briefs_json, quotes_json, jobs_json, settings_json, created_at, updated_at, inbox_alias, inbox_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(user.id, '[]', '[]', '[]', '{}', now, now, alias, '[]')
      .run();
    row = {
      briefs_json: '[]',
      quotes_json: '[]',
      jobs_json: '[]',
      settings_json: '{}',
      inbox_alias: alias,
      inbox_json: '[]',
    };
  } else if (!row.inbox_alias) {
    const alias = makeInboxAlias();
    await env.task_tuck_db
      .prepare('UPDATE workspace SET inbox_alias = ?, updated_at = ? WHERE user_id = ?')
      .bind(alias, Date.now(), user.id)
      .run();
    row.inbox_alias = alias;
  }

  const messages = parseJson<unknown[]>(row.inbox_json, []);
  return Response.json({
    data: {
      briefs: parseJson<unknown[]>(row.briefs_json, []),
      quotes: parseJson<unknown[]>(row.quotes_json, []),
      jobs: parseJson<unknown[]>(row.jobs_json, []),
      settings: parseJson<Record<string, unknown>>(row.settings_json, {}),
      inbox: {
        messages,
        inboxAlias: row.inbox_alias,
        inboxAddress: getInboxAddress(row.inbox_alias),
        unread: messages.filter((item) => item && typeof item === 'object' && 'status' in item && (item as { status?: unknown }).status === 'new').length,
        needsReview: messages.filter((item) => item && typeof item === 'object' && 'needsHumanReview' in item && Boolean((item as { needsHumanReview?: unknown }).needsHumanReview)).length,
      },
    },
    found: true,
  });
}

export async function PUT(request: Request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: WorkspacePayload;
  try {
    body = await request.json() as WorkspacePayload;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(body.briefs) || !Array.isArray(body.quotes) || !Array.isArray(body.jobs) || body.settings === null || typeof body.settings !== 'object') {
    return Response.json({ error: 'Invalid workspace payload' }, { status: 400 });
  }

  const existing = await env.task_tuck_db
    .prepare('SELECT created_at, inbox_alias FROM workspace WHERE user_id = ?')
    .bind(user.id)
    .first<{ created_at: number; inbox_alias: string | null }>();

  const now = Date.now();

  if (existing) {
    await env.task_tuck_db
      .prepare('UPDATE workspace SET briefs_json = ?, quotes_json = ?, jobs_json = ?, settings_json = ?, updated_at = ? WHERE user_id = ?')
      .bind(
        JSON.stringify(body.briefs),
        JSON.stringify(body.quotes),
        JSON.stringify(body.jobs),
        JSON.stringify(body.settings),
        now,
        user.id,
      )
      .run();
  } else {
    const inboxAlias = makeInboxAlias();
    await env.task_tuck_db
      .prepare('INSERT INTO workspace (user_id, briefs_json, quotes_json, jobs_json, settings_json, created_at, updated_at, inbox_alias, inbox_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(
        user.id,
        JSON.stringify(body.briefs),
        JSON.stringify(body.quotes),
        JSON.stringify(body.jobs),
        JSON.stringify(body.settings),
        now,
        now,
        inboxAlias,
        '[]',
      )
      .run();
  }

  return Response.json({ ok: true, updatedAt: now });
}
