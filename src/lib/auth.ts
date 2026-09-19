import { betterAuth } from 'better-auth';
import { env, waitUntil } from 'cloudflare:workers';

const runtimeEnv = env as unknown as Record<string, string | undefined>;

function queuePasswordResetEmail(to: string, url: string) {
  const apiKey = runtimeEnv.RESEND_API_KEY;

  if (!apiKey) {
    console.error('TaskTuck password reset email was not sent: RESEND_API_KEY is missing.');
    return;
  }

  waitUntil((async () => {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        from: 'TaskTuck <noreply@task-tuck.com>',
        to: [to],
        subject: 'Reset your TaskTuck password',
        text: [
          'We received a request to reset your TaskTuck password.',
          '',
          'Reset your password: ' + url,
          '',
          'This link will expire according to your TaskTuck password-reset settings.',
          'If you did not request this, you can safely ignore this email.',
        ].join('\n'),
        html: '<p>We received a request to reset your TaskTuck password.</p><p><a href="' + url + '">Reset your password</a></p><p>This link will expire according to your TaskTuck password-reset settings.</p><p>If you did not request this, you can safely ignore this email.</p>',
        tags: [{ name: 'category', value: 'password_reset' }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('TaskTuck password reset email failed:', response.status, detail);
    }
  })());
}

function queueVerificationEmail(to: string, url: string) {
  const apiKey = runtimeEnv.RESEND_API_KEY;

  if (!apiKey) {
    console.error('TaskTuck verification email was not sent: RESEND_API_KEY is missing.');
    return;
  }

  waitUntil((async () => {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        from: 'TaskTuck <noreply@task-tuck.com>',
        to: [to],
        subject: 'Verify your TaskTuck email',
        text: [
          'Welcome to TaskTuck.',
          '',
          'Verify your email address: ' + url,
          '',
          'This link will expire according to your TaskTuck email-verification settings.',
          'If you did not create this account, you can safely ignore this email.',
        ].join('\n'),
        html: '<p>Welcome to TaskTuck.</p><p><a href="' + url + '">Verify your email address</a></p><p>This link will expire according to your TaskTuck email-verification settings.</p><p>If you did not create this account, you can safely ignore this email.</p>',
        tags: [{ name: 'category', value: 'email_verification' }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('TaskTuck verification email failed:', response.status, detail);
    }
  })());
}

export const auth = betterAuth({
  database: env.task_tuck_db,
  secret: runtimeEnv[['BETTER', 'AUTH', 'SECRET'].join('_')],
  baseURL: runtimeEnv.BETTER_AUTH_URL || undefined,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      queuePasswordResetEmail(user.email, url);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      queueVerificationEmail(user.email, url);
    },
  },
});