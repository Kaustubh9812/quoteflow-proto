'use client';

import React, { useEffect, useMemo, useState } from 'react';

const SAMPLES = [
  {
    label: 'Move-out',
    text: 'Hi, I am moving out of my 2 bedroom apartment on October 4th. It is about 1,100 sq ft and mostly empty. I need the kitchen, bathrooms, floors, and inside of the cabinets done. The building has a concierge and there is a loading zone downstairs. Ideally sometime in the morning on October 3rd.',
  },
  {
    label: 'Office',
    text: 'We run a small 6-person design office, around 1,800 sq ft. We are looking for cleaning every Tuesday and Friday after 6pm. Two bathrooms, kitchenette, open workspace and a couple of meeting rooms. We can provide keys to the cleaner.',
  },
  {
    label: 'Deep clean',
    text: 'Looking for a deep clean before family visits. Three bedroom house, two bathrooms, lots of pet hair, and the oven needs attention. The house is occupied and we would prefer Saturday afternoon. Can you let me know what you would need from us to quote it?',
  },
];

type RecentJob = {
  id: string;
  inquiry: string;
  result: string;
  createdAt: number;
  label: string;
  model?: string;
};

type BriefSection = {
  title: string;
  items: string[];
};

type QuoteDraft = {
  jobId: string;
  basePrice: string;
  extras: string;
  customerNote: string;
  savedAt: number;
};

const STORAGE_KEY = 'tasktuck-recent-briefs';
const MAX_RECENT_JOBS = 8;
const BRIEF_SECTIONS = ['Customer', 'Property', 'Service scope', 'Timing & access', 'Constraints & signals', 'Follow-up checklist'];

function getJobLabel(inquiry: string) {
  const firstLine = inquiry.split('\n').map((line) => line.trim()).find(Boolean);
  if (!firstLine) return 'Untitled inquiry';
  return firstLine.length > 46 ? `${firstLine.slice(0, 46)}…` : firstLine;
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function parseBrief(result: string): BriefSection[] {
  const sections: BriefSection[] = [];
  let current: BriefSection | null = null;

  for (const rawLine of result.split(/\r?\n/)) {
    const heading = rawLine.match(/^##\s+(.+)$/)?.[1]?.trim();
    if (heading) {
      current = { title: heading, items: [] };
      sections.push(current);
      continue;
    }

    const line = rawLine.replace(/^\s*[-*]\s?/, '').trim();
    if (current && line) current.items.push(line);
  }

  return sections.length > 0
    ? sections
    : [{ title: 'Operations brief', items: result.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) }];
}

function getSection(sections: BriefSection[], title: string) {
  return sections.find((section) => section.title.toLowerCase() === title.toLowerCase());
}

function valueAfterLabel(items: string[], label: string) {
  const match = items.find((item) => item.toLowerCase().startsWith(`${label.toLowerCase()}:`));
  return match ? match.slice(label.length + 1).trim() : '';
}

function presentValue(value: string) {
  if (!value || /^not provided$/i.test(value.trim())) return 'Missing';
  return value;
}

function Icon({ name }: { name: 'inbox' | 'quote' | 'jobs' | 'customers' | 'settings' | 'plus' | 'copy' | 'download' | 'spark' | 'arrow' | 'check' | 'back' | 'edit' }) {
  const paths = {
    inbox: <><path d="M4 5.5h16v11H4z" fill="none" /><path d="M4 13h4l1.5 2h5L16 13h4" fill="none" /></>,
    quote: <><path d="M6 3.5h12v17H6z" fill="none" /><path d="M9 8h6M9 11.5h6M9 15h4" fill="none" /></>,
    jobs: <><rect x="4" y="5" width="16" height="14" rx="2" fill="none" /><path d="M8 5V3.5h8V5M8 10h8M8 14h5" fill="none" /></>,
    customers: <><circle cx="12" cy="8" r="3.2" fill="none" /><path d="M5.5 20c.7-3.2 3-5 6.5-5s5.8 1.8 6.5 5" fill="none" /></>,
    settings: <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" fill="none" /><circle cx="12" cy="12" r="3.5" fill="none" /></>,
    plus: <><path d="M12 5v14M5 12h14" fill="none" /></>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2" fill="none" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" /></>,
    download: <><path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" fill="none" /></>,
    spark: <><path d="m12 3 1.5 6.5L20 12l-6.5 1.5L12 20l-1.5-6.5L4 12l6.5-2.5L12 3Z" fill="none" /></>,
    arrow: <><path d="M5 12h13M13 6l6 6-6 6" fill="none" /></>,
    check: <path d="m6 12 4 4 8-9" fill="none" />,
    back: <><path d="M19 12H5M11 18l-6-6 6-6" fill="none" /></>,
    edit: <><path d="m4 16-.8 4.8L8 20l10.8-10.8a2.1 2.1 0 0 0-3-3L4 17Z" fill="none" /><path d="m14.7 7.3 2 2" fill="none" /></>,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function TaskTuckMark() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[22px] w-[22px]">
        <path d="M6 7.5h12M8.5 4.5h7M8 9v7.25A3.75 3.75 0 0 0 11.75 20h.5A3.75 3.75 0 0 0 16 16.25V9" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M8 11.5h8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function Home() {
  const [inquiry, setInquiry] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);
  const [lastModel, setLastModel] = useState('');
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [activeJobId, setActiveJobId] = useState('');
  const [workspace, setWorkspace] = useState<'intake' | 'quote'>('intake');
  const [checkedFollowUps, setCheckedFollowUps] = useState<Record<string, boolean>>({});
  const [basePrice, setBasePrice] = useState('');
  const [extras, setExtras] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [quoteSaved, setQuoteSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed: RecentJob[] = JSON.parse(stored);
      if (Array.isArray(parsed)) setRecentJobs(parsed.slice(0, MAX_RECENT_JOBS));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recentJobs.slice(0, MAX_RECENT_JOBS)));
    } catch {
      // Ignore storage failures and keep the active workspace usable.
    }
  }, [recentJobs]);

  useEffect(() => {
    if (workspace !== 'quote' || !activeJobId) return;
    try {
      const stored = window.localStorage.getItem(`tasktuck-quote-draft-${activeJobId}`);
      if (!stored) return;
      const draft: QuoteDraft = JSON.parse(stored);
      setBasePrice(typeof draft.basePrice === 'string' ? draft.basePrice : '');
      setExtras(typeof draft.extras === 'string' ? draft.extras : '');
      setCustomerNote(typeof draft.customerNote === 'string' ? draft.customerNote : '');
      setQuoteSaved(true);
    } catch {
      setQuoteSaved(false);
    }
  }, [workspace, activeJobId]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        const form = document.getElementById('analyze-form') as HTMLFormElement | null;
        if (form && inquiry.trim() && inquiry.length <= 20000 && !loading) form.requestSubmit();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [inquiry, loading]);

  const status = useMemo(() => {
    if (loading) return { label: 'Analyzing', dot: 'bg-amber-500' };
    if (result) return { label: workspace === 'quote' ? 'Quote prep' : 'Brief ready', dot: 'bg-emerald-500' };
    return { label: 'Ready for intake', dot: 'bg-teal-500' };
  }, [loading, result, workspace]);

  const canSubmit = inquiry.trim().length > 0 && inquiry.length <= 20000 && !loading;
  const sections = useMemo(() => parseBrief(result), [result]);
  const followUpItems = useMemo(() => getSection(sections, 'Follow-up checklist')?.items ?? [], [sections]);
  const serviceItems = useMemo(() => getSection(sections, 'Service scope')?.items ?? [], [sections]);
  const propertyItems = useMemo(() => getSection(sections, 'Property')?.items ?? [], [sections]);
  const timingItems = useMemo(() => getSection(sections, 'Timing & access')?.items ?? [], [sections]);
  const customerItems = useMemo(() => getSection(sections, 'Customer')?.items ?? [], [sections]);
  const constraintsItems = useMemo(() => getSection(sections, 'Constraints & signals')?.items ?? [], [sections]);

  const customerName = useMemo(() => {
    const raw = valueAfterLabel(customerItems, 'Name / contact details');
    if (!raw || /^not provided$/i.test(raw)) return '';
    const cleaned = raw.split(/[,\-–]/)[0].trim();
    return cleaned && !/^missing$/i.test(cleaned) ? cleaned : '';
  }, [customerItems]);

  const propertyType = valueAfterLabel(propertyItems, 'Property type');
  const propertySize = valueAfterLabel(propertyItems, 'Size');
  const roomCount = valueAfterLabel(propertyItems, 'Rooms');
  const cleaningDate = valueAfterLabel(timingItems, 'Requested date/time');
  const requestedDate = valueAfterLabel(timingItems, 'Requested date');
  const accessDetails = timingItems.filter((item) => /access|concierge|loading|entry|parking|keys/i.test(item));
  const total = (Number.parseFloat(basePrice) || 0) + (Number.parseFloat(extras) || 0);
  const totalLabel = total.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  const checkedCount = followUpItems.filter((item) => checkedFollowUps[item]).length;
  const allChecksDone = followUpItems.length > 0 && checkedCount === followUpItems.length;

  const quoteTitle = serviceItems.find((item) => /requested cleaning services|requested services/i.test(item))
    ? 'Cleaning service quote'
    : 'Cleaning quote';

  const generatedNote = useMemo(() => {
    const greeting = customerName ? `Hi ${customerName.split(/\s+/)[0]},` : 'Hi there,';
    const scope = serviceItems
      .filter((item) => !/^special tasks:\s*not provided$/i.test(item))
      .slice(0, 4)
      .join(', ')
      .replace(/^Requested cleaning services:\s*/i, '');
    const scopeSentence = scope ? ` We reviewed the requested scope including ${scope.toLowerCase()}.` : ' We reviewed the cleaning details you sent over.';
    const priceSentence = total > 0
      ? ` The current quote draft total is ${totalLabel}.`
      : ' We are reviewing the remaining details before confirming pricing.';
    return `${greeting}\n\nThanks for reaching out.${scopeSentence}${priceSentence}\n\nThanks,\nTaskTuck`;
  }, [customerName, serviceItems, total, totalLabel]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setResult('');
    setError('');
    setCopied(false);
    setWorkspace('intake');
    setCheckedFollowUps({});
    setQuoteSaved(false);
    setBasePrice('');
    setExtras('');
    setCustomerNote('');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiry: inquiry.trim() }),
      });

      const data: { result?: string; model?: string; error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error || 'The local analysis request failed.');

      const nextResult = data.result || 'No structured brief was returned.';
      const createdAt = Date.now();
      const nextJob: RecentJob = {
        id: `${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
        inquiry: inquiry.trim(),
        result: nextResult,
        createdAt,
        label: getJobLabel(inquiry),
        model: data.model,
      };

      setResult(nextResult);
      setLastRunAt(new Date(createdAt));
      setLastModel(data.model || '');
      setActiveJobId(nextJob.id);
      setRecentJobs((current) => [nextJob, ...current.filter((job) => job.inquiry !== nextJob.inquiry)].slice(0, MAX_RECENT_JOBS));
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

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `tasktuck-brief-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const openRecentJob = (job: RecentJob) => {
    setInquiry(job.inquiry);
    setResult(job.result);
    setLastRunAt(new Date(job.createdAt));
    setLastModel(job.model || '');
    setActiveJobId(job.id);
    setError('');
    setCopied(false);
    setWorkspace('intake');
    setCheckedFollowUps({});
    setQuoteSaved(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetWorkspace = () => {
    setInquiry('');
    setResult('');
    setError('');
    setCopied(false);
    setLastRunAt(null);
    setLastModel('');
    setActiveJobId('');
    setWorkspace('intake');
    setCheckedFollowUps({});
    setBasePrice('');
    setExtras('');
    setCustomerNote('');
    setQuoteSaved(false);
  };

  const clearRecentJobs = () => {
    setRecentJobs([]);
    setActiveJobId('');
  };

  const openQuotePrep = () => {
    if (!result) return;
    setWorkspace('quote');
    setQuoteSaved(false);
  };

  const toggleFollowUp = (item: string) => {
    setCheckedFollowUps((current) => ({ ...current, [item]: !current[item] }));
  };

  const saveQuoteDraft = () => {
    if (!activeJobId) return;
    const payload: QuoteDraft = {
      jobId: activeJobId,
      basePrice,
      extras,
      customerNote,
      savedAt: Date.now(),
    };
    try {
      window.localStorage.setItem(`tasktuck-quote-draft-${activeJobId}`, JSON.stringify(payload));
      setQuoteSaved(true);
    } catch {
      setError('The quote could not be saved in this browser.');
    }
  };

  const copyCustomerNote = async () => {
    const note = customerNote || generatedNote;
    try {
      await navigator.clipboard.writeText(note);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Copy failed. Your browser did not allow clipboard access.');
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f7f8] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-[238px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex h-[72px] items-center gap-3 border-b border-slate-200 px-5">
            <TaskTuckMark />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-slate-950">TaskTuck</span>
                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-teal-700">Ops</span>
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">Cleaning operations</div>
            </div>
          </div>

          <div className="px-3 pt-5">
            <button type="button" onClick={resetWorkspace} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800">
              <Icon name="plus" /> New inquiry
            </button>
          </div>

          <nav className="space-y-1 px-3 pt-5" aria-label="Primary navigation">
            <div className="px-2 pb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</div>
            <button type="button" onClick={() => setWorkspace('intake')} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${workspace === 'intake' ? 'bg-teal-50 text-teal-800' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Icon name="inbox" /> Intake desk
            </button>
            <button type="button" onClick={() => result && setWorkspace('quote')} disabled={!result} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs transition ${workspace === 'quote' ? 'bg-teal-50 font-semibold text-teal-800' : 'text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'}`}>
              <span className="flex items-center gap-3"><Icon name="quote" />Quotes</span>
              {!result && <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Soon</span>}
            </button>
            {[
              ['jobs', 'Jobs'],
              ['customers', 'Customers'],
            ].map(([icon, label]) => (
              <button key={label} type="button" disabled className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs text-slate-500 opacity-75">
                <span className="flex items-center gap-3"><Icon name={icon as 'jobs' | 'customers'} />{label}</span>
                <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Soon</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-3 p-3">
            <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-teal-900"><span className="h-1.5 w-1.5 rounded-full bg-teal-500" />Local AI</div>
              <p className="mt-2 text-[10px] leading-5 text-teal-900/60">Your configured Ollama service stays on this machine.</p>
            </div>
            <button type="button" disabled className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-slate-500 opacity-75"><Icon name="settings" />Settings <span className="ml-auto text-[9px] uppercase tracking-wide text-slate-400">Soon</span></button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur sm:px-8">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace</div>
              <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-950">{workspace === 'quote' ? 'Quote prep' : 'Intake desk'}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-600 sm:flex">
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {lastModel ? `Local AI · ${lastModel}` : 'Local AI configured'}
              </div>
              <button type="button" onClick={resetWorkspace} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                <Icon name="plus" /> New inquiry
              </button>
            </div>
          </header>

          <main className="mx-auto max-w-[1420px] px-5 py-6 sm:px-8">
            <section className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-teal-700">{workspace === 'quote' ? 'Operations brief → quote preparation' : 'Customer message → operations brief'}</div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{workspace === 'quote' ? 'Finish the quote draft with the scope in front of you.' : 'Prepare the next quote without digging through messages.'}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{workspace === 'quote' ? 'Review the scope, clear the operator checks you can confirm, add your price, and preview the customer-facing draft.' : 'Paste the inquiry as-is. TaskTuck structures the customer, property, scope, timing, access notes, and follow-up items your team needs.'}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  ['Briefs this session', String(recentJobs.length)],
                  ['Current status', status.label],
                  ['Processing', 'Local'],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-[120px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="text-[10px] font-medium text-slate-400">{label}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-800">{value}</div>
                  </div>
                ))}
              </div>
            </section>

            {workspace === 'intake' ? (
              <>
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]">
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">New inquiry</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">Email, voicemail transcript, web form, or desk note</div>
                      </div>
                      <div className="hidden items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:flex"><span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</div>
                    </div>

                    <div className="p-5">
                      <div className="mb-3 flex flex-wrap gap-2">
                        {SAMPLES.map((sample) => (
                          <button key={sample.label} type="button" onClick={() => { setInquiry(sample.text); setResult(''); setError(''); setActiveJobId(''); setWorkspace('intake'); }} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800">Use {sample.label}</button>
                        ))}
                      </div>

                      <form id="analyze-form" onSubmit={handleSubmit}>
                        <div className="relative">
                          <textarea
                            aria-label="Customer inquiry"
                            className="min-h-[300px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50/80 p-4 pb-10 text-sm leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                            placeholder="Paste the customer message here…"
                            value={inquiry}
                            onChange={(event) => { setInquiry(event.target.value); if (error) setError(''); setQuoteSaved(false); }}
                            disabled={loading}
                          />
                          <div className="pointer-events-none absolute bottom-3 left-4 right-4 flex items-center justify-between text-[10px] text-slate-400">
                            <span>Ctrl/⌘ + Enter to analyze</span>
                            <span className={inquiry.length > 20000 ? 'font-semibold text-rose-600' : ''}>{inquiry.length.toLocaleString()} / 20,000</span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <button type="button" onClick={resetWorkspace} disabled={!inquiry && !result} className="text-xs font-medium text-slate-500 transition hover:text-slate-800 disabled:opacity-40">Clear workspace</button>
                          <button type="submit" disabled={!canSubmit} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">
                            {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Analyzing inquiry</> : <>Analyze inquiry <Icon name="arrow" /></>}
                          </button>
                        </div>
                      </form>
                    </div>
                  </section>

                  <aside className="space-y-5">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">Recent briefs</div>
                          <div className="mt-0.5 text-[11px] text-slate-500">Saved in this browser</div>
                        </div>
                        {recentJobs.length > 0 && <button type="button" onClick={clearRecentJobs} className="text-[10px] font-semibold text-slate-400 hover:text-slate-700">Clear</button>}
                      </div>
                      {recentJobs.length > 0 ? (
                        <div className="mt-4 space-y-1.5">
                          {recentJobs.map((job) => (
                            <button key={job.id} type="button" onClick={() => openRecentJob(job)} className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${activeJobId === job.id ? 'border-teal-200 bg-teal-50' : 'border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white'}`}>
                              <div className="truncate text-xs font-semibold text-slate-800">{job.label}</div>
                              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400"><span>{new Date(job.createdAt).toLocaleDateString()}</span><span>{formatTime(job.createdAt)}</span></div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-[11px] leading-5 text-slate-400">Your analyzed inquiries will appear here. They stay in this browser unless you clear them.</div>
                      )}
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><Icon name="spark" /></span>Brief coverage</div>
                      <p className="mt-2 text-[11px] leading-5 text-slate-500">The analyzer looks for the signals an operator usually needs before a quote.</p>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {BRIEF_SECTIONS.map((item) => <div key={item} className="rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] font-medium text-slate-600">{item.replace(' & ', ' + ')}</div>)}
                      </div>
                    </section>
                  </aside>
                </div>

                {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"><span className="font-semibold">Couldn’t process that.</span> <span className="break-all text-rose-700/80">{error}</span></div>}

                <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${result ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}><Icon name={result ? 'check' : 'spark'} /></div>
                      <div>
                        <div className="text-sm font-semibold text-slate-950">Operations brief</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">{status.label}{lastRunAt ? ` · ${formatTime(lastRunAt.getTime())}` : ''}{lastModel ? ` · ${lastModel}` : ''}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {result && <button type="button" onClick={handleCopy} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"><Icon name="copy" />{copied ? 'Copied' : 'Copy'}</button>}
                      {result && <button type="button" onClick={handleDownload} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"><Icon name="download" />Export .md</button>}
                      {result && <button type="button" onClick={openQuotePrep} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-800"><Icon name="quote" />Prepare quote</button>}
                    </div>
                  </div>

                  <div className="px-5 py-6 sm:px-7">
                    {result ? (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900"><span className="font-semibold">Brief ready.</span> Review the extracted details below, then move into quote prep when the scope looks right.</div>
                        <div className="grid gap-3 md:grid-cols-2">
                          {sections.filter((section) => section.title !== 'Follow-up checklist').map((section) => (
                            <section key={section.title} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{section.title}</div>
                              {section.items.length > 0 ? (
                                <div className="mt-3 space-y-2">
                                  {section.items.map((item, index) => <p key={`${section.title}-${index}`} className={`text-xs leading-5 ${/not provided/i.test(item) ? 'text-slate-400' : 'text-slate-700'}`}>{item.replace(/Not provided/gi, 'Missing')}</p>)}
                                </div>
                              ) : <p className="mt-3 text-xs text-slate-400">Missing</p>}
                            </section>
                          ))}
                        </div>

                        {followUpItems.length > 0 && (
                          <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">Follow-up before pricing</div>
                                <p className="mt-1 text-xs text-amber-900/70">Confirm these items before treating the brief as complete.</p>
                              </div>
                              <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold text-amber-700">{checkedCount}/{followUpItems.length}</span>
                            </div>
                            <div className="mt-3 grid gap-2 md:grid-cols-2">
                              {followUpItems.map((item) => (
                                <label key={item} className="flex cursor-pointer items-start gap-2 rounded-lg border border-amber-200/80 bg-white/70 px-3 py-2.5">
                                  <input type="checkbox" checked={Boolean(checkedFollowUps[item])} onChange={() => toggleFollowUp(item)} className="mt-0.5 accent-teal-600" />
                                  <span className={`text-xs leading-5 ${checkedFollowUps[item] ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item}</span>
                                </label>
                              ))}
                            </div>
                          </section>
                        )}
                      </div>
                    ) : (
                      <div className="flex min-h-[170px] items-center justify-center text-center">
                        <div className="max-w-md">
                          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Icon name="spark" /></div>
                          <div className="mt-4 text-sm font-semibold text-slate-700">Nothing to review yet</div>
                          <p className="mt-1.5 text-xs leading-5 text-slate-400">Analyze an inquiry and the structured operations brief will land here.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </>
            ) : (
              <>
                {error && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"><span className="font-semibold">Couldn’t save that.</span> <span className="break-all text-rose-700/80">{error}</span></div>}

                {result ? (
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
                    <div className="space-y-5">
                      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                          <div>
                            <div className="text-sm font-semibold text-slate-950">Quote editor</div>
                            <div className="mt-0.5 text-[11px] text-slate-500">Pricing stays manual. The extracted brief is read-only here.</div>
                          </div>
                          <button type="button" onClick={() => setWorkspace('intake')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"><Icon name="back" />Back to brief</button>
                        </div>

                        <div className="p-5">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Customer</div>
                              <div className={`mt-2 text-sm font-semibold ${customerName ? 'text-slate-900' : 'text-slate-400'}`}>{customerName || 'Customer name missing'}</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Cleaning date</div>
                              <div className={`mt-2 text-sm font-semibold ${cleaningDate ? 'text-slate-900' : 'text-slate-400'}`}>{presentValue(cleaningDate || requestedDate)}</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:col-span-2">
                              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Property</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {[propertyType, propertySize, roomCount].filter(Boolean).map((value) => <span key={value} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-700">{presentValue(value)}</span>)}
                                {accessDetails.slice(0, 2).map((value) => <span key={value} className="rounded-full border border-teal-100 bg-teal-50 px-2.5 py-1 text-[11px] text-teal-800">{value}</span>)}
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">Operator checks</div>
                                <p className="mt-1 text-xs text-amber-900/70">Resolve these before treating the quote as complete.</p>
                              </div>
                              <span className={`rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold ${allChecksDone ? 'text-emerald-700' : 'text-amber-700'}`}>{checkedCount}/{followUpItems.length} done</span>
                            </div>
                            <div className="mt-3 space-y-2">
                              {followUpItems.length > 0 ? followUpItems.map((item) => (
                                <label key={item} className="flex cursor-pointer items-start gap-2 rounded-lg border border-amber-200/80 bg-white/70 px-3 py-2.5">
                                  <input type="checkbox" checked={Boolean(checkedFollowUps[item])} onChange={() => toggleFollowUp(item)} className="mt-0.5 accent-teal-600" />
                                  <span className={`text-xs leading-5 ${checkedFollowUps[item] ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item}</span>
                                </label>
                              )) : <div className="rounded-lg bg-white/70 px-3 py-3 text-xs text-slate-500">No explicit follow-up items were returned.</div>}
                            </div>
                          </div>

                          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-slate-900">Scope</div>
                                <div className="mt-0.5 text-[11px] text-slate-500">Taken directly from the operations brief.</div>
                              </div>
                              <Icon name="edit" />
                            </div>
                            <div className="mt-3 space-y-2">
                              {serviceItems.length > 0 ? serviceItems.map((item) => <div key={item} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 text-slate-700">{item}</div>) : <div className="text-xs text-slate-400">Missing</div>}
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Pricing</div>
                            <div className="mt-1 text-[11px] text-slate-500">Enter the numbers you use for this job.</div>
                          </div>
                          {quoteSaved && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700"><Icon name="check" />Draft saved</span>}
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <label className="block"><span className="text-xs font-medium text-slate-700">Base service</span><div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3"><span className="text-xs text-slate-400">$</span><input inputMode="decimal" value={basePrice} onChange={(event) => { setBasePrice(event.target.value); setQuoteSaved(false); }} placeholder="0.00" className="w-full bg-transparent px-2 py-2.5 text-sm text-slate-900 outline-none" /></div></label>
                          <label className="block"><span className="text-xs font-medium text-slate-700">Extras / add-ons</span><div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3"><span className="text-xs text-slate-400">$</span><input inputMode="decimal" value={extras} onChange={(event) => { setExtras(event.target.value); setQuoteSaved(false); }} placeholder="0.00" className="w-full bg-transparent px-2 py-2.5 text-sm text-slate-900 outline-none" /></div></label>
                        </div>
                        <div className="mt-5 flex items-end justify-between rounded-xl bg-slate-950 p-4 text-white">
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/50">Quote total</div>
                            <div className="mt-1 text-3xl font-semibold tracking-tight">{totalLabel}</div>
                            <div className="mt-1 text-[10px] text-white/45">Manual pricing · no automatic tax or fees</div>
                          </div>
                          <button type="button" onClick={saveQuoteDraft} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[11px] font-semibold text-slate-950 transition hover:bg-slate-100"><Icon name="check" />Save draft</button>
                        </div>
                      </section>
                    </div>

                    <div className="space-y-5">
                      <section className="rounded-2xl border border-slate-300 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-5 py-4">
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Live customer preview</div>
                          <div className="mt-1 text-sm font-semibold text-slate-950">What the customer-facing draft will look like</div>
                        </div>
                        <div className="p-5">
                          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
                              <div>
                                <div className="text-lg font-semibold tracking-tight text-slate-950">TaskTuck</div>
                                <div className="mt-1 text-[11px] text-slate-500">Cleaning service quote</div>
                              </div>
                              <div className="text-right text-[10px] text-slate-400">Draft preview</div>
                            </div>
                            <div className="mt-5">
                              <div className="text-sm font-semibold text-slate-950">{quoteTitle}</div>
                              <div className="mt-1 text-[11px] text-slate-500">{propertyType || 'Property'} · {propertySize || 'Size missing'} {roomCount ? `· ${roomCount}` : ''}</div>
                            </div>
                            <div className="mt-5 space-y-2 border-y border-slate-100 py-4">
                              {serviceItems.filter((item) => !/^requested cleaning services:\s*$/i.test(item)).slice(0, 6).map((item) => <div key={item} className="flex gap-2 text-xs text-slate-700"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />{item}</div>)}
                              {cleaningDate && <div className="pt-1 text-xs text-slate-500">Cleaning date: <span className="font-medium text-slate-800">{cleaningDate}</span></div>}
                              {requestedDate && <div className="text-xs text-slate-500">Related date: <span className="font-medium text-slate-800">{requestedDate}</span></div>}
                            </div>
                            <div className="flex items-end justify-between pt-5">
                              <div className="text-[10px] text-slate-400">Prepared from reviewed job scope</div>
                              <div className="text-right"><div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Total</div><div className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{totalLabel}</div></div>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Customer note</div>
                            <div className="mt-1 text-[11px] text-slate-500">Edit before sending from your own channel.</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => { setCustomerNote(generatedNote); setQuoteSaved(false); }} className="text-[10px] font-semibold text-teal-700 hover:text-teal-800">Use template</button>
                            <button type="button" onClick={copyCustomerNote} className="text-[10px] font-semibold text-slate-500 hover:text-slate-800">{copied ? 'Copied' : 'Copy note'}</button>
                          </div>
                        </div>
                        <textarea value={customerNote} onChange={(event) => { setCustomerNote(event.target.value); setQuoteSaved(false); }} placeholder="Draft a customer-facing note here…" className="mt-4 min-h-[180px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-500/10" />
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><span className="text-[10px] text-slate-400">Nothing is sent automatically.</span><button type="button" onClick={saveQuoteDraft} className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-teal-700"><Icon name={quoteSaved ? 'check' : 'arrow'} />{quoteSaved ? 'Saved in browser' : 'Save quote draft'}</button></div>
                      </section>
                    </div>
                  </div>
                ) : (
                  <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex min-h-[320px] items-center justify-center text-center">
                      <div className="max-w-md"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Icon name="quote" /></div><div className="mt-4 text-sm font-semibold text-slate-700">Analyze an inquiry first</div><p className="mt-1.5 text-xs leading-5 text-slate-400">Once a brief is ready, TaskTuck can hand the reviewed scope into quote preparation.</p><button type="button" onClick={() => setWorkspace('intake')} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white"><Icon name="back" />Back to intake</button></div>
                    </div>
                  </section>
                )}
              </>
            )}

            <footer className="flex flex-col gap-1 border-t border-slate-200 py-5 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>TaskTuck · Intake desk</span>
              <span>Local-first workflow · Current release</span>
            </footer>
          </main>
        </div>
      </div>
    </main>
  );
}
