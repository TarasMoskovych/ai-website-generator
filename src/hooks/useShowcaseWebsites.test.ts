/**
 * useShowcaseWebsites Hook Tests
 *
 * Unit tests and property-based tests for the useShowcaseWebsites custom hook.
 *
 * Tests cover:
 * - Hook accepts optional pageSize with default of 12
 * - Initial fetch triggered on mount
 * - Error handling works correctly
 * - Property 4: useShowcaseWebsites Return Structure
 * - Property 5: useShowcaseWebsites Pagination Behavior
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 13.2, 13.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useShowcaseWebsites } from './useShowcaseWebsites';
import type { ShowcasedWebsite } from '@/types/website';
import type { PaginatedResult } from '@/services/websiteRepository';

// Mock the websiteRepository
const mockGetShowcasedWebsites = vi.fn();

vi.mock('@/services/websiteRepository', () => ({
  default: {
    getShowcasedWebsites: (...args: unknown[]) => mockGetShowcasedWebsites(...args),
  },
}));

// Helper to create mock showcased website
function createMockShowcasedWebsite(id: string): ShowcasedWebsite {
  return {
    id,
    title: `Website ${id}`,
    thumbnailUrl: 'data:image/png;base64,test',
    creatorName: 'Test User',
    showcasedAt: '2024-01-01T00:00:00Z',
  };
}

// Helper to create mock paginated result
function createMockPaginatedResult(
  page: number,
  pageSize: number,
  totalCount: number
): PaginatedResult<ShowcasedWebsite> {
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (page - 1) * pageSize;
  const itemCount = Math.min(pageSize, Math.max(0, totalCount - startIndex));
  const items: ShowcasedWebsite[] = [];

  for (let i = 0; i < itemCount; i++) {
    items.push(createMockShowcasedWebsite(`website-${startIndex + i + 1}`));
  }

  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

describe('useShowcaseWebsites Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Unit Tests', () => {
    /**
     * Requirement 3.1: Accept optional pageSize parameter with default value of 12
     */
    describe('Hook Parameters', () => {
      it('accepts optional pageSize with default of 12', async () => {
        mockGetShowcasedWebsites.mockResolvedValue(
          createMockPaginatedResult(1, 12, 24)
        );

        const { result } = renderHook(() => useShowcaseWebsites());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        // Verify getShowcasedWebsites was called with default pageSize of 12
        expect(mockGetShowcasedWebsites).toHaveBeenCalledWith({
          page: 1,
          pageSize: 12,
        });
      });

      it('accepts custom pageSize', async () => {
        const pageSize = 6;
        mockGetShowcasedWebsites.mockResolvedValue(
          createMockPaginatedResult(1, pageSize, 18)
        );

        const { result } = renderHook(() =>
          useShowcaseWebsites({ pageSize })
        );

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(mockGetShowcasedWebsites).toHaveBeenCalledWith({
          page: 1,
          pageSize,
        });
      });
    });

    /**
     * Requirement 3.2: Automatically fetch first page on mount
     */
    describe('Initial Fetch', () => {
      it('fetches first page on mount', async () => {
        mockGetShowcasedWebsites.mockResolvedValue(
          createMockPaginatedResult(1, 12, 24)
        );

        const { result } = renderHook(() => useShowcaseWebsites());

        // Initially loading
        expect(result.current.isLoading).toBe(true);

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(mockGetShowcasedWebsites).toHaveBeenCalledTimes(1);
        expect(mockGetShowcasedWebsites).toHaveBeenCalledWith({
          page: 1,
          pageSize: 12,
        });
        expect(result.current.items.length).toBe(12);
        expect(result.current.currentPage).toBe(1);
        expect(result.current.totalPages).toBe(2);
        expect(result.current.totalCount).toBe(24);
      });
    });

    /**
     * Requirement 3.5: Set error state with descriptive message on fetch failure
     */
    describe('Error Handling', () => {
      it('sets error state when fetch fails', async () => {
        const errorMessage = 'Network error';
        mockGetShowcasedWebsites.mockRejectedValue(new Error(errorMessage));

        const { result } = renderHook(() => useShowcaseWebsites());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.error).toBe(errorMessage);
        expect(result.current.items).toEqual([]);
      });

      it('sets generic error message for non-Error exceptions', async () => {
        mockGetShowcasedWebsites.mockRejectedValue('Unknown failure');

        const { result } = renderHook(() => useShowcaseWebsites());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.error).toBe(
          'Failed to load showcased websites. Please try again.'
        );
      });
    });

    /**
     * Requirement 3.4: fetchPage updates state with corresponding page
     */
    describe('Pagination - fetchPage', () => {
      it('updates currentPage and fetches new page data', async () => {
        mockGetShowcasedWebsites.mockResolvedValue(
          createMockPaginatedResult(1, 12, 36)
        );

        const { result } = renderHook(() => useShowcaseWebsites());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.currentPage).toBe(1);
        expect(result.current.totalPages).toBe(3);

        // Fetch page 2
        mockGetShowcasedWebsites.mockResolvedValue(
          createMockPaginatedResult(2, 12, 36)
        );

        await act(async () => {
          await result.current.fetchPage(2);
        });

        expect(result.current.currentPage).toBe(2);
        expect(mockGetShowcasedWebsites).toHaveBeenLastCalledWith({
          page: 2,
          pageSize: 12,
        });
      });
    });

    /**
     * Refresh functionality
     */
    describe('Refresh Functionality', () => {
      it('re-fetches current page when refresh is called', async () => {
        mockGetShowcasedWebsites.mockResolvedValue(
          createMockPaginatedResult(1, 12, 24)
        );

        const { result } = renderHook(() => useShowcaseWebsites());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        // Navigate to page 2
        mockGetShowcasedWebsites.mockResolvedValue(
          createMockPaginatedResult(2, 12, 24)
        );

        await act(async () => {
          await result.current.fetchPage(2);
        });

        expect(result.current.currentPage).toBe(2);

        // Clear mock calls and refresh
        mockGetShowcasedWebsites.mockClear();
        mockGetShowcasedWebsites.mockResolvedValue(
          createMockPaginatedResult(2, 12, 24)
        );

        await act(async () => {
          await result.current.refresh();
        });

        // Verify refresh called with current page (2)
        expect(mockGetShowcasedWebsites).toHaveBeenCalledWith({
          page: 2,
          pageSize: 12,
        });
      });
    });
  });

  /**
   * Property-Based Tests
   */
  describe('Property-Based Tests', () => {
    /**
     * Feature: code-deduplication-hooks, Property 4: useShowcaseWebsites Return Structure
     *
     * *For any* invocation of the `useShowcaseWebsites` hook with valid options,
     * the hook SHALL return an object containing all required fields: `items` (array),
     * `isLoading` (boolean), `error` (string | null), `currentPage` (number),
     * `totalPages` (number), `totalCount` (number), `fetchPage` (function),
     * and `refresh` (function).
     *
     * **Validates: Requirements 3.3**
     */
    it('returns all required fields for any valid options (Property 4)', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary valid pageSize values
          fc.integer({ min: 1, max: 100 }),
          (pageSize) => {
            // Mock a successful empty response to avoid actual fetch
            mockGetShowcasedWebsites.mockResolvedValue({
              items: [],
              totalCount: 0,
              page: 1,
              pageSize,
              totalPages: 0,
            });

            const { result } = renderHook(() =>
              useShowcaseWebsites({ pageSize })
            );

            // Verify all required fields exist
            expect(result.current).toHaveProperty('items');
            expect(result.current).toHaveProperty('isLoading');
            expect(result.current).toHaveProperty('error');
            expect(result.current).toHaveProperty('currentPage');
            expect(result.current).toHaveProperty('totalPages');
            expect(result.current).toHaveProperty('totalCount');
            expect(result.current).toHaveProperty('fetchPage');
            expect(result.current).toHaveProperty('refresh');

            // Verify correct types
            expect(Array.isArray(result.current.items)).toBe(true);
            expect(typeof result.current.isLoading).toBe('boolean');
            expect(
              result.current.error === null ||
                typeof result.current.error === 'string'
            ).toBe(true);
            expect(typeof result.current.currentPage).toBe('number');
            expect(typeof result.current.totalPages).toBe('number');
            expect(typeof result.current.totalCount).toBe('number');
            expect(typeof result.current.fetchPage).toBe('function');
            expect(typeof result.current.refresh).toBe('function');
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Feature: code-deduplication-hooks, Property 5: useShowcaseWebsites Pagination Behavior
     *
     * *For any* valid page number within the range [1, totalPages], when `fetchPage`
     * is called with that page number, the hook SHALL update state correctly with
     * the corresponding page of showcased websites.
     *
     * **Validates: Requirements 3.4**
     */
    it('fetchPage updates state correctly for any valid page (Property 5)', async () => {
      // Run property test with multiple generated page scenarios
      await fc.assert(
        fc.asyncProperty(
          // Generate pageSize between 1 and 50
          fc.integer({ min: 1, max: 50 }),
          // Generate totalCount between 1 and 200
          fc.integer({ min: 1, max: 200 }),
          async (pageSize, totalCount) => {
            // Clear mocks between iterations
            mockGetShowcasedWebsites.mockClear();

            const totalPages = Math.ceil(totalCount / pageSize);

            // Set up initial mock for page 1
            mockGetShowcasedWebsites.mockResolvedValue(
              createMockPaginatedResult(1, pageSize, totalCount)
            );

            const { result } = renderHook(() =>
              useShowcaseWebsites({ pageSize })
            );

            // Wait for initial fetch
            await waitFor(() => {
              expect(result.current.isLoading).toBe(false);
            });

            // Verify initial state
            expect(result.current.currentPage).toBe(1);
            expect(result.current.totalPages).toBe(totalPages);
            expect(result.current.totalCount).toBe(totalCount);

            // Generate a random valid page number within [1, totalPages]
            const targetPage = Math.floor(Math.random() * totalPages) + 1;

            // Set up mock for the target page
            mockGetShowcasedWebsites.mockResolvedValue(
              createMockPaginatedResult(targetPage, pageSize, totalCount)
            );

            // Call fetchPage with the target page
            await act(async () => {
              await result.current.fetchPage(targetPage);
            });

            // Verify currentPage was updated to match requested page
            expect(result.current.currentPage).toBe(targetPage);

            // Verify a fetch was triggered for the target page
            expect(mockGetShowcasedWebsites).toHaveBeenLastCalledWith({
              page: targetPage,
              pageSize,
            });

            // Verify items were updated (length should match expected)
            const expectedItemCount = Math.min(
              pageSize,
              totalCount - (targetPage - 1) * pageSize
            );
            expect(result.current.items.length).toBe(expectedItemCount);

            // Verify state consistency after page transition
            expect(Array.isArray(result.current.items)).toBe(true);
            expect(result.current.error).toBeNull();
            expect(result.current.isLoading).toBe(false);
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Feature: code-deduplication-hooks, Property 5: fetchPage maintains valid state
     *
     * After calling fetchPage with any valid page, the hook state should be consistent:
     * currentPage should match the requested page and items should be an array.
     *
     * **Validates: Requirements 3.4**
     */
    it('fetchPage maintains consistent state for any page transition (Property 5)', async () => {
      const pageSize = 12;
      const totalCount = 50;

      // Set up initial state
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(1, pageSize, totalCount)
      );

      const { result } = renderHook(() => useShowcaseWebsites({ pageSize }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Generate sequence of page transitions
      const pageSequence = fc.sample(
        fc.integer({ min: 1, max: Math.ceil(totalCount / pageSize) }),
        50
      );

      for (const targetPage of pageSequence) {
        mockGetShowcasedWebsites.mockResolvedValue(
          createMockPaginatedResult(targetPage, pageSize, totalCount)
        );

        await act(async () => {
          await result.current.fetchPage(targetPage);
        });

        // After each page transition, verify state consistency
        expect(result.current.currentPage).toBe(targetPage);
        expect(Array.isArray(result.current.items)).toBe(true);
        expect(result.current.error).toBeNull();
        expect(result.current.isLoading).toBe(false);
        expect(result.current.totalCount).toBe(totalCount);
      }
    });

    /**
     * Feature: code-deduplication-hooks, Property 5: fetchPage is idempotent
     *
     * Calling fetchPage with the same page number multiple times should result
     * in the same state (idempotent behavior).
     *
     * **Validates: Requirements 3.4**
     */
    it('fetchPage is idempotent - same page yields same state (Property 5)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // page number
          fc.integer({ min: 5, max: 20 }), // pageSize
          async (page, pageSize) => {
            const totalCount = page * pageSize + 10; // Ensure page is valid

            mockGetShowcasedWebsites.mockClear();
            mockGetShowcasedWebsites.mockResolvedValue(
              createMockPaginatedResult(1, pageSize, totalCount)
            );

            const { result } = renderHook(() =>
              useShowcaseWebsites({ pageSize })
            );

            await waitFor(() => {
              expect(result.current.isLoading).toBe(false);
            });

            // Fetch the target page
            mockGetShowcasedWebsites.mockResolvedValue(
              createMockPaginatedResult(page, pageSize, totalCount)
            );

            await act(async () => {
              await result.current.fetchPage(page);
            });

            // Capture state after first call
            const stateAfterFirst = {
              currentPage: result.current.currentPage,
              totalPages: result.current.totalPages,
              totalCount: result.current.totalCount,
              itemCount: result.current.items.length,
              error: result.current.error,
            };

            // Call fetchPage again with same page
            await act(async () => {
              await result.current.fetchPage(page);
            });

            // State should be the same
            expect(result.current.currentPage).toBe(stateAfterFirst.currentPage);
            expect(result.current.totalPages).toBe(stateAfterFirst.totalPages);
            expect(result.current.totalCount).toBe(stateAfterFirst.totalCount);
            expect(result.current.items.length).toBe(stateAfterFirst.itemCount);
            expect(result.current.error).toBe(stateAfterFirst.error);
          }
        ),
        { numRuns: 15 }
      );
    });

    /**
     * Feature: code-deduplication-hooks, Property 5: totalCount remains stable during pagination
     *
     * After fetching any valid page, the totalCount should remain the same
     * as the total count from the server response.
     *
     * **Validates: Requirements 3.4**
     */
    it('totalCount remains stable across page transitions (Property 5)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }), // pageSize
          fc.integer({ min: 1, max: 500 }), // totalCount
          async (pageSize, totalCount) => {
            mockGetShowcasedWebsites.mockClear();

            // Initial fetch
            mockGetShowcasedWebsites.mockResolvedValue(
              createMockPaginatedResult(1, pageSize, totalCount)
            );

            const { result } = renderHook(() =>
              useShowcaseWebsites({ pageSize })
            );

            await waitFor(() => {
              expect(result.current.isLoading).toBe(false);
            });

            // Verify totalCount is set correctly initially
            expect(result.current.totalCount).toBe(totalCount);

            const totalPages = Math.ceil(totalCount / pageSize);

            // Navigate to a different page if possible
            if (totalPages > 1) {
              const targetPage = Math.min(2, totalPages);
              mockGetShowcasedWebsites.mockResolvedValue(
                createMockPaginatedResult(targetPage, pageSize, totalCount)
              );

              await act(async () => {
                await result.current.fetchPage(targetPage);
              });

              // totalCount should still match
              expect(result.current.totalCount).toBe(totalCount);
            }
          }
        ),
        { numRuns: 25 }
      );
    });
  });
});
