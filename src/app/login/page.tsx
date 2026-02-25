"use client";

import { useState, useEffect } from "react";

type User = { id: string; name: string; role: string };

export default function LoginPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers);
  }, []);

  const login = async (userName: string) => {
    if (!userName.trim()) return;
    setLoading(true);
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: userName.trim() }),
    });
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="bg-white rounded border border-neutral-200 p-10 w-full max-w-md">
        <h1 className="text-2xl mb-1 text-center" style={{ fontFamily: "'Playfair Display', serif" }}>
          KKH Forecast
        </h1>
        <p className="text-neutral-400 text-xs text-center mb-8 uppercase tracking-widest">Sign in to continue</p>

        <div className="space-y-5">
          {users.length > 0 && (
            <div>
              <label className="block text-xs text-neutral-500 mb-1 uppercase tracking-wide">Select your name</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full border border-neutral-300 rounded px-3 py-2.5 text-sm bg-white"
              >
                <option value="">Choose...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                ))}
              </select>
              {selectedUser && (
                <button
                  onClick={() => login(selectedUser)}
                  disabled={loading}
                  className="w-full mt-3 bg-brand text-white px-4 py-2.5 rounded text-sm font-medium hover:bg-brand-dark disabled:opacity-50 transition-colors"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              )}
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-neutral-400 uppercase tracking-wide">or enter your name</span>
            </div>
          </div>

          <div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Your name"
              className="w-full border border-neutral-300 rounded px-3 py-2.5 text-sm"
              onKeyDown={(e) => e.key === "Enter" && login(newName)}
            />
            <button
              onClick={() => login(newName)}
              disabled={loading || !newName.trim()}
              className="w-full mt-3 bg-black text-white px-4 py-2.5 rounded text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            >
              {loading ? "Signing in..." : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
