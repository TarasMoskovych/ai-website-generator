/**
 * Dashboard Streaming Shell Unit Tests
 *
 * Tests for the Dashboard page after SSR migration:
 * - Static shell (AppHeader, page heading, "New Website" link, footer) renders
 *   in the server response
 * - DashboardSkeleton renders placeholder skeleton cards with animation
 * - Error boundary renders error message and retry mechanism
 *
 * Validates: Requirements 3.1, 3.2, 3.3
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock the auth context (needed by AppHeader)
vi.mock('@/components/auth', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    loading: false,
    error: null,
    signOut: vi.fn(),
  }),
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the ThemeToggle component to avoid needing ThemeProvider
vi.mock('@/components/layout/ThemeToggle', () => ({
  ThemeToggle: () => <button aria-label="Toggle theme">Theme</button>,
}));

// Mock DashboardContent client component to avoid hook/client issues in tests
vi.mock('./DashboardContent', () => ({
  DashboardContent: () => (
    <div data-testid="dashboard-content">Dashboard Content</div>
  ),
  default: () => (
    <div data-testid="dashboard-content">Dashboard Content</div>
  ),
}));

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import DashboardPage from './page';
import { DashboardSkeleton } from './DashboardSkeleton';
import DashboardError from './error';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Dashboard Streaming Shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Static Shell Rendering', () => {
    /**
     * Validates: Requirement 3.1
     * The server component shall render the page header in the initial response.
     */
    it('renders AppHeader in the static shell', () => {
      render(<DashboardPage />);

      // AppHeader renders navigation with sign-in or user controls
      const header = document.querySelector('header');
      expect(header).toBeInTheDocument();
    });

    /**
     * Validates: Requirement 3.1
     * The page heading "My Websites" should render in the static shell.
     */
    it('renders "My Websites" page heading', () => {
      render(<DashboardPage />);

      const heading = screen.getByRole('heading', { name: /my websites/i });
      expect(heading).toBeInTheDocument();
    });

    /**
     * Validates: Requirement 3.1
     * The page description should render in the static shell.
     */
    it('renders page description text', () => {
      render(<DashboardPage />);

      expect(
        screen.getByText(/manage and view your generated websites/i)
      ).toBeInTheDocument();
    });

    /**
     * Validates: Requirement 3.1
     * The "New Website" link should be available in the static shell.
     */
    it('renders "New Website" link pointing to /generate', () => {
      render(<DashboardPage />);

      const newWebsiteLink = screen.getByRole('link', { name: /new website/i });
      expect(newWebsiteLink).toBeInTheDocument();
      expect(newWebsiteLink).toHaveAttribute('href', '/generate');
    });

    /**
     * Validates: Requirement 3.1
     * The footer should render in the static shell.
     */
    it('renders AppFooter in the static shell', () => {
      render(<DashboardPage />);

      const footer = document.querySelector('footer');
      expect(footer).toBeInTheDocument();
    });

    /**
     * Validates: Requirement 3.1
     * The Community Showcase link should be in the static shell.
     */
    it('renders Community Showcase link', () => {
      render(<DashboardPage />);

      const showcaseLink = screen.getByLabelText(
        /navigate to community showcase/i
      );
      expect(showcaseLink).toBeInTheDocument();
      expect(showcaseLink).toHaveAttribute('href', '/showcase');
    });

    /**
     * Validates: Requirement 3.1
     * The Suspense-wrapped DashboardContent should be present in the shell.
     */
    it('renders the DashboardContent within the page', () => {
      render(<DashboardPage />);

      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
    });
  });

  describe('DashboardSkeleton (Suspense Fallback)', () => {
    /**
     * Validates: Requirement 3.2
     * The skeleton should render multiple placeholder cards.
     */
    it('renders 8 skeleton placeholder cards', () => {
      render(<DashboardSkeleton />);

      const skeletonCards = document.querySelectorAll('.animate-pulse');
      expect(skeletonCards.length).toBe(8);
    });

    /**
     * Validates: Requirement 3.2
     * Each skeleton card should have pulse animation.
     */
    it('applies pulse animation to skeleton cards', () => {
      render(<DashboardSkeleton />);

      const animatedElements = document.querySelectorAll('.animate-pulse');
      expect(animatedElements.length).toBeGreaterThan(0);

      animatedElements.forEach((el) => {
        expect(el).toHaveClass('animate-pulse');
      });
    });

    /**
     * Validates: Requirement 3.2
     * Each skeleton card should have a thumbnail placeholder area.
     */
    it('renders thumbnail placeholder areas in skeleton cards', () => {
      render(<DashboardSkeleton />);

      // Each card has an aspect-[4/3] thumbnail placeholder
      const thumbnailPlaceholders = document.querySelectorAll('.aspect-\\[4\\/3\\]');
      expect(thumbnailPlaceholders.length).toBe(8);
    });

    /**
     * Validates: Requirement 3.2
     * Skeleton cards should be arranged in a responsive grid.
     */
    it('renders skeleton cards in a grid layout', () => {
      render(<DashboardSkeleton />);

      const grid = document.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass('grid-cols-1');
    });

    /**
     * Validates: Requirement 3.2
     * Each skeleton card should have text placeholder lines.
     */
    it('renders title and date placeholders in each skeleton card', () => {
      render(<DashboardSkeleton />);

      // Each card has 2 muted placeholder lines (title + date)
      const cards = document.querySelectorAll('.animate-pulse');
      cards.forEach((card) => {
        const placeholders = card.querySelectorAll('.bg-muted.rounded');
        expect(placeholders.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Error Boundary (error.tsx)', () => {
    /**
     * Validates: Requirement 3.3
     * The error boundary should display an error message.
     */
    it('renders error message text', () => {
      const mockError = new Error('Network timeout');
      const mockRetry = vi.fn();

      render(
        <DashboardError error={mockError} unstable_retry={mockRetry} />
      );

      expect(
        screen.getByText(/something went wrong loading the dashboard/i)
      ).toBeInTheDocument();
    });

    /**
     * Validates: Requirement 3.3
     * The error boundary should render a retry button.
     */
    it('renders a "Try Again" retry button', () => {
      const mockError = new Error('Server error');
      const mockRetry = vi.fn();

      render(
        <DashboardError error={mockError} unstable_retry={mockRetry} />
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
    });

    /**
     * Validates: Requirement 3.3
     * Clicking the retry button should invoke unstable_retry.
     */
    it('calls unstable_retry when retry button is clicked', () => {
      const mockError = new Error('Connection failed');
      const mockRetry = vi.fn();

      render(
        <DashboardError error={mockError} unstable_retry={mockRetry} />
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    /**
     * Validates: Requirement 3.3
     * The error boundary should log the error to the console.
     */
    it('logs the error to console.error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockError = new Error('Fetch failed');
      const mockRetry = vi.fn();

      render(
        <DashboardError error={mockError} unstable_retry={mockRetry} />
      );

      expect(consoleSpy).toHaveBeenCalledWith('Dashboard error:', mockError);
      consoleSpy.mockRestore();
    });
  });
});
