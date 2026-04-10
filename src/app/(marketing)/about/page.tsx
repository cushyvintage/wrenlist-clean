import { MarketingNav } from '@/components/layout/MarketingNav'
import { MarketingFooter } from '@/components/layout/MarketingFooter'
import { Reveal } from '@/components/motion'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <MarketingNav />

      {/* HEADER */}
      <div className="bg-white border-b border-[rgba(61,92,58,0.14)] px-5 sm:px-8 lg:px-12 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="hero-fade-1 text-xs font-medium uppercase tracking-wider text-[#8a9e88] mb-2.5">why wrenlist</div>
          <h1 className="hero-fade-2 font-serif text-3xl font-normal text-[#1e2e1c] mb-1">
            Not just another<br />
            <em className="italic">crosslisting tool.</em>
          </h1>
        </div>
      </div>

      {/* CONTENT */}
      <Reveal className="grid grid-cols-1 md:grid-cols-2 border-b border-[rgba(61,92,58,0.14)]">
        {/* LEFT: THE PROBLEM */}
        <div className="border-b md:border-b-0 md:border-r border-[rgba(61,92,58,0.14)] px-5 sm:px-8 lg:px-12 py-10">
          <h2 className="font-serif text-2xl font-normal text-[#1e2e1c] mb-3.5">The problem with other tools</h2>
          <p className="text-sm font-normal leading-relaxed text-[#6b7d6a] mb-4">
            Vendoo and Crosslist are built for listing speed. They&apos;re great at taking something you&apos;ve already decided to sell and pushing it to multiple platforms. That&apos;s useful.
          </p>
          <p className="text-sm font-normal leading-relaxed text-[#6b7d6a] mb-4">
            But most UK thrifters don&apos;t have a listing problem. They have a <em className="font-serif text-base text-[#1e2e1c]">business clarity</em> problem. What did I pay for this? Where did I source it? Which categories actually make money? Which platforms convert fastest? Which hauls were worth doing again?
          </p>
          <p className="text-sm font-normal leading-relaxed text-[#6b7d6a]">
            Those questions live in a Notes app, a spreadsheet, or nowhere at all. Wrenlist is the answer to all of them — built specifically for the way UK thrifters actually work.
          </p>
        </div>

        {/* RIGHT: WHAT MAKES US DIFFERENT */}
        <div className="px-5 sm:px-8 lg:px-12 py-10">
          <h2 className="font-serif text-2xl font-normal text-[#1e2e1c] mb-4">What makes us different</h2>
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
                <div className="w-8 h-8 rounded-full bg-[#d4e2d2] flex items-center justify-center flex-shrink-0 text-sm font-semibold text-[#5a7a57] mt-0.5">
                  {item.num}
                </div>
                <div>
                  <div className="text-sm font-medium text-[#1e2e1c] mb-1">{item.title}</div>
                  <div className="text-sm font-normal text-[#6b7d6a] leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* TESTIMONIAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-0 border-b border-[rgba(61,92,58,0.14)] bg-[#d4e2d2] px-5 sm:px-8 lg:px-12 py-10 lg:py-12">
        <div>
          <p className="font-serif text-lg sm:text-xl font-normal leading-relaxed text-[#1e2e1c]">
            &ldquo;Wrenlist showed me exactly which sourcing locations were worth my time. That changed everything about how I plan my weekends.&rdquo;
          </p>
          <p className="mt-4 text-xs text-[#8a9e88]">— Early access user · UK reseller</p>
        </div>
        <div className="text-center flex flex-col items-center justify-center">
          <div className="font-serif text-4xl sm:text-5xl font-medium text-[#3d5c3a]">5</div>
          <div className="text-xs font-medium uppercase tracking-wider text-[#8a9e88] mt-2">marketplaces supported</div>
        </div>
      </div>

      <MarketingFooter />
    </div>
  )
}
