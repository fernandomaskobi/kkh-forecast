import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  validateEmail,
  verifyPassword,
  signToken,
  getSessionCookieOptions,
  getAuthUser,
  SESSION_COOKIE,
  type JWTPayload,
  type UserRole,
} from "@/lib/auth";

/** POST /api/auth — Login with email + password */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = (await request.json()) as {
      email: string;
      password: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate email domain
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return NextResponse.json({ error: emailCheck.error }, { status: 400 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Issue JWT
    const tokenPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
    };
    const token = await signToken(tokenPayload);

    const response = NextResponse.json({
      ok: true,
      user: { name: user.name, email: user.email, role: user.role },
    });
    response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions());

    // Clear old cookie if present
    response.cookies.set("kkh_user", "", { path: "/", maxAge: 0 });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** GET /api/auth — Get current user from JWT */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}

/** PATCH /api/auth — Change password */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { currentPassword, newPassword } = (await request.json()) as {
      currentPassword: string;
      newPassword: string;
    };

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Find user and verify current password
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { hashPassword } = await import("@/lib/auth");

    const currentValid = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!currentValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Hash new password and update
    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.userId },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ ok: true, message: "Password changed successfully" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/auth — Logout */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set("kkh_user", "", { path: "/", maxAge: 0 }); // clean up old cookie
  return response;
}
