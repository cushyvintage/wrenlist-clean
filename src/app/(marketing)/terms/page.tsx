export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        <div className="prose prose-gray">
          <p className="text-sm text-gray-500 mb-6">Last updated: April 2026</p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Service</h2>
          <p>Wrenlist is an inventory management and multi-marketplace listing tool for resellers. By using Wrenlist, you agree to these terms.</p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Your account</h2>
          <p>You are responsible for maintaining the security of your account. You must provide accurate information when connecting marketplace accounts.</p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Marketplace connections</h2>
          <p>Wrenlist connects to third-party marketplaces (eBay, Vinted, Etsy, etc.) on your behalf. You are responsible for complying with each marketplace&apos;s terms of service.</p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Liability</h2>
          <p>Wrenlist is provided as-is. We are not liable for listing errors, marketplace policy violations, or lost sales resulting from use of the service.</p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Changes</h2>
          <p>We may update these terms at any time. Continued use of Wrenlist constitutes acceptance of updated terms.</p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Contact</h2>
          <p>For questions, email <a href="mailto:domcushnan@gmail.com" className="text-green-700 underline">domcushnan@gmail.com</a>.</p>
        </div>
      </div>
    </div>
  )
}
