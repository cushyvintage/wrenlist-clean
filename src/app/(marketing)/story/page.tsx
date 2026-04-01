'use client'

import Link from 'next/link'

export default function StoryPage() {
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
          <Link href="/landing" className="text-xs font-light text-ink-lt hover:text-ink">home</Link>
          <Link href="/pricing" className="text-xs font-light text-ink-lt hover:text-ink">pricing</Link>
          <Link href="/about" className="text-xs font-light text-ink-lt hover:text-ink">why wrenlist</Link>
        </div>
        <div className="flex gap-2 items-center">
          <a href="https://app.wrenlist.com/login" className="border border-[rgba(61,92,58,0.22)] rounded text-xs font-light text-ink-lt px-4 py-2 hover:bg-cream-md hover:text-ink">log in</a>
          <a href="https://app.wrenlist.com/register" className="bg-sage text-cream rounded text-xs font-medium px-4.5 py-2 hover:bg-sage-dk">start free</a>
        </div>
      </nav>

      {/* HERO */}
      <div className="bg-ink px-10 py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-center bg-no-repeat opacity-5" style={{backgroundSize: '320px auto', backgroundPosition: 'right -60px top -40px'}}></div>
        <div className="max-w-2xl mx-auto relative">
          <div className="text-10px font-semibold uppercase tracking-widest text-sage-lt mb-5">our story</div>
          <blockquote className="font-serif text-4xl font-light text-cream leading-tight mb-7">
            "I kept building spreadsheets to run my reselling business.
            <br />
            They kept breaking.
            <br />
            <em className="italic text-sage-lt">So I built something that wouldn't.</em>"
          </blockquote>
          <p className="text-sm text-sage-dim">Dom Cushnan — founder, Wrenlist</p>
        </div>
      </div>

      {/* STORY BODY */}
      <div className="max-w-2xl mx-auto px-10 py-16">

        {/* SECTION 1 */}
        <div className="grid grid-cols-3 gap-12 mb-16">
          <div className="col-span-2">
            <h2 className="font-serif text-2xl font-light text-ink mb-4">
              By day, I build systems.<br />
              <em className="italic">By weekend, I source.</em>
            </h2>
            <p className="text-sm font-light text-ink-md leading-relaxed mb-4">
              I work in technology — specifically the kind where you spend a lot of time thinking about how complex things fit together, where the gaps are, and why well-intentioned processes quietly break. It's work that requires a certain kind of patience with imperfect systems.
            </p>
            <p className="text-sm font-light text-ink-md leading-relaxed">
              On weekends, I switch off. Or try to. I source vintage on the Welsh border — a genuinely good patch for house clearances, small-town charity shops and local auctions that haven't been picked over. I've been doing it for years, first as a hobby, then properly under <strong className="text-ink font-medium">cushyvintage</strong>, now as a business that funds itself and gives me the kind of Saturday I need after a week of screens.
            </p>
          </div>
          <div className="bg-cream-md rounded-lg aspect-square flex items-center justify-center text-ink-lt">
            <div className="text-center">
              <div className="text-5xl mb-2">🧥</div>
              <p className="text-10px leading-relaxed">A Sunday haul from a Welsh border house clearance, March 2025</p>
            </div>
          </div>
        </div>

        {/* PULL QUOTE */}
        <div className="border-l-4 border-sage px-6 py-1 mb-16">
          <p className="font-serif text-xl font-light text-ink leading-relaxed italic">
            "I wasn't after listing speed. I wanted to know which car boot was worth the 6am start, and which category was actually making me money."
          </p>
        </div>

        {/* SECTION 2 */}
        <div className="mb-16">
          <h2 className="font-serif text-2xl font-light text-ink mb-4">
            The tools that existed<br />
            <em className="italic">weren't built for me.</em>
          </h2>
          <p className="text-sm font-light text-ink-md leading-relaxed mb-4">
            I tried spreadsheets. Brittle, slow to update at the rack, impossible to get useful numbers out of. I tried Vendoo and Crosslist — solid tools for listing speed, but useless for the questions I actually cared about. What's my real margin on this jacket? Which source gives me the best return? Which platforms are selling, and which are just sitting?
          </p>
          <p className="text-sm font-light text-ink-md leading-relaxed mb-4">
            Everything was either too basic, too US-focused, or built for someone who treats reselling as a side hobby rather than a real small business. Nothing started at the rack. Nothing thought in pounds. Nothing tracked the full journey from <em className="font-serif text-base">find to sale</em>.
          </p>
          <p className="text-sm font-light text-ink-md leading-relaxed">
            One evening I started building the thing I needed. Not as a product — as a tool that solved my specific problem. When I mentioned it in reselling communities, the response was immediate. Same frustrations. Same gap.
          </p>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-3 gap-0.5 bg-[rgba(61,92,58,0.14)] rounded-lg overflow-hidden mb-16">
          <div className="bg-cream-md p-7 text-center">
            <div className="font-mono text-3xl font-medium text-ink mb-1.5">£0</div>
            <p className="text-xs text-ink-lt leading-relaxed">outside funding.
            <br/>Built on what it earns.</p>
          </div>
          <div className="bg-cream-md p-7 text-center">
            <div className="font-mono text-3xl font-medium text-ink mb-1.5">1</div>
            <p className="text-xs text-ink-lt leading-relaxed">person who uses it
            <br/>every single weekend</p>
          </div>
          <div className="bg-cream-md p-7 text-center">
            <div className="font-mono text-3xl font-medium text-ink mb-1.5">UK</div>
            <p className="text-xs text-ink-lt leading-relaxed">first, always.
            <br/>Not an afterthought.</p>
          </div>
        </div>

        {/* SECTION 3 */}
        <div className="mb-16">
          <h2 className="font-serif text-2xl font-light text-ink mb-4">
            What Wrenlist <em className="italic">actually is.</em>
          </h2>
          <p className="text-sm font-light text-ink-md leading-relaxed mb-4">
            It's the tool I use to run cushyvintage. Every feature was built because I needed it. The add-find screen is fast because I use it at the rack, standing in a draughty house clearance at 9am. The margin tracking is prominent because it's the only number that actually matters. The source analytics exist because I wanted to know whether that two-hour drive to Builth Wells was worth it.
          </p>
          <p className="text-sm font-light text-ink-md leading-relaxed mb-4">
            Every pricing decision I've made has been as someone who knows what £14 a month means to a reseller still figuring out if this is a hobby or a business. It's not a lot. But it has to earn its keep.
          </p>
          <p className="text-sm font-light text-ink-md leading-relaxed">
            Wrenlist is bootstrapped, independent, and built to stay that way. No VC money means no pressure to bloat it with features nobody asked for, no pressure to optimise for metrics that aren't yours.
          </p>
        </div>

        {/* WHAT'S NEXT */}
        <div className="bg-sage rounded-lg p-10 mb-10">
          <div className="text-10px font-semibold uppercase tracking-wider text-opacity-45 text-white mb-3">what's next</div>
          <h2 className="font-serif text-2xl font-light text-white mb-5">Still building. Still sourcing.</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-opacity-10 bg-white rounded p-4.5">
              <div className="text-sm font-medium text-white mb-1">Etsy integration</div>
              <p className="text-xs text-opacity-60 text-white">API approval pending — when it's live, it'll be done properly. No third-party relay.</p>
            </div>
            <div className="bg-opacity-10 bg-white rounded p-4.5">
              <div className="text-sm font-medium text-white mb-1">Mobile app</div>
              <p className="text-xs text-opacity-60 text-white">A real one, built for the rack. Not a responsive web page dressed up as an app.</p>
            </div>
            <div className="bg-opacity-10 bg-white rounded p-4.5">
              <div className="text-sm font-medium text-white mb-1">Smarter pricing</div>
              <p className="text-xs text-opacity-60 text-white">Wren AI that shows you what comparable items actually sold for, not just what they're listed at.</p>
            </div>
            <div className="bg-opacity-10 bg-white rounded p-4.5">
              <div className="text-sm font-medium text-white mb-1">Built with users</div>
              <p className="text-xs text-opacity-60 text-white">The roadmap is public. Vote, suggest, watch things actually get built. <Link href="/roadmap" className="text-sage-lt underline">See the roadmap →</Link></p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-sm font-light text-ink-lt mb-5">
            If any of this sounds familiar — the spreadsheet, the guesswork, the Sunday hauls — you're who this was built for.
          </p>
          <div className="flex gap-3 justify-center">
            <button className="bg-sage text-cream rounded text-xs font-medium px-6 py-2.5 hover:bg-sage-dk">start free — no card needed</button>
            <button className="border border-[rgba(61,92,58,0.22)] rounded text-xs font-light text-ink-lt px-6 py-2.5 hover:bg-cream-md hover:text-ink">try the fee calculator</button>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-ink text-cream px-12 py-16 mt-16">
        <div className="grid grid-cols-4 gap-12 max-w-5xl mx-auto mb-12">
          <div>
            <div className="font-serif text-xl font-medium mb-3">
              WREN<em className="italic font-light text-sage-lt">list</em>
            </div>
            <p className="text-sm font-light text-cream mb-4">The operating system for UK thrifters and resellers.</p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase mb-4">Platform</div>
            <div className="flex flex-col gap-3 text-sm font-light">
              <a href="#">Pricing</a>
              <a href="#">Why Wrenlist</a>
              <a href="#">Marketplaces</a>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase mb-4">Resources</div>
            <div className="flex flex-col gap-3 text-sm font-light">
              <a href="#">Blog</a>
              <Link href="/roadmap">Roadmap</Link>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase mb-4">Company</div>
            <div className="flex flex-col gap-3 text-sm font-light">
              <a href="#">Our story</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
