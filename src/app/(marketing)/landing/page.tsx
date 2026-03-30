'use client'

import Link from 'next/link'

export default function LandingPage() {
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
          <Link href="/landing" className="text-xs font-medium text-ink">home</Link>
          <Link href="/pricing" className="text-xs font-light text-ink-lt hover:text-ink">pricing</Link>
          <Link href="/about" className="text-xs font-light text-ink-lt hover:text-ink">why wrenlist</Link>
        </div>
        <div className="flex gap-2 items-center">
          <button className="border border-[rgba(61,92,58,0.22)] rounded text-xs font-light text-ink-lt px-4 py-2 hover:bg-cream-md hover:text-ink">log in</button>
          <button className="bg-sage text-cream rounded text-xs font-medium px-4.5 py-2 hover:bg-sage-dk letter-spacing">start free</button>
        </div>
      </nav>

      {/* HERO */}
      <div className="grid grid-cols-2 border-b border-[rgba(61,92,58,0.14)]">
        <div className="flex flex-col justify-center border-r border-[rgba(61,92,58,0.14)] px-12 py-16">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-sage-dim">The thrifter's operating system</p>
          <h1 className="mb-4.5 font-serif text-6xl font-light leading-tight text-ink">
            Every find,<br />
            <em className="italic text-sage-lt">accounted</em>
            <br />
            <strong className="font-medium">for.</strong>
          </h1>
          <p className="mb-7 max-w-xs font-light leading-relaxed text-ink-lt">
            Wrenlist tracks your inventory, prices your pieces, and crosslists to Vinted, eBay, Etsy & Shopify — so you can spend more time at the rack.
          </p>
          <div className="flex gap-3.5 items-center">
            <button className="rounded bg-sage px-7.5 py-3.25 font-medium uppercase text-cream text-xs tracking-widest hover:bg-sage-dk">
              Start free — no card needed
            </button>
            <a href="/dashboard" className="text-sm font-light text-sage-lt underline cursor-pointer hover:text-sage">
              see the app →
            </a>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-3.5 bg-cream-md px-10 py-10">
          <div className="text-10px font-medium uppercase tracking-wider text-sage-dim">your inventory · march 2026</div>

          {/* Inventory Card 1 */}
          <div className="rounded-md border border-[rgba(61,92,58,0.14)] bg-cream p-3.5 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-ink">Carhartt Detroit jacket — brown, M</div>
              <div className="text-xs text-sage-dim mt-0.75">workwear · house clearance · cost £12</div>
              <div className="mt-1.5 flex gap-2">
                <span className="inline-block rounded text-10px font-medium px-2 py-1 bg-green-100 text-green-700">listed</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-serif text-xl font-medium text-ink">£145</div>
              <div className="text-10px text-sage-lt mt-0.5">+1,108% return</div>
            </div>
          </div>

          {/* Inventory Card 2 */}
          <div className="rounded-md border border-[rgba(61,92,58,0.14)] bg-cream p-3.5 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-ink">New Balance 990v3 — grey, 10.5</div>
              <div className="text-xs text-sage-dim mt-0.75">footwear · Salvation Army · cost £8</div>
              <div className="mt-1.5 flex gap-2">
                <span className="inline-block rounded text-10px font-medium px-2 py-1 bg-blue-100 text-blue-700">on hold</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-serif text-xl font-medium text-ink">£210</div>
              <div className="text-10px text-sage-lt mt-0.5">+2,525% return</div>
            </div>
          </div>

          {/* Inventory Card 3 */}
          <div className="rounded-md border border-[rgba(61,92,58,0.14)] bg-cream p-3.5 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-ink">Pendleton wool shirt — plaid, L</div>
              <div className="text-xs text-sage-dim mt-0.75">tops · flea market · cost £6</div>
              <div className="mt-1.5 flex gap-2">
                <span className="inline-block rounded text-10px font-medium px-2 py-1 bg-amber-100 text-amber-700">sold £89</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-serif text-xl font-medium text-ink">£89</div>
              <div className="text-10px text-sage-lt mt-0.5">+1,383% return</div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2.5 mt-1">
            <div className="rounded-md border border-[rgba(61,92,58,0.14)] bg-cream p-3 text-center">
              <div className="font-serif text-2xl font-medium text-ink">147</div>
              <div className="text-10px font-semibold uppercase text-sage-dim mt-0.75">active finds</div>
              <div className="text-10px text-green-600 mt-0.5">+12 this week</div>
            </div>
            <div className="rounded-md border border-[rgba(61,92,58,0.14)] bg-cream p-3 text-center">
              <div className="font-serif text-2xl font-medium text-ink">68%</div>
              <div className="text-10px font-semibold uppercase text-sage-dim mt-0.75">avg margin</div>
              <div className="text-10px text-green-600 mt-0.5">up from 61%</div>
            </div>
            <div className="rounded-md border border-[rgba(61,92,58,0.14)] bg-cream p-3 text-center">
              <div className="font-serif text-2xl font-medium text-ink">£3.2k</div>
              <div className="text-10px font-semibold uppercase text-sage-dim mt-0.75">this month</div>
              <div className="text-10px text-green-600 mt-0.5">+18%</div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES STRIP */}
      <div className="grid grid-cols-3 border-b border-[rgba(61,92,58,0.14)]">
        <div className="border-r border-[rgba(61,92,58,0.14)] px-10 py-9">
          <div className="font-serif text-5xl text-cream-dk mb-2.5">01</div>
          <div className="text-sm font-medium text-ink mb-2">Log every find instantly</div>
          <div className="text-sm font-light leading-relaxed text-ink-lt">
            Snap a photo, enter cost, done. Wrenlist fills in category, condition, and comparable sold prices before you leave the shop floor.
          </div>
        </div>
        <div className="border-r border-[rgba(61,92,58,0.14)] px-10 py-9">
          <div className="font-serif text-5xl text-cream-dk mb-2.5">02</div>
          <div className="text-sm font-medium text-ink mb-2">Price with confidence</div>
          <div className="text-sm font-light leading-relaxed text-ink-lt">
            Live comp data from Vinted, eBay, Etsy and more. Know what your piece is worth before you list it, not after it sits for 60 days.
          </div>
        </div>
        <div className="px-10 py-9">
          <div className="font-serif text-5xl text-cream-dk mb-2.5">03</div>
          <div className="text-sm font-medium text-ink mb-2">List everywhere at once</div>
          <div className="text-sm font-light leading-relaxed text-ink-lt">
            Cross-post to Vinted, eBay, Etsy & Shopify from one screen. When it sells, every other listing comes down automatically.
          </div>
        </div>
      </div>

      {/* FEATURES GRID SECTION */}
      <section className="bg-cream px-12 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <div className="mb-2.5 text-10px font-medium uppercase tracking-wider text-sage-dim">everything included</div>
            <h2 className="font-serif text-3xl font-light text-ink">
              One product. <em className="italic">Every tool.</em>
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-8 mb-5">
            {[
              { icon: '📋', title: 'Inventory tracker', desc: 'Every find, every status, one place' },
              { icon: '📊', title: 'Cost & margin tracking', desc: 'Margin % on every find, always visible' },
              { icon: '🔗', title: 'Crosslist to 4 platforms', desc: 'Vinted, eBay, Etsy & Shopify at once' },
              { icon: '⬇️', title: 'Auto-delist on sale', desc: 'Sold on one platform? All others come down' },
              { icon: '✏️', title: 'AI listing writer', desc: 'Wren AI drafts titles & descriptions' },
              { icon: '⭐', title: 'Price suggestions', desc: 'Live comp data across UK marketplaces' },
              { icon: '📸', title: 'Background removal', desc: 'Unlimited clean product photos, included' },
              { icon: '✓', title: 'Bulk actions', desc: 'Relist, reprice, mark sold in batches' },
              { icon: '📍', title: 'Sourcing log', desc: 'Track trips, spend & yield by location' },
            ].map((feat, i) => (
              <div key={i} className="flex gap-3">
                <div className="text-2xl flex-shrink-0">{feat.icon}</div>
                <div>
                  <div className="text-sm font-medium text-ink">{feat.title}</div>
                  <div className="text-xs font-light text-ink-lt">{feat.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center text-xs text-ink-lt font-light">
            All features included on paid plans. <Link href="/pricing" className="text-sage-lt underline">See plan comparison →</Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <div className="grid grid-cols-2 border-b border-[rgba(61,92,58,0.14)] bg-sage-pale px-12 py-12">
        <div>
          <p className="font-serif text-lg leading-relaxed text-ink">
            "I used to track everything in a Notes app. Wrenlist made me realise how much money I was leaving at the bottom of the pile."
          </p>
          <p className="mt-4 text-sm text-ink-lt">— Jordan K., full-time reseller · London, UK</p>
        </div>
        <div className="text-center">
          <div className="font-serif text-4xl font-medium text-ink">68%</div>
          <div className="text-xs font-semibold uppercase text-sage-dim mt-2">avg user margin</div>
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
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded bg-opacity-10 bg-white flex items-center justify-center cursor-pointer">📱</div>
              <div className="w-7 h-7 rounded bg-opacity-10 bg-white flex items-center justify-center cursor-pointer">🎬</div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase mb-4 text-cream">Platform</div>
            <div className="flex flex-col gap-3 text-sm font-light">
              <Link href="/pricing">Pricing</Link>
              <Link href="/about">Why Wrenlist</Link>
              <a href="#">Marketplaces</a>
              <a href="#">Login</a>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase mb-4 text-cream">Resources</div>
            <div className="flex flex-col gap-3 text-sm font-light">
              <a href="#">Blog</a>
              <a href="#">Changelog</a>
              <Link href="/roadmap">Roadmap</Link>
              <a href="#">Fee calculator</a>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase mb-4 text-cream">Company</div>
            <div className="flex flex-col gap-3 text-sm font-light">
              <Link href="/story">Our story</Link>
              <a href="#">Terms</a>
              <a href="#">Privacy</a>
            </div>
          </div>
        </div>
        <div className="border-t border-opacity-10 border-white pt-8 text-center text-xs font-light text-cream">
          © 2026 Wrenlist. Built by thrifters, for thrifters.
        </div>
      </footer>
    </div>
  )
}
