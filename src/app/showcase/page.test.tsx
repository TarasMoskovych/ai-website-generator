/**
 * Showcase Page Integration Tests
 *
 * Tests that verify the Showcase page renders correctly with the refactored components:
 * - useShowcaseWebsites hook integration
 * - Pagination component works
 * - Icons display properly
 * - Loading states work
 * - Error handling works
 *
 * Validates: Requirements 8.3, 8.4, 13.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ShowcasePage from './page';
import type { ShowcasedWebsite } from '@/types/website';
import type { PaginatedResult } from '@/services/websiteRepository';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/showcase',
}));

// Mock next/image to render as a regular img
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock the websiteRepository
const mockGetShowcasedWebsites = vi.fn();

vi.mock('@/services/websiteRepository', () => ({
  default: {
    getShowcasedWebsites: (...args: unknown[]) => mockGetShowcasedWebsites(...args),
  },
}));

// Mock window.scrollTo
const mockScrollTo = vi.fn();
Object.defineProperty(window, 'scrollTo', { value: mockScrollTo, writable: true });

// Helper to create mock showcased website
function createMockShowcasedWebsite(id: string, overrides?: Partial<ShowcasedWebsite>): ShowcasedWebsite {
  return {
    id,
    title: `Test Website ${id}`,
    thumbnailUrl: `data:image/png;base64,thumbnail-${id}`,
    creatorName: `Creator ${id}`,
    showcasedAt: '2024-01-15T10:30:00Z',
    ...overrides,
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

describe('Showcase Page Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Page Rendering', () => {
    /**
     * Tests that the page renders correctly with website data
     * Validates: Requirement 8.3
     */
    it('renders the page with header and main content', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(1, 12, 24)
      );

      render(<ShowcasePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
      });

      // Check header elements
      expect(screen.getByRole('heading', { name: /community showcase/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /back to home/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /create your own/i })).toBeInTheDocument();

      // Check intro text
      expect(screen.getByText(/discover amazing websites/i)).toBeInTheDocument();
    });

    /**
     * Tests that website cards are rendered
     * Validates: Requirement 8.3
     */
    it('renders website cards with correct data', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(1, 12, 3)
      );

      render(<ShowcasePage />);

      await waitFor(() => {
        expect(screen.getByText('Test Website website-1')).toBeInTheDocument();
      });

      // Verify all 3 websites are rendered
      expect(screen.getByText('Test Website website-1')).toBeInTheDocument();
      expect(screen.getByText('Test Website website-2')).toBeInTheDocument();
      expect(screen.getByText('Test Website website-3')).toBeInTheDocument();

      // Verify creator names
      expect(screen.getByText('by Creator website-1')).toBeInTheDocument();
      expect(screen.getByText('by Creator website-2')).toBeInTheDocument();
      expect(screen.getByText('by Creator website-3')).toBeInTheDocument();
    });

    /**
     * Tests that website cards link to the correct public view page
     * Validates: Requirement 8.3
     */
    it('website cards link to public view page', async () => {
      mockGetShowcasedWebsites.mockResolvedValue({
        items: [createMockShowcasedWebsite('test-id-123')],
        totalCount: 1,
        page: 1,
        pageSize: 12,
        totalPages: 1,
      });

      render(<ShowcasePage />);

      await waitFor(() => {
        expect(screen.getByText('Test Website test-id-123')).toBeInTheDocument();
      });

      const link = screen.getByRole('link', { name: /test website test-id-123/i });
      expect(link).toHaveAttribute('href', '/view/test-id-123');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('useShowcaseWebsites Hook Integration', () => {
    /**
     * Tests that the hook is called with correct pageSize
     * Validates: Requirements 8.1, 8.4
     */
    it('fetches showcased websites with pageSize of 12', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(1, 12, 24)
      );

      render(<ShowcasePage />);

      await waitFor(() => {
        expect(mockGetShowcasedWebsites).toHaveBeenCalledWith({
          page: 1,
          pageSize: 12,
        });
      });
    });

    /**
     * Tests that the results info is displayed correctly
     * Validates: Requirements 8.1, 8.4
     */
    it('displays results count information', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(1, 12, 36)
      );

      render(<ShowcasePage />);

      await waitFor(() => {
        expect(screen.getByText(/showing 1-12 of 36 websites/i)).toBeInTheDocument();
      });
    });

    /**
     * Tests that the results info updates on page change
     * Validates: Requirements 8.1, 8.4
     */
    it('displays correct results info for page 2', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(1, 12, 36)
      );

      render(<ShowcasePage />);

      await waitFor(() => {
        expect(screen.getByText(/showing 1-12 of 36 websites/i)).toBeInTheDocument();
      });

      // Navigate to page 2
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(2, 12, 36)
      );

      const page2Button = screen.getByRole('button', { name: /page 2/i });
      fireEvent.click(page2Button);

      await waitFor(() => {
        expect(screen.getByText(/showing 13-24 of 36 websites/i)).toBeInTheDocument();
      });
    });
  });

  describe('Pagination Component Integration', () => {
    /**
     * Tests that pagination is rendered when there are multiple pages
     * Validates: Requirements 8.3, 8.4
     */
    it('renders pagination when totalPages > 1', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(1, 12, 36) // 3 pages
      );

      render(<ShowcasePage />);

      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
      });

      // Check page buttons
      expect(screen.getByRole('button', { name: /page 1/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /page 2/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /page 3/i })).toBeInTheDocument();

      // Check navigation buttons
      expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
    });

    /**
     * Tests that pagination is not rendered for single page
     * Validates: Requirements 8.3, 8.4
     */
    it('does not render pagination when totalPages <= 1', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(1, 12, 5) // Only 1 page
      );

      render(<ShowcasePage />);

      await waitFor(() => {
        expect(screen.getByText('Test Website website-1')).toBeInTheDocument();
      });

      // Pagination should not be present
      expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument();
    });

    /**
     * Tests that clicking page number triggers fetchPage
     * Validates: Requirements 8.3, 8.4
     */
    it('calls fetchPage when page number is clicked', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(1, 12, 36)
      );

      render(<ShowcasePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /page 2/i })).toBeInTheDocument();
      });

      // Click page 2
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(2, 12, 36)
      );

      const page2Button = screen.getByRole('button', { name: /page 2/i });
      fireEvent.click(page2Button);

      await waitFor(() => {
        expect(mockGetShowcasedWebsites).toHaveBeenCalledWith({
          page: 2,
          pageSize: 12,
        });
      });

      // Verify scrollTo was called
      expect(mockScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });

    /**
     * Tests that next/previous buttons work correctly
     * Validates: Requirements 8.3, 8.4
     */
    it('navigates with next/previous buttons', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(1, 12, 36)
      );

      render(<ShowcasePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
      });

      // Click next
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(2, 12, 36)
      );

      const nextButton = screen.getByRole('button', { name: /next page/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockGetShowcasedWebsites).toHaveBeenLastCalledWith({
          page: 2,
          pageSize: 12,
        });
      });

      // Click previous
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(1, 12, 36)
      );

      const prevButton = screen.getByRole('button', { name: /previous page/i });
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(mockGetShowcasedWebsites).toHaveBeenLastCalledWith({
          page: 1,
          pageSize: 12,
        });
      });
    });

    /**
     * Tests that current page button is highlighted
     * Validates: Requirements 8.3, 8.4
     */
    it('highlights current page button', async () => {
      // Start on page 1
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(1, 12, 36)
      );

      render(<ShowcasePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /page 1/i })).toBeInTheDocument();
      });

      // Page 1 should be current initially
      const page1Button = screen.getByRole('button', { name: /page 1/i });
      expect(page1Button).toHaveAttribute('aria-current', 'page');

      // Navigate to page 2
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(2, 12, 36)
      );

      const page2Button = screen.getByRole('button', { name: /page 2/i });
      fireEvent.click(page2Button);

      await waitFor(() => {
        const updatedPage2Button = screen.getByRole('button', { name: /page 2/i });
        expect(updatedPage2Button).toHaveAttribute('aria-current', 'page');
      });

      // Page 1 should no longer be current
      const updatedPage1Button = screen.getByRole('button', { name: /page 1/i });
      expect(updatedPage1Button).not.toHaveAttribute('aria-current');
    });
  });

  describe('Icon Rendering', () => {
    /**
     * Tests that icons are rendered with aria-hidden for accessibility
     * Validates: Requirement 8.3
     */
    it('renders GlobeIcon with aria-hidden in header', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(1, 12, 3)
      );

      render(<ShowcasePage />);

      await waitFor(() => {
        expect(screen.getByText('Test Website website-1')).toBeInTheDocument();
      });

      // Find the header with globe icon
      const header = screen.getByRole('banner');
      const svgIcons = header.querySelectorAll('svg[aria-hidden="true"]');

      // Should have at least the ArrowLeftIcon and GlobeIcon
      expect(svgIcons.length).toBeGreaterThanOrEqual(2);
    });

    /**
     * Tests that placeholder icon is shown when website has no thumbnail
     * Validates: Requirement 8.3
     */
    it('renders GlobeIcon placeholder when website has no thumbnail', async () => {
      mockGetShowcasedWebsites.mockResolvedValue({
        items: [createMockShowcasedWebsite('no-thumb', { thumbnailUrl: '' })],
        totalCount: 1,
        page: 1,
        pageSize: 12,
        totalPages: 1,
      });

      render(<ShowcasePage />);

      await waitFor(() => {
        expect(screen.getByText('Test Website no-thumb')).toBeInTheDocument();
      });

      // Find the website card with placeholder
      const link = screen.getByRole('link', { name: /test website no-thumb/i });
      const placeholder = link.querySelector('svg[aria-hidden="true"]');
      expect(placeholder).toBeInTheDocument();
    });

    /**
     * Tests that pagination chevron icons are rendered
     * Validates: Requirement 8.3
     */
    it('renders chevron icons in pagination buttons', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(1, 12, 36)
      );

      render(<ShowcasePage />);

      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
      });

      const prevButton = screen.getByRole('button', { name: /previous page/i });
      const nextButton = screen.getByRole('button', { name: /next page/i });

      expect(prevButton.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
      expect(nextButton.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    /**
     * Tests that loading skeleton is shown while fetching
     * Validates: Requirement 8.3
     */
    it('shows loading skeleton during initial load', async () => {
      // Create a promise we can control to simulate loading state
      let resolvePromise: (value: PaginatedResult<ShowcasedWebsite>) => void;
      const loadingPromise = new Promise<PaginatedResult<ShowcasedWebsite>>((resolve) => {
        resolvePromise = resolve;
      });

      mockGetShowcasedWebsites.mockReturnValue(loadingPromise);

      render(<ShowcasePage />);

      // Should show loading skeletons (animated placeholders)
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);

      // Should not show website content yet
      expect(screen.queryByText(/showing/i)).not.toBeInTheDocument();

      // Resolve the promise
      resolvePromise!(createMockPaginatedResult(1, 12, 3));

      await waitFor(() => {
        expect(screen.getByText('Test Website website-1')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    /**
     * Tests that error message is displayed on fetch failure
     * Validates: Requirement 8.3
     */
    it('displays error message when fetch fails', async () => {
      const errorMessage = 'Failed to load showcased websites';
      mockGetShowcasedWebsites.mockRejectedValue(new Error(errorMessage));

      render(<ShowcasePage />);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // Should show retry button
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    /**
     * Tests that clicking Try Again button retries the fetch
     * Validates: Requirement 8.3
     */
    it('retries fetch when Try Again is clicked', async () => {
      // First call fails
      mockGetShowcasedWebsites.mockRejectedValueOnce(new Error('Network error'));

      render(<ShowcasePage />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      // Set up successful response for retry
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(1, 12, 3)
      );

      // Click Try Again
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Test Website website-1')).toBeInTheDocument();
      });

      // Error should no longer be visible
      expect(screen.queryByText('Network error')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    /**
     * Tests that empty state is displayed when no websites exist
     * Validates: Requirement 8.3
     */
    it('displays empty state when no showcased websites', async () => {
      mockGetShowcasedWebsites.mockResolvedValue({
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 12,
        totalPages: 0,
      });

      render(<ShowcasePage />);

      await waitFor(() => {
        expect(screen.getByText(/no showcased websites yet/i)).toBeInTheDocument();
      });

      // Should show call to action
      expect(screen.getByText(/be the first to share/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /get started/i })).toBeInTheDocument();
    });
  });

  describe('Thumbnail Rendering', () => {
    /**
     * Tests that thumbnails are rendered with correct alt text
     * Validates: Requirement 8.3
     */
    it('renders thumbnails with correct alt text', async () => {
      mockGetShowcasedWebsites.mockResolvedValue({
        items: [createMockShowcasedWebsite('thumb-test', { title: 'My Cool Website' })],
        totalCount: 1,
        page: 1,
        pageSize: 12,
        totalPages: 1,
      });

      render(<ShowcasePage />);

      await waitFor(() => {
        expect(screen.getByText('My Cool Website')).toBeInTheDocument();
      });

      const thumbnail = screen.getByAltText('Preview of My Cool Website');
      expect(thumbnail).toBeInTheDocument();
      expect(thumbnail).toHaveAttribute('src', 'data:image/png;base64,thumbnail-thumb-test');
    });
  });

  describe('Navigation', () => {
    /**
     * Tests that back navigation link points to home
     * Validates: Requirement 8.3
     */
    it('has back to home navigation link', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(1, 12, 3)
      );

      render(<ShowcasePage />);

      await waitFor(() => {
        expect(screen.getByText('Test Website website-1')).toBeInTheDocument();
      });

      const backLink = screen.getByRole('link', { name: /back to home/i });
      expect(backLink).toHaveAttribute('href', '/');
    });

    /**
     * Tests that Create Your Own link points to home
     * Validates: Requirement 8.3
     */
    it('has Create Your Own link', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(1, 12, 3)
      );

      render(<ShowcasePage />);

      await waitFor(() => {
        expect(screen.getByText('Test Website website-1')).toBeInTheDocument();
      });

      const createLink = screen.getByRole('link', { name: /create your own/i });
      expect(createLink).toHaveAttribute('href', '/');
    });
  });
});
