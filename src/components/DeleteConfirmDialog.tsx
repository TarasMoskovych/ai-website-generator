/**
 * DeleteConfirmDialog Component
 * A confirmation dialog displayed when a user requests to delete a generated website
 *
 * Requirements:
 * - 7.1: Display a confirmation dialog that identifies the website by title and provides confirm and cancel options
 * - 7.3: When the user cancels the deletion request, dismiss the confirmation dialog and retain the website data unchanged
 *
 * This component:
 * 1. Displays a modal dialog warning users about permanent deletion
 * 2. Shows the website title to confirm the correct website is being deleted
 * 3. Provides confirm and cancel options
 * 4. Uses portal rendering to overlay on top of all content
 * 5. Accessible with proper ARIA attributes and keyboard navigation
 * 6. Supports dark mode with WCAG AA compliant colors
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * DeleteConfirmDialog props
 */
export interface DeleteConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** The title of the website being deleted */
  websiteTitle: string;
  /** Callback when the user confirms the deletion */
  onConfirm: () => void;
  /** Callback when the user cancels the deletion */
  onCancel: () => void;
  /** Whether deletion is in progress */
  isLoading?: boolean;
  /** Error message to display if deletion failed */
  error?: string | null;
}

/**
 * Trash/Delete icon component
 */
function TrashIcon({ className }: { className?: string }) {
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

/**
 * DeleteConfirmDialog component
 * Displays a confirmation dialog when deleting a website
 *
 * @example
 * <DeleteConfirmDialog
 *   isOpen={showDeleteDialog}
 *   websiteTitle="My Portfolio Website"
 *   onConfirm={handleConfirmDelete}
 *   onCancel={() => setShowDeleteDialog(false)}
 * />
 */
export function DeleteConfirmDialog({
  isOpen,
  websiteTitle,
  onConfirm,
  onCancel,
  isLoading = false,
  error = null,
}: DeleteConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  /**
   * Handle confirm button click
   */
  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  /**
   * Handle cancel button click
   */
  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  /**
   * Handle backdrop click (close dialog)
   */
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onCancel();
      }
    },
    [onCancel]
  );

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    },
    [onCancel]
  );

  /**
   * Focus management and keyboard event setup
   */
  useEffect(() => {
    if (isOpen) {
      // Focus the cancel button when dialog opens (safer default action)
      cancelButtonRef.current?.focus();

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
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-dialog-title"
        aria-describedby="delete-confirm-dialog-description"
        className="
          relative z-10
          w-full max-w-md
          rounded-lg border
          border-border
          bg-card
          p-6
          shadow-lg
          animate-in fade-in zoom-in-95 duration-200
        "
      >
        {/* Header with trash icon */}
        <div className="flex items-start gap-4">
          <div
            className="
              flex-shrink-0
              rounded-full
              bg-destructive/10
              p-2
              dark:bg-destructive/20
            "
          >
            <TrashIcon className="h-6 w-6 text-destructive" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title */}
            <h2
              id="delete-confirm-dialog-title"
              className="
                text-lg font-semibold
                text-foreground
              "
            >
              Delete website?
            </h2>

            {/* Description */}
            <p
              id="delete-confirm-dialog-description"
              className="
                mt-2 text-sm
                text-muted-foreground
              "
            >
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                &quot;{websiteTitle}&quot;
              </span>
              ? This action cannot be undone and will permanently remove the
              website including its HTML, CSS, thumbnail, and all associated
              data.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {/* Cancel button */}
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="
              inline-flex items-center justify-center
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
            Cancel
          </button>

          {/* Delete button */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="
              inline-flex items-center justify-center gap-2
              rounded-md px-4 py-2
              text-sm font-medium
              bg-destructive
              text-destructive-foreground
              hover:bg-destructive/90
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
            {isLoading && (
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
            )}
            {isLoading ? 'Deleting...' : 'Delete website'}
          </button>
        </div>

        {/* Error message (Requirement 7.4) */}
        {error && (
          <div
            className="
              mt-4 p-3 rounded-md
              bg-destructive/10 border border-destructive/20
              text-sm text-destructive
            "
            role="alert"
          >
            <p className="font-medium">Failed to delete website</p>
            <p className="mt-1 text-destructive/80">{error}</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default DeleteConfirmDialog;
