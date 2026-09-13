'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [inquiry, setInquiry] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12 flex flex-col items-center selection:bg-blue-500/30">
      {/* Decorative top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-64 bg-gradient-to-b from-blue-500/10 via-transparent to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-3xl w-full flex flex-col gap-6 z-10">
        {/* Main Branding Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-blue-500/20 text-blue-400 uppercase border border-blue-500/30">
                v1.0 Local-GPU
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mt-1">
              QuoteFlow <span className="text-blue-500 font-medium">Ops</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Llama 3.2 Engaged
          </div>
        </div>

        {/* Action Panel Grid Layout */}
        <div className="grid grid-cols-1 gap-6">
          {/* Input Form Panel */}
          <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-slate-800 shadow-xl flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200 mb-1">Inbound Lead Source</h2>
              <p className="text-xs text-slate-400">
                Paste any unstructured customer email, voicemail transcript, or desk notes below.
              </p>
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
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-blue-600/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Executing GPU Inference Run...
                  </>
                ) : (
                  'Process Inquiry & Generate Audit Brief'
                )}
              </button>
            </form>
          </div>

          {/* System Error Display */}
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-mono flex gap-2 items-start shadow-md">
              <span className="font-bold text-rose-500">[ERROR]</span>
              <p className="break-all">{error}</p>
            </div>
          )}

          {/* Premium Formatted Executive Output Result */}
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
                  Copy Raw Output
                </button>
              </div>
              <div className="p-6 prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed font-sans shadow-inner">
                <ReactMarkdown 
                  components={{
                    h2: ({node, ...props}) => <h2 className="text-base font-bold text-white mt-4 mb-2 border-b border-slate-800 pb-1 first:mt-0" {...props} />,
                    strong: ({node, ...props}) => <strong className="text-blue-400 font-semibold" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1.5 my-3 text-slate-300" {...props} />,
                    li: ({node, ...props}) => <li className="marker:text-slate-500" {...props} />,
                  }}
                >
                  {result}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}