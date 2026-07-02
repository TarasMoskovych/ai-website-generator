/**
 * Public Showcase Page (Server Component)
 *
 * Server-renders the first page of showcased websites using Firebase Admin SDK.
 * Uses `unstable_cache` via `getShowcasedWebsitesServer` for 60-second revalidation.
 *
 * Requirements:
 * - 1.1: Server-render showcased websites as pre-rendered HTML
 * - 1.2: First page of 12 showcased websites, isPublic AND isShowcased true, sorted by showcasedAt desc
 * - 1.4: Generate metadata with title and description for SEO
 * - 1.5: Error handling with retry button on fetch failure
 * - 6.1: 60-second revalidation interval
 */

import Link from 'next/link';
import { Metadata } from 'next';
import { getShowcasedWebsitesServer } from '@/lib/serverData';
import { AppFooter } from '@/components/layout';
import { ShowcaseWebsiteCard } from '@/components/ShowcaseWebsiteCard';
import { ArrowLeftIcon, GlobeIcon } from '@/components/icons';
import { ShowcasePagination } from './ShowcasePagination';

// ─── Route Segment Config ────────────────────────────────────────────────────

export const revalidate = 60;

// ─── Metadata ────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Community Showcase | AI Website Generator',
  description:
    'Discover amazing websites created by our community using AI. Get inspired and create your own AI-generated website.',
};

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <GlobeIcon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        No showcased websites yet
      </h2>
      <p className="text-muted-foreground max-w-md">
        Be the first to share your creation! Sign in and click the
        &quot;Share&quot; button on any of your generated websites to feature it
        here.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Get Started
      </Link>
    </div>
  );
}

// ─── Error State ─────────────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <p className="text-destructive mb-4">{message}</p>
      <Link
        href="/showcase"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Try Again
      </Link>
    </div>
  );
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default async function ShowcasePage() {
  const PAGE_SIZE = 12;
  let items: Awaited<ReturnType<typeof getShowcasedWebsitesServer>>['items'] = [];
  let totalCount = 0;
  let totalPages = 0;
  let error: string | null = null;

  try {
    const result = await getShowcasedWebsitesServer(1, PAGE_SIZE);
    items = result.items;
    totalCount = result.totalCount;
    totalPages = result.totalPages;
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : 'Failed to load showcased websites. Please try again.';
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              aria-label="Back to home"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <GlobeIcon className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">
                Community Showcase
              </h1>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Create Your Own
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 relative">
        <div className="text-center mb-10">
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover amazing websites created by our community. Get inspired and
            create your own AI-generated website.
          </p>
        </div>

        {/* Error state */}
        {error && <ErrorState message={error} />}

        {/* Empty state */}
        {!error && items.length === 0 && <EmptyState />}

        {/* Website grid */}
        {!error && items.length > 0 && (
          <>
            <div className="flex flex-wrap justify-center gap-6">
              {items.map((website) => (
                <div
                  key={website.id}
                  className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] xl:w-[calc(25%-1.125rem)]"
                >
                  <ShowcaseWebsiteCard website={website} />
                </div>
              ))}
            </div>

            {/* Pagination - client component for page navigation */}
            <ShowcasePagination
              initialPage={1}
              initialTotalPages={totalPages}
              initialTotalCount={totalCount}
              pageSize={PAGE_SIZE}
            />
          </>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
