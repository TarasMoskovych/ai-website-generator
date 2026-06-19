/**
 * DownloadDialog Component
 * A dialog for selecting download format options with loading state and timeout handling
 *
 * Requirements:
 * - 4.1: Present download format options for single HTML file with embedded CSS or separate files in a ZIP archive
 * - 4.4: Generate the files within 5 seconds
 * - 4.5: Display an error message indicating timeout and offer a retry option if file generation exceeds 5 seconds
 * - 4.6: Display an error message indicating the failure reason and allow retry if download fails
 *
 * This component:
 * 1. Displays a modal dialog with download format options
 * 2. Shows format descriptions to help users choose
 * 3. Triggers download on format selection
 * 4. Displays loading state during file generation
 * 5. Handles timeout errors with retry option
 * 6. Accessible with proper ARIA attributes and keyboard navigation
 * 7. Supports dark mode with WCAG AA compliant colors
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TIMEOUTS } from '@/lib/constants';

/**
 * Download format type
 */
export type DownloadFormat = 'single' | 'zip';

/**
 * DownloadDialog props following the design specification
 */
export interface DownloadDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Callback when a download format is selected */
  onDownload: (format: DownloadFormat) => void;
  /** The website title for display and filename */
  websiteTitle: string;
}

/**
 * Download icon component
 */
function DownloadIcon({ className }: { className?: string }) {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

/**
 * File icon for single HTML option
 */
function FileIcon({ className }: { className?: string }) {
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
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

/**
 * Archive/ZIP icon for ZIP option
 */
function ArchiveIcon({ className }: { className?: string }) {
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
      <path d="M22 20V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2Z" />
      <path d="M12 10v6" />
      <path d="m15 13-3-3-3 3" />
    </svg>
  );
}

/**
 * X icon for close button
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
 * Spinner icon for loading state
 */
function SpinnerIcon({ className }: { className?: string }) {
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
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

/**
 * Alert icon for error state
 */
function AlertIcon({ className }: { className?: string }) {
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
 * Download option configuration
 */
interface DownloadOption {
  format: DownloadFormat;
  title: string;
  description: string;
  icon: React.ReactNode;
  filename: (title: string) => string;
}

/**
 * Download format options
 */
const DOWNLOAD_OPTIONS: DownloadOption[] = [
  {
    format: 'single',
    title: 'Single HTML File',
    description: 'HTML file with CSS embedded in a <style> element. Best for quick sharing.',
    icon: <FileIcon className="h-6 w-6" />,
    filename: (title: string) => `${sanitizeFilename(title)}.html`,
  },
  {
    format: 'zip',
    title: 'ZIP Archive',
    description: 'Separate index.html and styles.css files. Best for development.',
    icon: <ArchiveIcon className="h-6 w-6" />,
    filename: (title: string) => `${sanitizeFilename(title)}.zip`,
  },
];

/**
 * Sanitize title for use as filename
 */
function sanitizeFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50) || 'website';
}

/**
 * Dialog state types
 */
type DialogState =
  | { type: 'idle' }
  | { type: 'loading'; format: DownloadFormat }
  | { type: 'error'; message: string; format: DownloadFormat };

/**
 * DownloadDialog component
 * Displays a dialog for selecting website download format with loading state and error handling
 *
 * @example
 * <DownloadDialog
 *   isOpen={showDownloadDialog}
 *   onClose={() => setShowDownloadDialog(false)}
 *   onDownload={handleDownload}
 *   websiteTitle="My Website"
 * />
 */
export function DownloadDialog({
  isOpen,
  onClose,
  onDownload,
  websiteTitle,
}: DownloadDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<DialogState>({ type: 'idle' });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Clean up timeout on unmount or when dialog closes
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Reset state when dialog opens/closes
   */
  useEffect(() => {
    if (!isOpen) {
      // Clean up timeout when dialog closes
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Small delay before resetting state to allow closing animation
      const resetTimeout = setTimeout(() => {
        setState({ type: 'idle' });
      }, 200);
      return () => clearTimeout(resetTimeout);
    }
  }, [isOpen]);

  /**
   * Handle format selection and trigger download
   */
  const handleFormatSelect = useCallback(
    async (format: DownloadFormat) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set loading state
      setState({ type: 'loading', format });

      // Set timeout for 5 seconds (Requirement 4.4, 4.5)
      timeoutRef.current = setTimeout(() => {
        setState({
          type: 'error',
          message: 'Download timed out. Please try again.',
          format,
        });
      }, TIMEOUTS.DOWNLOAD);

      try {
        // Trigger the download
        await onDownload(format);

        // Clear timeout on success
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // Close dialog on successful download
        setState({ type: 'idle' });
        onClose();
      } catch (error) {
        // Clear timeout on error
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // Set error state (Requirement 4.6)
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Download failed. Please try again.';
        setState({ type: 'error', message: errorMessage, format });
      }
    },
    [onDownload, onClose]
  );

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    if (state.type === 'error') {
      handleFormatSelect(state.format);
    }
  }, [state, handleFormatSelect]);

  /**
   * Handle close button click
   */
  const handleClose = useCallback(() => {
    if (state.type !== 'loading') {
      onClose();
    }
  }, [onClose, state.type]);

  /**
   * Handle backdrop click (close dialog if not loading)
   */
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget && state.type !== 'loading') {
        onClose();
      }
    },
    [onClose, state.type]
  );

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && state.type !== 'loading') {
        event.preventDefault();
        onClose();
      }
    },
    [onClose, state.type]
  );

  /**
   * Focus management and keyboard event setup
   */
  useEffect(() => {
    if (isOpen) {
      // Focus the close button when dialog opens
      closeButtonRef.current?.focus();

      // Add keyboard event listener
      document.addEventListener('keydown', handleKeyDown);

      // Prevent body scroll when dialog is open
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleKeyDown]);

  // Don't render anything if dialog is not open
  if (!isOpen) {
    return null;
  }

  const isLoading = state.type === 'loading';
  const isError = state.type === 'error';

  // Render dialog using portal
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
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-dialog-title"
        aria-describedby="download-dialog-description"
        className="
          relative z-10
          w-full max-w-md
          rounded-lg border
          border-border
          bg-card
          shadow-lg
          animate-in fade-in zoom-in-95 duration-200
          overflow-hidden
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div
              className="
                flex-shrink-0
                rounded-full
                bg-primary/10
                p-2
                dark:bg-primary/20
              "
            >
              <DownloadIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2
                id="download-dialog-title"
                className="text-lg font-semibold text-foreground"
              >
                Download Website
              </h2>
              <p
                id="download-dialog-description"
                className="text-sm text-muted-foreground truncate max-w-[200px]"
                title={websiteTitle}
              >
                {websiteTitle}
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="
              p-2 rounded-md
              text-muted-foreground
              hover:text-foreground hover:bg-muted
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring focus-visible:ring-offset-2
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            aria-label="Close dialog"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Error state */}
          {isError && (
            <div
              className="
                flex items-start gap-3 mb-4 p-3
                rounded-md
                bg-destructive/10 border border-destructive/30
              "
              role="alert"
            >
              <AlertIcon className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-destructive font-medium">
                  Download Failed
                </p>
                <p className="text-sm text-destructive/80 mt-1">
                  {state.message}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="
                  px-3 py-1.5 rounded-md
                  text-sm font-medium
                  bg-destructive text-destructive-foreground
                  hover:bg-destructive/90
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-ring focus-visible:ring-offset-2
                  transition-colors
                "
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading state overlay */}
          {isLoading && (
            <div
              className="
                flex items-center justify-center gap-3 mb-4 p-4
                rounded-md
                bg-muted/50
              "
              role="status"
              aria-live="polite"
            >
              <SpinnerIcon className="h-5 w-5 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                Generating {state.format === 'single' ? 'HTML file' : 'ZIP archive'}...
              </p>
            </div>
          )}

          {/* Format options */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              Choose download format:
            </p>

            {DOWNLOAD_OPTIONS.map((option) => {
              const isCurrentlyLoading = isLoading && state.format === option.format;

              return (
                <button
                  key={option.format}
                  type="button"
                  onClick={() => handleFormatSelect(option.format)}
                  disabled={isLoading}
                  className={`
                    w-full flex items-start gap-4 p-4
                    rounded-lg border
                    text-left
                    transition-all
                    focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-ring focus-visible:ring-offset-2
                    ${
                      isCurrentlyLoading
                        ? 'border-primary bg-primary/5 cursor-wait'
                        : isLoading
                          ? 'border-border bg-muted/30 cursor-not-allowed opacity-60'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer'
                    }
                  `}
                  aria-describedby={`${option.format}-description`}
                >
                  <div
                    className={`
                      flex-shrink-0 p-2 rounded-md
                      ${isCurrentlyLoading ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}
                    `}
                  >
                    {isCurrentlyLoading ? (
                      <SpinnerIcon className="h-6 w-6 animate-spin" />
                    ) : (
                      option.icon
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {option.title}
                    </p>
                    <p
                      id={`${option.format}-description`}
                      className="text-sm text-muted-foreground mt-0.5"
                    >
                      {option.description}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1 font-mono">
                      {option.filename(websiteTitle)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="
              px-4 py-2 rounded-md
              text-sm font-medium
              bg-secondary text-secondary-foreground
              hover:bg-secondary/80
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring focus-visible:ring-offset-2
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default DownloadDialog;
