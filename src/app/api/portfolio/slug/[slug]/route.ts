import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { localizePortfolio } from '@/lib/localization-utils'
import { defaultLocale, type Locale } from '@/i18n/config'

// GET /api/portfolio/slug/[slug] - Get portfolio item by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Get locale from headers
    const locale = (request.headers.get('x-locale') || defaultLocale) as Locale

    const { slug } = await params
    const portfolio = await db.portfolio.findUnique({
      where: { slug },
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

    // Localize the portfolio item
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
