/**
 * PreviewSkeleton component
 * Renders skeleton placeholders for the website editor and preview panels.
 * Used as the Suspense fallback while website preview data is loading.
 *
 * Requirements: 3.5
 */

export function PreviewSkeleton() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col animate-pulse">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3 shrink-0 min-h-[60px]">
        <div className="flex items-center gap-3">
          {/* Back button placeholder */}
          <div className="h-9 w-9 rounded-md bg-muted" />
          <div className="space-y-2">
            {/* Title placeholder */}
            <div className="h-5 w-48 rounded bg-muted" />
            {/* Subtitle / date placeholder */}
            <div className="h-3 w-32 rounded bg-muted" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Action button placeholders */}
          <div className="h-9 w-20 rounded-md bg-muted" />
          <div className="h-9 w-24 rounded-md bg-muted" />
          <div className="h-9 w-24 rounded-md bg-muted" />
          <div className="h-9 w-28 rounded-md bg-muted" />
        </div>
      </div>

      {/* Main content area skeleton */}
      <div className="flex flex-1 overflow-hidden">
        {/* Preview panel skeleton (left, larger) */}
        <div className="flex-1 border-r border-border p-4">
          <div className="h-full w-full rounded-lg bg-muted" />
        </div>

        {/* Code editor panel skeleton (right, fixed width) */}
        <div className="w-[500px] min-w-[400px] flex flex-col">
          {/* Editor toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
            </div>
            <div className="h-6 w-6 rounded bg-muted" />
          </div>
          {/* Tab bar placeholder */}
          <div className="flex border-b border-border px-3 py-2 gap-2">
            <div className="h-7 w-16 rounded bg-muted" />
            <div className="h-7 w-16 rounded bg-muted" />
          </div>
          {/* Code lines placeholder */}
          <div className="flex-1 p-4 space-y-2">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-5/6 rounded bg-muted" />
            <div className="h-3 w-4/6 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-3/4 rounded bg-muted" />
            <div className="h-3 w-5/6 rounded bg-muted" />
            <div className="h-3 w-2/3 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-4/5 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
