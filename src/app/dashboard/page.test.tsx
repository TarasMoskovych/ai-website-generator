/**
 * Dashboard Page Integration Tests
 *
 * Tests that verify the Dashboard page works correctly with:
 * - useWebsites hook integration
 * - Icons from shared Icons module
 * - Loading states
 * - Error handling
 * - Pagination, deletion, title editing, and beautify navigation
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 13.1
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardPage from './page';
import type { GeneratedWebsite } from '@/types/website';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the auth context
const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
};

const mockSignOut = vi.fn();

vi.mock('@/components/auth', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: false,
    loading: false,
    error: null,
    signOut: mockSignOut,
  }),
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the ThemeToggle component to avoid needing ThemeProvider
vi.mock('@/components/layout/ThemeToggle', () => ({
  ThemeToggle: () => <button aria-label="Toggle theme">Theme</button>,
}));

// Mock the useWebsites hook
const mockFetchPage = vi.fn();
const mockRefresh = vi.fn();
const mockUseWebsites = vi.fn();

vi.mock('@/hooks/useWebsites', () => ({
  useWebsites: (...args: unknown[]) => mockUseWebsites(...args),
}));

// Mock websiteRepository for delete/update operations
const mockDelete = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/services/websiteRepository', () => ({
  default: {
    delete: (...args: unknown[]) => mockDelete(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

// Helper to create mock websites
function createMockWebsite(id: string, overrides?: Partial<GeneratedWebsite>): GeneratedWebsite {
  return {
    id,
    userId: 'test-user-123',
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
    ...overrides,
  };
}

// Create multiple mock websites
function createMockWebsites(count: number): GeneratedWebsite[] {
  return Array.from({ length: count }, (_, i) =>
    createMockWebsite(`website-${i + 1}`, { title: `Website ${i + 1}` })
  );
}

describe('Dashboard Page Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation for useWebsites
    mockUseWebsites.mockReturnValue({
      items: createMockWebsites(3),
      isLoading: false,
      error: null,
      currentPage: 1,
      totalPages: 1,
      fetchPage: mockFetchPage,
      refresh: mockRefresh,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useWebsites Hook Integration', () => {
    /**
     * Tests that the Dashboard uses useWebsites hook correctly
     * Validates: Requirement 7.1
     */
    it('calls useWebsites with correct userId and pageSize', () => {
      render(<DashboardPage />);

      expect(mockUseWebsites).toHaveBeenCalledWith('test-user-123', { pageSize: 12 });
    });

    /**
     * Tests that websites from the hook are displayed
     * Validates: Requirements 7.1, 7.3
     */
    it('displays websites returned from useWebsites hook', () => {
      render(<DashboardPage />);

      expect(screen.getByText('Website 1')).toBeInTheDocument();
      expect(screen.getByText('Website 2')).toBeInTheDocument();
      expect(screen.getByText('Website 3')).toBeInTheDocument();
    });

    /**
     * Tests that the hook is called when userId changes
     * Validates: Requirement 7.1
     */
    it('integrates with useWebsites hook using user ID from auth context', () => {
      render(<DashboardPage />);

      // Verify the hook was called with the authenticated user's ID
      expect(mockUseWebsites).toHaveBeenCalledWith(
        expect.stringContaining('test-user'),
        expect.any(Object)
      );
    });
  });

  describe('Icons Module Integration', () => {
    /**
     * Tests that GlobeIcon from Icons module is rendered in Community Showcase link
     * Validates: Requirement 7.2
     */
    it('renders GlobeIcon in Community Showcase link', () => {
      render(<DashboardPage />);

      const showcaseLink = screen.getByLabelText(/navigate to community showcase/i);
      expect(showcaseLink).toBeInTheDocument();

      const svg = showcaseLink.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    /**
     * Tests that PlusIcon from Icons module is rendered in action buttons
     * Validates: Requirement 7.2
     */
    it('renders PlusIcon in New Website button', () => {
      render(<DashboardPage />);

      const newWebsiteButton = screen.getByRole('link', { name: /new website/i });
      expect(newWebsiteButton).toBeInTheDocument();

      const svg = newWebsiteButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    /**
     * Tests that icons in WebsiteCard components have aria-hidden
     * Validates: Requirement 7.2
     */
    it('renders icons with proper accessibility attributes in website cards', () => {
      render(<DashboardPage />);

      // Find all SVG icons in the page
      const svgs = document.querySelectorAll('svg');

      // All icons should have aria-hidden="true"
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Loading State', () => {
    /**
     * Tests that loading spinner is displayed when isLoading is true
     * Validates: Requirement 7.3
     */
    it('displays loading spinner when fetching websites', () => {
      mockUseWebsites.mockReturnValue({
        items: [],
        isLoading: true,
        error: null,
        currentPage: 1,
        totalPages: 0,
        fetchPage: mockFetchPage,
        refresh: mockRefresh,
      });

      render(<DashboardPage />);

      expect(screen.getByText(/loading your websites/i)).toBeInTheDocument();
    });

    /**
     * Tests that spinner has proper animation class
     * Validates: Requirement 7.3
     */
    it('displays animated loading spinner', () => {
      mockUseWebsites.mockReturnValue({
        items: [],
        isLoading: true,
        error: null,
        currentPage: 1,
        totalPages: 0,
        fetchPage: mockFetchPage,
        refresh: mockRefresh,
      });

      render(<DashboardPage />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    /**
     * Tests that error message is displayed when error occurs
     * Validates: Requirement 7.3
     */
    it('displays error message when fetch fails', () => {
      mockUseWebsites.mockReturnValue({
        items: [],
        isLoading: false,
        error: 'Failed to load websites',
        currentPage: 1,
        totalPages: 0,
        fetchPage: mockFetchPage,
        refresh: mockRefresh,
      });

      render(<DashboardPage />);

      expect(screen.getByText(/failed to load websites/i)).toBeInTheDocument();
    });

    /**
     * Tests that retry functionality works
     * Validates: Requirement 7.3
     */
    it('calls refresh when retry button is clicked', async () => {
      mockUseWebsites.mockReturnValue({
        items: [],
        isLoading: false,
        error: 'Network error',
        currentPage: 1,
        totalPages: 0,
        fetchPage: mockFetchPage,
        refresh: mockRefresh,
      });

      render(<DashboardPage />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(mockRefresh).toHaveBeenCalled();
    });

    /**
     * Tests that helpful error message is shown
     * Validates: Requirement 7.3
     */
    it('displays helpful error guidance', () => {
      mockUseWebsites.mockReturnValue({
        items: [],
        isLoading: false,
        error: 'Server error',
        currentPage: 1,
        totalPages: 0,
        fetchPage: mockFetchPage,
        refresh: mockRefresh,
      });

      render(<DashboardPage />);

      expect(screen.getByText(/there was a problem loading your websites/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    /**
     * Tests that empty state message is displayed when no websites
     * Validates: Requirement 7.3
     */
    it('displays empty state when user has no websites', () => {
      mockUseWebsites.mockReturnValue({
        items: [],
        isLoading: false,
        error: null,
        currentPage: 1,
        totalPages: 0,
        fetchPage: mockFetchPage,
        refresh: mockRefresh,
      });

      render(<DashboardPage />);

      expect(screen.getByText(/no websites yet/i)).toBeInTheDocument();
      expect(screen.getByText(/you haven't created any websites yet/i)).toBeInTheDocument();
    });

    /**
     * Tests that CTA button is displayed in empty state
     * Validates: Requirement 7.3
     */
    it('displays Create First Website CTA in empty state', () => {
      mockUseWebsites.mockReturnValue({
        items: [],
        isLoading: false,
        error: null,
        currentPage: 1,
        totalPages: 0,
        fetchPage: mockFetchPage,
        refresh: mockRefresh,
      });

      render(<DashboardPage />);

      const ctaButton = screen.getByRole('link', { name: /create your first website/i });
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton).toHaveAttribute('href', '/generate');
    });

    /**
     * Tests that empty state CTA has PlusIcon
     * Validates: Requirement 7.2
     */
    it('renders PlusIcon in empty state CTA', () => {
      mockUseWebsites.mockReturnValue({
        items: [],
        isLoading: false,
        error: null,
        currentPage: 1,
        totalPages: 0,
        fetchPage: mockFetchPage,
        refresh: mockRefresh,
      });

      render(<DashboardPage />);

      const ctaButton = screen.getByRole('link', { name: /create your first website/i });
      const svg = ctaButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Pagination', () => {
    /**
     * Tests that pagination component is rendered
     * Validates: Requirement 7.3
     */
    it('renders pagination when there are multiple pages', () => {
      mockUseWebsites.mockReturnValue({
        items: createMockWebsites(12),
        isLoading: false,
        error: null,
        currentPage: 1,
        totalPages: 3,
        fetchPage: mockFetchPage,
        refresh: mockRefresh,
      });

      render(<DashboardPage />);

      // Pagination should show page information
      expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
    });

    /**
     * Tests that fetchPage is called when page changes
     * Validates: Requirement 7.3
     */
    it('calls fetchPage when pagination is used', async () => {
      mockUseWebsites.mockReturnValue({
        items: createMockWebsites(12),
        isLoading: false,
        error: null,
        currentPage: 1,
        totalPages: 3,
        fetchPage: mockFetchPage,
        refresh: mockRefresh,
      });

      render(<DashboardPage />);

      // Find and click the next page button
      const nextButton = screen.getByLabelText(/next page/i);
      fireEvent.click(nextButton);

      expect(mockFetchPage).toHaveBeenCalledWith(2);
    });
  });

  describe('Website Card Interactions', () => {
    /**
     * Tests that clicking a website navigates to preview
     * Validates: Requirement 7.4
     */
    it('navigates to preview page when website card is clicked', () => {
      render(<DashboardPage />);

      const websiteCard = screen.getByRole('button', { name: /website: website 1/i });
      fireEvent.click(websiteCard);

      expect(mockPush).toHaveBeenCalledWith('/website/website-1');
    });

    /**
     * Tests that beautify button navigates correctly
     * Validates: Requirement 7.4
     */
    it('navigates to beautify page when beautify button is clicked', () => {
      render(<DashboardPage />);

      const beautifyButton = screen.getByLabelText(/beautify website 1/i);
      fireEvent.click(beautifyButton);

      expect(mockPush).toHaveBeenCalledWith('/website/website-1?beautify=true');
    });

    /**
     * Tests that delete opens confirmation dialog
     * Validates: Requirement 7.4
     */
    it('opens delete confirmation dialog when delete button is clicked', async () => {
      render(<DashboardPage />);

      const deleteButton = screen.getByLabelText(/delete website 1/i);
      fireEvent.click(deleteButton);

      // Dialog should appear (uses role="alertdialog")
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    /**
     * Tests that confirming deletion calls repository and refreshes
     * Validates: Requirement 7.4
     */
    it('deletes website and refreshes list on confirmation', async () => {
      mockDelete.mockResolvedValue(undefined);

      render(<DashboardPage />);

      // Open delete dialog
      const deleteButton = screen.getByLabelText(/delete website 1/i);
      fireEvent.click(deleteButton);

      // Wait for dialog to appear and click confirm (uses role="alertdialog")
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /delete website$/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith('website-1');
      });

      expect(mockRefresh).toHaveBeenCalled();
    });

    /**
     * Tests that cancelling deletion closes dialog
     * Validates: Requirement 7.4
     */
    it('closes dialog when deletion is cancelled', async () => {
      render(<DashboardPage />);

      // Open delete dialog
      const deleteButton = screen.getByLabelText(/delete website 1/i);
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });

      // Website should not be deleted
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe('Title Editing', () => {
    /**
     * Tests that title editing calls update and refresh
     * Validates: Requirement 7.4
     */
    it('updates title and refreshes list', async () => {
      mockUpdate.mockResolvedValue(undefined);

      render(<DashboardPage />);

      // Click edit button (aria-label is "Edit title for {title}")
      const editButton = screen.getByLabelText(/edit title for website 1/i);
      fireEvent.click(editButton);

      // Find the input and change the title
      const input = screen.getByLabelText(/edit website title/i);
      fireEvent.change(input, { target: { value: 'New Title' } });

      // Save the title
      const saveButton = screen.getByLabelText(/save title/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith('website-1', { title: 'New Title' });
      });

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Page Header', () => {
    /**
     * Tests that page header displays correctly
     * Validates: Requirement 7.3
     */
    it('displays page title and description', () => {
      render(<DashboardPage />);

      expect(screen.getByRole('heading', { name: /my websites/i })).toBeInTheDocument();
      expect(screen.getByText(/manage and view your generated websites/i)).toBeInTheDocument();
    });

    /**
     * Tests that Community Showcase link is in header
     * Validates: Requirement 7.2
     */
    it('displays Community Showcase link', () => {
      render(<DashboardPage />);

      const showcaseLink = screen.getByLabelText(/navigate to community showcase/i);
      expect(showcaseLink).toHaveAttribute('href', '/showcase');
    });

    /**
     * Tests that New Website button is in header
     * Validates: Requirement 7.2
     */
    it('displays New Website button', () => {
      render(<DashboardPage />);

      const newWebsiteButton = screen.getByRole('link', { name: /new website/i });
      expect(newWebsiteButton).toHaveAttribute('href', '/generate');
    });
  });

  describe('Website Grid Layout', () => {
    /**
     * Tests that websites are rendered in a grid
     * Validates: Requirement 7.3
     */
    it('renders websites in a responsive grid layout', () => {
      render(<DashboardPage />);

      // Find the grid container
      const gridContainer = document.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();

      // Should contain all website cards
      const cards = gridContainer?.querySelectorAll('[role="button"]');
      expect(cards?.length).toBe(3);
    });
  });

  describe('Delete Error Handling', () => {
    /**
     * Tests that delete error is displayed
     * Validates: Requirement 7.4
     */
    it('displays error when deletion fails', async () => {
      mockDelete.mockRejectedValue(new Error('Delete failed'));

      render(<DashboardPage />);

      // Open delete dialog
      const deleteButton = screen.getByLabelText(/delete website 1/i);
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });

      // Try to delete
      const confirmButton = screen.getByRole('button', { name: /delete website$/i });
      fireEvent.click(confirmButton);

      // Error should be displayed
      await waitFor(() => {
        expect(screen.getByText(/delete failed/i)).toBeInTheDocument();
      });

      // Website should not be removed from list
      expect(mockRefresh).not.toHaveBeenCalled();
    });
  });
});
