import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { localizeService } from "@/lib/localization-utils";
import { defaultLocale, type Locale } from "@/i18n/config";

// GET - Fetch single service (public)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const allLocales = searchParams.get('allLocales') === 'true';

    const service = await db.service.findUnique({
      where: { id },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // If admin request, return all localized fields
    if (allLocales) {
      return NextResponse.json(service);
    }

    // Otherwise, localize for public use
    const locale = (request.headers.get('x-locale') || defaultLocale) as Locale;
    const localizedService = localizeService(service, locale);

    return NextResponse.json(localizedService);
  } catch (error) {
    console.error("Error fetching service:", error);
    return NextResponse.json(
      { error: "Failed to fetch service" },
      { status: 500 }
    );
  }
}

// PUT - Update service (admin only)
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

    const service = await db.service.update({
      where: { id },
      data: {
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        nameHe: data.nameHe,
        slug: data.slug,
        descriptionEn: data.descriptionEn,
        descriptionAr: data.descriptionAr,
        descriptionHe: data.descriptionHe,
        icon: data.icon,
        image: data.image,
        featuresEn: data.featuresEn,
        featuresAr: data.featuresAr,
        featuresHe: data.featuresHe,
        order: data.order,
        isActive: data.isActive,
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json(
      { error: "Failed to update service" },
      { status: 500 }
    );
  }
}

// DELETE - Delete service (admin only)
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

    await db.service.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 }
    );
  }
}
