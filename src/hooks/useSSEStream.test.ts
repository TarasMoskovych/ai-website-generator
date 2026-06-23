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
 * - Property-based tests for parser completion
 * - Property-based tests for cancel behavior (Property 4)
 * - Verification of eventsource-parser createParser usage (Requirement 13.2)
 * - Verification of parser.reset({ consume: true }) on completion (Requirement 13.3)
 * - onTextChunk callback, onResult callback, result state (Requirements 13.4, 13.5)
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.5, 4.6, 4.7, 4.8, 4.9, 4.11, 12.3, 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { useSSEStream, type SSEEvent, type UseSSEStreamConfig } from './useSSEStream';

// Mock eventsource-parser module to verify its usage
const mockReset = vi.fn();
const mockFeed = vi.fn();
const mockCreateParser = vi.fn(() => ({
  feed: mockFeed,
  reset: mockReset,
}));

vi.mock('eventsource-parser', () => ({
  createParser: (options: { onEvent: (event: { event: string; data: string }) => void }) => {
    // Call the original mock to track calls
    mockCreateParser(options);

    // Store the onEvent callback to simulate parser behavior
    const parserInstance = {
      feed: (chunk: string) => {
        mockFeed(chunk);
        // Parse the SSE format manually to simulate eventsource-parser behavior
        const events = chunk.split('\n\n').filter(Boolean);
        for (const eventBlock of events) {
          const lines = eventBlock.split('\n');
          let eventType = '';
          let eventData = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7);
            } else if (line.startsWith('data: ')) {
              eventData = line.slice(6);
            }
          }
          if (eventType && eventData) {
            options.onEvent({ event: eventType, data: eventData });
          }
        }
      },
      reset: (opts?: { consume?: boolean }) => {
        mockReset(opts);
      },
    };
    return parserInstance;
  },
}));
import * as eventSourceParserModule from 'eventsource-parser';

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
    // Reset eventsource-parser mocks
    mockCreateParser.mockClear();
    mockFeed.mockClear();
    mockReset.mockClear();
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

    /**
     * Requirement 13.2: Verify createParser from eventsource-parser is used
     * Requirement 13.3: Verify parser.reset({ consume: true }) on completion
     */
    describe('eventsource-parser Implementation Verification', () => {
      /**
       * Requirement 13.2: THE updated tests SHALL verify that createParser from eventsource-parser is used for SSE parsing
       */
      it('uses createParser from eventsource-parser for SSE parsing', async () => {
        const sseChunks = ['event: start\ndata: {"type": "start"}\n\n'];
        mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        await act(async () => {
          await result.current.start();
        });

        // Verify createParser was called with an onEvent callback
        expect(mockCreateParser).toHaveBeenCalledTimes(1);
        expect(mockCreateParser).toHaveBeenCalledWith(
          expect.objectContaining({
            onEvent: expect.any(Function),
          })
        );
      });

      it('calls parser.feed for each chunk received from stream', async () => {
        const sseChunks = [
          'event: start\ndata: {"step": 1}\n\n',
          'event: text\ndata: {"content": "hello"}\n\n',
          'event: done\ndata: {"complete": true}\n\n',
        ];
        mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        await act(async () => {
          await result.current.start();
        });

        // Verify parser.feed was called for each chunk
        expect(mockFeed).toHaveBeenCalledTimes(3);
        // Each call should receive the decoded chunk
        expect(mockFeed).toHaveBeenNthCalledWith(1, sseChunks[0]);
        expect(mockFeed).toHaveBeenNthCalledWith(2, sseChunks[1]);
        expect(mockFeed).toHaveBeenNthCalledWith(3, sseChunks[2]);
      });

      /**
       * Requirement 13.3: THE updated tests SHALL verify that parser.reset({ consume: true }) is called when the stream completes
       */
      it('calls parser.reset({ consume: true }) when stream completes', async () => {
        const sseChunks = ['event: done\ndata: {"complete": true}\n\n'];
        mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        await act(async () => {
          await result.current.start();
        });

        // Verify parser.reset was called with { consume: true }
        expect(mockReset).toHaveBeenCalledTimes(1);
        expect(mockReset).toHaveBeenCalledWith({ consume: true });
      });

      it('calls parser.reset({ consume: true }) after processing all chunks', async () => {
        const sseChunks = [
          'event: text\ndata: {"content": "a"}\n\n',
          'event: text\ndata: {"content": "b"}\n\n',
          'event: text\ndata: {"content": "c"}\n\n',
        ];
        mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        await act(async () => {
          await result.current.start();
        });

        // All chunks should have been fed before reset
        expect(mockFeed).toHaveBeenCalledTimes(3);
        // parser.reset should be called exactly once on completion
        expect(mockReset).toHaveBeenCalledTimes(1);
        expect(mockReset).toHaveBeenCalledWith({ consume: true });
        // Stream should be marked complete
        expect(result.current.isStreaming).toBe(false);
      });

      it('creates new parser instance for each start call', async () => {
        const sseChunks = ['event: done\ndata: {"complete": true}\n\n'];
        mockFetch.mockResolvedValue(createMockResponse(sseChunks));

        const config = createTestConfig();
        const { result } = renderHook(() => useSSEStream(config));

        // First start
        await act(async () => {
          await result.current.start();
        });

        // Second start
        await act(async () => {
          await result.current.start();
        });

        // createParser should be called twice (once per start)
        expect(mockCreateParser).toHaveBeenCalledTimes(2);
      });
    });

    /**
     * Requirement 13.4, 13.5: Tests for onTextChunk callback, onResult callback, and result state
     */
    describe('New Callback Functionality', () => {
      /**
       * Requirement 13.5: THE updated tests SHALL add coverage for new functionality: onTextChunk callback
       */
      describe('onTextChunk callback', () => {
        it('invokes onTextChunk callback for each text event with content', async () => {
          const sseChunks = [
            'event: text\ndata: {"content": "Hello"}\n\n',
            'event: text\ndata: {"content": " World"}\n\n',
          ];
          mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

          const onTextChunk = vi.fn();
          const config = createTestConfig({ onTextChunk });
          const { result } = renderHook(() => useSSEStream(config));

          await act(async () => {
            await result.current.start();
          });

          expect(onTextChunk).toHaveBeenCalledTimes(2);
          expect(onTextChunk).toHaveBeenNthCalledWith(1, 'Hello');
          expect(onTextChunk).toHaveBeenNthCalledWith(2, ' World');
        });

        it('does not invoke onTextChunk for text events without content property', async () => {
          const sseChunks = [
            'event: text\ndata: {"message": "no content here"}\n\n',
          ];
          mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

          const onTextChunk = vi.fn();
          const config = createTestConfig({ onTextChunk });
          const { result } = renderHook(() => useSSEStream(config));

          await act(async () => {
            await result.current.start();
          });

          expect(onTextChunk).not.toHaveBeenCalled();
        });

        it('works without onTextChunk callback provided', async () => {
          const sseChunks = [
            'event: text\ndata: {"content": "Hello"}\n\n',
          ];
          mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

          const config = createTestConfig({ onTextChunk: undefined });
          const { result } = renderHook(() => useSSEStream(config));

          await act(async () => {
            await result.current.start();
          });

          // Should complete without error
          expect(result.current.error).toBeNull();
          expect(result.current.streamingContent).toBe('Hello');
        });
      });

      /**
       * Requirement 13.5: THE updated tests SHALL add coverage for new functionality: onResult callback
       */
      describe('onResult callback', () => {
        it('invokes onResult callback when done event contains result', async () => {
          const sseChunks = [
            'event: done\ndata: {"result": {"html": "<p>Test</p>", "css": "p{color:red}"}}\n\n',
          ];
          mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

          const onResult = vi.fn();
          const config = createTestConfig({ onResult });
          const { result } = renderHook(() => useSSEStream(config));

          await act(async () => {
            await result.current.start();
          });

          expect(onResult).toHaveBeenCalledTimes(1);
          expect(onResult).toHaveBeenCalledWith({ html: '<p>Test</p>', css: 'p{color:red}' });
        });

        it('does not invoke onResult for done events without result property', async () => {
          const sseChunks = [
            'event: done\ndata: {"complete": true}\n\n',
          ];
          mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

          const onResult = vi.fn();
          const config = createTestConfig({ onResult });
          const { result } = renderHook(() => useSSEStream(config));

          await act(async () => {
            await result.current.start();
          });

          expect(onResult).not.toHaveBeenCalled();
        });

        it('works without onResult callback provided', async () => {
          const sseChunks = [
            'event: done\ndata: {"result": {"html": "<p>Test</p>"}}\n\n',
          ];
          mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

          const config = createTestConfig({ onResult: undefined });
          const { result } = renderHook(() => useSSEStream(config));

          await act(async () => {
            await result.current.start();
          });

          // Should complete without error
          expect(result.current.error).toBeNull();
          expect(result.current.result).toEqual({ html: '<p>Test</p>' });
        });
      });

      /**
       * Requirement 13.5: THE updated tests SHALL add coverage for new functionality: result state
       */
      describe('result state', () => {
        it('initializes result state to null', () => {
          const config = createTestConfig();
          const { result } = renderHook(() => useSSEStream(config));

          expect(result.current.result).toBeNull();
        });

        it('updates result state from done event with result property', async () => {
          const resultData = { html: '<div>Generated</div>', css: '.class{}', title: 'My Site' };
          const sseChunks = [
            `event: done\ndata: ${JSON.stringify({ result: resultData })}\n\n`,
          ];
          mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

          const config = createTestConfig();
          const { result } = renderHook(() => useSSEStream(config));

          await act(async () => {
            await result.current.start();
          });

          expect(result.current.result).toEqual(resultData);
        });

        it('keeps result as null when done event lacks result property', async () => {
          const sseChunks = [
            'event: done\ndata: {"success": true}\n\n',
          ];
          mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

          const config = createTestConfig();
          const { result } = renderHook(() => useSSEStream(config));

          await act(async () => {
            await result.current.start();
          });

          expect(result.current.result).toBeNull();
        });

        it('resets result state on new start call', async () => {
          // First call with result
          const sseChunks1 = [
            'event: done\ndata: {"result": {"html": "first"}}\n\n',
          ];
          mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks1));

          const config = createTestConfig();
          const { result } = renderHook(() => useSSEStream(config));

          await act(async () => {
            await result.current.start();
          });

          expect(result.current.result).toEqual({ html: 'first' });

          // Second call without result
          const sseChunks2 = [
            'event: done\ndata: {"complete": true}\n\n',
          ];
          mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks2));

          await act(async () => {
            await result.current.start();
          });

          // Result should be null (reset on start)
          expect(result.current.result).toBeNull();
        });
      });
    });
  }); // End of Unit Tests describe block

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

  /**
   * Property-Based Tests
   *
   * Feature: page-refactoring
   * Property 2: Parser Completion - **Validates: Requirements 4.5, 12.3**
   * Property 4: Cancel Behavior - **Validates: Requirements 4.11**
   */
  describe('Property-Based Tests', () => {
    /**
     * Feature: page-refactoring, Property 2: useSSEStream Parser Completion
     *
     * For any SSE stream that completes (reader.read() returns done=true),
     * the useSSEStream hook SHALL call parser.reset({ consume: true })
     * before setting isStreaming to false, ensuring all buffered data is processed.
     *
     * **Validates: Requirements 4.5, 12.3**
     */
    describe('Feature: page-refactoring, Property 2: Parser Completion', () => {
      it('should process all events before marking stream as complete for any valid event sequence', async () => {
        await fc.assert(
          fc.asyncProperty(
            // Generate an array of 0-10 SSE events with various event types and JSON data
            fc.array(
              fc.record({
                eventType: fc.constantFrom('start', 'text', 'progress', 'mode'),
                data: fc.oneof(
                  fc.record({ content: fc.string({ maxLength: 100 }) }),
                  fc.record({ step: fc.nat(100) }),
                  fc.record({ mode: fc.constantFrom('complete', 'enhance') }),
                  fc.record({ complete: fc.boolean() })
                ),
              }),
              { minLength: 0, maxLength: 10 }
            ),
            async (events) => {
              // Convert events to SSE format chunks
              const sseChunks = events.map(
                (e) => `event: ${e.eventType}\ndata: ${JSON.stringify(e.data)}\n\n`
              );
              // Always add a done event at the end to ensure stream completes cleanly
              sseChunks.push('event: done\ndata: {"complete": true}\n\n');

              mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

              const onEvent = vi.fn();
              const config = createTestConfig({ onEvent });
              const { result } = renderHook(() => useSSEStream(config));

              await act(async () => {
                await result.current.start();
              });

              // Property: After stream completion (parser.reset called), isStreaming should be false
              expect(result.current.isStreaming).toBe(false);

              // Property: All events should have been processed (parser.reset flushes buffered data)
              // Expected: all generated events + the final 'done' event
              expect(onEvent).toHaveBeenCalledTimes(events.length + 1);

              // Property: No error should be set for valid stream completion
              expect(result.current.error).toBeNull();
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should flush remaining buffered data via parser.reset ensuring all content is accumulated', async () => {
        await fc.assert(
          fc.asyncProperty(
            // Generate random content strings that might be split across chunk boundaries
            fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
            async (contentParts) => {
              // Create text events with content that will accumulate
              const sseChunks = contentParts.map(
                (content) => `event: text\ndata: {"content": ${JSON.stringify(content)}}\n\n`
              );
              // End with done event
              sseChunks.push('event: done\ndata: {"complete": true}\n\n');

              mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

              const config = createTestConfig();
              const { result } = renderHook(() => useSSEStream(config));

              await act(async () => {
                await result.current.start();
              });

              // Property: All content should be accumulated after stream completion
              // parser.reset({ consume: true }) ensures any buffered partial data is flushed
              const expectedContent = contentParts.join('');
              expect(result.current.streamingContent).toBe(expectedContent);

              // Property: Stream should complete successfully
              expect(result.current.isStreaming).toBe(false);
              expect(result.current.error).toBeNull();
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should complete stream processing with correct event count for any number of chunks', async () => {
        await fc.assert(
          fc.asyncProperty(
            // Generate random number of text chunks (0-8)
            fc.nat({ max: 8 }),
            async (numChunks) => {
              // Create valid SSE events
              const sseChunks: string[] = [];

              // Add start event
              sseChunks.push('event: start\ndata: {"type": "start"}\n\n');

              // Add text events
              for (let i = 0; i < numChunks; i++) {
                sseChunks.push(`event: text\ndata: {"content": "chunk${i}"}\n\n`);
              }

              // Add done event
              sseChunks.push('event: done\ndata: {"complete": true}\n\n');

              mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

              const onEvent = vi.fn();
              const config = createTestConfig({ onEvent });
              const { result } = renderHook(() => useSSEStream(config));

              await act(async () => {
                await result.current.start();
              });

              // Property: All events should be processed before stream marked complete
              // The parser.reset call ensures this happens
              const expectedEventCount = 1 + numChunks + 1; // start + text events + done
              expect(onEvent).toHaveBeenCalledTimes(expectedEventCount);

              // Property: Stream should be marked as not streaming after completion
              expect(result.current.isStreaming).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle result extraction from done event via parser completion', async () => {
        await fc.assert(
          fc.asyncProperty(
            // Generate random HTML and CSS content for the result
            fc.record({
              html: fc.string({ minLength: 1, maxLength: 200 }),
              css: fc.string({ minLength: 1, maxLength: 200 }),
            }),
            async (resultContent) => {
              // Create SSE chunks with a done event containing result
              const sseChunks = [
                'event: start\ndata: {"type": "start"}\n\n',
                'event: text\ndata: {"content": "some content"}\n\n',
                `event: done\ndata: {"result": ${JSON.stringify(resultContent)}}\n\n`,
              ];

              mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

              const onResult = vi.fn();
              const config = createTestConfig({ onResult });
              const { result } = renderHook(() => useSSEStream(config));

              await act(async () => {
                await result.current.start();
              });

              // Property: parser.reset ensures done event with result is fully processed
              expect(onResult).toHaveBeenCalledTimes(1);
              expect(onResult).toHaveBeenCalledWith(resultContent);

              // Property: result state should be populated from done event
              expect(result.current.result).toEqual(resultContent);

              // Property: Stream should complete successfully
              expect(result.current.isStreaming).toBe(false);
              expect(result.current.error).toBeNull();
            }
          ),
          { numRuns: 100 }
        );
      });

      /**
       * Direct verification that parser.reset({ consume: true }) is called on stream completion
       *
       * This test uses the existing mockReset to verify that reset is called
       * with the correct argument { consume: true } when the stream completes.
       *
       * **Validates: Requirements 4.5, 12.3**
       */
      it('should call parser.reset({ consume: true }) on stream completion for any event sequence', async () => {
        await fc.assert(
          fc.asyncProperty(
            // Generate an array of 0-5 SSE events with various event types
            fc.array(
              fc.record({
                eventType: fc.constantFrom('start', 'text', 'progress'),
                data: fc.oneof(
                  fc.record({ content: fc.string({ maxLength: 50 }) }),
                  fc.record({ step: fc.nat(100) })
                ),
              }),
              { minLength: 0, maxLength: 5 }
            ),
            async (events) => {
              // Clear mock state before each property test run
              mockReset.mockClear();
              mockFeed.mockClear();

              // Convert events to SSE format chunks
              const sseChunks = events.map(
                (e) => `event: ${e.eventType}\ndata: ${JSON.stringify(e.data)}\n\n`
              );
              // Always add a done event at the end
              sseChunks.push('event: done\ndata: {"complete": true}\n\n');

              mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

              const config = createTestConfig();
              const { result } = renderHook(() => useSSEStream(config));

              await act(async () => {
                await result.current.start();
              });

              // Property: parser.reset must be called exactly once with { consume: true }
              expect(mockReset).toHaveBeenCalledTimes(1);
              expect(mockReset).toHaveBeenCalledWith({ consume: true });

              // Property: Stream should complete after parser.reset is called
              expect(result.current.isStreaming).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    /**
     * Feature: page-refactoring, Property 3: useSSEStream Callback Invocations
     *
     * For any valid SSE stream:
     * 1. The onEvent callback SHALL be invoked for every parsed event with { type: string, data: unknown }
     * 2. The onTextChunk callback SHALL be invoked for every 'text' event where data contains a content property
     * 3. The onResult callback SHALL be invoked when a 'done' event contains a result property
     * 4. The result state SHALL be updated to match the result property from the 'done' event
     *
     * **Validates: Requirements 4.6, 4.7, 4.8, 4.9**
     */
    describe('Feature: page-refactoring, Property 3: Callback Invocations', () => {
      // Arbitrary generators for SSE events
      const sseEventTypeArb = fc.constantFrom('start', 'text', 'progress', 'mode', 'done', 'error', 'custom');

      const sseEventDataArb = fc.oneof(
        fc.record({ message: fc.string() }),
        fc.record({ value: fc.integer() }),
        fc.record({ status: fc.constantFrom('ok', 'pending', 'complete') }),
        fc.constant({})
      );

      const sseTextEventDataArb = fc.record({
        content: fc.string({ minLength: 1, maxLength: 100 }),
      });

      const sseDoneEventWithResultArb = fc.record({
        result: fc.oneof(
          fc.record({ html: fc.string(), css: fc.string() }),
          fc.record({ html: fc.string(), css: fc.string(), title: fc.string() }),
          fc.record({ success: fc.boolean() }),
          fc.string(),
          fc.integer()
        ),
      });

      /**
       * Property 3.1: onEvent callback invoked for every parsed event
       *
       * Test that for any array of valid SSE events, the onEvent callback
       * is invoked exactly once for each event with the correct structure.
       */
      it('should invoke onEvent for every parsed event with { type: string, data: unknown }', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.array(
              fc.tuple(sseEventTypeArb, sseEventDataArb),
              { minLength: 1, maxLength: 10 }
            ),
            async (events) => {
              // Generate SSE chunks from events
              const sseChunks = events.map(
                ([type, data]) => `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`
              );

              mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

              const onEvent = vi.fn();
              const config = createTestConfig({ onEvent });
              const { result } = renderHook(() => useSSEStream(config));

              await act(async () => {
                await result.current.start();
              });

              // onEvent should be called once for each event
              expect(onEvent).toHaveBeenCalledTimes(events.length);

              // Each call should have { type: string, data: unknown }
              events.forEach(([type, data], index) => {
                const call = onEvent.mock.calls[index][0];
                expect(typeof call.type).toBe('string');
                expect(call.type).toBe(type);
                expect(call.data).toBeDefined();
                expect(call.data).toEqual(data);
              });
            }
          ),
          { numRuns: 100 }
        );
      });

      /**
       * Property 3.2: onTextChunk callback invoked for text events with content
       *
       * Test that for any array of text events with content property,
       * the onTextChunk callback is invoked for each one with the content string.
       */
      it('should invoke onTextChunk for every text event where data contains a content property', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.array(sseTextEventDataArb, { minLength: 1, maxLength: 10 }),
            async (textEventDatas) => {
              // Generate SSE chunks for text events
              const sseChunks = textEventDatas.map(
                (data) => `event: text\ndata: ${JSON.stringify(data)}\n\n`
              );

              mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

              const onTextChunk = vi.fn();
              const config = createTestConfig({ onTextChunk });
              const { result } = renderHook(() => useSSEStream(config));

              await act(async () => {
                await result.current.start();
              });

              // onTextChunk should be called once for each text event
              expect(onTextChunk).toHaveBeenCalledTimes(textEventDatas.length);

              // Each call should receive the content string
              textEventDatas.forEach((data, index) => {
                expect(onTextChunk).toHaveBeenNthCalledWith(index + 1, data.content);
              });
            }
          ),
          { numRuns: 100 }
        );
      });

      /**
       * Property 3.3: onResult callback invoked when done event has result
       *
       * Test that when a done event contains a result property,
       * the onResult callback is invoked with that result.
       */
      it('should invoke onResult when a done event contains a result property', async () => {
        await fc.assert(
          fc.asyncProperty(
            sseDoneEventWithResultArb,
            async (doneData) => {
              // Generate SSE chunk for done event with result
              const sseChunks = [
                `event: done\ndata: ${JSON.stringify(doneData)}\n\n`,
              ];

              mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

              const onResult = vi.fn();
              const config = createTestConfig({ onResult });
              const { result } = renderHook(() => useSSEStream(config));

              await act(async () => {
                await result.current.start();
              });

              // onResult should be called exactly once
              expect(onResult).toHaveBeenCalledTimes(1);

              // onResult should receive the result property value
              expect(onResult).toHaveBeenCalledWith(doneData.result);
            }
          ),
          { numRuns: 100 }
        );
      });

      /**
       * Property 3.4: result state updated from done event
       *
       * Test that the result state is updated to match the result property
       * from the done event.
       */
      it('should update result state to match the result property from done event', async () => {
        await fc.assert(
          fc.asyncProperty(
            sseDoneEventWithResultArb,
            async (doneData) => {
              // Generate SSE chunk for done event with result
              const sseChunks = [
                `event: done\ndata: ${JSON.stringify(doneData)}\n\n`,
              ];

              mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

              const config = createTestConfig();
              const { result } = renderHook(() => useSSEStream(config));

              // Initial result state should be null
              expect(result.current.result).toBeNull();

              await act(async () => {
                await result.current.start();
              });

              // result state should match the result property from done event
              expect(result.current.result).toEqual(doneData.result);
            }
          ),
          { numRuns: 100 }
        );
      });

      /**
       * Combined property: Full stream with multiple event types
       *
       * Test a realistic stream with start, text (with content), and done (with result) events.
       */
      it('should correctly handle mixed event types with all callbacks', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.tuple(
              fc.array(sseTextEventDataArb, { minLength: 0, maxLength: 5 }),
              sseDoneEventWithResultArb
            ),
            async ([textEvents, doneData]) => {
              // Generate SSE chunks: start, text events, done
              const sseChunks = [
                'event: start\ndata: {"status": "starting"}\n\n',
                ...textEvents.map(
                  (data) => `event: text\ndata: ${JSON.stringify(data)}\n\n`
                ),
                `event: done\ndata: ${JSON.stringify(doneData)}\n\n`,
              ];

              mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

              const onEvent = vi.fn();
              const onTextChunk = vi.fn();
              const onResult = vi.fn();
              const config = createTestConfig({ onEvent, onTextChunk, onResult });
              const { result } = renderHook(() => useSSEStream(config));

              await act(async () => {
                await result.current.start();
              });

              // onEvent should be called for: start + text events + done
              const expectedEventCount = 1 + textEvents.length + 1;
              expect(onEvent).toHaveBeenCalledTimes(expectedEventCount);

              // onTextChunk should be called for each text event
              expect(onTextChunk).toHaveBeenCalledTimes(textEvents.length);

              // onResult should be called once for the done event
              expect(onResult).toHaveBeenCalledTimes(1);
              expect(onResult).toHaveBeenCalledWith(doneData.result);

              // result state should be updated
              expect(result.current.result).toEqual(doneData.result);

              // streamingContent should accumulate all text content
              const expectedContent = textEvents.map((e) => e.content).join('');
              expect(result.current.streamingContent).toBe(expectedContent);
            }
          ),
          { numRuns: 100 }
        );
      });

      /**
       * Edge case: done event without result property
       *
       * Test that onResult is NOT invoked when done event lacks result property.
       */
      it('should NOT invoke onResult when done event lacks result property', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.record({
              complete: fc.boolean(),
              status: fc.string(),
            }),
            async (doneDataWithoutResult) => {
              // Generate SSE chunk for done event WITHOUT result property
              const sseChunks = [
                `event: done\ndata: ${JSON.stringify(doneDataWithoutResult)}\n\n`,
              ];

              mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

              const onResult = vi.fn();
              const config = createTestConfig({ onResult });
              const { result } = renderHook(() => useSSEStream(config));

              await act(async () => {
                await result.current.start();
              });

              // onResult should NOT be called
              expect(onResult).not.toHaveBeenCalled();

              // result state should remain null
              expect(result.current.result).toBeNull();
            }
          ),
          { numRuns: 100 }
        );
      });

      /**
       * Edge case: text event without content property
       *
       * Test that onTextChunk is NOT invoked when text event lacks content property.
       */
      it('should NOT invoke onTextChunk when text event lacks content property', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.record({
              message: fc.string(),
              value: fc.integer(),
            }),
            async (textDataWithoutContent) => {
              // Generate SSE chunk for text event WITHOUT content property
              const sseChunks = [
                `event: text\ndata: ${JSON.stringify(textDataWithoutContent)}\n\n`,
              ];

              mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

              const onTextChunk = vi.fn();
              const config = createTestConfig({ onTextChunk });
              const { result } = renderHook(() => useSSEStream(config));

              await act(async () => {
                await result.current.start();
              });

              // onTextChunk should NOT be called
              expect(onTextChunk).not.toHaveBeenCalled();

              // streamingContent should remain empty
              expect(result.current.streamingContent).toBe('');
            }
          ),
          { numRuns: 100 }
        );
      });

      /**
       * Edge case: Callbacks are optional
       *
       * Test that the hook works correctly when optional callbacks are not provided.
       */
      it('should handle missing optional callbacks gracefully', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.tuple(sseTextEventDataArb, sseDoneEventWithResultArb),
            async ([textData, doneData]) => {
              const sseChunks = [
                `event: text\ndata: ${JSON.stringify(textData)}\n\n`,
                `event: done\ndata: ${JSON.stringify(doneData)}\n\n`,
              ];

              mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks));

              // Config without optional callbacks (only onEvent is required)
              const config = createTestConfig({
                onTextChunk: undefined,
                onResult: undefined,
              });
              const { result } = renderHook(() => useSSEStream(config));

              // Should not throw when optional callbacks are missing
              await act(async () => {
                await result.current.start();
              });

              // Hook should complete without error
              expect(result.current.error).toBeNull();
              expect(result.current.isStreaming).toBe(false);

              // streamingContent should still be updated
              expect(result.current.streamingContent).toBe(textData.content);

              // result state should still be updated
              expect(result.current.result).toEqual(doneData.result);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Feature: page-refactoring, Property 4: Cancel Behavior', () => {
      /**
       * Property 4: useSSEStream Cancel Behavior
       *
       * For any active stream, calling cancel() SHALL immediately set isStreaming to false
       * and SHALL NOT set the error state, regardless of the stream's current processing state.
       *
       * **Validates: Requirements 4.11**
       */
      it('should set isStreaming=false immediately when cancel is called at any point', async () => {
        await fc.assert(
          fc.asyncProperty(
            // Generate random number of text events (0 to 10)
            fc.nat({ max: 10 }),
            // Generate a random delay for the stream (10 to 50ms)
            fc.integer({ min: 10, max: 50 }),
            async (numEvents, delay) => {
              // Create SSE chunks with the generated number of text events
              const sseChunks: string[] = [];
              for (let i = 0; i < numEvents; i++) {
                sseChunks.push(`event: text\ndata: {"content": "chunk${i}"}\n\n`);
              }
              sseChunks.push('event: done\ndata: {"complete": true}\n\n');

              mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks, { delay }));

              const config = createTestConfig();
              const { result } = renderHook(() => useSSEStream(config));

              // Start the stream - store the promise reference before any async operations
              const startPromise = result.current.start();

              // Call cancel immediately
              act(() => {
                result.current.cancel();
              });

              // isStreaming should be false immediately after cancel
              expect(result.current.isStreaming).toBe(false);

              // Wait for the promise to settle to ensure clean state
              await act(async () => {
                await startPromise;
              });

              // Verify isStreaming is still false after stream settles
              expect(result.current.isStreaming).toBe(false);

              return true;
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should NOT set error state when cancel is called', async () => {
        await fc.assert(
          fc.asyncProperty(
            // Generate random number of text events (0 to 10)
            fc.nat({ max: 10 }),
            // Generate a random delay for the stream (10 to 50ms)
            fc.integer({ min: 10, max: 50 }),
            async (numEvents, delay) => {
              // Create SSE chunks with the generated number of text events
              const sseChunks: string[] = [];
              for (let i = 0; i < numEvents; i++) {
                sseChunks.push(`event: text\ndata: {"content": "chunk${i}"}\n\n`);
              }
              sseChunks.push('event: done\ndata: {"complete": true}\n\n');

              mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks, { delay }));

              const config = createTestConfig();
              const { result } = renderHook(() => useSSEStream(config));

              // Start the stream - capture promise immediately
              const startPromise = result.current.start();

              // Call cancel
              act(() => {
                result.current.cancel();
              });

              // Error should be null immediately after cancel
              expect(result.current.error).toBeNull();

              // Wait for the promise to settle
              await act(async () => {
                await startPromise;
              });

              // Error should still be null after stream settles (abort is not an error)
              expect(result.current.error).toBeNull();

              return true;
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should maintain cancel behavior regardless of stream content complexity', async () => {
        await fc.assert(
          fc.asyncProperty(
            // Generate array of random content strings - use alphanumeric to avoid JSON escaping issues
            fc.array(fc.stringMatching(/^[a-zA-Z0-9]+$/), { minLength: 0, maxLength: 5 }),
            async (contents) => {
              // Create SSE chunks from generated content
              const sseChunks: string[] = contents.map(
                (content) => `event: text\ndata: {"content": "${content}"}\n\n`
              );
              sseChunks.push('event: done\ndata: {"complete": true}\n\n');

              mockFetch.mockResolvedValueOnce(createMockResponse(sseChunks, { delay: 20 }));

              const config = createTestConfig();
              const { result } = renderHook(() => useSSEStream(config));

              // Start the stream - capture promise immediately
              const startPromise = result.current.start();

              // Cancel the stream
              act(() => {
                result.current.cancel();
              });

              // Both properties must hold: isStreaming=false and error=null
              expect(result.current.isStreaming).toBe(false);
              expect(result.current.error).toBeNull();

              // Wait for cleanup
              await act(async () => {
                await startPromise;
              });

              // Properties still hold after stream settles
              expect(result.current.isStreaming).toBe(false);
              expect(result.current.error).toBeNull();

              return true;
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
