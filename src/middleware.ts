import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "kkh_session";

// Paths that don't require authentication
const PUBLIC_PATHS = ["/login", "/api/auth"];

// Page access by role
const ROLE_PAGE_ACCESS: Record<string, string[]> = {
  viewer: ["/", "/department"],
  editor: ["/", "/department", "/input"],
  admin: ["/", "/department", "/input", "/admin"],
};

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET || "");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets and public files
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".csv") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  // Allow public paths (login page + auth API)
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Get JWT from cookie
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // Also check old cookie for backward compat during transition
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify JWT
  let payload: { role?: string; userId?: string; name?: string; email?: string };
  try {
    const { payload: verified } = await jwtVerify(token, getSecretKey());
    payload = verified as typeof payload;
  } catch {
    // Invalid or expired token — clear cookie and redirect
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json({ error: "Session expired" }, { status: 401 });
      res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
      return res;
    }
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  const role = (payload.role || "viewer") as string;

  // ── Page route access control ──────────────────────────
  if (!pathname.startsWith("/api/")) {
    const allowedPrefixes = ROLE_PAGE_ACCESS[role] || [];
    const isAllowed = allowedPrefixes.some((prefix) => {
      if (prefix === "/") return pathname === "/";
      return pathname === prefix || pathname.startsWith(prefix + "/");
    });

    if (!isAllowed) {
      // Redirect to dashboard — they don't have access to this page
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // ── API route access control ───────────────────────────
  if (pathname.startsWith("/api/")) {
    const method = request.method;

    // Viewers can only do GET requests
    if (role === "viewer" && method !== "GET") {
      return NextResponse.json(
        { error: "Viewers have read-only access" },
        { status: 403 }
      );
    }

    // Only admins can manage users
    if (pathname.startsWith("/api/users") && role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Only admins can use seed endpoint
    if (pathname.startsWith("/api/seed") && role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Only admins can delete departments
    if (
      pathname.startsWith("/api/departments") &&
      method === "DELETE" &&
      role !== "admin"
    ) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }
  }

  // Pass user info to downstream API routes via headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.userId || "");
  requestHeaders.set("x-user-email", payload.email || "");
  requestHeaders.set("x-user-name", payload.name || "");
  requestHeaders.set("x-user-role", role);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
