import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingNav } from '@/components/layout/MarketingNav'
import { MarketingFooter } from '@/components/layout/MarketingFooter'

const SITE_URL = 'https://wrenlist.com'
const POST_URL = `${SITE_URL}/blog/vinted-vs-depop-uk-sellers`
const PUBLISHED = '2026-04-11'

export const metadata: Metadata = {
  title: 'Vinted vs Depop: Which is Better for UK Resellers in 2026?',
  description:
    'A plain-English comparison of Vinted and Depop for UK resellers in 2026. Fees, audience, what sells, listing speed, payouts and shipping — and which platform wins for which kind of seller.',
  keywords: [
    'vinted vs depop',
    'vinted vs depop uk',
    'depop fees 2026',
    'vinted fees 2026',
    'best platform for uk resellers',
    'vinted or depop',
    'sell clothes online uk',
  ],
  alternates: { canonical: POST_URL },
  openGraph: {
    type: 'article',
    url: POST_URL,
    title: 'Vinted vs Depop: Which is Better for UK Resellers in 2026?',
    description:
      'Fees, audience, what sells, and the daily experience of selling on Vinted vs Depop in the UK — compared honestly for 2026.',
    publishedTime: PUBLISHED,
    authors: ['Wrenlist'],
    siteName: 'Wrenlist',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vinted vs Depop: Which is Better for UK Resellers in 2026?',
    description:
      'Fees, audience, what sells, and daily experience — compared honestly for UK resellers in 2026.',
  },
}

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Vinted vs Depop: Which is better for UK resellers in 2026?',
  description:
    'A plain-English comparison of Vinted and Depop for UK resellers in 2026. Fees, audience, listing experience, payouts and the verdict.',
  datePublished: PUBLISHED,
  dateModified: PUBLISHED,
  author: {
    '@type': 'Organization',
    name: 'Wrenlist',
    url: SITE_URL,
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

export default function VintedVsDepopPost() {
  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <MarketingNav />

      <article className="max-w-2xl mx-auto px-5 sm:px-8 lg:px-12 py-12">
        {/* HEADER */}
        <div className="mb-10">
          <Link href="/blog" className="text-xs text-[#8a9e88] hover:text-[#5a7a57]">← All posts</Link>
          <div className="flex items-center gap-3 text-10px font-medium uppercase text-[#8a9e88] mt-6 mb-3">
            <span>Platforms</span>
            <span>·</span>
            <time dateTime={PUBLISHED}>11 April 2026</time>
            <span>·</span>
            <span>8 min read</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#1e2e1c] leading-tight mb-4">
            Vinted vs Depop: <em className="italic">which is better for UK resellers in 2026?</em>
          </h1>
          <p className="text-base text-[#6b7d6a] leading-relaxed">
            If you&apos;re selling clothes, shoes or accessories in the UK, Vinted and Depop are
            probably the two names at the top of your list. Both are free to list on. Both now run
            on a buyer-pays fee model. But they are wildly different businesses underneath — and
            the right answer genuinely depends on what you sell and who you sell it to. Here&apos;s
            an honest comparison for 2026.
          </p>
        </div>

        {/* BODY */}
        <div className="prose prose-sm max-w-none space-y-6 text-[#1e2e1c] leading-relaxed">
          <section>
            <h2 className="font-serif text-xl font-medium text-[#1e2e1c] mt-8 mb-3">The TL;DR</h2>
            <p className="text-sm text-[#6b7d6a]">
              Vinted is bigger, faster, and better for volume. Depop is smaller, slower, and better
              for premium or brand-led items. Most serious UK resellers end up on both.
            </p>
            <ul className="text-sm text-[#6b7d6a] space-y-2 mt-3 ml-5 list-disc">
              <li>
                <strong className="text-[#1e2e1c]">Vinted</strong> — roughly 20 million UK users.
                No seller fees. Buyer pays a Buyer Protection fee (around 5% plus a small fixed
                charge). Fast-moving, chat-first, everyday clothes and household items.
              </li>
              <li>
                <strong className="text-[#1e2e1c]">Depop</strong> — roughly 5 million UK users.
                As of 2024 Depop removed its 10% seller fee in the UK and switched to a buyer-pays
                model too. Curated, Instagram-style, vintage / Y2K / streetwear.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-[#1e2e1c] mt-8 mb-3">Fees in 2026 (and why they both changed)</h2>
            <p className="text-sm text-[#6b7d6a]">
              Both platforms moved to the same basic fee model in 2024, but they got there for
              different reasons and the detail matters.
            </p>
            <p className="text-sm text-[#6b7d6a] mt-3">
              <strong className="text-[#1e2e1c]">Vinted</strong> has always been free for sellers
              in the UK. There are no listing fees, no final value fees, no payment fees on the
              seller side. The buyer pays a Buyer Protection fee on top of the item price — roughly
              5% of the sale plus around £0.70 fixed. What the buyer pays for the item goes straight
              to your Vinted wallet.
            </p>
            <p className="text-sm text-[#6b7d6a] mt-3">
              <strong className="text-[#1e2e1c]">Depop</strong> used to charge a 10% seller fee on
              every sale in the UK, plus PayPal / Depop Payments processing fees. In 2024 they
              scrapped the 10% seller fee for UK sellers and introduced a buyer protection fee
              instead, putting them roughly in line with Vinted. The change was explicitly a
              response to sellers leaving for Vinted.
            </p>
            <p className="text-sm text-[#6b7d6a] mt-3">
              The practical upshot: on a £20 sale, you now keep roughly £20 on both platforms
              (minus payment processing on Depop, which is small). A few years ago the same £20
              sale on Depop would have netted you around £17 after the 10% fee and PayPal. It is
              genuinely a different platform to sell on now.
            </p>
            <p className="text-sm text-[#6b7d6a] mt-3">
              Worth noting: Vinted still monetises through promoted listings (&ldquo;Bumps&rdquo;)
              and optional Wardrobe Spotlight. Depop does the same with boosted listings. Neither
              is required, but both platforms nudge you toward them.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-[#1e2e1c] mt-8 mb-3">Audience: who actually shops on each</h2>
            <p className="text-sm text-[#6b7d6a]">
              This is the single biggest reason to pick one platform over the other. The fees are
              now similar; the buyers are not.
            </p>
            <p className="text-sm text-[#6b7d6a] mt-3">
              <strong className="text-[#1e2e1c]">Vinted&apos;s UK audience</strong> is broad and
              skews a bit older than you&apos;d expect. Think mums buying kids&apos; clothes,
              students looking for cheap everyday basics, households clearing out their wardrobes,
              and people who want high-street brands at charity-shop prices. New Look, H&amp;M,
              Zara, Primark, Next, George, Matalan — this is Vinted&apos;s bread and butter.
            </p>
            <p className="text-sm text-[#6b7d6a] mt-3">
              <strong className="text-[#1e2e1c]">Depop&apos;s UK audience</strong> is younger, more
              Gen Z, more style-led, and more willing to pay for a look. It&apos;s where Y2K
              crop tops, 90s Adidas, Carhartt, vintage Levi&apos;s, band tees, Dickies, Stüssy and
              archive-piece hunters live. It behaves more like a curated vintage fair than a car
              boot sale.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-[#1e2e1c] mt-8 mb-3">What sells well on each</h2>
            <p className="text-sm text-[#6b7d6a]">
              After months of selling across both, a pretty clear split emerges.
            </p>
            <p className="text-sm text-[#6b7d6a] mt-3">
              <strong className="text-[#1e2e1c]">Vinted wins for:</strong> high-street fashion,
              kids&apos; clothes (enormous category on Vinted), household bits and bedding, shoes
              under about £40, maternity wear, plus-size fashion, and anything you need to shift
              quickly. If the item&apos;s worth under £25, it usually sells faster on Vinted.
            </p>
            <p className="text-sm text-[#6b7d6a] mt-3">
              <strong className="text-[#1e2e1c]">Depop wins for:</strong> vintage (genuine vintage,
              not &ldquo;vintage-style&rdquo;), streetwear, designer, Y2K, archive pieces, statement
              accessories, graphic tees, and anything where presentation and a coherent &ldquo;shop
              vibe&rdquo; matters. If the same item could be worth £40 to the right buyer but £20 to
              a casual one, Depop is where you&apos;ll find the first kind.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-[#1e2e1c] mt-8 mb-3">Listing experience: speed vs polish</h2>
            <p className="text-sm text-[#6b7d6a]">
              This is where the platforms feel most different, and it shapes how you work.
            </p>
            <p className="text-sm text-[#6b7d6a] mt-3">
              <strong className="text-[#1e2e1c]">Vinted is built for speed.</strong> Listing an
              item takes under a minute once you know the form: photos, title, description,
              category, brand, size, condition, price. There are structured fields for everything,
              so buyers filter confidently. Buyers and sellers chat inside the app all day —
              Vinted&apos;s whole UX is built around that back-and-forth (haggling, bundles,
              questions, offers).
            </p>
            <p className="text-sm text-[#6b7d6a] mt-3">
              <strong className="text-[#1e2e1c]">Depop is built for polish.</strong> Listings look
              and feel like Instagram posts. Good photography genuinely matters — a flat-lay on a
              plain background outperforms a cluttered shot by a lot. Descriptions can be casual
              and personality-led. Your shop as a whole works as a feed, so a coherent aesthetic
              compounds over time. The trade-off is that each listing takes longer, and the
              platform rewards presentation skills that a Vinted seller doesn&apos;t need.
            </p>
            <p className="text-sm text-[#6b7d6a] mt-3">
              In practice, most resellers draft an item once and then crosspost it to both — which
              is the kind of thing Wrenlist exists to make painless.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-[#1e2e1c] mt-8 mb-3">Shipping and payouts</h2>
            <p className="text-sm text-[#6b7d6a]">
              <strong className="text-[#1e2e1c]">Vinted</strong> handles shipping end-to-end. The
              buyer picks a carrier at checkout (Evri, InPost, Yodel, Royal Mail) and you get a
              prepaid label. You drop it at a locker or shop, and once the buyer confirms
              delivery (or two days pass without a complaint) the money lands in your Vinted
              wallet. You can withdraw to your bank — usually within a couple of working days.
              The whole thing is designed so you never touch the postage cost.
            </p>
            <p className="text-sm text-[#6b7d6a] mt-3">
              <strong className="text-[#1e2e1c]">Depop</strong> gives you more flexibility and
              more responsibility. You can use Depop&apos;s ship-through labels (Royal Mail and
              Evri integration) or ship yourself and add tracking manually. Payouts land in your
              linked bank account via Depop Payments, typically within a few working days of
              the buyer confirming delivery. If you self-ship without tracking, disputes are
              harder to defend.
            </p>
            <p className="text-sm text-[#6b7d6a] mt-3">
              Dispute handling: both platforms lean toward buyers, but Vinted&apos;s verdicts
              tend to come faster because the evidence (their own label, their own tracking) is
              all inside the app. Depop disputes can take longer and rely more on the seller
              providing evidence.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-[#1e2e1c] mt-8 mb-3">Our verdict</h2>
            <p className="text-sm text-[#6b7d6a]">
              For most UK resellers the honest answer is &ldquo;both&rdquo; — but if you have to
              start somewhere, use this:
            </p>
            <ul className="text-sm text-[#6b7d6a] space-y-2 mt-3 ml-5 list-disc">
              <li>
                <strong className="text-[#1e2e1c]">Pick Vinted if:</strong> you&apos;re selling
                high-street fashion, kids&apos; clothes, household items or anything under £25;
                you want volume over margin; you&apos;d rather list fast than list pretty; or
                you&apos;re clearing out a wardrobe rather than running a shop.
              </li>
              <li>
                <strong className="text-[#1e2e1c]">Pick Depop if:</strong> you&apos;re selling
                vintage, streetwear, designer or anything where the buyer is paying for a specific
                vibe; you enjoy styling and photography; you want to build a recognisable shop
                rather than shift stock; or your price points start around £25 and go up from there.
              </li>
              <li>
                <strong className="text-[#1e2e1c]">Pick both if:</strong> you&apos;re serious
                about reselling as a side hustle or a business. Different items sell on different
                platforms, and the audiences barely overlap — crossposting is how you stop
                leaving money on the table.
              </li>
            </ul>
            <p className="text-sm text-[#6b7d6a] mt-3">
              The one thing both platforms now share, apart from the buyer-pays fee model, is that
              HMRC sees your sales on them. That brings us to the awkward bit.
            </p>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-lg bg-[#d4e2d2] p-8 text-center">
          <h3 className="font-serif text-xl font-medium text-[#1e2e1c] mb-2">
            Whichever platform you pick, HMRC now sees your sales
          </h3>
          <p className="text-sm text-[#6b7d6a] mb-5 max-w-md mx-auto">
            Since 2024, Vinted and Depop both report UK seller earnings to HMRC. Use our free
            tax estimator to check whether you&apos;re over the £1,000 trading allowance — 60
            seconds, no signup.
          </p>
          <Link
            href="/tax-estimator"
            className="inline-block bg-[#3d5c3a] text-[#f5f0e8] rounded text-xs font-medium px-6 py-3 hover:bg-[#2c4428]"
          >
            Try the free tax estimator →
          </Link>
        </div>

        {/* DISCLAIMER */}
        <div className="mt-8 rounded-lg border border-[#b89650]/30 bg-[#f6ead3]/50 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#7a5a2a] mb-2">not financial advice</div>
          <p className="text-xs text-[#5a4520] leading-relaxed">
            This article is a plain-English comparison of publicly available information about
            Vinted and Depop for UK sellers as of early 2026. It is not financial, tax or legal
            advice. Platform terms, fees and features change frequently — always check the
            current terms on each platform before making decisions, and consult a qualified
            accountant for anything tax-related.
          </p>
        </div>
      </article>

      <MarketingFooter />
    </div>
  )
}
