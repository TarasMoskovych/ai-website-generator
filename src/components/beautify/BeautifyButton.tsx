/**
 * BeautifyButton Component
 * A reusable button component that triggers the website beautification workflow
 *
 * Requirements:
 * - 5.1: Display a Beautify_Button in the action toolbar alongside existing buttons
 * - 5.2: Display a sparkle or wand icon to indicate enhancement functionality
 * - 5.3: Initiate a beautification request when clicked
 * - 5.4: Display a loading spinner and be disabled while beautification is in progress
 *
 * This component:
 * 1. Renders a button with sparkle/wand icon
 * 2. Supports multiple variants (primary, secondary, icon-only)
 * 3. Shows loading spinner when isLoading is true
 * 4. Handles disabled state appropriately
 * 5. Accessible with proper ARIA attributes
 * 6. Supports dark mode with WCAG AA compliant colors
 */

'use client';

import { useCallback } from 'react';

/**
 * SparklesIcon component
 * A sparkle/wand icon to indicate enhancement functionality
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
 * SpinnerIcon component
 * Loading spinner for async operations
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
 * BeautifyButton props following the design specification
 */
export interface BeautifyButtonProps {
  /** Whether beautification is in progress */
  isLoading?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Click handler */
  onClick: () => void;
  /** Button variant for different contexts */
  variant?: 'primary' | 'secondary' | 'icon-only';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get variant-specific styles
 */
function getVariantStyles(variant: BeautifyButtonProps['variant']): string {
  switch (variant) {
    case 'primary':
      return `
        bg-primary
        text-primary-foreground
        hover:bg-primary/90
        shadow-sm
      `;
    case 'secondary':
      return `
        bg-secondary
        text-secondary-foreground
        hover:bg-secondary/80
      `;
    case 'icon-only':
      return `
        bg-background/90
        backdrop-blur-sm
        text-muted-foreground
        hover:bg-primary/10
        hover:text-primary
      `;
    default:
      return `
        bg-primary
        text-primary-foreground
        hover:bg-primary/90
        shadow-sm
      `;
  }
}

/**
 * Get variant-specific size styles
 */
function getSizeStyles(variant: BeautifyButtonProps['variant']): string {
  if (variant === 'icon-only') {
    return 'p-2 rounded-full';
  }
  return 'px-4 py-2 rounded-md gap-2';
}

/**
 * BeautifyButton component
 * Triggers the beautification workflow with proper state handling
 *
 * @example
 * // Primary variant (default)
 * <BeautifyButton onClick={handleBeautify} />
 *
 * @example
 * // With loading state
 * <BeautifyButton onClick={handleBeautify} isLoading={true} />
 *
 * @example
 * // Icon-only variant for compact UI
 * <BeautifyButton onClick={handleBeautify} variant="icon-only" />
 *
 * @example
 * // Secondary variant
 * <BeautifyButton onClick={handleBeautify} variant="secondary" />
 */
export function BeautifyButton({
  isLoading = false,
  disabled = false,
  onClick,
  variant = 'primary',
  className = '',
}: BeautifyButtonProps) {
  const isDisabled = disabled || isLoading;

  /**
   * Handle button click
   */
  const handleClick = useCallback(() => {
    if (!isDisabled) {
      onClick();
    }
  }, [isDisabled, onClick]);

  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(variant);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center
        text-sm font-medium
        transition-all duration-200
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-ring
        focus-visible:ring-offset-2
        focus-visible:ring-offset-background
        disabled:opacity-50
        disabled:cursor-not-allowed
        ${variantStyles}
        ${sizeStyles}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      aria-label={isLoading ? 'Beautifying website...' : 'Beautify website'}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <SpinnerIcon className="h-4 w-4 animate-spin" />
      ) : (
        <SparklesIcon className="h-4 w-4" />
      )}
      {variant !== 'icon-only' && (
        <span>{isLoading ? 'Beautifying...' : 'Beautify'}</span>
      )}
    </button>
  );
}

export default BeautifyButton;
