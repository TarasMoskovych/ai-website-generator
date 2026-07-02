/**
 * Dashboard Page (Server Component)
 * Renders the static shell (header, navigation, page heading, footer) as
 * server-rendered HTML in the initial response, with the data-dependent
 * content streamed via Suspense.
 *
 * Requirements:
 * - 3.1: Render the page header, navigation, and layout container as static
 *         HTML in the initial server response before any dynamic data fetch completes
 * - 3.2: Stream a Loading_Skeleton grid containing placeholder cards in place
 *         of the website grid until the data fetch completes
 */

import { Suspense } from 'react';
import { AppHeader, AppFooter, ShowcaseLink } from '@/components/layout';
import { PlusIcon } from '@/components/icons';
import { DashboardSkeleton } from './DashboardSkeleton';
import { DashboardContent } from './DashboardContent';

/**
 * Dashboard page - Server Component shell with Suspense-wrapped client content
 */
export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-primary/5">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>
      <AppHeader />
      <main className="flex-1 relative">
        <div className="container mx-auto px-4 py-8">
          {/* Page header */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Websites</h1>
              <p className="text-muted-foreground text-sm mt-1">Manage and view your generated websites</p>
            </div>
            <div className="flex items-center gap-2">
              <ShowcaseLink />
              <a
                href="/generate"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                New Website
              </a>
            </div>
          </div>
          {/* Data-dependent content with Suspense fallback */}
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardContent />
          </Suspense>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
