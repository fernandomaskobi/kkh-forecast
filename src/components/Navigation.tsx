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
              <button
                onClick={logout}
                className="text-xs text-neutral-500 hover:text-white transition-colors uppercase tracking-wider"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
