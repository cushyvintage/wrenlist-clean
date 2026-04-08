import { MarketingNav } from '@/components/layout/MarketingNav'
import { MarketingFooter } from '@/components/layout/MarketingFooter'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <MarketingNav />

      <div className="max-w-2xl mx-auto px-5 sm:px-10 py-12">
        <div className="text-xs font-medium uppercase tracking-wider text-[#8a9e88] mb-2.5">legal</div>
        <h1 className="font-serif text-3xl font-normal text-[#1e2e1c] mb-2">Terms of Service</h1>
        <p className="text-xs text-[#8a9e88] mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-sm font-normal leading-relaxed text-[#6b7d6a]">
          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Service</h2>
            <p>Wrenlist is an inventory management and multi-marketplace listing tool for resellers. By using Wrenlist, you agree to these terms.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Your account</h2>
            <p>You are responsible for maintaining the security of your account. You must provide accurate information when connecting marketplace accounts.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Marketplace connections</h2>
            <p>Wrenlist connects to third-party marketplaces (eBay, Vinted, Etsy, Shopify) on your behalf. You are responsible for complying with each marketplace&apos;s terms of service. Wrenlist is not responsible for marketplace policy changes or account actions taken by marketplace platforms.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Billing</h2>
            <p>Free accounts have no time limit. Paid plans are billed monthly or annually. You can cancel at any time — your access continues until the end of the billing period. Refunds are handled on a case-by-case basis.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Data ownership</h2>
            <p>You own your data. Wrenlist does not claim any rights to your inventory data, photos, or listing content. If you cancel, you can request a full export of your data.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Liability</h2>
            <p>Wrenlist is provided as-is. We are not liable for listing errors, marketplace policy violations, or lost sales resulting from use of the service. We make best efforts to keep the service available but do not guarantee uptime.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Changes</h2>
            <p>We may update these terms at any time. Continued use of Wrenlist constitutes acceptance of updated terms. We will notify active users of material changes via email.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Contact</h2>
            <p>For questions, email <a href="mailto:admin@wrenlist.com" className="text-[#5a7a57] underline">admin@wrenlist.com</a>.</p>
          </section>
        </div>
      </div>

      <MarketingFooter />
    </div>
  )
}
