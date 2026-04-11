import Link from 'next/link'

export const metadata = {
  title: 'Account deleted — Wrenlist',
  description: 'Your Wrenlist account has been deleted.',
}

export default function GoodbyePage() {
  return (
    <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-2 mb-10">
          <img src="/wrenlist-logo.png" alt="Wrenlist" className="w-8 h-8" />
          <div className="font-serif text-2xl text-[#1e2e1c]">
            WREN<em className="italic">list</em>
          </div>
        </div>

        <div className="text-xs font-medium uppercase tracking-wider text-[#527050] mb-3">
          account deleted
        </div>

        <h1 className="font-serif text-3xl font-normal text-[#1e2e1c] mb-4">
          Your account has been <em className="italic">deleted.</em>
        </h1>

        <p className="text-sm text-[#4a6147] leading-relaxed mb-8">
          Every find, listing, expense, and marketplace connection tied to your account has been
          permanently removed from Wrenlist. You&apos;ll receive a confirmation email in the next
          minute or two.
        </p>

        <p className="text-sm text-[#4a6147] leading-relaxed mb-10">
          Thank you for trying it out. If something pushed you away that we could have done
          better, reply to the farewell email — it goes straight to Dom.
        </p>

        <Link
          href="https://wrenlist.com"
          className="inline-block px-6 py-3 text-sm font-medium text-white bg-[#5a7a57] rounded hover:bg-[#4a6147] transition"
        >
          Back to wrenlist.com
        </Link>
      </div>
    </div>
  )
}
