import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Fetch a single testimonial with all locale fields (admin only, for editing).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const testimonial = await db.testimonial.findUnique({ where: { id } });

    if (!testimonial) {
      return NextResponse.json(
        { error: "Testimonial not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(testimonial);
  } catch (error) {
    console.error("Error fetching testimonial:", error);
    return NextResponse.json(
      { error: "Failed to fetch testimonial" },
      { status: 500 }
    );
  }
}

// PUT - Update testimonial (admin only).
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    if (!data.quoteEn || !data.authorEn) {
      return NextResponse.json(
        { error: "English quote and author are required" },
        { status: 400 }
      );
    }

    const testimonial = await db.testimonial.update({
      where: { id },
      data: {
        quoteEn: data.quoteEn,
        quoteAr: data.quoteAr ?? "",
        quoteHe: data.quoteHe ?? "",
        authorEn: data.authorEn,
        authorAr: data.authorAr ?? "",
        authorHe: data.authorHe ?? "",
        roleEn: data.roleEn ?? "",
        roleAr: data.roleAr ?? "",
        roleHe: data.roleHe ?? "",
        companyEn: data.companyEn ?? "",
        companyAr: data.companyAr ?? "",
        companyHe: data.companyHe ?? "",
        image: data.image ?? null,
        order: data.order ?? 0,
        isActive: data.isActive,
      },
    });

    return NextResponse.json(testimonial);
  } catch (error) {
    console.error("Error updating testimonial:", error);
    return NextResponse.json(
      { error: "Failed to update testimonial" },
      { status: 500 }
    );
  }
}

// DELETE - Delete testimonial (admin only).
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await db.testimonial.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting testimonial:", error);
    return NextResponse.json(
      { error: "Failed to delete testimonial" },
      { status: 500 }
    );
  }
}
