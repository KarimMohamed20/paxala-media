import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { getFileUrl } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'thumbnail', 'gallery', or 'video'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('Upload request - File type:', file.type, 'Upload type:', type, 'File name:', file.name)

    // Validate file type
    const allowedTypes = {
      thumbnail: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'],
      gallery: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'],
      video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/avi'],
      document: [
        // Images
        'image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif', 'image/svg+xml',
        // Videos
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/avi',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/zip',
        'application/x-rar-compressed',
      ],
    }

    const validTypes = allowedTypes[type as keyof typeof allowedTypes] || allowedTypes.document
    if (!validTypes.includes(file.type)) {
      console.error('Invalid file type:', file.type, 'Expected one of:', validTypes)
      return NextResponse.json(
        { error: `Invalid file type "${file.type}". Allowed: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'portfolio')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = path.extname(file.name)
    const fileName = `${type}-${timestamp}${fileExtension}`
    const filePath = path.join(uploadDir, fileName)

    // Convert file to buffer and write
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Return the full public URL
    const relativePath = `/uploads/portfolio/${fileName}`
    const fullUrl = getFileUrl(relativePath)

    return NextResponse.json({
      success: true,
      url: fullUrl,
      fileName,
      type: file.type,
      size: file.size,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
