/**
 * useBeautifyWorkflow Hook
 * Encapsulates the complete beautification workflow state and logic
 *
 * Requirements:
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
 * - 6.12: Use useSSEStream internally for stream processing
 * - 6.13: Handle stage transitions: analyzing → completing/enhancing → finalizing
 * - 6.14: Populate beautifiedHtml/beautifiedCss on successful done event
 * - 6.15: Set beautifyError on failure
 *
 * This hook provides:
 * 1. Complete state management for the beautification workflow
 * 2. Dialog visibility state management
 * 3. Stream processing via useSSEStream
 * 4. Stage transitions based on SSE events
 * 5. Error handling with retry capability
 */

'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/components/auth';
import { useSSEStream, type SSEEvent } from './useSSEStream';
import { getBeautifyError } from '@/lib/beautifyErrors';
import type {
  BeautifyDialogResult,
  BeautifyLoadingStage,
  BeautifyStreamEvent,
} from '@/types/beautify';
import type { BeautifyError } from '@/lib/beautifyErrors';

/**
 * Configuration for useBeautifyWorkflow hook
 * Requirement 6.2: Accept input parameters
 */
export interface UseBeautifyWorkflowConfig {
  /** Firestore document ID of the website */
  websiteId: string;
  /** Current HTML content to beautify */
  currentHtml: string;
  /** Current CSS content to beautify */
  currentCss: string;
  /** Original text prompt for context (optional) */
  originalPrompt: string | null;
}

/**
 * Return type for useBeautifyWorkflow hook
 * Requirements 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11
 */
export interface UseBeautifyWorkflowReturn {
  // State (Requirement 6.3)
  /** Whether beautification is currently in progress */
  isBeautifying: boolean;
  /** Current stage of the beautification process */
  beautifyStage: BeautifyLoadingStage | null;
  /** Accumulated streaming content from SSE */
  streamingContent: string;
  /** Beautified HTML result */
  beautifiedHtml: string;
  /** Beautified CSS result */
  beautifiedCss: string;
  /** Error object if beautification failed */
  beautifyError: BeautifyError | null;

  // Dialog visibility (Requirement 6.4)
  /** Whether the options dialog is visible */
  showBeautifyOptions: boolean;
  /** Whether the preview comparison is visible */
  showPreviewComparison: boolean;
  /** Whether the save options dialog is visible */
  showSaveOptions: boolean;

  // Actions (Requirements 6.5, 6.6)
  /** Opens the beautify options dialog */
  openOptionsDialog: () => void;
  /** Starts the beautification process with provided options */
  startBeautify: (options: BeautifyDialogResult) => Promise<void>;
  /** Cancels the ongoing beautification request */
  cancelBeautify: () => void;

  // Dialog handlers (Requirements 6.7, 6.8, 6.9, 6.10, 6.11)
  /** Confirms options selection and starts beautification */
  handleConfirm: (options: BeautifyDialogResult) => void;
  /** Accepts beautified changes and opens save options */
  handleAccept: () => void;
  /** Rejects beautified changes and resets content */
  handleReject: () => void;
  /** Retries beautification after error */
  handleRetry: () => void;
  /** Dismisses all dialogs and resets all states */
  handleDismiss: () => void;
}

/**
 * useBeautifyWorkflow hook
 * Encapsulates the complete beautification workflow state and logic
 *
 * @param config - Configuration with websiteId, currentHtml, currentCss, originalPrompt
 * @returns Object with state, dialog visibility, actions, and dialog handlers
 *
 * @example
 * ```tsx
 * const {
 *   isBeautifying,
 *   beautifyStage,
 *   streamingContent,
 *   beautifiedHtml,
 *   beautifiedCss,
 *   beautifyError,
 *   showBeautifyOptions,
 *   showPreviewComparison,
 *   showSaveOptions,
 *   openOptionsDialog,
 *   startBeautify,
 *   cancelBeautify,
 *   handleConfirm,
 *   handleAccept,
 *   handleReject,
 *   handleRetry,
 *   handleDismiss,
 * } = useBeautifyWorkflow({
 *   websiteId: website.id,
 *   currentHtml: editedHtml,
 *   currentCss: editedCss,
 *   originalPrompt: website.originalPrompt,
 * });
 * ```
 */
export function useBeautifyWorkflow(
  config: UseBeautifyWorkflowConfig
): UseBeautifyWorkflowReturn {
  const { websiteId, currentHtml, currentCss, originalPrompt } = config;
  const { getIdToken } = useAuth();

  // State management (Requirement 6.3)
  const [isBeautifying, setIsBeautifying] = useState(false);
  const [beautifyStage, setBeautifyStage] = useState<BeautifyLoadingStage | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [beautifiedHtml, setBeautifiedHtml] = useState('');
  const [beautifiedCss, setBeautifiedCss] = useState('');
  const [beautifyError, setBeautifyError] = useState<BeautifyError | null>(null);

  // Dialog visibility states (Requirement 6.4)
  const [showBeautifyOptions, setShowBeautifyOptions] = useState(false);
  const [showPreviewComparison, setShowPreviewComparison] = useState(false);
  const [showSaveOptions, setShowSaveOptions] = useState(false);

  // Refs for abort control and result capture
  const abortControllerRef = useRef<AbortController | null>(null);
  const resultRef = useRef<{ html: string; css: string } | null>(null);

  // Type guard for result
  type BeautifyResult = { html: string; css: string };

  /**
   * Handle SSE events - stage transitions and content accumulation
   * Requirement 6.13: Handle stage transitions
   */
  const handleEvent = useCallback((event: SSEEvent) => {
    const { type, data } = event;
    const eventData = data as BeautifyStreamEvent;

    switch (type) {
      case 'start':
        setBeautifyStage('analyzing');
        break;

      case 'mode':
        // Unique to beautify - determines enhancement approach
        if (eventData.mode === 'complete') {
          setBeautifyStage('completing');
        } else {
          setBeautifyStage('enhancing');
        }
        break;

      case 'text':
        // Content accumulated by useSSEStream
        // Detect CSS section start for finalizing stage
        if (eventData.content?.includes('```css')) {
          setBeautifyStage('finalizing');
        }
        break;

      case 'done':
        // Extract result - handled via onResult callback
        if (eventData.result) {
          resultRef.current = eventData.result;
        }
        break;

      case 'error':
        // Error handled via error state
        throw new Error(eventData.error || 'Beautification failed');
    }
  }, []);

  /**
   * Handle text chunks - detect stage transitions
   */
  const handleTextChunk = useCallback((content: string) => {
    // Detect CSS section start for finalizing stage
    if (content.includes('```css')) {
      setBeautifyStage('finalizing');
    }
  }, []);

  /**
   * Handle result from done event
   * Requirement 6.14: Populate beautifiedHtml/beautifiedCss on successful done event
   */
  const handleResult = useCallback((result: unknown) => {
    const typedResult = result as BeautifyResult | undefined;
    if (typedResult?.html && typedResult?.css) {
      resultRef.current = typedResult;
    }
  }, []);

  // Memoize SSE stream config to prevent unnecessary re-renders
  const sseConfig = useMemo(() => ({
    url: '/api/beautify/stream',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {},
    onEvent: handleEvent,
    onTextChunk: handleTextChunk,
    onResult: handleResult,
  }), [handleEvent, handleTextChunk, handleResult]);

  // Use SSE stream hook (Requirement 6.12)
  const {
    streamingContent: sseStreamingContent,
    cancel: cancelStream,
  } = useSSEStream(sseConfig);

  /**
   * Opens the beautify options dialog
   */
  const openOptionsDialog = useCallback(() => {
    setShowBeautifyOptions(true);
  }, []);

  /**
   * Start the beautification process
   * Requirement 6.5: Expose startBeautify function
   */
  const startBeautify = useCallback(async (options: BeautifyDialogResult): Promise<void> => {
    // Reset state
    setIsBeautifying(true);
    setBeautifyStage('analyzing');
    setStreamingContent('');
    setBeautifyError(null);
    setBeautifiedHtml('');
    setBeautifiedCss('');
    resultRef.current = null;

    // Create abort controller for cancellation
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Get auth token
      const token = await getIdToken();

      // Prepare request body
      const requestBody: Record<string, unknown> = {
        websiteId,
        html: currentHtml,
        css: currentCss,
      };

      // Add original prompt if available
      if (originalPrompt) {
        requestBody.originalPrompt = originalPrompt;
      }

      // Add reference image if provided
      if (options.useReferenceImage && options.referenceImage) {
        requestBody.referenceImage = options.referenceImage;
        requestBody.referenceImageMimeType = options.referenceImageMimeType;
      }

      // Make streaming request to beautify API
      const response = await fetch('/api/beautify/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Beautification failed');
      }

      // Process the SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get stream reader');
      }

      const decoder = new TextDecoder();

      // Import and use createParser for SSE parsing
      const { createParser } = await import('eventsource-parser');

      // Create SSE parser
      const parser = createParser({
        onEvent: (event) => {
          const eventType = event.event;
          const eventData = event.data;

          if (!eventType || !eventData) return;

          try {
            const data: BeautifyStreamEvent = JSON.parse(eventData);

            switch (eventType) {
              case 'start':
                setBeautifyStage('analyzing');
                break;
              case 'mode':
                // Update stage based on mode
                if (data.mode === 'complete') {
                  setBeautifyStage('completing');
                } else {
                  setBeautifyStage('enhancing');
                }
                break;
              case 'text':
                if (data.content) {
                  setStreamingContent((prev) => prev + data.content);
                  // Update stage based on content
                  if (data.content.includes('```css')) {
                    setBeautifyStage('finalizing');
                  }
                }
                break;
              case 'done':
                if (data.result) {
                  resultRef.current = data.result;
                }
                break;
              case 'error':
                throw new Error(data.error || 'Beautification failed');
            }
          } catch (e) {
            if (!(e instanceof SyntaxError)) {
              throw e;
            }
          }
        },
      });

      // Read and parse the stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Consume any remaining buffered data
          parser.reset({ consume: true });
          break;
        }

        parser.feed(decoder.decode(value, { stream: true }));
      }

      if (!resultRef.current) {
        throw new Error('No result received from stream');
      }

      // Store result in local variable with explicit type
      const result: BeautifyResult = resultRef.current;

      // Success - store beautified content and show comparison
      // Requirement 6.14: Populate beautifiedHtml/beautifiedCss on successful done event
      setBeautifiedHtml(result.html);
      setBeautifiedCss(result.css);
      setIsBeautifying(false);
      setShowPreviewComparison(true);
    } catch (err) {
      // Handle cancellation - Requirement 6.6: cancel doesn't set error
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled - reset state silently
        setIsBeautifying(false);
        setStreamingContent('');
        return;
      }

      // Show error to user - Requirement 6.15: Set beautifyError on failure
      const beautifyErr = getBeautifyError(err instanceof Error ? err : String(err));
      setBeautifyError(beautifyErr);
      setIsBeautifying(false);
    } finally {
      abortControllerRef.current = null;
    }
  }, [websiteId, currentHtml, currentCss, originalPrompt, getIdToken]);

  /**
   * Cancel the ongoing beautification request
   * Requirement 6.6: Expose cancelBeautify function
   */
  const cancelBeautify = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Also cancel the SSE stream if it's being used directly
    cancelStream();
    setIsBeautifying(false);
    setStreamingContent('');
  }, [cancelStream]);

  /**
   * Handle options dialog confirmation
   * Requirement 6.7: handleConfirm closes options and calls startBeautify
   */
  const handleConfirm = useCallback((options: BeautifyDialogResult) => {
    setShowBeautifyOptions(false);
    startBeautify(options);
  }, [startBeautify]);

  /**
   * Handle preview comparison accept
   * Requirement 6.8: handleAccept closes preview comparison and opens save options
   */
  const handleAccept = useCallback(() => {
    setShowPreviewComparison(false);
    setShowSaveOptions(true);
  }, []);

  /**
   * Handle preview comparison reject
   * Requirement 6.9: handleReject closes preview comparison and resets beautified content
   */
  const handleReject = useCallback(() => {
    setShowPreviewComparison(false);
    setBeautifiedHtml('');
    setBeautifiedCss('');
  }, []);

  /**
   * Handle error retry
   * Requirement 6.10: handleRetry resets error and opens options dialog
   */
  const handleRetry = useCallback(() => {
    setBeautifyError(null);
    setShowBeautifyOptions(true);
  }, []);

  /**
   * Handle dismiss - reset all states
   * Requirement 6.11: handleDismiss resets all states and closes dialogs
   */
  const handleDismiss = useCallback(() => {
    // Reset all beautification states to initial values
    setIsBeautifying(false);
    setBeautifyStage(null);
    setStreamingContent('');
    setBeautifiedHtml('');
    setBeautifiedCss('');
    setBeautifyError(null);

    // Close all dialogs
    setShowBeautifyOptions(false);
    setShowPreviewComparison(false);
    setShowSaveOptions(false);

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    resultRef.current = null;
  }, []);

  return {
    // State
    isBeautifying,
    beautifyStage,
    streamingContent: streamingContent || sseStreamingContent,
    beautifiedHtml,
    beautifiedCss,
    beautifyError,

    // Dialog visibility
    showBeautifyOptions,
    showPreviewComparison,
    showSaveOptions,

    // Actions
    openOptionsDialog,
    startBeautify,
    cancelBeautify,

    // Dialog handlers
    handleConfirm,
    handleAccept,
    handleReject,
    handleRetry,
    handleDismiss,
  };
}

export default useBeautifyWorkflow;
