import { NextRequest, NextResponse } from 'next/server'

interface GoogleBooksVolume {
  volumeInfo?: {
    title?: string
    authors?: string[]
    description?: string
    publishedDate?: string
    pageCount?: number
    categories?: string[]
    industryIdentifiers?: Array<{
      type: string
      identifier: string
    }>
  }
}

export async function GET(request: NextRequest) {
  try {
    const isbn = request.nextUrl.searchParams.get('isbn')

    if (!isbn) {
      return NextResponse.json({ error: 'ISBN is required' }, { status: 400 })
    }

    // Validate ISBN: must be 10 or 13 digits
    const isbnDigits = isbn.replace(/[^0-9]/g, '')
    if (isbnDigits.length !== 10 && isbnDigits.length !== 13) {
      return NextResponse.json(
        { error: 'ISBN must be 10 or 13 digits' },
        { status: 400 }
      )
    }

    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbnDigits)}`
    )

    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`)
    }

    const data = (await response.json()) as { items?: GoogleBooksVolume[] }

    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ error: 'ISBN not found' }, { status: 404 })
    }

    const volume = data.items[0]
    if (!volume) {
      return NextResponse.json({ error: 'ISBN not found' }, { status: 404 })
    }
    const info = volume.volumeInfo

    return NextResponse.json({
      title: info?.title || '',
      authors: info?.authors || [],
      description: info?.description || '',
      publishedDate: info?.publishedDate || '',
      pageCount: info?.pageCount || null,
      categories: info?.categories || [],
    })
  } catch (error) {
    console.error('Failed to lookup ISBN:', error)
    return NextResponse.json(
      { error: 'Failed to lookup ISBN' },
      { status: 500 }
    )
  }
}
