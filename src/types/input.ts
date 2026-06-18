/**
 * Input Types
 * Defines types for user input handling
 */

/**
 * State for text-based input mode
 */
export interface TextInputState {
  /** Input mode identifier */
  mode: 'text';
  /** The text description entered by the user */
  value: string;
  /** Validation error message, if any */
  error: string | null;
}

/**
 * State for screenshot-based input mode
 */
export interface ScreenshotInputState {
  /** Input mode identifier */
  mode: 'screenshot';
  /** The uploaded file, or null if none selected */
  file: File | null;
  /** Data URL for image preview, or null if no file */
  preview: string | null;
  /** Validation error message, if any */
  error: string | null;
}

/**
 * Union type for all input states
 */
export type InputState = TextInputState | ScreenshotInputState;

/**
 * Input mode type
 */
export type InputMode = 'text' | 'screenshot';

/**
 * Initial state for text input
 */
export const initialTextInputState: TextInputState = {
  mode: 'text',
  value: '',
  error: null,
};

/**
 * Initial state for screenshot input
 */
export const initialScreenshotInputState: ScreenshotInputState = {
  mode: 'screenshot',
  file: null,
  preview: null,
  error: null,
};
