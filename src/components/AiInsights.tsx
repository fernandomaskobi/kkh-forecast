"use client";

import { useState } from "react";

type EntryData = {
  departmentName: string;
  year: number;
  month: number;
  grossBookedSales: number;
  gmPercent: number;
  cpPercent: number;
};

type AiInsightsProps = {
  entries: EntryData[];
};

export default function AiInsights({ entries }: AiInsightsProps) {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState("");

  const generateInsights = async () => {
    setLoading(true);
    setError(null);
    setInsights(null);

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: entries.map((e) => ({
            departmentName: e.departmentName,
            year: e.year,
            month: e.month,
            grossBookedSales: e.grossBookedSales,
            gmPercent: e.gmPercent,
            cpPercent: e.cpPercent,
          })),
          context: context.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate insights");
      } else {
        setInsights(data.insights);
      }
    } catch {
      setError("Network error — could not reach the AI service");
    } finally {
      setLoading(false);
    }
  };

  // Simple markdown renderer for bold, bullets, and headings
  const renderMarkdown = (md: string) => {
    const lines = md.split("\n");
    return lines.map((line, i) => {
      // Headings
      if (line.startsWith("## ")) {
        return (
          <h3 key={i} className="text-sm font-bold text-gray-800 mt-4 mb-1.5">
            {renderInline(line.slice(3))}
          </h3>
        );
      }
      // Bold numbered sections like "1. **Key Takeaways**"
      if (/^\d+\.\s+\*\*/.test(line)) {
        return (
          <h3 key={i} className="text-sm font-bold text-gray-800 mt-4 mb-1.5">
            {renderInline(line.replace(/^\d+\.\s+/, ""))}
          </h3>
        );
      }
      // Bullets
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <div key={i} className="flex gap-2 ml-1 mb-1">
            <span className="text-brand mt-0.5 flex-shrink-0">&#x2022;</span>
            <span className="text-xs text-gray-600 leading-relaxed">{renderInline(line.slice(2))}</span>
          </div>
        );
      }
      // Regular paragraph
      if (line.trim()) {
        return (
          <p key={i} className="text-xs text-gray-600 leading-relaxed mb-1">
            {renderInline(line)}
          </p>
        );
      }
      return <div key={i} className="h-1" />;
    });
  };

  const renderInline = (text: string) => {
    // Handle **bold** inline
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-gray-800">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="card p-4 w-full text-left hover:shadow-md transition-shadow group cursor-pointer border-dashed border-2 border-gray-200 bg-gradient-to-r from-violet-50/50 to-indigo-50/50"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">
              AI Forecast Insights
            </span>
            <span className="text-[10px] text-gray-400 block mt-0.5">
              Get AI-powered analysis of your forecast data
            </span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="card p-5 border-indigo-200 bg-gradient-to-br from-white to-indigo-50/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-800">AI Forecast Insights</h3>
        </div>
        <button
          onClick={() => { setOpen(false); setInsights(null); setError(null); }}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Optional context input */}
      {!insights && !loading && (
        <div className="mb-3">
          <input
            type="text"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Optional: ask a specific question (e.g., 'Why is CP% declining?')"
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 placeholder:text-gray-300"
          />
        </div>
      )}

      {!insights && !loading && !error && (
        <button
          onClick={generateInsights}
          className="w-full py-2.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          Generate AI Analysis
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-3 py-6">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-xs text-gray-400">Analyzing your forecast data...</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 mb-3">
          <p className="text-xs text-rose-700">{error}</p>
          <button
            onClick={generateInsights}
            className="text-xs text-rose-600 font-semibold mt-1 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {insights && (
        <div className="space-y-0.5">
          {renderMarkdown(insights)}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={generateInsights}
              className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Regenerate
            </button>
            <span className="text-[9px] text-gray-300">Powered by Claude</span>
          </div>
        </div>
      )}
    </div>
  );
}
