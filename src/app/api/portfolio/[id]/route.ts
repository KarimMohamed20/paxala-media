import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { localizePortfolio } from '@/lib/localization-utils'
import { defaultLocale, type Locale } from '@/i18n/config'

// GET /api/portfolio/[id] - Get single portfolio item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const allLocales = searchParams.get('allLocales') === 'true'

    const portfolio = await db.portfolio.findUnique({
      where: { id },
    })

    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portfolio item not found' },
        { status: 404 }
      )
    }

    // Check if user can view this item
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'STAFF'

    if (!portfolio.published && !isAdmin) {
      return NextResponse.json(
        { error: 'Portfolio item not found' },
        { status: 404 }
      )
    }

    // If admin request, return all localized fields
    if (allLocales) {
      return NextResponse.json(portfolio)
    }

    // Otherwise, localize for public use
    const locale = (request.headers.get('x-locale') || defaultLocale) as Locale
    const localizedPortfolio = localizePortfolio(portfolio, locale)

    return NextResponse.json(localizedPortfolio)
  } catch (error) {
    console.error('Portfolio fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch portfolio item' },
      { status: 500 }
    )
  }
}

// PUT /api/portfolio/[id] - Update portfolio item (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = await params

    const portfolio = await db.portfolio.update({
      where: { id },
      data: {
        titleEn: body.titleEn,
        titleAr: body.titleAr,
        titleHe: body.titleHe,
        slug: body.slug,
        descriptionEn: body.descriptionEn,
        descriptionAr: body.descriptionAr,
        descriptionHe: body.descriptionHe,
        contentEn: body.contentEn || null,
        contentAr: body.contentAr || null,
        contentHe: body.contentHe || null,
        thumbnail: body.thumbnail || null,
        images: body.images || [],
        videoUrl: body.videoUrl || null,
        category: body.category,
        tagsEn: body.tagsEn || [],
        tagsAr: body.tagsAr || [],
        tagsHe: body.tagsHe || [],
        clientName: body.clientName || null,
        featured: body.featured || false,
        published: body.published || false,
        publishedAt: body.published && !body.publishedAt ? new Date() : body.publishedAt,
        order: body.order || 0,
      },
    })

    return NextResponse.json(portfolio)
  } catch (error) {
    console.error('Portfolio update error:', error)
    return NextResponse.json(
      { error: 'Failed to update portfolio item' },
      { status: 500 }
    )
  }
}

// DELETE /api/portfolio/[id] - Delete portfolio item (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await db.portfolio.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Portfolio delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete portfolio item' },
      { status: 500 }
    )
  }
}
