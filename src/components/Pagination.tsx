/**
 * Pagination Component
 * Displays pagination controls with page numbers and next/previous buttons
 *
 * Requirements:
 * - 6.5: Display 12 websites per page with pagination controls showing page numbers and next/previous navigation buttons
 * - Uses Icons module for shared ChevronLeftIcon and ChevronRightIcon
 *
 * This component:
 * 1. Displays page numbers for navigation
 * 2. Includes next/previous buttons for sequential navigation
 * 3. Handles page change events
 * 4. Shows ellipsis for large page ranges
 * 5. Accessible with proper ARIA attributes and keyboard navigation
 */

'use client';

import { useCallback, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';

/**
 * Pagination props following the design specification
 */
export interface PaginationProps {
  /** Current active page (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
}

/**
 * Generate visible page numbers with ellipsis for large ranges
 * Shows: first page, last page, current page, and pages around current
 */
function getVisiblePages(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  // If 7 or fewer pages, show all
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [];

  // Always include first page
  pages.push(1);

  // Calculate range around current page
  const rangeStart = Math.max(2, currentPage - 1);
  const rangeEnd = Math.min(totalPages - 1, currentPage + 1);

  // Add ellipsis before range if needed
  if (rangeStart > 2) {
    pages.push('ellipsis');
  }

  // Add pages in range
  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  // Add ellipsis after range if needed
  if (rangeEnd < totalPages - 1) {
    pages.push('ellipsis');
  }

  // Always include last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

/**
 * Pagination component
 * Displays pagination controls with page numbers and next/previous buttons
 *
 * @example
 * // Basic usage
 * <Pagination
 *   currentPage={1}
 *   totalPages={10}
 *   onPageChange={(page) => console.log('Navigate to page', page)}
 * />
 *
 * @example
 * // Single page (pagination hidden)
 * <Pagination
 *   currentPage={1}
 *   totalPages={1}
 *   onPageChange={handlePageChange}
 * />
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  /**
   * Handle previous page click
   */
  const handlePrevious = useCallback(() => {
    if (!isFirstPage) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, isFirstPage, onPageChange]);

  /**
   * Handle next page click
   */
  const handleNext = useCallback(() => {
    if (!isLastPage) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, isLastPage, onPageChange]);

  /**
   * Handle page number click
   */
  const handlePageClick = useCallback(
    (page: number) => {
      if (page !== currentPage && page >= 1 && page <= totalPages) {
        onPageChange(page);
      }
    },
    [currentPage, totalPages, onPageChange]
  );

  /**
   * Get visible page numbers with ellipsis
   */
  const visiblePages = useMemo(
    () => getVisiblePages(currentPage, totalPages),
    [currentPage, totalPages]
  );

  // Don't render pagination if there's only one page or no pages
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className="flex items-center justify-center gap-1"
      aria-label="Pagination"
      role="navigation"
    >
      {/* Previous button */}
      <button
        type="button"
        onClick={handlePrevious}
        disabled={isFirstPage}
        className={`
          inline-flex items-center justify-center
          h-9 w-9
          rounded-md
          text-sm font-medium
          transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          ${
            isFirstPage
              ? 'text-muted-foreground/50 cursor-not-allowed'
              : 'text-foreground hover:bg-accent hover:text-accent-foreground'
          }
        `}
        aria-label="Go to previous page"
        aria-disabled={isFirstPage}
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </button>

      {/* Page numbers */}
      <div className="flex items-center gap-1" role="group" aria-label="Page numbers">
        {visiblePages.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="
                  flex items-center justify-center
                  h-9 w-9
                  text-muted-foreground
                "
                aria-hidden="true"
              >
                …
              </span>
            );
          }

          const isActive = page === currentPage;

          return (
            <button
              key={page}
              type="button"
              onClick={() => handlePageClick(page)}
              className={`
                inline-flex items-center justify-center
                h-9 min-w-9 px-3
                rounded-md
                text-sm font-medium
                transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                }
              `}
              aria-label={`Go to page ${page}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {page}
            </button>
          );
        })}
      </div>

      {/* Next button */}
      <button
        type="button"
        onClick={handleNext}
        disabled={isLastPage}
        className={`
          inline-flex items-center justify-center
          h-9 w-9
          rounded-md
          text-sm font-medium
          transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          ${
            isLastPage
              ? 'text-muted-foreground/50 cursor-not-allowed'
              : 'text-foreground hover:bg-accent hover:text-accent-foreground'
          }
        `}
        aria-label="Go to next page"
        aria-disabled={isLastPage}
      >
        <ChevronRightIcon className="h-4 w-4" />
      </button>

      {/* Screen reader announcement */}
      <span className="sr-only">
        Page {currentPage} of {totalPages}
      </span>
    </nav>
  );
}

export default Pagination;
