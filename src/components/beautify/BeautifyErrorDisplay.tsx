/**
 * BeautifyErrorDisplay Component
 * Displays error messages with recovery options for beautification errors
 *
 * Requirements:
 * - 10.1: Display user-friendly network error message
 * - 10.2: Display user-friendly timeout error message
 * - 10.3: Display user-friendly authentication error message
 * - 10.4: Display user-friendly rate limit error message
 * - 10.5: Display user-friendly parse error message
 * - 10.6: Provide "Try Again" button for retryable errors
 * - 10.7: Provide "Dismiss" button to return to normal preview mode
 * - 10.8: Preserve user edits when beautification fails
 *
 * This component:
 * 1. Shows the appropriate error message based on error type
 * 2. Displays a retry button for retryable errors
 * 3. Shows suggested actions to help users recover
 * 4. Provides a dismiss button to close the error overlay
 * 5. Uses proper ARIA attributes for accessibility
 * 6. Follows existing component patterns with Tailwind CSS
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { BeautifyError, BeautifyErrorCategory } from '@/lib/beautifyErrors';

/**
 * BeautifyErrorDisplay props
 */
export interface BeautifyErrorDisplayProps {
  /** The beautify error object with all error information */
  error: BeautifyError;
  /** Callback when the user clicks the retry button */
  onRetry?: () => void;
  /** Callback when the user dismisses the error */
  onDismiss: () => void;
  /** Whether a retry operation is in progress */
  isRetrying?: boolean;
  /** Whether to display as an overlay (default) or inline */
  variant?: 'overlay' | 'inline';
}

/**
 * Alert circle icon for error display
 */
function AlertCircleIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/**
 * Refresh icon for retry button
 */
function RefreshIcon({ className }: { className?: string }) {
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
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

/**
 * X icon for dismiss button
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
 * Wifi off icon for network errors
 */
function WifiOffIcon({ className }: { className?: string }) {
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
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
      <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
      <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
      <path d="M5 13a10 10 0 0 1 5.24-2.76" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

/**
 * Clock icon for timeout errors
 */
function ClockIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

/**
 * Key icon for authentication errors
 */
function KeyIcon({ className }: { className?: string }) {
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
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}

/**
 * Zap icon for rate limit errors
 */
function ZapIcon({ className }: { className?: string }) {
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
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

/**
 * Get the appropriate icon for the error category
 */
function getErrorIcon(category: BeautifyErrorCategory): React.ComponentType<{ className?: string }> {
  switch (category) {
    case 'network':
      return WifiOffIcon;
    case 'ai':
      return ZapIcon;
    case 'validation':
      return AlertCircleIcon;
    case 'general':
    default:
      return AlertCircleIcon;
  }
}

/**
 * Get category-specific styling classes
 */
function getCategoryStyles(category: BeautifyErrorCategory): {
  iconBg: string;
  iconColor: string;
  border: string;
} {
  switch (category) {
    case 'network':
      return {
        iconBg: 'bg-orange-500/10 dark:bg-orange-500/20',
        iconColor: 'text-orange-500',
        border: 'border-orange-500/20',
      };
    case 'ai':
      return {
        iconBg: 'bg-purple-500/10 dark:bg-purple-500/20',
        iconColor: 'text-purple-500',
        border: 'border-purple-500/20',
      };
    case 'validation':
      return {
        iconBg: 'bg-yellow-500/10 dark:bg-yellow-500/20',
        iconColor: 'text-yellow-500',
        border: 'border-yellow-500/20',
      };
    case 'general':
    default:
      return {
        iconBg: 'bg-destructive/10 dark:bg-destructive/20',
        iconColor: 'text-destructive',
        border: 'border-destructive/20',
      };
  }
}

/**
 * Error content component shared between overlay and inline variants
 */
function ErrorContent({
  error,
  onRetry,
  onDismiss,
  isRetrying,
  styles,
  dismissButtonRef,
}: {
  error: BeautifyError;
  onRetry?: () => void;
  onDismiss: () => void;
  isRetrying?: boolean;
  styles: ReturnType<typeof getCategoryStyles>;
  dismissButtonRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const ErrorIcon = getErrorIcon(error.category);

  return (
    <>
      {/* Header with icon */}
      <div className="flex items-start gap-4">
        <div
          className={`
            flex-shrink-0
            rounded-full
            p-3
            ${styles.iconBg}
          `}
        >
          <ErrorIcon className={`h-6 w-6 ${styles.iconColor}`} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Error title */}
          <h2
            id="beautify-error-title"
            className="text-lg font-semibold text-foreground"
          >
            Beautification Failed
          </h2>

          {/* Error message (Requirement 10.1, 10.2, 10.3, 10.4, 10.5) */}
          <p
            id="beautify-error-message"
            className="mt-2 text-sm text-muted-foreground"
          >
            {error.message}
          </p>

          {/* Suggested action */}
          {error.suggestedAction && (
            <p className="mt-2 text-sm text-foreground/80">
              <span className="font-medium">Suggested action: </span>
              {error.suggestedAction}
            </p>
          )}

          {/* Retry after indicator for rate limit errors */}
          {error.retryAfter && error.retryAfter > 0 && (
            <p className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
              <ClockIcon className="h-4 w-4" />
              Please wait {error.retryAfter} seconds before retrying.
            </p>
          )}
        </div>
      </div>

      {/* Action buttons (Requirement 10.6, 10.7) */}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {/* Dismiss button */}
        <button
          ref={dismissButtonRef as React.RefObject<HTMLButtonElement>}
          type="button"
          onClick={onDismiss}
          disabled={isRetrying}
          className="
            inline-flex items-center justify-center gap-2
            rounded-md px-4 py-2
            text-sm font-medium
            bg-secondary
            text-secondary-foreground
            hover:bg-secondary/80
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
            focus-visible:ring-offset-2
            focus-visible:ring-offset-background
            transition-colors
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >
          <XIcon className="h-4 w-4" />
          Dismiss
        </button>

        {/* Retry button - only shown for retryable errors (Requirement 10.6) */}
        {error.isRetryable && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying || (error.retryAfter !== undefined && error.retryAfter > 0)}
            className="
              inline-flex items-center justify-center gap-2
              rounded-md px-4 py-2
              text-sm font-medium
              bg-primary
              text-primary-foreground
              hover:bg-primary/90
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
              focus-visible:ring-offset-background
              transition-colors
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            {isRetrying ? (
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <RefreshIcon className="h-4 w-4" />
            )}
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </button>
        )}

        {/* Auth error special action - Refresh page */}
        {error.code === 'BEAUTIFY_AUTH_ERROR' && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="
              inline-flex items-center justify-center gap-2
              rounded-md px-4 py-2
              text-sm font-medium
              bg-primary
              text-primary-foreground
              hover:bg-primary/90
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
              focus-visible:ring-offset-background
              transition-colors
            "
          >
            <KeyIcon className="h-4 w-4" />
            Refresh Page
          </button>
        )}
      </div>
    </>
  );
}

/**
 * BeautifyErrorDisplay component
 * Displays beautification errors with recovery options
 *
 * @example
 * // Overlay variant (default)
 * <BeautifyErrorDisplay
 *   error={beautifyError}
 *   onRetry={handleRetry}
 *   onDismiss={handleDismiss}
 *   isRetrying={isRetrying}
 * />
 *
 * // Inline variant
 * <BeautifyErrorDisplay
 *   error={beautifyError}
 *   onRetry={handleRetry}
 *   onDismiss={handleDismiss}
 *   variant="inline"
 * />
 */
export function BeautifyErrorDisplay({
  error,
  onRetry,
  onDismiss,
  isRetrying = false,
  variant = 'overlay',
}: BeautifyErrorDisplayProps) {
  const dismissButtonRef = useRef<HTMLButtonElement>(null);
  const styles = getCategoryStyles(error.category);

  /**
   * Handle keyboard events for overlay variant
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && variant === 'overlay') {
        event.preventDefault();
        onDismiss();
      }
    },
    [onDismiss, variant]
  );

  /**
   * Focus management and keyboard event setup for overlay variant
   */
  useEffect(() => {
    if (variant === 'overlay') {
      // Focus the dismiss button when displayed
      dismissButtonRef.current?.focus();

      // Add keyboard event listener
      document.addEventListener('keydown', handleKeyDown);

      // Prevent body scroll when overlay is open
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [variant, handleKeyDown]);

  // Inline variant
  if (variant === 'inline') {
    return (
      <div
        role="alert"
        aria-labelledby="beautify-error-title"
        aria-describedby="beautify-error-message"
        className={`
          w-full
          rounded-lg border
          ${styles.border}
          bg-card
          p-6
        `}
      >
        <ErrorContent
          error={error}
          onRetry={onRetry}
          onDismiss={onDismiss}
          isRetrying={isRetrying}
          styles={styles}
        />
      </div>
    );
  }

  // Overlay variant (default)
  return createPortal(
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        p-4
      "
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="
          absolute inset-0
          bg-black/50
          dark:bg-black/70
          animate-in fade-in duration-200
        "
        onClick={onDismiss}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="beautify-error-title"
        aria-describedby="beautify-error-message"
        className={`
          relative z-10
          w-full max-w-md
          rounded-lg border
          ${styles.border}
          bg-card
          p-6
          shadow-lg
          animate-in fade-in zoom-in-95 duration-200
        `}
      >
        <ErrorContent
          error={error}
          onRetry={onRetry}
          onDismiss={onDismiss}
          isRetrying={isRetrying}
          styles={styles}
          dismissButtonRef={dismissButtonRef}
        />
      </div>
    </div>,
    document.body
  );
}

export default BeautifyErrorDisplay;
