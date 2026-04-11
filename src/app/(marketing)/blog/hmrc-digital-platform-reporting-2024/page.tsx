import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingNav } from '@/components/layout/MarketingNav'
import { MarketingFooter } from '@/components/layout/MarketingFooter'

const SITE_URL = 'https://wrenlist.com'
const POST_URL = `${SITE_URL}/blog/hmrc-digital-platform-reporting-2024`
const OG_IMAGE = `${SITE_URL}/api/og/hmrc-digital-platform-reporting-2024`
const PUBLISHED = '2026-04-11'

export const metadata: Metadata = {
  title: 'HMRC Now Sees Your Vinted & eBay Sales — What UK Resellers Need to Know',
  description:
    'Since January 2024, Vinted, eBay, Etsy and Depop report seller earnings directly to HMRC. If you\u2019re over the £1,000 trading allowance, you need to know this. A plain-English guide.',
  keywords: [
    'hmrc vinted',
    'hmrc ebay reporting',
    'digital platform reporting',
    'vinted tax uk',
    'ebay tax uk',
    '1000 trading allowance',
    'uk reseller self assessment',
  ],
  alternates: { canonical: POST_URL },
  openGraph: {
    type: 'article',
    url: POST_URL,
    title: 'HMRC Now Sees Your Vinted & eBay Sales — What UK Resellers Need to Know',
    description:
      'Since January 2024, UK marketplaces report seller earnings directly to HMRC. Plain-English guide to the £1,000 trading allowance and what to do next.',
    publishedTime: PUBLISHED,
    authors: ['Wrenlist'],
    siteName: 'Wrenlist',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'HMRC now sees your Vinted & eBay sales',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HMRC Now Sees Your Vinted & eBay Sales',
    description:
      'Plain-English guide to the 2024 Digital Platform Reporting rules and the £1,000 trading allowance.',
    images: [OG_IMAGE],
  },
}

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'HMRC Now Sees Your Vinted & eBay Sales — What UK Resellers Need to Know',
  description:
    'Since January 2024, UK marketplaces report seller earnings directly to HMRC. Plain-English guide to the £1,000 trading allowance.',
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

export default function HmrcReportingPost() {
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
          <Link href="/blog" className="text-xs text-[#527050] hover:text-[#5a7a57]">← All posts</Link>
          <div className="flex items-center gap-3 text-10px font-medium uppercase text-[#527050] mt-6 mb-3">
            <span>Tax</span>
            <span>·</span>
            <time dateTime={PUBLISHED}>11 April 2026</time>
            <span>·</span>
            <span>6 min read</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#1e2e1c] leading-tight mb-4">
            HMRC now sees your Vinted & eBay sales. <em className="italic">Here&apos;s what that means.</em>
          </h1>
          <p className="text-base text-[#4a6147] leading-relaxed">
            If you sell on Vinted, eBay, Etsy, Depop, or Airbnb in the UK, the rules changed on 1 January 2024.
            The platforms now send your sales data directly to HMRC once a year. Here&apos;s a plain-English
            guide to what that actually means for you as a reseller — and what you should do about it.
          </p>
        </div>

        {/* BODY */}
        <div className="prose prose-sm max-w-none space-y-6 text-[#1e2e1c] leading-relaxed">
          <section>
            <h2 className="font-serif text-xl font-medium text-[#1e2e1c] mt-8 mb-3">What actually changed in 2024?</h2>
            <p className="text-sm text-[#4a6147]">
              The UK adopted the OECD&apos;s Digital Platform Reporting rules (a global standard
              introduced in 2023 and implemented across Europe). From 1 January 2024, any UK digital
              marketplace that facilitates sales of goods or services has a legal obligation to collect
              seller data and report it to HMRC by 31 January of the following year. That includes:
            </p>
            <ul className="text-sm text-[#4a6147] space-y-1 mt-3 ml-5 list-disc">
              <li>Vinted, eBay, Etsy, Depop, Amazon (goods)</li>
              <li>Airbnb, Booking.com (accommodation)</li>
              <li>Uber, Deliveroo, Bolt (services)</li>
              <li>Any UK platform where you list things for sale</li>
            </ul>
            <p className="text-sm text-[#4a6147] mt-3">
              The first reports covering calendar year 2024 were due by 31 January 2025. HMRC now
              has a copy of your annual gross sales, number of transactions, and identifying details
              for every UK seller above a minimum threshold (30 sales or €2,000 / year, roughly).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-[#1e2e1c] mt-8 mb-3">Does this mean I owe tax?</h2>
            <p className="text-sm text-[#4a6147]">
              Not necessarily. The rules changed how HMRC <em>gets</em> your data, not whether you owe tax. The
              underlying tax rules are the same as before:
            </p>
            <ul className="text-sm text-[#4a6147] space-y-2 mt-3 ml-5 list-disc">
              <li>
                <strong className="text-[#1e2e1c]">Selling your own used stuff</strong> — clothes, furniture,
                old toys — is generally <strong>not taxable</strong>, no matter how much you earn. You&apos;re
                just converting assets to cash.
              </li>
              <li>
                <strong className="text-[#1e2e1c]">Trading</strong> — buying things to resell, or making things
                to sell — <strong>is</strong> taxable once your gross income (total sales before fees) goes over
                the <strong>£1,000 trading allowance</strong> in a UK tax year (6 April to 5 April).
              </li>
            </ul>
            <p className="text-sm text-[#4a6147] mt-3">
              The line between &ldquo;selling my old stuff&rdquo; and &ldquo;trading&rdquo; is what HMRC
              calls the badges of trade: regularity, intention to make a profit, modification of items,
              advertising, and so on. If you&apos;re buying from charity shops or car boots with the intent
              to flip, that&apos;s trading — no debate.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-[#1e2e1c] mt-8 mb-3">The £1,000 trading allowance in plain English</h2>
            <p className="text-sm text-[#4a6147]">
              If your total reselling sales for the tax year stay under £1,000 (<em>gross</em> — before fees
              and postage are deducted), you don&apos;t need to register for Self Assessment or declare the
              income at all. Keep records anyway in case your situation changes.
            </p>
            <p className="text-sm text-[#4a6147] mt-3">
              Over £1,000? You need to register with HMRC by 5 October following the end of the tax year
              in which you crossed the threshold, and file a Self Assessment return by 31 January. You can
              then claim either:
            </p>
            <ul className="text-sm text-[#4a6147] space-y-1 mt-3 ml-5 list-disc">
              <li>The flat £1,000 trading allowance (no need to track expenses), OR</li>
              <li>Your actual allowable expenses (cost of goods, postage, fees, mileage, etc.)</li>
            </ul>
            <p className="text-sm text-[#4a6147] mt-3">
              Pick whichever is higher. Most resellers with real inventory costs are better off claiming
              actual expenses.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-[#1e2e1c] mt-8 mb-3">What expenses can I claim?</h2>
            <p className="text-sm text-[#4a6147]">
              If you&apos;re claiming actual expenses rather than the £1,000 allowance, keep records of:
            </p>
            <ul className="text-sm text-[#4a6147] space-y-1 mt-3 ml-5 list-disc">
              <li><strong className="text-[#1e2e1c]">Cost of goods</strong> — what you paid for the items you sold</li>
              <li><strong className="text-[#1e2e1c]">Postage and packaging</strong> — labels, tape, poly mailers</li>
              <li><strong className="text-[#1e2e1c]">Platform and payment fees</strong> — eBay FVF, Etsy fees, PayPal, Stripe</li>
              <li><strong className="text-[#1e2e1c]">Mileage</strong> — 45p/mile for sourcing trips, first 10,000 miles (25p after), under HMRC simplified expenses</li>
              <li><strong className="text-[#1e2e1c]">Storage and a portion of home bills</strong> if you store stock or work from home</li>
              <li><strong className="text-[#1e2e1c]">Subscriptions to reselling tools</strong> — Wrenlist, photo apps, label printers</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-[#1e2e1c] mt-8 mb-3">The practical checklist</h2>
            <ol className="text-sm text-[#4a6147] space-y-2 mt-3 ml-5 list-decimal">
              <li>
                <strong className="text-[#1e2e1c]">Work out if you&apos;re over the threshold.</strong>{' '}
                Use our <Link href="/tax-estimator" className="text-[#5a7a57] underline font-medium">free tax estimator</Link>{' '}
                to get a quick verdict.
              </li>
              <li>
                <strong className="text-[#1e2e1c]">If you&apos;re over, register for Self Assessment</strong>{' '}
                on{' '}
                <a href="https://www.gov.uk/register-for-self-assessment" target="_blank" rel="noopener noreferrer" className="text-[#5a7a57] underline">
                  gov.uk
                </a>{' '}
                before 5 October following the end of the tax year.
              </li>
              <li>
                <strong className="text-[#1e2e1c]">Start tracking every sale and expense from day one</strong>{' '}
                of the tax year (6 April). Don&apos;t wait until January — recreating 12 months of data is painful.
              </li>
              <li>
                <strong className="text-[#1e2e1c]">Log sourcing mileage</strong> — it&apos;s often the biggest
                expense resellers forget. 500 miles of car boot runs at 45p = £225 off your taxable profit.
              </li>
              <li>
                <strong className="text-[#1e2e1c]">File your return by 31 January.</strong> Online filing,
                not paper — paper deadline is earlier and easier to miss.
              </li>
              <li>
                <strong className="text-[#1e2e1c]">Consider an accountant if you&apos;re making over ~£10k.</strong>{' '}
                Accountants who specialise in sole traders charge £200–500 for a Self Assessment and usually
                save you more than that in missed deductions.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-[#1e2e1c] mt-8 mb-3">Don&apos;t panic, do prepare</h2>
            <p className="text-sm text-[#4a6147]">
              The Digital Platform Reporting rules haven&apos;t created new taxes — they&apos;ve just made it
              much harder to accidentally (or deliberately) underreport. HMRC already had the power to ask
              platforms for seller data; now they get it automatically. If you&apos;ve always been above-board,
              nothing changes. If you&apos;ve been casual about it, now&apos;s the time to clean up your records.
            </p>
            <p className="text-sm text-[#4a6147] mt-3">
              The good news: with modern tools, tracking is a 30-second task per sale, not an
              end-of-year panic.
            </p>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-lg bg-[#d4e2d2] p-8 text-center">
          <h3 className="font-serif text-xl font-medium text-[#1e2e1c] mb-2">
            Not sure where you stand?
          </h3>
          <p className="text-sm text-[#4a6147] mb-5 max-w-md mx-auto">
            Use our free UK reseller tax estimator to work out whether you&apos;re over the £1,000
            trading allowance and what you might owe. 60 seconds, no signup.
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
          <div className="text-xs font-semibold uppercase tracking-wider text-[#7a5a2a] mb-2">not tax advice</div>
          <p className="text-xs text-[#5a4520] leading-relaxed">
            This article is a plain-English summary of publicly available HMRC guidance for the 2025/26
            tax year. It is not tax or accounting advice. Your actual liability depends on your full
            financial situation, and rules can change. Always consult a qualified accountant or HMRC
            directly for decisions that affect your tax filing.
          </p>
        </div>
      </article>

      <MarketingFooter />
    </div>
  )
}
