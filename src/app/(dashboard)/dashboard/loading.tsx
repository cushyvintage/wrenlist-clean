/**
 * Dashboard loading skeleton
 */

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Greeting skeleton */}
      <div>
        <div className="h-10 bg-sage/10 rounded w-64 mb-2" />
        <div className="h-4 bg-sage/10 rounded w-48" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-cream-md rounded border border-sage/10" />
        ))}
      </div>

      {/* Two-column layout skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded border border-sage/10 p-6">
            <div className="h-5 bg-sage/10 rounded w-40 mb-6" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-sage/10 rounded" />
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <div className="h-32 bg-cream-md rounded border border-sage/10" />
          <div className="h-32 bg-white rounded border border-sage/10" />
          <div className="h-12 bg-sage/10 rounded" />
        </div>
      </div>

      {/* Activity section skeleton */}
      <div className="bg-white rounded border border-sage/10 p-6">
        <div className="h-5 bg-sage/10 rounded w-40 mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-sage/10 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
