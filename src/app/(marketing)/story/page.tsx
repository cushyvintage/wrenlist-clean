import Link from 'next/link'
import { MarketingNav } from '@/components/layout/MarketingNav'
import { MarketingFooter } from '@/components/layout/MarketingFooter'
import { Reveal } from '@/components/motion'

export default function StoryPage() {
  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <MarketingNav />

      {/* HERO */}
      <div className="bg-[#1e2e1c] px-5 sm:px-10 py-16 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <div className="hero-fade-1 text-xs font-medium uppercase tracking-widest text-[#8a9e88] mb-5">our story</div>
          <blockquote className="hero-fade-2 font-serif text-2xl sm:text-4xl font-normal text-[#f5f0e8] leading-tight mb-7">
            &ldquo;I kept building spreadsheets to run my reselling business.
            <br />
            They kept breaking.
            <br />
            <em className="italic text-[#8a9e88]">So I built something that wouldn&apos;t.</em>&rdquo;
          </blockquote>
          <p className="hero-fade-3 text-sm text-[#8a9e88]">Dom Cushnan — founder, Wrenlist</p>
        </div>
      </div>

      {/* STORY BODY */}
      <Reveal className="max-w-2xl mx-auto px-5 sm:px-10 py-16">

        {/* SECTION 1 */}
        <div className="mb-16">
          <h2 className="font-serif text-2xl font-normal text-[#1e2e1c] mb-4">
            By day, I build systems.<br />
            <em className="italic">By weekend, I source.</em>
          </h2>
          <p className="text-sm font-normal text-[#6b7d6a] leading-relaxed mb-4">
            I work in technology — specifically the kind where you spend a lot of time thinking about how complex things fit together, where the gaps are, and why well-intentioned processes quietly break. It&apos;s work that requires a certain kind of patience with imperfect systems.
          </p>
          <p className="text-sm font-normal text-[#6b7d6a] leading-relaxed">
            On weekends, I switch off. Or try to. I source vintage on the Welsh border — a genuinely good patch for house clearances, small-town charity shops and local auctions that haven&apos;t been picked over. I&apos;ve been doing it for years, first as a hobby, then properly as a business that funds itself and gives me the kind of Saturday I need after a week of screens.
          </p>
        </div>

        {/* PULL QUOTE */}
        <div className="border-l-4 border-[#5a7a57] px-6 py-1 mb-16">
          <p className="font-serif text-xl font-normal text-[#1e2e1c] leading-relaxed italic">
            &ldquo;I wasn&apos;t after listing speed. I wanted to know which car boot was worth the 6am start, and which category was actually making me money.&rdquo;
          </p>
        </div>

        {/* SECTION 2 */}
        <div className="mb-16">
          <h2 className="font-serif text-2xl font-normal text-[#1e2e1c] mb-4">
            The tools that existed<br />
            <em className="italic">weren&apos;t built for me.</em>
          </h2>
          <p className="text-sm font-normal text-[#6b7d6a] leading-relaxed mb-4">
            I tried spreadsheets. Brittle, slow to update at the rack, impossible to get useful numbers out of. I tried Vendoo and Crosslist — solid tools for listing speed, but useless for the questions I actually cared about. What&apos;s my real margin on this jacket? Which source gives me the best return? Which platforms are selling, and which are just sitting?
          </p>
          <p className="text-sm font-normal text-[#6b7d6a] leading-relaxed mb-4">
            Everything was either too basic, too US-focused, or built for someone who treats reselling as a side hobby rather than a real small business. Nothing started at the rack. Nothing thought in pounds. Nothing tracked the full journey from <em className="font-serif text-base">find to sale</em>.
          </p>
          <p className="text-sm font-normal text-[#6b7d6a] leading-relaxed">
            One evening I started building the thing I needed. Not as a product — as a tool that solved my specific problem. When I mentioned it in reselling communities, the response was immediate. Same frustrations. Same gap.
          </p>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-3 gap-0.5 bg-[rgba(61,92,58,0.14)] rounded-lg overflow-hidden mb-16">
          <div className="bg-[#ede8de] p-5 sm:p-7 text-center">
            <div className="font-mono text-2xl sm:text-3xl font-medium text-[#1e2e1c] mb-1.5">&pound;0</div>
            <p className="text-xs text-[#6b7d6a] leading-relaxed">outside funding.<br/>Built on what it earns.</p>
          </div>
          <div className="bg-[#ede8de] p-5 sm:p-7 text-center">
            <div className="font-mono text-2xl sm:text-3xl font-medium text-[#1e2e1c] mb-1.5">1</div>
            <p className="text-xs text-[#6b7d6a] leading-relaxed">person who uses it<br/>every single weekend</p>
          </div>
          <div className="bg-[#ede8de] p-5 sm:p-7 text-center">
            <div className="font-mono text-2xl sm:text-3xl font-medium text-[#1e2e1c] mb-1.5">UK</div>
            <p className="text-xs text-[#6b7d6a] leading-relaxed">first, always.<br/>Not an afterthought.</p>
          </div>
        </div>

        {/* SECTION 3 */}
        <div className="mb-16">
          <h2 className="font-serif text-2xl font-normal text-[#1e2e1c] mb-4">
            What Wrenlist <em className="italic">actually is.</em>
          </h2>
          <p className="text-sm font-normal text-[#6b7d6a] leading-relaxed mb-4">
            It&apos;s the tool I use to run my reselling business. Every feature was built because I needed it. The add-find screen is fast because I use it at the rack, standing in a draughty house clearance at 9am. The margin tracking is prominent because it&apos;s the only number that actually matters. The source analytics exist because I wanted to know whether that two-hour drive to Builth Wells was worth it.
          </p>
          <p className="text-sm font-normal text-[#6b7d6a] leading-relaxed mb-4">
            Every pricing decision I&apos;ve made has been as someone who knows what &pound;14 a month means to a reseller still figuring out if this is a hobby or a business. It&apos;s not a lot. But it has to earn its keep.
          </p>
          <p className="text-sm font-normal text-[#6b7d6a] leading-relaxed">
            Wrenlist is bootstrapped, independent, and built to stay that way. No VC money means no pressure to bloat it with features nobody asked for, no pressure to optimise for metrics that aren&apos;t yours.
          </p>
        </div>

        {/* WHAT'S NEXT */}
        <div className="bg-[#3d5c3a] rounded-lg p-6 sm:p-10 mb-10">
          <div className="text-xs font-medium uppercase tracking-wider text-white/45 mb-3">what&apos;s next</div>
          <h2 className="font-serif text-2xl font-normal text-white mb-5">Still building. Still sourcing.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/10 rounded p-4">
              <div className="text-sm font-medium text-white mb-1">Depop integration</div>
              <p className="text-xs text-white/60">Next major marketplace — bringing your inventory to Gen Z buyers.</p>
            </div>
            <div className="bg-white/10 rounded p-4">
              <div className="text-sm font-medium text-white mb-1">Mobile app</div>
              <p className="text-xs text-white/60">A real one, built for the rack. Not a responsive web page dressed up as an app.</p>
            </div>
            <div className="bg-white/10 rounded p-4">
              <div className="text-sm font-medium text-white mb-1">Smarter pricing</div>
              <p className="text-xs text-white/60">Wren AI that shows you what comparable items actually sold for, not just what they&apos;re listed at.</p>
            </div>
            <div className="bg-white/10 rounded p-4">
              <div className="text-sm font-medium text-white mb-1">Built with users</div>
              <p className="text-xs text-white/60">The roadmap is public. Vote, suggest, watch things actually get built. <Link href="/roadmap" className="text-[#8a9e88] underline">See the roadmap &rarr;</Link></p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-sm font-normal text-[#6b7d6a] mb-5">
            If any of this sounds familiar — the spreadsheet, the guesswork, the Sunday hauls — you&apos;re who this was built for.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href="/register" className="bg-[#3d5c3a] text-[#f5f0e8] rounded text-xs font-medium px-6 py-2.5 hover:bg-[#2c4428]">start free — no card needed</a>
            <Link href="/pricing" className="border border-[rgba(61,92,58,0.22)] rounded text-xs font-normal text-[#6b7d6a] px-6 py-2.5 hover:bg-[#ede8de] hover:text-[#1e2e1c]">see pricing</Link>
          </div>
        </div>
      </Reveal>

      <MarketingFooter />
    </div>
  )
}
