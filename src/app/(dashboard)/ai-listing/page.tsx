'use client'

import { Panel } from '@/components/wren/Panel'
import { InsightCard } from '@/components/wren/InsightCard'

export default function AIListingPage() {
  return (
    <div className="space-y-6">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="text-lg font-serif text-ink">Wren AI — listing generator</h1>
        <div className="flex gap-3">
          <button className="px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition">
            regenerate
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition">
            use this listing →
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-[1fr_320px] gap-6">
        {/* LEFT: Generated listing */}
        <div className="space-y-4">
          <Panel>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-medium text-sm text-ink">generated listing</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-sage animate-pulse"></div>
                <span className="text-xs text-sage font-medium">wren AI</span>
              </div>
            </div>

            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                  title
                </label>
                <input
                  type="text"
                  value="Carhartt WIP Detroit Jacket — Brown — Size M — Excellent Condition — Vintage Workwear"
                  className="w-full px-4 py-2 bg-cream-md border border-border rounded text-sm font-medium text-ink"
                  readOnly
                />
                <div className="text-xs text-ink-lt mt-2">79 characters · optimised for eBay UK search</div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                  description
                </label>
                <textarea
                  value={`A classic Carhartt WIP Detroit Jacket in the iconic brown colourway. This blanket-lined workwear staple is in excellent condition — no stains, no tears, with minimal wear to the cuffs and a fully functioning brass zip.

Cut in a relaxed silhouette with chest pockets and interior storm flap. The quilted blanket lining gives it that distinctive Carhartt warmth without bulk. Size M — measures approx 23" chest, 26" length. Please check measurements before buying.

Sourced from a private estate in East London. Smoke-free, pet-free home. Dispatched within 2 working days in appropriate packaging.`}
                  rows={8}
                  className="w-full px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink"
                  readOnly
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                  tags
                </label>
                <div className="flex gap-2 flex-wrap">
                  {['carhartt', 'detroit jacket', 'workwear', 'vintage', 'brown', 'blanket lined', 'size M', 'mens jacket', '90s workwear'].map(
                    (tag, idx) => (
                      <span
                        key={tag}
                        className={`px-3 py-1 text-xs font-medium rounded ${
                          idx < 8
                            ? 'bg-sage-pale text-sage-dk'
                            : 'bg-cream-md text-ink-lt'
                        }`}
                      >
                        {tag}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </Panel>

          {/* Platform variations */}
          <Panel>
            <h3 className="font-medium text-sm text-ink mb-4">platform variations</h3>
            <div className="space-y-3">
              <div className="p-3 bg-cream-md rounded">
                <div className="text-xs font-medium text-sage-dim mb-1 uppercase tracking-wide">
                  Vinted version
                </div>
                <div className="text-sm text-ink-lt font-light">
                  Shortened title, casual tone, hashtags added, shipping info adjusted for Vinted defaults.
                </div>
              </div>
              <div className="p-3 bg-cream-md rounded">
                <div className="text-xs font-medium text-sage-dim mb-1 uppercase tracking-wide">
                  Etsy version
                </div>
                <div className="text-sm text-ink-lt font-light">
                  Lead with "vintage" and "1990s", expanded provenance story, gift-ready framing.
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* RIGHT: Source & notes */}
        <div className="space-y-4">
          {/* Source material */}
          <Panel>
            <h3 className="font-medium text-sm text-ink mb-4">source material</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="w-14 h-14 rounded bg-cream-md flex items-center justify-center text-2xl flex-shrink-0">
                  🧥
                </div>
                <div className="w-14 h-14 rounded bg-cream-dk flex items-center justify-center text-2xl flex-shrink-0">
                  🏷
                </div>
                <div className="w-14 h-14 rounded bg-cream-md flex items-center justify-center text-2xl flex-shrink-0">
                  🧥
                </div>
              </div>
              <div className="text-sm text-ink-lt">
                Carhartt Detroit Jacket · Brown · M · Excellent · cost £12 · house clearance
              </div>
            </div>
          </Panel>

          {/* AI Notes */}
          <div className="bg-sage-pale border border-sage-dim rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-sage"></div>
              <div className="text-xs font-semibold text-sage uppercase tracking-widest">
                wren AI notes
              </div>
            </div>
            <div className="space-y-2 text-xs text-ink-lt leading-relaxed">
              <div>✓ Keyword "Detroit Jacket" included — highest search volume for this style</div>
              <div>✓ Size in title — reduces buyer questions by ~40%</div>
              <div>✓ Provenance included — "East London estate" increases buyer trust</div>
              <div>✓ Measurements included — reduces return rate</div>
              <div>✓ Condition hedge — "minimal wear to cuffs" is honest and specific</div>
            </div>
          </div>

          {/* Pricing insight */}
          <InsightCard
            text="Excellent condition Carhartt Detroit jackets at size M are averaging £142 on eBay UK. Your £145 ask is well-positioned."
          />

          {/* Action buttons */}
          <button className="w-full px-4 py-3 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition">
            use this listing & crosslist →
          </button>
          <button className="w-full px-4 py-3 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition">
            regenerate with different tone
          </button>
        </div>
      </div>
    </div>
  )
}
