import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingNav } from '@/components/layout/MarketingNav'
import { MarketingFooter } from '@/components/layout/MarketingFooter'
import { Reveal } from '@/components/motion'

const SITE_URL = 'https://wrenlist.com'
const PAGE_URL = `${SITE_URL}/marketplace-comparison`
const OG_IMAGE = `${SITE_URL}/api/og/marketplace-comparison`

export const metadata: Metadata = {
  title: 'Vinted vs eBay vs Etsy vs Depop vs Shopify — UK Reseller Marketplace Comparison',
  description:
    'Complete 2025/26 guide comparing Vinted (free for sellers), eBay, Etsy, Depop & Shopify for UK vintage resellers. Fees, audiences, listing effort, and why multi-platform is your best strategy.',
  keywords: [
    'vinted vs ebay',
    'best reselling platform uk',
    'etsy vs depop',
    'vintage reseller platforms',
    'multi-marketplace selling',
    'uk reseller guide',
    'depop fees',
    'shopify for resellers',
  ],
  authors: [{ name: 'Wrenlist' }],
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    title: 'Vinted vs eBay vs Etsy vs Depop vs Shopify — 2025/26 Marketplace Comparison',
    description:
      'Compare fees, audiences, listing effort & payout speeds across all major UK reselling platforms. Find which marketplace fits your business.',
    siteName: 'Wrenlist',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Wrenlist Marketplace Comparison Guide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UK Marketplace Comparison for Resellers',
    description: 'Vinted vs eBay vs Etsy vs Depop vs Shopify — fees, audiences, effort.',
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
}

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'ComparisonChart',
  name: 'UK Reselling Marketplace Comparison',
  description:
    'Comprehensive comparison of Vinted, eBay, Etsy, Depop, and Shopify for UK vintage and secondhand resellers.',
  url: PAGE_URL,
  creator: {
    '@type': 'Organization',
    name: 'Wrenlist',
  },
}

export default function MarketplaceComparisonPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <MarketingNav />

      <main className="bg-[#f5f0e8] min-h-screen">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-5 sm:px-10 py-12 sm:py-20">
          <Reveal>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#1e2e1c] mb-4">
              Which Reselling Platform is Right For You?
            </h1>
          </Reveal>
          <Reveal>
            <p className="text-lg sm:text-xl font-light text-[#6b7d6a] leading-relaxed">
              Vinted, eBay, Etsy, Depop, and Shopify each serve different audiences and item types. Most successful UK resellers sell on multiple platforms. Here's how they compare in 2025/26.
            </p>
          </Reveal>
        </section>

        {/* Comparison Table */}
        <section className="max-w-5xl mx-auto px-5 sm:px-10 py-12">
          <Reveal>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#1e2e1c] mb-8">
              At a Glance
            </h2>
          </Reveal>

          <Reveal>
            <div className="overflow-x-auto rounded-lg border border-[rgba(61,92,58,0.22)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#ede8de] border-b border-[rgba(61,92,58,0.14)]">
                    <th className="text-left px-4 py-3 font-medium text-[#1e2e1c]">Platform</th>
                    <th className="text-left px-4 py-3 font-medium text-[#1e2e1c]">Seller Fees</th>
                    <th className="text-left px-4 py-3 font-medium text-[#1e2e1c]">Best For</th>
                    <th className="text-left px-4 py-3 font-medium text-[#1e2e1c]">Payout Speed</th>
                    <th className="text-left px-4 py-3 font-medium text-[#1e2e1c]">Listing Effort</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[rgba(61,92,58,0.14)]">
                    <td className="px-4 py-3 font-medium text-[#1e2e1c]">Vinted</td>
                    <td className="px-4 py-3 text-[#6b7d6a]">Free for sellers (buyers pay protection fee)</td>
                    <td className="px-4 py-3 text-[#6b7d6a]">Clothing, shoes, bags</td>
                    <td className="px-4 py-3 text-[#6b7d6a]">1–2 days</td>
                    <td className="px-4 py-3 text-[#6b7d6a]">Very easy</td>
                  </tr>
                  <tr className="border-b border-[rgba(61,92,58,0.14)]">
                    <td className="px-4 py-3 font-medium text-[#1e2e1c]">eBay</td>
                    <td className="px-4 py-3 text-[#6b7d6a]">6–13%</td>
                    <td className="px-4 py-3 text-[#6b7d6a]">Collectibles, niche items</td>
                    <td className="px-4 py-3 text-[#6b7d6a]">2–3 days</td>
                    <td className="px-4 py-3 text-[#6b7d6a]">Moderate</td>
                  </tr>
                  <tr className="border-b border-[rgba(61,92,58,0.14)]">
                    <td className="px-4 py-3 font-medium text-[#1e2e1c]">Etsy</td>
                    <td className="px-4 py-3 text-[#6b7d6a]">8–16%</td>
                    <td className="px-4 py-3 text-[#6b7d6a]">Vintage, handmade, curated</td>
                    <td className="px-4 py-3 text-[#6b7d6a]">3–5 days</td>
                    <td className="px-4 py-3 text-[#6b7d6a]">Easy</td>
                  </tr>
                  <tr className="border-b border-[rgba(61,92,58,0.14)]">
                    <td className="px-4 py-3 font-medium text-[#1e2e1c]">Depop</td>
                    <td className="px-4 py-3 text-[#6b7d6a]">No seller commission + ~2.9% + 30p payment processing</td>
                    <td className="px-4 py-3 text-[#6b7d6a]">Fashion, Gen Z audience</td>
                    <td className="px-4 py-3 text-[#6b7d6a]">1–2 days</td>
                    <td className="px-4 py-3 text-[#6b7d6a]">Very easy</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-[#1e2e1c]">Shopify</td>
                    <td className="px-4 py-3 text-[#6b7d6a]">$29–399/mo + payment fees</td>
                    <td className="px-4 py-3 text-[#6b7d6a]">Serious brands, high volume</td>
                    <td className="px-4 py-3 text-[#6b7d6a]">1–3 days</td>
                    <td className="px-4 py-3 text-[#6b7d6a]">High</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        {/* Platform Guides */}
        <section className="max-w-5xl mx-auto px-5 sm:px-10 py-12">
          <Reveal>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#1e2e1c] mb-12">
              Platform Profiles
            </h2>
          </Reveal>

          <div className="space-y-12">
            {/* Vinted */}
            <Reveal>
              <div className="border-l-4 border-[#3d5c3a] pl-6 pb-8 border-b border-[rgba(61,92,58,0.14)]">
                <h3 className="font-serif text-xl font-medium text-[#1e2e1c] mb-3">Vinted</h3>
                <p className="text-[#6b7d6a] mb-4 leading-relaxed">
                  The #1 secondhand fashion app in the UK. Fast sales, minimal friction, huge audience of young buyers looking for bargains.
                </p>
                <div className="space-y-2 text-sm text-[#6b7d6a]">
                  <p><strong className="text-[#1e2e1c]">✓ Pros:</strong> Instant notifications, high sell-through rate, automatic postage labels, simple listing (photo + text), buyer pool trusts the platform</p>
                  <p><strong className="text-[#1e2e1c]">✗ Cons:</strong> No seller fees — buyers pay a buyer protection fee instead. Limited to clothing, accessories, shoes and homeware. Algorithm favours frequent listers, pricing tends to race to the bottom.</p>
                  <p><strong className="text-[#1e2e1c]">💰 Best for:</strong> Clothing, designer pieces, fast turnover, new sellers (lowest friction entry)</p>
                </div>
              </div>
            </Reveal>

            {/* eBay */}
            <Reveal>
              <div className="border-l-4 border-[#3d5c3a] pl-6 pb-8 border-b border-[rgba(61,92,58,0.14)]">
                <h3 className="font-serif text-xl font-medium text-[#1e2e1c] mb-3">eBay UK</h3>
                <p className="text-[#6b7d6a] mb-4 leading-relaxed">
                  Largest auction & fixed-price platform in the UK. Older buyer base with strong purchasing power. Best for niche collectibles and hard-to-find items.
                </p>
                <div className="space-y-2 text-sm text-[#6b7d6a]">
                  <p><strong className="text-[#1e2e1c]">✓ Pros:</strong> 15M+ UK buyers, higher AOV for collectibles, auction format can drive competition (higher final price), detailed item descriptions valued, established seller ratings matter</p>
                  <p><strong className="text-[#1e2e1c]">✗ Cons:</strong> 6–13% final value fees, longer listings (need detailed condition, dimensions, item specifics), auction unpredictability, slower sales (7–14 days average)</p>
                  <p><strong className="text-[#1e2e1c]">💰 Best for:</strong> Collectibles, vintage furniture, niche hobbies, sellers with patience and attention to detail</p>
                </div>
              </div>
            </Reveal>

            {/* Etsy */}
            <Reveal>
              <div className="border-l-4 border-[#3d5c3a] pl-6 pb-8 border-b border-[rgba(61,92,58,0.14)]">
                <h3 className="font-serif text-xl font-medium text-[#1e2e1c] mb-3">Etsy</h3>
                <p className="text-[#6b7d6a] mb-4 leading-relaxed">
                  Global vintage and handmade marketplace with a strongly curated vibe. Buyers actively search for authentic, quality vintage items.
                </p>
                <div className="space-y-2 text-sm text-[#6b7d6a]">
                  <p><strong className="text-[#1e2e1c]">✓ Pros:</strong> 8–16% fees (all-in: listing + transaction + payment), global reach, vintage items perform well, strong brand loyalty, buyers expect premium quality</p>
                  <p><strong className="text-[#1e2e1c]">✗ Cons:</strong> Highest percentage fees, shipping complications (international by default), Etsy's algorithm favours vintage/handmade stories (requires good photos + copy), slower organic growth (requires shop setup + consistent listings)</p>
                  <p><strong className="text-[#1e2e1c]">💰 Best for:</strong> Vintage furniture, mid-century homeware, jewellery, sellers with strong photography skills</p>
                </div>
              </div>
            </Reveal>

            {/* Depop */}
            <Reveal>
              <div className="border-l-4 border-[#3d5c3a] pl-6 pb-8 border-b border-[rgba(61,92,58,0.14)]">
                <h3 className="font-serif text-xl font-medium text-[#1e2e1c] mb-3">Depop</h3>
                <p className="text-[#6b7d6a] mb-4 leading-relaxed">
                  Social-first secondhand fashion app. Heavily Gen Z, fast, Instagram-like. Best for fashion-forward sellers who enjoy community engagement.
                </p>
                <div className="space-y-2 text-sm text-[#6b7d6a]">
                  <p><strong className="text-[#1e2e1c]">✓ Pros:</strong> Very young buyer base (high impulse purchase), social discovery (followers, likes), Depop's in-app messaging, automatic shipping labels, high engagement culture</p>
                  <p><strong className="text-[#1e2e1c]">✗ Cons:</strong> No platform commission (removed 2023) but payment processing fee applies (~2.9% + 30p). Requires constant engagement, algorithm favours active sellers, can feel saturated with small sellers.</p>
                  <p><strong className="text-[#1e2e1c]">💰 Best for:</strong> Fashion, streetwear, thrifted brands, sellers who like social selling and community</p>
                </div>
              </div>
            </Reveal>

            {/* Shopify */}
            <Reveal>
              <div className="border-l-4 border-[#3d5c3a] pl-6 pb-8">
                <h3 className="font-serif text-xl font-medium text-[#1e2e1c] mb-3">Shopify</h3>
                <p className="text-[#6b7d6a] mb-4 leading-relaxed">
                  DIY storefront platform. Requires your own branding, marketing, and customer acquisition. Best for established businesses with consistent inventory.
                </p>
                <div className="space-y-2 text-sm text-[#6b7d6a]">
                  <p><strong className="text-[#1e2e1c]">✓ Pros:</strong> Full control over brand, no marketplace caps on listings, competitive analysis & SEO possible, customer data owned (not platform's), lower take-rate long-term</p>
                  <p><strong className="text-[#1e2e1c]">✗ Cons:</strong> $29–399/month fixed cost + payment processing fees (2–3%), requires website setup + marketing budget, no built-in buyer audience (you own acquisition costs), high initial complexity</p>
                  <p><strong className="text-[#1e2e1c]">💰 Best for:</strong> Established brands, high-volume sellers, strong email list, own marketing channel</p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Verdict */}
        <section className="max-w-4xl mx-auto px-5 sm:px-10 py-12">
          <Reveal>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#1e2e1c] mb-8">
              Which Should I Use?
            </h2>
          </Reveal>

          <Reveal>
            <div className="bg-[#ede8de] rounded-lg p-6 sm:p-8 border border-[rgba(61,92,58,0.22)]">
              <p className="text-[#1e2e1c] leading-relaxed mb-6">
                <strong>The answer: all of them (or most of them).</strong>
              </p>
              <p className="text-[#6b7d6a] leading-relaxed mb-6">
                The most successful UK resellers don't pick one platform — they list the same item across 3–5 platforms and let the network effects work. Here's a starter strategy:
              </p>

              <div className="space-y-4 text-sm text-[#6b7d6a]">
                <div>
                  <p className="font-medium text-[#1e2e1c] mb-1">1. Start with Vinted</p>
                  <p>Lowest friction, fastest sales, easiest for new sellers. Get your first 20 sales here.</p>
                </div>
                <div>
                  <p className="font-medium text-[#1e2e1c] mb-1">2. Add eBay (if collectibles/niche)</p>
                  <p>If you're sourcing collectibles, coins, vintage records, or specialist items, eBay's buyer pool pays premium.</p>
                </div>
                <div>
                  <p className="font-medium text-[#1e2e1c] mb-1">3. Add Etsy (for vintage)</p>
                  <p>If your items are genuine vintage furniture, mid-century, jewellery — Etsy's audience actively pays more for curation.</p>
                </div>
                <div>
                  <p className="font-medium text-[#1e2e1c] mb-1">4. Try Depop (if fashion-forward)</p>
                  <p>Only if you enjoy social selling and have youth-appeal items. Not mandatory but fun if it fits your style.</p>
                </div>
                <div>
                  <p className="font-medium text-[#1e2e1c] mb-1">5. Skip Shopify (unless £500+/week)</p>
                  <p>Don't start here. Shopify makes sense once you're doing serious volume and have your own audience.</p>
                </div>
              </div>

              <p className="text-[#6b7d6a] mt-6 leading-relaxed">
                Wrenlist does exactly this for you — simultaneously list, manage inventory, and track sales across all platforms from one dashboard.
              </p>
            </div>
          </Reveal>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-5 sm:px-10 py-12">
          <Reveal>
            <div className="bg-[#3d5c3a] rounded-lg p-8 sm:p-12 text-center">
              <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#f5f0e8] mb-4">
                Ready to sell on multiple platforms?
              </h2>
              <p className="text-[#c4d4c2] mb-8 text-lg">
                Use Wrenlist to manage all your listings from one place — automatic posting, inventory sync, and data across every platform.
              </p>
              <Link
                href="/register"
                className="inline-block bg-[#f5f0e8] text-[#3d5c3a] rounded font-medium px-8 py-3 hover:bg-[#ede8de] transition-colors"
              >
                Start Selling Free
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <MarketingFooter />
    </>
  )
}
