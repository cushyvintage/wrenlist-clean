'use client'

import Link from 'next/link'

export default function AboutPage() {
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
          <div className="text-xs font-medium text-ink">why wrenlist</div>
        </div>
        <div className="flex gap-2 items-center">
          <button className="border border-[rgba(61,92,58,0.22)] rounded text-xs font-light text-ink-lt px-4 py-2 hover:bg-cream-md hover:text-ink">log in</button>
          <button className="bg-sage text-cream rounded text-xs font-medium px-4.5 py-2 hover:bg-sage-dk">start free</button>
        </div>
      </nav>

      {/* HEADER */}
      <div className="bg-white border-b border-[rgba(61,92,58,0.14)] px-12 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-10px font-medium uppercase tracking-wider text-sage-dim mb-2.5">why wrenlist</div>
          <h1 className="font-serif text-3xl font-light text-ink mb-1">
            Not just another<br />
            <em className="italic">crosslisting tool.</em>
          </h1>
        </div>
      </div>

      {/* CONTENT */}
      <div className="grid grid-cols-2 border-b border-[rgba(61,92,58,0.14)]">
        {/* LEFT: THE PROBLEM */}
        <div className="border-r border-[rgba(61,92,58,0.14)] px-12 py-10">
          <h2 className="font-serif text-2xl font-light text-ink mb-3.5">The problem with other tools</h2>
          <p className="text-sm font-light leading-relaxed text-ink-lt mb-4">
            Vendoo and Crosslist are built for listing speed. They're great at taking something you've already decided to sell and pushing it to multiple platforms. That's useful.
          </p>
          <p className="text-sm font-light leading-relaxed text-ink-lt mb-4">
            But most UK thrifters don't have a listing problem. They have a <em className="font-serif text-base text-ink">business clarity</em> problem. What did I pay for this? Where did I source it? Which categories actually make money? Which platforms convert fastest? Which hauls were worth doing again?
          </p>
          <p className="text-sm font-light leading-relaxed text-ink-lt">
            Those questions live in a Notes app, a spreadsheet, or nowhere at all. Wrenlist is the answer to all of them — built specifically for the way UK thrifters actually work.
          </p>
        </div>

        {/* RIGHT: WHAT MAKES US DIFFERENT */}
        <div className="px-12 py-10">
          <h2 className="font-serif text-2xl font-light text-ink mb-4">What makes us different</h2>
          <div className="space-y-4">
            {[
              {
                num: '1',
                title: 'Starts at the rack, not the listing form',
                desc: 'Log a find the moment you pick it up. Cost, source, condition, photos — before it even makes it home.'
              },
              {
                num: '2',
                title: 'UK platforms, UK pricing, UK sellers',
                desc: 'Vinted, eBay UK, Etsy and Shopify — natively. Pricing in pounds. Built from day one for the UK market.'
              },
              {
                num: '3',
                title: 'Margin intelligence, not just listing counts',
                desc: 'Know your real profit on every item. Which source, which category, which platform makes you the most money.'
              },
              {
                num: '4',
                title: 'No add-on chaos',
                desc: 'AI listings, auto-delist, full platform access — included in the plan. No surprise fees when you actually need the tool to work.'
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-full bg-sage-pale flex items-center justify-center flex-shrink-0 text-sm font-semibold text-sage mt-0.5">
                  {item.num}
                </div>
                <div>
                  <div className="text-sm font-medium text-ink mb-1">{item.title}</div>
                  <div className="text-sm font-light text-ink-lt leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TESTIMONIAL */}
      <div className="grid grid-cols-2 border-b border-[rgba(61,92,58,0.14)] bg-sage-pale px-12 py-12">
        <div>
          <p className="font-serif text-lg leading-relaxed text-ink">
            "Wrenlist told me my house clearance hauls have a 94% margin versus 67% from charity shops. I changed my whole sourcing strategy."
          </p>
          <p className="mt-4 text-sm text-ink-lt">— Sam R., reseller · Manchester, UK</p>
        </div>
        <div className="text-center">
          <div className="font-serif text-4xl font-medium text-ink">11.4</div>
          <div className="text-xs font-semibold uppercase text-sage-dim mt-2">avg days to sell</div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-ink text-cream px-12 py-16">
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
