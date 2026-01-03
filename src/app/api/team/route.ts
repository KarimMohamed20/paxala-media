import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { localizeTeamMember } from "@/lib/localization-utils";
import { defaultLocale, type Locale } from "@/i18n/config";

// GET - Fetch all team members (public)
export async function GET(request: Request) {
  try {
    // Get locale from headers
    const locale = (request.headers.get('x-locale') || defaultLocale) as Locale;

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

    // Localize each team member
    const localizedTeamMembers = teamMembers.map(member => localizeTeamMember(member, locale));

    return NextResponse.json(localizedTeamMembers);
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
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        nameHe: data.nameHe,
        roleEn: data.roleEn,
        roleAr: data.roleAr,
        roleHe: data.roleHe,
        bioEn: data.bioEn || null,
        bioAr: data.bioAr || null,
        bioHe: data.bioHe || null,
        image: data.image || null,
        team: data.team || "PRODUCTION",
        order: data.order || 0,
        skillsEn: data.skillsEn || [],
        skillsAr: data.skillsAr || [],
        skillsHe: data.skillsHe || [],
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
