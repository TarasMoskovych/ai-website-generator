/**
 * Website Preview Page - Streaming Shell Unit Tests
 *
 * Tests that verify the Website Preview page server component shell:
 * - Static layout shell and decorative background render in the server response
 * - PreviewSkeleton renders toolbar, preview panel, and code editor placeholders
 * - Error boundary renders error message and retry mechanism
 *
 * Validates: Requirements 3.4, 3.5, 3.6
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock the WebsitePageContent client component to avoid hook/client issues
vi.mock('./WebsitePageContent', () => ({
  WebsitePageContent: ({ websiteId }: { websiteId: string }) => (
    <div data-testid="website-page-content" data-website-id={websiteId}>
      Website Content
    </div>
  ),
}));

// Mock React Suspense to render children directly (for server component testing)
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    Suspense: ({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

// ─── Import components after mocks ──────────────────────────────────────────

import WebsitePage from './page';
import { PreviewSkeleton } from './PreviewSkeleton';
import WebsitePreviewError from './error';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Website Preview Page - Server Component Shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Static Layout Shell', () => {
    /**
     * Validates: Requirement 3.4
     * The server component should render the page layout shell as static HTML
     * in the initial server response.
     */
    it('renders the outer layout container with min-h-screen and gradient background', async () => {
      const element = await WebsitePage({ params: Promise.resolve({ id: 'test-id-123' }) });
      const { container } = render(element);

      const layoutDiv = container.firstElementChild as HTMLElement;
      expect(layoutDiv).toBeInTheDocument();
      expect(layoutDiv.className).toContain('min-h-screen');
      expect(layoutDiv.className).toContain('bg-gradient-to-b');
    });

    it('renders decorative background elements in the static shell', async () => {
      const element = await WebsitePage({ params: Promise.resolve({ id: 'test-id-123' }) });
      const { container } = render(element);

      // The fixed decorative background container
      const decorativeContainer = container.querySelector('.fixed.inset-0');
      expect(decorativeContainer).toBeInTheDocument();
      expect(decorativeContainer?.className).toContain('pointer-events-none');

      // Two blur circles for decorative effect
      const blurCircles = decorativeContainer?.querySelectorAll('.blur-3xl');
      expect(blurCircles?.length).toBe(2);
    });

    it('passes the correct websiteId to WebsitePageContent', async () => {
      const element = await WebsitePage({ params: Promise.resolve({ id: 'my-website-42' }) });
      render(element);

      const content = screen.getByTestId('website-page-content');
      expect(content).toHaveAttribute('data-website-id', 'my-website-42');
    });

    it('awaits params promise and extracts the id correctly', async () => {
      const element = await WebsitePage({ params: Promise.resolve({ id: 'async-param-id' }) });
      render(element);

      const content = screen.getByTestId('website-page-content');
      expect(content).toHaveAttribute('data-website-id', 'async-param-id');
    });
  });
});

describe('PreviewSkeleton Component', () => {
  /**
   * Validates: Requirement 3.5
   * The loading skeleton should display placeholders for the preview and code editor panels.
   */
  describe('Toolbar Skeleton', () => {
    it('renders a toolbar section with border and background', () => {
      const { container } = render(<PreviewSkeleton />);

      // Toolbar area with border-b and bg-background
      const toolbar = container.querySelector('.border-b.border-border.bg-background');
      expect(toolbar).toBeInTheDocument();
    });

    it('renders a back button placeholder in the toolbar', () => {
      const { container } = render(<PreviewSkeleton />);

      // Back button placeholder (h-9 w-9 rounded-md)
      const backButtonPlaceholder = container.querySelector('.h-9.w-9.rounded-md.bg-muted');
      expect(backButtonPlaceholder).toBeInTheDocument();
    });

    it('renders title and subtitle placeholders in the toolbar', () => {
      const { container } = render(<PreviewSkeleton />);

      // Title placeholder
      const titlePlaceholder = container.querySelector('.h-5.w-48');
      expect(titlePlaceholder).toBeInTheDocument();

      // Subtitle placeholder
      const subtitlePlaceholder = container.querySelector('.h-3.w-32');
      expect(subtitlePlaceholder).toBeInTheDocument();
    });

    it('renders action button placeholders in the toolbar', () => {
      const { container } = render(<PreviewSkeleton />);

      // Action buttons (h-9 w-20, h-9 w-24, h-9 w-24, h-9 w-28)
      const actionButtons = container.querySelectorAll('.h-9.rounded-md.bg-muted');
      // Back button (h-9 w-9) + 4 action buttons = at least 5
      expect(actionButtons.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Preview Panel Skeleton', () => {
    it('renders the preview panel area with a border', () => {
      const { container } = render(<PreviewSkeleton />);

      // Preview panel (flex-1 border-r)
      const previewPanel = container.querySelector('.flex-1.border-r');
      expect(previewPanel).toBeInTheDocument();
    });

    it('renders a full-size placeholder in the preview panel', () => {
      const { container } = render(<PreviewSkeleton />);

      const previewPanel = container.querySelector('.flex-1.border-r.border-border.p-4');
      expect(previewPanel).toBeInTheDocument();

      // The preview placeholder (h-full w-full rounded-lg bg-muted)
      const previewPlaceholder = previewPanel?.querySelector('.h-full.w-full.rounded-lg.bg-muted');
      expect(previewPlaceholder).toBeInTheDocument();
    });
  });

  describe('Code Editor Panel Skeleton', () => {
    it('renders the code editor panel with fixed width', () => {
      const { container } = render(<PreviewSkeleton />);

      // Code editor panel (w-[500px])
      const editorPanel = container.querySelector('[class*="w-[500px]"]');
      expect(editorPanel).toBeInTheDocument();
    });

    it('renders the editor toolbar with icons and label placeholder', () => {
      const { container } = render(<PreviewSkeleton />);

      // Editor toolbar area (bg-muted/30)
      const editorToolbar = container.querySelector('[class*="bg-muted/30"]');
      expect(editorToolbar).toBeInTheDocument();
    });

    it('renders tab bar with tab placeholders', () => {
      const { container } = render(<PreviewSkeleton />);

      // Tab placeholders (h-7 w-16 rounded bg-muted)
      const tabPlaceholders = container.querySelectorAll('.h-7.w-16');
      expect(tabPlaceholders.length).toBe(2);
    });

    it('renders code line placeholders in the editor', () => {
      const { container } = render(<PreviewSkeleton />);

      // Code lines are h-3 elements within the code area
      const codeLines = container.querySelectorAll('.h-3');
      // Should have multiple code lines (10 code lines + title subtitle = 12 total h-3 elements)
      expect(codeLines.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Animation', () => {
    it('applies animate-pulse class to the skeleton container', () => {
      const { container } = render(<PreviewSkeleton />);

      const skeletonContainer = container.querySelector('.animate-pulse');
      expect(skeletonContainer).toBeInTheDocument();
    });
  });
});

describe('Website Preview Error Boundary', () => {
  /**
   * Validates: Requirement 3.6
   * Error boundary should display an error message with a retry mechanism.
   */
  const mockError = new Error('Failed to load website data');
  const mockRetry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error output from the error boundary's useEffect
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders the error message', () => {
    render(<WebsitePreviewError error={mockError} unstable_retry={mockRetry} />);

    expect(
      screen.getByText('Something went wrong loading the website preview.')
    ).toBeInTheDocument();
  });

  it('renders a Try Again button', () => {
    render(<WebsitePreviewError error={mockError} unstable_retry={mockRetry} />);

    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('calls unstable_retry when Try Again button is clicked', () => {
    render(<WebsitePreviewError error={mockError} unstable_retry={mockRetry} />);

    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);

    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('applies destructive styling to the error text', () => {
    render(<WebsitePreviewError error={mockError} unstable_retry={mockRetry} />);

    const errorText = screen.getByText('Something went wrong loading the website preview.');
    expect(errorText.className).toContain('text-destructive');
  });

  it('renders the retry button with primary styling', () => {
    render(<WebsitePreviewError error={mockError} unstable_retry={mockRetry} />);

    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton.className).toContain('bg-primary');
  });

  it('centers the error content vertically and horizontally', () => {
    const { container } = render(
      <WebsitePreviewError error={mockError} unstable_retry={mockRetry} />
    );

    const errorContainer = container.firstElementChild as HTMLElement;
    expect(errorContainer.className).toContain('items-center');
    expect(errorContainer.className).toContain('justify-center');
  });

  it('logs the error to console', () => {
    render(<WebsitePreviewError error={mockError} unstable_retry={mockRetry} />);

    expect(console.error).toHaveBeenCalledWith('Website preview error:', mockError);
  });
});
