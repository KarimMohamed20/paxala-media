import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/portfolio - List portfolio items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'STAFF'

    // Build where clause
    const where: any = {}

    // Public view: only show published items
    if (!isAdmin) {
      where.published = true
    }

    // Filter by category
    const category = searchParams.get('category')
    if (category) {
      where.category = category
    }

    // Filter by featured
    const featured = searchParams.get('featured')
    if (featured === 'true') {
      where.featured = true
    }

    // Filter by published (explicit)
    const published = searchParams.get('published')
    if (published === 'true') {
      where.published = true
    } else if (published === 'false') {
      where.published = false
    }

    // Search
    const search = searchParams.get('search')
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const portfolio = await db.portfolio.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ],
    })

    return NextResponse.json(portfolio)
  } catch (error) {
    console.error('Portfolio fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch portfolio items' },
      { status: 500 }
    )
  }
}

// POST /api/portfolio - Create portfolio item (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const portfolio = await db.portfolio.create({
      data: {
        title: body.title,
        slug: body.slug,
        description: body.description,
        content: body.content || null,
        thumbnail: body.thumbnail || null,
        images: body.images || [],
        videoUrl: body.videoUrl || null,
        category: body.category,
        tags: body.tags || [],
        clientName: body.clientName || null,
        featured: body.featured || false,
        published: body.published || false,
        publishedAt: body.published ? new Date() : null,
        order: body.order || 0,
      },
    })

    return NextResponse.json(portfolio, { status: 201 })
  } catch (error) {
    console.error('Portfolio create error:', error)
    return NextResponse.json(
      { error: 'Failed to create portfolio item' },
      { status: 500 }
    )
  }
}
