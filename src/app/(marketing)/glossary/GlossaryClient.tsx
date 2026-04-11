'use client'

import { useState, useMemo } from 'react'
import { Reveal } from '@/components/motion'

interface GlossaryTerm {
  term: string
  definition: string
}

type GlossaryData = Record<string, GlossaryTerm[]>

const GLOSSARY_TERMS: GlossaryData = {
  'Condition Grading': [
    {
      term: 'NWT',
      definition: 'New With Tags. Item has never been worn, washed, or used, and still has all original price tags and labels attached.',
    },
    {
      term: 'BNWT',
      definition: 'Brand New With Tags. Identical to NWT — emphasises that the item is truly new and unused from a retailer.',
    },
    {
      term: 'BNIB',
      definition: 'Brand New In Box. Item is completely new and still sealed in its original factory packaging/box.',
    },
    {
      term: 'VGC',
      definition: 'Very Good Condition. Item shows minimal wear, may have small imperfections not visible from normal distance. No stains, holes, or damage.',
    },
    {
      term: 'GC',
      definition: 'Good Condition. Item shows normal wear from use but is clean, functional, and has no significant damage. May have minor colour fading or light wear.',
    },
    {
      term: 'OOAK',
      definition: 'One Of A Kind. Unique item with no exact duplicates (vintage pieces, handmade, or one-off finds). Often used to emphasise rarity.',
    },
    {
      term: 'TLC',
      definition: 'Tender Loving Care. Item needs some cleaning, repair, or restoration to reach its best condition. Honest disclosure of wear.',
    },
    {
      term: 'A/F',
      definition: 'As Faulty. Item is non-functional or damaged. Must be clearly marked in listings to avoid buyer disputes.',
    },
    {
      term: 'Distressed',
      definition: 'Deliberately worn or aged appearance, often intentional design (e.g., distressed denim). Versus actual damage.',
    },
  ],

  'Selling Terms': [
    {
      term: 'BIN',
      definition: 'Buy It Now. Fixed price option on eBay (and some other platforms) instead of auction. Buyer can purchase immediately at your set price.',
    },
    {
      term: 'OBO',
      definition: 'Or Best Offer. Indicates the seller will accept offers below the listing price. Encourages negotiation.',
    },
    {
      term: 'Bundle',
      definition: 'Multiple items sold together as one lot at a combined price (usually with a discount). Reduces shipping costs and increases sale value.',
    },
    {
      term: 'Job Lot',
      definition: 'A large quantity of items (often 5–50+) sold together for one price, typically mixed or uncurated. Popular for reseller bulk buying.',
    },
    {
      term: 'Lot',
      definition: 'A group or collection of items sold as a single unit. Can be any size (e.g., "a lot of vintage brooches").',
    },
    {
      term: 'Deadstock',
      definition: 'New, never-sold items from a warehouse, boutique, or retail store. Usually in original packaging or condition.',
    },
    {
      term: 'Aged Stock',
      definition: 'Items that have been in storage for years but are still new (tags attached, unused). Common in warehouse liquidations.',
    },
    {
      term: 'ISO',
      definition: "In Search Of. Used in buying groups, Facebook communities, and forums to indicate what items you're looking for.",
    },
    {
      term: 'HTF',
      definition: 'Hard To Find. Item is rare or difficult to source. Signals scarcity and may justify a higher price.',
    },
  ],

  'Platform-Specific Terms': [
    {
      term: 'FVF',
      definition: "Final Value Fee. eBay's commission percentage charged on the final sale price (after auction ends or BIN sale completes).",
    },
    {
      term: 'FVP',
      definition: 'Final Value Points. eBay Plus members receive cash-back points on sales to help offset FVF costs.',
    },
    {
      term: 'VPP',
      definition: "Vinted Pick Program. Vinted's premium subscription ($2.99/month) for sellers to boost visibility and get priority support.",
    },
    {
      term: 'Promoted Listing',
      definition: "Paid advertising on eBay. Sellers pay a percentage of sale price to appear higher in search results.",
    },
    {
      term: 'Best Offer',
      definition: 'eBay feature allowing buyers to submit offers below your BIN price. You can accept, counter, or decline.',
    },
    {
      term: 'Watchers',
      definition: "eBay term for buyers who save your listing. More watchers = higher visibility signal to eBay's algorithm.",
    },
    {
      term: 'Relisting',
      definition: "Posting the same item again after it didn't sell in the first listing. May be free or cost listing fees depending on platform.",
    },
  ],

  'Business & Metrics': [
    {
      term: 'COGS',
      definition: 'Cost of Goods Sold. The total amount you spent to acquire items for resale (purchase price at source).',
    },
    {
      term: 'GMV',
      definition: 'Gross Merchandise Value. Total sales revenue before any fees, taxes, or expenses are deducted.',
    },
    {
      term: 'Net Margin',
      definition: '(Sales – COGS – Fees – Shipping – Expenses) / Sales × 100%. The true profit percentage after all costs.',
    },
    {
      term: 'Gross Margin',
      definition: 'Profit from sales minus COGS only, before other expenses. Useful for quick mental math: (Sales – COGS) / Sales × 100%.',
    },
    {
      term: 'ROI',
      definition: 'Return on Investment. How much profit per £ spent on stock: (Profit / COGS) × 100%. Higher is better.',
    },
    {
      term: 'Turnover',
      definition: 'How quickly items sell. Fast turnover = 1–7 days; slow = 30+ days. Affects cash flow and storage costs.',
    },
    {
      term: 'ARPU',
      definition: 'Average Revenue Per User (buyer). Total sales / number of unique buyers. Shows buyer value.',
    },
    {
      term: 'Churn',
      definition: 'Loss of customers over time. High churn = repeat buyers stopping. Opposite of retention.',
    },
    {
      term: 'Conversion Rate',
      definition: 'Percentage of people who view a listing and buy it: (Sales / Views) × 100%. Higher = better listing quality.',
    },
    {
      term: 'LTV',
      definition: 'Lifetime Value. Total profit expected from a single customer across all future purchases.',
    },
    {
      term: 'CAC',
      definition: 'Customer Acquisition Cost. How much you spend to get one new customer (advertising, shipping discounts, etc.).',
    },
  ],

  'Sourcing Terms': [
    {
      term: 'Charity Shop',
      definition: 'Non-profit retail store (Oxfam, British Heart Foundation, etc.) selling donated goods. Popular sourcing for thrifters.',
    },
    {
      term: 'Car Boot',
      definition: 'Outdoor car boot sales where private sellers sell items from their car trunks. UK-specific term for garage sales.',
    },
    {
      term: 'Estate Sale',
      definition: 'Liquidation of an entire household, often after death or relocation. Can contain high-value vintage and collectibles.',
    },
    {
      term: 'Auction House',
      definition: "Professional venue (e.g., Sotheby's, local auction rooms) selling items to highest bidder. May have reserve prices.",
    },
    {
      term: 'Wholesale',
      definition: 'Buying in bulk from distributors or liquidators at a fraction of retail price. Typically requires business registration.',
    },
    {
      term: 'Liquidation',
      definition: 'Bulk inventory sale when a store closes or overstock clears. Often at 20–70% of retail cost.',
    },
    {
      term: 'Bulk Buy',
      definition: 'Purchasing multiple items together (often 10–100+) at a discounted per-unit price from a reseller or estate.',
    },
  ],

  'Shipping Terms': [
    {
      term: 'Large Letter',
      definition: 'Royal Mail category: up to 45×35×1.6cm, max 750g. Cheapest tracked option (£2–4). No compensation for loss.',
    },
    {
      term: 'Small Parcel',
      definition: 'Royal Mail: up to 45×35×16cm, max 2kg. Fully tracked with signature. Standard for most resellers (£3–6).',
    },
    {
      term: 'Tracked',
      definition: 'Parcel has tracking number so buyer and seller can see delivery progress. Protects both parties from loss claims.',
    },
    {
      term: 'Signed For',
      definition: 'Recipient must sign for delivery. Provides proof of delivery and prevents "not received" disputes.',
    },
    {
      term: 'Click & Drop',
      definition: 'Royal Mail online service: print shipping labels at home without queuing. Can be integrated into eBay/other platforms.',
    },
    {
      term: 'QR Drop-Off',
      definition: 'New Royal Mail method: generate QR code label, drop off at participating Post Offices without a separate parcel sticker.',
    },
  ],
}

export default function GlossaryClient() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCategories = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase().trim()
    if (!lowerSearch) return GLOSSARY_TERMS

    const filtered: GlossaryData = {}

    Object.entries(GLOSSARY_TERMS).forEach(([category, terms]) => {
      const matchedTerms = terms.filter(
        (item) =>
          item.term.toLowerCase().includes(lowerSearch) ||
          item.definition.toLowerCase().includes(lowerSearch),
      )

      if (matchedTerms.length > 0) {
        filtered[category] = matchedTerms
      }
    })

    return filtered
  }, [searchTerm])

  const totalMatches = Object.values(filteredCategories).reduce((sum, terms) => sum + terms.length, 0)

  return (
    <section className="max-w-4xl mx-auto px-5 sm:px-10 py-12">
      {/* Search Bar */}
      <Reveal>
        <div className="mb-10">
          <input
            type="text"
            placeholder="Search terms... (e.g., 'BNWT', 'margin', 'charity shop')"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 rounded border border-[rgba(61,92,58,0.22)] bg-white text-[#1e2e1c] placeholder-[#9aab98] focus:outline-none focus:ring-2 focus:ring-[#3d5c3a] focus:border-transparent"
          />
          {searchTerm && (
            <p className="text-sm text-[#4a6147] mt-2">
              Found <span className="font-medium">{totalMatches}</span> term{totalMatches !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </Reveal>

      {/* Categories */}
      <div className="space-y-12">
        {Object.entries(filteredCategories).map(([category, terms]) => (
          <Reveal key={category}>
            <div>
              <h2 className="font-serif text-2xl font-medium text-[#1e2e1c] mb-6 pb-3 border-b border-[rgba(61,92,58,0.14)]">
                {category}
              </h2>

              <div className="space-y-6">
                {terms.map((item) => (
                  <div
                    key={`${category}-${item.term}`}
                    className="border-l-4 border-[#527050] pl-4"
                  >
                    <h3 className="font-medium text-[#1e2e1c] text-lg mb-2">
                      {item.term}
                    </h3>
                    <p className="text-[#4a6147] leading-relaxed text-sm">
                      {item.definition}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* No Results */}
      {searchTerm && totalMatches === 0 && (
        <Reveal>
          <div className="text-center py-12">
            <p className="text-[#4a6147] text-lg mb-4">
              No terms found matching "<span className="font-medium">{searchTerm}</span>"
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="text-[#3d5c3a] hover:text-[#2c4428] font-medium text-sm"
            >
              Clear search
            </button>
          </div>
        </Reveal>
      )}

      {/* CTA Section */}
      {!searchTerm && (
        <Reveal>
          <div className="mt-16 bg-[#ede8de] rounded-lg p-8 sm:p-10 border border-[rgba(61,92,58,0.22)]">
            <h3 className="font-serif text-xl font-medium text-[#1e2e1c] mb-3">
              Still getting to grips with reselling?
            </h3>
            <p className="text-[#4a6147] mb-6 leading-relaxed">
              Check out our marketplace comparison guide to understand where to sell, and use Wrenlist to manage everything across all platforms simultaneously.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/marketplace-comparison"
                className="inline-block border border-[#3d5c3a] text-[#3d5c3a] rounded font-medium px-6 py-2 hover:bg-[#f5f0e8] transition-colors text-center text-sm"
              >
                Marketplace Guide
              </a>
              <a
                href="/register"
                className="inline-block bg-[#3d5c3a] text-[#f5f0e8] rounded font-medium px-6 py-2 hover:bg-[#2c4428] transition-colors text-center text-sm"
              >
                Start Selling Free
              </a>
            </div>
          </div>
        </Reveal>
      )}
    </section>
  )
}
