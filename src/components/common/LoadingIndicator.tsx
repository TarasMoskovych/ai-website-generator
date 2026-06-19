/**
 * LoadingIndicator Component
 * Displays animated loading indicator with generation stage, elapsed time, streaming content, and cancel button
 *
 * Requirements:
 * - 8.1: Display visible loading indicator with animated element to confirm active processing
 * - 8.2: Display status messages indicating current generation stage
 * - 8.3: Display a visible cancel button
 * - 8.6: Display message when generation takes longer than 60 seconds
 *
 * This component:
 * 1. Shows an animated spinner to indicate active processing
 * 2. Displays the current generation stage as human-readable text
 * 3. Shows elapsed time since generation started
 * 4. Shows streaming content preview in real-time (collapsible)
 * 5. Provides a cancel button to abort the generation process
 * 6. Shows a warning message if generation exceeds 60 seconds
 */

'use client';

import { useMemo, useState } from 'react';
import type { GenerationStage } from '@/types';

/**
 * LoadingIndicator props following the design specification
 */
export interface LoadingIndicatorProps {
  /** Current stage of generation */
  stage: GenerationStage;
  /** Callback when cancel button is clicked */
  onCancel: () => void;
  /** Time elapsed since generation started in milliseconds */
  elapsedTime: number;
  /** Optional streaming content to display */
  streamingContent?: string;
}

/**
 * Human-readable stage messages
 */
const STAGE_MESSAGES: Record<GenerationStage, string> = {
  processing_input: 'Processing input...',
  generating_html: 'Generating HTML...',
  generating_css: 'Generating CSS...',
  finalizing: 'Finalizing...',
};

/**
 * Threshold in milliseconds for showing the "taking longer" message
 */
const LONG_RUNNING_THRESHOLD_MS = 60_000;

/**
 * Format elapsed time in a human-readable format
 */
function formatElapsedTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * X icon for the cancel button
 */
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/**
 * Alert triangle icon for the warning message
 */
function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

/**
 * Chevron icon for collapse/expand
 */
function ChevronIcon({ className, expanded }: { className?: string; expanded: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Code icon
 */
function CodeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

/**
 * LoadingIndicator component
 * Displays an animated loading indicator with generation stage, elapsed time, and cancel button
 *
 * @example
 * <LoadingIndicator
 *   stage="generating_html"
 *   elapsedTime={5000}
 *   onCancel={() => console.log('Cancelled')}
 *   streamingContent="<!DOCTYPE html>..."
 * />
 */
export function LoadingIndicator({
  stage,
  onCancel,
  elapsedTime,
  streamingContent,
}: LoadingIndicatorProps) {
  const stageMessage = STAGE_MESSAGES[stage];
  const formattedTime = useMemo(() => formatElapsedTime(elapsedTime), [elapsedTime]);
  const isTakingLong = elapsedTime >= LONG_RUNNING_THRESHOLD_MS;

  // Collapse/expand state for streaming preview
  const [isExpanded, setIsExpanded] = useState(true);

  // Get last 500 characters of streaming content for preview
  const contentPreview = useMemo(() => {
    if (!streamingContent) return '';
    const maxLength = 500;
    if (streamingContent.length <= maxLength) return streamingContent;
    return '...' + streamingContent.slice(-maxLength);
  }, [streamingContent]);

  // Calculate content stats
  const contentStats = useMemo(() => {
    if (!streamingContent) return null;
    const lines = streamingContent.split('\n').length;
    const chars = streamingContent.length;
    return { lines, chars };
  }, [streamingContent]);

  return (
    <div
      className="
        flex flex-col items-center justify-center
        p-8 rounded-lg
        bg-card border border-border
        shadow-sm
        min-w-[280px] max-w-2xl w-full
      "
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Animated spinner */}
      <div
        className="
          relative
          h-16 w-16 mb-6
        "
        aria-hidden="true"
      >
        {/* Outer ring */}
        <div
          className="
            absolute inset-0
            rounded-full
            border-4 border-muted
          "
        />
        {/* Spinning arc */}
        <div
          className="
            absolute inset-0
            rounded-full
            border-4 border-transparent
            border-t-primary
            animate-spin
          "
        />
        {/* Inner pulsing dot */}
        <div
          className="
            absolute inset-4
            rounded-full
            bg-primary/20
            animate-pulse
          "
        />
      </div>

      {/* Stage message */}
      <p
        className="
          text-lg font-medium text-foreground
          mb-2
        "
      >
        {stageMessage}
      </p>

      {/* Elapsed time */}
      <p
        className="
          text-sm text-muted-foreground
          mb-4
        "
      >
        Elapsed: <span className="font-mono">{formattedTime}</span>
      </p>

      {/* Streaming content preview with collapse/expand */}
      {streamingContent && (
        <div
          className="
            w-full mb-4
            rounded-md
            bg-muted/50 border border-border
            overflow-hidden
          "
        >
          {/* Header with toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="
              w-full flex items-center justify-between
              px-3 py-2
              text-sm text-muted-foreground
              hover:bg-muted/70
              transition-colors
            "
            aria-expanded={isExpanded}
            aria-controls="streaming-content"
          >
            <span className="flex items-center gap-2">
              <CodeIcon className="h-4 w-4" />
              <span>Output Preview</span>
              {contentStats && (
                <span className="text-xs opacity-70">
                  ({contentStats.lines} lines, {contentStats.chars.toLocaleString()} chars)
                </span>
              )}
            </span>
            <ChevronIcon className="h-4 w-4" expanded={isExpanded} />
          </button>

          {/* Collapsible content */}
          <div
            id="streaming-content"
            className={`
              transition-all duration-200 ease-in-out
              ${isExpanded ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}
              overflow-hidden
            `}
          >
            <div className="px-3 pb-3 max-h-52 overflow-y-auto">
              <pre
                className="
                  text-xs font-mono text-foreground/80
                  whitespace-pre-wrap break-all
                "
              >
                {contentPreview}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Long running warning (Requirement 8.6) */}
      {isTakingLong && (
        <div
          className="
            flex items-center gap-2
            px-4 py-2 mb-4
            rounded-md
            bg-amber-500/10 border border-amber-500/30
            text-amber-600 dark:text-amber-400
          "
          role="alert"
        >
          <AlertTriangleIcon className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">
            Processing is taking longer than expected. Generation is still in progress.
          </p>
        </div>
      )}

      {/* Cancel button (Requirement 8.3) */}
      <button
        type="button"
        onClick={onCancel}
        className="
          inline-flex items-center justify-center gap-2
          px-4 py-2
          rounded-md
          text-sm font-medium
          bg-destructive/10 text-destructive
          hover:bg-destructive/20
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          transition-colors
        "
        aria-label="Cancel generation"
      >
        <XIcon className="h-4 w-4" />
        Cancel
      </button>

      {/* Screen reader announcement */}
      <span className="sr-only">
        {stageMessage} Time elapsed: {formattedTime}.
        {isTakingLong && ' Processing is taking longer than expected but generation is still in progress.'}
        Press cancel to stop generation.
      </span>
    </div>
  );
}

export default LoadingIndicator;
