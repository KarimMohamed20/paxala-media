import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Fetch all team members (public)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const team = searchParams.get("team"); // "PRODUCTION" or "IT_DEV"
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: any = {};
    if (team) where.team = team;
    if (activeOnly) where.isActive = true;

    const teamMembers = await db.teamMember.findMany({
      where,
      orderBy: { order: "asc" },
    });

    return NextResponse.json(teamMembers);
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

// POST - Create new team member (admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    const teamMember = await db.teamMember.create({
      data: {
        name: data.name,
        role: data.role,
        bio: data.bio || null,
        image: data.image || null,
        team: data.team || "PRODUCTION",
        order: data.order || 0,
        skills: data.skills || [],
        social: data.social || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    return NextResponse.json(teamMember);
  } catch (error) {
    console.error("Error creating team member:", error);
    return NextResponse.json(
      { error: "Failed to create team member" },
      { status: 500 }
    );
  }
}
