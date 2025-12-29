import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Fetch homepage content (public)
export async function GET() {
  try {
    // Get or create homepage content
    let content = await db.homePageContent.findFirst();

    if (!content) {
      // Create default homepage content if it doesn't exist
      content = await db.homePageContent.create({
        data: {},
      });
    }

    return NextResponse.json(content);
  } catch (error) {
    console.error("Error fetching homepage content:", error);
    return NextResponse.json(
      { error: "Failed to fetch homepage content" },
      { status: 500 }
    );
  }
}

// PUT - Update homepage content (admin only)
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    // Get or create homepage content
    let content = await db.homePageContent.findFirst();

    if (!content) {
      content = await db.homePageContent.create({
        data,
      });
    } else {
      content = await db.homePageContent.update({
        where: { id: content.id },
        data,
      });
    }

    return NextResponse.json(content);
  } catch (error) {
    console.error("Error updating homepage content:", error);
    return NextResponse.json(
      { error: "Failed to update homepage content" },
      { status: 500 }
    );
  }
}
