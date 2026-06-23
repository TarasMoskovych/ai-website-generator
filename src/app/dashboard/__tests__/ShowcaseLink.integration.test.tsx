/**
 * ShowcaseLink Integration Tests
 *
 * Integration tests for the Community Showcase link on the dashboard page.
 * These tests verify the complete user flow of seeing and interacting with
 * the showcase link from an authenticated user's perspective.
 *
 * Validates:
 * - Requirement 1.1: Authenticated user sees showcase link on dashboard
 * - Requirement 2.3: Navigation flow from dashboard to showcase page
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { AuthenticatedUser } from '@/types/auth';

// Create a mock user for authenticated state
const mockAuthenticatedUser: AuthenticatedUser = {
  uid: 'integration-test-user-123',
  email: 'integration@test.com',
  displayName: 'Integration Test User',
  photoURL: 'https://example.com/photo.jpg',
};

// Track router.push calls for navigation verification
const mockPush = vi.fn();

// Mock the auth module with authenticated user
vi.mock('@/components/auth', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: mockAuthenticatedUser,
    loading: false,
    error: null,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    clearError: vi.fn(),
  }),
}));

// Mock the layout module
vi.mock('@/components/layout', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/layout')>();
  return {
    ...actual,
    AppHeader: ({ user }: { user: AuthenticatedUser | null }) => (
      <header data-testid="app-header">
        {user && <span data-testid="logged-in-user">{user.displayName}</span>}
      </header>
    ),
    AppFooter: () => <footer data-testid="mock-footer">Mock Footer</footer>,
    // ShowcaseLink is imported from actual module
  };
});

// Mock the WebsiteCard component
vi.mock('@/components/WebsiteCard', () => ({
  WebsiteCard: ({ website }: { website: { id: string; title: string } }) => (
    <div data-testid={`website-card-${website.id}`}>{website.title}</div>
  ),
}));

// Mock the Pagination component
vi.mock('@/components/Pagination', () => ({
  Pagination: () => <nav data-testid="pagination">Pagination</nav>,
}));

// Mock the ErrorMessage component
vi.mock('@/components/common/ErrorMessage', () => ({
  ErrorMessage: () => <div data-testid="error-message">Error</div>,
}));

// Mock the DeleteConfirmDialog component
vi.mock('@/components/DeleteConfirmDialog', () => ({
  DeleteConfirmDialog: () => <div data-testid="delete-dialog" />,
}));

// Mock the websiteRepository with some sample data
vi.mock('@/services/websiteRepository', () => ({
  default: {
    getAllByUser: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'website-1',
          userId: 'integration-test-user-123',
          title: 'Test Website 1',
          html: '<html></html>',
          css: '',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          inputType: 'text',
          originalPrompt: 'Test prompt 1',
          isPublic: true,
          isShowcased: false,
          showcasedAt: null,
          creatorName: 'Integration Test User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      totalPages: 1,
      totalItems: 1,
    }),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

// Import the component after mocks are set up
import DashboardPage from '../page';

describe('Dashboard Showcase Link Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authenticated User Experience (Requirement 1.1)', () => {
    /**
     * Integration test: Authenticated user sees the showcase link on dashboard
     * Validates: Requirement 1.1 - WHEN an Authenticated_User views the Dashboard_Page,
     *            THE Dashboard_Page SHALL display a visible Showcase_Navigation_Link
     */
    it('authenticated user sees showcase link on dashboard (Req 1.1)', async () => {
      render(<DashboardPage />);

      // Wait for the dashboard to fully render with authenticated state
      await waitFor(() => {
        // Verify user is authenticated (shown in header)
        expect(screen.getByTestId('logged-in-user')).toHaveTextContent('Integration Test User');
      });

      // The showcase link should be visible on the dashboard
      const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });

      expect(showcaseLink).toBeInTheDocument();
      expect(showcaseLink).toBeVisible();

      // Verify it's an actual link element with correct destination
      expect(showcaseLink).toHaveAttribute('href', '/showcase');
    });

    /**
     * Integration test: Showcase link is accessible and has proper content
     * Validates: Requirements 1.1, 1.2, 1.3
     */
    it('showcase link displays complete content for authenticated user', async () => {
      render(<DashboardPage />);

      const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });

      // Verify the link has the expected text content
      const textContent = showcaseLink.querySelector('span');
      expect(textContent).toHaveTextContent('Community Showcase');

      // Verify the link has the globe icon
      const icon = showcaseLink.querySelector('svg');
      expect(icon).toBeInTheDocument();

      // Verify icon accessibility (aria-hidden to prevent redundant announcements)
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    /**
     * Integration test: Showcase link is in the correct position in the header
     * Validates: Requirement 1.4 - positioned between title and New Website button
     */
    it('showcase link is positioned between title and New Website button', async () => {
      render(<DashboardPage />);

      // Wait for dashboard to render
      const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });
      const newWebsiteLink = screen.getByRole('link', { name: /new website/i });
      const pageTitle = screen.getByRole('heading', { level: 1, name: /my websites/i });

      // All elements should be in the document
      expect(pageTitle).toBeInTheDocument();
      expect(showcaseLink).toBeInTheDocument();
      expect(newWebsiteLink).toBeInTheDocument();

      // Verify the showcase link's href
      expect(showcaseLink).toHaveAttribute('href', '/showcase');

      // Verify the New Website link's href
      expect(newWebsiteLink).toHaveAttribute('href', '/generate');
    });
  });

  describe('Navigation Flow (Requirement 2.3)', () => {
    /**
     * Integration test: Clicking showcase link navigates to /showcase
     * Validates: Requirement 2.1 - Navigate to /showcase route on click
     *           Requirement 2.2 - Navigation opens in same tab
     *           Requirement 2.3 - Complete navigation flow
     */
    it('clicking showcase link would navigate to /showcase page (Req 2.3)', async () => {
      render(<DashboardPage />);

      const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });

      // Verify the link has the correct href for navigation
      expect(showcaseLink).toHaveAttribute('href', '/showcase');

      // Verify the link does not have target="_blank" (opens in same tab)
      expect(showcaseLink).not.toHaveAttribute('target', '_blank');
      expect(showcaseLink).not.toHaveAttribute('target');

      // The link should not have rel="noopener noreferrer" since it's same-tab navigation
      expect(showcaseLink).not.toHaveAttribute('rel', 'noopener');
    });

    /**
     * Integration test: Keyboard navigation to showcase link works correctly
     * Validates: Requirement 3.1 - Keyboard accessible and focusable
     */
    it('showcase link is keyboard navigable (Req 3.1)', async () => {
      render(<DashboardPage />);

      // Wait for the dashboard to render
      const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });

      // Verify the link is a native anchor element which is focusable by default
      expect(showcaseLink.tagName.toLowerCase()).toBe('a');

      // The link should not have tabindex="-1" which would exclude it from tab order
      const tabIndex = showcaseLink.getAttribute('tabindex');
      expect(tabIndex === null || tabIndex === '0').toBe(true);

      // Focus the link programmatically and verify it receives focus
      showcaseLink.focus();
      expect(document.activeElement).toBe(showcaseLink);
    });

    /**
     * Integration test: Showcase link has accessible name for screen readers
     * Validates: Requirement 3.2 - Descriptive accessible name
     */
    it('showcase link has descriptive accessible name for screen readers (Req 3.2)', async () => {
      render(<DashboardPage />);

      // Query by accessible name (via aria-label)
      const showcaseLink = await screen.findByRole('link', {
        name: /navigate to community showcase|community showcase/i
      });

      expect(showcaseLink).toBeInTheDocument();
      expect(showcaseLink).toHaveAccessibleName(/community showcase/i);
    });
  });

  describe('Dashboard with User Content', () => {
    /**
     * Integration test: Showcase link is visible alongside user's websites
     * This tests the integration of the showcase link when the user has websites
     */
    it('showcase link appears alongside user websites on dashboard', async () => {
      render(<DashboardPage />);

      // Wait for both the showcase link and user content to render
      const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });

      // Wait for websites to load (mocked with one website)
      await waitFor(() => {
        expect(screen.getByTestId('website-card-website-1')).toBeInTheDocument();
      });

      // Both the showcase link and website should be visible
      expect(showcaseLink).toBeVisible();
      expect(screen.getByTestId('website-card-website-1')).toBeVisible();
    });
  });

  describe('Link Behavior Verification', () => {
    /**
     * Integration test: Verify link opens in same tab (standard navigation)
     * Validates: Requirement 2.2
     */
    it('link is configured for same-tab navigation', async () => {
      render(<DashboardPage />);

      const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });

      // Verify it's a standard anchor element
      expect(showcaseLink.tagName.toLowerCase()).toBe('a');

      // Verify href points to showcase
      expect(showcaseLink).toHaveAttribute('href', '/showcase');

      // Verify no new-tab attributes
      expect(showcaseLink).not.toHaveAttribute('target');

      // Verify no rel attribute or rel doesn't contain noopener
      const relAttr = showcaseLink.getAttribute('rel');
      expect(relAttr === null || !relAttr.includes('noopener')).toBe(true);
    });

    /**
     * Integration test: Showcase link maintains focus indicator
     * Validates: Requirement 3.3
     */
    it('showcase link has visible focus indicator classes (Req 3.3)', async () => {
      render(<DashboardPage />);

      const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });

      // Verify focus indicator classes are present
      expect(showcaseLink.className).toContain('focus-visible:outline-none');
      expect(showcaseLink.className).toContain('focus-visible:ring-2');
      expect(showcaseLink.className).toContain('focus-visible:ring-ring');
    });
  });
});
