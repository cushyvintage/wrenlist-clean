/**
 * App shell loading skeleton
 * Shows while app layout is hydrating
 */

export default function AppLoading() {
  return (
    <div className="flex animate-pulse">
      {/* Sidebar skeleton */}
      <aside className="w-[210px] h-screen bg-sidebar flex flex-col">
        <div className="px-[18px] py-6 border-b border-white/10">
          <div className="h-4 bg-white/10 rounded w-20 mb-2" />
          <div className="h-2 bg-white/10 rounded w-12" />
        </div>
        <nav className="flex-1 px-[18px] py-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 bg-white/5 rounded" />
          ))}
        </nav>
        <div className="px-[18px] py-4 border-t border-white/10">
          <div className="h-3 bg-white/10 rounded w-10 mb-2" />
          <div className="h-3 bg-white/10 rounded w-24" />
        </div>
      </aside>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Topbar skeleton */}
        <div className="h-[60px] border-b border-sage/14 bg-white flex items-center justify-between px-8">
          <div className="h-5 bg-sage/10 rounded w-40" />
          <div className="h-8 bg-sage/10 rounded w-32" />
        </div>

        {/* Content skeleton */}
        <div className="flex-1 bg-cream p-8 space-y-6">
          <div className="h-8 bg-sage/10 rounded w-60" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-white rounded border border-sage/10" />
            ))}
          </div>
          <div className="h-48 bg-white rounded border border-sage/10" />
        </div>
      </div>
    </div>
  )
}
