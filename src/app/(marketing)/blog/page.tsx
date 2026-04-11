import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingNav } from '@/components/layout/MarketingNav'
import { MarketingFooter } from '@/components/layout/MarketingFooter'
import { POSTS } from './posts'

export const metadata: Metadata = {
  title: 'Blog — UK Reselling Guides',
  description:
    'Guides for UK resellers on Vinted, eBay, Etsy and Depop. Tax, sourcing, pricing, and tools to grow your side hustle into a real business.',
  alternates: { canonical: 'https://wrenlist.com/blog' },
}

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <MarketingNav />

      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-12 py-12">
        <div className="mb-10">
          <div className="text-xs font-medium uppercase tracking-wider text-[#527050] mb-2.5">blog</div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#1e2e1c] mb-3">
            Guides for <em className="italic">UK resellers</em>
          </h1>
          <p className="text-sm text-[#4a6147] max-w-xl">
            Tax, sourcing, pricing, and the tools we use to run a real reselling business.
          </p>
        </div>

        <div className="space-y-6">
          {POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-lg border border-[rgba(61,92,58,0.14)] bg-white p-6 hover:border-[#5a7a57] transition-colors"
            >
              <div className="flex items-center gap-3 text-10px font-medium uppercase text-[#527050] mb-3">
                <span>{post.tag}</span>
                <span>·</span>
                <time>{new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
                <span>·</span>
                <span>{post.readTime}</span>
              </div>
              <h2 className="font-serif text-xl font-medium text-[#1e2e1c] mb-2">{post.title}</h2>
              <p className="text-sm text-[#4a6147]">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </div>

      <MarketingFooter />
    </div>
  )
}
