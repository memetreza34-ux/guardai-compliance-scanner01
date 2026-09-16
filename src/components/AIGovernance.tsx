import React from 'react';
import { BookOpenCheck, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

const REVIEWS = [
  { id: 'REV-092', system: 'Customer Support Chatbot (GPT-4)', status: 'requires_human_review', date: '2026-09-15', reviewer: 'Unassigned' },
  { id: 'REV-091', system: 'Sales Lead Scoring Model', status: 'reviewed', date: '2026-09-10', reviewer: 'Alice Chen' },
  { id: 'REV-090', system: 'Internal HR Document Search', status: 'reviewed', date: '2026-09-08', reviewer: 'Bob Smith' },
];

export function AIGovernance() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">AI Governance Guided Review</h1>
          <p className="text-sm text-slate-400 mt-1">Tenant-scoped structured AI-system declarations and review tracking.</p>
        </div>
        <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
          <BookOpenCheck className="w-4 h-4" />
          New Declaration
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Info panel */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-emerald-500" />
              Review Process
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              The Guided Review stores structured AI-system declarations without processing arbitrary customer prompts or outputs. 
              It separates documentation state from legal applicability, marking applicable systems for human review.
            </p>
            <div className="text-xs text-slate-500 bg-slate-950 p-3 rounded border border-slate-800/60 font-mono">
              status: requires_human_review
            </div>
          </div>
        </div>

        {/* List panel */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800/60 bg-slate-900/50">
            <h2 className="text-sm font-medium text-slate-200">Active & Historical Reviews</h2>
          </div>
          <div className="divide-y divide-slate-800/60">
            {REVIEWS.map((review) => (
              <div key={review.id} className="p-6 hover:bg-slate-800/30 transition-colors cursor-pointer group flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-sm font-medium text-slate-200 group-hover:text-emerald-400 transition-colors">
                      {review.system}
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                      {review.id}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {review.date}
                    </span>
                    <span>•</span>
                    <span>Reviewer: {review.reviewer}</span>
                  </div>
                </div>
                <div>
                  {review.status === 'reviewed' ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                      <AlertCircle className="w-3.5 h-3.5" /> Pending Review
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
