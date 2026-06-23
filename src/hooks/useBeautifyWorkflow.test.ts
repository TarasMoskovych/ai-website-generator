/**
 * useBeautifyWorkflow Hook Tests
 *
 * Unit tests for the beautify workflow hook that encapsulates the complete
 * beautification workflow state and logic.
 *
 * Requirements tested:
 * - 6.1: Create hook at src/hooks/useBeautifyWorkflow.ts
 * - 6.2: Accept input parameters: websiteId, currentHtml, currentCss, originalPrompt
 * - 6.3: Manage states: isBeautifying, beautifyStage, streamingContent, beautifiedHtml, beautifiedCss, beautifyError
 * - 6.4: Manage dialog states: showBeautifyOptions, showPreviewComparison, showSaveOptions
 * - 6.5: Expose startBeautify function accepting BeautifyDialogResult
 * - 6.6: Expose cancelBeautify function that aborts request and resets state
 * - 6.7: Expose handleConfirm that closes options and calls startBeautify
 * - 6.8: Expose handleAccept that closes preview comparison and opens save options
 * - 6.9: Expose handleReject that closes preview comparison and resets beautified content
 * - 6.10: Expose handleRetry that resets error and opens options dialog
 * - 6.11: Expose handleDismiss that resets all states and closes dialogs
 *
 * This test file covers:
 * - Initial state values (Requirement 6.3, 6.4)
 * - Dialog state management (Requirement 6.4)
 * - All handler functions (Requirements 6.7, 6.8, 6.9, 6.10, 6.11)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useBeautifyWorkflow,
  type UseBeautifyWorkflowConfig,
} from './useBeautifyWorkflow';
import type { BeautifyDialogResult } from '@/types/beautify';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock useAuth
const mockGetIdToken = vi.fn().mockResolvedValue('mock-token');
vi.mock('@/components/auth', () => ({
  useAuth: () => ({
    getIdToken: mockGetIdToken,
    user: { uid: 'test-user' },
  }),
}));

// Mock useSSEStream
const mockStart = vi.fn();
const mockCancel = vi.fn();
vi.mock('./useSSEStream', () => ({
  useSSEStream: vi.fn(() => ({
    isStreaming: false,
    error: null,
    streamingContent: '',
    result: null,
    start: mockStart,
    cancel: mockCancel,
  })),
}));

// Mock fetch for API calls
let mockFetch: ReturnType<typeof vi.fn>;

/**
 * Helper to create a mock ReadableStream from SSE text chunks
 */
function createMockReadableStream(
  chunks: string[]
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let chunkIndex = 0;
  let aborted = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (aborted) {
        controller.close();
        return;
      }

      if (chunkIndex < chunks.length) {
        controller.enqueue(encoder.encode(chunks[chunkIndex]));
        chunkIndex++;
      } else {
        controller.close();
      }
    },
    cancel() {
      aborted = true;
    },
  });
}

/**
 * Helper to create mock Response with SSE stream
 */
function createMockResponse(
  chunks: string[],
  options?: { ok?: boolean; status?: number }
): Response {
  const stream = createMockReadableStream(chunks);
  return {
    ok: options?.ok ?? true,
    status: options?.status ?? 200,
    body: stream,
    text: async () => 'mock response text',
  } as Response;
}

/**
 * Helper to create a test config
 */
function createTestConfig(
  overrides?: Partial<UseBeautifyWorkflowConfig>
): UseBeautifyWorkflowConfig {
  return {
    websiteId: 'test-website-123',
    currentHtml: '<h1>Test Website</h1>',
    currentCss: 'h1 { color: blue; }',
    originalPrompt: 'Create a test website',
    ...overrides,
  };
}

/**
 * Helper to create BeautifyDialogResult
 */
function createDialogResult(
  overrides?: Partial<BeautifyDialogResult>
): BeautifyDialogResult {
  return {
    useReferenceImage: false,
    ...overrides,
  };
}

describe('useBeautifyWorkflow', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    mockGetIdToken.mockResolvedValue('mock-token');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  /**
   * Requirement 6.2: Accept input parameters: websiteId, currentHtml, currentCss, originalPrompt
   */
  describe('Configuration', () => {
    it('accepts config with all required parameters', () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      expect(result.current).toBeDefined();
      expect(typeof result.current.startBeautify).toBe('function');
      expect(typeof result.current.cancelBeautify).toBe('function');
    });

    it('accepts config with null originalPrompt', () => {
      const config = createTestConfig({ originalPrompt: null });
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      expect(result.current).toBeDefined();
    });
  });

  /**
   * Requirement 6.3: Manage states with initial values
   */
  describe('Initial State', () => {
    it('returns correct initial state values', () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      // Requirement 6.3: Initial state values
      expect(result.current.isBeautifying).toBe(false);
      expect(result.current.beautifyStage).toBeNull();
      expect(result.current.streamingContent).toBe('');
      expect(result.current.beautifiedHtml).toBe('');
      expect(result.current.beautifiedCss).toBe('');
      expect(result.current.beautifyError).toBeNull();
    });

    /**
     * Requirement 6.4: Manage dialog visibility states with initial values
     */
    it('returns correct initial dialog visibility states', () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      // Requirement 6.4: Dialog visibility initial values
      expect(result.current.showBeautifyOptions).toBe(false);
      expect(result.current.showPreviewComparison).toBe(false);
      expect(result.current.showSaveOptions).toBe(false);
    });

    it('exposes all required functions', () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      // Requirement 6.5, 6.6: Actions
      expect(typeof result.current.openOptionsDialog).toBe('function');
      expect(typeof result.current.startBeautify).toBe('function');
      expect(typeof result.current.cancelBeautify).toBe('function');

      // Requirements 6.7-6.11: Dialog handlers
      expect(typeof result.current.handleConfirm).toBe('function');
      expect(typeof result.current.handleAccept).toBe('function');
      expect(typeof result.current.handleReject).toBe('function');
      expect(typeof result.current.handleRetry).toBe('function');
      expect(typeof result.current.handleDismiss).toBe('function');
    });
  });

  /**
   * Dialog State Management Tests
   */
  describe('Dialog State Management', () => {
    it('openOptionsDialog sets showBeautifyOptions to true', () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      act(() => {
        result.current.openOptionsDialog();
      });

      expect(result.current.showBeautifyOptions).toBe(true);
    });

    /**
     * Requirement 6.8: handleAccept closes preview comparison and opens save options
     */
    it('handleAccept sets showPreviewComparison to false and showSaveOptions to true', () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      act(() => {
        result.current.handleAccept();
      });

      expect(result.current.showPreviewComparison).toBe(false);
      expect(result.current.showSaveOptions).toBe(true);
    });

    /**
     * Requirement 6.9: handleReject closes preview comparison and resets beautified content
     */
    it('handleReject sets showPreviewComparison to false and resets beautified content', () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      act(() => {
        result.current.handleReject();
      });

      expect(result.current.showPreviewComparison).toBe(false);
      expect(result.current.beautifiedHtml).toBe('');
      expect(result.current.beautifiedCss).toBe('');
    });

    /**
     * Requirement 6.10: handleRetry resets error and opens options dialog
     */
    it('handleRetry sets beautifyError to null and showBeautifyOptions to true', () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      act(() => {
        result.current.handleRetry();
      });

      expect(result.current.beautifyError).toBeNull();
      expect(result.current.showBeautifyOptions).toBe(true);
    });

    /**
     * Requirement 6.11: handleDismiss resets all states and closes dialogs
     */
    it('handleDismiss resets all beautification states to initial values', () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      // First, open a dialog to have some state
      act(() => {
        result.current.openOptionsDialog();
      });

      // Call handleDismiss
      act(() => {
        result.current.handleDismiss();
      });

      // All states should be reset
      expect(result.current.isBeautifying).toBe(false);
      expect(result.current.beautifyStage).toBeNull();
      expect(result.current.streamingContent).toBe('');
      expect(result.current.beautifiedHtml).toBe('');
      expect(result.current.beautifiedCss).toBe('');
      expect(result.current.beautifyError).toBeNull();

      // All dialogs should be closed
      expect(result.current.showBeautifyOptions).toBe(false);
      expect(result.current.showPreviewComparison).toBe(false);
      expect(result.current.showSaveOptions).toBe(false);
    });
  });

  /**
   * Requirement 6.5: startBeautify function accepting BeautifyDialogResult
   */
  describe('startBeautify', () => {
    it('resets state and completes beautification workflow', async () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      // Mock successful beautification stream
      const sseChunks = [
        'event: start\ndata: {}\n\n',
        'event: done\ndata: {"result": {"html": "<h1>Test</h1>", "css": "h1 {}"}}\n\n',
      ];
      mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

      // Start beautify and wait for completion
      await act(async () => {
        await result.current.startBeautify(createDialogResult());
      });

      // After completion, isBeautifying should be false
      expect(result.current.isBeautifying).toBe(false);
      // streamingContent should be empty (was reset at start)
      expect(result.current.streamingContent).toBe('');
      // beautifyError should be null (no error occurred)
      expect(result.current.beautifyError).toBeNull();
      // beautifiedHtml should be populated
      expect(result.current.beautifiedHtml).toBe('<h1>Test</h1>');
    });

    it('includes reference image in request when provided', async () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      // Mock fetch
      mockFetch.mockResolvedValueOnce(
        createMockResponse(['event: error\ndata: {"error": "test"}\n\n'])
      );

      const dialogResult = createDialogResult({
        useReferenceImage: true,
        referenceImage: 'base64encodedimage',
        referenceImageMimeType: 'image/png',
      });

      await act(async () => {
        await result.current.startBeautify(dialogResult);
      });

      // Verify fetch was called with reference image
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/beautify/stream',
        expect.objectContaining({
          body: expect.stringContaining('referenceImage'),
        })
      );
    });

    it('does not include reference image when useReferenceImage is false', async () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      // Mock fetch
      mockFetch.mockResolvedValueOnce(
        createMockResponse(['event: error\ndata: {"error": "test"}\n\n'])
      );

      const dialogResult = createDialogResult({
        useReferenceImage: false,
        referenceImage: 'base64encodedimage',
      });

      await act(async () => {
        await result.current.startBeautify(dialogResult);
      });

      // Verify fetch was called without reference image
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.referenceImage).toBeUndefined();
    });
  });

  /**
   * Requirement 6.6: cancelBeautify function aborts request without setting error
   */
  describe('cancelBeautify', () => {
    it('can be called safely when no stream is active', () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      // Should not throw when calling cancel without active stream
      expect(() => {
        act(() => {
          result.current.cancelBeautify();
        });
      }).not.toThrow();
    });

    it('sets isBeautifying to false when called', () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      act(() => {
        result.current.cancelBeautify();
      });

      expect(result.current.isBeautifying).toBe(false);
    });
  });

  /**
   * Requirement 6.15: Set beautifyError on failure
   */
  describe('Error Handling', () => {
    it('sets beautifyError when fetch fails', async () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      // Mock fetch to fail
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await result.current.startBeautify(createDialogResult());
      });

      expect(result.current.beautifyError).not.toBeNull();
      expect(result.current.isBeautifying).toBe(false);
    });

    it('sets beautifyError when response is not ok', async () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      // Mock fetch to return error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as Response);

      await act(async () => {
        await result.current.startBeautify(createDialogResult());
      });

      expect(result.current.beautifyError).not.toBeNull();
      expect(result.current.isBeautifying).toBe(false);
    });

    it('sets beautifyError when SSE error event is received', async () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      // Mock fetch to return error event
      const sseChunks = ['event: error\ndata: {"error": "AI processing failed"}\n\n'];
      mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

      await act(async () => {
        await result.current.startBeautify(createDialogResult());
      });

      expect(result.current.beautifyError).not.toBeNull();
      expect(result.current.isBeautifying).toBe(false);
    });
  });

  /**
   * Requirement 6.13: Stage transitions
   * Requirement 6.14: Successful completion
   */
  describe('Successful Beautification', () => {
    it('populates beautifiedHtml and beautifiedCss on successful done event', async () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      // Mock successful beautification stream
      const sseChunks = [
        'event: start\ndata: {}\n\n',
        'event: mode\ndata: {"mode": "enhance"}\n\n',
        'event: text\ndata: {"content": "Processing..."}\n\n',
        'event: done\ndata: {"result": {"html": "<h1>Beautified</h1>", "css": "h1 { color: green; }"}}\n\n',
      ];
      mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

      await act(async () => {
        await result.current.startBeautify(createDialogResult());
      });

      // Requirement 6.14: beautifiedHtml and beautifiedCss populated
      expect(result.current.beautifiedHtml).toBe('<h1>Beautified</h1>');
      expect(result.current.beautifiedCss).toBe('h1 { color: green; }');
      expect(result.current.showPreviewComparison).toBe(true);
      expect(result.current.isBeautifying).toBe(false);
    });

    it('sets beautifyStage to completing when mode is complete', async () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      // Mock stream with complete mode
      const sseChunks = [
        'event: start\ndata: {}\n\n',
        'event: mode\ndata: {"mode": "complete"}\n\n',
        'event: done\ndata: {"result": {"html": "<h1>Complete</h1>", "css": "h1 {}"}}\n\n',
      ];
      mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

      await act(async () => {
        await result.current.startBeautify(createDialogResult());
      });

      // Should complete successfully
      expect(result.current.beautifiedHtml).toBe('<h1>Complete</h1>');
    });
  });

  /**
   * Handler Integration Tests
   * Requirement 6.7: handleConfirm closes options and calls startBeautify
   */
  describe('Handler Integration', () => {
    it('handleConfirm sets showBeautifyOptions to false', async () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      // First, open the dialog
      act(() => {
        result.current.openOptionsDialog();
      });
      expect(result.current.showBeautifyOptions).toBe(true);

      // Mock fetch to return an error to prevent full workflow execution
      mockFetch.mockRejectedValueOnce(new Error('Test abort'));

      // Call handleConfirm
      await act(async () => {
        result.current.handleConfirm(createDialogResult());
      });

      // Dialog should be closed
      expect(result.current.showBeautifyOptions).toBe(false);
    });

    it('handleConfirm triggers startBeautify with provided options', async () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      // Mock fetch
      mockFetch.mockResolvedValueOnce(
        createMockResponse(['event: error\ndata: {"error": "test"}\n\n'])
      );

      const dialogResult = createDialogResult({
        useReferenceImage: true,
        referenceImage: 'testimage',
        referenceImageMimeType: 'image/jpeg',
      });

      await act(async () => {
        result.current.handleConfirm(dialogResult);
      });

      // Verify fetch was called (startBeautify was triggered)
      expect(mockFetch).toHaveBeenCalled();
    });

    it('handleAccept workflow: preview to save options', () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      // Call handleAccept
      act(() => {
        result.current.handleAccept();
      });

      expect(result.current.showPreviewComparison).toBe(false);
      expect(result.current.showSaveOptions).toBe(true);
    });

    it('handleReject clears beautified content', () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      act(() => {
        result.current.handleReject();
      });

      expect(result.current.beautifiedHtml).toBe('');
      expect(result.current.beautifiedCss).toBe('');
      expect(result.current.showPreviewComparison).toBe(false);
    });

    it('handleRetry opens options dialog for retry', () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      act(() => {
        result.current.handleRetry();
      });

      expect(result.current.beautifyError).toBeNull();
      expect(result.current.showBeautifyOptions).toBe(true);
    });

    it('handleDismiss resets entire workflow state', () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useBeautifyWorkflow(config));

      // Open dialog first
      act(() => {
        result.current.openOptionsDialog();
      });

      // Then dismiss
      act(() => {
        result.current.handleDismiss();
      });

      // Everything should be reset
      expect(result.current.isBeautifying).toBe(false);
      expect(result.current.beautifyStage).toBeNull();
      expect(result.current.streamingContent).toBe('');
      expect(result.current.beautifiedHtml).toBe('');
      expect(result.current.beautifiedCss).toBe('');
      expect(result.current.beautifyError).toBeNull();
      expect(result.current.showBeautifyOptions).toBe(false);
      expect(result.current.showPreviewComparison).toBe(false);
      expect(result.current.showSaveOptions).toBe(false);
    });
  });
});
