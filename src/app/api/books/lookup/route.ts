import { NextRequest, NextResponse } from 'next/server'

interface OpenLibraryBook {
  title?: string
  authors?: Array<{ name: string }>
  description?: string | { value: string }
  publish_date?: string
  number_of_pages?: number
  subjects?: Array<{ name: string }>
}

export async function GET(request: NextRequest) {
  try {
    const isbn = request.nextUrl.searchParams.get('isbn')

    if (!isbn) {
      return NextResponse.json({ error: 'ISBN is required' }, { status: 400 })
    }

    // Validate ISBN: must be 10 or 13 digits
    const isbnDigits = isbn.replace(/[^0-9Xx]/g, '')
    if (isbnDigits.length !== 10 && isbnDigits.length !== 13) {
      return NextResponse.json(
        { error: 'ISBN must be 10 or 13 digits' },
        { status: 400 }
      )
    }

    // Use Open Library API — free, no key, no quota limits
    const response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbnDigits)}&format=json&jscmd=data`,
      { next: { revalidate: 86400 } } // cache for 24h
    )

    if (!response.ok) {
      throw new Error(`Open Library API error: ${response.status}`)
    }

    const data = await response.json() as Record<string, OpenLibraryBook>
    const key = `ISBN:${isbnDigits}`
    const book = data[key]

    if (!book) {
      return NextResponse.json({ error: 'ISBN not found' }, { status: 404 })
    }

    const description = typeof book.description === 'string'
      ? book.description
      : book.description?.value ?? ''

    return NextResponse.json({
      title: book.title ?? '',
      authors: (book.authors ?? []).map((a) => a.name),
      description,
      publishedDate: book.publish_date ?? '',
      pageCount: book.number_of_pages ?? null,
      categories: (book.subjects ?? []).map((s) => s.name).slice(0, 5),
    })
  } catch (error) {
    console.error('Failed to lookup ISBN:', error)
    return NextResponse.json(
      { error: 'Failed to lookup ISBN' },
      { status: 500 }
    )
  }
}
