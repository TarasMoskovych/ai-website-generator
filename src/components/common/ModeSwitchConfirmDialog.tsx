/**
 * ModeSwitchConfirmDialog Component
 * A confirmation dialog displayed when switching input modes with existing content
 *
 * Requirements:
 * - 9.7: Display confirmation dialog when switching modes with existing content (at least one non-whitespace character)
 * - 9.8: Clear the previous input and activate the selected mode on confirm
 * - 9.9: Retain the current input and keep the original mode active on cancel
 *
 * This component:
 * 1. Displays a modal dialog warning users that existing content will be cleared
 * 2. Provides confirm and cancel options
 * 3. Uses portal rendering to overlay on top of all content
 * 4. Accessible with proper ARIA attributes and keyboard navigation
 * 5. Supports dark mode with WCAG AA compliant colors
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { InputMode } from '@/types';

/**
 * ModeSwitchConfirmDialog props
 */
export interface ModeSwitchConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** The mode the user is switching to */
  targetMode: InputMode;
  /** Callback when the user confirms the mode switch */
  onConfirm: () => void;
  /** Callback when the user cancels the mode switch */
  onCancel: () => void;
}

/**
 * Warning icon component
 */
function WarningIcon({ className }: { className?: string }) {
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
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/**
 * Get display name for input mode
 */
function getModeDisplayName(mode: InputMode): string {
  return mode === 'text' ? 'text description' : 'screenshot upload';
}

/**
 * ModeSwitchConfirmDialog component
 * Displays a confirmation dialog when switching input modes with existing content
 *
 * @example
 * <ModeSwitchConfirmDialog
 *   isOpen={showConfirmDialog}
 *   targetMode="screenshot"
 *   onConfirm={handleConfirmModeSwitch}
 *   onCancel={() => setShowConfirmDialog(false)}
 * />
 */
export function ModeSwitchConfirmDialog({
  isOpen,
  targetMode,
  onConfirm,
  onCancel,
}: ModeSwitchConfirmDialogProps) {
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
        aria-labelledby="mode-switch-dialog-title"
        aria-describedby="mode-switch-dialog-description"
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
        {/* Header with warning icon */}
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
            <WarningIcon className="h-6 w-6 text-destructive" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title */}
            <h2
              id="mode-switch-dialog-title"
              className="
                text-lg font-semibold
                text-foreground
              "
            >
              Switch input mode?
            </h2>

            {/* Description */}
            <p
              id="mode-switch-dialog-description"
              className="
                mt-2 text-sm
                text-muted-foreground
              "
            >
              Switching to {getModeDisplayName(targetMode)} mode will clear your
              current input. This action cannot be undone.
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
            "
          >
            Cancel
          </button>

          {/* Confirm button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="
              inline-flex items-center justify-center
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
            "
          >
            Clear and switch
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ModeSwitchConfirmDialog;
