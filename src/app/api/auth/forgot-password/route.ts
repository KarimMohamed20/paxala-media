import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createResetToken } from "@/lib/password-reset";
import { sendPasswordReset } from "@/lib/email/service";
import { EmailLocale } from "@/lib/email/styles";
import {
  rateLimit,
  getClientIp,
  isValidEmail,
  clampString,
} from "@/lib/security";

// Always the same response whether or not the email matches an account, so the
// endpoint cannot be used to enumerate users.
const GENERIC = {
  message: "If an account exists with that email, a reset link has been sent.",
};

export async function POST(req: NextRequest) {
  const limit = rateLimit(`forgot-password:${getClientIp(req)}`, {
    limit: 5,
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
    const email = clampString(body.email, 200);
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Second bucket per target address, so rotating IPs cannot mail-bomb one
    // inbox with reset emails.
    const perEmail = rateLimit(
      `forgot-password:email:${email.toLowerCase()}`,
      { limit: 3, windowMs: 15 * 60 * 1000 }
    );
    if (!perEmail.ok) {
      return NextResponse.json(GENERIC);
    }

    const user = await db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, password: true, name: true, email: true },
    });

    if (user?.email) {
      const token = createResetToken(user);
      if (!process.env.NEXTAUTH_URL) {
        console.warn(
          "NEXTAUTH_URL is not set — falling back to https://paxaland.com for the reset link"
        );
      }
      const baseUrl = (
        process.env.NEXTAUTH_URL || "https://paxaland.com"
      ).replace(/\/+$/, "");
      const locale = (req.cookies.get("NEXT_LOCALE")?.value ||
        "en") as EmailLocale;
      // Fire-and-forget: awaiting the SMTP round-trip only on the match path
      // would make response latency an account-enumeration oracle. Safe in this
      // long-running standalone deployment (see src/lib/security.ts).
      void sendPasswordReset(
        user.email,
        {
          name: user.name || user.email,
          link: `${baseUrl}/portal/reset-password?token=${encodeURIComponent(token)}`,
        },
        locale
      ).catch((error) => console.error("Reset email send failed:", error));
    }

    return NextResponse.json(GENERIC);
  } catch (error) {
    console.error("Forgot password error:", error);
    // Still generic: an attacker must not distinguish "sent" from "failed".
    return NextResponse.json(GENERIC);
  }
}
