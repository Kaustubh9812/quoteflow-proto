'use client';

import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';

const SAMPLES = [
  {
    label: 'Move-out clean',
    text: 'Hi, I am moving out of my 2 bedroom apartment on October 4th. It is about 1,100 sq ft and mostly empty. I need the kitchen, bathrooms, floors, and inside of the cabinets done. The building has a concierge and there is a loading zone downstairs. Ideally sometime in the morning on October 3rd.',
  },
  {
    label: 'Recurring office',
    text: 'We run a small 6-person design office, around 1,800 sq ft. We are looking for cleaning every Tuesday and Friday after 6pm. Two bathrooms, kitchenette, open workspace and a couple of meeting rooms. We can provide keys to the cleaner.',
  },
  {
    label: 'Deep clean',
    text: 'Looking for a deep clean before family visits. Three bedroom house, two bathrooms, lots of pet hair, and the oven needs attention. The house is occupied and we would prefer Saturday afternoon. Can you let me know what you would need from us to quote it?',
  },
];

function ClipboardIcon({ copied }: { copied: boolean }) {
  return copied ? (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function TaskTuckMark() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-950 shadow-sm shadow-black/20">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path d="M6 7.5h12M8.5 4.5h7M8 9v7.25A3.75 3.75 0 0 0 11.75 20h.5A3.75 3.75 0 0 0 16 16.25V9" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M8 11.5h8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function ResultMarkdown({ result }: { result: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h2 className="mb-3 mt-5 text-base font-semibold text-white first:mt-0">{children}</h2>,
        h2: ({ children }) => <h3 className="mb-2 mt-5 text-sm font-semibold text-white">{children}</h3>,
        h3: ({ children }) => <h4 className="mb-2 mt-4 text-sm font-semibold text-slate-100">{children}</h4>,
        p: ({ children }) => <p className="mb-3 leading-7 text-slate-300 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="mb-4 list-disc space-y-2 pl-5 text-slate-300">{children}</ul>,
        ol: ({ children }) => <ol className="mb-4 list-decimal space-y-2 pl-5 text-slate-300">{children}</ol>,
        li: ({ children }) => <li className="pl-1 leading-6">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        blockquote: ({ children }) => <blockquote className="my-4 border-l-2 border-cyan-400/50 pl-4 text-slate-300">{children}</blockquote>,
        code: ({ children }) => <code className="rounded bg-slate-900 px-1.5 py-0.5 text-xs text-cyan-200">{children}</code>,
      }}
    >
      {result}
    </ReactMarkdown>
  );
}

export default function Home() {
  const [inquiry, setInquiry] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

  const characterCount = inquiry.length;
  const canSubmit = inquiry.trim().length > 0 && !loading;
  const statusText = useMemo(() => {
    if (loading) return 'Processing locally';
    if (result) return 'Brief ready';
    return 'Ready for intake';
  }, [loading, result]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        const form = document.getElementById('analyze-form') as HTMLFormElement | null;
        if (form && canSubmit) form.requestSubmit();
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [canSubmit]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setResult('');
    setError('');
    setCopied(false);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiry }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The local analysis request failed.');

      setResult(data.result || 'No structured brief was returned.');
      setLastRunAt(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong while processing the inquiry.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Copy failed. Your browser did not allow clipboard access.');
    }
  };

  const resetWorkspace = () => {
    setInquiry('');
    setResult('');
    setError('');
    setCopied(false);
    setLastRunAt(null);
  };

  return (
    <main className="min-h-screen bg-[#080b12] text-slate-100 selection:bg-cyan-400/20 selection:text-cyan-100">
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-18rem] h-[36rem] w-[52rem] -translate-x-1/2 rounded-full bg-cyan-400/8 blur-3xl" />
        <div className="absolute right-[-10rem] top-[20rem] h-[24rem] w-[24rem] rounded-full bg-violet-500/6 blur-3xl" />
        <div className="tasktuck-grid absolute inset-0 opacity-[0.16]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-10 pt-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-white/8 pb-5">
          <div className="flex items-center gap-3">
            <TaskTuckMark />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-white">TaskTuck</span>
                <span className="rounded-full border border-cyan-300/15 bg-cyan-300/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">Ops</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">Cleaning operations copilot</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
              Local AI
            </div>
            <div className="rounded-full border border-amber-300/15 bg-amber-300/7 px-3 py-1.5 text-xs font-medium text-amber-200">Pro automation · coming soon</div>
          </div>
        </header>

        <section className="grid gap-10 pb-10 pt-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.17em] text-slate-400">
              Lead intake → quote-ready brief
            </div>
            <h1 className="text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">
              Turn messy inquiries into <span className="text-cyan-200">actionable jobs.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
              Paste the customer message exactly as you received it. TaskTuck extracts the details your cleaning team needs to quote, schedule, and follow up.
            </p>
          </div>

          <div className="hidden rounded-2xl border border-white/8 bg-white/[0.025] p-4 lg:block">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">Workflow</span>
              <span className="text-slate-500">3 steps</span>
            </div>
            <div className="mt-4 space-y-3">
              {[
                ['01', 'Capture', 'Keep the original inquiry intact'],
                ['02', 'Structure', 'Turn free text into a clean brief'],
                ['03', 'Act', 'Quote, schedule, or reply faster'],
              ].map(([number, title, copy]) => (
                <div key={number} className="flex gap-3 rounded-xl border border-white/6 bg-slate-950/40 p-3">
                  <span className="mt-0.5 font-mono text-[10px] text-cyan-300">{number}</span>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{title}</div>
                    <div className="mt-0.5 text-[11px] leading-5 text-slate-500">{copy}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="overflow-hidden rounded-3xl border border-white/8 bg-white/[0.035] shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/7 px-5 py-4 sm:px-6">
              <div>
                <div className="text-sm font-semibold text-white">New inquiry</div>
                <div className="mt-1 text-xs text-slate-500">Email, voicemail transcript, web form, or desk notes</div>
              </div>
              <div className="rounded-full border border-white/7 bg-black/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">Local processing</div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="mb-3 flex flex-wrap gap-2">
                {SAMPLES.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => { setInquiry(sample.text); setResult(''); setError(''); }}
                    className="rounded-full border border-white/8 bg-white/[0.025] px-3 py-1.5 text-xs text-slate-400 transition hover:border-cyan-300/20 hover:bg-cyan-300/7 hover:text-cyan-100"
                  >
                    Try {sample.label}
                  </button>
                ))}
              </div>

              <form id="analyze-form" onSubmit={handleSubmit}>
                <div className="relative">
                  <textarea
                    aria-label="Customer inquiry"
                    className="min-h-[290px] w-full resize-none rounded-2xl border border-white/8 bg-[#060910]/80 p-5 pb-12 text-sm leading-7 text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-cyan-300/30 focus:ring-4 focus:ring-cyan-300/5"
                    placeholder="Paste a customer inquiry here…"
                    value={inquiry}
                    onChange={(event) => setInquiry(event.target.value)}
                    disabled={loading}
                  />
                  <div className="pointer-events-none absolute bottom-4 left-5 right-5 flex items-center justify-between text-[11px] text-slate-600">
                    <span>Ctrl/⌘ + Enter to analyze</span>
                    <span>{characterCount.toLocaleString()} characters</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={resetWorkspace}
                    disabled={loading && !inquiry}
                    className="order-2 text-xs font-medium text-slate-500 transition hover:text-slate-300 disabled:opacity-30 sm:order-1"
                  >
                    Clear workspace
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="order-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-40 sm:order-2"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-slate-950" />
                        Structuring inquiry…
                      </>
                    ) : (
                      <>
                        Analyze inquiry
                        <span aria-hidden="true">↗</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">What gets extracted</div>
                  <div className="mt-1 text-xs text-slate-500">Designed for cleaning sales + ops</div>
                </div>
                <span className="rounded-full border border-emerald-300/15 bg-emerald-300/7 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200">Core</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {['Customer', 'Property', 'Service scope', 'Timing', 'Access notes', 'Constraints', 'Urgency', 'Quote signals'].map((item) => (
                  <div key={item} className="rounded-xl border border-white/6 bg-slate-950/40 px-3 py-2.5 text-xs text-slate-400">{item}</div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-300/10 bg-cyan-300/[0.035] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-100">
                <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.5)]" />
                Built for your existing workflow
              </div>
              <p className="mt-3 text-xs leading-6 text-slate-400">
                Today, TaskTuck turns one messy message into one structured operations brief. The next layer can connect the same workflow to inboxes, quoting, and CRM actions.
              </p>
            </div>
          </aside>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-300/10 bg-rose-300/[0.04] px-4 py-3 text-sm text-rose-200">
            <span className="mr-2 font-semibold text-rose-300">Couldn’t process that.</span>
            <span className="break-all text-rose-200/75">{error}</span>
          </div>
        )}

        <section className={`mt-6 overflow-hidden rounded-3xl border border-white/8 bg-white/[0.035] shadow-2xl shadow-black/20 backdrop-blur-xl transition-all ${result ? 'opacity-100' : 'opacity-70'}`}>
          <div className="flex flex-col gap-3 border-b border-white/7 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300/10 bg-emerald-300/7 text-emerald-200">
                <span className="text-sm">✓</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Operations brief</div>
                <div className="mt-0.5 text-xs text-slate-500">{statusText}{lastRunAt ? ` · ${lastRunAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {result && (
                <button type="button" onClick={handleCopy} className="inline-flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2 text-xs font-medium text-slate-400 transition hover:border-white/15 hover:text-white">
                  <ClipboardIcon copied={copied} />
                  {copied ? 'Copied' : 'Copy brief'}
                </button>
              )}
              {result && (
                <button type="button" onClick={resetWorkspace} className="rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2 text-xs font-medium text-slate-400 transition hover:border-white/15 hover:text-white">
                  New inquiry
                </button>
              )}
            </div>
          </div>

          <div className="min-h-[250px] px-5 py-6 sm:px-7">
            {result ? (
              <div className="max-w-4xl text-sm">
                <ResultMarkdown result={result} />
              </div>
            ) : (
              <div className="flex min-h-[205px] items-center justify-center text-center">
                <div className="max-w-md">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.025] text-slate-600">✦</div>
                  <div className="mt-4 text-sm font-medium text-slate-400">Your structured brief will appear here</div>
                  <p className="mt-2 text-xs leading-6 text-slate-600">Customer, property, scope, timing, access notes, constraints, and follow-up signals — ready for the next action.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-white/7 pt-6 text-[11px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>TaskTuck · Cleaning operations copilot</span>
          <span>Local AI workflow · v2 prototype</span>
        </footer>
      </div>
    </main>
  );
}
