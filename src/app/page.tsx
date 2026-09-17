'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [inquiry, setInquiry] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiry.trim()) return;

    setLoading(true);
    setResult('');
    setError('');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inquiry }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process backend request.');
      }

      setResult(data.result);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail.trim()) return;
    setWaitlistSuccess(true);
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12 flex flex-col items-center selection:bg-blue-500/30 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-64 bg-gradient-to-b from-blue-500/10 via-transparent to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-3xl w-full flex flex-col gap-6 z-10">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-blue-500/20 text-blue-400 uppercase border border-blue-500/30">
                v1.0 Local-GPU
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mt-1">
              TaskTuck <span className="text-blue-500 font-medium">Ops</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowWaitlist(true)}
              className="text-xs font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-4 py-2 rounded-xl shadow-lg shadow-orange-600/10 transition-all border border-amber-400/20 active:scale-95"
            >
              👑 Upgrade to Auto-Pilot ($29/mo)
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50 hidden sm:flex">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Llama 3.2 Engaged
            </div>
          </div>
        </div>

        {showWaitlist && (
          <div className="bg-gradient-to-r from-slate-950 to-slate-900 border border-amber-500/30 rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                ⚡ TaskTuck Pro Auto-Pilot
              </h3>
              <button 
                onClick={() => { setShowWaitlist(false); setWaitlistSuccess(false); setWaitlistEmail(''); }} 
                className="text-slate-500 hover:text-white transition-colors text-xs p-1"
              >
                ✕ Close Window Panel
              </button>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Stop copy-pasting customer inquiries manually. The Auto-Pilot integration tier securely connects directly to your active business Gmail or Outlook inbox routing parameters, reading inbound requests and generating structured Operations Briefs inside your CRM automatically.
            </p>

            {!waitlistSuccess ? (
              <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-2 mt-1">
                <input 
                  type="email" 
                  required
                  placeholder="Enter your operational business email..." 
                  className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-xs flex-1 outline-none focus:border-amber-500/50 text-slate-200 placeholder:text-slate-600 transition-colors shadow-inner"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                />
                <button 
                  type="submit" 
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-4 py-2 rounded-lg text-xs transition-all shadow-md active:scale-98"
                >
                  Lock Early Access Pricing
                </button>
              </form>
            ) : (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium animate-in fade-in duration-200">
                ✓ Access Locked! Early-bird pricing parameters registered. We will contact you at <span className="underline font-bold text-white">{waitlistEmail}</span> as soon as your secure inbox sync module finishes staging.
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-slate-800 shadow-xl flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-sm font-semibold text-slate-200 mb-1">Inbound Lead Source Pipeline</h2>
                <p className="text-xs text-slate-400">
                  Paste any unstructured customer email, voicemail transcript, or desk notes below.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                className="w-full h-44 p-4 bg-slate-950/60 border border-slate-800 rounded-xl focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 outline-none text-sm text-slate-300 resize-none transition-all placeholder:text-slate-600 font-sans shadow-inner"
                placeholder="Example: Paste messy customer email details here..."
                value={inquiry}
                onChange={(e) => setInquiry(e.target.value)}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-blue-600/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 select-none"
              >
                {loading ? 'Executing GPU Inference Run...' : 'Process Inquiry & Generate Audit Brief'}
              </button>
            </form>
          </div>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-mono flex gap-2 items-start shadow-md">
              <span className="font-bold text-rose-500">[ERROR]</span>
              <p className="break-all">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-gradient-to-b from-slate-800/60 to-slate-800/20 backdrop-blur-md rounded-xl border border-slate-700/40 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-slate-950/40 px-6 py-3.5 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  ⚡ Automated Operations Brief
                </span>
                <button 
                  onClick={() => navigator.clipboard.writeText(result)}
                  className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700 transition-colors"
                >
                  Copy Raw Output Brief
                </button>
              </div>
              <div className="p-6 prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed font-sans shadow-inner">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
