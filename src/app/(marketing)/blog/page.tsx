import { MarketingNav } from '@/components/layout/MarketingNav'
import { MarketingFooter } from '@/components/layout/MarketingFooter'

export default function BlogPage() {

  const posts = [
    {
      category: 'sourcing guide',
      title: 'The UK thrifter\'s guide to house clearances in 2026',
      excerpt: 'House clearances are still the highest-margin source for UK resellers. Here\'s how to find them, what to bring, and what to look for.',
      author: 'Dom Cushnan',
      date: '12 March 2026',
      readTime: '8 min read',
      featured: true,
    },
    {
      category: 'pricing',
      title: 'Why your margins are lying to you (and how to fix it)',
      date: '6 March 2026',
      readTime: '5 min read',
    },
    {
      category: 'platforms',
      title: 'Vinted vs eBay UK: where should you list in 2026?',
      date: '28 Feb 2026',
      readTime: '7 min read',
    },
    {
      category: 'tax & finance',
      title: 'HMRC\'s £1,000 trading allowance: what resellers need to know',
      date: '20 Feb 2026',
      readTime: '6 min read',
    },
    {
      category: 'platforms',
      title: 'Product photography on a budget: a phone and 20 minutes',
      date: '14 Feb 2026',
      readTime: '4 min read',
    },
    {
      category: 'sourcing',
      title: '10 brands that always sell well at UK charity shops',
      date: '7 Feb 2026',
      readTime: '5 min read',
    },
    {
      category: 'wrenlist updates',
      title: 'How we built Wren AI: pricing suggestions that actually work',
      date: '1 Feb 2026',
      readTime: '6 min read',
    },
  ]

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <MarketingNav />

      {/* CONTENT */}
      <div className="max-w-3xl mx-auto px-5 sm:px-10 py-12">

        {/* HEADER */}
        <div className="mb-8">
          <div className="text-xs font-medium uppercase tracking-wider text-[#8a9e88] mb-2.5">the wrenlist blog</div>
          <p className="text-sm text-[#6b7d6a] mb-4">Guides, tips, and updates for UK thrifters and resellers.</p>
          <div className="flex gap-2 flex-wrap">
            {['all', 'sourcing', 'pricing', 'platforms', 'tax & finance', 'wrenlist updates'].map((tag) => (
              <span
                key={tag}
                className={`text-xs font-medium rounded px-3 py-1.5 ${
                  tag === 'all'
                    ? 'bg-[#3d5c3a] text-[#f5f0e8]'
                    : 'bg-[#ede8de] text-[#6b7d6a] border border-[rgba(61,92,58,0.14)]'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* COMING SOON NOTE */}
        <div className="rounded-lg border border-[rgba(61,92,58,0.14)] bg-white p-6 mb-8 text-center">
          <p className="text-sm text-[#6b7d6a]">Blog posts are coming soon. Here&apos;s a preview of what we&apos;re writing.</p>
        </div>

        {/* FEATURED POST */}
        {posts[0] && (
          <div className="rounded-lg border border-[rgba(61,92,58,0.14)] bg-white p-6 sm:p-8 mb-12">
            <div className="text-xs font-medium uppercase tracking-widest text-[#5a7a57] mb-3">{posts[0].category}</div>
            <h2 className="font-serif text-xl sm:text-2xl font-normal text-[#1e2e1c] mb-4 leading-tight">
              {posts[0].title}
            </h2>
            <p className="text-sm font-normal text-[#6b7d6a] mb-4 leading-relaxed">
              {posts[0].excerpt}
            </p>
            <div className="text-xs text-[#8a9e88] font-normal">
              {posts[0].author} · {posts[0].date} · {posts[0].readTime}
            </div>
          </div>
        )}

        {/* GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {posts.slice(1).map((post, i) => (
            <div key={i} className="rounded-lg border border-[rgba(61,92,58,0.14)] bg-white p-6">
              <div className="text-xs font-medium uppercase tracking-widest text-[#8a9e88] mb-2">{post.category}</div>
              <h3 className="font-serif text-lg font-normal text-[#1e2e1c] mb-3 leading-tight">
                {post.title}
              </h3>
              <div className="text-xs text-[#8a9e88] font-normal">
                {post.date} · {post.readTime}
              </div>
            </div>
          ))}
        </div>
      </div>

      <MarketingFooter />
    </div>
  )
}
