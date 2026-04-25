import Link from 'next/link'
import { MarketingNav } from '@/components/layout/MarketingNav'
import { MarketingFooter } from '@/components/layout/MarketingFooter'
import { Reveal } from '@/components/motion'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chrome Extension — Wrenlist',
  description: 'Import finds from Vinted, eBay, Depop and more. Crosslist to 5 platforms with one click. The thrifter\'s operating system.',
}

/* Small inline SVG icons for this page only */
const ImportIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#3D5C3A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4v14M9 13l5 5 5-5" />
    <path d="M5 20v2a3 3 0 003 3h12a3 3 0 003-3v-2" />
  </svg>
)

const CrosslistIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#3D5C3A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="14" r="3" />
    <circle cx="22" cy="6" r="3" />
    <circle cx="22" cy="22" r="3" />
    <path d="M9 12.5l10-5M9 15.5l10 5" />
  </svg>
)

const AutoDelistIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#3D5C3A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="14" cy="14" r="10" />
    <path d="M10 14l3 3 5-6" />
  </svg>
)

const AIIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#3D5C3A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3l2 5h5l-4 3 1.5 5L14 13l-4.5 3L11 11 7 8h5l2-5z" />
  </svg>
)

const QueueIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#3D5C3A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8h16M6 14h16M6 20h10" />
    <circle cx="22" cy="20" r="3" fill="none" />
    <path d="M22 18.5v1.5l1 1" />
  </svg>
)

const CameraIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#3D5C3A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9a2 2 0 012-2h3l2-3h6l2 3h3a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V9z" />
    <circle cx="14" cy="15" r="4" />
  </svg>
)

/* Platform logos — simplified colored blocks for the grid */
const platforms = [
  { name: 'Vinted', color: '#09B1BA' },
  { name: 'eBay', color: '#E53238' },
  { name: 'Etsy', color: '#F56400' },
  { name: 'Depop', color: '#FF2300' },
  { name: 'Shopify', color: '#96BF48' },
  { name: 'Poshmark', color: '#7F0353' },
  { name: 'Mercari', color: '#4DC4FF' },
  { name: 'Facebook', color: '#1877F2' },
  { name: 'Grailed', color: '#000000' },
  { name: 'Whatnot', color: '#5B2EFF' },
]

const features = [
  {
    icon: ImportIcon,
    title: 'One-click import',
    desc: 'Browse any marketplace. See something you want to list? One click imports it to Wrenlist with photos, title, price — everything.',
  },
  {
    icon: CrosslistIcon,
    title: 'Crosslist everywhere',
    desc: 'Publish from Wrenlist to Vinted, eBay, Etsy, Depop & Shopify. The extension fills each platform\'s listing form for you.',
  },
  {
    icon: AutoDelistIcon,
    title: 'Auto-delist on sale',
    desc: 'Sold on one platform? The extension automatically takes down your listing everywhere else. No stale inventory.',
  },
  {
    icon: AIIcon,
    title: 'AI-written descriptions',
    desc: 'Wren AI drafts titles and descriptions from your photos. Edit or publish as-is — your voice, less typing.',
  },
  {
    icon: QueueIcon,
    title: 'Publish queue',
    desc: 'Queue items for publish while you work. The extension processes them in the background — publish 20 items while you source.',
  },
  {
    icon: CameraIcon,
    title: 'Background removal',
    desc: 'Unlimited clean product photos included on all paid plans. No separate app, no per-image fee.',
  },
]

export default function ExtensionPage() {
  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <MarketingNav />

      {/* HERO */}
      <section className="border-b border-[rgba(61,92,58,0.12)]">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left — copy */}
          <div className="flex flex-col justify-center px-5 sm:px-8 lg:px-12 py-10 lg:py-16">
            <p className="hero-fade-1 mb-4 text-xs font-medium uppercase tracking-wider text-[#8A9E88]">
              Chrome extension
            </p>
            <h1 className="hero-fade-2 mb-5 font-serif text-[36px] sm:text-[44px] lg:text-[52px] font-normal leading-[1.06] text-[#1E2E1C]">
              Your marketplace,<br />
              <em className="italic text-[#5A7A57]">connected.</em>
            </h1>
            <p className="hero-fade-3 mb-7 max-w-sm font-light leading-relaxed text-[#6B7D6A]">
              Import finds from any marketplace with one click. Crosslist to Vinted, eBay, Etsy, Depop & Shopify. Auto-delist when something sells. All from your browser.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <a
                href="https://chromewebstore.google.com/detail/wrenlist"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 bg-[#3D5C3A] text-[#F5F0E8] px-7 py-3 text-xs font-medium uppercase tracking-widest hover:bg-[#2C4428] rounded"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="#F5F0E8" strokeWidth="1.2" />
                  <circle cx="8" cy="8" r="2.5" fill="#F5F0E8" />
                  <path d="M8 1a7 7 0 014.9 2H8" stroke="#F5F0E8" strokeWidth="1" />
                </svg>
                Install for Chrome
              </a>
              <span className="text-xs font-light text-[#8A9E88] self-center">Free with any Wrenlist plan</span>
            </div>
          </div>

          {/* Right — popup preview mockup */}
          <div className="flex items-center justify-center bg-[#EDE8DE] px-5 sm:px-8 lg:px-10 py-10">
            <div className="w-[280px] rounded-lg overflow-hidden shadow-lg border border-[rgba(61,92,58,0.12)]">
              {/* Mock popup header */}
              <div className="bg-[#F5F0E8] px-4 py-3 flex items-center justify-between border-b border-[rgba(61,92,58,0.14)]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#3D5C3A] rounded" />
                  <span className="font-serif text-sm font-medium tracking-wider text-[#1E2E1C]">
                    WREN<em className="font-light italic text-[#8A9E88]">list</em>
                  </span>
                </div>
                <span className="font-mono text-[9px] text-[#8A9E88]">v1.3</span>
              </div>
              {/* Mock connection */}
              <div className="bg-[#F5F0E8] px-4 py-2 flex items-center gap-2 border-b border-[rgba(61,92,58,0.14)]">
                <div className="w-[6px] h-[6px] rounded-full bg-[#3D5C3A]" />
                <span className="text-[11px] text-[#6B7D6A]">dom@wrenlist.com</span>
              </div>
              {/* Mock banner */}
              <div className="bg-[#D4E2D2] px-3 py-2 mx-3 mt-3 rounded text-[10px] text-[#3D5C3A] font-normal">
                On Vinted — ready to import
              </div>
              {/* Mock action grid */}
              <div className="grid grid-cols-2 gap-2 p-3">
                {['Import find', 'Add find', 'Publish queue', 'Open Wrenlist'].map((label, i) => (
                  <div
                    key={i}
                    className={`rounded py-3 text-center text-[10px] font-medium border ${
                      i === 3
                        ? 'bg-[#3D5C3A] text-[#F5F0E8] border-[#3D5C3A]'
                        : 'bg-white text-[#1E2E1C] border-[rgba(61,92,58,0.14)]'
                    }`}
                  >
                    {label}
                  </div>
                ))}
              </div>
              {/* Mock queue */}
              <div className="px-3 pb-3">
                <div className="text-[9px] uppercase tracking-wider text-[#8A9E88] font-medium mb-1.5">Recent activity</div>
                <div className="rounded border border-[rgba(61,92,58,0.14)] bg-white overflow-hidden">
                  {[
                    { t: 'Carhartt Detroit jacket', time: '2m' },
                    { t: 'NB 990v3 grey', time: '15m' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-2.5 py-2 border-b border-[rgba(61,92,58,0.08)] last:border-b-0">
                      <div className="flex items-center gap-1.5">
                        <div className="w-[5px] h-[5px] rounded-full bg-[#3D5C3A]" />
                        <span className="text-[10px] text-[#1E2E1C]">{item.t}</span>
                      </div>
                      <span className="font-mono text-[9px] text-[#8A9E88]">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — 3 steps */}
      <section className="grid grid-cols-1 md:grid-cols-3 border-b border-[rgba(61,92,58,0.12)]">
        {[
          { num: '01', title: 'Import from anywhere', body: 'Browse Vinted, eBay, Depop, Etsy or any supported marketplace. Click the import button on any product page — photos, price, and details land in Wrenlist instantly.' },
          { num: '02', title: 'Enrich and price', body: 'Wren AI fills in category, condition, and suggests a price from live comp data. Edit anything, add your description, set your margins.' },
          { num: '03', title: 'Publish everywhere', body: 'Queue your finds for crosslisting. The extension publishes to each platform in the background. When something sells, every other listing comes down automatically.' },
        ].map((step, i) => (
          <div key={i} className={`px-5 sm:px-10 py-9 ${i < 2 ? 'border-b md:border-b-0 md:border-r border-[rgba(61,92,58,0.12)]' : ''}`}>
            <div className="font-serif text-4xl md:text-5xl text-[#E0D9CC] mb-2.5">{step.num}</div>
            <div className="text-sm font-medium text-[#1E2E1C] mb-2">{step.title}</div>
            <div className="text-sm font-light leading-relaxed text-[#6B7D6A]">{step.body}</div>
          </div>
        ))}
      </section>

      {/* SUPPORTED MARKETPLACES */}
      <section className="px-5 sm:px-8 lg:px-12 py-12 border-b border-[rgba(61,92,58,0.12)]">
        <Reveal className="mx-auto max-w-3xl">
          <div className="text-center mb-8">
            <div className="mb-2.5 text-xs font-medium uppercase tracking-wider text-[#8A9E88]">Works with</div>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#1E2E1C]">
              10 marketplaces. <em className="italic">One extension.</em>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {platforms.map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-2.5 px-4 py-3 bg-white rounded border border-[rgba(61,92,58,0.14)] hover:border-[rgba(61,92,58,0.3)] transition-colors"
              >
                <div
                  className="w-5 h-5 rounded flex-shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-xs font-medium text-[#1E2E1C]">{p.name}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-xs font-light text-[#8A9E88] mt-4">
            Import from all 10. Crosslist publish to Vinted, eBay, Etsy, Depop & Shopify.
          </p>
        </Reveal>
      </section>

      {/* FEATURES */}
      <section className="px-5 sm:px-8 lg:px-12 py-12 border-b border-[rgba(61,92,58,0.12)]">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-10">
            <div className="mb-2.5 text-xs font-medium uppercase tracking-wider text-[#8A9E88]">Extension features</div>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#1E2E1C]">
              Source faster. <em className="italic">List smarter.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border border-[rgba(61,92,58,0.12)] rounded-lg overflow-hidden">
            {features.map((feat, i) => {
              const Icon = feat.icon
              return (
                <div key={i} className="p-6 border-b sm:border-r border-[rgba(61,92,58,0.12)] last:border-b-0">
                  <div className="w-10 h-10 bg-[#D4E2D2] rounded flex items-center justify-center mb-3">
                    <Icon />
                  </div>
                  <div className="text-sm font-medium text-[#1E2E1C] mb-1.5">{feat.title}</div>
                  <div className="text-xs font-light leading-relaxed text-[#6B7D6A]">{feat.desc}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#D4E2D2] px-5 sm:px-8 lg:px-12 py-12 border-b border-[rgba(61,92,58,0.12)]">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#1E2E1C] mb-4">
            Ready to <em className="italic">connect</em>?
          </h2>
          <p className="text-sm font-light text-[#6B7D6A] mb-7">
            Install the extension, sign in to Wrenlist, and start importing from any marketplace in under a minute.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a
              href="https://chromewebstore.google.com/detail/wrenlist"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-[#3D5C3A] text-[#F5F0E8] px-7 py-3 text-xs font-medium uppercase tracking-widest hover:bg-[#2C4428] rounded"
            >
              Install for Chrome
            </a>
            <Link href="/?waitlist=1" className="text-sm font-light text-[#5A7A57] underline hover:text-[#3D5C3A]">
              or join the waitlist
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
