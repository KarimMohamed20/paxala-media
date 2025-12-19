import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
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
    const body = await req.json();
    const { name, email, phone, serviceType, packageId, date, timeSlot, notes } = body;

    // Validate required fields
    if (!name || !email || !serviceType || !date || !timeSlot) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
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

    // TODO: Send confirmation email

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
