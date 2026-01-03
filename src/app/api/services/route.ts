import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { localizeService } from "@/lib/localization-utils";
import { defaultLocale, type Locale } from "@/i18n/config";

// GET - Fetch all services (public)
export async function GET(request: Request) {
  try {
    // Get locale from headers
    const locale = (request.headers.get('x-locale') || defaultLocale) as Locale;

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: any = {};
    if (activeOnly) where.isActive = true;

    const services = await db.service.findMany({
      where,
      orderBy: { order: "asc" },
    });

    // Localize each service
    const localizedServices = services.map(service => localizeService(service, locale));

    return NextResponse.json(localizedServices);
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}

// POST - Create new service (admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    const service = await db.service.create({
      data: {
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        nameHe: data.nameHe,
        slug: data.slug,
        descriptionEn: data.descriptionEn,
        descriptionAr: data.descriptionAr,
        descriptionHe: data.descriptionHe,
        icon: data.icon || null,
        image: data.image || null,
        featuresEn: data.featuresEn || [],
        featuresAr: data.featuresAr || [],
        featuresHe: data.featuresHe || [],
        order: data.order || 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}
