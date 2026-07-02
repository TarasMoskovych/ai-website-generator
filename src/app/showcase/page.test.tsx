/**
 * Showcase Page Server Component Tests
 *
 * Tests for the Showcase page after SSR migration:
 * - Metadata export contains correct title and description
 * - Server component renders the website grid with data
 * - Error state renders error message and retry link
 * - Empty state renders appropriate message
 *
 * Validates: Requirements 1.1, 1.2, 1.4, 1.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PaginatedShowcaseResult } from '@/lib/serverData';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock next/link to render as a regular anchor
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock next/image to render as a regular img
vi.mock('next/image', () => ({
  default: ({ src, alt, fill, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src as string} alt={alt} {...props} />
  ),
}));

// Mock the serverData module
const mockGetShowcasedWebsitesServer = vi.fn();

vi.mock('@/lib/serverData', () => ({
  getShowcasedWebsitesServer: (...args: unknown[]) => mockGetShowcasedWebsitesServer(...args),
}));

// Mock ShowcasePagination client component to avoid hook/client issues in test
vi.mock('./ShowcasePagination', () => ({
  ShowcasePagination: ({
    initialPage,
    initialTotalPages,
    initialTotalCount,
    pageSize,
  }: {
    initialPage: number;
    initialTotalPages: number;
    initialTotalCount: number;
    pageSize: number;
  }) => (
    <div data-testid="showcase-pagination" data-page={initialPage} data-total-pages={initialTotalPages} data-total-count={initialTotalCount} data-page-size={pageSize}>
      Pagination
    </div>
  ),
}));

// Mock AppFooter to simplify output
vi.mock('@/components/layout', () => ({
  AppFooter: () => <footer data-testid="app-footer">Footer</footer>,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockPaginatedResult(
  itemCount: number,
  totalCount?: number
): PaginatedShowcaseResult {
  const total = totalCount ?? itemCount;
  const items = Array.from({ length: itemCount }, (_, i) => ({
    id: `website-${i + 1}`,
    title: `Test Website ${i + 1}`,
    thumbnailUrl: `https://example.com/thumb-${i + 1}.png`,
    creatorName: `Creator ${i + 1}`,
    showcasedAt: new Date(2024, 0, 15 - i).toISOString(),
  }));

  return {
    items,
    totalCount: total,
    page: 1,
    pageSize: 12,
    totalPages: Math.ceil(total / 12),
  };
}

// ─── Import page after mocks ────────────────────────────────────────────────

import ShowcasePage, { metadata } from './page';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Showcase Page Server Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Metadata Export', () => {
    /**
     * Validates: Requirement 1.4
     * Metadata should contain title and description for SEO.
     */
    it('exports metadata with correct title', () => {
      expect(metadata).toBeDefined();
      expect(metadata.title).toBe('Community Showcase | AI Website Generator');
    });

    it('exports metadata with correct description', () => {
      expect(metadata).toBeDefined();
      expect(metadata.description).toBe(
        'Discover amazing websites created by our community using AI. Get inspired and create your own AI-generated website.'
      );
    });
  });

  describe('Successful Render with Data', () => {
    /**
     * Validates: Requirements 1.1, 1.2
     * Server component should render the website grid with fetched data.
     */
    it('renders the website grid with mock data', async () => {
      mockGetShowcasedWebsitesServer.mockResolvedValue(
        createMockPaginatedResult(3)
      );

      const element = await ShowcasePage();
      render(element);

      // Verify all website titles are rendered
      expect(screen.getByText('Test Website 1')).toBeInTheDocument();
      expect(screen.getByText('Test Website 2')).toBeInTheDocument();
      expect(screen.getByText('Test Website 3')).toBeInTheDocument();
    });

    it('renders creator names for each website', async () => {
      mockGetShowcasedWebsitesServer.mockResolvedValue(
        createMockPaginatedResult(2)
      );

      const element = await ShowcasePage();
      render(element);

      expect(screen.getByText('by Creator 1')).toBeInTheDocument();
      expect(screen.getByText('by Creator 2')).toBeInTheDocument();
    });

    it('calls getShowcasedWebsitesServer with page 1 and pageSize 12', async () => {
      mockGetShowcasedWebsitesServer.mockResolvedValue(
        createMockPaginatedResult(5)
      );

      const element = await ShowcasePage();
      render(element);

      expect(mockGetShowcasedWebsitesServer).toHaveBeenCalledWith(1, 12);
    });

    it('renders ShowcasePagination with correct props when data exists', async () => {
      mockGetShowcasedWebsitesServer.mockResolvedValue(
        createMockPaginatedResult(12, 36)
      );

      const element = await ShowcasePage();
      render(element);

      const pagination = screen.getByTestId('showcase-pagination');
      expect(pagination).toBeInTheDocument();
      expect(pagination).toHaveAttribute('data-page', '1');
      expect(pagination).toHaveAttribute('data-total-pages', '3');
      expect(pagination).toHaveAttribute('data-total-count', '36');
      expect(pagination).toHaveAttribute('data-page-size', '12');
    });

    it('renders page header with Community Showcase title', async () => {
      mockGetShowcasedWebsitesServer.mockResolvedValue(
        createMockPaginatedResult(1)
      );

      const element = await ShowcasePage();
      render(element);

      expect(
        screen.getByRole('heading', { name: /community showcase/i })
      ).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    /**
     * Validates: Requirement 1.5
     * Error state should render error message and a retry link.
     */
    it('renders error message when fetch throws an Error', async () => {
      mockGetShowcasedWebsitesServer.mockRejectedValue(
        new Error('Database connection failed')
      );

      const element = await ShowcasePage();
      render(element);

      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    });

    it('renders a retry link pointing to /showcase', async () => {
      mockGetShowcasedWebsitesServer.mockRejectedValue(
        new Error('Something went wrong')
      );

      const element = await ShowcasePage();
      render(element);

      const retryLink = screen.getByRole('link', { name: /try again/i });
      expect(retryLink).toBeInTheDocument();
      expect(retryLink).toHaveAttribute('href', '/showcase');
    });

    it('renders a fallback error message for non-Error exceptions', async () => {
      mockGetShowcasedWebsitesServer.mockRejectedValue('unknown error');

      const element = await ShowcasePage();
      render(element);

      expect(
        screen.getByText('Failed to load showcased websites. Please try again.')
      ).toBeInTheDocument();
    });

    it('does not render the website grid when there is an error', async () => {
      mockGetShowcasedWebsitesServer.mockRejectedValue(
        new Error('Fetch failed')
      );

      const element = await ShowcasePage();
      render(element);

      expect(screen.queryByTestId('showcase-pagination')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    /**
     * Validates: Requirements 1.1, 1.2
     * Empty state should render an appropriate message when no websites exist.
     */
    it('renders empty state when no showcased websites are returned', async () => {
      mockGetShowcasedWebsitesServer.mockResolvedValue({
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 12,
        totalPages: 0,
      });

      const element = await ShowcasePage();
      render(element);

      expect(
        screen.getByText(/no showcased websites yet/i)
      ).toBeInTheDocument();
    });

    it('renders a call-to-action message in empty state', async () => {
      mockGetShowcasedWebsitesServer.mockResolvedValue({
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 12,
        totalPages: 0,
      });

      const element = await ShowcasePage();
      render(element);

      expect(
        screen.getByText(/be the first to share your creation/i)
      ).toBeInTheDocument();
    });

    it('renders a Get Started link in empty state', async () => {
      mockGetShowcasedWebsitesServer.mockResolvedValue({
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 12,
        totalPages: 0,
      });

      const element = await ShowcasePage();
      render(element);

      const getStartedLink = screen.getByRole('link', { name: /get started/i });
      expect(getStartedLink).toBeInTheDocument();
      expect(getStartedLink).toHaveAttribute('href', '/');
    });

    it('does not render pagination in empty state', async () => {
      mockGetShowcasedWebsitesServer.mockResolvedValue({
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 12,
        totalPages: 0,
      });

      const element = await ShowcasePage();
      render(element);

      expect(screen.queryByTestId('showcase-pagination')).not.toBeInTheDocument();
    });
  });
});
