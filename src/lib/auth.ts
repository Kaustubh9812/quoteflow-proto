import { betterAuth } from 'better-auth';
import { env } from 'cloudflare:workers';

export function createAuth() {
  return betterAuth({
    database: env.task_tuck_db,
    baseURL: env.BETTER_AUTH_URL || undefined,
    emailAndPassword: {
      enabled: true,
    },
  });
}
