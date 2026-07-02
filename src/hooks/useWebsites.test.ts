/**
 * useWebsites Hook Tests
 *
 * Unit tests and property-based tests for the useWebsites custom hook.
 *
 * Tests cover:
 * - Hook accepts userId and optional pageSize with default of 12
 * - Initial fetch triggered on mount when userId is truthy
 * - Error state set when fetch fails
 * - Refresh re-fetches current page
 * - Property 2: useWebsites Return Structure
 * - Property 3: useWebsites Pagination Behavior
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 13.2, 13.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebsites } from './useWebsites';
import type { GeneratedWebsite } from '@/types/website';
import type { PaginatedResult } from '@/services/websiteRepository';

// Mock the websiteRepository
const mockGetAllByUser = vi.fn();

vi.mock('@/services/websiteRepository', () => ({
  default: {
    getAllByUser: (...args: unknown[]) => mockGetAllByUser(...args),
  },
}));

// Helper to create mock websites
function createMockWebsite(id: string, userId: string): GeneratedWebsite {
  return {
    id,
    userId,
    title: `Website ${id}`,
    html: '<h1>Test</h1>',
    css: 'h1 { color: blue; }',
    thumbnailUrl: 'data:image/png;base64,test',
    inputType: 'text',
    originalPrompt: 'Test prompt',
    isPublic: true,
    isShowcased: false,
    showcasedAt: null,
    creatorName: 'Test User',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

// Helper to create mock paginated result
function createMockPaginatedResult(
  page: number,
  pageSize: number,
  totalCount: number,
  userId: string
): PaginatedResult<GeneratedWebsite> {
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (page - 1) * pageSize;
  const itemCount = Math.min(pageSize, totalCount - startIndex);
  const items: GeneratedWebsite[] = [];

  for (let i = 0; i < itemCount; i++) {
    items.push(createMockWebsite(`website-${startIndex + i + 1}`, userId));
  }

  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

describe('useWebsites Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Unit Tests', () => {
    /**
     * Requirement 2.1: Accept a userId parameter and an optional pageSize parameter with default value of 12
     */
    describe('Hook Parameters', () => {
      it('accepts userId and optional pageSize with default of 12', async () => {
        const userId = 'test-user-123';
        mockGetAllByUser.mockResolvedValue(
          createMockPaginatedResult(1, 12, 24, userId)
        );

        const { result } = renderHook(() => useWebsites(userId));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        // Verify getAllByUser was called with default pageSize of 12
        expect(mockGetAllByUser).toHaveBeenCalledWith(userId, {
          page: 1,
          pageSize: 12,
        });
      });

      it('accepts custom pageSize', async () => {
        const userId = 'test-user-123';
        const pageSize = 6;
        mockGetAllByUser.mockResolvedValue(
          createMockPaginatedResult(1, pageSize, 18, userId)
        );

        const { result } = renderHook(() =>
          useWebsites(userId, { pageSize })
        );

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(mockGetAllByUser).toHaveBeenCalledWith(userId, {
          page: 1,
          pageSize,
        });
      });
    });

    /**
     * Requirement 2.2: Fetch the first page of websites on initialization when userId is truthy
     */
    describe('Initial Fetch', () => {
      it('fetches first page on mount when userId is truthy', async () => {
        const userId = 'test-user-123';
        mockGetAllByUser.mockResolvedValue(
          createMockPaginatedResult(1, 12, 24, userId)
        );

        const { result } = renderHook(() => useWebsites(userId));

        // Initially loading
        expect(result.current.isLoading).toBe(true);

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(mockGetAllByUser).toHaveBeenCalledTimes(1);
        expect(mockGetAllByUser).toHaveBeenCalledWith(userId, {
          page: 1,
          pageSize: 12,
        });
        expect(result.current.items.length).toBe(12);
        expect(result.current.currentPage).toBe(1);
        expect(result.current.totalPages).toBe(2);
      });

      it('does not fetch when userId is empty', async () => {
        const { result } = renderHook(() => useWebsites(''));

        // Should not trigger a fetch for empty userId
        expect(mockGetAllByUser).not.toHaveBeenCalled();
        expect(result.current.items).toEqual([]);
        expect(result.current.isLoading).toBe(false);
      });
    });

    /**
     * Requirement 2.5: Set error state with descriptive message on fetch failure
     */
    describe('Error Handling', () => {
      it('sets error state when fetch fails', async () => {
        const userId = 'test-user-123';
        const errorMessage = 'Network error';
        mockGetAllByUser.mockRejectedValue(new Error(errorMessage));

        const { result } = renderHook(() => useWebsites(userId));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.error).toBe(errorMessage);
        expect(result.current.items).toEqual([]);
      });

      it('sets generic error message for non-Error exceptions', async () => {
        const userId = 'test-user-123';
        mockGetAllByUser.mockRejectedValue('Unknown failure');

        const { result } = renderHook(() => useWebsites(userId));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.error).toBe(
          'Failed to load websites. Please try again.'
        );
      });
    });

    /**
     * Requirement 2.6: refresh re-fetches the current page
     */
    describe('Refresh Functionality', () => {
      it('re-fetches current page when refresh is called', async () => {
        const userId = 'test-user-123';
        mockGetAllByUser.mockResolvedValue(
          createMockPaginatedResult(1, 12, 24, userId)
        );

        const { result } = renderHook(() => useWebsites(userId));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        // First call for initial fetch
        expect(mockGetAllByUser).toHaveBeenCalledTimes(1);

        // Navigate to page 2
        mockGetAllByUser.mockResolvedValue(
          createMockPaginatedResult(2, 12, 24, userId)
        );

        await act(async () => {
          await result.current.fetchPage(2);
        });

        expect(result.current.currentPage).toBe(2);

        // Clear mock calls and refresh
        mockGetAllByUser.mockClear();
        mockGetAllByUser.mockResolvedValue(
          createMockPaginatedResult(2, 12, 24, userId)
        );

        await act(async () => {
          await result.current.refresh();
        });

        // Verify refresh called with current page (2)
        expect(mockGetAllByUser).toHaveBeenCalledWith(userId, {
          page: 2,
          pageSize: 12,
        });
      });
    });

    /**
     * Requirement 2.4: fetchPage updates currentPage and triggers fetch
     */
    describe('Pagination - fetchPage', () => {
      it('updates currentPage and fetches new page data', async () => {
        const userId = 'test-user-123';
        mockGetAllByUser.mockResolvedValue(
          createMockPaginatedResult(1, 12, 36, userId)
        );

        const { result } = renderHook(() => useWebsites(userId));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.currentPage).toBe(1);
        expect(result.current.totalPages).toBe(3);

        // Fetch page 2
        mockGetAllByUser.mockResolvedValue(
          createMockPaginatedResult(2, 12, 36, userId)
        );

        await act(async () => {
          await result.current.fetchPage(2);
        });

        expect(result.current.currentPage).toBe(2);
        expect(mockGetAllByUser).toHaveBeenLastCalledWith(userId, {
          page: 2,
          pageSize: 12,
        });
      });

      it('handles fetchPage to the last page', async () => {
        const userId = 'test-user-123';
        mockGetAllByUser.mockResolvedValue(
          createMockPaginatedResult(1, 12, 36, userId)
        );

        const { result } = renderHook(() => useWebsites(userId));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        // Fetch last page (page 3)
        mockGetAllByUser.mockResolvedValue(
          createMockPaginatedResult(3, 12, 36, userId)
        );

        await act(async () => {
          await result.current.fetchPage(3);
        });

        expect(result.current.currentPage).toBe(3);
        expect(result.current.items.length).toBe(12);
      });
    });
  });

  /**
   * Property-Based Tests
   */
  describe('Property-Based Tests', () => {
    /**
     * Feature: code-deduplication-hooks, Property 2: useWebsites Return Structure
     *
     * *For any* valid userId string, the `useWebsites` hook SHALL return an object
     * containing all required fields: `items` (array), `isLoading` (boolean),
     * `error` (string | null), `currentPage` (number), `totalPages` (number),
     * `fetchPage` (function), and `refresh` (function).
     *
     * **Validates: Requirements 2.3**
     */
    it('returns all required fields for any userId (Property 2)', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary non-empty strings for userId
          fc.string({ minLength: 1, maxLength: 50 }),
          (userId) => {
            // Mock a successful empty response to avoid actual fetch
            mockGetAllByUser.mockResolvedValue({
              items: [],
              totalCount: 0,
              page: 1,
              pageSize: 12,
              totalPages: 0,
            });

            const { result } = renderHook(() => useWebsites(userId));

            // Verify all required fields exist
            expect(result.current).toHaveProperty('items');
            expect(result.current).toHaveProperty('isLoading');
            expect(result.current).toHaveProperty('error');
            expect(result.current).toHaveProperty('currentPage');
            expect(result.current).toHaveProperty('totalPages');
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
            expect(typeof result.current.fetchPage).toBe('function');
            expect(typeof result.current.refresh).toBe('function');
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Feature: code-deduplication-hooks, Property 3: useWebsites Pagination Behavior
     *
     * *For any* valid page number within the range [1, totalPages], when `fetchPage`
     * is called with that page number, the hook SHALL update `currentPage` to match
     * the requested page and trigger a fetch that updates `items` with the
     * corresponding page of websites.
     *
     * **Validates: Requirements 2.4**
     */
    it('fetchPage updates currentPage and triggers fetch for any valid page (Property 3)', async () => {
      const userId = 'test-user-123';

      // Run property test with multiple generated page scenarios
      await fc.assert(
        fc.asyncProperty(
          // Generate pageSize between 1 and 50
          fc.integer({ min: 1, max: 50 }),
          // Generate totalCount between 1 and 200
          fc.integer({ min: 1, max: 200 }),
          async (pageSize, totalCount) => {
            // Clear mocks between iterations
            mockGetAllByUser.mockClear();

            const totalPages = Math.ceil(totalCount / pageSize);

            // Set up initial mock for page 1
            mockGetAllByUser.mockResolvedValue(
              createMockPaginatedResult(1, pageSize, totalCount, userId)
            );

            const { result } = renderHook(() =>
              useWebsites(userId, { pageSize })
            );

            // Wait for initial fetch
            await waitFor(() => {
              expect(result.current.isLoading).toBe(false);
            });

            // Verify initial state
            expect(result.current.currentPage).toBe(1);
            expect(result.current.totalPages).toBe(totalPages);

            // Generate a random valid page number within [1, totalPages]
            const targetPage = Math.floor(Math.random() * totalPages) + 1;

            // Set up mock for the target page
            mockGetAllByUser.mockResolvedValue(
              createMockPaginatedResult(targetPage, pageSize, totalCount, userId)
            );

            // Call fetchPage with the target page
            await act(async () => {
              await result.current.fetchPage(targetPage);
            });

            // Verify currentPage was updated to match requested page
            expect(result.current.currentPage).toBe(targetPage);

            // Verify a fetch was triggered for the target page
            expect(mockGetAllByUser).toHaveBeenLastCalledWith(userId, {
              page: targetPage,
              pageSize,
            });

            // Verify items were updated (length should match expected)
            const expectedItemCount = Math.min(
              pageSize,
              totalCount - (targetPage - 1) * pageSize
            );
            expect(result.current.items.length).toBe(expectedItemCount);
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Feature: code-deduplication-hooks, Property 3: fetchPage maintains valid state
     *
     * After calling fetchPage with any valid page, the hook state should be consistent:
     * currentPage should match the requested page and items should be an array.
     *
     * **Validates: Requirements 2.4**
     */
    it('fetchPage maintains consistent state for any page transition (Property 3)', async () => {
      const userId = 'test-user-123';
      const pageSize = 12;
      const totalCount = 50;

      // Set up initial state
      mockGetAllByUser.mockResolvedValue(
        createMockPaginatedResult(1, pageSize, totalCount, userId)
      );

      const { result } = renderHook(() => useWebsites(userId, { pageSize }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Generate sequence of page transitions
      const pageSequence = fc.sample(
        fc.integer({ min: 1, max: Math.ceil(totalCount / pageSize) }),
        50
      );

      for (const targetPage of pageSequence) {
        mockGetAllByUser.mockResolvedValue(
          createMockPaginatedResult(targetPage, pageSize, totalCount, userId)
        );

        await act(async () => {
          await result.current.fetchPage(targetPage);
        });

        // After each page transition, verify state consistency
        expect(result.current.currentPage).toBe(targetPage);
        expect(Array.isArray(result.current.items)).toBe(true);
        expect(result.current.error).toBeNull();
        expect(result.current.isLoading).toBe(false);
      }
    });

    /**
     * Feature: code-deduplication-hooks, Property 3: fetchPage is idempotent
     *
     * Calling fetchPage with the same page number multiple times should result
     * in the same state (idempotent behavior).
     *
     * **Validates: Requirements 2.4**
     */
    it('fetchPage is idempotent - same page yields same state (Property 3)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // page number
          fc.integer({ min: 5, max: 20 }), // pageSize
          async (page, pageSize) => {
            const userId = 'test-user-123';
            const totalCount = page * pageSize + 10; // Ensure page is valid

            mockGetAllByUser.mockClear();
            mockGetAllByUser.mockResolvedValue(
              createMockPaginatedResult(1, pageSize, totalCount, userId)
            );

            const { result } = renderHook(() =>
              useWebsites(userId, { pageSize })
            );

            await waitFor(() => {
              expect(result.current.isLoading).toBe(false);
            });

            // Fetch the target page
            mockGetAllByUser.mockResolvedValue(
              createMockPaginatedResult(page, pageSize, totalCount, userId)
            );

            await act(async () => {
              await result.current.fetchPage(page);
            });

            // Capture state after first call
            const stateAfterFirst = {
              currentPage: result.current.currentPage,
              totalPages: result.current.totalPages,
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
            expect(result.current.items.length).toBe(stateAfterFirst.itemCount);
            expect(result.current.error).toBe(stateAfterFirst.error);
          }
        ),
        { numRuns: 15 }
      );
    });
  });
});
