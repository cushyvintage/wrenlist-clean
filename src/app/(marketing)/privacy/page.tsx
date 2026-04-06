export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        <div className="prose prose-gray">
          <p className="text-sm text-gray-500 mb-6">Last updated: April 2026</p>

          <h2 className="text-xl font-semibold mt-6 mb-3">What we collect</h2>
          <p>When you sign up for Wrenlist, we collect your name and email address via Google Sign-In. We use this solely to authenticate you and personalise your experience.</p>

          <h2 className="text-xl font-semibold mt-6 mb-3">How we use your data</h2>
          <p>Your inventory data, listing details, and marketplace connections are stored securely and used only to provide Wrenlist&apos;s services. We do not sell or share your data with third parties.</p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Data storage</h2>
          <p>Data is stored in Supabase (hosted on AWS) with row-level security enabled. All connections use HTTPS encryption.</p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Your rights</h2>
          <p>You can request deletion of your account and all associated data at any time by contacting us.</p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Contact</h2>
          <p>For privacy questions, email <a href="mailto:domcushnan@gmail.com" className="text-green-700 underline">domcushnan@gmail.com</a>.</p>
        </div>
      </div>
    </div>
  )
}
