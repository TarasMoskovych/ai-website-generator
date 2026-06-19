/**
 * ErrorMessage Component
 * Displays error messages with dismiss and optional retry functionality
 *
 * Features:
 * - Visible error display with appropriate styling
 * - Dismiss button to close the error message
 * - Optional retry button for recoverable errors
 * - Dark mode support with WCAG AA compliant colors
 * - Accessible with proper ARIA attributes
 *
 * Requirements: 12.1, 12.3, 12.5
 */

'use client';

import { useCallback } from 'react';

/**
 * ErrorMessage props
 */
export interface ErrorMessageProps {
  /** The error message to display */
  message: string;
  /** Callback when the dismiss button is clicked */
  onDismiss: () => void;
  /** Optional callback for retry functionality */
  onRetry?: () => void;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * ErrorMessage component
 * Displays an error message with dismiss and optional retry buttons
 *
 * @example
 * // Basic usage with dismiss only
 * <ErrorMessage
 *   message="Something went wrong"
 *   onDismiss={() => setError(null)}
 * />
 *
 * @example
 * // With retry functionality
 * <ErrorMessage
 *   message="Network error occurred"
 *   onDismiss={() => setError(null)}
 *   onRetry={() => refetchData()}
 * />
 */
export function ErrorMessage({
  message,
  onDismiss,
  onRetry,
  className,
}: ErrorMessageProps) {
  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry();
    }
  }, [onRetry]);

  return (
    <div
      className={`
        flex items-start gap-3
        rounded-lg border
        border-destructive/30
        bg-destructive/10
        p-4
        dark:border-destructive/40
        dark:bg-destructive/15
        ${className ?? ''}
      `}
      role="alert"
      aria-live="assertive"
    >
      {/* Error icon */}
      <div
        className="
          mt-0.5 flex-shrink-0
          text-destructive
          dark:text-destructive
        "
        aria-hidden="true"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        <p
          className="
            text-sm font-medium
            text-destructive
            dark:text-destructive
          "
        >
          {message}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Retry button (optional) */}
        {onRetry && (
          <button
            type="button"
            onClick={handleRetry}
            className="
              inline-flex items-center justify-center
              rounded-md px-3 py-1.5
              text-xs font-medium
              bg-destructive
              text-destructive-foreground
              hover:bg-destructive/90
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
              focus-visible:ring-offset-background
              transition-colors
            "
            aria-label="Retry"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5 mr-1"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.43l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389 5.5 5.5 0 019.2-2.466l.313.311h-2.433a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.22z"
                clipRule="evenodd"
              />
            </svg>
            Retry
          </button>
        )}

        {/* Dismiss button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="
            inline-flex items-center justify-center
            rounded-md p-1.5
            text-destructive
            hover:bg-destructive/20
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
            focus-visible:ring-offset-2
            focus-visible:ring-offset-background
            transition-colors
          "
          aria-label="Dismiss error"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default ErrorMessage;
