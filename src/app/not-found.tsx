export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-cream p-4">
      <div className="text-6xl mb-6">🏷️</div>

      <h1 className="text-5xl font-serif italic text-ink mb-2 text-center">
        Sorry, this treasure's already sold
      </h1>

      <p className="text-lg text-ink-lt mb-8 text-center max-w-md">
        Either someone snapped it up first, or this page never made it to the shop.
        You know how these things go at the flea market.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-12">
        <a
          href="/"
          className="px-6 py-3 bg-sage text-white rounded font-medium hover:bg-sage-dk transition"
        >
          Back to home
        </a>
        <a
          href="/finds"
          className="px-6 py-3 border-2 border-sage text-sage rounded font-medium hover:bg-sage hover:text-white transition"
        >
          Browse finds
        </a>
      </div>

      <div className="text-sm text-ink-lt">
        <p>404 • Page not found</p>
      </div>
    </div>
  )
}
