'use client'

import { useState, useEffect } from 'react'
import { MarketingNav } from '@/components/layout/MarketingNav'
import { MarketingFooter } from '@/components/layout/MarketingFooter'
import { Reveal } from '@/components/motion'
import { trackEvent } from '@/lib/plausible'

// UK marketplace fee structures (as of April 2026)
// Sources: platform seller help pages
interface FeeBreakdown {
  platform: string
  sellerFee: number       // % of sale
  paymentFee: number      // % of sale for payment processing
  fixedFee: number        // fixed per-transaction fee in £
  listingFee: number      // per-listing fee
  totalFees: number       // calculated
  netProfit: number       // calculated
  color: string
  notes: string
}

function calculateFees(salePrice: number, costPrice: number, postage: number): FeeBreakdown[] {
  const total = salePrice + postage

  const platforms: FeeBreakdown[] = [
    {
      platform: 'Vinted',
      sellerFee: 0,                // Vinted charges buyer, not seller (as of 2024+)
      paymentFee: 0,
      fixedFee: 0,
      listingFee: 0,
      totalFees: 0,
      netProfit: 0,
      color: '#09B1BA',
      notes: 'No seller fees — buyer pays service fee',
    },
    {
      platform: 'eBay UK',
      sellerFee: 0.132,            // 13.2% final value fee (most categories)
      paymentFee: 0,               // included in FVF since managed payments
      fixedFee: 0.30,              // £0.30 per order
      listingFee: 0,               // 1000 free listings/mo
      totalFees: 0,
      netProfit: 0,
      color: '#E53238',
      notes: '13.2% final value fee + £0.30/order. 1,000 free listings/mo',
    },
    {
      platform: 'Etsy',
      sellerFee: 0.065,            // 6.5% transaction fee
      paymentFee: 0.04,            // 4% + £0.20 payment processing (UK)
      fixedFee: 0.20,              // £0.20 payment processing fixed
      listingFee: 0.16,            // $0.20 ≈ £0.16 listing fee per item
      totalFees: 0,
      netProfit: 0,
      color: '#F1641E',
      notes: '6.5% transaction + 4% payment + £0.20 + £0.16 listing',
    },
    {
      platform: 'Depop',
      sellerFee: 0,                // No seller fee since 2024 (buyer pays)
      paymentFee: 0,
      fixedFee: 0,
      listingFee: 0,
      totalFees: 0,
      netProfit: 0,
      color: '#FF2300',
      notes: 'No seller fees — buyer pays service fee',
    },
    {
      platform: 'Shopify',
      sellerFee: 0,                // No marketplace fee (your own store)
      paymentFee: 0.029,           // 2.9% + £0.25 Shopify Payments (Basic)
      fixedFee: 0.25,
      listingFee: 0,
      totalFees: 0,
      netProfit: 0,
      color: '#96BF48',
      notes: '2.9% + £0.25 payment processing (Basic plan, excl. subscription)',
    },
  ]

  return platforms.map((p) => {
    const fees =
      (total * p.sellerFee) +
      (total * p.paymentFee) +
      p.fixedFee +
      p.listingFee
    const net = salePrice - costPrice - fees
    return {
      ...p,
      totalFees: Math.round(fees * 100) / 100,
      netProfit: Math.round(net * 100) / 100,
    }
  })
}

function formatGBP(n: number): string {
  return `£${n.toFixed(2)}`
}

export default function CalculatorPage() {
  const [salePrice, setSalePrice] = useState<string>('45')
  const [costPrice, setCostPrice] = useState<string>('8')
  const [postage, setPostage] = useState<string>('0')

  const sale = parseFloat(salePrice) || 0
  const cost = parseFloat(costPrice) || 0
  const post = parseFloat(postage) || 0
  const results = calculateFees(sale, cost, post)

  const bestPlatform = results.reduce((best, r) => r.netProfit > (best?.netProfit ?? -Infinity) ? r : best, results[0] as FeeBreakdown | undefined)

  // Track fee calculator usage when calculation runs
  useEffect(() => {
    if (sale > 0) {
      trackEvent('FeeCalculatorUsed')
    }
  }, [sale])

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <MarketingNav />

      <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-12 py-12">
        {/* HEADER */}
        <div className="text-center mb-10">
          <div className="hero-fade-1 text-xs font-medium uppercase tracking-wider text-[#527050] mb-2.5">free tool</div>
          <h1 className="hero-fade-2 font-serif text-2xl sm:text-3xl font-normal text-[#1e2e1c] mb-2">
            UK Marketplace <em className="italic">Fee Calculator</em>
          </h1>
          <p className="hero-fade-3 text-sm font-normal text-[#4a6147] max-w-lg mx-auto">
            Enter your sale price and cost — see exactly what you&apos;d keep on Vinted, eBay, Etsy, Depop & Shopify.
          </p>
        </div>

        {/* INPUT SECTION */}
        <Reveal className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[#527050] mb-2">
              Sale price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#527050] text-sm">£</span>
              <input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                min="0"
                step="0.01"
                className="w-full pl-7 pr-4 py-3 border border-[rgba(61,92,58,0.14)] rounded-lg bg-white text-[#1e2e1c] font-serif text-xl focus:outline-none focus:border-[#5a7a57]"
                placeholder="45.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[#527050] mb-2">
              Cost price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#527050] text-sm">£</span>
              <input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                min="0"
                step="0.01"
                className="w-full pl-7 pr-4 py-3 border border-[rgba(61,92,58,0.14)] rounded-lg bg-white text-[#1e2e1c] font-serif text-xl focus:outline-none focus:border-[#5a7a57]"
                placeholder="8.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[#527050] mb-2">
              Postage (seller pays)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#527050] text-sm">£</span>
              <input
                type="number"
                value={postage}
                onChange={(e) => setPostage(e.target.value)}
                min="0"
                step="0.01"
                className="w-full pl-7 pr-4 py-3 border border-[rgba(61,92,58,0.14)] rounded-lg bg-white text-[#1e2e1c] font-serif text-xl focus:outline-none focus:border-[#5a7a57]"
                placeholder="0.00"
              />
            </div>
          </div>
        </Reveal>

        {/* RESULTS */}
        {sale > 0 && (
          <>
            {/* CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {results.map((r) => {
                const isBest = r.platform === bestPlatform?.platform && r.netProfit > 0
                const margin = sale > 0 ? (r.netProfit / sale) * 100 : 0
                return (
                  <div
                    key={r.platform}
                    className={`rounded-lg border p-5 ${
                      isBest
                        ? 'border-[#5a7a57] bg-[#d4e2d2]/30'
                        : 'border-[rgba(61,92,58,0.14)] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: r.color }}
                        />
                        <span className="text-sm font-medium text-[#1e2e1c]">{r.platform}</span>
                      </div>
                      {isBest && (
                        <span className="text-xs font-medium text-[#5a7a57] bg-[#d4e2d2] px-2 py-0.5 rounded">
                          best net
                        </span>
                      )}
                    </div>

                    <div className="mb-3">
                      <div className={`font-serif text-2xl font-medium ${r.netProfit >= 0 ? 'text-[#1e2e1c]' : 'text-red-600'}`}>
                        {formatGBP(r.netProfit)}
                      </div>
                      <div className="text-xs text-[#527050] mt-0.5">
                        net profit · {margin.toFixed(0)}% margin
                      </div>
                    </div>

                    <div className="border-t border-[rgba(61,92,58,0.08)] pt-3 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#527050]">Platform fees</span>
                        <span className="text-[#4a6147] font-medium">{formatGBP(r.totalFees)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#527050]">You keep</span>
                        <span className="text-[#4a6147] font-medium">{formatGBP(sale - r.totalFees)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* COMPARISON BAR */}
            <div className="rounded-lg border border-[rgba(61,92,58,0.14)] bg-white p-5 mb-6">
              <div className="text-xs font-medium uppercase tracking-wider text-[#527050] mb-4">fees compared</div>
              <div className="space-y-3">
                {results.map((r) => {
                  const maxFee = Math.max(...results.map((x) => x.totalFees), 1)
                  const barWidth = (r.totalFees / maxFee) * 100
                  return (
                    <div key={r.platform} className="flex items-center gap-3">
                      <div className="w-16 text-xs font-medium text-[#1e2e1c] flex-shrink-0">{r.platform}</div>
                      <div className="flex-1 h-6 bg-[#f5f0e8] rounded overflow-hidden">
                        <div
                          className="h-full rounded transition-all duration-300"
                          style={{ width: `${Math.max(barWidth, 1)}%`, backgroundColor: r.color + '40' }}
                        />
                      </div>
                      <div className="w-14 text-xs text-[#4a6147] text-right font-medium flex-shrink-0">
                        {formatGBP(r.totalFees)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* FEE NOTES */}
            <div className="rounded-lg border border-[rgba(61,92,58,0.14)] bg-white p-5 mb-10">
              <div className="text-xs font-medium uppercase tracking-wider text-[#527050] mb-3">how fees are calculated</div>
              <div className="space-y-2">
                {results.map((r) => (
                  <div key={r.platform} className="flex gap-2 items-start text-xs">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: r.color }}
                    />
                    <div>
                      <span className="font-medium text-[#1e2e1c]">{r.platform}</span>
                      <span className="text-[#527050]"> — {r.notes}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#527050] mt-4 italic">
                Fees are approximate and based on standard UK seller accounts as of April 2026. Actual fees may vary by category, seller level, and promotions. Shopify fee excludes monthly subscription (from £25/mo).
              </p>
            </div>
          </>
        )}

        {/* CTA */}
        <div className="text-center rounded-lg bg-[#d4e2d2] p-8 sm:p-10">
          <h2 className="font-serif text-xl sm:text-2xl font-normal text-[#1e2e1c] mb-3">
            Track your <em className="italic">real</em> margins automatically
          </h2>
          <p className="text-sm text-[#4a6147] mb-6 max-w-md mx-auto">
            Wrenlist calculates your actual profit on every find — across every platform — so you always know your margin before you list.
          </p>
          <a
            href="/?waitlist=1"
            onClick={() => trackEvent('CTAClicked', { source: 'fee-calculator' })}
            className="inline-block bg-[#3d5c3a] text-[#f5f0e8] rounded text-xs font-medium px-8 py-3 hover:bg-[#2c4428]"
          >
            Join the waitlist
          </a>
        </div>
      </div>

      <MarketingFooter />
    </div>
  )
}
