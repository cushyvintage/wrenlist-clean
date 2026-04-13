import { MarketingNav } from '@/components/layout/MarketingNav'
import { MarketingFooter } from '@/components/layout/MarketingFooter'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <MarketingNav />

      <div className="max-w-2xl mx-auto px-5 sm:px-10 py-12">
        <div className="text-xs font-medium uppercase tracking-wider text-[#527050] mb-2.5">legal</div>
        <h1 className="font-serif text-3xl font-normal text-[#1e2e1c] mb-2">Privacy Policy</h1>
        <p className="text-xs text-[#527050] mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-sm font-normal leading-relaxed text-[#4a6147]">
          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Who we are (data controller)</h2>
            <p>Wrenlist is operated by Dominic Cushnan, a sole trader based in the United Kingdom, trading as Wrenlist. Dominic Cushnan is the data controller for personal data processed through the Wrenlist service.</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">Contact:</strong> <a href="mailto:admin@wrenlist.com" className="text-[#5a7a57] underline">admin@wrenlist.com</a></p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">ICO registration:</strong> Registered with the UK Information Commissioner&apos;s Office (registration number ZC121275).</p>
            <p className="mt-2">We process your personal data in accordance with the UK General Data Protection Regulation and the Data Protection Act 2018.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">What personal data we collect</h2>
            <p><strong className="text-[#1e2e1c]">Account Registration:</strong> Name, email address, password (hashed), authentication method (Google Sign-In or email).</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">Usage Data:</strong> Your inventory items, listing details, photos, pricing, platform connections, and sales history.</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">Marketplace Credentials:</strong> When you connect marketplace accounts (eBay, Vinted, Etsy, Shopify, Depop, Facebook Marketplace), we store OAuth tokens securely where an OAuth flow exists (eBay, Shopify). For marketplaces without a public OAuth flow (Vinted, Depop, Facebook Marketplace), the Wrenlist browser extension reads only your existing logged-in session cookie for that site, on your own device. We do not store marketplace passwords.</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">Technical Data:</strong> IP address, browser type, device information, access logs (for security purposes only).</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Lawful basis for processing</h2>
            <p>Under UK GDPR Article 6, we process your personal data for the following lawful bases:</p>
            <ul className="list-disc list-inside mt-2 ml-0">
              <li><strong className="text-[#1e2e1c]">Contract:</strong> Processing necessary to provide Wrenlist services (inventory storage, listing management, marketplace integrations).</li>
              <li><strong className="text-[#1e2e1c]">Legitimate Interests:</strong> Security monitoring, fraud prevention, platform maintenance, service improvements.</li>
              <li><strong className="text-[#1e2e1c]">Consent:</strong> Marketing communications (you can opt out at any time).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">How we use your data</h2>
            <p><strong className="text-[#1e2e1c]">To Provide Services:</strong> Store your inventory, manage listings, connect to marketplaces, provide customer support.</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">For Security:</strong> Prevent fraud, detect unauthorised access, maintain account security.</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">For Improvement:</strong> Analyse usage patterns to improve Wrenlist (anonymised data only).</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">For Communication:</strong> Send service updates, account notifications, and (with consent) marketing emails.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Marketplace connections</h2>
            <p>When you connect marketplace accounts (eBay, Vinted, Etsy, Shopify, Depop, Facebook Marketplace), we store your OAuth access tokens encrypted at rest (AES-256-CBC). Refresh tokens are stored securely. We only access the permissions you explicitly grant during OAuth authorisation. We do not store your marketplace username or password.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Wrenlist browser extension</h2>
            <p>Wrenlist publishes an optional Chrome browser extension — <em>Wrenlist — Marketplace Sync</em> — which acts as the automation layer for marketplaces that do not offer a public OAuth flow. Installing the extension is optional; you can use Wrenlist without it, but publish, update, and delist on Vinted, Depop, Etsy, Shopify and Facebook Marketplace require it.</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">What the extension reads.</strong> Only on marketplace domains you have connected in Wrenlist (<code>*.vinted.*</code>, <code>*.ebay.*</code>, <code>www.etsy.com</code>, <code>admin.shopify.com</code>, <code>*.myshopify.com</code>, <code>*.depop.com</code>, <code>*.facebook.com</code>, <code>upload.facebook.com</code>) and on your own Wrenlist dashboard (<code>*.wrenlist.com</code>). The extension reads the session cookie of marketplaces that require it (Vinted, Depop, Facebook Marketplace) so it can make authenticated requests on your behalf. It never reads, stores, or transmits cookies, messages, profile data, news feed, or any other data outside the marketplace API calls required to publish, update, or delist your own listings.</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">What the extension sends where.</strong> Your listing data goes to the marketplace APIs you are already signed into. Publish/delist job status is reported back to your own Wrenlist dashboard at <code>app.wrenlist.com</code>. No listing or session data is sent to any third party.</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">What the extension stores locally.</strong> Your Wrenlist bearer token (so it can talk to your Wrenlist dashboard), your extension preferences, and a short-lived diagnostic log for troubleshooting. No marketplace credentials are stored.</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">Remote code.</strong> The extension does not fetch or execute any remote JavaScript. All logic ships inside the published bundle on the Chrome Web Store.</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">Data we do not do.</strong> We do not sell, rent, or share any data the extension reads with third parties. We do not use the extension for advertising, profiling, or creditworthiness decisions. We do not use it to collect data unrelated to publishing and delisting your own listings.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Data storage and security</h2>
            <p><strong className="text-[#1e2e1c]">Storage:</strong> Your data is stored in Supabase (PostgreSQL database hosted on AWS) with row-level security (RLS) enabled. All data is stored in EU data centres, ensuring compliance with UK GDPR.</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">Encryption:</strong> All connections use HTTPS/TLS encryption in transit. Sensitive fields (OAuth tokens, payment information) are encrypted at rest.</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">Access Control:</strong> Only you can access your data. Database queries are filtered by your user ID (auth.uid()).</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Data retention</h2>
            <p><strong className="text-[#1e2e1c]">While Your Account is Active:</strong> Your data is retained as long as your Wrenlist account is active.</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">After Deletion:</strong> If you delete your account, all personal data (name, email, photos, descriptions, marketplace tokens) is permanently deleted immediately. Backup copies are securely destroyed within 90 days.</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">Anonymised Data Retention:</strong> When you delete your account, we retain a fully anonymised record of your product and sales data (category, brand, condition, pricing, sell-through timing) for service improvement and aggregate analytics. This data contains no user identifiers, photos, descriptions, or any information that could identify you. Under UK GDPR Recital 26, anonymised data is not personal data and is exempt from data subject rights. If you object to this retention, contact <a href="mailto:admin@wrenlist.com" className="text-[#5a7a57] underline">admin@wrenlist.com</a> before deleting your account.</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">Legal Obligations:</strong> If required by law (e.g., tax or fraud investigations), we may retain data longer to comply with UK legal requirements.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Cookies and tracking</h2>
            <p><strong className="text-[#1e2e1c]">Essential Cookies Only:</strong> We use cookies solely for authentication and session management (e.g., storing your session token).</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">No Third-Party Analytics:</strong> We do not use Google Analytics, Facebook Pixel, or any third-party tracking services.</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">No Marketing Cookies:</strong> We do not use cookies to track your behaviour for marketing purposes.</p>
            <p className="mt-2"><strong className="text-[#1e2e1c]">Consent:</strong> By using Wrenlist, you consent to essential cookies. You can disable cookies in your browser settings, but this may affect functionality.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Your data rights under UK GDPR</h2>
            <p>You have the following rights under UK GDPR Articles 15–20:</p>
            <ul className="list-disc list-inside mt-2 ml-0">
              <li><strong className="text-[#1e2e1c]">Right of Access (Article 15):</strong> Request a copy of your personal data. We will provide this within 30 days.</li>
              <li><strong className="text-[#1e2e1c]">Right to Rectification (Article 16):</strong> Correct inaccurate data. You can update account details directly in settings.</li>
              <li><strong className="text-[#1e2e1c]">Right to Erasure (Article 17):</strong> Request deletion of your data (&quot;right to be forgotten&quot;). We will delete all data within 30 days.</li>
              <li><strong className="text-[#1e2e1c]">Right to Data Portability (Article 20):</strong> Request your data in a portable, standard format (CSV/JSON). We will provide this within 30 days.</li>
              <li><strong className="text-[#1e2e1c]">Right to Restrict Processing (Article 18):</strong> Request we limit how we process your data.</li>
              <li><strong className="text-[#1e2e1c]">Right to Object (Article 21):</strong> Object to processing for marketing purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Sharing your data</h2>
            <p>We do not sell your data to third parties. Your data is only shared with:</p>
            <ul className="list-disc list-inside mt-2 ml-0">
              <li><strong className="text-[#1e2e1c]">Marketplace Platforms:</strong> When you connect marketplace accounts (eBay, Vinted, Etsy, etc.), they receive the inventory and listing data you choose to publish. This is necessary to provide the service.</li>
              <li><strong className="text-[#1e2e1c]">Service Providers:</strong> AWS (hosting), Supabase (database), Google (authentication). All have UK GDPR data processing agreements in place.</li>
              <li><strong className="text-[#1e2e1c]">Legal Requirement:</strong> If required by law, law enforcement, or court order.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">International data transfers</h2>
            <p>Your data is stored in the EU (Ireland) on AWS servers. If we ever transfer data outside the UK/EU, we will only do so with appropriate safeguards (Standard Contractual Clauses or Binding Corporate Rules) compliant with UK GDPR Chapter 5.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Data protection impact assessment</h2>
            <p>We conduct regular security reviews and data protection assessments to ensure compliance with UK GDPR.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Contact and your rights</h2>
            <p>To exercise any of your data rights, contact us at <a href="mailto:admin@wrenlist.com" className="text-[#5a7a57] underline">admin@wrenlist.com</a> with &quot;Data Request&quot; in the subject line. We will respond within 30 days.</p>
            <p className="mt-2">If you are unsatisfied with how we handle your data, you have the right to lodge a complaint with the Information Commissioner&apos;s Office (ICO): <a href="https://www.ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-[#5a7a57] underline">www.ico.org.uk</a>.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Changes to this policy</h2>
            <p>We may update this privacy policy at any time. Material changes will be notified via email. Continued use of Wrenlist after changes constitute acceptance.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-normal text-[#1e2e1c] mb-3">Contact</h2>
            <p>For privacy questions or data requests, email <a href="mailto:admin@wrenlist.com" className="text-[#5a7a57] underline">admin@wrenlist.com</a>.</p>
          </section>
        </div>
      </div>

      <MarketingFooter />
    </div>
  )
}
