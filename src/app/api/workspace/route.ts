import { auth } from '@/lib/auth';
import { env } from 'cloudflare:workers';

type WorkspacePayload = {
  briefs: unknown[];
  quotes: unknown[];
  jobs: unknown[];
  settings: Record<string, unknown>;
};

async function getUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

export async function GET(request: Request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const row = await env.task_tuck_db
    .prepare('SELECT briefs_json, quotes_json, jobs_json, settings_json FROM workspace WHERE user_id = ?')
    .bind(user.id)
    .first<{
      briefs_json: string;
      quotes_json: string;
      jobs_json: string;
      settings_json: string;
    }>();

  if (!row) {
    return Response.json({
      data: {
        briefs: [],
        quotes: [],
        jobs: [],
        settings: {},
      },
      found: false,
    });
  }

  return Response.json({
    data: {
      briefs: JSON.parse(row.briefs_json),
      quotes: JSON.parse(row.quotes_json),
      jobs: JSON.parse(row.jobs_json),
      settings: JSON.parse(row.settings_json),
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

  const now = Date.now();
  await env.task_tuck_db
    .prepare(`INSERT INTO workspace (user_id, briefs_json, quotes_json, jobs_json, settings_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        briefs_json = excluded.briefs_json,
        quotes_json = excluded.quotes_json,
        jobs_json = excluded.jobs_json,
        settings_json = excluded.settings_json,
        updated_at = excluded.updated_at`)
    .bind(
      user.id,
      JSON.stringify(body.briefs),
      JSON.stringify(body.quotes),
      JSON.stringify(body.jobs),
      JSON.stringify(body.settings),
      now,
      now,
    )
    .run();

  return Response.json({ ok: true, updatedAt: now });
}
