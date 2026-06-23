/**
 * ShowcaseLink Component Tests
 *
 * Unit tests for the ShowcaseLink component in the dashboard page.
 * Tests cover rendering, text content, icon presence, and styling.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the auth module
vi.mock('@/components/auth', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ user: { uid: 'test-user-id', displayName: 'Test User' } }),
}));

// Mock the layout module
vi.mock('@/components/layout', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/layout')>();
  return {
    ...actual,
    AppHeader: () => <header data-testid="app-header">App Header</header>,
    AppFooter: () => <footer data-testid="mock-footer">Mock Footer</footer>,
    // ShowcaseLink is imported from actual module
  };
});

// Mock the WebsiteCard component
vi.mock('@/components/WebsiteCard', () => ({
  WebsiteCard: () => <div data-testid="website-card">Website Card</div>,
}));

// Mock the Pagination component
vi.mock('@/components/Pagination', () => ({
  Pagination: () => <div data-testid="pagination">Pagination</div>,
}));

// Mock the ErrorMessage component
vi.mock('@/components/common/ErrorMessage', () => ({
  ErrorMessage: () => <div data-testid="error-message">Error</div>,
}));

// Mock the DeleteConfirmDialog component
vi.mock('@/components/DeleteConfirmDialog', () => ({
  DeleteConfirmDialog: () => <div data-testid="delete-dialog">Delete Dialog</div>,
}));

// Mock the websiteRepository
vi.mock('@/services/websiteRepository', () => ({
  default: {
    getAllByUser: vi.fn().mockResolvedValue({
      items: [],
      totalPages: 1,
    }),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Import the component after mocks are set up
import DashboardPage from '../page';

describe('ShowcaseLink Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    /**
     * Tests that the ShowcaseLink is visible in the dashboard header area
     * Validates: Requirement 1.1
     */
    it('renders a visible link in the dashboard header area (Req 1.1)', async () => {
      render(<DashboardPage />);

      // Wait for the component to render and find the showcase link
      const link = await screen.findByRole('link', { name: /community showcase/i });
      expect(link).toBeInTheDocument();
      expect(link).toBeVisible();
    });

    /**
     * Tests that the link text clearly identifies the destination as Community Showcase
     * Validates: Requirement 1.2
     */
    it('displays text that identifies destination as Community Showcase (Req 1.2)', async () => {
      render(<DashboardPage />);

      // Find the link with text containing "Community Showcase"
      const link = await screen.findByRole('link', { name: /community showcase/i });
      expect(link).toBeInTheDocument();

      // Check that the text "Community Showcase" is present (visible on sm screens and above)
      const textSpan = link.querySelector('span');
      expect(textSpan).toHaveTextContent('Community Showcase');
    });

    /**
     * Tests that a globe icon is present in the ShowcaseLink
     * Validates: Requirement 1.3
     */
    it('includes a globe icon for visual recognition (Req 1.3)', async () => {
      render(<DashboardPage />);

      const link = await screen.findByRole('link', { name: /community showcase/i });

      // The globe icon should be an SVG inside the link
      const icon = link.querySelector('svg');
      expect(icon).toBeInTheDocument();

      // Verify the icon has proper aria-hidden attribute
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    /**
     * Tests that the link uses secondary/link styling consistent with design system
     * Validates: Requirement 1.5
     */
    it('uses secondary/link styling consistent with design system (Req 1.5)', async () => {
      render(<DashboardPage />);

      const link = await screen.findByRole('link', { name: /community showcase/i });

      // Check for the text-muted-foreground class which indicates secondary styling
      expect(link).toHaveClass('text-muted-foreground');

      // Check for hover classes indicating secondary/link behavior
      expect(link.className).toContain('hover:bg-accent');
      expect(link.className).toContain('hover:text-accent-foreground');
    });
  });

  describe('Link Attributes', () => {
    /**
     * Tests that the link points to the correct /showcase route
     * Validates: Requirement 2.1
     */
    it('has correct href pointing to /showcase', async () => {
      render(<DashboardPage />);

      const link = await screen.findByRole('link', { name: /community showcase/i });
      expect(link).toHaveAttribute('href', '/showcase');
    });

    /**
     * Tests that the link opens in the same tab (no target="_blank")
     * Validates: Requirement 2.2
     */
    it('opens in same tab without target="_blank"', async () => {
      render(<DashboardPage />);

      const link = await screen.findByRole('link', { name: /community showcase/i });
      expect(link).not.toHaveAttribute('target', '_blank');
    });
  });

  describe('Icon Properties', () => {
    /**
     * Tests that the globe icon is an SVG element
     */
    it('renders globe icon as SVG', async () => {
      render(<DashboardPage />);

      const link = await screen.findByRole('link', { name: /community showcase/i });
      const icon = link.querySelector('svg');

      expect(icon).toBeInTheDocument();
      expect(icon?.tagName.toLowerCase()).toBe('svg');
    });

    /**
     * Tests that the icon has aria-hidden to prevent redundant screen reader announcements
     * Validates: Requirement 3.4
     */
    it('has aria-hidden on icon to prevent redundant announcements (Req 3.4)', async () => {
      render(<DashboardPage />);

      const link = await screen.findByRole('link', { name: /community showcase/i });
      const icon = link.querySelector('svg');

      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    /**
     * Tests that the icon has appropriate sizing classes
     */
    it('has correct icon sizing', async () => {
      render(<DashboardPage />);

      const link = await screen.findByRole('link', { name: /community showcase/i });
      const icon = link.querySelector('svg');

      expect(icon).toHaveClass('h-4');
      expect(icon).toHaveClass('w-4');
    });
  });

  describe('Styling Classes', () => {
    /**
     * Tests that the link has inline-flex display for icon+text layout
     */
    it('has inline-flex display for proper layout', async () => {
      render(<DashboardPage />);

      const link = await screen.findByRole('link', { name: /community showcase/i });
      expect(link).toHaveClass('inline-flex');
      expect(link).toHaveClass('items-center');
    });

    /**
     * Tests that the link has proper gap between icon and text
     */
    it('has gap between icon and text', async () => {
      render(<DashboardPage />);

      const link = await screen.findByRole('link', { name: /community showcase/i });
      expect(link).toHaveClass('gap-2');
    });

    /**
     * Tests that the link has rounded styling
     */
    it('has rounded-md styling', async () => {
      render(<DashboardPage />);

      const link = await screen.findByRole('link', { name: /community showcase/i });
      expect(link).toHaveClass('rounded-md');
    });

    /**
     * Tests that the link has appropriate padding
     */
    it('has appropriate padding', async () => {
      render(<DashboardPage />);

      const link = await screen.findByRole('link', { name: /community showcase/i });
      expect(link).toHaveClass('px-3');
      expect(link).toHaveClass('py-2');
    });

    /**
     * Tests that the link has transition for smooth interactions
     */
    it('has transition-colors for smooth hover effect', async () => {
      render(<DashboardPage />);

      const link = await screen.findByRole('link', { name: /community showcase/i });
      expect(link).toHaveClass('transition-colors');
    });
  });
});
