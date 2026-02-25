"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/input", label: "Input" },
  { href: "/admin", label: "Admin" },
];

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function Navigation() {
  const pathname = usePathname();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    setUserName(getCookie("kkh_user"));
  }, []);

  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/login";
  };

  if (pathname === "/login") return null;

  return (
    <nav className="bg-black text-white border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-10">
            <Link href="/" className="tracking-widest text-sm font-semibold uppercase" style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", letterSpacing: "0.15em" }}>
              KKH Forecast
            </Link>
            <div className="flex gap-1">
              {links.map((link) => {
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
          {userName && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-400 tracking-wide">{userName}</span>
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
