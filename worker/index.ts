import handler from 'vinext/server/fetch-handler';
import { processInboundEmail, type InboundEmailMessage, type InboxEnv } from '../src/lib/inbox';

type WorkerEnv = InboxEnv & {
  BETTER_AUTH_URL?: string;
};

type WorkerExecutionContext = Parameters<typeof handler.fetch>[2];

export default {
  async fetch(
    request: Request,
    env: WorkerEnv,
    ctx: WorkerExecutionContext,
  ): Promise<Response> {
    return handler.fetch(request, env as Parameters<typeof handler.fetch>[1], ctx);
  },

  async email(
    message: InboundEmailMessage,
    env: WorkerEnv,
  ): Promise<void> {
    await processInboundEmail(message, env);
  },
};
