/**
 * Generate Page Integration Tests
 *
 * Tests that verify the Generate page works correctly with:
 * - Auth integration (getIdToken from useAuth hook)
 * - Input modes (text and screenshot)
 * - Generation flow with mocked API
 * - Loading states
 * - Error handling
 * - Cancel functionality
 *
 * Validates: Requirements 10.1, 10.3, 13.1, 3.7
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import GeneratePage from './page';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
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

// Mock website repository
const mockSave = vi.fn();
vi.mock('@/services/websiteRepository', () => ({
  save: (...args: unknown[]) => mockSave(...args),
}));

// Mock thumbnail service
vi.mock('@/services/thumbnailService', () => ({
  generateThumbnail: vi.fn().mockResolvedValue({ success: true, dataUrl: 'data:image/png;base64,thumb' }),
  getPlaceholderThumbnail: vi.fn().mockReturnValue('data:image/png;base64,placeholder'),
}));

// Mock error handling
vi.mock('@/services/errorHandling', () => ({
  getErrorMessage: vi.fn((code: string) => `Error: ${code}`),
  isAppError: vi.fn(() => false),
}));

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

describe('Generate Page Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIdToken.mockResolvedValue('mock-id-token');
    mockSave.mockResolvedValue({ id: 'generated-website-123' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Page Rendering', () => {
    /**
     * Tests that the page renders correctly with header and main content
     * Validates: Requirement 10.3
     */
    it('renders the page with header and main content', () => {
      render(<GeneratePage />);

      expect(screen.getByRole('heading', { name: /generate a website/i })).toBeInTheDocument();
      expect(screen.getByText(/describe your website or upload a screenshot/i)).toBeInTheDocument();
    });

    /**
     * Tests that input mode selector is displayed
     * Validates: Requirement 10.3
     */
    it('displays input mode selector with text and screenshot options', () => {
      render(<GeneratePage />);

      // Input mode selector uses radio buttons
      expect(screen.getByRole('radiogroup', { name: /select input mode/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /text description/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /screenshot upload/i })).toBeInTheDocument();
    });

    /**
     * Tests that text mode is active by default
     * Validates: Requirement 10.3
     */
    it('displays text input mode as default', () => {
      render(<GeneratePage />);

      // Text radio button should be checked by default
      const textRadio = screen.getByRole('radio', { name: /text description/i });
      expect(textRadio).toHaveAttribute('aria-checked', 'true');

      // Should show text area for description
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('Auth Integration (getIdToken from useAuth)', () => {
    /**
     * Tests that getIdToken is used from useAuth hook
     * Validates: Requirement 10.1
     */
    it('uses getIdToken from useAuth hook for authentication', async () => {
      // Mock fetch to simulate API response
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        body: createMockSSEStream([
          { event: 'start', data: {} },
          { event: 'done', data: { result: { html: '<h1>Test</h1>', css: 'h1 {}', title: 'Test' } } },
        ]),
      } as Response);

      render(<GeneratePage />);

      // Enter valid text
      const textArea = screen.getByRole('textbox');
      fireEvent.change(textArea, { target: { value: 'Create a simple website with a header' } });

      // Submit form - button has aria-label "Generate website from description"
      const generateButton = screen.getByRole('button', { name: /generate website/i });
      fireEvent.click(generateButton);

      // Verify getIdToken was called
      await waitFor(() => {
        expect(mockGetIdToken).toHaveBeenCalled();
      });

      // Verify the token was used in the API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/generate/stream',
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
     * Tests that auth error is handled when getIdToken fails
     * Validates: Requirement 10.1
     */
    it('handles authentication error when getIdToken fails', async () => {
      mockGetIdToken.mockRejectedValue(new Error('User not authenticated'));

      render(<GeneratePage />);

      // Enter valid text
      const textArea = screen.getByRole('textbox');
      fireEvent.change(textArea, { target: { value: 'Create a simple website with a header' } });

      // Submit form
      const generateButton = screen.getByRole('button', { name: /generate website/i });
      fireEvent.click(generateButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/user not authenticated/i)).toBeInTheDocument();
      });
    });
  });

  describe('Input Modes', () => {
    /**
     * Tests that switching to screenshot mode works
     * Validates: Requirement 10.3
     */
    it('switches to screenshot mode when clicked', () => {
      render(<GeneratePage />);

      const screenshotRadio = screen.getByRole('radio', { name: /screenshot upload/i });
      fireEvent.click(screenshotRadio);

      // Screenshot radio should be checked
      expect(screenshotRadio).toHaveAttribute('aria-checked', 'true');

      // Text radio should not be checked
      const textRadio = screen.getByRole('radio', { name: /text description/i });
      expect(textRadio).toHaveAttribute('aria-checked', 'false');
    });

    /**
     * Tests that switching back to text mode works
     * Validates: Requirement 10.3
     */
    it('switches back to text mode when clicked', () => {
      render(<GeneratePage />);

      // Switch to screenshot mode first
      const screenshotRadio = screen.getByRole('radio', { name: /screenshot upload/i });
      fireEvent.click(screenshotRadio);

      // Switch back to text mode
      const textRadio = screen.getByRole('radio', { name: /text description/i });
      fireEvent.click(textRadio);

      expect(textRadio).toHaveAttribute('aria-checked', 'true');
      expect(screenshotRadio).toHaveAttribute('aria-checked', 'false');
    });

    /**
     * Tests that text input validation prevents submission with short input
     * Validates: Requirement 10.3
     */
    it('prevents submission when text input is too short', () => {
      render(<GeneratePage />);

      const textArea = screen.getByRole('textbox');
      fireEvent.change(textArea, { target: { value: 'short' } });

      // Generate button should be disabled for short input
      const generateButton = screen.getByRole('button', { name: /generate website/i });
      expect(generateButton).toBeDisabled();
    });
  });

  describe('Generation Flow with Mocked API', () => {
    /**
     * Tests successful generation flow with text input
     * Validates: Requirement 10.3
     */
    it('successfully generates website from text input', async () => {
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        body: createMockSSEStream([
          { event: 'start', data: {} },
          { event: 'text', data: { content: '<h1>Generated</h1>' } },
          { event: 'done', data: { result: { html: '<h1>Generated</h1>', css: 'h1 { color: blue; }', title: 'My Website' } } },
        ]),
      } as Response);

      render(<GeneratePage />);

      // Enter valid text
      const textArea = screen.getByRole('textbox');
      fireEvent.change(textArea, { target: { value: 'Create a simple website with a header and navigation' } });

      // Submit form
      const generateButton = screen.getByRole('button', { name: /generate website/i });
      fireEvent.click(generateButton);

      // Should show loading indicator
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // Wait for navigation to happen
      await waitFor(() => {
        expect(mockSave).toHaveBeenCalledWith(
          'test-user-123',
          expect.objectContaining({
            title: 'My Website',
            html: '<h1>Generated</h1>',
            css: 'h1 { color: blue; }',
            inputType: 'text',
          }),
          'Test User'
        );
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/website/generated-website-123');
      });

      mockFetch.mockRestore();
    });

    /**
     * Tests generation flow handles API errors
     * Validates: Requirement 10.3
     */
    it('handles API error during generation', async () => {
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        text: vi.fn().mockResolvedValue('Generation failed'),
      } as unknown as Response);

      render(<GeneratePage />);

      // Enter valid text
      const textArea = screen.getByRole('textbox');
      fireEvent.change(textArea, { target: { value: 'Create a simple website with a header' } });

      // Submit form
      const generateButton = screen.getByRole('button', { name: /generate website/i });
      fireEvent.click(generateButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/generation failed/i)).toBeInTheDocument();
      });

      // Input should be preserved
      expect(textArea).toHaveValue('Create a simple website with a header');

      mockFetch.mockRestore();
    });

    /**
     * Tests generation flow handles SSE error event
     * Validates: Requirement 10.3
     */
    it('handles SSE error event during streaming', async () => {
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        body: createMockSSEStream([
          { event: 'start', data: {} },
          { event: 'error', data: { error: 'AI model error' } },
        ]),
      } as Response);

      render(<GeneratePage />);

      // Enter valid text
      const textArea = screen.getByRole('textbox');
      fireEvent.change(textArea, { target: { value: 'Create a simple website with a header' } });

      // Submit form
      const generateButton = screen.getByRole('button', { name: /generate website/i });
      fireEvent.click(generateButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/ai model error/i)).toBeInTheDocument();
      });

      mockFetch.mockRestore();
    });
  });

  describe('Loading States', () => {
    /**
     * Tests that loading indicator is shown during generation
     * Validates: Requirement 10.3
     */
    it('shows loading indicator during generation', async () => {
      // Create a promise we can control to simulate loading state
      let resolvePromise: (value: Response) => void;
      const loadingPromise = new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });

      const mockFetch = vi.spyOn(global, 'fetch').mockReturnValue(loadingPromise);

      render(<GeneratePage />);

      // Enter valid text
      const textArea = screen.getByRole('textbox');
      fireEvent.change(textArea, { target: { value: 'Create a simple website with a header' } });

      // Submit form
      const generateButton = screen.getByRole('button', { name: /generate website/i });
      fireEvent.click(generateButton);

      // Should show loading indicator (status role indicates loading)
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // Should show cancel button
      expect(screen.getByRole('button', { name: /cancel generation/i })).toBeInTheDocument();

      // Resolve the promise to complete the test
      resolvePromise!({
        ok: true,
        body: createMockSSEStream([
          { event: 'done', data: { result: { html: '', css: '', title: 'Test' } } },
        ]),
      } as Response);

      mockFetch.mockRestore();
    });

    /**
     * Tests that generation stages are displayed
     * Validates: Requirement 10.3
     */
    it('displays generation stages during loading', async () => {
      // Use controlled promise to observe loading states
      let resolvePromise: (value: Response) => void;
      const loadingPromise = new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });

      const mockFetch = vi.spyOn(global, 'fetch').mockReturnValue(loadingPromise);

      render(<GeneratePage />);

      // Enter valid text
      const textArea = screen.getByRole('textbox');
      fireEvent.change(textArea, { target: { value: 'Create a simple website with a header' } });

      // Submit form
      const generateButton = screen.getByRole('button', { name: /generate website/i });
      fireEvent.click(generateButton);

      // Should show initial processing stage (status role indicates loading)
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // Resolve with streaming data
      resolvePromise!({
        ok: true,
        body: createMockSSEStream([
          { event: 'start', data: {} },
          { event: 'done', data: { result: { html: '', css: '', title: 'Test' } } },
        ]),
      } as Response);

      mockFetch.mockRestore();
    });
  });

  describe('Cancel Functionality', () => {
    /**
     * Tests that cancel button aborts generation
     * Validates: Requirement 10.3
     */
    it('cancels generation when cancel button is clicked', async () => {
      // Track if fetch was called
      let fetchCalled = false;

      // Create a mock fetch that responds to abort signal
      const mockFetch = vi.spyOn(global, 'fetch').mockImplementation((_, options) => {
        fetchCalled = true;
        return new Promise((resolve, reject) => {
          const signal = options?.signal as AbortSignal | undefined;
          if (signal) {
            if (signal.aborted) {
              reject(new DOMException('Aborted', 'AbortError'));
              return;
            }
            signal.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }
        });
      });

      render(<GeneratePage />);

      // Enter valid text
      const textArea = screen.getByRole('textbox');
      fireEvent.change(textArea, { target: { value: 'Create a simple website with a header' } });

      // Submit form
      const generateButton = screen.getByRole('button', { name: /generate website/i });
      fireEvent.click(generateButton);

      // Wait for loading state AND for fetch to be called (effect has run)
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(fetchCalled).toBe(true);
      });

      // Click cancel and wait for state updates
      const cancelButton = screen.getByRole('button', { name: /cancel generation/i });
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // Loading indicator should disappear
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      // Input should be preserved (not cleared)
      expect(textArea).toHaveValue('Create a simple website with a header');

      mockFetch.mockRestore();
    });

    /**
     * Tests that input is preserved after cancel
     * Validates: Requirement 10.3
     */
    it('preserves input after cancellation', async () => {
      // Track if fetch was called
      let fetchCalled = false;

      // Create a mock fetch that responds to abort signal
      const mockFetch = vi.spyOn(global, 'fetch').mockImplementation((_, options) => {
        fetchCalled = true;
        return new Promise((resolve, reject) => {
          const signal = options?.signal as AbortSignal | undefined;
          if (signal) {
            if (signal.aborted) {
              reject(new DOMException('Aborted', 'AbortError'));
              return;
            }
            signal.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }
        });
      });

      render(<GeneratePage />);

      const inputText = 'Create a simple website with a header and footer';

      // Enter valid text
      const textArea = screen.getByRole('textbox');
      fireEvent.change(textArea, { target: { value: inputText } });

      // Submit form
      const generateButton = screen.getByRole('button', { name: /generate website/i });
      fireEvent.click(generateButton);

      // Wait for loading state AND for fetch to be called (effect has run)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel generation/i })).toBeInTheDocument();
        expect(fetchCalled).toBe(true);
      });

      // Click cancel and wait for state updates
      const cancelButton = screen.getByRole('button', { name: /cancel generation/i });
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // Wait for loading to stop
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /cancel generation/i })).not.toBeInTheDocument();
      });

      // Input should still have the original text
      expect(textArea).toHaveValue(inputText);

      mockFetch.mockRestore();
    });
  });

  describe('Error Handling', () => {
    /**
     * Tests that error message can be dismissed
     * Validates: Requirement 10.3
     */
    it('allows dismissing error message', async () => {
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        text: vi.fn().mockResolvedValue('Generation failed'),
      } as unknown as Response);

      render(<GeneratePage />);

      // Enter valid text
      const textArea = screen.getByRole('textbox');
      fireEvent.change(textArea, { target: { value: 'Create a simple website with a header' } });

      // Submit form
      const generateButton = screen.getByRole('button', { name: /generate website/i });
      fireEvent.click(generateButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/generation failed/i)).toBeInTheDocument();
      });

      // Find and click dismiss button
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      fireEvent.click(dismissButton);

      // Error should be removed
      await waitFor(() => {
        expect(screen.queryByText(/generation failed/i)).not.toBeInTheDocument();
      });

      mockFetch.mockRestore();
    });

    /**
     * Tests that retry functionality works
     * Validates: Requirement 10.3
     */
    it('allows retrying after error', async () => {
      let callCount = 0;
      const mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() => {
        callCount++;
        // Always return error for simplicity
        return Promise.resolve({
          ok: false,
          status: 500,
        } as unknown as Response);
      });

      render(<GeneratePage />);

      // Enter valid text
      const textArea = screen.getByRole('textbox');
      fireEvent.change(textArea, { target: { value: 'Create a simple website with a header' } });

      // Submit form
      const generateButton = screen.getByRole('button', { name: /generate website/i });
      fireEvent.click(generateButton);

      // Wait for first fetch to be called
      await waitFor(() => {
        expect(callCount).toBe(1);
      });

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/generation failed/i)).toBeInTheDocument();
      });

      // Get retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });

      // Click retry
      fireEvent.click(retryButton);

      // Retry should trigger another fetch call
      await waitFor(() => {
        expect(callCount).toBe(2);
      }, { timeout: 3000 });

      mockFetch.mockRestore();
    });

    /**
     * Tests that input is preserved after error
     * Validates: Requirement 10.3
     */
    it('preserves input after error', async () => {
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        text: vi.fn().mockResolvedValue('Generation failed'),
      } as unknown as Response);

      const inputText = 'Create a simple website with a header and navigation';

      render(<GeneratePage />);

      // Enter valid text
      const textArea = screen.getByRole('textbox');
      fireEvent.change(textArea, { target: { value: inputText } });

      // Submit form
      const generateButton = screen.getByRole('button', { name: /generate website/i });
      fireEvent.click(generateButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/generation failed/i)).toBeInTheDocument();
      });

      // Input should still have the original text
      expect(textArea).toHaveValue(inputText);

      mockFetch.mockRestore();
    });
  });

  describe('Mode Switch Confirmation Dialog', () => {
    /**
     * Tests that confirmation dialog shows when switching modes with content
     * Validates: Requirement 10.3
     */
    it('shows confirmation dialog when switching modes with existing content', () => {
      render(<GeneratePage />);

      // Enter some text
      const textArea = screen.getByRole('textbox');
      fireEvent.change(textArea, { target: { value: 'Some content' } });

      // Try to switch to screenshot mode (using radio button)
      const screenshotRadio = screen.getByRole('radio', { name: /screenshot upload/i });
      fireEvent.click(screenshotRadio);

      // Confirmation dialog should appear (uses alertdialog role)
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText(/switch input mode/i)).toBeInTheDocument();
    });

    /**
     * Tests that confirming mode switch clears content
     * Validates: Requirement 10.3
     */
    it('clears content when mode switch is confirmed', async () => {
      render(<GeneratePage />);

      // Enter some text
      const textArea = screen.getByRole('textbox');
      fireEvent.change(textArea, { target: { value: 'Some content' } });

      // Try to switch to screenshot mode
      const screenshotRadio = screen.getByRole('radio', { name: /screenshot upload/i });
      fireEvent.click(screenshotRadio);

      // Confirm the switch
      const confirmButton = screen.getByRole('button', { name: /clear and switch/i });
      fireEvent.click(confirmButton);

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });

      // Screenshot mode should be active
      expect(screenshotRadio).toHaveAttribute('aria-checked', 'true');
    });

    /**
     * Tests that cancelling mode switch preserves content
     * Validates: Requirement 10.3
     */
    it('preserves content when mode switch is cancelled', async () => {
      render(<GeneratePage />);

      // Enter some text
      const textArea = screen.getByRole('textbox');
      fireEvent.change(textArea, { target: { value: 'Some content' } });

      // Try to switch to screenshot mode
      const screenshotRadio = screen.getByRole('radio', { name: /screenshot upload/i });
      fireEvent.click(screenshotRadio);

      // Cancel the switch (Cancel button in dialog, not the generation cancel)
      // Use text matching for the Cancel button in the dialog
      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      // Get the Cancel button from the dialog (not cancel generation)
      const dialogCancel = cancelButtons.find(btn => btn.textContent === 'Cancel');
      if (dialogCancel) {
        fireEvent.click(dialogCancel);
      }

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });

      // Text mode should still be active
      const textRadio = screen.getByRole('radio', { name: /text description/i });
      expect(textRadio).toHaveAttribute('aria-checked', 'true');

      // Content should be preserved
      expect(textArea).toHaveValue('Some content');
    });
  });

  describe('Accessibility', () => {
    /**
     * Tests that icons have proper accessibility attributes
     * Validates: Requirement 10.3
     */
    it('renders icons with aria-hidden for accessibility', () => {
      render(<GeneratePage />);

      const svgs = document.querySelectorAll('svg');
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });
    });

    /**
     * Tests that form elements have proper labels
     * Validates: Requirement 10.3
     */
    it('has proper labels for form elements', () => {
      render(<GeneratePage />);

      // Text input should be labeled
      expect(screen.getByRole('textbox')).toBeInTheDocument();

      // Radio buttons should be labeled (using radiogroup)
      expect(screen.getByRole('radiogroup', { name: /select input mode/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /text description/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /screenshot upload/i })).toBeInTheDocument();

      // Generate button should be labeled
      expect(screen.getByRole('button', { name: /generate website/i })).toBeInTheDocument();
    });
  });

  describe('Client-Only Directive Smoke Test', () => {
    /**
     * Smoke test: Confirms the Generate page retains 'use client' directive
     * and does not introduce server-side data fetching.
     * Validates: Requirement 3.7
     */
    it('has \'use client\' directive at the top of the source file', () => {
      const filePath = resolve(__dirname, 'page.tsx');
      const source = readFileSync(filePath, 'utf-8');
      const lines = source.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      // The 'use client' directive must appear as the first non-comment, non-empty statement
      // Skip leading block comments (/** ... */)
      let directiveFound = false;
      let inBlockComment = false;
      for (const line of lines) {
        if (inBlockComment) {
          if (line.includes('*/')) {
            inBlockComment = false;
          }
          continue;
        }
        if (line.startsWith('/*') || line.startsWith('/**')) {
          if (!line.includes('*/')) {
            inBlockComment = true;
          }
          continue;
        }
        if (line.startsWith('//')) {
          continue;
        }
        // First non-comment line should be 'use client'
        directiveFound = line === "'use client';" || line === '"use client";';
        break;
      }

      expect(directiveFound).toBe(true);
    });

    it('does not import server-side data fetching APIs', () => {
      const filePath = resolve(__dirname, 'page.tsx');
      const source = readFileSync(filePath, 'utf-8');

      // These are server-only APIs that should NOT be present in a client component
      const serverOnlyImports = [
        'unstable_cache',
        'firebase-admin',
        'getFirestore',
        'import { cache }',
        "'use server'",
        '"use server"',
      ];

      for (const serverImport of serverOnlyImports) {
        expect(source).not.toContain(serverImport);
      }
    });
  });
});
