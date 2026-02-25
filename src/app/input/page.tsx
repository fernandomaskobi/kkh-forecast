"use client";

import { useState } from "react";
import DepartmentSelector from "@/components/DepartmentSelector";
import MonthlyGrid from "@/components/MonthlyGrid";

export default function InputPage() {
  const [departmentId, setDepartmentId] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [year, setYear] = useState(2026);
  const [saveMsg, setSaveMsg] = useState("");

  const handleSaved = () => {
    setSaveMsg("Saved successfully!");
    setTimeout(() => setSaveMsg(""), 3000);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Data Input
      </h1>

      <div className="flex flex-wrap items-center gap-4 mb-6">
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

      <div className="bg-white rounded-lg border p-4">
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
