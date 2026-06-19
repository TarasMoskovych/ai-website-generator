/**
 * InputModeSelector Component
 * A component for switching between text and screenshot input modes
 *
 * Requirements:
 * - 9.1: Display labeled options for text input and screenshot upload with icons
 * - 9.3: Visually distinguish active input mode from inactive mode
 * - 9.6: Allow only one input mode to be active at a time
 *
 * This component:
 * 1. Displays two mode options: text description and screenshot upload
 * 2. Shows corresponding icons for each mode
 * 3. Highlights the currently active mode with visual distinction
 * 4. Triggers mode change callback when user selects a different mode
 * 5. Accessible with proper ARIA attributes and keyboard navigation
 */

'use client';

import { useCallback } from 'react';
import { InputMode } from '@/types';

/**
 * InputModeSelector props
 * Based on the design document interface
 */
export interface InputModeSelectorProps {
  /** Currently active input mode */
  activeMode: InputMode;
  /** Callback when mode changes */
  onModeChange: (mode: InputMode) => void;
  /** Whether the current input has content (used by parent for confirmation logic) */
  hasContent: boolean;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

/**
 * Text/Document icon for text input mode
 */
function TextIcon({ className }: { className?: string }) {
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
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

/**
 * Image/Screenshot icon for screenshot input mode
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
 * Mode option configuration
 */
interface ModeOption {
  value: InputMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Available input mode options
 */
const modeOptions: ModeOption[] = [
  {
    value: 'text',
    label: 'Text Description',
    description: 'Describe your website in natural language',
    icon: TextIcon,
  },
  {
    value: 'screenshot',
    label: 'Screenshot Upload',
    description: 'Upload an image to replicate',
    icon: ImageIcon,
  },
];

/**
 * InputModeSelector component
 * Allows users to switch between text and screenshot input modes
 *
 * @example
 * // Basic usage
 * <InputModeSelector
 *   activeMode="text"
 *   onModeChange={(mode) => setMode(mode)}
 *   hasContent={false}
 * />
 *
 * @example
 * // With content (parent handles confirmation)
 * <InputModeSelector
 *   activeMode="screenshot"
 *   onModeChange={handleModeChange}
 *   hasContent={true}
 * />
 */
export function InputModeSelector({
  activeMode,
  onModeChange,
  hasContent,
  disabled = false,
}: InputModeSelectorProps) {
  /**
   * Handle mode selection
   * Parent component is responsible for showing confirmation if hasContent is true
   */
  const handleModeSelect = useCallback(
    (mode: InputMode) => {
      if (disabled || mode === activeMode) {
        return;
      }
      onModeChange(mode);
    },
    [activeMode, onModeChange, disabled]
  );

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, mode: InputMode) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleModeSelect(mode);
      }
    },
    [handleModeSelect]
  );

  return (
    <div
      className="w-full"
      role="radiogroup"
      aria-label="Select input mode"
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {modeOptions.map((option) => {
          const OptionIcon = option.icon;
          const isActive = activeMode === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={`${option.label}: ${option.description}`}
              onClick={() => handleModeSelect(option.value)}
              onKeyDown={(e) => handleKeyDown(e, option.value)}
              disabled={disabled}
              className={`
                relative flex flex-col items-center justify-center
                gap-2 p-4 sm:p-6
                rounded-lg border-2
                transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                disabled:pointer-events-none disabled:opacity-50
                ${
                  isActive
                    ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                    : 'border-border bg-background hover:border-muted-foreground/50 hover:bg-accent/50'
                }
              `}
            >
              {/* Active indicator dot */}
              {isActive && (
                <span
                  className="
                    absolute top-2 right-2
                    h-2 w-2 rounded-full
                    bg-primary
                  "
                  aria-hidden="true"
                />
              )}

              {/* Icon */}
              <OptionIcon
                className={`
                  h-8 w-8 sm:h-10 sm:w-10
                  transition-colors
                  ${isActive ? 'text-primary' : 'text-muted-foreground'}
                `}
              />

              {/* Label */}
              <span
                className={`
                  text-sm sm:text-base font-medium
                  transition-colors
                  ${isActive ? 'text-foreground' : 'text-muted-foreground'}
                `}
              >
                {option.label}
              </span>

              {/* Description (hidden on small screens) */}
              <span
                className={`
                  hidden sm:block
                  text-xs text-center
                  transition-colors
                  ${isActive ? 'text-muted-foreground' : 'text-muted-foreground/70'}
                `}
              >
                {option.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Screen reader hint about current content */}
      {hasContent && (
        <p className="sr-only">
          Note: Switching modes may clear your current input
        </p>
      )}
    </div>
  );
}

export default InputModeSelector;
