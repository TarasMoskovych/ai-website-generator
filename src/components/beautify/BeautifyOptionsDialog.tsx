/**
 * BeautifyOptionsDialog Component
 * A dialog for selecting beautification options including optional reference image upload.
 *
 * Requirements:
 * - 0.1.1: Display options dialog before starting beautification
 * - 0.1.2: Display "Quick Beautify" and "Beautify with Reference Image" options
 * - 0.1.3: Quick Beautify uses only originalPrompt and current HTML/CSS
 * - 0.1.4: Reference image option displays drag-and-drop upload area
 * - 0.1.5: Accept PNG, JPG, JPEG, WebP formats
 * - 0.1.6: Validate 10MB size limit
 * - 0.1.7: Show image preview before confirmation
 * - 0.1.9: Provide Cancel button
 *
 * This component:
 * 1. Displays a modal dialog with beautification options
 * 2. Allows optional reference image upload with drag-and-drop
 * 3. Validates image format and size
 * 4. Converts uploaded image to base64
 * 5. Shows preview of selected image
 * 6. Provides confirm and cancel actions
 * 7. Accessible with proper ARIA attributes and keyboard navigation
 * 8. Supports dark mode with WCAG AA compliant colors
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { VALIDATION } from '@/lib/constants';
import type { BeautifyDialogResult, ReferenceImageMimeType } from '@/types/beautify';

/**
 * BeautifyOptionsDialog props
 */
export interface BeautifyOptionsDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Handler when user confirms beautification */
  onConfirm: (result: BeautifyDialogResult) => void;
}

/**
 * Allowed MIME types for reference images
 */
const ALLOWED_MIME_TYPES: ReferenceImageMimeType[] = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Human-readable format list
 */
const ALLOWED_FORMATS_DISPLAY = 'PNG, JPEG, WebP';

/**
 * Maximum file size in bytes (10MB)
 */
const MAX_SIZE_BYTES = VALIDATION.SCREENSHOT_INPUT.MAX_SIZE_BYTES;

/**
 * Maximum file size in MB for display
 */
const MAX_SIZE_MB = MAX_SIZE_BYTES / (1024 * 1024);

/**
 * Beautification mode selection
 */
type BeautifyMode = 'quick' | 'reference';

/**
 * Sparkle icon for beautify action
 */
function SparkleIcon({ className }: { className?: string }) {
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
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

/**
 * Image icon for reference image option
 */
function ImageIcon({ className }: { className?: string }) {
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
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

/**
 * Upload cloud icon
 */
function UploadIcon({ className }: { className?: string }) {
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
      <polyline points="17,8 12,3 7,8" />
      <line x1="12" y1="3" x2="12" y2="15" />
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
 * Check icon for selected option
 */
function CheckIcon({ className }: { className?: string }) {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/**
 * Validate file type
 */
function isValidMimeType(type: string): type is ReferenceImageMimeType {
  return ALLOWED_MIME_TYPES.includes(type as ReferenceImageMimeType);
}

/**
 * Validate file
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  if (!isValidMimeType(file.type)) {
    return {
      valid: false,
      error: `Invalid file format. Please upload a ${ALLOWED_FORMATS_DISPLAY} image.`,
    };
  }

  if (file.size > MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the maximum limit of ${MAX_SIZE_MB}MB.`,
    };
  }

  return { valid: true };
}

/**
 * Convert file to base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * BeautifyOptionsDialog component
 * Displays a dialog for selecting beautification options
 *
 * @example
 * <BeautifyOptionsDialog
 *   isOpen={showOptionsDialog}
 *   onClose={() => setShowOptionsDialog(false)}
 *   onConfirm={(result) => startBeautification(result)}
 * />
 */
export function BeautifyOptionsDialog({
  isOpen,
  onClose,
  onConfirm,
}: BeautifyOptionsDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousUrlRef = useRef<string | null>(null);

  const [selectedMode, setSelectedMode] = useState<BeautifyMode>('quick');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  /**
   * Generate preview URL using useMemo
   */
  const previewUrl = useMemo(() => {
    if (!selectedFile) {
      return null;
    }
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  /**
   * Handle URL cleanup when previewUrl changes
   */
  useEffect(() => {
    const currentUrl = previewUrl;

    if (previousUrlRef.current && previousUrlRef.current !== currentUrl) {
      URL.revokeObjectURL(previousUrlRef.current);
    }

    previousUrlRef.current = currentUrl;

    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [previewUrl]);

  /**
   * Reset state when dialog closes
   */
  useEffect(() => {
    if (!isOpen) {
      const resetTimeout = setTimeout(() => {
        setSelectedMode('quick');
        setSelectedFile(null);
        setFileError(null);
        setIsDragOver(false);
        setIsConverting(false);
      }, 200);
      return () => clearTimeout(resetTimeout);
    }
  }, [isOpen]);

  /**
   * Handle file selection
   */
  const handleFile = useCallback((file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      setFileError(validation.error ?? 'Invalid file');
      setSelectedFile(null);
      return;
    }

    setFileError(null);
    setSelectedFile(file);
  }, []);

  /**
   * Handle file input change
   */
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
      event.target.value = '';
    },
    [handleFile]
  );

  /**
   * Handle click on upload zone
   */
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Handle drag events
   */
  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = event;
    if (
      clientX < rect.left ||
      clientX >= rect.right ||
      clientY < rect.top ||
      clientY >= rect.bottom
    ) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);

      const files = event.dataTransfer.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  /**
   * Handle confirm button click
   */
  const handleConfirm = useCallback(async () => {
    if (selectedMode === 'quick') {
      onConfirm({
        useReferenceImage: false,
      });
    } else if (selectedFile) {
      setIsConverting(true);
      try {
        const base64 = await fileToBase64(selectedFile);
        onConfirm({
          useReferenceImage: true,
          referenceImage: base64,
          referenceImageMimeType: selectedFile.type as ReferenceImageMimeType,
        });
      } catch {
        setFileError('Failed to process image. Please try again.');
        setIsConverting(false);
      }
    }
  }, [selectedMode, selectedFile, onConfirm]);

  /**
   * Handle close
   */
  const handleClose = useCallback(() => {
    if (!isConverting) {
      onClose();
    }
  }, [onClose, isConverting]);

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget && !isConverting) {
        onClose();
      }
    },
    [onClose, isConverting]
  );

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isConverting) {
        event.preventDefault();
        onClose();
      }
    },
    [onClose, isConverting]
  );

  /**
   * Focus management and keyboard event setup
   */
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleKeyDown]);

  /**
   * Remove selected file
   */
  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setFileError(null);
  }, []);

  // Don't render anything if dialog is not open
  if (!isOpen) {
    return null;
  }

  const canConfirm =
    selectedMode === 'quick' || (selectedMode === 'reference' && selectedFile && !fileError);

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
        aria-labelledby="beautify-options-dialog-title"
        aria-describedby="beautify-options-dialog-description"
        className="
          relative z-10
          w-full max-w-lg
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
              <SparkleIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2
                id="beautify-options-dialog-title"
                className="text-lg font-semibold text-foreground"
              >
                Beautify Website
              </h2>
              <p
                id="beautify-options-dialog-description"
                className="text-sm text-muted-foreground"
              >
                Choose how you want to enhance your website
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            disabled={isConverting}
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
        <div className="p-4 space-y-4">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_MIME_TYPES.join(',')}
            onChange={handleInputChange}
            className="sr-only"
            aria-label="Upload reference image"
          />

          {/* Mode selection */}
          <div className="space-y-3">
            {/* Quick Beautify option */}
            <button
              type="button"
              onClick={() => setSelectedMode('quick')}
              className={`
                w-full flex items-start gap-4 p-4
                rounded-lg border
                text-left
                transition-all
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-ring focus-visible:ring-offset-2
                ${
                  selectedMode === 'quick'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              <div
                className={`
                  flex-shrink-0 p-2 rounded-md
                  ${selectedMode === 'quick' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}
                `}
              >
                <SparkleIcon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">Quick Beautify</p>
                  {selectedMode === 'quick' && (
                    <CheckIcon className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Enhance your website using AI-powered visual improvements based on the current design
                </p>
              </div>
            </button>

            {/* Reference Image option */}
            <button
              type="button"
              onClick={() => setSelectedMode('reference')}
              className={`
                w-full flex items-start gap-4 p-4
                rounded-lg border
                text-left
                transition-all
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-ring focus-visible:ring-offset-2
                ${
                  selectedMode === 'reference'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              <div
                className={`
                  flex-shrink-0 p-2 rounded-md
                  ${selectedMode === 'reference' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}
                `}
              >
                <ImageIcon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    Beautify with Reference Image
                  </p>
                  {selectedMode === 'reference' && (
                    <CheckIcon className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Upload an image to guide the visual style of your enhanced website
                </p>
              </div>
            </button>
          </div>

          {/* Image upload area (shown when reference mode is selected) */}
          {selectedMode === 'reference' && (
            <div className="space-y-3">
              {selectedFile && previewUrl ? (
                /* Image preview */
                <div className="relative rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt={`Preview of ${selectedFile.name}`}
                      className="h-24 w-24 object-cover rounded-md border border-border"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="
                          mt-2 text-xs text-destructive
                          hover:text-destructive/80
                          underline underline-offset-2
                          focus-visible:outline-none focus-visible:ring-2
                          focus-visible:ring-ring
                        "
                      >
                        Remove image
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleUploadClick}
                      className="
                        px-3 py-1.5 rounded-md
                        text-xs font-medium
                        bg-secondary text-secondary-foreground
                        hover:bg-secondary/80
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-ring focus-visible:ring-offset-2
                        transition-colors
                      "
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                /* Upload zone */
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleUploadClick}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleUploadClick();
                    }
                  }}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`
                    flex flex-col items-center justify-center
                    min-h-[150px]
                    rounded-lg border-2 border-dashed
                    transition-all duration-200
                    cursor-pointer
                    focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-ring focus-visible:ring-offset-2
                    ${
                      isDragOver
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-border hover:border-muted-foreground/50 hover:bg-accent/30'
                    }
                    ${fileError ? 'border-destructive/50' : ''}
                  `}
                  aria-label="Click or drag to upload reference image"
                >
                  <div className="flex flex-col items-center gap-2 p-4 text-center">
                    <div
                      className={`
                        p-3 rounded-full
                        ${isDragOver ? 'bg-primary/10' : 'bg-muted'}
                        transition-colors
                      `}
                    >
                      <UploadIcon
                        className={`
                          h-6 w-6
                          ${isDragOver ? 'text-primary' : 'text-muted-foreground'}
                          transition-colors
                        `}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {isDragOver ? 'Drop your image here' : 'Drag and drop an image'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        or{' '}
                        <span className="text-primary underline underline-offset-2">
                          click to browse
                        </span>
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ALLOWED_FORMATS_DISPLAY} • Max {MAX_SIZE_MB}MB
                    </p>
                  </div>
                </div>
              )}

              {/* Error message */}
              {fileError && (
                <div
                  className="
                    flex items-start gap-2
                    p-3 rounded-md
                    bg-destructive/10 border border-destructive/30
                    text-destructive
                  "
                  role="alert"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5 flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm">{fileError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={handleClose}
            disabled={isConverting}
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
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || isConverting}
            className="
              inline-flex items-center gap-2
              px-4 py-2 rounded-md
              text-sm font-medium
              bg-primary text-primary-foreground
              hover:bg-primary/90
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring focus-visible:ring-offset-2
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isConverting && (
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
            <SparkleIcon className="h-4 w-4" />
            {isConverting ? 'Processing...' : 'Start Beautifying'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default BeautifyOptionsDialog;
