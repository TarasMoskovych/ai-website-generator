/**
 * ShowcaseLink Component Tests
 *
 * Unit tests for the ShowcaseLink component including:
 * - Component rendering (Requirements 1.1, 1.2, 1.3, 1.5)
 * - Navigation behavior (Requirements 2.1, 2.2)
 * - Accessibility (Requirements 3.1, 3.2, 3.3, 3.4)
 * - Responsive behavior (Requirements 4.1, 4.2, 4.3, 4.4)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the auth context
vi.mock('@/components/auth', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: null,
    },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

// Mock the website repository
vi.mock('@/services/websiteRepository', () => ({
  default: {
    getAllByUser: vi.fn().mockResolvedValue({
      items: [],
      totalPages: 1,
      totalItems: 0,
    }),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock the layout components that use ThemeProvider
vi.mock('@/components/layout', () => ({
  AppHeader: ({ user }: { user: unknown }) => (
    <header data-testid="mock-header">
      <span>Mock Header</span>
      {user && <span data-testid="user-info">User logged in</span>}
    </header>
  ),
  ThemeToggle: () => <button data-testid="mock-theme-toggle">Theme</button>,
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Import DashboardPage after mocks are set up
import DashboardPage from './page';

describe('ShowcaseLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Navigation Behavior Tests
   * Validates: Requirements 2.1, 2.2
   */
  describe('Navigation Behavior (Requirements 2.1, 2.2)', () => {
    /**
     * Test that link has correct href attribute
     * Validates: Requirement 2.1 - Navigate to /showcase route
     */
    it('has href="/showcase" for navigation to showcase route (Req 2.1)', async () => {
      render(<DashboardPage />);

      const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });

      expect(showcaseLink).toHaveAttribute('href', '/showcase');
    });

    /**
     * Test that link opens in same tab (no target="_blank")
     * Validates: Requirement 2.2 - Open in same browser tab
     */
    it('does not have target="_blank" to open in same tab (Req 2.2)', async () => {
      render(<DashboardPage />);

      const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });

      expect(showcaseLink).not.toHaveAttribute('target', '_blank');
    });

    /**
     * Test that link does not have target attribute at all
     * Validates: Requirement 2.2 - Standard navigation behavior within the application
     */
    it('has no target attribute for standard same-tab navigation (Req 2.2)', async () => {
      render(<DashboardPage />);

      const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });

      expect(showcaseLink).not.toHaveAttribute('target');
    });

    /**
     * Test that link does not have rel="noopener" (not opening in new tab)
     * Validates: Requirement 2.2 - Same tab navigation
     */
    it('does not have rel="noopener" since it opens in same tab (Req 2.2)', async () => {
      render(<DashboardPage />);

      const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });

      expect(showcaseLink).not.toHaveAttribute('rel', 'noopener');
    });
  });

  describe('Accessibility (Requirements 3.1-3.4)', () => {
    /**
     * Tests that the link is keyboard focusable via Tab key
     * Validates: Requirement 3.1 - Keyboard accessible and focusable using Tab key
     */
    it('is keyboard focusable via Tab key (Req 3.1)', async () => {
      render(<DashboardPage />);

      const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });

      // Verify the link is a native anchor element which is focusable by default
      expect(showcaseLink.tagName.toLowerCase()).toBe('a');

      // The link should not have tabindex="-1" which would exclude it from tab order
      const tabIndex = showcaseLink.getAttribute('tabindex');
      expect(tabIndex === null || tabIndex === '0').toBe(true);

      // Verify the element can receive focus programmatically
      showcaseLink.focus();
      expect(document.activeElement).toBe(showcaseLink);
    });

    /**
     * Tests that the link has a descriptive accessible name for screen readers
     * Validates: Requirement 3.2 - Descriptive accessible name that screen readers can announce
     */
    it('has descriptive accessible name for screen readers (Req 3.2)', async () => {
      render(<DashboardPage />);

      const showcaseLink = await screen.findByRole('link', { name: /navigate to community showcase|community showcase/i });

      // Verify the link has an aria-label attribute with descriptive text
      expect(showcaseLink).toHaveAttribute('aria-label', 'Navigate to Community Showcase');
    });

    /**
     * Tests that the link displays a visible focus indicator (focus-visible ring classes)
     * Validates: Requirement 3.3 - Display a visible focus indicator on keyboard focus
     */
    it('displays visible focus indicator via focus-visible ring class (Req 3.3)', async () => {
      render(<DashboardPage />);

      const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });

      // Check that the link has focus-visible ring classes for visible focus indicator
      expect(showcaseLink.className).toContain('focus-visible:ring-2');
      expect(showcaseLink.className).toContain('focus-visible:ring-ring');
      expect(showcaseLink.className).toContain('focus-visible:outline-none');
    });

    /**
     * Tests that the icon has aria-hidden="true" to prevent redundant announcements
     * Validates: Requirement 3.4 - Icon has aria-hidden="true"
     */
    it('has aria-hidden="true" on icon to prevent redundant announcements (Req 3.4)', async () => {
      render(<DashboardPage />);

      const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });

      // Find the SVG icon within the link
      const icon = showcaseLink.querySelector('svg');

      // The icon should exist and have aria-hidden="true"
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    /**
     * Additional test: Link is included in the natural tab order
     * Validates: Requirement 3.1 - Keyboard focusable
     */
    it('is included in the natural tab order (no negative tabindex) (Req 3.1)', async () => {
      render(<DashboardPage />);

      const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });

      // Link should not have tabindex="-1" which would exclude it from tab order
      expect(showcaseLink).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Responsive Behavior (Requirements 4.1-4.4)', () => {
    describe('Desktop Size (1024px and above) - Requirement 4.1', () => {
      /**
       * Tests that icon is visible at desktop size
       * Validates: Requirement 4.1 - Icon visible at desktop size
       */
      it('displays icon at desktop size (Req 4.1)', async () => {
        render(<DashboardPage />);

        const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });
        const icon = showcaseLink.querySelector('svg');

        expect(icon).toBeInTheDocument();
        // Icon should always be visible (no hidden classes on the icon itself)
        const iconClassName = icon?.getAttribute('class') || '';
        expect(iconClassName).not.toContain('hidden');
      });

      /**
       * Tests that text is visible at desktop size via responsive class
       * Validates: Requirement 4.1 - Text visible at desktop size (>=1024px)
       * At desktop size, the `sm:inline` class makes text visible (sm breakpoint is 640px+)
       */
      it('has text with responsive classes for desktop visibility (Req 4.1)', async () => {
        render(<DashboardPage />);

        const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });
        const textSpan = showcaseLink.querySelector('span');

        expect(textSpan).toBeInTheDocument();
        expect(textSpan?.textContent).toBe('Community Showcase');
        // The text should have `hidden sm:inline` classes
        // `sm:inline` makes it visible at 640px and above, which includes desktop (1024px+)
        expect(textSpan?.className).toContain('hidden');
        expect(textSpan?.className).toContain('sm:inline');
      });
    });

    describe('Tablet Size (768px to 1023px) - Requirement 4.2', () => {
      /**
       * Tests that icon is visible at tablet size
       * Validates: Requirement 4.2 - Icon visible at tablet size
       */
      it('displays icon at tablet size (Req 4.2)', async () => {
        render(<DashboardPage />);

        const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });
        const icon = showcaseLink.querySelector('svg');

        expect(icon).toBeInTheDocument();
        // Icon should always be visible (no hidden classes on the icon itself)
        const iconClassName = icon?.getAttribute('class') || '';
        expect(iconClassName).not.toContain('hidden');
      });

      /**
       * Tests that text is visible at tablet size via responsive class
       * Validates: Requirement 4.2 - Text visible at tablet size (768-1023px)
       * At tablet size, the `sm:inline` class makes text visible (sm breakpoint is 640px+)
       */
      it('has text with responsive classes for tablet visibility (Req 4.2)', async () => {
        render(<DashboardPage />);

        const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });
        const textSpan = showcaseLink.querySelector('span');

        expect(textSpan).toBeInTheDocument();
        // Text should be visible at 640px+ which covers tablet range (768-1023px)
        expect(textSpan?.className).toContain('sm:inline');
      });
    });

    describe('Mobile Size (below 768px) - Requirement 4.3', () => {
      /**
       * Tests that icon is visible at mobile size
       * Validates: Requirement 4.3 - Icon visible at mobile size
       */
      it('displays icon at mobile size (Req 4.3)', async () => {
        render(<DashboardPage />);

        const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });
        const icon = showcaseLink.querySelector('svg');

        expect(icon).toBeInTheDocument();
        // Icon should always be visible
        const iconClassName = icon?.getAttribute('class') || '';
        expect(iconClassName).not.toContain('hidden');
      });

      /**
       * Tests that text is hidden on mobile via the `hidden` class
       * Validates: Requirement 4.3 - Text hidden visually at mobile size (<640px)
       * The `hidden` class without breakpoint prefix hides element by default (mobile)
       */
      it('has text hidden by default for mobile (Req 4.3)', async () => {
        render(<DashboardPage />);

        const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });
        const textSpan = showcaseLink.querySelector('span');

        expect(textSpan).toBeInTheDocument();
        // Text should be hidden by default (mobile), visible at sm+ (640px+)
        expect(textSpan?.className).toContain('hidden');
      });

      /**
       * Tests that accessible text is available for screen readers at mobile size
       * Validates: Requirement 4.3 - Accessible text for screen readers at mobile
       * The aria-label provides screen reader text regardless of visual display
       */
      it('provides accessible text for screen readers at mobile (Req 4.3)', async () => {
        render(<DashboardPage />);

        const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });

        // aria-label provides accessible name for screen readers regardless of viewport
        expect(showcaseLink).toHaveAttribute('aria-label', 'Navigate to Community Showcase');
        // Also verify accessible name via testing library
        expect(showcaseLink).toHaveAccessibleName(/community showcase/i);
      });
    });

    describe('Touch Target Sizing - Requirement 4.4', () => {
      /**
       * Tests that link has minimum height class for touch target
       * Validates: Requirement 4.4 - Minimum 44px height for WCAG touch target compliance
       */
      it('has min-h-[44px] class for touch target height (Req 4.4)', async () => {
        render(<DashboardPage />);

        const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });

        expect(showcaseLink.className).toContain('min-h-[44px]');
      });

      /**
       * Tests that link has minimum width class for touch target
       * Validates: Requirement 4.4 - Minimum 44px width for WCAG touch target compliance
       */
      it('has min-w-[44px] class for touch target width (Req 4.4)', async () => {
        render(<DashboardPage />);

        const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });

        expect(showcaseLink.className).toContain('min-w-[44px]');
      });

      /**
       * Tests that link has adequate padding for comfortable touch interaction
       * Validates: Requirement 4.4 - Adequate touch target with padding
       */
      it('has adequate padding for touch interaction (Req 4.4)', async () => {
        render(<DashboardPage />);

        const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });

        // Verify padding classes are present
        expect(showcaseLink.className).toContain('px-3');
        expect(showcaseLink.className).toContain('py-2');
      });

      /**
       * Tests that all touch target sizing classes are applied together
       * Validates: Requirement 4.4 - Complete touch target compliance
       */
      it('has all required touch target sizing classes (Req 4.4)', async () => {
        render(<DashboardPage />);

        const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });
        const className = showcaseLink.className;

        // All touch target related classes should be present
        expect(className).toContain('min-h-[44px]');
        expect(className).toContain('min-w-[44px]');
        expect(className).toContain('px-3');
        expect(className).toContain('py-2');
        // Also verify flexbox centering for proper content alignment within touch target
        expect(className).toContain('inline-flex');
        expect(className).toContain('items-center');
        expect(className).toContain('justify-center');
      });
    });

    describe('Responsive Classes Presence', () => {
      /**
       * Tests that the component has correct responsive display classes
       * This is a comprehensive test of all responsive-related classes
       */
      it('has correct Tailwind responsive classes for text visibility', async () => {
        render(<DashboardPage />);

        const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });
        const textSpan = showcaseLink.querySelector('span');

        // Verify the responsive pattern: hidden by default, shown at sm breakpoint
        expect(textSpan?.className).toMatch(/hidden.*sm:inline|sm:inline.*hidden/);
      });

      /**
       * Tests that icon remains visible across all viewport sizes (no responsive hiding)
       */
      it('icon has no responsive hiding classes', async () => {
        render(<DashboardPage />);

        const showcaseLink = await screen.findByRole('link', { name: /community showcase/i });
        const icon = showcaseLink.querySelector('svg');
        const iconClassName = icon?.getAttribute('class') || '';

        // Icon should not have any hidden or display-none responsive classes
        expect(iconClassName).not.toMatch(/\bhidden\b/);
        expect(iconClassName).not.toMatch(/sm:hidden|md:hidden|lg:hidden/);
      });
    });
  });
});
