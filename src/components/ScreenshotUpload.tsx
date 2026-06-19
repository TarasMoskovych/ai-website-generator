/**
 * ScreenshotUpload Component
 * A component for uploading screenshots via drag-and-drop or click-to-browse
 *
 * Requirements:
 * - 9.5: Display file upload area with drag-and-drop support and click-to-browse option
 * - 2.1: Validate file is an image (PNG, JPG, JPEG, or WebP format)
 * - 2.2: Validate file size does not exceed 10MB
 * - 2.3: Validate image dimensions are at least 200x200 pixels
 *
 * This component:
 * 1. Provides a drag-and-drop zone for file uploads
 * 2. Provides click-to-browse functionality via hidden file input
 * 3. Displays image preview after selection
 * 4. Shows validation errors inline
 * 5. Accessible with proper ARIA attributes and keyboard navigation
 */

'use client';

import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { VALIDATION } from '@/lib/constants';

/**
 * ScreenshotUpload props
 * Based on the design document interface
 */
export interface ScreenshotUploadProps {
  /** Currently selected file, or null if none */
  file: File | null;
  /** Callback when a file is selected */
  onFileSelect: (file: File) => void;
  /** Callback to submit the screenshot for generation */
  onSubmit: () => void;
  /** Whether the component is disabled (e.g., during generation) */
  disabled: boolean;
  /** Validation error message to display */
  error?: string;
}

/**
 * Allowed file types for upload
 */
const ALLOWED_TYPES = VALIDATION.SCREENSHOT_INPUT.ALLOWED_TYPES;

/**
 * Human-readable format list
 */
const ALLOWED_FORMATS_DISPLAY = 'PNG, JPEG, WebP';

/**
 * Maximum file size in MB for display
 */
const MAX_SIZE_MB = VALIDATION.SCREENSHOT_INPUT.MAX_SIZE_BYTES / (1024 * 1024);

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
 * Image icon for preview placeholder
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
 * ScreenshotUpload component
 * Allows users to upload screenshots via drag-and-drop or click-to-browse
 *
 * @example
 * // Basic usage
 * <ScreenshotUpload
 *   file={selectedFile}
 *   onFileSelect={(file) => setSelectedFile(file)}
 *   onSubmit={() => generateWebsite()}
 *   disabled={false}
 * />
 *
 * @example
 * // With error
 * <ScreenshotUpload
 *   file={selectedFile}
 *   onFileSelect={(file) => setSelectedFile(file)}
 *   onSubmit={() => generateWebsite()}
 *   disabled={false}
 *   error="File size exceeds the maximum limit of 10MB."
 * />
 */
export function ScreenshotUpload({
  file,
  onFileSelect,
  onSubmit,
  disabled,
  error,
}: ScreenshotUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const previousUrlRef = useRef<string | null>(null);

  /**
   * Generate preview URL using useMemo
   * This creates a new URL when file changes and tracks cleanup
   */
  const previewUrl = useMemo(() => {
    if (!file) {
      return null;
    }
    return URL.createObjectURL(file);
  }, [file]);

  /**
   * Handle URL cleanup when previewUrl changes
   */
  useEffect(() => {
    // Store the current URL for cleanup
    const currentUrl = previewUrl;

    // Cleanup the previous URL if it exists
    if (previousUrlRef.current && previousUrlRef.current !== currentUrl) {
      URL.revokeObjectURL(previousUrlRef.current);
    }

    // Update the ref to track the current URL
    previousUrlRef.current = currentUrl;

    // Cleanup on unmount
    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [previewUrl]);

  /**
   * Handle file selection from input or drop
   */
  const handleFile = useCallback(
    (selectedFile: File) => {
      if (disabled) return;
      onFileSelect(selectedFile);
    },
    [disabled, onFileSelect]
  );

  /**
   * Handle file input change
   */
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
      // Reset input value to allow re-selecting the same file
      event.target.value = '';
    },
    [handleFile]
  );

  /**
   * Handle click on the upload zone
   */
  const handleClick = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  /**
   * Handle keyboard activation of the upload zone
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  /**
   * Handle drag enter event
   */
  const handleDragEnter = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  /**
   * Handle drag leave event
   */
  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    // Only set drag over to false if leaving the drop zone entirely
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

  /**
   * Handle drag over event (required to allow drop)
   */
  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  /**
   * Handle drop event
   */
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const files = event.dataTransfer.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (!disabled && file && !error) {
        onSubmit();
      }
    },
    [disabled, file, error, onSubmit]
  );

  const hasFile = file !== null;
  const canSubmit = hasFile && !error && !disabled;

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleInputChange}
        disabled={disabled}
        className="sr-only"
        aria-label="Upload screenshot file"
      />

      {/* Drop zone / Preview area */}
      <div
        role="group"
        aria-label={hasFile ? `Selected file: ${file.name}` : 'Screenshot upload area'}
        aria-describedby={error ? 'screenshot-error' : 'screenshot-hint'}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative
          flex flex-col items-center justify-center
          min-h-[200px] sm:min-h-[250px]
          rounded-lg border-2 border-dashed
          transition-all duration-200
          ${
            isDragOver
              ? 'border-primary bg-primary/5 dark:bg-primary/10'
              : hasFile
                ? 'border-border bg-muted/30'
                : 'border-border hover:border-muted-foreground/50 hover:bg-accent/30'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : hasFile ? 'cursor-default' : 'cursor-pointer'}
          ${error ? 'border-destructive/50' : ''}
        `}
        onClick={hasFile ? undefined : handleClick}
      >
        {/* Keyboard accessible upload trigger (only when no file) */}
        {!hasFile && (
          <button
            type="button"
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
            aria-label="Click to browse for an image file"
          />
        )}
        {hasFile && previewUrl ? (
          /* Image preview */
          <div className="relative w-full h-full min-h-[200px] sm:min-h-[250px] p-4">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={`Preview of ${file.name}`}
                className="max-h-[180px] sm:max-h-[220px] max-w-full object-contain rounded"
              />
            </div>

            {/* File name overlay */}
            <div
              className="
                absolute bottom-2 left-2 right-2
                flex items-center justify-between
                gap-2 px-3 py-2
                rounded-md
                bg-background/90 backdrop-blur-sm
                border border-border
              "
            >
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span className="text-sm text-foreground truncate">{file.name}</span>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>

            {/* Change button */}
            <button
              type="button"
              onClick={handleClick}
              disabled={disabled}
              className="
                absolute top-2 right-2
                inline-flex items-center justify-center
                px-3 py-1.5
                rounded-md
                text-xs font-medium
                bg-background/90 backdrop-blur-sm
                border border-border
                text-foreground
                hover:bg-accent
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
              aria-label="Change selected image"
            >
              Change
            </button>
          </div>
        ) : (
          /* Upload prompt */
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div
              className={`
                p-4 rounded-full
                ${isDragOver ? 'bg-primary/10' : 'bg-muted'}
                transition-colors
              `}
            >
              <UploadIcon
                className={`
                  h-8 w-8 sm:h-10 sm:w-10
                  ${isDragOver ? 'text-primary' : 'text-muted-foreground'}
                  transition-colors
                `}
              />
            </div>

            <div className="space-y-1">
              <p className="text-sm sm:text-base font-medium text-foreground">
                {isDragOver ? 'Drop your image here' : 'Drag and drop an image'}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                or{' '}
                <span className="text-primary underline underline-offset-2">
                  click to browse
                </span>
              </p>
            </div>

            <p
              id="screenshot-hint"
              className="text-xs text-muted-foreground"
            >
              {ALLOWED_FORMATS_DISPLAY} • Max {MAX_SIZE_MB}MB • Min 200×200px
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div
          id="screenshot-error"
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
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="
          w-full
          inline-flex items-center justify-center
          gap-2 px-4 py-3
          rounded-lg
          text-base font-medium
          bg-primary text-primary-foreground
          hover:bg-primary/90
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        "
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          <path d="M5 3v4" />
          <path d="M19 17v4" />
          <path d="M3 5h4" />
          <path d="M17 19h4" />
        </svg>
        Generate Website
      </button>
    </form>
  );
}

export default ScreenshotUpload;
