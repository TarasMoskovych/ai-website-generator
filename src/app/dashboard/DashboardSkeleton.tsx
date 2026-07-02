/**
 * DashboardSkeleton component
 * Renders a grid of placeholder skeleton cards matching the dashboard layout.
 * Used as the Suspense fallback for immediate visual feedback while
 * the dashboard content loads.
 *
 * Requirements:
 * - 3.2: Stream a Loading_Skeleton grid containing placeholder cards
 *         in place of the website grid until data fetch completes
 */

/**
 * Individual skeleton card matching the WebsiteCard structure:
 * - Thumbnail area (aspect-[4/3])
 * - Title placeholder
 * - Date placeholder
 */
function DashboardCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-card overflow-hidden shadow-sm">
      {/* Thumbnail skeleton */}
      <div className="aspect-[4/3] w-full bg-muted" />
      {/* Content skeleton */}
      <div className="p-3 space-y-2">
        {/* Title skeleton */}
        <div className="h-4 bg-muted rounded w-3/4" />
        {/* Date skeleton */}
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}

/**
 * DashboardSkeleton component
 * Renders a responsive grid of 8 skeleton cards to approximate
 * a typical dashboard view while real data is loading.
 */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <DashboardCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
