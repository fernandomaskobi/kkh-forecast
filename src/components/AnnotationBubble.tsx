"use client";

import { useState, useRef, useEffect } from "react";

type Annotation = {
  id: string;
  departmentId: string;
  year: number;
  month: number;
  text: string;
  author: string;
  createdAt: string;
};

type AnnotationBubbleProps = {
  departmentId: string;
  departmentName: string;
  year: number;
  month: number;
  annotations: Annotation[];
  onAdd: (text: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export default function AnnotationBubble({
  departmentName,
  year,
  month,
  annotations,
  onAdd,
  onDelete,
}: AnnotationBubbleProps) {
  const [open, setOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const count = annotations.length;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleAdd = async () => {
    if (!newText.trim()) return;
    setAdding(true);
    await onAdd(newText.trim());
    setNewText("");
    setAdding(false);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold transition-all ${
          count > 0
            ? "bg-amber-400 text-white hover:bg-amber-500 shadow-sm"
            : "bg-transparent text-gray-300 hover:text-gray-500 hover:bg-gray-100"
        }`}
        title={count > 0 ? `${count} note${count > 1 ? "s" : ""}` : "Add note"}
      >
        {count > 0 ? count : (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute z-50 top-5 left-0 w-64 bg-white rounded-xl border border-gray-200 shadow-xl"
        >
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 rounded-t-xl">
            <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
              {departmentName} — {monthNames[month - 1]} {year}
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {annotations.length === 0 && (
              <div className="px-3 py-4 text-center text-[10px] text-gray-400">
                No notes yet
              </div>
            )}
            {annotations.map((a) => (
              <div key={a.id} className="px-3 py-2 border-b border-gray-50 last:border-0 group">
                <p className="text-xs text-gray-700 leading-relaxed">{a.text}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] text-gray-400">
                    {a.author} &middot; {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => onDelete(a.id)}
                    className="text-[9px] text-gray-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="px-3 py-2 border-t border-gray-100 flex gap-1.5">
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Add a note..."
              className="flex-1 text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newText.trim()}
              className="px-2 py-1.5 bg-brand text-white text-[10px] font-semibold rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors"
            >
              {adding ? "..." : "Add"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
