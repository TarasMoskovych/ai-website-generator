/**
 * CommunityShowcase Component Integration Tests
 *
 * Tests that verify the CommunityShowcase component works correctly with:
 * - useShowcaseWebsites hook integration with pageSize of 6
 * - Icons from shared Icons module (GlobeIcon, ArrowRightIcon)
 * - Loading states
 * - Empty states
 * - Website cards link correctly
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 13.1
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ShowcasedWebsite } from '@/types/website';
import type { PaginatedResult } from '@/services/websiteRepository';

// We need to test CommunityShowcase in isolation, so we'll render the full page
// and verify the CommunityShowcase section works correctly

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Mock next/image to render as a regular img
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock the auth context
vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    isLoading: false,
    error: null,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    clearError: vi.fn(),
    getIdToken: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/auth/ProtectedRoute', () => ({
  getAndClearRedirectUrl: () => null,
  storeRedirectUrl: vi.fn(),
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/auth')>();
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      loading: false,
      isLoading: false,
      error: null,
      signInWithGoogle: vi.fn(),
      clearError: vi.fn(),
    }),
    getAndClearRedirectUrl: () => null,
    // GoogleSignInButton is imported from actual module
  };
});

// Mock the websiteRepository
const mockGetShowcasedWebsites = vi.fn();

vi.mock('@/services/websiteRepository', () => ({
  default: {
    getShowcasedWebsites: (...args: unknown[]) => mockGetShowcasedWebsites(...args),
  },
}));

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
  count: number,
  pageSize: number = 6
): PaginatedResult<ShowcasedWebsite> {
  const items: ShowcasedWebsite[] = [];

  for (let i = 0; i < count; i++) {
    items.push(createMockShowcasedWebsite(`website-${i + 1}`));
  }

  return {
    items,
    totalCount: count,
    page: 1,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
  };
}

// Import the page component after mocks are set up
import LoginPage from './page';

describe('CommunityShowcase Component Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useShowcaseWebsites Hook Integration', () => {
    /**
     * Tests that the hook is called with correct pageSize of 6
     * Validates: Requirement 9.1
     */
    it('fetches showcased websites with pageSize of 6', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(6)
      );

      render(<LoginPage />);

      await waitFor(() => {
        expect(mockGetShowcasedWebsites).toHaveBeenCalledWith({
          page: 1,
          pageSize: 6,
        });
      });
    });

    /**
     * Tests that up to 6 websites are displayed
     * Validates: Requirements 9.1, 9.3
     */
    it('displays up to 6 showcased websites', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(6)
      );

      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Website website-1')).toBeInTheDocument();
      });

      // Verify all 6 websites are rendered
      expect(screen.getByText('Test Website website-1')).toBeInTheDocument();
      expect(screen.getByText('Test Website website-2')).toBeInTheDocument();
      expect(screen.getByText('Test Website website-3')).toBeInTheDocument();
      expect(screen.getByText('Test Website website-4')).toBeInTheDocument();
      expect(screen.getByText('Test Website website-5')).toBeInTheDocument();
      expect(screen.getByText('Test Website website-6')).toBeInTheDocument();

      // Verify creator names
      expect(screen.getByText('by Creator website-1')).toBeInTheDocument();
    });

    /**
     * Tests that less than 6 websites are displayed when fewer exist
     * Validates: Requirement 9.3
     */
    it('displays all available websites when less than 6 exist', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(3)
      );

      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Website website-1')).toBeInTheDocument();
      });

      // Verify only 3 websites are rendered
      expect(screen.getByText('Test Website website-1')).toBeInTheDocument();
      expect(screen.getByText('Test Website website-2')).toBeInTheDocument();
      expect(screen.getByText('Test Website website-3')).toBeInTheDocument();
      expect(screen.queryByText('Test Website website-4')).not.toBeInTheDocument();
    });
  });

  describe('Icons Module Integration', () => {
    /**
     * Tests that GlobeIcon from Icons module is rendered in the section header
     * Validates: Requirement 9.2
     */
    it('renders GlobeIcon in section header', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(3)
      );

      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Website website-1')).toBeInTheDocument();
      });

      // Find the Community Showcase section header
      const heading = screen.getByRole('heading', { name: /community showcase/i });
      const section = heading.closest('section');
      expect(section).toBeInTheDocument();

      // GlobeIcon should be in the header area
      const svgIcons = section!.querySelectorAll('svg[aria-hidden="true"]');
      expect(svgIcons.length).toBeGreaterThan(0);
    });

    /**
     * Tests that ArrowRightIcon from Icons module is rendered in View All link
     * Validates: Requirement 9.2
     */
    it('renders ArrowRightIcon in View All link', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(3)
      );

      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Website website-1')).toBeInTheDocument();
      });

      // Find the View All link
      const viewAllLink = screen.getByRole('link', { name: /view all/i });
      expect(viewAllLink).toBeInTheDocument();

      // Should have an SVG icon with aria-hidden
      const svgIcon = viewAllLink.querySelector('svg[aria-hidden="true"]');
      expect(svgIcon).toBeInTheDocument();
    });

    /**
     * Tests that icons have proper accessibility attributes
     * Validates: Requirement 9.2
     */
    it('renders icons with aria-hidden for accessibility', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(3)
      );

      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Website website-1')).toBeInTheDocument();
      });

      // Find Community Showcase section
      const heading = screen.getByRole('heading', { name: /community showcase/i });
      const section = heading.closest('section');

      // All SVG icons in the section should have aria-hidden
      const svgs = section!.querySelectorAll('svg');
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Loading States', () => {
    /**
     * Tests that loading skeleton is shown while fetching
     * Validates: Requirement 9.3
     */
    it('shows loading skeleton during initial load', async () => {
      // Create a promise we can control to simulate loading state
      let resolvePromise: (value: PaginatedResult<ShowcasedWebsite>) => void;
      const loadingPromise = new Promise<PaginatedResult<ShowcasedWebsite>>((resolve) => {
        resolvePromise = resolve;
      });

      mockGetShowcasedWebsites.mockReturnValue(loadingPromise);

      render(<LoginPage />);

      // Should show loading skeletons (animated placeholders)
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);

      // Resolve the promise
      resolvePromise!(createMockPaginatedResult(3));

      await waitFor(() => {
        expect(screen.getByText('Test Website website-1')).toBeInTheDocument();
      });
    });

    /**
     * Tests that 6 loading skeleton placeholders are shown
     * Validates: Requirement 9.3
     */
    it('shows 6 loading skeleton placeholders', async () => {
      let resolvePromise: (value: PaginatedResult<ShowcasedWebsite>) => void;
      const loadingPromise = new Promise<PaginatedResult<ShowcasedWebsite>>((resolve) => {
        resolvePromise = resolve;
      });

      mockGetShowcasedWebsites.mockReturnValue(loadingPromise);

      render(<LoginPage />);

      // Find the Community Showcase section during loading
      const heading = screen.getByRole('heading', { name: /community showcase/i });
      const section = heading.closest('section');

      // Should have 6 skeleton items
      const skeletonItems = section!.querySelectorAll('.animate-pulse');
      expect(skeletonItems.length).toBe(6);

      // Resolve the promise to clean up
      resolvePromise!(createMockPaginatedResult(3));
    });
  });

  describe('Empty State', () => {
    /**
     * Tests that empty state is displayed when no websites exist
     * Validates: Requirement 9.3
     */
    it('displays empty state when no showcased websites', async () => {
      mockGetShowcasedWebsites.mockResolvedValue({
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 6,
        totalPages: 0,
      });

      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByText(/be the first to share/i)).toBeInTheDocument();
      });

      // Should show call to action message
      expect(screen.getByText(/share your creation/i)).toBeInTheDocument();
    });

    /**
     * Tests that GlobeIcon placeholder is shown in empty state
     * Validates: Requirements 9.2, 9.3
     */
    it('displays GlobeIcon in empty state message', async () => {
      mockGetShowcasedWebsites.mockResolvedValue({
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 6,
        totalPages: 0,
      });

      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByText(/be the first to share/i)).toBeInTheDocument();
      });

      // Find the Community Showcase section
      const heading = screen.getByRole('heading', { name: /community showcase/i });
      const section = heading.closest('section');

      // Should have GlobeIcon with aria-hidden
      const svgIcons = section!.querySelectorAll('svg[aria-hidden="true"]');
      expect(svgIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Website Cards', () => {
    /**
     * Tests that website cards link to the correct public view page
     * Validates: Requirement 9.3
     */
    it('website cards link to public view page', async () => {
      mockGetShowcasedWebsites.mockResolvedValue({
        items: [createMockShowcasedWebsite('test-id-123')],
        totalCount: 1,
        page: 1,
        pageSize: 6,
        totalPages: 1,
      });

      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Website test-id-123')).toBeInTheDocument();
      });

      const link = screen.getByRole('link', { name: /test website test-id-123/i });
      expect(link).toHaveAttribute('href', '/view/test-id-123');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    /**
     * Tests that thumbnails are rendered with correct alt text
     * Validates: Requirement 9.3
     */
    it('renders thumbnails with correct alt text', async () => {
      mockGetShowcasedWebsites.mockResolvedValue({
        items: [createMockShowcasedWebsite('thumb-test', { title: 'My Cool Website' })],
        totalCount: 1,
        page: 1,
        pageSize: 6,
        totalPages: 1,
      });

      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByText('My Cool Website')).toBeInTheDocument();
      });

      const thumbnail = screen.getByAltText('Preview of My Cool Website');
      expect(thumbnail).toBeInTheDocument();
      expect(thumbnail).toHaveAttribute('src', 'data:image/png;base64,thumbnail-thumb-test');
    });

    /**
     * Tests that placeholder icon is shown when website has no thumbnail
     * Validates: Requirement 9.3
     */
    it('renders GlobeIcon placeholder when website has no thumbnail', async () => {
      mockGetShowcasedWebsites.mockResolvedValue({
        items: [createMockShowcasedWebsite('no-thumb', { thumbnailUrl: '' })],
        totalCount: 1,
        page: 1,
        pageSize: 6,
        totalPages: 1,
      });

      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Website no-thumb')).toBeInTheDocument();
      });

      // Find the website card with placeholder
      const link = screen.getByRole('link', { name: /test website no-thumb/i });
      const placeholder = link.querySelector('svg[aria-hidden="true"]');
      expect(placeholder).toBeInTheDocument();
    });

    /**
     * Tests that creator name is displayed
     * Validates: Requirement 9.3
     */
    it('displays creator name for each website', async () => {
      mockGetShowcasedWebsites.mockResolvedValue({
        items: [createMockShowcasedWebsite('creator-test', { creatorName: 'John Doe' })],
        totalCount: 1,
        page: 1,
        pageSize: 6,
        totalPages: 1,
      });

      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByText(/by john doe/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    /**
     * Tests that View All link points to showcase page
     * Validates: Requirement 9.3
     */
    it('has View All link to showcase page', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(3)
      );

      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Website website-1')).toBeInTheDocument();
      });

      const viewAllLink = screen.getByRole('link', { name: /view all/i });
      expect(viewAllLink).toHaveAttribute('href', '/showcase');
    });
  });

  describe('Section Header', () => {
    /**
     * Tests that section header displays correctly
     * Validates: Requirement 9.3
     */
    it('displays Community Showcase section heading', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(3)
      );

      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Website website-1')).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { name: /community showcase/i })).toBeInTheDocument();
    });

    /**
     * Tests that section has proper semantic structure
     * Validates: Requirement 9.3
     */
    it('wraps content in section element', async () => {
      mockGetShowcasedWebsites.mockResolvedValue(
        createMockPaginatedResult(3)
      );

      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Website website-1')).toBeInTheDocument();
      });

      const heading = screen.getByRole('heading', { name: /community showcase/i });
      expect(heading.closest('section')).toBeInTheDocument();
    });
  });
});
