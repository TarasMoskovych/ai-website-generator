/**
 * useSSEStream Custom Hook
 * Handles Server-Sent Events stream processing with abort capability
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * SSE event structure parsed from the stream
 * Requirement 4.1: Accept configuration with onEvent callback
 * Requirement 4.4: Parse event type and data, invoke onEvent callback
 */
export interface SSEEvent {
  /** Event type (e.g., 'start', 'text', 'done', 'error') */
  type: string;
  /** Parsed JSON data from the event */
  data: unknown;
}

/**
 * Configuration for the useSSEStream hook
 * Requirement 4.1: Accept configuration object with url, method, headers, body, onEvent
 */
export interface UseSSEStreamConfig {
  /** API endpoint URL */
  url: string;
  /** HTTP method (typically 'POST') */
  method: string;
  /** Request headers (including Authorization) */
  headers: Record<string, string>;
  /** Request body (will be JSON stringified) */
  body: unknown;
  /** Callback invoked for each parsed SSE event */
  onEvent: (event: SSEEvent) => void;
}

/**
 * Return type for the useSSEStream hook
 * Requirement 4.2: Return object with isStreaming, error, streamingContent, start, cancel
 */
export interface UseSSEStreamReturn {
  /** Whether streaming is currently active */
  isStreaming: boolean;
  /** Error message if streaming failed, null otherwise */
  error: string | null;
  /** Accumulated streaming content (for preview) */
  streamingContent: string;
  /** Function to start the stream */
  start: () => Promise<void>;
  /** Function to cancel the ongoing stream */
  cancel: () => void;
}

/**
 * Hook for processing Server-Sent Events streams
 *
 * Requirement 4.1: Accept configuration object with url, method, headers, body, onEvent
 * Requirement 4.2: Return object with isStreaming, error, streamingContent, start, cancel
 * Requirement 4.3: start() initiates fetch request and begins processing SSE stream
 * Requirement 4.4: Parse SSE events and invoke onEvent callback
 * Requirement 4.5: cancel() aborts ongoing fetch request and marks streaming as stopped immediately
 * Requirement 4.6: Set error state and stop streaming on errors
 * Requirement 4.7: Abort doesn't set error state
 * Requirement 4.8: Located at src/hooks/useSSEStream.ts
 *
 * @param config - Stream configuration with URL, method, headers, body, and event handler
 * @returns Object with streaming state, error, content, and control functions
 *
 * @example
 * ```tsx
 * function GeneratePage() {
 *   const [result, setResult] = useState(null);
 *
 *   const { isStreaming, error, streamingContent, start, cancel } = useSSEStream({
 *     url: '/api/generate/stream',
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
 *     body: { type: 'text', description: prompt },
 *     onEvent: (event) => {
 *       if (event.type === 'done') {
 *         setResult(event.data.result);
 *       }
 *     },
 *   });
 *
 *   return (
 *     <div>
 *       {isStreaming && <LoadingOverlay onCancel={cancel} />}
 *       {streamingContent && <StreamPreview content={streamingContent} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSSEStream(config: UseSSEStreamConfig): UseSSEStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');

  // Store abort controller in ref to access it from cancel()
  const abortControllerRef = useRef<AbortController | null>(null);

  // Store config in ref to avoid stale closures
  const configRef = useRef(config);

  // Sync config ref in effect (required by react-hooks/refs rule)
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  /**
   * Cancel the ongoing stream
   * Requirement 4.5: Abort ongoing fetch request and mark streaming as stopped immediately
   */
  const cancel = useCallback((): void => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Requirement 4.5: Mark streaming as stopped immediately
    setIsStreaming(false);
  }, []);

  /**
   * Start the SSE stream
   * Requirement 4.3: Initiate fetch request and begin processing SSE stream
   */
  const start = useCallback(async (): Promise<void> => {
    const { url, method, headers, body, onEvent } = configRef.current;

    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this stream
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Reset state
    setIsStreaming(true);
    setError(null);
    setStreamingContent('');

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get stream reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      // Process the stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        // SSE format: event: {type}\ndata: {json}\n\n
        const lines = buffer.split('\n');
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Check for event line
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7);
            const dataLine = lines[i + 1];

            // Check if next line is a data line
            if (dataLine?.startsWith('data: ')) {
              try {
                const data = JSON.parse(dataLine.slice(6));

                // Requirement 4.4: Parse event type and data, invoke onEvent callback
                const sseEvent: SSEEvent = {
                  type: eventType,
                  data,
                };
                onEvent(sseEvent);

                // Accumulate text content for live preview
                if (eventType === 'text' && data && typeof data === 'object' && 'content' in data) {
                  setStreamingContent((prev) => prev + (data as { content: string }).content);
                }
              } catch (e) {
                // Skip malformed JSON events
                if (!(e instanceof SyntaxError)) {
                  throw e;
                }
              }
              // Skip the data line we just processed
              i++;
            }
          }
        }
      }
    } catch (err) {
      // Requirement 4.7: Abort doesn't set error state
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted, don't set error
        return;
      }

      // Requirement 4.6: Set error state on errors
      const message =
        err instanceof Error
          ? err.message
          : 'An error occurred during streaming';
      setError(message);
    } finally {
      // Only update isStreaming if not already cancelled
      // (cancel() sets isStreaming to false immediately)
      if (abortControllerRef.current === abortController) {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    }
  }, []);

  return {
    isStreaming,
    error,
    streamingContent,
    start,
    cancel,
  };
}
