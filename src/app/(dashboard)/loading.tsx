/**
 * App shell loading skeleton
 * Renders inside the dashboard layout's <main> — do NOT include
 * sidebar or topbar here (layout.tsx already provides those).
 */

export default function AppLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-sage/10 rounded w-60" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-white rounded border border-sage/10" />
        ))}
      </div>
      <div className="h-48 bg-white rounded border border-sage/10" />
    </div>
  )
}
