import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailService } from "@/lib/email/service";
import {
  rateLimit,
  getClientIp,
  isHoneypotTripped,
  isValidEmail,
  clampString,
  HONEYPOT_FIELD,
} from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    // Throttle by IP — this endpoint sends email, so it is a relay/DoS surface.
    const limit = rateLimit(`contact:${getClientIp(req)}`, {
      limit: 5,
      windowMs: 10 * 60 * 1000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await req.json();

    // Honeypot: pretend success so bots don't learn they were filtered.
    if (isHoneypotTripped(body[HONEYPOT_FIELD])) {
      return NextResponse.json(
        { message: "Inquiry submitted successfully" },
        { status: 201 }
      );
    }

    const name = clampString(body.name, 120);
    const email = clampString(body.email, 200);
    const phone = clampString(body.phone, 40);
    const subject = clampString(body.subject, 200);
    const message = clampString(body.message, 5000);

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Create contact inquiry
    const inquiry = await db.contactInquiry.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject,
        message,
      },
    });

    // Send email notification
    await emailService.sendContactInquiry({
      name,
      email,
      phone,
      subject,
      message,
    });

    return NextResponse.json(
      { message: "Inquiry submitted successfully", id: inquiry.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to submit inquiry" },
      { status: 500 }
    );
  }
}
