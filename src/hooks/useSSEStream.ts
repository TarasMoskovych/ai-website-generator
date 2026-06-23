/**
 * useSSEStream Custom Hook
 * Handles Server-Sent Events stream processing with abort capability
 * Uses eventsource-parser library for robust SSE parsing
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 12.1, 12.2, 12.3, 12.4
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createParser, type EventSourceParser } from 'eventsource-parser';

/**
 * SSE event structure parsed from the stream
 * Requirement 4.1: Accept configuration with onEvent callback
 * Requirement 4.9: Maintain existing onEvent callback signature
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
 * Requirement 4.6: Accept optional onTextChunk callback
 * Requirement 4.7: Accept optional onResult callback
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
  /** Callback invoked for each parsed SSE event (backward compatible) */
  onEvent: (event: SSEEvent) => void;
  /** NEW: Callback for text chunk events with content */
  onTextChunk?: (content: string) => void;
  /** NEW: Callback when done event contains result */
  onResult?: (result: unknown) => void;
}

/**
 * Return type for the useSSEStream hook
 * Requirement 4.2: Return object with isStreaming, error, streamingContent, start, cancel
 * Requirement 4.8: Expose result state initialized to null
 * Requirement 4.10: Maintain existing return interface
 */
export interface UseSSEStreamReturn {
  /** Whether streaming is currently active */
  isStreaming: boolean;
  /** Error message if streaming failed, null otherwise */
  error: string | null;
  /** Accumulated streaming content (for preview) */
  streamingContent: string;
  /** NEW: Result from done event, null until received */
  result: unknown | null;
  /** Function to start the stream */
  start: () => Promise<void>;
  /** Function to cancel the ongoing stream */
  cancel: () => void;
}

/**
 * Hook for processing Server-Sent Events streams using eventsource-parser
 *
 * Requirement 4.1: Accept configuration object with url, method, headers, body, onEvent
 * Requirement 4.2: Return object with isStreaming, error, streamingContent, start, cancel
 * Requirement 4.3: Use createParser from eventsource-parser for all SSE event parsing
 * Requirement 4.4: Call parser.feed(decodedChunk) for each stream chunk
 * Requirement 4.5: Call parser.reset({ consume: true }) on stream completion
 * Requirement 4.6: Accept optional onTextChunk callback for text events with content
 * Requirement 4.7: Accept optional onResult callback when done event contains result
 * Requirement 4.8: Expose result state initialized to null
 * Requirement 4.9: Maintain existing onEvent callback for every parsed event
 * Requirement 4.10: Maintain existing return interface
 * Requirement 4.11: Maintain abort behavior - cancel() doesn't set error state
 *
 * @param config - Stream configuration with URL, method, headers, body, and event handlers
 * @returns Object with streaming state, error, content, result, and control functions
 *
 * @example
 * ```tsx
 * function GeneratePage() {
 *   const [result, setResult] = useState(null);
 *
 *   const { isStreaming, error, streamingContent, result, start, cancel } = useSSEStream({
 *     url: '/api/generate/stream',
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
 *     body: { type: 'text', description: prompt },
 *     onEvent: (event) => {
 *       // Handle all events for custom logic
 *     },
 *     onTextChunk: (content) => {
 *       // Detect stage transitions from content
 *       if (content.includes('\`\`\`css')) {
 *         setStage('generating_css');
 *       }
 *     },
 *     onResult: (result) => {
 *       // Handle final result
 *       setResult(result);
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
  const [result, setResult] = useState<unknown | null>(null);

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
   * Requirement 4.11: Abort ongoing fetch request and mark streaming as stopped immediately
   * Requirement 4.11: cancel() doesn't set error state
   */
  const cancel = useCallback((): void => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Requirement 4.11: Mark streaming as stopped immediately
    setIsStreaming(false);
  }, []);

  /**
   * Start the SSE stream
   * Requirement 4.3: Use createParser from eventsource-parser
   * Requirement 4.4: Call parser.feed(decodedChunk) for each chunk
   * Requirement 4.5: Call parser.reset({ consume: true }) on stream completion
   */
  const start = useCallback(async (): Promise<void> => {
    const { url, method, headers, body, onEvent, onTextChunk, onResult } = configRef.current;

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
    setResult(null);

    // Accumulator for streaming content (needed for state updates)
    let accumulatedContent = '';

    // Create SSE parser using eventsource-parser library
    // Requirement 4.3: Create parser with onEvent callback
    const parser: EventSourceParser = createParser({
      onEvent: (event) => {
        const eventType = event.event;
        const eventData = event.data;

        if (!eventType || !eventData) return;

        try {
          const data = JSON.parse(eventData);

          // Requirement 4.9: Invoke onEvent callback for every parsed event
          const sseEvent: SSEEvent = {
            type: eventType,
            data,
          };
          onEvent(sseEvent);

          // Requirement 4.6: Invoke onTextChunk for text events with content
          if (eventType === 'text' && data && typeof data === 'object' && 'content' in data) {
            const content = (data as { content: string }).content;
            accumulatedContent += content;
            setStreamingContent(accumulatedContent);

            if (onTextChunk) {
              onTextChunk(content);
            }
          }

          // Requirement 4.7 & 4.8: Handle done event with result
          if (eventType === 'done' && data && typeof data === 'object' && 'result' in data) {
            const resultData = (data as { result: unknown }).result;
            setResult(resultData);

            if (onResult) {
              onResult(resultData);
            }
          }
        } catch (e) {
          // Skip malformed JSON events (SyntaxError)
          if (!(e instanceof SyntaxError)) {
            throw e;
          }
        }
      },
    });

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

      // Process the stream
      // Requirement 4.4: Call parser.feed(decodedChunk) for each chunk
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Requirement 4.5: Call parser.reset({ consume: true }) on completion
          parser.reset({ consume: true });
          break;
        }

        // Decode the chunk and feed to parser
        const decodedChunk = decoder.decode(value, { stream: true });
        parser.feed(decodedChunk);
      }
    } catch (err) {
      // Requirement 4.11: Abort doesn't set error state
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted, don't set error
        return;
      }

      // Set error state on errors
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
    result,
    start,
    cancel,
  };
}
