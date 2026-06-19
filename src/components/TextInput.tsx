/**
 * TextInput Component
 * A textarea component for entering website descriptions with character count and validation
 *
 * Requirements:
 * - 9.4: Display a text area for entering the website description
 * - 1.1: Validate that input is non-empty and contains at least 10 characters
 * - 1.6: Validate that input does not exceed 10,000 characters
 *
 * This component:
 * 1. Displays a textarea for entering website description
 * 2. Shows character count with min (10) and max (10,000) limits
 * 3. Displays validation errors inline
 * 4. Includes a submit button for generation
 * 5. Accessible with proper ARIA attributes
 */

'use client';

import { useCallback, useId, useMemo } from 'react';
import { VALIDATION } from '@/lib/constants';

/**
 * TextInput props based on the design document interface
 */
export interface TextInputProps {
  /** Current textarea value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Callback when submit button is clicked */
  onSubmit: () => void;
  /** Whether the input and submit button are disabled */
  disabled: boolean;
  /** Validation error message to display */
  error?: string;
}

const { MIN_LENGTH, MAX_LENGTH } = VALIDATION.TEXT_INPUT;

/**
 * Sparkles icon for the generate button
 */
function SparklesIcon({ className }: { className?: string }) {
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
 * TextInput component
 * Provides a textarea for entering website descriptions with character count and validation
 *
 * @example
 * // Basic usage
 * <TextInput
 *   value={description}
 *   onChange={setDescription}
 *   onSubmit={handleGenerate}
 *   disabled={false}
 * />
 *
 * @example
 * // With validation error
 * <TextInput
 *   value={description}
 *   onChange={setDescription}
 *   onSubmit={handleGenerate}
 *   disabled={false}
 *   error="Description must be at least 10 characters"
 * />
 */
export function TextInput({
  value,
  onChange,
  onSubmit,
  disabled,
  error,
}: TextInputProps) {
  const textareaId = useId();
  const errorId = useId();
  const charCountId = useId();

  const characterCount = value.length;
  const isBelowMinimum = characterCount < MIN_LENGTH;
  const isAboveMaximum = characterCount > MAX_LENGTH;
  const hasValidLength = !isBelowMinimum && !isAboveMaximum;
  const canSubmit = hasValidLength && !disabled;

  /**
   * Determine character count color based on validation state
   */
  const charCountColor = useMemo(() => {
    if (isAboveMaximum) {
      return 'text-destructive';
    }
    if (characterCount >= MIN_LENGTH) {
      return 'text-green-600 dark:text-green-400';
    }
    return 'text-muted-foreground';
  }, [characterCount, isAboveMaximum]);

  /**
   * Handle textarea value change
   */
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(event.target.value);
    },
    [onChange]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (canSubmit) {
        onSubmit();
      }
    },
    [canSubmit, onSubmit]
  );

  /**
   * Handle keyboard shortcut (Ctrl/Cmd + Enter to submit)
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && canSubmit) {
        event.preventDefault();
        onSubmit();
      }
    },
    [canSubmit, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="space-y-2">
        {/* Label */}
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-foreground"
        >
          Website Description
        </label>

        {/* Textarea */}
        <div className="relative">
          <textarea
            id={textareaId}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Describe the website you want to create. For example: 'A modern portfolio website for a photographer with a dark theme, featuring a hero section, gallery grid, about section, and contact form.'"
            rows={8}
            className={`
              w-full
              px-4 py-3
              rounded-lg
              border-2
              bg-background
              text-foreground
              placeholder:text-muted-foreground
              resize-y
              min-h-[200px]
              transition-colors duration-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
              disabled:cursor-not-allowed disabled:opacity-50
              ${
                error || isAboveMaximum
                  ? 'border-destructive focus-visible:ring-destructive'
                  : 'border-border hover:border-muted-foreground/50 focus-visible:border-primary'
              }
            `}
            aria-describedby={`${charCountId} ${error ? errorId : ''}`}
            aria-invalid={!!error || isAboveMaximum}
          />
        </div>

        {/* Character count and validation info */}
        <div className="flex items-center justify-between text-sm">
          {/* Character count */}
          <p
            id={charCountId}
            className={`${charCountColor} transition-colors`}
            aria-live="polite"
          >
            <span className="font-mono">{characterCount.toLocaleString()}</span>
            <span className="text-muted-foreground">
              {' / '}
              {MAX_LENGTH.toLocaleString()} characters
            </span>
            {isBelowMinimum && characterCount > 0 && (
              <span className="ml-2 text-muted-foreground">
                ({MIN_LENGTH - characterCount} more needed)
              </span>
            )}
          </p>

          {/* Minimum requirement hint */}
          <p className="text-muted-foreground">
            Minimum: {MIN_LENGTH} characters
          </p>
        </div>

        {/* Validation error message */}
        {error && (
          <p
            id={errorId}
            className="flex items-center gap-2 text-sm text-destructive"
            role="alert"
          >
            <AlertCircleIcon className="h-4 w-4 flex-shrink-0" />
            {error}
          </p>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={!canSubmit}
        className={`
          w-full
          inline-flex items-center justify-center gap-2
          px-6 py-3
          rounded-lg
          text-base font-semibold
          transition-all duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          ${
            canSubmit
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-sm'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }
        `}
        aria-label="Generate website from description"
      >
        <SparklesIcon className="h-5 w-5" />
        Generate Website
      </button>

      {/* Keyboard shortcut hint */}
      <p className="text-center text-xs text-muted-foreground">
        Press{' '}
        <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">
          {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac')
            ? '⌘'
            : 'Ctrl'}
        </kbd>
        {' + '}
        <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">
          Enter
        </kbd>
        {' to generate'}
      </p>
    </form>
  );
}

/**
 * Alert circle icon for error messages
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
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

export default TextInput;
