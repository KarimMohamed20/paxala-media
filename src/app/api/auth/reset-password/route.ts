import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { parseResetToken, verifyResetToken } from "@/lib/password-reset";
import { rateLimit, getClientIp } from "@/lib/security";

export async function POST(req: NextRequest) {
  const limit = rateLimit(`reset-password:${getClientIp(req)}`, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  try {
    const body = await req.json();
    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (password.length < 8 || password.length > 100) {
      return NextResponse.json(
        { error: "Password must be between 8 and 100 characters" },
        { status: 400 }
      );
    }

    const parsed = token.length <= 500 ? parseResetToken(token) : null;
    const user = parsed
      ? await db.user.findUnique({
          where: { id: parsed.userId },
          select: { id: true, password: true },
        })
      : null;

    if (!parsed || !user || !verifyResetToken(parsed, user.password)) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
