import { MarketingNav } from '@/components/layout/MarketingNav'
import { MarketingFooter } from '@/components/layout/MarketingFooter'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <MarketingNav />

      <div className="max-w-2xl mx-auto px-5 sm:px-10 py-12">
        <div className="text-xs font-medium uppercase tracking-wider text-[#8a9e88] mb-2.5">legal</div>
        <h1 className="font-serif text-3xl font-normal text-[#1e2e1c] mb-2">Privacy Policy</h1>
        <p className="text-xs text-[#8a9e88] mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-sm font-normal leading-relaxed text-[#6b7d6a]">
          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">What we collect</h2>
            <p>When you sign up for Wrenlist, we collect your name and email address via Google Sign-In or email registration. We use this solely to authenticate you and personalise your experience.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">How we use your data</h2>
            <p>Your inventory data, listing details, and marketplace connections are stored securely and used only to provide Wrenlist&apos;s services. We do not sell or share your data with third parties.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Marketplace connections</h2>
            <p>When you connect marketplace accounts (eBay, Vinted, Etsy, Shopify), we store OAuth tokens securely to manage listings on your behalf. We only access the permissions you explicitly grant.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Data storage</h2>
            <p>Data is stored in Supabase (hosted on AWS) with row-level security enabled. All connections use HTTPS encryption. Your data is stored in EU data centres.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Cookies</h2>
            <p>We use essential cookies only — for authentication and session management. We do not use tracking cookies or third-party analytics.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Your rights</h2>
            <p>You can request export or deletion of your account and all associated data at any time by contacting us. Under GDPR, you have the right to access, rectify, and erase your personal data.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Contact</h2>
            <p>For privacy questions, email <a href="mailto:admin@wrenlist.com" className="text-[#5a7a57] underline">admin@wrenlist.com</a>.</p>
          </section>
        </div>
      </div>

      <MarketingFooter />
    </div>
  )
}
