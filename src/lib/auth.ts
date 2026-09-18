import { betterAuth } from 'better-auth';
import { env } from 'cloudflare:workers';

export function createAuth() {
  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  const authSecret = runtimeEnv[['BETTER', 'AUTH', 'SECRET'].join('_')];

  return betterAuth({
    database: env.task_tuck_db,
    secret: authSecret,
    baseURL: env.BETTER_AUTH_URL || undefined,
    emailAndPassword: {
      enabled: true,
    },
  });
}
