"use client";

import { useState, useRef } from "react";
import DepartmentSelector from "@/components/DepartmentSelector";
import MonthlyGrid from "@/components/MonthlyGrid";

export default function InputPage() {
  const [departmentId, setDepartmentId] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [year, setYear] = useState(2026);
  const [saveMsg, setSaveMsg] = useState("");

  // Bulk CSV upload state
  const [csvYear, setCsvYear] = useState(2026);
  const [csvType, setCsvType] = useState("forecast");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ ok?: boolean; count?: number; errors?: string[]; error?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaved = () => {
    setSaveMsg("Saved successfully!");
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const handleCsvUpload = async () => {
    if (!csvFile) return;
    setUploading(true);
    setUploadResult(null);

    try {
      const text = await csvFile.text();
      const lines = text.trim().split("\n");
      if (lines.length < 2) {
        setUploadResult({ error: "CSV file is empty or has no data rows." });
        setUploading(false);
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const hasDeptColumn = headers.includes("department");

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        if (cols.length < (hasDeptColumn ? 5 : 4)) continue;

        if (hasDeptColumn) {
          const deptIdx = headers.indexOf("department");
          const monthIdx = headers.indexOf("month");
          const salesIdx = headers.indexOf("grossbookedsales");
          const gmIdx = headers.indexOf("gmpercent");
          const cpIdx = headers.indexOf("cppercent");

          rows.push({
            department: cols[deptIdx],
            month: parseInt(cols[monthIdx]),
            grossBookedSales: parseFloat(cols[salesIdx]),
            gmPercent: parseFloat(cols[gmIdx]) / 100,
            cpPercent: parseFloat(cols[cpIdx]) / 100,
          });
        } else {
          rows.push({
            month: parseInt(cols[headers.indexOf("month")]),
            grossBookedSales: parseFloat(cols[headers.indexOf("grossbookedsales")]),
            gmPercent: parseFloat(cols[headers.indexOf("gmpercent")]) / 100,
            cpPercent: parseFloat(cols[headers.indexOf("cppercent")]) / 100,
          });
        }
      }

      const body: Record<string, unknown> = {
        rows,
        year: csvYear,
        type: csvType === "actuals" ? "actual" : "forecast",
      };

      // If no department column, we need a departmentId from the manual selector
      if (!hasDeptColumn) {
        if (!departmentId) {
          setUploadResult({ error: "CSV has no 'department' column — please select a department above, or add a 'department' column to your CSV." });
          setUploading(false);
          return;
        }
        body.departmentId = departmentId;
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setUploadResult(data);
      if (data.ok) {
        setCsvFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (err) {
      setUploadResult({ error: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Data Input
      </h1>

      {/* ── Bulk CSV Import ───────────────────────────────────────── */}
      <div className="bg-white rounded-lg border p-5 mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
          Bulk Import (CSV)
        </h2>

        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Year</label>
            <select
              value={csvYear}
              onChange={(e) => setCsvYear(parseInt(e.target.value))}
              className="border rounded px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-light"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <select
              value={csvType}
              onChange={(e) => setCsvType(e.target.value)}
              className="border rounded px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-light"
            >
              <option value="actuals">Actuals</option>
              <option value="forecast">Forecast</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">CSV File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => {
                setCsvFile(e.target.files?.[0] || null);
                setUploadResult(null);
              }}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-brand file:text-white hover:file:bg-brand-dark cursor-pointer"
            />
          </div>
          <button
            onClick={handleCsvUpload}
            disabled={!csvFile || uploading}
            className="px-5 py-2 bg-brand text-white rounded text-sm font-medium hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <a
            href="/template-import.csv"
            download
            className="text-brand hover:underline font-medium"
          >
            ↓ Download CSV template
          </a>
          <span>•</span>
          <span>
            Include a <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px]">department</code> column to upload all departments at once, or omit it and select a department below.
          </span>
        </div>

        {/* Upload result messages */}
        {uploadResult && (
          <div className={`mt-3 p-3 rounded text-sm ${uploadResult.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {uploadResult.ok ? (
              <>
                <strong>✓ Success!</strong> {uploadResult.count} rows imported.
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="mt-1 text-yellow-700">
                    <strong>Warnings:</strong>
                    <ul className="list-disc ml-5 mt-1">
                      {uploadResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <><strong>Error:</strong> {uploadResult.error}</>
            )}
          </div>
        )}
      </div>

      {/* ── Manual Entry ──────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
          Manual Entry
        </h2>

        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Department</label>
            <DepartmentSelector
              value={departmentId}
              onChange={(id, name) => {
                setDepartmentId(id);
                setDepartmentName(name);
              }}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="border rounded px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-light"
            >
              <option value={2025}>2025 (Actuals)</option>
              <option value={2026}>2026 (Actuals + YTG)</option>
            </select>
          </div>
          {saveMsg && (
            <span className="text-green-600 text-sm font-medium bg-green-50 px-3 py-1.5 rounded">
              {saveMsg}
            </span>
          )}
        </div>

        <MonthlyGrid
          departmentId={departmentId}
          departmentName={departmentName}
          year={year}
          onSaved={handleSaved}
        />
      </div>
    </div>
  );
}
