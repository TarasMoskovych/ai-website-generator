/**
 * useShowcaseWebsites Custom Hook
 * Manages showcase website fetching, loading state, error handling, and pagination
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import websiteRepository from '@/services/websiteRepository';
import type { ShowcasedWebsite } from '@/types/website';

/**
 * Default page size for pagination
 */
const DEFAULT_PAGE_SIZE = 12;

/**
 * Options for the useShowcaseWebsites hook
 * Requirement 3.1: Accept optional pageSize parameter with default value of 12
 */
export interface UseShowcaseWebsitesOptions {
  /** Number of items per page (default: 12) */
  pageSize?: number;
}

/**
 * Return type for the useShowcaseWebsites hook
 * Requirement 3.3: Return object with items, isLoading, error, currentPage, totalPages, totalCount, fetchPage, refresh
 */
export interface UseShowcaseWebsitesReturn {
  /** Array of showcased websites for the current page */
  items: ShowcasedWebsite[];
  /** Whether data is currently being fetched */
  isLoading: boolean;
  /** Error message if fetch failed, null otherwise */
  error: string | null;
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Total count of all showcased websites */
  totalCount: number;
  /** Function to fetch a specific page */
  fetchPage: (page: number) => Promise<void>;
  /** Function to refresh the current page */
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching showcased websites with pagination
 *
 * Requirement 3.1: Accept optional pageSize parameter with default value of 12
 * Requirement 3.2: Automatically fetch first page on mount
 * Requirement 3.3: Return object with items, isLoading, error, currentPage, totalPages, totalCount, fetchPage, refresh
 * Requirement 3.4: fetchPage updates state with corresponding page of showcased websites
 * Requirement 3.5: Set error state with descriptive message on fetch failure
 * Requirement 3.6: Located at src/hooks/useShowcaseWebsites.ts
 *
 * @param options - Optional configuration (pageSize)
 * @returns Object with items, loading state, error, pagination info, and control functions
 *
 * @example
 * ```tsx
 * // Full showcase page with pagination
 * function ShowcasePage() {
 *   const { items, isLoading, totalPages, currentPage, fetchPage, totalCount } =
 *     useShowcaseWebsites({ pageSize: 12 });
 *   // ...
 * }
 *
 * // Home page preview with limited items
 * function CommunityShowcase() {
 *   const { items, isLoading, totalCount } = useShowcaseWebsites({ pageSize: 6 });
 *   // ...
 * }
 * ```
 */
export function useShowcaseWebsites(
  options?: UseShowcaseWebsitesOptions
): UseShowcaseWebsitesReturn {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;

  // State for website data
  const [items, setItems] = useState<ShowcasedWebsite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Use ref to store the current page for refresh function
  const currentPageRef = useRef(currentPage);

  // Use ref for pageSize to avoid re-creating fetchPage on pageSize changes
  const pageSizeRef = useRef(pageSize);

  // Sync refs with state in effect (required by react-hooks/refs rule)
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    pageSizeRef.current = pageSize;
  }, [pageSize]);

  /**
   * Fetch showcased websites for a specific page
   * Requirement 3.4: When fetchPage is called, fetch showcased websites for that page and update state
   * Requirement 3.5: Set error state with descriptive message on failure
   */
  const fetchPage = useCallback(async (page: number): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await websiteRepository.getShowcasedWebsites({
        page,
        pageSize: pageSizeRef.current,
      });

      setItems(result.items);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
      setCurrentPage(page);
    } catch (err) {
      // Requirement 3.5: Set error state with descriptive message
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to load showcased websites. Please try again.';
      setError(message);
      console.error('Error fetching showcased websites:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh the current page
   * Re-fetches the current page without changing page number
   */
  const refresh = useCallback(async (): Promise<void> => {
    await fetchPage(currentPageRef.current);
  }, [fetchPage]);

  /**
   * Initial fetch on mount
   * Requirement 3.2: Automatically fetch first page on mount
   */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial data fetch is intentional
    fetchPage(1);
  }, [fetchPage]);

  return {
    items,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalCount,
    fetchPage,
    refresh,
  };
}
