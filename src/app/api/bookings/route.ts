import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { emailService } from "@/lib/email/service";
import { EmailLocale } from "@/lib/email/styles";
import { autoCreateLeadFromWebsite } from "@/lib/leads";
import {
  rateLimit,
  getClientIp,
  isHoneypotTripped,
  isValidEmail,
  clampString,
  HONEYPOT_FIELD,
} from "@/lib/security";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bookings = await db.booking.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error("Fetch bookings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Throttle by IP — this endpoint sends two emails per request.
    const limit = rateLimit(`booking:${getClientIp(req)}`, {
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
        { message: "Booking created successfully" },
        { status: 201 }
      );
    }

    const name = clampString(body.name, 120);
    const email = clampString(body.email, 200);
    const phone = clampString(body.phone, 40);
    const serviceType = clampString(body.serviceType, 120);
    const packageId = clampString(body.packageId, 120);
    const timeSlot = clampString(body.timeSlot, 60);
    const notes = clampString(body.notes, 2000);
    const date = body.date;

    // Validate required fields
    if (!name || !email || !serviceType || !date || !timeSlot) {
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
    if (isNaN(new Date(date).getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    // Get user session if available
    const session = await getServerSession(authOptions);

    // Check for existing booking at the same time
    const existingBooking = await db.booking.findFirst({
      where: {
        date: new Date(date),
        timeSlot,
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
      },
    });

    if (existingBooking) {
      return NextResponse.json(
        { error: "This time slot is already booked" },
        { status: 409 }
      );
    }

    // Create booking
    const booking = await db.booking.create({
      data: {
        name,
        email,
        phone: phone || null,
        serviceType,
        packageId: packageId || null,
        date: new Date(date),
        timeSlot,
        notes: notes || null,
        userId: session?.user?.id || null,
      },
    });

    // Send confirmation email
    const locale = (req.cookies.get('NEXT_LOCALE')?.value || 'en') as EmailLocale;

    await Promise.all([
      emailService.sendBookingConfirmation(
        email,
        {
          name,
          serviceType,
          date: new Date(date),
          timeSlot,
        },
        locale
      ),
      emailService.sendNewBookingNotification({
        name,
        email,
        phone,
        serviceType,
        date: new Date(date),
        timeSlot,
        notes,
      })
    ]);

    // Add to lead pipeline if this email is not already a lead
    await autoCreateLeadFromWebsite({
      clientName: name,
      email,
      phone,
      interestedIn: serviceType,
      notes,
    });

    return NextResponse.json(
      { message: "Booking created successfully", id: booking.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create booking error:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
