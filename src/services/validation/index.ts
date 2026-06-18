/**
 * Validation Services Index
 * Re-exports all validation services for convenient importing
 */

// Types
export type { ValidationResult } from './types';

// Text Input Validator
export {
  validateTextInput,
  TextInputValidator,
  textInputValidator,
  default as defaultTextInputValidator,
} from './textInputValidator';

// Screenshot Input Validator
export {
  validateScreenshotInput,
  validateMimeType,
  validateFileSize,
  validateDimensions,
  default as screenshotInputValidator,
} from './screenshotInputValidator';
export type { ScreenshotInputValidator } from './screenshotInputValidator';

// Title Validator
export {
  validateTitle,
  sanitizeTitle,
  TitleValidator,
  titleValidator,
  TITLE_VALIDATION_ERRORS,
  default as defaultTitleValidator,
} from './titleValidator';
export type { TitleValidationResult } from './titleValidator';
