/**
 * Services Index
 * Re-exports all services for convenient importing
 */

// Auth Service
export {
  signInWithGoogle,
  signOut,
  getCurrentUser,
  onAuthStateChange,
  default as authService,
} from './authService';
export type { AuthService } from './authService';

// Validation Services
export type {
  ValidationResult,
  ScreenshotInputValidator,
  TitleValidationResult,
} from './validation';
export {
  // Text Input Validator
  validateTextInput,
  TextInputValidator,
  textInputValidator,
  // Screenshot Input Validator
  validateScreenshotInput,
  validateMimeType,
  validateFileSize,
  validateDimensions,
  screenshotInputValidator,
  // Title Validator
  validateTitle,
  sanitizeTitle,
  TitleValidator,
  titleValidator,
  TITLE_VALIDATION_ERRORS,
} from './validation';

// Generation Services
export {
  // Text Generation
  generateWebsiteFromText,
  TextGenerationError,
  TextGenerationErrorCode,
  textGeneration,
  // Screenshot Generation
  generateWebsiteFromImage,
  ScreenshotGenerationError,
  ScreenshotGenerationErrorCode,
  screenshotGeneration,
  // Code Extraction
  extractCodeFromResponse,
  extractHtmlFromResponse,
  extractCssFromResponse,
  extractTitleFromResponse,
  codeExtractor,
} from './generation';
export type {
  ImageMimeType,
  ExtractionResult,
  ExtractionSuccess,
  ExtractionFailure,
} from './generation';
