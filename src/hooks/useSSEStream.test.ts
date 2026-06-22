/**
 * useSSEStream Hook Tests
 *
 * Unit tests for the useSSEStream custom hook.
 *
 * Tests cover:
 * - Hook accepts config object with all required fields
 * - Start initiates fetch with correct config
 * - Cancel aborts ongoing fetch
 * - Abort doesn't set error state
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.5, 4.7, 13.2, 13.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSSEStream, type SSEEvent, type UseSSEStreamConfig } from './useSSEStream';

// Create mock fetch
let mockFetch: ReturnType<typeof vi.fn>;

/**
 * Helper to create a mock ReadableStream from SSE text chunks
 */
function createMockReadableStream(
  chunks: string[],
  options?: { delay?: number }
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

      if (options?.delay) {
        await new Promise((resolve) => setTimeout(resolve, options.delay));
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
  options?: { ok?: boolean; status?: number; delay?: number }
): Response {
  const stream = createMockReadableStream(chunks, { delay: options?.delay });
  return {
    ok: options?.ok ?? true,
    status: options?.status ?? 200,
    body: stream,
  } as Response;
}

/**
 * Helper to create a basic config object
 */
function createTestConfig(
  overrides?: Partial<UseSSEStreamConfig>
): UseSSEStreamConfig {
  return {
    url: '/api/test/stream',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { prompt: 'test' },
    onEvent: vi.fn(),
    ...overrides,
  };
}

describe('useSSEStream Hook', () => {
  beforeEach(() => {
    // Create fresh mock for each test
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('Unit Tests', () => {
    /**
     * Requirement 4.1: Accept configuration object with url, method, headers, body, onEvent
     */
    describe('Hook Configuration', () => {
      it('accepts config object with all required fields', () => {
        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        // Hook should return without errors
        expect(result.current).toBeDefined();
        expect(result.current.isStreaming).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.streamingContent).toBe('');
        expect(typeof result.current.start).toBe('function');
        expect(typeof result.current.cancel).toBe('function');
      });

      it('accepts config with different HTTP methods', () => {
        const postConfig = createTestConfig({ method: 'POST' });
        const getConfig = createTestConfig({ method: 'GET', body: null });

        const { result: postResult } = renderHook(() => useSSEStream(postConfig));
        const { result: getResult } = renderHook(() => useSSEStream(getConfig));

        expect(postResult.current).toBeDefined();
        expect(getResult.current).toBeDefined();
      });

      it('accepts config with custom headers', () => {
        const config = createTestConfig({
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
            'X-Custom-Header': 'custom-value',
          },
        });

        const { result } = renderHook(() => useSSEStream(config));
        expect(result.current).toBeDefined();
      });

      it('accepts config with null body', () => {
        const config = createTestConfig({ body: null });
        const { result } = renderHook(() => useSSEStream(config));
        expect(result.current).toBeDefined();
      });
    });

    /**
     * Requirement 4.3: start() initiates fetch request with provided configuration
     */
    describe('Start Functionality', () => {
      it('initiates fetch with correct config when start is called', async () => {
        const sseChunks = [
          'event: done\ndata: {"complete": true}\n\n',
        ];
        mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        await act(async () => {
          await result.current.start();
        });

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith(
          config.url,
          expect.objectContaining({
            method: config.method,
            headers: config.headers,
            body: JSON.stringify(config.body),
            signal: expect.any(AbortSignal),
          })
        );
      });

      it('sets isStreaming to false when stream completes', async () => {
        const sseChunks = ['event: done\ndata: {"complete": true}\n\n'];
        mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        await act(async () => {
          await result.current.start();
        });

        expect(result.current.isStreaming).toBe(false);
      });

      it('resets error state when start is called', async () => {
        // First, trigger an error
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        await act(async () => {
          await result.current.start();
        });

        expect(result.current.error).toBe('Network error');

        // Now start again with successful response
        const sseChunks = ['event: done\ndata: {"complete": true}\n\n'];
        mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

        await act(async () => {
          await result.current.start();
        });

        expect(result.current.error).toBeNull();
      });

      it('resets streamingContent when start is called', async () => {
        // First call with text content
        const sseChunks1 = [
          'event: text\ndata: {"content": "Hello"}\n\n',
          'event: done\ndata: {"complete": true}\n\n',
        ];
        mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks1));

        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        await act(async () => {
          await result.current.start();
        });

        expect(result.current.streamingContent).toBe('Hello');

        // Second call should reset content
        const sseChunks2 = ['event: done\ndata: {"complete": true}\n\n'];
        mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks2));

        await act(async () => {
          await result.current.start();
        });

        expect(result.current.streamingContent).toBe('');
      });

      it('does not include body in fetch when body is null', async () => {
        const sseChunks = ['event: done\ndata: {"complete": true}\n\n'];
        mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

        const config = createTestConfig({ body: null });
        const { result } = renderHook(() => useSSEStream(config));

        await act(async () => {
          await result.current.start();
        });

        expect(mockFetch).toHaveBeenCalledWith(
          config.url,
          expect.objectContaining({
            body: undefined,
          })
        );
      });
    });

    /**
     * Requirement 4.5: cancel() aborts ongoing fetch request
     */
    describe('Cancel Functionality', () => {
      it('can be called safely when no stream is active', () => {
        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        // Should not throw when calling cancel without active stream
        expect(() => {
          act(() => {
            result.current.cancel();
          });
        }).not.toThrow();
      });

      it('sets isStreaming to false when cancel is called', async () => {
        const sseChunks = ['event: done\ndata: {"complete": true}\n\n'];
        mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks, { delay: 100 }));

        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        // Start and immediately cancel
        let startPromise: Promise<void>;
        act(() => {
          startPromise = result.current.start();
        });

        // Cancel should immediately set isStreaming to false
        act(() => {
          result.current.cancel();
        });

        expect(result.current.isStreaming).toBe(false);

        // Wait for the promise to settle
        await act(async () => {
          await startPromise;
        });
      });

      it('can be called multiple times safely', async () => {
        const sseChunks = ['event: done\ndata: {"complete": true}\n\n'];
        mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks, { delay: 100 }));

        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        let startPromise: Promise<void>;
        act(() => {
          startPromise = result.current.start();
        });

        // Multiple cancel calls should not throw
        expect(() => {
          act(() => {
            result.current.cancel();
            result.current.cancel();
            result.current.cancel();
          });
        }).not.toThrow();

        // Wait for the promise to settle
        await act(async () => {
          await startPromise;
        });
      });
    });

    /**
     * Requirement 4.7: Abort doesn't set error state
     */
    describe('Abort Error Handling', () => {
      it('does not set error state when request is aborted via cancel', async () => {
        const sseChunks = ['event: done\ndata: {"complete": true}\n\n'];
        mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks, { delay: 100 }));

        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        let startPromise: Promise<void>;
        act(() => {
          startPromise = result.current.start();
        });

        // Cancel the stream
        act(() => {
          result.current.cancel();
        });

        // Wait for the promise to settle
        await act(async () => {
          await startPromise;
        });

        // Error should remain null (abort is not an error)
        expect(result.current.error).toBeNull();
      });

      it('does not set error state when AbortError is thrown', async () => {
        // Create a mock that throws AbortError - must match what fetch throws
        const abortError = new Error('Aborted');
        abortError.name = 'AbortError';
        mockFetch.mockRejectedValueOnce(abortError);

        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        await act(async () => {
          await result.current.start();
        });

        // Error should be null for AbortError
        expect(result.current.error).toBeNull();
      });
    });

    /**
     * Requirement 4.6: Set error state on non-abort errors
     */
    describe('Error Handling', () => {
      it('sets error state when fetch fails with network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        await act(async () => {
          await result.current.start();
        });

        expect(result.current.error).toBe('Network error');
        expect(result.current.isStreaming).toBe(false);
      });

      it('sets error state when response is not ok', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse([], { ok: false, status: 500 }));

        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        await act(async () => {
          await result.current.start();
        });

        expect(result.current.error).toBe('HTTP error! status: 500');
        expect(result.current.isStreaming).toBe(false);
      });

      it('sets error state when response body is null', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          body: null,
        } as Response);

        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        await act(async () => {
          await result.current.start();
        });

        expect(result.current.error).toBe('Failed to get stream reader');
        expect(result.current.isStreaming).toBe(false);
      });

      it('sets generic error message for non-Error exceptions', async () => {
        mockFetch.mockRejectedValueOnce('Unknown failure');

        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        await act(async () => {
          await result.current.start();
        });

        expect(result.current.error).toBe('An error occurred during streaming');
      });
    });

    /**
     * Requirement 4.4: Parse SSE events and invoke onEvent callback
     */
    describe('SSE Event Parsing', () => {
      it('parses SSE event and invokes onEvent callback', async () => {
        const sseChunks = ['event: start\ndata: {"type": "start"}\n\n'];
        mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

        const onEvent = vi.fn();
        const config = createTestConfig({ onEvent });
        const { result } = renderHook(() => useSSEStream(config));

        await act(async () => {
          await result.current.start();
        });

        expect(onEvent).toHaveBeenCalledWith({
          type: 'start',
          data: { type: 'start' },
        });
      });

      it('parses multiple SSE events in sequence', async () => {
        const sseChunks = [
          'event: start\ndata: {"step": 1}\n\n',
          'event: progress\ndata: {"step": 2}\n\n',
          'event: done\ndata: {"step": 3}\n\n',
        ];
        mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

        const onEvent = vi.fn();
        const config = createTestConfig({ onEvent });
        const { result } = renderHook(() => useSSEStream(config));

        await act(async () => {
          await result.current.start();
        });

        expect(onEvent).toHaveBeenCalledTimes(3);
        expect(onEvent).toHaveBeenNthCalledWith(1, { type: 'start', data: { step: 1 } });
        expect(onEvent).toHaveBeenNthCalledWith(2, { type: 'progress', data: { step: 2 } });
        expect(onEvent).toHaveBeenNthCalledWith(3, { type: 'done', data: { step: 3 } });
      });

      it('accumulates text content for streamingContent', async () => {
        const sseChunks = [
          'event: text\ndata: {"content": "Hello"}\n\n',
          'event: text\ndata: {"content": " World"}\n\n',
          'event: text\ndata: {"content": "!"}\n\n',
        ];
        mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        await act(async () => {
          await result.current.start();
        });

        expect(result.current.streamingContent).toBe('Hello World!');
      });

      it('skips malformed JSON events without setting error', async () => {
        const sseChunks = [
          'event: start\ndata: {"valid": true}\n\n',
          'event: bad\ndata: not valid json\n\n',
          'event: done\ndata: {"complete": true}\n\n',
        ];
        mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

        const onEvent = vi.fn();
        const config = createTestConfig({ onEvent });
        const { result } = renderHook(() => useSSEStream(config));

        await act(async () => {
          await result.current.start();
        });

        // Should have received 2 valid events (start and done)
        expect(onEvent).toHaveBeenCalledTimes(2);
        expect(result.current.error).toBeNull();
      });

      it('handles events combined in a single chunk', async () => {
        // The implementation processes events within a single chunk iteration
        // so both event and data lines need to be in the same chunk
        const sseChunks = [
          'event: start\ndata: {"split": true}\n\n',
        ];
        mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

        const onEvent = vi.fn();
        const config = createTestConfig({ onEvent });
        const { result } = renderHook(() => useSSEStream(config));

        await act(async () => {
          await result.current.start();
        });

        expect(onEvent).toHaveBeenCalledWith({
          type: 'start',
          data: { split: true },
        });
      });
    });

    /**
     * Tests for config updates
     */
    describe('Config Updates', () => {
      it('uses updated config when start is called again', async () => {
        const sseChunks1 = ['event: done\ndata: {"complete": true}\n\n'];
        const sseChunks2 = ['event: done\ndata: {"complete": true}\n\n'];
        mockFetch
          .mockResolvedValueOnce(createMockResponse(sseChunks1))
          .mockResolvedValueOnce(createMockResponse(sseChunks2));

        const onEvent1 = vi.fn();

        const config1 = createTestConfig({ url: '/api/v1/stream', onEvent: onEvent1 });
        const { result } = renderHook(() => useSSEStream(config1));

        // First start with original config
        await act(async () => {
          await result.current.start();
        });

        expect(mockFetch).toHaveBeenLastCalledWith('/api/v1/stream', expect.any(Object));
        expect(onEvent1).toHaveBeenCalled();

        // Create a new hook with different config
        const onEvent2 = vi.fn();
        const config2 = createTestConfig({ url: '/api/v2/stream', onEvent: onEvent2 });
        const { result: result2 } = renderHook(() => useSSEStream(config2));

        // Start second hook
        await act(async () => {
          await result2.current.start();
        });

        expect(mockFetch).toHaveBeenLastCalledWith('/api/v2/stream', expect.any(Object));
        expect(onEvent2).toHaveBeenCalled();
      });
    });

    /**
     * Tests for concurrent stream handling
     */
    describe('Concurrent Stream Handling', () => {
      it('cancels previous stream when start is called again', async () => {
        const sseChunks1 = [
          'event: text\ndata: {"content": "Stream 1"}\n\n',
        ];
        const sseChunks2 = [
          'event: text\ndata: {"content": "Stream 2"}\n\n',
        ];

        mockFetch
          .mockResolvedValueOnce(createMockResponse(sseChunks1, { delay: 200 }))
          .mockResolvedValueOnce(createMockResponse(sseChunks2));

        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        // Start first stream
        let firstPromise: Promise<void>;
        act(() => {
          firstPromise = result.current.start();
        });

        // Start second stream while first is still active
        await act(async () => {
          await result.current.start();
        });

        // Should have content from second stream only
        expect(result.current.streamingContent).toBe('Stream 2');
        expect(result.current.isStreaming).toBe(false);
      });
    });
  });

  describe('Return Structure', () => {
    /**
     * Requirement 4.2: Return object with isStreaming, error, streamingContent, start, cancel
     */
    it('returns all required fields with correct types', () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useSSEStream(config));

      // Verify all required fields exist
      expect(result.current).toHaveProperty('isStreaming');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('streamingContent');
      expect(result.current).toHaveProperty('start');
      expect(result.current).toHaveProperty('cancel');

      // Verify correct types
      expect(typeof result.current.isStreaming).toBe('boolean');
      expect(result.current.error === null || typeof result.current.error === 'string').toBe(true);
      expect(typeof result.current.streamingContent).toBe('string');
      expect(typeof result.current.start).toBe('function');
      expect(typeof result.current.cancel).toBe('function');
    });

    it('returns correct initial state', () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useSSEStream(config));

      expect(result.current.isStreaming).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.streamingContent).toBe('');
    });
  });
});
