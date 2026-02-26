"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type Department = { id: string; name: string; category: string };
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: Department | null;
};

export default function AdminPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptCategory, setNewDeptCategory] = useState("merch");

  // New user form state
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("editor");
  const [newUserDept, setNewUserDept] = useState("");
  const [userError, setUserError] = useState("");
  const [userSuccess, setUserSuccess] = useState("");

  // CSV upload state
  const [csvText, setCsvText] = useState("");
  const [csvDept, setCsvDept] = useState("");
  const [csvYear, setCsvYear] = useState("2025");
  const [csvType, setCsvType] = useState("actual");
  const [uploadMsg, setUploadMsg] = useState("");
  const [seeding, setSeeding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    const [deptRes, userRes] = await Promise.all([
      fetch("/api/departments"),
      fetch("/api/users"),
    ]);
    setDepartments(await deptRes.json());
    const userData = await userRes.json();
    setUsers(Array.isArray(userData) ? userData : []);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addDepartment = async () => {
    if (!newDeptName.trim()) return;
    await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newDeptName.trim(),
        category: newDeptCategory,
      }),
    });
    setNewDeptName("");
    loadData();
  };

  const deleteDepartment = async (id: string) => {
    if (!confirm("Delete this department and all its data?")) return;
    await fetch(`/api/departments?id=${id}`, { method: "DELETE" });
    loadData();
  };

  const addUser = async () => {
    setUserError("");
    setUserSuccess("");

    if (!newUserEmail.trim() || !newUserName.trim() || !newUserPassword) {
      setUserError("Email, name, and password are required");
      return;
    }

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newUserEmail.trim().toLowerCase(),
        name: newUserName.trim(),
        password: newUserPassword,
        role: newUserRole,
        departmentId: newUserDept || null,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setUserError(data.error || "Failed to create user");
      return;
    }

    setUserSuccess(`Created ${data.name} (${data.role})`);
    setNewUserEmail("");
    setNewUserName("");
    setNewUserPassword("");
    setNewUserRole("editor");
    setNewUserDept("");
    loadData();
    setTimeout(() => setUserSuccess(""), 3000);
  };

  const deleteUser = async (id: string, name: string, email: string) => {
    if (!confirm(`Remove ${name} (${email})?`)) return;
    const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setUserError(data.error || "Failed to remove user");
      setTimeout(() => setUserError(""), 3000);
      return;
    }
    loadData();
  };

  const seedData = async () => {
    setSeeding(true);
    await fetch("/api/seed", { method: "POST" });
    setSeeding(false);
    loadData();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const uploadCsv = async () => {
    if (!csvDept || !csvText.trim()) {
      setUploadMsg("Select a department and paste/upload CSV data.");
      return;
    }

    const lines = csvText.trim().split("\n");
    const rows: Array<{
      month: number;
      grossBookedSales: number;
      gmPercent: number;
      cpPercent: number;
    }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(",").map((s) => s.trim());

      // Skip header row
      if (i === 0 && isNaN(Number(parts[0]))) continue;

      // Expect: month, grossBookedSales, gmPercent, cpPercent
      if (parts.length >= 4) {
        rows.push({
          month: parseInt(parts[0]),
          grossBookedSales: parseFloat(parts[1]) || 0,
          gmPercent: parseFloat(parts[2]) / 100 || 0,
          cpPercent: parseFloat(parts[3]) / 100 || 0,
        });
      }
    }

    if (rows.length === 0) {
      setUploadMsg(
        "No valid rows found. Format: month,grossBookedSales,gmPercent,cpPercent"
      );
      return;
    }

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows,
        departmentId: csvDept,
        year: parseInt(csvYear),
        type: csvType,
      }),
    });
    const data = await res.json();
    setUploadMsg(`Uploaded ${data.count} rows successfully!`);
    setCsvText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => setUploadMsg(""), 4000);
  };

  const roleBadge: Record<string, string> = {
    admin: "bg-amber-100 text-amber-700",
    editor: "bg-emerald-100 text-emerald-700",
    viewer: "bg-blue-100 text-blue-700",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Departments */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Departments
          </h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              placeholder="Department name"
              className="border rounded px-3 py-1.5 text-sm flex-1"
              onKeyDown={(e) => e.key === "Enter" && addDepartment()}
            />
            <select
              value={newDeptCategory}
              onChange={(e) => setNewDeptCategory(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm"
            >
              <option value="merch">Merch</option>
              <option value="marketing">Marketing</option>
              <option value="tech">Tech</option>
            </select>
            <button
              onClick={addDepartment}
              className="bg-black text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-neutral-800"
            >
              Add
            </button>
          </div>
          <div className="space-y-1">
            {departments.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between px-3 py-2 rounded hover:bg-gray-50"
              >
                <div>
                  <span className="text-sm font-medium">{d.name}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {d.category}
                  </span>
                </div>
                <button
                  onClick={() => deleteDepartment(d.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            ))}
            {departments.length === 0 && (
              <div className="text-sm text-gray-400 text-center py-4">
                No departments yet.{" "}
                <button
                  onClick={seedData}
                  className="text-brand hover:underline"
                  disabled={seeding}
                >
                  {seeding ? "Seeding..." : "Seed default departments"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Users */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Users
          </h2>

          {/* Add user form */}
          <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded border">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="email@kathykuohome.com"
                className="border rounded px-3 py-1.5 text-sm col-span-2"
              />
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Full name"
                className="border rounded px-3 py-1.5 text-sm"
              />
              <input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Password (min 8 chars)"
                className="border rounded px-3 py-1.5 text-sm"
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
              <select
                value={newUserDept}
                onChange={(e) => setNewUserDept(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm"
              >
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={addUser}
              className="w-full bg-brand text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-brand-dark"
            >
              Create User
            </button>
            {userError && (
              <p className="text-red-600 text-xs bg-red-50 px-2 py-1 rounded">
                {userError}
              </p>
            )}
            {userSuccess && (
              <p className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded">
                {userSuccess}
              </p>
            )}
          </div>

          {/* User list */}
          <div className="space-y-1">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between px-3 py-2 rounded hover:bg-gray-50"
              >
                <div>
                  <span className="text-sm font-medium">{u.name}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {u.email}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] uppercase font-medium px-2 py-0.5 rounded ${
                      roleBadge[u.role] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {u.role}
                  </span>
                  {u.department && (
                    <span className="text-xs text-gray-400">
                      {u.department.name}
                    </span>
                  )}
                  <button
                    onClick={() => deleteUser(u.id, u.name, u.email)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors ml-1"
                    title={`Remove ${u.name}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                No users yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* CSV Upload */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
          Bulk Import (CSV)
        </h2>
        <p className="text-xs text-gray-400 mb-3">
          Format:{" "}
          <code>month,grossBookedSales,gmPercent,cpPercent</code> — one row
          per month (1-12). Header row optional. GM% and CP% as whole numbers
          (e.g. 52.3 for 52.3%).
        </p>
        <div className="flex flex-wrap gap-3 mb-3">
          <select
            value={csvDept}
            onChange={(e) => setCsvDept(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          >
            <option value="">Select department...</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={csvYear}
            onChange={(e) => setCsvYear(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
          <select
            value={csvType}
            onChange={(e) => setCsvType(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          >
            <option value="actual">Actuals</option>
            <option value="forecast">Forecast</option>
          </select>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="text-sm"
          />
        </div>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={`month,grossBookedSales,gmPercent,cpPercent\n1,150000,52.3,15.0\n2,160000,51.8,14.5\n...`}
          rows={6}
          className="w-full border rounded px-3 py-2 text-sm font-mono mb-3"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={uploadCsv}
            className="bg-brand text-white px-4 py-2 rounded text-sm font-medium hover:bg-brand-dark"
          >
            Upload
          </button>
          {uploadMsg && (
            <span
              className={`text-sm ${
                uploadMsg.includes("success")
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {uploadMsg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
