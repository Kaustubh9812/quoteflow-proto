'use client';

import { FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | 'forgot'>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleForgotPassword() {
    setError('');
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }

    setBusy(true);
    try {
      const response = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: window.location.origin + '/reset-password',
      });

      if (response.error) {
        setError(response.error.message || 'Unable to send the reset email. Please try again.');
      } else {
        setError('If an account exists for that email, a password reset link has been sent.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    if (mode === 'forgot') {
      event.preventDefault();
      await handleForgotPassword();
      return;
    }

    if (mode === 'sign-up' && !name.trim()) {
      setError('Enter your name.');
      return;
    }

    setBusy(true);
    try {
      const response = mode === 'sign-up'
        ? await authClient.signUp.email({
            name: name.trim(),
            email: email.trim(),
            password,
          })
        : await authClient.signIn.email({
            email: email.trim(),
            password,
            rememberMe: true,
          });

      if (response.error) {
        setError(response.error.message || 'Authentication failed. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (isPending) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6">
          <div className="text-sm text-slate-500">Loading TaskTuck…</div>
        </div>
      </main>
    );
  }

  if (session?.user) return <>{children}</>;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between border-r border-slate-200 bg-white px-10 py-10 lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                <path d="M6 7.5h12M8.5 4.5h7M8 9v7.25A3.75 3.75 0 0 0 11.75 20h.5A3.75 3.75 0 0 0 16 16.25V9" />
                <path d="M8 11.5h8" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">TaskTuck</div>
              <div className="text-xs text-slate-500">Cleaning operations workspace</div>
            </div>
          </div>

          <div className="max-w-lg">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">A calmer ops desk</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
              Turn messy customer requests into work your team can act on.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
              Keep inquiries, quotes, jobs, customers, and your operating defaults together in one focused workspace.
            </p>
          </div>

          <div className="text-xs text-slate-400">TaskTuck · private workspace</div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                    <path d="M6 7.5h12M8.5 4.5h7M8 9v7.25A3.75 3.75 0 0 0 11.75 20h.5A3.75 3.75 0 0 0 16 16.25V9" />
                    <path d="M8 11.5h8" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold tracking-tight">TaskTuck</div>
                  <div className="text-xs text-slate-500">Cleaning operations workspace</div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-sm font-medium text-slate-500">{mode === 'sign-in' ? 'Welcome back' : 'Create your workspace'}</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight">
                {mode === 'sign-in' ? 'Sign in to TaskTuck' : 'Start using TaskTuck'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {mode === 'sign-in'
                  ? 'Use the email and password for your TaskTuck account.'
                  : 'Create an account to keep your workspace private and persistent.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'sign-up' && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    placeholder="Your name"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  placeholder="you@business.com"
                />
              </label>

              {mode !== 'forgot' && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  placeholder="At least 8 characters"
                />
              </label>
              )}

              {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? 'Working…' : mode === 'forgot' ? 'Send reset link' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              {mode === 'sign-in' ? 'New to TaskTuck?' : 'Already have a TaskTuck account?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'forgot' ? 'sign-in' : mode === 'sign-in' ? 'sign-up' : 'sign-in');
                  setError('');
                }}
                className="font-semibold text-slate-950 underline underline-offset-4"
              >
                {mode === 'forgot' ? 'Sign in' : mode === 'sign-in' ? 'Create an account' : 'Sign in'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
