import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { localizeTeamMember } from "@/lib/localization-utils";
import { defaultLocale, type Locale } from "@/i18n/config";

// GET - Fetch single team member (public)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const allLocales = searchParams.get('allLocales') === 'true';

    const teamMember = await db.teamMember.findUnique({
      where: { id },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    // If admin request, return all localized fields
    if (allLocales) {
      return NextResponse.json(teamMember);
    }

    // Otherwise, localize for public use
    const locale = (request.headers.get('x-locale') || defaultLocale) as Locale;
    const localizedTeamMember = localizeTeamMember(teamMember, locale);

    return NextResponse.json(localizedTeamMember);
  } catch (error) {
    console.error("Error fetching team member:", error);
    return NextResponse.json(
      { error: "Failed to fetch team member" },
      { status: 500 }
    );
  }
}

// PUT - Update team member (admin only)
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

    const teamMember = await db.teamMember.update({
      where: { id },
      data: {
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        nameHe: data.nameHe,
        roleEn: data.roleEn,
        roleAr: data.roleAr,
        roleHe: data.roleHe,
        bioEn: data.bioEn,
        bioAr: data.bioAr,
        bioHe: data.bioHe,
        image: data.image,
        team: data.team,
        order: data.order,
        skillsEn: data.skillsEn,
        skillsAr: data.skillsAr,
        skillsHe: data.skillsHe,
        social: data.social,
        isActive: data.isActive,
      },
    });

    return NextResponse.json(teamMember);
  } catch (error) {
    console.error("Error updating team member:", error);
    return NextResponse.json(
      { error: "Failed to update team member" },
      { status: 500 }
    );
  }
}

// DELETE - Delete team member (admin only)
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

    await db.teamMember.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting team member:", error);
    return NextResponse.json(
      { error: "Failed to delete team member" },
      { status: 500 }
    );
  }
}
