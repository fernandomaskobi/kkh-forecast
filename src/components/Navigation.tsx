"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

type UserInfo = {
  name: string;
  email: string;
  role: string;
};

// Nav links with role access
const allLinks = [
  { href: "/", label: "Dashboard", roles: ["viewer", "editor", "admin"] },
  { href: "/input", label: "Input", roles: ["editor", "admin"] },
  { href: "/admin", label: "Admin", roles: ["admin"] },
];

export default function Navigation() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => {
        if (r.ok) return r.json();
        return { user: null };
      })
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/login";
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (newPw !== confirmPw) {
      setPwError("New passwords do not match");
      return;
    }
    if (newPw.length < 8) {
      setPwError("New password must be at least 8 characters");
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || "Failed to change password");
      } else {
        setPwSuccess("Password changed!");
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
        setTimeout(() => {
          setShowPwModal(false);
          setPwSuccess("");
        }, 1500);
      }
    } catch {
      setPwError("Network error");
    } finally {
      setPwLoading(false);
    }
  };

  if (pathname === "/login") return null;

  // Filter links based on user role
  const visibleLinks = user
    ? allLinks.filter((link) => link.roles.includes(user.role))
    : [];

  const roleBadgeColor: Record<string, string> = {
    admin: "text-amber-400",
    editor: "text-emerald-400",
    viewer: "text-blue-400",
  };

  return (
    <>
      <nav className="bg-black text-white border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-10">
              <Link
                href="/"
                className="tracking-widest text-sm font-semibold uppercase"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "15px",
                  letterSpacing: "0.15em",
                }}
              >
                KKH Forecast
              </Link>
              <div className="flex gap-1">
                {visibleLinks.map((link) => {
                  const isActive =
                    link.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`px-3 py-2 rounded text-xs font-medium uppercase tracking-wider transition-colors ${
                        isActive
                          ? "text-white bg-white/10"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs text-neutral-300 tracking-wide block">
                    {user.name}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-wider ${
                      roleBadgeColor[user.role] || "text-neutral-500"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowPwModal(true);
                      setPwError("");
                      setPwSuccess("");
                    }}
                    className="text-xs text-neutral-500 hover:text-white transition-colors"
                    title="Change password"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={logout}
                    className="text-xs text-neutral-500 hover:text-white transition-colors uppercase tracking-wider"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Change Password Modal */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg border shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-4 uppercase tracking-wide">
              Change Password
            </h2>
            <form onSubmit={changePassword} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  required
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                  minLength={8}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                  minLength={8}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                />
              </div>

              {pwError && (
                <p className="text-red-600 text-xs bg-red-50 px-2 py-1.5 rounded border border-red-200">
                  {pwError}
                </p>
              )}
              {pwSuccess && (
                <p className="text-green-600 text-xs bg-green-50 px-2 py-1.5 rounded border border-green-200">
                  {pwSuccess}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="flex-1 bg-brand text-white px-4 py-2 rounded text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
                >
                  {pwLoading ? "Changing..." : "Change Password"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPwModal(false);
                    setCurrentPw("");
                    setNewPw("");
                    setConfirmPw("");
                  }}
                  className="px-4 py-2 border rounded text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
