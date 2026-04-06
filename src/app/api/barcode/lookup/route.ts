import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { checkRateLimit } from '@/lib/rate-limit'

interface BarcodeLookupResult {
  title: string
  category: string
  brand: string
  details: string
  ean: string
  source: 'isbn' | 'ai' | 'manual'
}

function isIsbn(code: string): boolean {
  const digits = code.replace(/[^0-9Xx]/g, '')
  // ISBN-13 starts with 978 or 979
  if (digits.length === 13 && (digits.startsWith('978') || digits.startsWith('979'))) return true
  // ISBN-10
  if (digits.length === 10) return true
  return false
}

export const GET = withAuth(async (request, user) => {
  const { success } = await checkRateLimit(`barcode-lookup:${user.id}`, 30)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const code = request.nextUrl.searchParams.get('code')

    if (!code) {
      return NextResponse.json({ error: 'Barcode is required' }, { status: 400 })
    }

    const cleaned = code.replace(/[^0-9Xx]/g, '')

    // 1. If it looks like an ISBN, use books lookup
    if (isIsbn(cleaned)) {
      const booksRes = await fetch(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(cleaned)}&format=json&jscmd=data`,
        { next: { revalidate: 86400 } }
      )

      if (booksRes.ok) {
        const data = await booksRes.json() as Record<string, { title?: string; authors?: Array<{ name: string }>; publishers?: Array<{ name: string }> }>
        const book = data[`ISBN:${cleaned}`]
        if (book) {
          const result: BarcodeLookupResult = {
            title: book.title ?? 'Unknown book',
            category: 'books',
            brand: book.publishers?.[0]?.name ?? '',
            details: (book.authors ?? []).map((a) => a.name).join(', '),
            ean: cleaned,
            source: 'isbn',
          }
          return NextResponse.json(result)
        }
      }
    }

    // 2. Try GPT-4o for product identification from barcode
    if (process.env.OPENAI_API_KEY) {
      const prompt = `You are a product identification expert for UK resale markets.
Given this barcode/EAN: ${cleaned}
Identify the product if you can. Return ONLY valid JSON (no markdown):
{
  "title": "product name",
  "category": "one of: ceramics, glassware, books, jewellery, clothing, homeware, furniture, toys, other",
  "brand": "brand name or empty string",
  "details": "brief details like colour, size, material — keep under 50 chars"
}
If you cannot identify the barcode, return: {"title":"","category":"other","brand":"","details":""}`

      try {
        const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            max_tokens: 300,
            response_format: { type: 'json_object' },
            messages: [{ role: 'user', content: prompt }],
          }),
        })

        if (gptRes.ok) {
          const data = (await gptRes.json()) as {
            choices: Array<{ message: { content: string } }>
          }
          const raw = data.choices[0]?.message?.content?.trim() ?? '{}'
          const parsed = JSON.parse(raw) as { title: string; category: string; brand: string; details: string }

          if (parsed.title) {
            const result: BarcodeLookupResult = {
              title: parsed.title,
              category: parsed.category || 'other',
              brand: parsed.brand || '',
              details: parsed.details || '',
              ean: cleaned,
              source: 'ai',
            }
            return NextResponse.json(result)
          }
        }
      } catch (err) {
        console.error('GPT barcode lookup failed:', err)
      }
    }

    // 3. Fallback: return the barcode with no identification
    return NextResponse.json({
      title: '',
      category: 'other',
      brand: '',
      details: '',
      ean: cleaned,
      source: 'manual',
    } satisfies BarcodeLookupResult)
  } catch (error) {
    console.error('Barcode lookup failed:', error)
    return NextResponse.json({ error: 'Barcode lookup failed' }, { status: 500 })
  }
})
