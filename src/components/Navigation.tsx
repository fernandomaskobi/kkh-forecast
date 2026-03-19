"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";

type UserInfo = {
  name: string;
  email: string;
  role: string;
};

type NavItem = {
  href: string;
  label: string;
  roles: string[];
  children?: { href: string; label: string }[];
};

// Nav links with role access
const allLinks: NavItem[] = [
  {
    href: "/merch-review",
    label: "Dashboard",
    roles: ["viewer", "editor", "admin"],
    children: [
      { href: "/merch-review", label: "Merch Review" },
      { href: "/financial-review", label: "Financial Review" },
    ],
  },
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
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const dropdownTimeout = useRef<NodeJS.Timeout | null>(null);

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

  const handleDropdownEnter = (label: string) => {
    if (dropdownTimeout.current) {
      clearTimeout(dropdownTimeout.current);
      dropdownTimeout.current = null;
    }
    setDropdownOpen(label);
  };

  const handleDropdownLeave = () => {
    dropdownTimeout.current = setTimeout(() => {
      setDropdownOpen(null);
    }, 150);
  };

  if (pathname === "/login") return null;

  // Filter links based on user role
  const visibleLinks = user
    ? allLinks.filter((link) => link.roles.includes(user.role))
    : [];

  const roleBadgeColor: Record<string, string> = {
    admin: "text-[#C29F9F]",
    editor: "text-[#5D6556]",
    viewer: "text-[#767676]",
  };

  return (
    <>
      <nav style={{ background: "var(--dark-bg)" }} className="text-white border-b border-[#252320]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-10">
              <Link
                href="/merch-review"
                className="tracking-[0.15em] text-sm uppercase"
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "15px",
                  fontWeight: 400,
                  color: "var(--warm-white)",
                }}
              >
                KKH Forecast
              </Link>
              <div className="flex gap-1">
                {visibleLinks.map((link) => {
                  const hasChildren = link.children && link.children.length > 0;
                  const isActive = hasChildren
                    ? pathname.startsWith("/merch-review") || pathname.startsWith("/financial-review")
                    : pathname.startsWith(link.href);

                  if (hasChildren) {
                    return (
                      <div
                        key={link.label}
                        className="relative"
                        onMouseEnter={() => handleDropdownEnter(link.label)}
                        onMouseLeave={handleDropdownLeave}
                      >
                        <button
                          className={`px-3 py-2 text-[0.6875rem] font-normal uppercase tracking-[0.14em] transition-colors flex items-center gap-1 ${
                            isActive
                              ? "text-white bg-white/10"
                              : "text-[rgba(255,255,255,0.4)] hover:text-white"
                          }`}
                          onClick={() =>
                            setDropdownOpen(dropdownOpen === link.label ? null : link.label)
                          }
                        >
                          {link.label}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-3 w-3 transition-transform ${
                              dropdownOpen === link.label ? "rotate-180" : ""
                            }`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                        {dropdownOpen === link.label && (
                          <div
                            className="absolute top-full left-0 mt-0 min-w-[180px] shadow-lg z-50"
                            style={{
                              background: "#1a1410",
                              border: "1px solid #252320",
                            }}
                          >
                            {link.children!.map((child) => {
                              const childActive = pathname === child.href;
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className={`block px-4 py-2.5 text-[0.6875rem] uppercase tracking-[0.14em] transition-colors ${
                                    childActive
                                      ? "text-white bg-white/10"
                                      : "text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-white/5"
                                  }`}
                                  onClick={() => setDropdownOpen(null)}
                                >
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`px-3 py-2 text-[0.6875rem] font-normal uppercase tracking-[0.14em] transition-colors ${
                        isActive
                          ? "text-white bg-white/10"
                          : "text-[rgba(255,255,255,0.4)] hover:text-white"
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
                  <span className="text-xs text-[rgba(255,255,255,0.75)] tracking-wide block" style={{ fontWeight: 400 }}>
                    {user.name}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-[0.18em] ${
                      roleBadgeColor[user.role] || "text-[rgba(255,255,255,0.3)]"
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
                    className="text-xs text-[rgba(255,255,255,0.3)] hover:text-white transition-colors"
                    title="Change password"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={logout}
                    className="text-[0.6875rem] text-[rgba(255,255,255,0.3)] hover:text-white transition-colors uppercase tracking-[0.14em]"
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
          <div className="border shadow-xl p-6 w-full max-w-sm mx-4" style={{ background: "var(--warm-white)", borderColor: "var(--border)" }}>
            <h2 className="text-sm font-semibold mb-4 uppercase tracking-[0.14em]" style={{ color: "var(--charcoal)", fontFamily: "'DM Sans', sans-serif" }}>
              Change Password
            </h2>
            <form onSubmit={changePassword} className="space-y-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--light-accessible)" }}>Current Password</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                  style={{ border: "1px solid var(--border)", background: "white" }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--light-accessible)" }}>New Password</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                  style={{ border: "1px solid var(--border)", background: "white" }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--light-accessible)" }}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                  style={{ border: "1px solid var(--border)", background: "white" }}
                />
              </div>

              {pwError && (
                <p className="text-red-600 text-xs bg-red-50 px-2 py-1.5 border border-red-200">
                  {pwError}
                </p>
              )}
              {pwSuccess && (
                <p className="text-xs px-2 py-1.5 border" style={{ color: "var(--green)", background: "#f0f2ee", borderColor: "var(--green)" }}>
                  {pwSuccess}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="flex-1 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 btn-brand"
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
                  className="px-4 py-2 text-sm transition-colors"
                  style={{ border: "1px solid var(--border)", color: "var(--mid)" }}
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
