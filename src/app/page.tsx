'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import type { InboxCategory, InboxMessage, InboxStatus } from '@/lib/inbox';

type View = 'overview' | 'inbox' | 'intake' | 'quotes' | 'jobs' | 'customers' | 'settings';
type QuoteStatus = 'Draft' | 'Ready to send';
type JobStatus = 'Ready to schedule' | 'Scheduled' | 'Completed';

type BriefRecord = { id: string; inquiry: string; result: string; createdAt: number; model: string };
type BriefSection = { title: string; items: string[] };
type QuoteRecord = {
  id: string;
  number: string;
  briefId: string;
  createdAt: number;
  updatedAt: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  propertySummary: string;
  serviceItems: string[];
  cleaningDate: string;
  relatedDate: string;
  accessDetails: string[];
  constraintItems: string[];
  followUpItems: string[];
  checkedFollowUps: string[];
  basePrice: string;
  extras: string;
  note: string;
  terms: string;
  status: QuoteStatus;
  sentAt?: number;
  sentTo?: string;
};
type JobRecord = { id: string; quoteId: string; quoteNumber: string; createdAt: number; updatedAt: number; customerName: string; propertySummary: string; serviceSummary: string; cleaningDate: string; status: JobStatus };
type Settings = { businessName: string; email: string; phone: string; currency: string; terms: string; defaultNote: string };

const DEFAULT_SETTINGS: Settings = {
  businessName: 'TaskTuck',
  email: '',
  phone: '',
  currency: 'USD',
  terms: 'Pricing is based on the scope reviewed. Any material change in scope may require a revised quote.',
  defaultNote: 'Thanks for reaching out. We reviewed the cleaning details you sent over and prepared the quote below.',
};
const SAMPLES = [
  { label: 'Move-out', text: 'Hi, I am moving out of my 2 bedroom apartment on October 4th. It is about 1,100 sq ft and mostly empty. I need the kitchen, bathrooms, floors, and inside of the cabinets done. The building has a concierge and there is a loading zone downstairs. Ideally sometime in the morning on October 3rd.' },
  { label: 'Office', text: 'We run a small 6-person design office, around 1,800 sq ft. We are looking for cleaning every Tuesday and Friday after 6pm. Two bathrooms, kitchenette, open workspace and a couple of meeting rooms. We can provide keys to the cleaner.' },
  { label: 'Deep clean', text: 'Looking for a deep clean before family visits. Three bedroom house, two bathrooms, lots of pet hair, and the oven needs attention. The house is occupied and we would prefer Saturday afternoon. Can you let me know what you would need from us to quote it?' },
];
const BRIEF_SECTIONS = ['Customer', 'Property', 'Services', 'Date & access', 'Important details', 'Missing details'];

function formatTime(timestamp: number) { return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function getJobLabel(inquiry: string) { const label = inquiry.replace(/\s+/g, ' ').trim(); return label.length > 54 ? `${label.slice(0, 54).trim()}…` : label || 'Untitled inquiry'; }
function formatDate(timestamp: number) { return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); }
function present(value: string) { return value.trim() ? value : 'Missing'; }
function cleanItem(value: string) { return value.replace(/^\s*[-*]\s?/, '').replace(/\bNot provided\b/gi, 'Missing').trim(); }
function valueAfterLabel(items: string[], label: string) {
  const match = items.find((item) => item.toLowerCase().startsWith(`${label.toLowerCase()}:`));
  return match ? match.slice(label.length + 1).trim() : '';
}
function parseBrief(result: string): BriefSection[] {
  const sections: BriefSection[] = [];
  let current: BriefSection | null = null;
  for (const rawLine of result.split(/\r?\n/)) {
    const heading = rawLine.match(/^##\s+(.+)$/)?.[1]?.trim();
    if (heading) { current = { title: heading, items: [] }; sections.push(current); continue; }
    const line = rawLine.replace(/^\s*[-*]\s?/, '').trim();
    if (current && line) current.items.push(line);
  }
  return sections.length ? sections : [{ title: 'Operations brief', items: result.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) }];
}
function getSection(sections: BriefSection[], title: string) { return sections.find((section) => section.title.toLowerCase() === title.toLowerCase()); }
function getContactFromInquiry(inquiry: string) {
  const email = inquiry.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const phone = inquiry.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() || '';
  return { email, phone };
}
function nextQuoteNumber(quotes: QuoteRecord[]) {
  const highest = quotes.reduce((max, quote) => Math.max(max, Number(quote.number.match(/(\d+)$/)?.[1] || 0)), 0);
  return `TT-${String(highest + 1).padStart(4, '0')}`;
}
function money(value: string | number, currency: string) {
  const amount = typeof value === 'number' ? value : Number.parseFloat(value) || 0;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
}

function Icon({ name }: { name: 'overview' | 'inbox' | 'quote' | 'jobs' | 'customers' | 'settings' | 'plus' | 'copy' | 'download' | 'spark' | 'arrow' | 'check' | 'back' | 'edit' | 'search' | 'print' }) {
  const paths = {
    overview: <><rect x="4" y="4" width="6" height="6" rx="1" fill="none" /><rect x="14" y="4" width="6" height="6" rx="1" fill="none" /><rect x="4" y="14" width="6" height="6" rx="1" fill="none" /><rect x="14" y="14" width="6" height="6" rx="1" fill="none" /></>,
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
    search: <><circle cx="10.5" cy="10.5" r="5.5" fill="none" /><path d="m15 15 4.5 4.5" fill="none" /></>,
    print: <><path d="M6 9V4h12v5M6 17H4V10h16v7h-2" fill="none" /><path d="M7 14h10v6H7z" fill="none" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
function TaskTuckMark() {
  return <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm"><svg viewBox="0 0 24 24" aria-hidden="true" className="h-[22px] w-[22px]"><path d="M6 7.5h12M8.5 4.5h7M8 9v7.25A3.75 3.75 0 0 0 11.75 20h.5A3.75 3.75 0 0 0 16 16.25V9" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /><path d="M8 11.5h8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg></div>;
}

export default function Home() {
  const [view, setView] = useState<View>('overview');
  const [inquiry, setInquiry] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [sendingQuote, setSendingQuote] = useState(false);
  const [quoteSentMessage, setQuoteSentMessage] = useState('');
  const [lastRunAt, setLastRunAt] = useState<number | null>(null);
  const [lastModel, setLastModel] = useState('');
  const [briefs, setBriefs] = useState<BriefRecord[]>([]);
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [activeBriefId, setActiveBriefId] = useState('');
  const [selectedQuoteId, setSelectedQuoteId] = useState('');
  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<'All' | QuoteStatus>('All');
  const [jobStatusFilter, setJobStatusFilter] = useState<'All' | JobStatus>('All');
  const [customerSearch, setCustomerSearch] = useState('');
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>([]);
  const [inboxAddress, setInboxAddress] = useState('');
  const [inboxFilter, setInboxFilter] = useState<'All' | 'Inquiries' | 'Questions' | 'Feedback' | 'Complaints' | 'Quote replies' | 'Needs review'>('All');
  const [selectedInboxId, setSelectedInboxId] = useState('');
  const [inboxLoading, setInboxLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const [workspaceReady, setWorkspaceReady] = useState(false);

  // Authenticated workspace data lives in D1 so the same account works across browsers and devices.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/workspace', { cache: 'no-store' });
        const data: {
          data?: {
            briefs?: BriefRecord[];
            quotes?: QuoteRecord[];
            jobs?: JobRecord[];
            settings?: Partial<Settings>;
            inbox?: { messages?: InboxMessage[]; inboxAddress?: string };
          };
          error?: string;
        } = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load your workspace.');
        if (!active) return;
        setBriefs(Array.isArray(data.data?.briefs) ? data.data.briefs : []);
        setQuotes(Array.isArray(data.data?.quotes) ? data.data.quotes : []);
        setJobs(Array.isArray(data.data?.jobs) ? data.data.jobs : []);
        setSettings({ ...DEFAULT_SETTINGS, ...(data.data?.settings || {}) });
        setInboxMessages(Array.isArray(data.data?.inbox?.messages) ? data.data.inbox.messages : []);
        setInboxAddress(data.data?.inbox?.inboxAddress || '');
        setWorkspaceReady(true);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load your workspace.');
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => { active = false; };
  }, []);

  const saveWorkspaceNow = async () => {
    if (!workspaceReady) return false;
    try {
      const response = await fetch('/api/workspace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefs, quotes, jobs, settings }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || 'Workspace save failed.');
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Your workspace could not be saved.');
      return false;
    }
  };

  useEffect(() => {
    if (!hydrated || !workspaceReady) return;
    const timer = window.setTimeout(() => { void saveWorkspaceNow(); }, 350);
    return () => window.clearTimeout(timer);
  }, [briefs, quotes, jobs, settings, hydrated, workspaceReady]);

  const loadInbox = useCallback(async () => {
    setInboxLoading(true);
    try {
      const response = await fetch('/api/inbox', { cache: 'no-store' });
      const data: { data?: { messages?: InboxMessage[]; inboxAddress?: string }; error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load the inbox.');
      setInboxMessages(Array.isArray(data.data?.messages) ? data.data.messages : []);
      setInboxAddress(data.data?.inboxAddress || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load the inbox.');
    } finally {
      setInboxLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || (view !== 'overview' && view !== 'inbox')) return;
    void loadInbox();
    const timer = window.setInterval(() => { void loadInbox(); }, 20000);
    return () => window.clearInterval(timer);
  }, [hydrated, view, loadInbox]);



  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && view === 'intake') {
        event.preventDefault();
        const form = document.getElementById('analyze-form') as HTMLFormElement | null;
        if (form && inquiry.trim() && inquiry.length <= 20000 && !loading) form.requestSubmit();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [inquiry, loading, view]);

  const sections = useMemo(() => parseBrief(result), [result]);
  const followUpItems = useMemo(() => getSection(sections, 'Follow-up checklist')?.items ?? [], [sections]);
  const serviceItems = useMemo(() => getSection(sections, 'Service scope')?.items ?? [], [sections]);
  const propertyItems = useMemo(() => getSection(sections, 'Property')?.items ?? [], [sections]);
  const timingItems = useMemo(() => getSection(sections, 'Timing & access')?.items ?? [], [sections]);
  const customerItems = useMemo(() => getSection(sections, 'Customer')?.items ?? [], [sections]);
  const constraintItems = useMemo(() => getSection(sections, 'Constraints & signals')?.items ?? [], [sections]);

  const customerName = (valueAfterLabel(customerItems, 'Name') || valueAfterLabel(customerItems, 'Name / contact details')).replace(/^Missing$/i, '');
  const propertySummary = [valueAfterLabel(propertyItems, 'Property type'), valueAfterLabel(propertyItems, 'Size'), valueAfterLabel(propertyItems, 'Rooms')].filter(Boolean).join(' · ');
  const cleaningDate = valueAfterLabel(timingItems, 'Requested date/time');
  const relatedDate = valueAfterLabel(timingItems, 'Requested date');
  const accessDetails = timingItems.filter((item) => /access|concierge|loading|entry|parking|keys/i.test(item));
  const totalBriefs = briefs.length;
  const totalQuotes = quotes.length;
  const readyQuotes = quotes.filter((quote) => quote.status === 'Ready to send').length;
  const totalJobs = jobs.length;
  const draftQuotes = quotes.filter((quote) => quote.status === 'Draft').length;

  const customers = useMemo(() => {
    const map = new Map<string, { name: string; email: string; phone: string; quotes: number; lastActivity: number }>();
    for (const quote of quotes) {
      const name = quote.customerName.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const current = map.get(key);
      map.set(key, { name, email: quote.customerEmail || current?.email || '', phone: quote.customerPhone || current?.phone || '', quotes: (current?.quotes || 0) + 1, lastActivity: Math.max(current?.lastActivity || 0, quote.updatedAt) });
    }
    return Array.from(map.values()).sort((a, b) => b.lastActivity - a.lastActivity);
  }, [quotes]);

  const filteredQuotes = useMemo(() => quotes.filter((quote) => {
    const query = quoteSearch.trim().toLowerCase();
    const matchesQuery = !query || [quote.number, quote.customerName, quote.propertySummary, quote.serviceItems.join(' ')].join(' ').toLowerCase().includes(query);
    return matchesQuery && (quoteStatusFilter === 'All' || quote.status === quoteStatusFilter);
  }), [quotes, quoteSearch, quoteStatusFilter]);

  const filteredJobs = useMemo(() => jobs.filter((job) => jobStatusFilter === 'All' || job.status === jobStatusFilter), [jobs, jobStatusFilter]);
  const filteredCustomers = useMemo(() => customers.filter((customer) => !customerSearch.trim() || [customer.name, customer.email, customer.phone].join(' ').toLowerCase().includes(customerSearch.trim().toLowerCase())), [customers, customerSearch]);
  const inboxUnread = useMemo(() => inboxMessages.filter((message) => message.status === 'new').length, [inboxMessages]);
  const inboxNeedsReview = useMemo(() => inboxMessages.filter((message) => message.needsHumanReview).length, [inboxMessages]);
  const filteredInboxMessages = useMemo(() => inboxMessages.filter((message) => {
    if (inboxFilter === 'Needs review') return message.needsHumanReview;
    if (inboxFilter === 'Inquiries') return message.category === 'inquiry';
    if (inboxFilter === 'Questions') return message.category === 'query';
    if (inboxFilter === 'Feedback') return message.category === 'feedback';
    if (inboxFilter === 'Complaints') return message.category === 'complaint';
    if (inboxFilter === 'Quote replies') return message.category === 'quote_response';
    return true;
  }), [inboxMessages, inboxFilter]);
  const selectedInboxMessage = inboxMessages.find((message) => message.id === selectedInboxId) || filteredInboxMessages[0] || null;

  const selectedQuote = quotes.find((quote) => quote.id === selectedQuoteId) || null;
  const selectedQuoteTotal = selectedQuote ? (Number.parseFloat(selectedQuote.basePrice) || 0) + (Number.parseFloat(selectedQuote.extras) || 0) : 0;
  const quoteCanBeReady = Boolean(selectedQuote && selectedQuote.customerName.trim() && selectedQuoteTotal > 0 && selectedQuote.checkedFollowUps.length === selectedQuote.followUpItems.length);
  const pageTitle: Record<View, string> = { overview: 'Today', inbox: 'Inbox', intake: 'Review inquiry', quotes: selectedQuote ? selectedQuote.number : 'Quotes', jobs: 'Jobs', customers: 'Customers', settings: 'Settings' };

  const navigate = (next: View) => { setView(next); setError(''); if (next !== 'quotes') setSelectedQuoteId(''); if (next !== 'inbox') setSelectedInboxId(''); };
  const newInquiry = () => { setView('intake'); setInquiry(''); setResult(''); setError(''); setCopied(false); setLastRunAt(null); setLastModel(''); setActiveBriefId(''); setSelectedQuoteId(''); };

  const handleAnalyze = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = inquiry.trim();
    if (!trimmed || trimmed.length > 20000 || loading) return;
    setLoading(true); setError(''); setResult(''); setCopied(false);
    try {
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inquiry: trimmed }) });
      const data: { result?: string; model?: string; error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error || 'The local analysis request failed.');
      const now = Date.now();
      const brief: BriefRecord = { id: `${now}-${Math.random().toString(36).slice(2, 8)}`, inquiry: trimmed, result: data.result || 'No structured brief was returned.', createdAt: now, model: data.model || '' };
      setResult(brief.result); setLastRunAt(now); setLastModel(brief.model); setActiveBriefId(brief.id); setView('intake');
      setBriefs((current) => [brief, ...current.filter((item) => item.inquiry !== trimmed)]);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Something went wrong while processing the inquiry.'); }
    finally { setLoading(false); }
  };

  const openBrief = (brief: BriefRecord) => { setInquiry(brief.inquiry); setResult(brief.result); setLastRunAt(brief.createdAt); setLastModel(brief.model); setActiveBriefId(brief.id); setView('intake'); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const updateInboxMessage = async (messageId: string, patch: { status?: InboxStatus; category?: InboxCategory; needsHumanReview?: boolean }) => {
    try {
      const response = await fetch('/api/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, ...patch }),
      });
      const data: { message?: InboxMessage; error?: string } = await response.json();
      if (!response.ok || !data.message) throw new Error(data.error || 'Could not update the inbox message.');
      setInboxMessages((current) => current.map((item) => item.id === messageId ? data.message as InboxMessage : item));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update the inbox message.');
      return false;
    }
  };

  const openInboxAsIntake = async (message: InboxMessage) => {
    setInquiry(message.body);
    setResult('');
    setActiveBriefId('');
    setLastRunAt(null);
    setLastModel('');
    setView('intake');
    setSelectedInboxId('');
    if (message.status === 'new') await updateInboxMessage(message.id, { status: 'in_progress' });
  };

  const copyText = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setError('Copy failed. Your browser did not allow clipboard access.'); }
  };

  const downloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  };

  const downloadQuote = (quote: QuoteRecord) => {
    const text = [`# ${settings.businessName} — ${quote.number}`, '', `Customer: ${quote.customerName || 'Missing'}`, `Email: ${quote.customerEmail || 'Missing'}`, `Phone: ${quote.customerPhone || 'Missing'}`, `Property: ${quote.propertySummary || 'Missing'}`, `Cleaning date: ${quote.cleaningDate || 'Missing'}`, quote.relatedDate ? `Related date: ${quote.relatedDate}` : '', '', '## Services', ...quote.serviceItems.map((item) => `- ${cleanItem(item)}`), '', `Base service: ${money(quote.basePrice, settings.currency)}`, `Extras: ${money(quote.extras, settings.currency)}`, `Total: ${money(selectedQuoteTotal || ((Number.parseFloat(quote.basePrice) || 0) + (Number.parseFloat(quote.extras) || 0)), settings.currency)}`, '', '## Customer note', quote.note || '', '', '## Terms', quote.terms || settings.terms].filter(Boolean).join('\n');
    downloadText(text, `tasktuck-${quote.number}.md`);
  };

  const sendQuoteEmail = async () => {
    if (!selectedQuote || sendingQuote) return;
    if (!quoteCanBeReady) {
      setError('Resolve all quote checks, add a valid customer email, and make sure the total is above zero before sending.');
      return;
    }

    setSendingQuote(true);
    setQuoteSentMessage('');
    setError('');

    try {
      await saveWorkspaceNow();
      const response = await fetch('/api/quotes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: selectedQuote.id }),
      });
      const data: { ok?: boolean; sentTo?: string; error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error || 'The quote email could not be sent.');

      updateQuote({ sentAt: Date.now(), sentTo: data.sentTo || selectedQuote.customerEmail });
      setQuoteSentMessage('Quote emailed to ' + (data.sentTo || selectedQuote.customerEmail) + '.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'The quote email could not be sent.');
    } finally {
      setSendingQuote(false);
    }
  };

  const createQuoteFromBrief = () => {
    if (!result) return;
    const contact = getContactFromInquiry(inquiry); const now = Date.now();
    const quote: QuoteRecord = { id: `${now}-${Math.random().toString(36).slice(2, 8)}`, number: nextQuoteNumber(quotes), briefId: activeBriefId, createdAt: now, updatedAt: now, customerName: customerName.trim(), customerEmail: contact.email, customerPhone: contact.phone, propertySummary, serviceItems: serviceItems.filter((item) => !/^requested cleaning services:?$/i.test(item)), cleaningDate, relatedDate, accessDetails, constraintItems: constraintItems.map(cleanItem).filter(Boolean), followUpItems: followUpItems.map(cleanItem).filter(Boolean), checkedFollowUps: [], basePrice: '', extras: '', note: settings.defaultNote, terms: settings.terms, status: 'Draft' };
    setQuotes((current) => [quote, ...current]); setSelectedQuoteId(quote.id); setView('quotes'); setError('');
  };

  const updateQuote = (patch: Partial<QuoteRecord>) => {
    if (!selectedQuoteId) return;
    setQuotes((current) => current.map((quote) => quote.id === selectedQuoteId ? { ...quote, ...patch, updatedAt: Date.now(), status: patch.status || (quote.status === 'Ready to send' ? 'Draft' : quote.status) } : quote));
  };
  const toggleQuoteFollowUp = (item: string) => { if (!selectedQuote) return; updateQuote({ checkedFollowUps: selectedQuote.checkedFollowUps.includes(item) ? selectedQuote.checkedFollowUps.filter((value) => value !== item) : [...selectedQuote.checkedFollowUps, item] }); };
  const markQuoteReady = () => {
    if (!selectedQuote) return;
    if (!selectedQuote.customerName.trim()) { setError('Add a customer name before marking this quote ready.'); return; }
    if (selectedQuoteTotal <= 0) { setError('Add a base service price before marking this quote ready.'); return; }
    if (selectedQuote.checkedFollowUps.length < selectedQuote.followUpItems.length) { setError('Finish the missing details before sending.'); return; }
    updateQuote({ status: 'Ready to send' }); setError('');
  };
  const createJobFromQuote = () => {
    if (!selectedQuote || selectedQuote.status !== 'Ready to send') return;
    const existing = jobs.find((job) => job.quoteId === selectedQuote.id);
    if (existing) { setView('jobs'); setSelectedQuoteId(''); return; }
    const job: JobRecord = { id: `job-${selectedQuote.id}`, quoteId: selectedQuote.id, quoteNumber: selectedQuote.number, createdAt: selectedQuote.updatedAt, updatedAt: selectedQuote.updatedAt, customerName: selectedQuote.customerName, propertySummary: selectedQuote.propertySummary, serviceSummary: selectedQuote.serviceItems.map(cleanItem).slice(0, 3).join(' · '), cleaningDate: selectedQuote.cleaningDate, status: 'Ready to schedule' };
    setJobs((current) => [job, ...current]); setView('jobs'); setSelectedQuoteId('');
  };
  const updateJobStatus = (jobId: string, status: JobStatus) => setJobs((current) => current.map((job) => job.id === jobId ? { ...job, status, updatedAt: Date.now() } : job));

  const printQuote = () => {
    document.body.classList.add('tasktuck-printing');
    window.setTimeout(() => { window.print(); window.setTimeout(() => document.body.classList.remove('tasktuck-printing'), 100); }, 0);
  };

  const navItems: { view: View; label: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
    { view: 'overview', label: 'Today', icon: 'overview' }, { view: 'inbox', label: 'Inbox', icon: 'inbox' }, { view: 'quotes', label: 'Quotes', icon: 'quote' }, { view: 'jobs', label: 'Jobs', icon: 'jobs' }, { view: 'customers', label: 'Customers', icon: 'customers' }, { view: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <main className="min-h-screen bg-[#f5f7f8] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-[238px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex h-[72px] items-center gap-3 border-b border-slate-200 px-5"><TaskTuckMark /><div className="min-w-0"><div className="flex items-center gap-2"><span className="truncate text-sm font-bold tracking-tight text-slate-950">{settings.businessName}</span></div><div className="mt-0.5 text-[11px] text-slate-500">Cleaning business</div></div></div>
          <div className="px-3 pt-5"><button type="button" onClick={newInquiry} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"><Icon name="plus" /> New inquiry</button></div>
          <nav className="space-y-1 px-3 pt-5" aria-label="Primary navigation"><div className="px-2 pb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Main menu</div>{navItems.map((item) => <button key={item.view} type="button" onClick={() => navigate(item.view)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${view === item.view ? 'bg-teal-50 text-teal-800' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}><Icon name={item.icon} /><span className="flex-1">{item.label}</span>{item.view === 'inbox' && inboxUnread > 0 && <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white">{inboxUnread > 99 ? '99+' : inboxUnread}</span>}</button>)}</nav>
          <div className="mt-auto p-3"><div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-center gap-2 text-[11px] font-semibold text-slate-800"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />TaskTuck is ready</div><p className="mt-2 text-[10px] leading-5 text-slate-500">Customer messages and quotes are saved automatically.</p></div></div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur sm:px-8"><div><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{view === 'overview' ? 'Today' : 'TaskTuck'}</div><h1 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-950">{pageTitle[view]}</h1></div><div className="flex items-center gap-3"><button type="button" onClick={newInquiry} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"><Icon name="plus" /> New inquiry</button><button type="button" onClick={async () => { await saveWorkspaceNow(); await authClient.signOut(); }} className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800">Sign out</button></div></header>
          <div className="border-b border-slate-200 bg-white px-4 py-2 lg:hidden"><div className="flex gap-1 overflow-x-auto">{navItems.map((item) => <button key={item.view} type="button" onClick={() => navigate(item.view)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold ${view === item.view ? 'bg-teal-50 text-teal-800' : 'text-slate-500'}`}><Icon name={item.icon} />{item.label}</button>)}</div></div>

          <main className="mx-auto max-w-[1480px] px-5 py-6 sm:px-8">
            {view === 'overview' && <div className="space-y-6">
              <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
                <div>
                  <div className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-teal-700">Today</div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Keep the next job moving.</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">See what needs attention, what is ready to send, and what is already in progress.</p>
                </div>
                <button type="button" onClick={newInquiry} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"><Icon name="plus" /> New inquiry</button>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Needs attention</div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{inboxNeedsReview + draftQuotes}</div>
                    <p className="mt-1 text-sm text-slate-500">{inboxNeedsReview ? `${inboxNeedsReview} message${inboxNeedsReview === 1 ? '' : 's'} need review` : 'No messages need review'}{draftQuotes ? ` · ${draftQuotes} draft quote${draftQuotes === 1 ? '' : 's'}` : ''}.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(inboxUnread > 0 || inboxNeedsReview > 0) && <button type="button" onClick={() => navigate('inbox')} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2.5 text-[11px] font-semibold text-white"><Icon name="inbox" /> Review inbox</button>}
                    {draftQuotes > 0 && <button type="button" onClick={() => navigate('quotes')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-semibold text-slate-600"><Icon name="quote" /> Finish quotes</button>}
                    {!inboxNeedsReview && !draftQuotes && <button type="button" onClick={newInquiry} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-semibold text-slate-600"><Icon name="plus" /> Start a new inquiry</button>}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
                  <span><span className="font-semibold text-slate-800">{inboxUnread}</span> new message{inboxUnread === 1 ? '' : 's'}</span>
                  <span><span className="font-semibold text-slate-800">{readyQuotes}</span> quote{readyQuotes === 1 ? '' : 's'} ready to send</span>
                  <span><span className="font-semibold text-slate-800">{totalJobs}</span> job{totalJobs === 1 ? '' : 's'} in the queue</span>
                </div>
              </section>
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><div className="text-sm font-semibold text-slate-950">Recent quotes</div><div className="mt-0.5 text-[11px] text-slate-500">Your latest customer work</div></div><button type="button" onClick={() => navigate('quotes')} className="text-[11px] font-semibold text-teal-700">View all</button></div>
                {quotes.length ? <div className="divide-y divide-slate-100">{quotes.slice(0, 6).map((quote) => <button key={quote.id} type="button" onClick={() => { setSelectedQuoteId(quote.id); setView('quotes'); }} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50"><div className="min-w-0"><div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-900">{quote.number}</span><span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${quote.status === 'Ready to send' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{quote.status}</span></div><div className="mt-1 truncate text-xs text-slate-500">{quote.customerName || 'Customer name missing'} · {quote.propertySummary || 'Property details missing'}</div></div><div className="shrink-0 text-right"><div className="text-xs font-semibold text-slate-900">{money(Number.parseFloat(quote.basePrice || '0') + Number.parseFloat(quote.extras || '0'), settings.currency)}</div><div className="mt-1 text-[10px] text-slate-400">{formatDate(quote.updatedAt)}</div></div></button>)}</div> : <div className="px-5 py-12 text-center"><div className="text-sm font-semibold text-slate-700">No quotes yet</div><p className="mt-1.5 text-xs text-slate-400">Start with a customer inquiry and TaskTuck will help turn it into a quote.</p><button type="button" onClick={newInquiry} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2.5 text-[11px] font-semibold text-white"><Icon name="plus" /> New inquiry</button></div>}
              </section>
            </div>}
            {view === 'inbox' && <div className="space-y-5">
              <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
                <div>
                  <div className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-teal-700">Customer messages</div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Inbox</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Customer messages land here. Review what matters and turn the right ones into quotes.</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><div className="text-[10px] text-slate-400">New</div><div className="mt-1 text-lg font-semibold text-slate-900">{inboxUnread}</div></div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><div className="text-[10px] text-slate-400">Needs attention</div><div className="mt-1 text-lg font-semibold text-slate-900">{inboxNeedsReview}</div></div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><div className="text-[10px] text-slate-400">Total</div><div className="mt-1 text-lg font-semibold text-slate-900">{inboxMessages.length}</div></div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {(['All', 'Inquiries', 'Questions', 'Feedback', 'Complaints', 'Quote replies', 'Needs review'] as const).map((filter) => (
                    <button key={filter} type="button" onClick={() => { setInboxFilter(filter); setSelectedInboxId(''); }} className={`rounded-lg px-3 py-2 text-[11px] font-semibold ${inboxFilter === filter ? 'bg-teal-50 text-teal-800' : 'text-slate-500 hover:bg-slate-50'}`}>{filter === 'Needs review' ? 'Needs attention' : filter}{filter === 'Needs review' && inboxNeedsReview > 0 ? ` · ${inboxNeedsReview}` : ''}</button>
                  ))}
                  <button type="button" onClick={() => { void loadInbox(); }} className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">{inboxLoading ? 'Refreshing…' : 'Refresh'}</button>
                </div>
              </section>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <div className="text-sm font-semibold text-slate-950">Customer messages</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{filteredInboxMessages.length} matching message{filteredInboxMessages.length === 1 ? '' : 's'}</div>
                  </div>
                  {filteredInboxMessages.length ? <div className="divide-y divide-slate-100">{filteredInboxMessages.map((message) => {
                    const categoryLabel = ({ inquiry: 'Inquiry', query: 'Question', feedback: 'Feedback', complaint: 'Complaint', quote_response: 'Quote reply', spam: 'Spam', other: 'Other' } as Record<InboxCategory, string>)[message.category];
                    const active = selectedInboxMessage?.id === message.id;
                    return <button key={message.id} type="button" onClick={() => setSelectedInboxId(message.id)} className={`w-full border-l-2 px-4 py-4 text-left transition ${active ? 'border-teal-500 bg-teal-50/60' : 'border-transparent hover:bg-slate-50'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><span className="truncate text-xs font-semibold text-slate-900">{message.customerName || message.fromEmail || 'Unknown customer'}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-600">{categoryLabel}</span>{message.needsHumanReview && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-700">Review</span>}</div>
                          <div className="mt-1 truncate text-xs text-slate-700">{message.subject}</div>
                          <div className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">{message.summary || message.preview}</div>
                        </div>
                        <div className="shrink-0 text-right text-[10px] text-slate-400">{formatTime(message.receivedAt)}<div className="mt-1">{message.status === 'new' ? 'New' : message.status.replace('_', ' ')}</div></div>
                      </div>
                    </button>;
                  })}</div> : <div className="px-5 py-14 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Icon name="inbox" /></div><div className="mt-4 text-sm font-semibold text-slate-700">{inboxMessages.length ? 'Nothing in this filter' : 'Your inbox is ready'}</div><p className="mt-1.5 text-xs leading-5 text-slate-400">{inboxMessages.length ? 'Try another filter.' : 'Forward customer mail to your TaskTuck address in Settings to start receiving messages.'}</p></div>}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {selectedInboxMessage ? <div className="p-5">
                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-teal-700">{({ inquiry: 'Inquiry', query: 'Question', feedback: 'Feedback', complaint: 'Complaint', quote_response: 'Quote reply', spam: 'Spam', other: 'Other' } as Record<InboxCategory, string>)[selectedInboxMessage.category]}</span>
                          {selectedInboxMessage.secondaryCategory !== 'none' && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-semibold text-slate-500">Also {selectedInboxMessage.secondaryCategory.replace('_', ' ')}</span>}
                          {selectedInboxMessage.needsHumanReview && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-semibold text-amber-700">Needs review</span>}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">{selectedInboxMessage.subject}</h3>
                        <div className="mt-1 text-[11px] text-slate-500">{selectedInboxMessage.customerName || 'Unknown customer'} · {selectedInboxMessage.fromEmail || 'Email missing'} · {formatDate(selectedInboxMessage.receivedAt)} {formatTime(selectedInboxMessage.receivedAt)}</div>
                      </div>
                      <select value={selectedInboxMessage.status} onChange={(event) => { void updateInboxMessage(selectedInboxMessage.id, { status: event.target.value as InboxStatus }); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 outline-none">
                        <option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="archived">Archived</option>
                      </select>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">Summary</div><p className="mt-2 text-xs leading-5 text-slate-700">{selectedInboxMessage.summary || selectedInboxMessage.preview}</p></div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="flex items-center justify-between gap-3"><div className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">TaskTuck check</div><span className="text-[10px] font-bold text-slate-600">{Math.round(selectedInboxMessage.confidence * 100)}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.round(selectedInboxMessage.confidence * 100)}%` }} /></div><p className="mt-2 text-[11px] leading-5 text-slate-500">{selectedInboxMessage.needsHumanReview ? 'Needs your review before you act on this message.' : (selectedInboxMessage.suggestedAction || 'Review this message.')}</p></div>
                    </div>

                    <div className="mt-5 rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">Original message</div><button type="button" onClick={() => { void copyText(selectedInboxMessage.body); }} className="text-[10px] font-semibold text-slate-500 hover:text-slate-800">{copied ? 'Copied' : 'Copy'}</button></div>
                      <div className="max-h-[360px] overflow-auto whitespace-pre-wrap px-4 py-4 text-xs leading-6 text-slate-700">{selectedInboxMessage.body}</div>
                    </div>

                    {selectedInboxMessage.attachments.length > 0 && <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">Files</div><div className="mt-2 flex flex-wrap gap-2">{selectedInboxMessage.attachments.map((attachment) => <span key={attachment.filename} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] text-slate-600">{attachment.filename}</span>)}</div></div>}

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => { void openInboxAsIntake(selectedInboxMessage); }} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2.5 text-[11px] font-semibold text-white"><Icon name="spark" />Review inquiry</button>
                      {selectedInboxMessage.needsHumanReview ? <button type="button" onClick={() => { void updateInboxMessage(selectedInboxMessage.id, { needsHumanReview: false }); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-semibold text-slate-600">Mark reviewed</button> : <span className="rounded-lg bg-emerald-50 px-3 py-2.5 text-[11px] font-semibold text-emerald-700">Looks good</span>}
                      {selectedInboxMessage.linkedQuoteId && <button type="button" onClick={() => { setSelectedQuoteId(selectedInboxMessage.linkedQuoteId); setView('quotes'); setSelectedInboxId(''); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-semibold text-slate-600">Open quote</button>}
                      <select value={selectedInboxMessage.category} onChange={(event) => { void updateInboxMessage(selectedInboxMessage.id, { category: event.target.value as InboxCategory }); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-semibold text-slate-600 outline-none">
                        <option value="inquiry">Inquiry</option><option value="query">Question</option><option value="feedback">Feedback</option><option value="complaint">Complaint</option><option value="quote_response">Quote reply</option><option value="spam">Spam</option><option value="other">Other</option>
                      </select>
                    </div>
                  </div> : <div className="flex min-h-[500px] items-center justify-center px-8 text-center text-xs text-slate-400">Select a message to review.</div>}
                </section>
              </div>
            </div>}

            {view === 'intake' && <div className="space-y-5"><section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
                <div>
                  <div className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-teal-700">Review inquiry</div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Turn a customer message into a quote.</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Paste the message. TaskTuck pulls out the details you need to price the job and shows what is still unclear.</p>
                </div>
                <button type="button" onClick={newInquiry} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"><Icon name="plus" /> New inquiry</button>
              </section>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]"><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><div className="text-sm font-semibold text-slate-950">Customer message</div><div className="mt-0.5 text-[11px] text-slate-500">Email, form message, voicemail transcript, or note</div></div><div className="hidden items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:flex"><span className={`h-1.5 w-1.5 rounded-full ${loading ? 'bg-amber-500' : result ? 'bg-emerald-500' : 'bg-teal-500'}`} />{loading ? 'Analyzing' : result ? 'Brief ready' : 'Ready to review'}</div></div><div className="p-5"><div className="mb-3 flex flex-wrap gap-2">{SAMPLES.map((sample) => <button key={sample.label} type="button" onClick={() => { setInquiry(sample.text); setResult(''); setError(''); setActiveBriefId(''); }} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800">Use {sample.label}</button>)}</div><form id="analyze-form" onSubmit={handleAnalyze}><div className="relative"><textarea aria-label="Customer inquiry" className="min-h-[300px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50/80 p-4 pb-10 text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400 focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-500/10" placeholder="Paste the customer message here…" value={inquiry} onChange={(event) => { setInquiry(event.target.value); if (error) setError(''); }} disabled={loading} /><div className="pointer-events-none absolute bottom-3 left-4 right-4 flex items-center justify-between text-[10px] text-slate-400"><span>Ctrl/⌘ + Enter to analyze</span><span className={inquiry.length > 20000 ? 'font-semibold text-rose-600' : ''}>{inquiry.length.toLocaleString()} / 20,000</span></div></div><div className="mt-3 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"><button type="button" onClick={newInquiry} disabled={!inquiry && !result} className="text-xs font-medium text-slate-500 hover:text-slate-800 disabled:opacity-40">Start over</button><button type="submit" disabled={!inquiry.trim() || inquiry.length > 20000 || loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">{loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Building quote details</> : <>Build quote details <Icon name="arrow" /></>}</button></div></form></div></section><aside className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><div className="text-sm font-semibold text-slate-950">Recent inquiries</div><div className="mt-0.5 text-[11px] text-slate-500">Saved automatically</div></div>{briefs.length > 0 && <button type="button" onClick={() => setBriefs([])} className="text-[10px] font-semibold text-slate-400 hover:text-slate-700">Clear</button>}</div>{briefs.length ? <div className="mt-4 space-y-1.5">{briefs.slice(0, 8).map((brief) => <button key={brief.id} type="button" onClick={() => openBrief(brief)} className={`w-full rounded-xl border px-3 py-2.5 text-left ${brief.id === activeBriefId ? 'border-teal-200 bg-teal-50' : 'border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white'}`}><div className="truncate text-xs font-semibold text-slate-800">{getJobLabel(brief.inquiry)}</div><div className="mt-1 flex items-center justify-between text-[10px] text-slate-400"><span>{formatDate(brief.createdAt)}</span><span>{formatTime(brief.createdAt)}</span></div></button>)}</div> : <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-[11px] leading-5 text-slate-400">Your analyzed inquiries will appear here.</div>}</section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-semibold text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><Icon name="spark" /></span>What TaskTuck checks</div><p className="mt-2 text-[11px] leading-5 text-slate-500">TaskTuck looks for the details usually needed before pricing a job.</p><div className="mt-4 grid grid-cols-2 gap-2">{BRIEF_SECTIONS.map((item) => <div key={item} className="rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] font-medium text-slate-600">{item.replace(' & ', ' + ')}</div>)}</div></section></aside></div>
              {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"><span className="font-semibold">Action needed.</span> {error}</div>}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${result ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}><Icon name={result ? 'check' : 'spark'} /></div><div><div className="text-sm font-semibold text-slate-950">Quote details</div><div className="mt-0.5 text-[11px] text-slate-500">{result ? `Ready · ${lastRunAt ? formatTime(lastRunAt) : ''}${lastModel ? ` · ${lastModel}` : ''}` : 'Paste a customer message to get started.'}</div></div></div><div className="flex flex-wrap gap-2">{result && <button type="button" onClick={() => copyText(result)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600"><Icon name="copy" />{copied ? 'Copied' : 'Copy'}</button>}{result && <button type="button" onClick={() => downloadText(result, `tasktuck-brief-${new Date().toISOString().slice(0, 10)}.md`)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600"><Icon name="download" />Export .md</button>}{result && <button type="button" onClick={createQuoteFromBrief} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-semibold text-white"><Icon name="quote" />Create quote</button>}</div></div><div className="px-5 py-6 sm:px-7">{result ? <div className="space-y-4"><div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900"><span className="font-semibold">Details ready.</span> Check the details, then create the quote.</div><div className="grid gap-3 md:grid-cols-2">{sections.filter((section) => section.title !== 'Follow-up checklist').map((section) => <section key={section.title} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{section.title}</div><div className="mt-3 space-y-2">{section.items.length ? section.items.map((item, index) => <p key={`${section.title}-${index}`} className={`text-xs leading-5 ${/not provided/i.test(item) ? 'text-slate-400' : 'text-slate-700'}`}>{cleanItem(item)}</p>) : <p className="text-xs text-slate-400">Missing</p>}</div></section>)}</div>{followUpItems.length > 0 && <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4"><div className="flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">Missing details</div><p className="mt-1 text-xs text-amber-900/70">These details are still unclear.</p></div><span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold text-amber-700">{followUpItems.length} items</span></div><div className="mt-3 grid gap-2 md:grid-cols-2">{followUpItems.map((item) => <div key={item} className="rounded-lg border border-amber-200/80 bg-white/70 px-3 py-2.5 text-xs text-slate-700">{cleanItem(item)}</div>)}</div></section>}</div> : <div className="flex min-h-[180px] items-center justify-center text-center"><div><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Icon name="spark" /></div><div className="mt-4 text-sm font-semibold text-slate-700">Start with a customer message</div><p className="mt-1.5 text-xs text-slate-400">Paste a message and TaskTuck will pull out the details here.</p></div></div>}</div></section></div>}

            {view === 'quotes' && <div className="space-y-5">{!selectedQuote ? <><section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-teal-700">Quotes</div><h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Quotes</h2><p className="mt-2 text-sm text-slate-500">Create, review, and send customer quotes.</p></div><button type="button" onClick={newInquiry} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white"><Icon name="plus" /> New inquiry</button></section><div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row"><label className="relative flex-1"><span className="sr-only">Search quotes</span><Icon name="search" /><input value={quoteSearch} onChange={(event) => setQuoteSearch(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-teal-300 focus:bg-white" placeholder="Search quote number, customer, or property…" /></label><select value={quoteStatusFilter} onChange={(event) => setQuoteStatusFilter(event.target.value as 'All' | QuoteStatus)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 outline-none"><option>All</option><option>Draft</option><option>Ready to send</option></select></div><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><div className="min-w-[760px]"><div className="grid grid-cols-[1.05fr_1.2fr_0.9fr_0.7fr_0.8fr] border-b border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"><span>Quote</span><span>Customer &amp; property</span><span>Cleaning</span><span>Price</span><span>Status</span></div>{filteredQuotes.length ? filteredQuotes.map((quote) => <button key={quote.id} type="button" onClick={() => setSelectedQuoteId(quote.id)} className="grid w-full grid-cols-[1.05fr_1.2fr_0.9fr_0.7fr_0.8fr] items-center border-b border-slate-100 px-5 py-4 text-left last:border-0 hover:bg-slate-50"><div><div className="text-xs font-semibold text-slate-900">{quote.number}</div><div className="mt-1 text-[10px] text-slate-400">{formatDate(quote.updatedAt)}</div></div><div className="min-w-0"><div className="truncate text-xs font-medium text-slate-800">{quote.customerName || 'Customer missing'}</div><div className="mt-1 truncate text-[10px] text-slate-400">{quote.propertySummary || 'Property missing'}</div></div><span className="text-xs text-slate-600">{present(quote.cleaningDate)}</span><span className="text-xs font-semibold text-slate-900">{money(Number.parseFloat(quote.basePrice || '0') + Number.parseFloat(quote.extras || '0'), settings.currency)}</span><span className={`justify-self-start rounded-full px-2 py-1 text-[9px] font-semibold ${quote.status === 'Ready to send' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{quote.status}</span></button>) : <div className="px-5 py-14 text-center text-xs text-slate-400">No matching quotes.</div>}</div></div></section></> : <>
              <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><button type="button" onClick={() => setSelectedQuoteId('')} className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold text-slate-500 hover:text-slate-800"><Icon name="back" /> Back to quotes</button><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-teal-700">Quote</div><h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{selectedQuote.number}</h2><p className="mt-1 text-sm text-slate-500">Check the details, set the price, and send it.</p></div><div className="flex flex-wrap gap-2">{selectedQuote.status === 'Ready to send' && <button type="button" onClick={createJobFromQuote} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-[11px] font-semibold text-white"><Icon name="jobs" /> Create job</button>}<button type="button" onClick={() => downloadQuote(selectedQuote)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600"><Icon name="download" /> Export</button><button type="button" onClick={() => void sendQuoteEmail()} disabled={!quoteCanBeReady || sendingQuote} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">{sendingQuote ? 'Sending…' : selectedQuote.sentAt ? 'Send again' : 'Send quote'}</button><button type="button" onClick={printQuote} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600"><Icon name="print" /> Print</button></div></section>
              {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{error}</div>}
              <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]"><div className="space-y-5">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Customer</div><div className="mt-1 text-[11px] text-slate-500">Add the basics before sending.</div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${selectedQuote.customerName ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{selectedQuote.customerName ? 'Ready' : 'Name needed'}</span></div><div className="mt-4 grid gap-3"><label><span className="text-xs font-medium text-slate-700">Quote number</span><input value={selectedQuote.number} onChange={(event) => updateQuote({ number: event.target.value.toUpperCase() })} placeholder="TT-0001" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono uppercase outline-none focus:border-teal-300 focus:bg-white" /></label><label><span className="text-xs font-medium text-slate-700">Customer name</span><input value={selectedQuote.customerName} onChange={(event) => updateQuote({ customerName: event.target.value })} placeholder="Customer name" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-300 focus:bg-white" /></label><div className="grid gap-3 sm:grid-cols-2"><label><span className="text-xs font-medium text-slate-700">Email</span><input type="email" value={selectedQuote.customerEmail} onChange={(event) => updateQuote({ customerEmail: event.target.value })} placeholder="customer@example.com" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-300 focus:bg-white" /></label><label><span className="text-xs font-medium text-slate-700">Phone</span><input value={selectedQuote.customerPhone} onChange={(event) => updateQuote({ customerPhone: event.target.value })} placeholder="Phone" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-300 focus:bg-white" /></label></div></div></section>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Scope</div><div className="mt-1 text-[11px] text-slate-500">Taken from the reviewed operations brief.</div><div className="mt-4 flex flex-wrap gap-2">{selectedQuote.propertySummary.split(' · ').filter(Boolean).map((value) => <span key={value} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700">{value}</span>)}{selectedQuote.accessDetails.slice(0, 2).map((value) => <span key={value} className="rounded-full border border-teal-100 bg-teal-50 px-2.5 py-1 text-[11px] text-teal-800">{cleanItem(value)}</span>)}</div><div className="mt-4 space-y-2">{selectedQuote.serviceItems.map((item) => <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700">{cleanItem(item)}</div>)}{selectedQuote.cleaningDate && <div className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs text-slate-700"><span className="font-semibold">Cleaning date:</span> {selectedQuote.cleaningDate}</div>}{selectedQuote.relatedDate && <div className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs text-slate-700"><span className="font-semibold">Related date:</span> {selectedQuote.relatedDate}</div>}</div></section>
                <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm"><div className="flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">Before you send</div><div className="mt-1 text-[11px] text-amber-900/70">Complete these details before sending.</div></div><span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold text-amber-700">{selectedQuote.checkedFollowUps.length}/{selectedQuote.followUpItems.length} done</span></div><div className="mt-3 space-y-2">{selectedQuote.followUpItems.length ? selectedQuote.followUpItems.map((item) => { const checked = selectedQuote.checkedFollowUps.includes(item); return <label key={item} className="flex cursor-pointer items-start gap-2 rounded-lg border border-amber-200/80 bg-white/70 px-3 py-2.5"><input type="checkbox" checked={checked} onChange={() => toggleQuoteFollowUp(item)} className="mt-0.5 accent-teal-600" /><span className={`text-xs leading-5 ${checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{cleanItem(item)}</span></label>; }) : <div className="rounded-lg bg-white/70 px-3 py-3 text-xs text-slate-500">No follow-up items were returned.</div>}</div></section>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Constraints & signals</div><div className="mt-1 text-[11px] text-slate-500">Details that may affect the job.</div></div><Icon name="edit" /></div><div className="mt-3 space-y-2">{selectedQuote.constraintItems.length ? selectedQuote.constraintItems.map((item) => <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-700">{cleanItem(item)}</div>) : <div className="text-xs text-slate-400">Missing</div>}</div></section>
              </div><div className="space-y-5"><section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Price</div><div className="mt-1 text-[11px] text-slate-500">Set the price. The total updates automatically.</div></div>{selectedQuote.status === 'Ready to send' ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">Ready to send</span> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">Draft</span>}</div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label><span className="text-xs font-medium text-slate-700">Base service</span><div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3"><span className="text-[10px] text-slate-400">{settings.currency}</span><input inputMode="decimal" value={selectedQuote.basePrice} onChange={(event) => updateQuote({ basePrice: event.target.value })} placeholder="0.00" className="w-full bg-transparent px-2 py-2.5 text-sm outline-none" /></div></label><label><span className="text-xs font-medium text-slate-700">Extras / add-ons</span><div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3"><span className="text-[10px] text-slate-400">{settings.currency}</span><input inputMode="decimal" value={selectedQuote.extras} onChange={(event) => updateQuote({ extras: event.target.value })} placeholder="0.00" className="w-full bg-transparent px-2 py-2.5 text-sm outline-none" /></div></label></div><div className="mt-5 flex flex-col gap-3 rounded-xl bg-slate-950 p-4 text-white sm:flex-row sm:items-end sm:justify-between"><div><div className="text-[10px] uppercase tracking-[0.14em] text-white/50">Total</div><div className="mt-1 text-3xl font-semibold tracking-tight">{money(selectedQuoteTotal, settings.currency)}</div><div className="mt-1 text-[10px] text-white/45">No automatic tax or fees</div></div><button type="button" onClick={markQuoteReady} disabled={!quoteCanBeReady || selectedQuote.status === 'Ready to send'} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-[11px] font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">{selectedQuote.status === 'Ready to send' ? <><Icon name="check" />Ready to send</> : <>Ready to send <Icon name="arrow" /></>}</button></div>{!quoteCanBeReady && selectedQuote.status !== 'Ready to send' && <div className="mt-3 text-[10px] text-amber-700">To send: add a customer name, enter a price above $0, and finish the missing details.</div>}</section>
                <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Message to customer</div><div className="mt-1 text-[11px] text-slate-500">This is the message the customer will receive.</div></div><div className="flex gap-3"><button type="button" onClick={() => updateQuote({ note: settings.defaultNote })} className="text-[10px] font-semibold text-teal-700">Use template</button><button type="button" onClick={() => copyText(selectedQuote.note)} className="text-[10px] font-semibold text-slate-500">{copied ? 'Copied' : 'Copy note'}</button></div></div><textarea value={selectedQuote.note} onChange={(event) => updateQuote({ note: event.target.value })} className="mt-4 min-h-[150px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 outline-none focus:border-teal-300 focus:bg-white" placeholder="Draft a customer-facing note here…" /><div className="mt-3 flex items-center justify-between text-[10px] text-slate-400"><span>{selectedQuote.sentAt ? 'Last emailed to ' + (selectedQuote.sentTo || selectedQuote.customerEmail) + ' · ' + formatDate(selectedQuote.sentAt) : 'Not sent yet.'}</span><span>{quoteSentMessage || 'Saved automatically'}</span></div></section>
                <section className="quote-print-area rounded-2xl border border-slate-300 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Customer sees</div><div className="mt-1 text-sm font-semibold text-slate-950">Quote preview</div></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-semibold text-slate-500">{selectedQuote.status}</span></div><div className="rounded-xl border border-slate-200 bg-white p-6"><div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5"><div><div className="text-lg font-semibold tracking-tight text-slate-950">{settings.businessName}</div><div className="mt-1 text-[11px] text-slate-500">Cleaning quote · {selectedQuote.number}</div>{(settings.email || settings.phone) && <div className="mt-2 text-[10px] text-slate-400">{[settings.email, settings.phone].filter(Boolean).join(' · ')}</div>}</div><div className="text-right text-[10px] text-slate-400">{formatDate(selectedQuote.updatedAt)}</div></div><div className="mt-5"><div className="text-base font-semibold text-slate-950">{selectedQuote.customerName || 'Customer name missing'}</div><div className="mt-1 text-[11px] text-slate-500">{selectedQuote.propertySummary || 'Property details missing'}</div></div><div className="mt-5 space-y-2 border-y border-slate-100 py-4">{selectedQuote.serviceItems.filter(Boolean).slice(0, 8).map((item) => <div key={item} className="flex gap-2 text-xs text-slate-700"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />{cleanItem(item)}</div>)}{selectedQuote.cleaningDate && <div className="pt-1 text-xs text-slate-500">Cleaning date: <span className="font-medium text-slate-800">{selectedQuote.cleaningDate}</span></div>}{selectedQuote.relatedDate && <div className="text-xs text-slate-500">Related date: <span className="font-medium text-slate-800">{selectedQuote.relatedDate}</span></div>}</div><div className="flex items-end justify-between gap-4 pt-5"><div className="max-w-[64%] whitespace-pre-wrap text-[10px] leading-5 text-slate-500">{selectedQuote.note || 'Customer note will appear here.'}</div><div className="text-right"><div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Total</div><div className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{money(selectedQuoteTotal, settings.currency)}</div></div></div>{(selectedQuote.terms || settings.terms) && <div className="mt-5 border-t border-slate-100 pt-4 text-[10px] leading-5 text-slate-400">{selectedQuote.terms || settings.terms}</div>}</div></section>
              </div></div></>}
            </div>}

            {view === 'jobs' && <div className="space-y-5"><section><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-teal-700">Work queue</div><h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Jobs</h2><p className="mt-2 text-sm text-slate-500">See jobs that need scheduling, are scheduled, or are done.</p></section><div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap gap-2">{(['All', 'Ready to schedule', 'Scheduled', 'Completed'] as const).map((status) => <button key={status} type="button" onClick={() => setJobStatusFilter(status)} className={`rounded-lg px-3 py-2 text-[11px] font-semibold ${jobStatusFilter === status ? 'bg-teal-50 text-teal-800' : 'text-slate-500 hover:bg-slate-50'}`}>{status}</button>)}</div></div><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{filteredJobs.length ? filteredJobs.map((job) => <div key={job.id} className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-900">{job.quoteNumber}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-500">{job.status}</span></div><div className="mt-1 text-xs font-medium text-slate-800">{job.customerName || 'Customer missing'}</div><div className="mt-1 text-[11px] text-slate-500">{job.propertySummary || 'Property missing'} · {job.serviceSummary || 'Service scope missing'}</div><div className="mt-1 text-[10px] text-slate-400">Cleaning date · {present(job.cleaningDate)}</div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setSelectedQuoteId(job.quoteId); setView('quotes'); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600">Open quote</button><select value={job.status} onChange={(event) => updateJobStatus(job.id, event.target.value as JobStatus)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 outline-none"><option>Ready to schedule</option><option>Scheduled</option><option>Completed</option></select></div></div>) : <div className="px-5 py-14 text-center text-xs text-slate-400">No jobs in this state.</div>}</section></div>}

            {view === 'customers' && <div className="space-y-5"><section><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-teal-700">Customers</div><h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Customers</h2><p className="mt-2 text-sm text-slate-500">Customer details are grouped from the quotes you save.</p></section><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><label className="relative block"><span className="sr-only">Search customers</span><span className="absolute left-3 top-3 text-slate-400"><Icon name="search" /></span><input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-teal-300 focus:bg-white" placeholder="Search customer, email, or phone…" /></label></div><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{filteredCustomers.length ? <div className="divide-y divide-slate-100">{filteredCustomers.map((customer) => <div key={customer.name} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-sm font-semibold text-slate-900">{customer.name}</div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500"><span>{customer.email || 'Email missing'}</span><span>{customer.phone || 'Phone missing'}</span></div></div><div className="text-left sm:text-right"><div className="text-xs font-semibold text-slate-800">{customer.quotes} quote{customer.quotes === 1 ? '' : 's'}</div><div className="mt-1 text-[10px] text-slate-400">Last activity · {formatDate(customer.lastActivity)}</div></div></div>)}</div> : <div className="px-5 py-14 text-center text-xs text-slate-400">No matching customers.</div>}</section></div>}

            {view === 'settings' && <div className="space-y-5"><section><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-teal-700">Settings</div><h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Settings</h2><p className="mt-2 text-sm text-slate-500">Business details, quote messages, and customer email setup.</p></section><div className="grid gap-5 xl:grid-cols-3"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-sm font-semibold text-slate-950">Business details</div><div className="mt-4 space-y-3"><label><span className="text-xs font-medium text-slate-700">Business name</span><input value={settings.businessName} onChange={(event) => setSettings((current) => ({ ...current, businessName: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-300 focus:bg-white" /></label><div className="grid gap-3 sm:grid-cols-2"><label><span className="text-xs font-medium text-slate-700">Email</span><input value={settings.email} onChange={(event) => setSettings((current) => ({ ...current, email: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-300 focus:bg-white" /></label><label><span className="text-xs font-medium text-slate-700">Phone</span><input value={settings.phone} onChange={(event) => setSettings((current) => ({ ...current, phone: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-300 focus:bg-white" /></label></div><label><span className="text-xs font-medium text-slate-700">Currency</span><select value={settings.currency} onChange={(event) => setSettings((current) => ({ ...current, currency: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-300 focus:bg-white"><option value="USD">USD — US Dollar</option><option value="CAD">CAD — Canadian Dollar</option><option value="GBP">GBP — British Pound</option><option value="EUR">EUR — Euro</option><option value="AUD">AUD — Australian Dollar</option><option value="INR">INR — Indian Rupee</option></select></label></div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-sm font-semibold text-slate-950">Quote message</div><div className="mt-4 space-y-3"><label><span className="text-xs font-medium text-slate-700">Default customer note</span><textarea value={settings.defaultNote} onChange={(event) => setSettings((current) => ({ ...current, defaultNote: event.target.value }))} className="mt-1 min-h-[130px] w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-6 outline-none focus:border-teal-300 focus:bg-white" /></label><label><span className="text-xs font-medium text-slate-700">Default terms</span><textarea value={settings.terms} onChange={(event) => setSettings((current) => ({ ...current, terms: event.target.value }))} className="mt-1 min-h-[120px] w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-6 outline-none focus:border-teal-300 focus:bg-white" /></label><div className="rounded-xl border border-teal-100 bg-teal-50/70 p-4"><div className="text-xs font-semibold text-teal-900">Saved to TaskTuck</div><p className="mt-1 text-[11px] leading-5 text-teal-900/60">Briefs, quotes, jobs, inbox messages, and settings are saved to your TaskTuck workspace.</p></div></div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-sm font-semibold text-slate-950">Customer email</div><p className="mt-1 text-[11px] leading-5 text-slate-500">Keep the business mailbox you already use. Forward customer mail into TaskTuck.</p><div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">Your TaskTuck email address</div><div className="mt-2 break-all text-sm font-semibold text-slate-900">{inboxAddress || 'Generating…'}</div><button type="button" onClick={() => { if (inboxAddress) void copyText(inboxAddress); }} disabled={!inboxAddress} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 disabled:opacity-40"><Icon name="copy" />Copy address</button></div><div className="mt-4 space-y-2 text-[11px] leading-5 text-slate-500"><p><span className="font-semibold text-slate-700">1.</span> TaskTuck's platform admin sets up one Cloudflare Email Routing rule for <span className="font-mono text-slate-700">inbox@task-tuck.com</span> → the <span className="font-semibold text-slate-700">task-tuck</span> Worker.</p><p><span className="font-semibold text-slate-700">2.</span> You create one forwarding/filter rule in your existing Gmail or Outlook mailbox and point it to the unique address above.</p><p><span className="font-semibold text-slate-700">3.</span> Keep the original mailbox copy. TaskTuck receives the forwarded message, AI triages it, and the team works it from Inbox.</p></div><div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/70 p-3 text-[10px] leading-5 text-teal-900">One forwarding setup is enough for the business. TaskTuck never needs the business's email password in this version.</div></section></div></div>}

            <footer className="mt-7 flex flex-col gap-1 border-t border-slate-200 py-5 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between"><span>{settings.businessName} · Cloud workspace</span><span>Inbox + AI via your configured workflow</span></footer>
          </main>
        </div>
      </div>
    </main>
  );
}
