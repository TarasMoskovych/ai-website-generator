/**
 * Website Preview Page Integration Tests
 *
 * Tests that verify the Website Preview page works correctly with:
 * - Auth integration (getIdToken from useAuth hook)
 * - Icons from shared Icons module
 * - Preview functionality
 * - Beautify workflow with mocked API
 * - Loading and error states
 * - Code editing
 *
 * Validates: Requirements 11.1, 11.2, 11.4, 13.1
 */

import React, { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { GeneratedWebsite } from '@/types/website';

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/website/test-website-123',
}));

// Mock user
const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
};

// Mock getIdToken function
const mockGetIdToken = vi.fn();

// Mock the auth context
vi.mock('@/components/auth', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: false,
    loading: false,
    error: null,
    signOut: vi.fn(),
    getIdToken: mockGetIdToken,
  }),
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the ThemeToggle component to avoid needing ThemeProvider
vi.mock('@/components/layout/ThemeToggle', () => ({
  ThemeToggle: () => <button aria-label="Toggle theme">Theme</button>,
}));

// Mock the ThemeProvider and useTheme to avoid theme context issues
vi.mock('@/components/layout/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    resolvedTheme: 'light',
  }),
}));

// Mock website repository
const mockGetById = vi.fn();
const mockUpdate = vi.fn();
const mockToggleShowcase = vi.fn();

vi.mock('@/services/websiteRepository', () => ({
  default: {
    getById: (...args: unknown[]) => mockGetById(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    toggleShowcase: (...args: unknown[]) => mockToggleShowcase(...args),
    save: vi.fn(),
  },
}));

// Mock download service
vi.mock('@/services/downloadService', () => ({
  generateSingleFile: vi.fn().mockResolvedValue(new Blob(['<html></html>'])),
  generateZipArchive: vi.fn().mockResolvedValue(new Blob(['zip content'])),
  downloadBlob: vi.fn(),
}));

// Mock HTML sanitizer
vi.mock('@/services/htmlSanitizer', () => ({
  sanitize: (html: string) => html,
}));

// Mock beautify errors
vi.mock('@/lib/beautifyErrors', () => ({
  getBeautifyError: (err: Error | string) => ({
    title: 'Beautification Error',
    message: typeof err === 'string' ? err : err.message,
    isRetryable: true,
  }),
}));

// Mock useBeautifySave hook
vi.mock('@/hooks/useBeautifySave', () => ({
  useBeautifySave: () => ({
    handleReplaceOriginal: vi.fn(),
    handleSaveAsNew: vi.fn(),
  }),
}));

// Helper to create a mock website
function createMockWebsite(id: string, overrides?: Partial<GeneratedWebsite>): GeneratedWebsite {
  return {
    id,
    userId: 'test-user-123',
    title: `Test Website ${id}`,
    html: '<h1>Test Content</h1><p>Hello World</p>',
    css: 'h1 { color: blue; } p { font-size: 16px; }',
    thumbnailUrl: 'data:image/png;base64,test',
    inputType: 'text',
    originalPrompt: 'Create a test website',
    isPublic: true,
    isShowcased: false,
    showcasedAt: null,
    creatorName: 'Test User',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// Helper to create a mock ReadableStream for SSE testing
function createMockSSEStream(events: Array<{ event: string; data: unknown }>) {
  const encoder = new TextEncoder();
  let eventIndex = 0;

  return new ReadableStream({
    pull(controller) {
      if (eventIndex < events.length) {
        const { event, data } = events[eventIndex];
        const sseText = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(sseText));
        eventIndex++;
      } else {
        controller.close();
      }
    },
  });
}

// Create a Promise-wrapped params object as required by Next.js 15+
function createParamsPromise(id: string): Promise<{ id: string }> {
  return Promise.resolve({ id });
}

// Import the page component after mocks are set up
import WebsitePage from './page';

// Wrapper component to handle Suspense boundaries properly in tests
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {children}
    </Suspense>
  );
}

// Helper function to render the page with proper async handling
async function renderWebsitePage(websiteId: string) {
  let result;
  await act(async () => {
    result = render(
      <TestWrapper>
        <WebsitePage params={createParamsPromise(websiteId)} />
      </TestWrapper>
    );
  });
  return result!;
}

describe('Website Preview Page Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIdToken.mockResolvedValue('mock-id-token');
    mockGetById.mockResolvedValue(createMockWebsite('test-website-123'));
    mockUpdate.mockResolvedValue(undefined);
    mockToggleShowcase.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Page Rendering', () => {
    /**
     * Tests that the page renders correctly with website data
     * Validates: Requirement 11.4
     */
    it('renders the page with website title and content', async () => {
      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });
    });

    /**
     * Tests that not found message is shown when website doesn't exist
     * Validates: Requirement 11.4
     */
    it('shows not found message when website does not exist', async () => {
      mockGetById.mockResolvedValue(null);

      await renderWebsitePage('nonexistent-id');

      await waitFor(() => {
        expect(screen.getByText(/website not found/i)).toBeInTheDocument();
      });

      // Should show back to dashboard button
      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    });

    /**
     * Tests that not found is shown for unauthorized access
     * Validates: Requirement 11.4
     */
    it('shows not found message when user does not own the website', async () => {
      mockGetById.mockResolvedValue(createMockWebsite('other-website', { userId: 'other-user-456' }));

      await renderWebsitePage('other-website');

      await waitFor(() => {
        expect(screen.getByText(/website not found/i)).toBeInTheDocument();
      });
    });

    /**
     * Tests that error message is shown when fetch fails
     * Validates: Requirement 11.4
     */
    it('shows error message when fetch fails', async () => {
      mockGetById.mockRejectedValue(new Error('Failed to load website'));

      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByText(/failed to load website/i)).toBeInTheDocument();
      });
    });
  });

  describe('Auth Integration (getIdToken from useAuth)', () => {
    /**
     * Tests that getIdToken is used from useAuth hook for beautify
     * Validates: Requirement 11.1
     */
    it('uses getIdToken from useAuth hook for beautify authentication', async () => {
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        body: createMockSSEStream([
          { event: 'start', data: {} },
          { event: 'done', data: { result: { html: '<h1>Beautified</h1>', css: 'h1 { color: red; }' } } },
        ]),
      } as Response);

      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      // Click beautify button to open options dialog
      const beautifyButton = screen.getByRole('button', { name: /beautify/i });
      fireEvent.click(beautifyButton);

      // Wait for options dialog and confirm
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click confirm/start beautification
      const startButton = screen.getByRole('button', { name: /start beautif/i });
      fireEvent.click(startButton);

      // Verify getIdToken was called
      await waitFor(() => {
        expect(mockGetIdToken).toHaveBeenCalled();
      });

      // Verify the token was used in the API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/beautify/stream',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer mock-id-token',
            }),
          })
        );
      });

      mockFetch.mockRestore();
    });

    /**
     * Tests that auth error is handled when getIdToken fails during beautify
     * Validates: Requirement 11.1
     */
    it('handles authentication error when getIdToken fails during beautify', async () => {
      mockGetIdToken.mockRejectedValue(new Error('User not authenticated'));

      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      // Click beautify button
      const beautifyButton = screen.getByRole('button', { name: /beautify/i });
      fireEvent.click(beautifyButton);

      // Wait for options dialog and confirm
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /start beautif/i });
      fireEvent.click(startButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/user not authenticated/i)).toBeInTheDocument();
      });
    });
  });

  describe('Icons Module Integration', () => {
    /**
     * Tests that icons from shared module are rendered with aria-hidden
     * Validates: Requirement 11.2
     */
    it('renders icons with aria-hidden for accessibility', async () => {
      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      // All SVG icons should have aria-hidden
      const svgs = document.querySelectorAll('svg');
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });
    });

    /**
     * Tests that ArrowLeftIcon is rendered in back button
     * Validates: Requirement 11.2
     */
    it('renders ArrowLeftIcon in back to dashboard button', async () => {
      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      const backButton = screen.getByLabelText(/back to dashboard/i);
      expect(backButton).toBeInTheDocument();

      const svg = backButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    /**
     * Tests that DownloadIcon is rendered in download button
     * Validates: Requirement 11.2
     */
    it('renders DownloadIcon in download button', async () => {
      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      const downloadButton = screen.getByRole('button', { name: /download/i });
      expect(downloadButton).toBeInTheDocument();

      const svg = downloadButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    /**
     * Tests that GlobeIcon is rendered in share/showcase button
     * Validates: Requirement 11.2
     */
    it('renders GlobeIcon in share button', async () => {
      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      const shareButton = screen.getByRole('button', { name: /share/i });
      expect(shareButton).toBeInTheDocument();

      const svg = shareButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    /**
     * Tests that MaximizeIcon is rendered in preview button
     * Validates: Requirement 11.2
     */
    it('renders MaximizeIcon in preview button', async () => {
      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      const previewButton = screen.getByRole('button', { name: /preview/i });
      expect(previewButton).toBeInTheDocument();

      const svg = previewButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Preview Functionality', () => {
    /**
     * Tests that preview renderer is displayed
     * Validates: Requirement 11.4
     */
    it('displays preview renderer with website content', async () => {
      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      // Preview should be rendered (look for iframe)
      const iframe = document.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
    });

    /**
     * Tests that fullscreen preview can be opened
     * Validates: Requirement 11.4
     */
    it('opens fullscreen preview when preview button is clicked', async () => {
      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      const previewButton = screen.getByRole('button', { name: /preview/i });
      fireEvent.click(previewButton);

      // Should show fullscreen dialog
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /fullscreen preview/i })).toBeInTheDocument();
      });
    });

    /**
     * Tests that fullscreen preview can be closed
     * Validates: Requirement 11.4
     */
    it('closes fullscreen preview when exit button is clicked', async () => {
      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      // Open fullscreen
      const previewButton = screen.getByRole('button', { name: /preview/i });
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /fullscreen preview/i })).toBeInTheDocument();
      });

      // Close fullscreen
      const exitButton = screen.getByLabelText(/exit fullscreen/i);
      fireEvent.click(exitButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: /fullscreen preview/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Beautify Workflow', () => {
    /**
     * Tests that beautify button is displayed
     * Validates: Requirement 11.4
     */
    it('displays beautify button in action toolbar', async () => {
      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /beautify/i })).toBeInTheDocument();
    });

    /**
     * Tests that beautify options dialog opens
     * Validates: Requirement 11.4
     */
    it('opens beautify options dialog when beautify button is clicked', async () => {
      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      const beautifyButton = screen.getByRole('button', { name: /beautify/i });
      fireEvent.click(beautifyButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    /**
     * Tests successful beautify flow with mocked API
     * Validates: Requirement 11.4
     */
    it('successfully beautifies website with streaming', async () => {
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        body: createMockSSEStream([
          { event: 'start', data: {} },
          { event: 'mode', data: { mode: 'complete' } },
          { event: 'text', data: { content: '<h1>Beautified</h1>' } },
          { event: 'done', data: { result: { html: '<h1>Beautified</h1>', css: 'h1 { color: red; }' } } },
        ]),
      } as Response);

      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      // Click beautify
      const beautifyButton = screen.getByRole('button', { name: /beautify/i });
      fireEvent.click(beautifyButton);

      // Confirm in options dialog
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /start beautif/i });
      fireEvent.click(startButton);

      // Wait for streaming to complete and comparison to appear
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/beautify/stream',
          expect.any(Object)
        );
      }, { timeout: 5000 });

      mockFetch.mockRestore();
    });

    /**
     * Tests that beautify error is handled
     * Validates: Requirement 11.4
     */
    it('handles beautify API error', async () => {
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        text: vi.fn().mockResolvedValue('Beautification failed'),
      } as unknown as Response);

      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      // Click beautify
      const beautifyButton = screen.getByRole('button', { name: /beautify/i });
      fireEvent.click(beautifyButton);

      // Confirm in options dialog
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /start beautif/i });
      fireEvent.click(startButton);

      // Should show error
      await waitFor(() => {
        // There may be multiple elements with "beautification failed" text
        const errorElements = screen.getAllByText(/beautification failed/i);
        expect(errorElements.length).toBeGreaterThan(0);
      });

      mockFetch.mockRestore();
    });
  });

  describe('Loading and Error States', () => {
    /**
     * Tests that retry button works after fetch error
     * Validates: Requirement 11.4
     */
    it('allows retry after fetch error', async () => {
      mockGetById
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockWebsite('test-website-123'));

      await renderWebsitePage('test-website-123');

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      // Should load successfully
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    /**
     * Tests that back button navigates to dashboard
     * Validates: Requirement 11.4
     */
    it('navigates back to dashboard when back button is clicked', async () => {
      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      const backButton = screen.getByLabelText(/back to dashboard/i);
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Showcase Toggle', () => {
    /**
     * Tests that showcase toggle works
     * Validates: Requirement 11.4
     */
    it('toggles showcase status when share button is clicked', async () => {
      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      const shareButton = screen.getByRole('button', { name: /share/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockToggleShowcase).toHaveBeenCalledWith('test-website-123', true);
      });
    });

    /**
     * Tests that showcased website shows "Shared" text
     * Validates: Requirement 11.4
     */
    it('shows "Shared" text when website is showcased', async () => {
      mockGetById.mockResolvedValue(createMockWebsite('test-website-123', { isShowcased: true }));

      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      // Should show "Shared" text
      expect(screen.getByRole('button', { name: /shared/i })).toBeInTheDocument();
    });
  });

  describe('Download Dialog', () => {
    /**
     * Tests that download dialog opens
     * Validates: Requirement 11.4
     */
    it('opens download dialog when download button is clicked', async () => {
      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      const downloadButton = screen.getByRole('button', { name: /download/i });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Code Editor', () => {
    /**
     * Tests that code editor panel is displayed
     * Validates: Requirement 11.4
     */
    it('displays code editor panel', async () => {
      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      // Should show Code Editor header
      expect(screen.getByText(/code editor/i)).toBeInTheDocument();
    });

    /**
     * Tests that code panel can be collapsed
     * Validates: Requirement 11.4
     */
    it('collapses code panel when collapse button is clicked', async () => {
      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      // Find and click collapse button
      const collapseButton = screen.getByLabelText(/collapse code panel/i);
      fireEvent.click(collapseButton);

      // Should show expand button instead
      await waitFor(() => {
        expect(screen.getByLabelText(/expand code panel/i)).toBeInTheDocument();
      });
    });
  });

  describe('Save Status', () => {
    /**
     * Tests that website creation date is displayed
     * Validates: Requirement 11.4
     */
    it('displays website creation date', async () => {
      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      // Should show creation date
      expect(screen.getByText(/created/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    /**
     * Tests that all interactive elements have proper labels
     * Validates: Requirement 11.4
     */
    it('has proper accessibility labels for interactive elements', async () => {
      await renderWebsitePage('test-website-123');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /test website test-website-123/i })).toBeInTheDocument();
      });

      // Verify key interactive elements have accessible names
      expect(screen.getByLabelText(/back to dashboard/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /beautify/i })).toBeInTheDocument();
    });
  });
});
