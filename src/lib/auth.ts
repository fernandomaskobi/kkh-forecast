import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";

// ── Types ────────────────────────────────────────────────
export type UserRole = "admin" | "editor" | "viewer";

export type JWTPayload = {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
};

// ── Constants ────────────────────────────────────────────
const ALLOWED_DOMAIN = "kathykuohome.com";
const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = "7d";
export const SESSION_COOKIE = "kkh_session";

// ── JWT ──────────────────────────────────────────────────
function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(TOKEN_EXPIRY)
    .setIssuedAt()
    .sign(getSecretKey());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// ── Password ─────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── Email Validation ─────────────────────────────────────
export function validateEmail(email: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) {
    return { valid: false, error: "Invalid email address" };
  }
  const domain = trimmed.split("@")[1];
  if (domain !== ALLOWED_DOMAIN) {
    return {
      valid: false,
      error: "Only @kathykuohome.com email addresses are allowed",
    };
  }
  return { valid: true };
}

// ── Cookie Config ────────────────────────────────────────
export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}

// ── Server-side Auth Helpers ─────────────────────────────

/** Read JWT from cookie and verify — use in API routes */
export async function getAuthUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Read user info from headers set by middleware — faster, no JWT re-verify */
export async function getRequestUser(): Promise<JWTPayload | null> {
  const h = await headers();
  const userId = h.get("x-user-id");
  if (!userId) return null;
  return {
    userId,
    email: h.get("x-user-email") || "",
    name: h.get("x-user-name") || "",
    role: (h.get("x-user-role") || "viewer") as UserRole,
  };
}
