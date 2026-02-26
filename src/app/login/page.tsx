"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="bg-white rounded border border-neutral-200 p-10 w-full max-w-md">
        <h1
          className="text-2xl mb-1 text-center"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          KKH Forecast
        </h1>
        <p className="text-neutral-400 text-xs text-center mb-8 uppercase tracking-widest">
          Sign in to continue
        </p>

        <form onSubmit={login} className="space-y-4">
          <div>
            <label className="block text-xs text-neutral-500 mb-1 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@kathykuohome.com"
              required
              autoComplete="email"
              className="w-full border border-neutral-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="w-full border border-neutral-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white px-4 py-2.5 rounded text-sm font-medium hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-neutral-400 text-[11px] text-center mt-6 leading-relaxed">
          Only @kathykuohome.com emails are authorized.
          <br />
          Contact an admin if you need an account.
        </p>
      </div>
    </div>
  );
}
