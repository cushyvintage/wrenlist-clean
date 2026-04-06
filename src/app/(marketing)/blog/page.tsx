'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function BlogPage() {
  const [activeTag, setActiveTag] = useState('all')

  const posts = [
    {
      category: 'sourcing guide',
      title: 'The UK thrifter\'s guide to house clearances in 2026',
      excerpt: 'House clearances are still the highest-margin source for UK resellers. Here\'s how to find them, what to bring, and what to look for.',
      author: 'Dom Cushnan',
      date: '12 March 2026',
      readTime: '8 min read',
      emoji: '🏠',
      featured: true,
    },
    {
      category: 'pricing',
      title: 'Why your margins are lying to you (and how to fix it)',
      date: '6 March 2026',
      readTime: '5 min read',
      emoji: '💰',
      tags: ['pricing'],
    },
    {
      category: 'platforms',
      title: 'Vinted vs eBay UK: where should you list in 2026?',
      date: '28 Feb 2026',
      readTime: '7 min read',
      emoji: '📦',
      tags: ['platforms'],
    },
    {
      category: 'tax & finance',
      title: 'HMRC\'s £1,000 trading allowance: what resellers need to know',
      date: '20 Feb 2026',
      readTime: '6 min read',
      emoji: '🧾',
      tags: ['tax'],
    },
    {
      category: 'platforms',
      title: 'Product photography on a budget: a phone and 20 minutes',
      date: '14 Feb 2026',
      readTime: '4 min read',
      emoji: '📸',
      tags: ['platforms'],
    },
    {
      category: 'sourcing',
      title: '10 brands that always sell well at UK charity shops',
      date: '7 Feb 2026',
      readTime: '5 min read',
      emoji: '🔍',
      tags: ['sourcing'],
    },
    {
      category: 'wrenlist updates',
      title: 'How we built Wren AI: pricing suggestions that actually work',
      date: '1 Feb 2026',
      readTime: '6 min read',
      emoji: '🤖',
      tags: ['updates'],
    },
  ]

  return (
    <div className="min-h-screen bg-cream">
      {/* NAV */}
      <nav className="sticky top-0 z-100 flex items-center justify-between border-b border-[rgba(61,92,58,0.14)] bg-cream px-10 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 flex-shrink-0 bg-sage"></div>
          <div className="font-serif text-xl font-medium tracking-wider text-ink">
            WREN<em className="font-light italic text-sage-lt">list</em>
          </div>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/landing" className="text-xs font-light text-ink-lt hover:text-ink">home</Link>
          <Link href="/pricing" className="text-xs font-light text-ink-lt hover:text-ink">pricing</Link>
          <div className="text-xs font-medium text-ink">blog</div>
        </div>
        <div className="flex gap-2 items-center">
          <a href="/login" className="border border-[rgba(61,92,58,0.22)] rounded text-xs font-light text-ink-lt px-4 py-2 hover:bg-cream-md hover:text-ink">log in</a>
          <a href="/register" className="bg-sage text-cream rounded text-xs font-medium px-4.5 py-2 hover:bg-sage-dk">start free</a>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="max-w-3xl mx-auto px-10 py-12">

        {/* HEADER */}
        <div className="mb-8">
          <div className="text-10px font-semibold uppercase tracking-wider text-sage-dim mb-2.5">the wrenlist blog</div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'sourcing', 'pricing', 'platforms', 'tax & finance', 'wrenlist updates'].map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`text-xs font-medium rounded px-3 py-1.5 transition-colors ${
                  activeTag === tag
                    ? 'bg-sage text-cream'
                    : 'bg-cream-md text-ink-lt border border-[rgba(61,92,58,0.14)] hover:text-ink'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* FEATURED POST */}
        {posts[0] && (
          <div className="rounded-lg border border-[rgba(61,92,58,0.14)] bg-white p-8 mb-12">
            <div className="text-10px font-semibold uppercase tracking-widest text-sage mb-3">{posts[0].category}</div>
            <h2 className="font-serif text-2xl font-light text-ink mb-4 leading-tight">
              {posts[0].title}
            </h2>
            <p className="text-sm font-light text-ink-lt mb-4 leading-relaxed">
              {posts[0].excerpt}
            </p>
            <div className="text-10px text-sage-dim font-light">
              {posts[0].author} · {posts[0].date} · {posts[0].readTime}
            </div>
          </div>
        )}

        {/* GRID */}
        <div className="grid grid-cols-2 gap-6">
          {posts.slice(1).map((post, i) => (
            <div key={i} className="rounded-lg border border-[rgba(61,92,58,0.14)] bg-white p-6 hover:border-sage-dim transition-colors cursor-pointer">
              <div className="text-3xl mb-4">{post.emoji}</div>
              <div className="text-10px font-semibold uppercase tracking-widest text-sage-lt mb-2">{post.category}</div>
              <h3 className="font-serif text-lg font-light text-ink mb-3 leading-tight hover:text-sage-lt">
                {post.title}
              </h3>
              <div className="text-10px text-sage-dim font-light">
                {post.date} · {post.readTime}
              </div>
            </div>
          ))}
        </div>

        {/* LOAD MORE */}
        <div className="text-center mt-12">
          <button className="border border-[rgba(61,92,58,0.22)] rounded text-xs font-light text-ink-lt px-6 py-2.5 hover:bg-cream-md hover:text-ink">
            load more posts
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-ink text-cream px-12 py-16 mt-16">
        <div className="grid grid-cols-4 gap-12 max-w-5xl mx-auto mb-12">
          <div>
            <div className="font-serif text-xl font-medium mb-3">
              WREN<em className="italic font-light text-sage-lt">list</em>
            </div>
            <p className="text-sm font-light text-cream mb-4">The operating system for UK thrifters and resellers.</p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase mb-4">Platform</div>
            <div className="flex flex-col gap-3 text-sm font-light">
              <a href="#">Pricing</a>
              <a href="#">Why Wrenlist</a>
              <a href="#">Marketplaces</a>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase mb-4">Resources</div>
            <div className="flex flex-col gap-3 text-sm font-light">
              <a href="#">Blog</a>
              <Link href="/roadmap">Roadmap</Link>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase mb-4">Company</div>
            <div className="flex flex-col gap-3 text-sm font-light">
              <Link href="/story">Our story</Link>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
