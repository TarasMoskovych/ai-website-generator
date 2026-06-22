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
 * - 23.13: Accessible without authentication
 * - 8.1, 8.4: Use useShowcaseWebsites hook for fetching
 */

'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useShowcaseWebsites } from '@/hooks/useShowcaseWebsites';
import type { ShowcasedWebsite } from '@/types/website';

/**
 * Arrow left icon for back navigation
 */
function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

/**
 * Globe icon for showcase branding
 */
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

/**
 * Chevron left icon
 */
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

/**
 * Chevron right icon
 */
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}



/**
 * Loading skeleton for website cards
 */
function WebsiteCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-video bg-muted rounded-lg" />
      <div className="mt-3 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}

/**
 * Empty state component
 */
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
        Be the first to share your creation! Sign in and click the &quot;Share&quot; button on any of your generated websites to feature it here.
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

/**
 * Website card component
 */
interface WebsiteCardProps {
  website: ShowcasedWebsite;
}

function WebsiteCard({ website }: WebsiteCardProps) {
  return (
    <Link
      href={`/view/${website.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block w-full"
    >
      <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted transition-all group-hover:border-primary/50 group-hover:shadow-md">
        {website.thumbnailUrl ? (
          <Image
            src={website.thumbnailUrl}
            alt={`Preview of ${website.title}`}
            fill
            className="object-cover object-top transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <GlobeIcon className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
      </div>
      <div className="mt-3">
        <h3 className="font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {website.title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          by {website.creatorName}
        </p>
      </div>
    </Link>
  );
}

/**
 * Pagination component
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Calculate visible page numbers
  const getVisiblePages = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first page
    pages.push(1);

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) {
      pages.push('ellipsis');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages - 1) {
      pages.push('ellipsis');
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <nav
      className="flex items-center justify-center gap-1"
      aria-label="Pagination"
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="
          inline-flex items-center justify-center
          h-10 w-10 rounded-md
          text-muted-foreground
          hover:bg-muted hover:text-foreground
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        "
        aria-label="Previous page"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>

      {visiblePages.map((page, index) =>
        page === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className="px-2 text-muted-foreground"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`
              inline-flex items-center justify-center
              h-10 min-w-10 px-3 rounded-md
              text-sm font-medium
              transition-colors
              ${currentPage === page
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }
            `}
            aria-label={`Page ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="
          inline-flex items-center justify-center
          h-10 w-10 rounded-md
          text-muted-foreground
          hover:bg-muted hover:text-foreground
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        "
        aria-label="Next page"
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>
    </nav>
  );
}



/**
 * Showcase page component
 * Uses useShowcaseWebsites hook for fetching showcased websites with pagination
 * Requirements: 8.1, 8.4
 */
export default function ShowcasePage() {
  // Use the useShowcaseWebsites hook for data fetching
  // Requirement 8.1: Import and use useShowcaseWebsites_Hook for fetching showcased websites
  const {
    items,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalCount,
    fetchPage,
    refresh,
  } = useShowcaseWebsites({ pageSize: 12 });

  /**
   * Handle page change
   * Requirement 8.4: Wire up fetchPage for pagination
   */
  const handlePageChange = useCallback((page: number) => {
    fetchPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchPage]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="
                  inline-flex items-center justify-center
                  rounded-md p-2
                  text-muted-foreground
                  hover:bg-accent hover:text-accent-foreground
                  transition-colors
                "
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
              className="
                inline-flex items-center justify-center
                rounded-md bg-primary px-4 py-2
                text-sm font-medium text-primary-foreground
                hover:bg-primary/90
                transition-colors
              "
            >
              Create Your Own
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 relative">
        {/* Page intro */}
        <div className="text-center mb-10">
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover amazing websites created by our community. Get inspired and create your own AI-generated website.
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-destructive mb-4">{error}</p>
            <button
              type="button"
              onClick={() => refresh()}
              className="
                inline-flex items-center justify-center
                rounded-md bg-primary px-4 py-2
                text-sm font-medium text-primary-foreground
                hover:bg-primary/90
                transition-colors
              "
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && items.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
            {Array.from({ length: 8 }).map((_, i) => (
              <WebsiteCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && items.length === 0 && !error && (
          <EmptyState />
        )}

        {/* Website grid */}
        {items.length > 0 && (
          <>
            <div className="flex flex-wrap justify-center gap-6">
              {items.map((website) => (
                <div key={website.id} className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] xl:w-[calc(25%-1.125rem)]">
                  <WebsiteCard website={website} />
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-10">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>

            {/* Results info */}
            <p className="text-center text-sm text-muted-foreground mt-4">
              Showing {(currentPage - 1) * 12 + 1}-{Math.min(currentPage * 12, totalCount)} of {totalCount} websites
            </p>
          </>
        )}
      </main>
    </div>
  );
}
