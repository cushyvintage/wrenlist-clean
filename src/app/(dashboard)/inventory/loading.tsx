/**
 * Inventory page loading skeleton
 * Shows shimmer table rows while data loads
 */

export default function InventoryLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title and filter skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 bg-sage/10 rounded w-48" />
        <div className="flex gap-2">
          <div className="h-9 bg-sage/10 rounded w-32" />
          <div className="h-9 bg-sage/10 rounded w-24" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded border border-sage/10 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-6 gap-4 p-4 border-b border-sage/10 bg-cream">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-3 bg-sage/10 rounded w-full" />
          ))}
        </div>

        {/* Table rows */}
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="grid grid-cols-6 gap-4 p-4 border-b border-sage/10 last:border-0">
            {[1, 2, 3, 4, 5, 6].map((col) => (
              <div key={`${row}-${col}`} className="h-4 bg-sage/5 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
