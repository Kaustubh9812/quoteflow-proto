'use client';

import { FormEvent, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');

    const resetError = params.get('error');
    if (resetError) {
      setError(
        resetError === 'INVALID_TOKEN'
          ? 'This password reset link is invalid or has expired.'
          : 'This password reset link could not be used. Please request a new one.',
      );
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('This reset link is missing or invalid. Please request a new one.');
      return;
    }

    if (password.length < 8) {
      setError('Your new password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const response = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (response.error) {
        setError(response.error.message || 'Unable to reset your password. Please request a new link.');
        return;
      }

      setPassword('');
      setConfirmPassword('');
      setSuccess('Your password has been reset. You can now sign in to TaskTuck.');
    } catch {
      setError('Something went wrong. Please request a new reset link.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-8">
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

            <p className="mt-8 text-sm font-medium text-slate-500">Password recovery</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Set a new password</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Choose a new password for your TaskTuck account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">New password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                placeholder="At least 8 characters"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                placeholder="Enter the password again"
              />
            </label>

            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-700">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || Boolean(success)}
              className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Resetting…' : 'Reset password'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            <a href="/" className="font-semibold text-slate-950 underline underline-offset-4">
              Back to sign in
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
