export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-cream">
      <h1 className="text-4xl font-serif italic mb-4">not found</h1>
      <p className="text-ink-lt mb-6">The page you're looking for doesn't exist.</p>
      <a href="/" className="px-4 py-2 bg-sage text-white rounded hover:bg-sage-dk">
        Back to home
      </a>
    </div>
  )
}
