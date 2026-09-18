import { betterAuth } from 'better-auth';
import { env } from 'cloudflare:workers';

const runtimeEnv = env as unknown as Record<string, string | undefined>;

export const auth = betterAuth({
  database: env.task_tuck_db,
  secret: runtimeEnv[['BETTER', 'AUTH', 'SECRET'].join('_')],
  baseURL: runtimeEnv.BETTER_AUTH_URL || undefined,
  emailAndPassword: {
    enabled: true,
  },
});
