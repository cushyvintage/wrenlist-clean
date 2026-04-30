import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingNav } from '@/components/layout/MarketingNav'
import { MarketingFooter } from '@/components/layout/MarketingFooter'

const SITE_URL = 'https://wrenlist.com'
const POST_URL = `${SITE_URL}/blog/why-i-built-wrenlist`
const PUBLISHED = '2026-04-30'

export const metadata: Metadata = {
  title: 'Why I Built Wrenlist',
  description:
    'From spreadsheet chaos to the operating system for UK resellers. The story behind Wrenlist and why I built it.',
  keywords: [
    'wrenlist story',
    'why wrenlist',
    'reselling tool',
    'vintage reseller',
    'uk reselling',
    'margin tracking',
    'reselling business',
  ],
  alternates: { canonical: POST_URL },
  openGraph: {
    type: 'article',
    url: POST_URL,
    title: 'Why I Built Wrenlist',
    description:
      'From spreadsheet chaos to the operating system for UK resellers. The story of how Wrenlist came to be.',
    publishedTime: PUBLISHED,
    authors: ['Dom Cushnan'],
    siteName: 'Wrenlist',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Why I Built Wrenlist',
    description:
      'From spreadsheet chaos to the operating system for UK resellers.',
  },
}

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Why I Built Wrenlist',
  description:
    'The story behind Wrenlist: how a side hustle problem became the operating system for UK resellers.',
  datePublished: PUBLISHED,
  dateModified: PUBLISHED,
  author: {
    '@type': 'Person',
    name: 'Dom Cushnan',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Wrenlist',
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/wren-logo.png`,
    },
  },
  mainEntityOfPage: POST_URL,
}

export default function WhyIBuiltWrenlistPost() {
  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <MarketingNav />

      <article className="max-w-2xl mx-auto px-5 sm:px-8 lg:px-12 py-12">
        <div className="mb-10">
          <Link href="/blog" className="text-xs text-[#527050] hover:text-[#5a7a57]">← All posts</Link>
          <div className="flex items-center gap-3 text-xs font-medium uppercase text-[#527050] mt-6 mb-3">
            <span>Story</span>
            <span>·</span>
            <time dateTime={PUBLISHED}>30 April 2026</time>
            <span>·</span>
            <span>7 min read</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#1e2e1c] leading-tight mb-4">
            Why I Built Wrenlist
          </h1>
          <p className="text-base text-[#4a6147] leading-relaxed">
            <em>"I kept building spreadsheets to run my reselling business. They kept breaking. So I built something that wouldn\'t."</em>
          </p>
        </div>

        <div className="prose prose-sm max-w-none space-y-6 text-[#1e2e1c] leading-relaxed">
          <section>
            <p>
              When you spend your weeks thinking about systems—how complex things fit together, where the gaps are, why well-intentioned processes quietly fail—you develop a certain intolerance for broken tools. Even on the weekends, when you\'re supposed to be switching off.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-normal text-[#1e2e1c] mt-8 mb-4">
              By day, I build systems. <em className="italic">By weekend, I source.</em>
            </h2>
            <p>
              I work in technology. The kind where you spend a lot of time thinking about how complex things fit together, where the gaps are, and why well-intentioned processes quietly break. It\'s work that requires a certain kind of patience with imperfect systems.
            </p>
            <p>
              On weekends, I switch off. Or try to. I source vintage on the Welsh border—genuinely good patch for house clearances, small-town charity shops, and local auctions that haven\'t been picked over. I\'ve been doing it for years, first as a hobby, then properly as a business that funds itself and gives me the kind of Saturday I need after a week of screens.
            </p>
            <p>
              The reselling part started simple. A few items here and there, learning the platforms, figuring out what sells. But as it grew, the real challenge wasn\'t finding stock or listing items. It was knowing whether any of it was actually working.
            </p>
            <p className="italic text-[#4a6147]">
              I wasn\'t after listing speed. I wanted to know which car boot was worth the 6am start, and which category was actually making me money.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-normal text-[#1e2e1c] mt-8 mb-4">
              The tools that existed <em className="italic">weren\'t built for me.</em>
            </h2>
            <p>
              I tried spreadsheets. Brittle, slow to update at the rack, impossible to get useful numbers out of. I tried Vendoo and Crosslist—solid tools for listing speed, but useless for the questions I actually cared about:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#4a6147] pl-2">
              <li>What\'s my real margin on this jacket?</li>
              <li>Which source gives me the best return?</li>
              <li>Which platforms are selling, and which are just sitting?</li>
            </ul>
            <p>
              Everything was either too basic, too US-focused, or built for someone who treats reselling as a side hobby rather than a real small business. Nothing started at the rack. Nothing thought in pounds. Nothing tracked the full journey from find to sale.
            </p>
            <p>
              The existing tools optimised for what vendors wanted to measure: listings per hour, items published per day. Not what I needed to measure: profit per hour, earnings per source, platform performance.
            </p>
            <p>
              One evening I started building the thing I needed. Not as a product—as a tool that solved my specific problem. When I mentioned it in reselling communities, the response was immediate.
            </p>
            <p className="italic text-[#4a6147]">Same spreadsheet frustrations. Same gap.</p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-normal text-[#1e2e1c] mt-8 mb-4">
              £0 outside funding. UK first, always. Built on what it earns.
            </h2>
            <p>
              Wrenlist is bootstrapped, independent, and built to stay that way.
            </p>
            <p>
              No VC money means no pressure to bloat it with features nobody asked for. No pressure to optimise for metrics that aren\'t yours. No investor deck driving product decisions. Just a tool, built because it was needed, iterated based on what actually matters to the people using it.
            </p>
            <p>
              Every pricing decision I\'ve made has been as someone who knows what £14 a month means to a reseller still figuring out if this is a hobby or a business. It\'s not a lot. But it has to earn its keep.
            </p>
            <p>
              The code is written by someone who actually uses it, at the rack, at 9am on a Tuesday morning in a draughty house clearance. The margin tracking is prominent because it\'s the only number that actually matters. The source analytics exist because I wanted to know whether that two-hour drive to Builth Wells was worth it.
            </p>
            <p>
              UK first, always. Not an afterthought. Built for how you actually resell in 2026: multiple platforms, pound sterling, HMRC mileage tracking, UK marketplace quirks. Everything else scales around that.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-normal text-[#1e2e1c] mt-8 mb-4">
              Still building. Still sourcing.
            </h2>
            <p>
              The roadmap is public. Vote on features. Watch things actually get built based on what resellers ask for, not what venture capital demands.
            </p>
            <p>
              <strong>Depop integration</strong> — bringing your inventory to Gen Z buyers who are moving from TikTok to Depop.
            </p>
            <p>
              <strong>Mobile app</strong> — a real one, built for the rack. Not a responsive web page dressed up as an app. The add-find screen is already fast, but it should work offline too.
            </p>
            <p>
              <strong>Smarter pricing</strong> — Wren AI that shows you what comparable items actually sold for, not just what they\'re listed at. Not based on asking prices. Based on real sales.
            </p>
            <p>
              <strong>Built with users</strong> — the roadmap is public. Vote, suggest, watch things actually get built. <Link href="/roadmap" className="text-[#527050] underline hover:text-[#5a7a57]">See the roadmap →</Link>
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-normal text-[#1e2e1c] mt-8 mb-4">
              If this sounds familiar
            </h2>
            <p>
              The spreadsheet. The guesswork. The Sunday hauls. The wondering if you\'re actually making money.
            </p>
            <p>
              You\'re who this was built for.
            </p>
            <p>
              Wrenlist is for resellers who care about margin. Who want to know whether their time is actually earning them anything. Who\'ve tried the fast-listing tools and found them useless for actual business decisions.
            </p>
            <p>
              It\'s for the side hustle that stopped being a side hustle. For the person at the car boot sale at 6am wondering if the price they\'re about to pay is going to clear.
            </p>
          </section>

          <section className="bg-[#3d5c3a] rounded-lg p-6 sm:p-8 mt-10 text-white">
            <div className="space-y-4">
              <Link href="/?waitlist=1" className="block bg-[#527050] text-[#f5f0e8] rounded text-sm font-medium px-6 py-3 text-center hover:bg-[#2c4428] transition-colors">
                Join the waitlist
              </Link>
              <Link href="/pricing" className="block border border-white/20 rounded text-sm font-normal text-white px-6 py-3 text-center hover:bg-white/10 transition-colors">
                See pricing
              </Link>
            </div>
          </section>
        </div>
      </article>

      <MarketingFooter />
    </div>
  )
}
