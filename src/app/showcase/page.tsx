/**
 * Public Showcase Page
 * Displays all showcased websites with pagination
 *
 * Requirements:
 * - 23.6: Provide dedicated /showcase page with pagination (12 per page)
 * - 23.7: Sort by showcasedAt descending (newest first)
 * - 23.8: Navigate to public view page on click
 * - 23.9: Display thumbnail, title, and creator name
 * - 23.10: Only include websites where isPublic AND isShowcased are true
 * - 11.5, 11.6: Use extracted ShowcaseWebsiteCard and WebsiteCardSkeleton components
 */

'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useShowcaseWebsites } from '@/hooks/useShowcaseWebsites';
import { Pagination } from '@/components/Pagination';
import { ArrowLeftIcon, GlobeIcon } from '@/components/icons';
import { AppFooter } from '@/components/layout';
import { ShowcaseWebsiteCard } from '@/components/ShowcaseWebsiteCard';
import { WebsiteCardSkeleton } from '@/components/common';

/** Empty state component */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <GlobeIcon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">No showcased websites yet</h2>
      <p className="text-muted-foreground max-w-md">
        Be the first to share your creation! Sign in and click the &quot;Share&quot; button on any of your generated websites to feature it here.
      </p>
      <Link href="/" className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
        Get Started
      </Link>
    </div>
  );
}

export default function ShowcasePage() {
  const { items, isLoading, error, currentPage, totalPages, totalCount, fetchPage, refresh } = useShowcaseWebsites({ pageSize: 12 });

  const handlePageChange = useCallback((page: number) => {
    fetchPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchPage]);

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
            <Link href="/" className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors" aria-label="Back to home">
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <GlobeIcon className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">Community Showcase</h1>
            </div>
          </div>
          <Link href="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Create Your Own
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 relative">
        <div className="text-center mb-10">
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover amazing websites created by our community. Get inspired and create your own AI-generated website.
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-destructive mb-4">{error}</p>
            <button type="button" onClick={() => refresh()} className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              Try Again
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && items.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
            {Array.from({ length: 8 }).map((_, i) => <WebsiteCardSkeleton key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && items.length === 0 && !error && <EmptyState />}

        {/* Website grid */}
        {items.length > 0 && (
          <>
            <div className="flex flex-wrap justify-center gap-6">
              {items.map((website) => (
                <div key={website.id} className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] xl:w-[calc(25%-1.125rem)]">
                  <ShowcaseWebsiteCard website={website} />
                </div>
              ))}
            </div>
            <div className="mt-10">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Showing {(currentPage - 1) * 12 + 1}-{Math.min(currentPage * 12, totalCount)} of {totalCount} websites
            </p>
          </>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
