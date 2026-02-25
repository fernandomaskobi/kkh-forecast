"use client";

import { useState, useEffect } from "react";

type Department = {
  id: string;
  name: string;
  category: string;
};

type DepartmentSelectorProps = {
  value: string;
  onChange: (id: string, name: string) => void;
};

export default function DepartmentSelector({
  value,
  onChange,
}: DepartmentSelectorProps) {
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then(setDepartments);
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => {
        const dept = departments.find((d) => d.id === e.target.value);
        onChange(e.target.value, dept?.name || "");
      }}
      className="border rounded px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-light focus:border-brand"
    >
      <option value="">Select Department...</option>
      {departments.map((d) => (
        <option key={d.id} value={d.id}>
          {d.name}
        </option>
      ))}
    </select>
  );
}
