import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { localizeTestimonial } from "@/lib/localization-utils";
import { defaultLocale, type Locale } from "@/i18n/config";

// GET - List testimonials.
//   ?allLocales=true  -> admin only; returns ALL rows (incl. inactive) with every locale field.
//   otherwise         -> public; active testimonials localized to the request locale.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const allLocales = searchParams.get("allLocales") === "true";

    if (allLocales) {
      const session = await getServerSession(authOptions);
      if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const all = await db.testimonial.findMany({ orderBy: { order: "asc" } });
      return NextResponse.json(all);
    }

    const locale = (request.headers.get("x-locale") || defaultLocale) as Locale;
    const testimonials = await db.testimonial.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(
      testimonials.map((t) => localizeTestimonial(t, locale))
    );
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    return NextResponse.json(
      { error: "Failed to fetch testimonials" },
      { status: 500 }
    );
  }
}

// POST - Create testimonial (admin only).
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    if (!data.quoteEn || !data.authorEn) {
      return NextResponse.json(
        { error: "English quote and author are required" },
        { status: 400 }
      );
    }

    const testimonial = await db.testimonial.create({
      data: {
        quoteEn: data.quoteEn,
        quoteAr: data.quoteAr || "",
        quoteHe: data.quoteHe || "",
        authorEn: data.authorEn,
        authorAr: data.authorAr || "",
        authorHe: data.authorHe || "",
        roleEn: data.roleEn || "",
        roleAr: data.roleAr || "",
        roleHe: data.roleHe || "",
        companyEn: data.companyEn || "",
        companyAr: data.companyAr || "",
        companyHe: data.companyHe || "",
        image: data.image || null,
        order: data.order ?? 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    return NextResponse.json(testimonial);
  } catch (error) {
    console.error("Error creating testimonial:", error);
    return NextResponse.json(
      { error: "Failed to create testimonial" },
      { status: 500 }
    );
  }
}
