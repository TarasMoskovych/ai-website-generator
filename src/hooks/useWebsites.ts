/**
 * useWebsites Custom Hook
 * Manages website fetching, loading state, error handling, and pagination for user-owned websites
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import websiteRepository from '@/services/websiteRepository';
import type { GeneratedWebsite } from '@/types/website';

/**
 * Default page size for pagination
 */
const DEFAULT_PAGE_SIZE = 12;

/**
 * Options for the useWebsites hook
 * Requirement 2.1: Accept optional pageSize parameter with default value of 12
 */
export interface UseWebsitesOptions {
  /** Number of items per page (default: 12) */
  pageSize?: number;
}

/**
 * Return type for the useWebsites hook
 * Requirement 2.3: Return object with items, isLoading, error, currentPage, totalPages, fetchPage, refresh
 */
export interface UseWebsitesReturn {
  /** Array of websites for the current page */
  items: GeneratedWebsite[];
  /** Whether data is currently being fetched */
  isLoading: boolean;
  /** Error message if fetch failed, null otherwise */
  error: string | null;
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Function to fetch a specific page */
  fetchPage: (page: number) => Promise<void>;
  /** Function to refresh the current page */
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching user-owned websites with pagination
 *
 * Requirement 2.1: Accept a userId parameter and an optional pageSize parameter with default value of 12
 * Requirement 2.2: Fetch the first page of websites on initialization when userId is truthy
 * Requirement 2.3: Return object with items, isLoading, error, currentPage, totalPages, fetchPage, refresh
 * Requirement 2.4: fetchPage updates currentPage and triggers fetch
 * Requirement 2.5: Set error state with descriptive message on fetch failure
 * Requirement 2.6: refresh re-fetches the current page
 * Requirement 2.7: Located at src/hooks/useWebsites.ts
 *
 * @param userId - Firebase Auth UID of the website owner
 * @param options - Optional configuration (pageSize)
 * @returns Object with items, loading state, error, pagination info, and control functions
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { user } = useAuth();
 *   const { items, isLoading, error, currentPage, totalPages, fetchPage, refresh } =
 *     useWebsites(user?.uid ?? '', { pageSize: 12 });
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage message={error} onRetry={refresh} />;
 *
 *   return (
 *     <>
 *       <WebsiteGrid websites={items} />
 *       <Pagination
 *         currentPage={currentPage}
 *         totalPages={totalPages}
 *         onPageChange={fetchPage}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function useWebsites(
  userId: string,
  options?: UseWebsitesOptions
): UseWebsitesReturn {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;

  // State for website data
  const [items, setItems] = useState<GeneratedWebsite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

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
   * Fetch websites for a specific page
   * Requirement 2.4: When fetchPage is called, update currentPage and trigger fetch
   * Requirement 2.5: Set error state with descriptive message on failure
   */
  const fetchPage = useCallback(
    async (page: number): Promise<void> => {
      // Don't fetch if no userId is provided
      if (!userId) {
        setItems([]);
        setTotalPages(0);
        setCurrentPage(1);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await websiteRepository.getAllByUser(userId, {
          page,
          pageSize: pageSizeRef.current,
        });

        setItems(result.items);
        setTotalPages(result.totalPages);
        setCurrentPage(page);
      } catch (err) {
        // Requirement 2.5: Set error state with descriptive message
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to load websites. Please try again.';
        setError(message);
        console.error('Error fetching websites:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  /**
   * Refresh the current page
   * Requirement 2.6: Re-fetch the current page without changing page number
   */
  const refresh = useCallback(async (): Promise<void> => {
    await fetchPage(currentPageRef.current);
  }, [fetchPage]);

  /**
   * Initial fetch on mount and when userId changes
   * Requirement 2.2: Fetch the first page when initialized (when userId is truthy)
   */
  useEffect(() => {
    // Reset state when userId changes
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial data fetch and state reset is intentional
    setItems([]);
    setTotalPages(0);
    setCurrentPage(1);
    setError(null);

    // Fetch for the userId if truthy
    if (userId) {
      fetchPage(1);
    }
  }, [userId, fetchPage]);

  return {
    items,
    isLoading,
    error,
    currentPage,
    totalPages,
    fetchPage,
    refresh,
  };
}
