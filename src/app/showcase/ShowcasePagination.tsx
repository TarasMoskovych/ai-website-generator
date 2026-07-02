'use client';

/**
 * ShowcasePagination Client Component
 *
 * Handles client-side pagination for the showcase page.
 * Uses the existing useShowcaseWebsites hook to fetch subsequent pages.
 * On page change: fetches new data, shows skeleton cards while loading,
 * then displays results and smooth-scrolls to top.
 *
 * Requirements:
 * - 1.3: Client-side page fetching without full page reload, scroll to top
 * - 1.6: Display skeleton cards while loading a new page
 * - 5.1: Navigate between pages without full reload with smooth scrolling
 */

import { useState, useCallback } from 'react';
import { useShowcaseWebsites } from '@/hooks/useShowcaseWebsites';
import { ShowcaseWebsiteCard } from '@/components/ShowcaseWebsiteCard';
import { WebsiteCardSkeleton } from '@/components/common/WebsiteCardSkeleton';
import { Pagination } from '@/components/Pagination';

/**
 * Props for the ShowcasePagination component
 */
export interface ShowcasePaginationProps {
  initialPage: number;
  initialTotalPages: number;
  initialTotalCount: number;
  pageSize: number;
}

/**
 * ShowcasePagination component
 *
 * Renders pagination controls and handles client-side page transitions.
 * On the first page, only the pagination controls are shown (the server-rendered grid is visible).
 * When a user navigates to a subsequent page, this component fetches the data
 * and replaces the grid content with the new results (or skeletons while loading).
 */
export function ShowcasePagination({
  initialPage,
  initialTotalPages,
  initialTotalCount,
  pageSize,
}: ShowcasePaginationProps) {
  const [hasNavigated, setHasNavigated] = useState(false);

  const {
    items,
    isLoading,
    currentPage,
    totalPages,
    totalCount,
    fetchPage,
  } = useShowcaseWebsites({ pageSize });

  // Use server-provided values until the user navigates
  const displayTotalPages = hasNavigated ? totalPages : initialTotalPages;
  const displayTotalCount = hasNavigated ? totalCount : initialTotalCount;
  const displayCurrentPage = hasNavigated ? currentPage : initialPage;

  const handlePageChange = useCallback(
    async (page: number) => {
      setHasNavigated(true);
      await fetchPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [fetchPage]
  );

  return (
    <>
      {/* Show client-rendered grid when user has navigated away from the initial page */}
      {hasNavigated && (
        <div className="flex flex-wrap justify-center gap-6">
          {isLoading
            ? Array.from({ length: pageSize }, (_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] xl:w-[calc(25%-1.125rem)]"
                >
                  <WebsiteCardSkeleton />
                </div>
              ))
            : items.map((website) => (
                <div
                  key={website.id}
                  className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] xl:w-[calc(25%-1.125rem)]"
                >
                  <ShowcaseWebsiteCard website={website} />
                </div>
              ))}
        </div>
      )}

      {/* Pagination controls */}
      <div className="mt-10 flex justify-center">
        <Pagination
          currentPage={displayCurrentPage}
          totalPages={displayTotalPages}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Item count text */}
      {hasNavigated && !isLoading && items.length > 0 && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          Showing {(displayCurrentPage - 1) * pageSize + 1}-
          {Math.min(displayCurrentPage * pageSize, displayTotalCount)} of{' '}
          {displayTotalCount} websites
        </p>
      )}
    </>
  );
}

export default ShowcasePagination;
