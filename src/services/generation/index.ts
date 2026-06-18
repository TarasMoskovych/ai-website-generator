/**
 * Generation Services Index
 *
 * Re-exports all generation-related services for convenient importing.
 */

// Text Generation Service
export {
  generateWebsiteFromText,
  TextGenerationError,
  TextGenerationErrorCode,
  default as textGeneration,
} from './textGeneration';

// Screenshot Generation Service
export {
  generateWebsiteFromImage,
  ScreenshotGenerationError,
  ScreenshotGenerationErrorCode,
  default as screenshotGeneration,
} from './screenshotGeneration';
export type { ImageMimeType } from './screenshotGeneration';

// Code Extraction Service
export {
  extractCodeFromResponse,
  extractHtmlFromResponse,
  extractCssFromResponse,
  extractTitleFromResponse,
  default as codeExtractor,
} from './codeExtractor';
export type {
  ExtractionResult,
  ExtractionSuccess,
  ExtractionFailure,
} from './codeExtractor';
