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
            <p>Wrenlist is an inventory management and multi-marketplace listing tool for resellers. By using Wrenlist, you agree to these terms. These terms are governed by English law and the courts of England and Wales have exclusive jurisdiction.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Business Information</h2>
            <p>Wrenlist is operated by Cushyvintage Limited. For queries about your account or this service, contact <a href="mailto:admin@wrenlist.com" className="text-[#5a7a57] underline">admin@wrenlist.com</a>.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Your account</h2>
            <p>You are responsible for maintaining the security of your account and password. You must provide accurate information when signing up and connecting marketplace accounts. You are liable for all activity that occurs under your account.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Marketplace connections</h2>
            <p>Wrenlist connects to third-party marketplaces (eBay, Vinted, Etsy, Shopify, Depop) on your behalf. You remain responsible for complying with each marketplace&apos;s terms of service and policies. Wrenlist is not responsible for marketplace policy changes, account suspensions, or actions taken by marketplace platforms. By connecting your marketplace accounts to Wrenlist, you grant us permission to manage listings on your behalf within the scope of the permissions you grant.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Subscription and Billing</h2>
            <p><strong className="text-[#1e2e1c]">Free Plan:</strong> Free accounts have no time limit and no billing required.</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">Paid Plans:</strong> Paid subscriptions are billed monthly or annually in advance. Your card will be charged automatically on your renewal date. You can cancel at any time via your account settings — your access continues until the end of your paid billing period.</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">Cancellation Right (14-Day Cooling-Off Period):</strong> Under the Consumer Contracts Regulations 2013, you have the right to cancel your subscription within 14 days of purchase for a full refund, provided you have not materially used the service. Refunds for paid plans made after the 14-day period are handled on a case-by-case basis. To cancel, email <a href="mailto:admin@wrenlist.com" className="text-[#5a7a57] underline">admin@wrenlist.com</a>.</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">Price Changes:</strong> We may update prices for new billing periods. We will notify you at least 30 days before any price increase. Continued use after the notification date constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Data ownership</h2>
            <p>You own all inventory data, photos, and listing content stored in Wrenlist. Wrenlist does not claim any rights to your data. If you cancel your account, you can request a full export of your data in standard format at any time. Data will be securely deleted within 30 days of account closure upon request.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Liability</h2>
            <p>Wrenlist is provided on an &quot;as-is&quot; basis. We are not liable for listing errors, marketplace policy violations, account suspensions, or lost sales resulting from use of the service. We make best efforts to keep the service available but do not guarantee uptime or error-free operation. Our liability is limited to the amount you paid us in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Intellectual Property</h2>
            <p>Wrenlist, including its design, layout, and functionality, is our intellectual property. You may not reproduce, distribute, or modify any part of Wrenlist without permission.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Cookies</h2>
            <p>Wrenlist uses essential cookies for authentication and session management only. We do not use tracking cookies or third-party analytics cookies without your consent. By using Wrenlist, you consent to our use of essential cookies. See our <a href="/privacy" className="text-[#5a7a57] underline">Privacy Policy</a> for full details.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Changes to Terms</h2>
            <p>We may update these terms at any time. Continued use of Wrenlist after changes constitute acceptance. Material changes will be notified to active users via email at least 30 days in advance. Your continued use after notification constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Dispute Resolution</h2>
            <p>If you have a dispute with Wrenlist, please contact us at <a href="mailto:admin@wrenlist.com" className="text-[#5a7a57] underline">admin@wrenlist.com</a> to attempt resolution. These terms are governed by English law and any dispute shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Contact</h2>
            <p>For questions or concerns, email <a href="mailto:admin@wrenlist.com" className="text-[#5a7a57] underline">admin@wrenlist.com</a>.</p>
          </section>
        </div>
      </div>

      <MarketingFooter />
    </div>
  )
}
