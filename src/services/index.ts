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

// HTML Sanitization Service
export {
  sanitize,
  HtmlSanitizer,
  htmlSanitizer,
} from './htmlSanitizer';
export type { HtmlSanitizerService } from './htmlSanitizer';

// Website Repository Service
export {
  save,
  getById,
  getAllByUser,
  update,
  deleteWebsite,
  default as websiteRepository,
} from './websiteRepository';
export type {
  PaginatedResult,
  GetAllByUserOptions,
  WebsiteRepositoryService,
} from './websiteRepository';

// Download Service
export {
  generateSingleFile,
  generateZipArchive,
  downloadBlob,
  DownloadServiceImpl,
  downloadService,
} from './downloadService';
export type { DownloadService } from './downloadService';

// Thumbnail Service
export {
  generateThumbnail,
  getPlaceholderThumbnail,
  isValidThumbnailDataUrl,
  thumbnailService,
} from './thumbnailService';
export type {
  ThumbnailOptions,
  ThumbnailResult,
  ThumbnailService,
} from './thumbnailService';

// Image Processor Service
export {
  processImageForClaude,
  getImageDimensions,
  validateImageDimensions,
  default as imageProcessorService,
} from './imageProcessor';
export type { ProcessedImage } from './imageProcessor';

// Error Handling Service
export {
  // Error message utilities
  ERROR_MESSAGE_MAP,
  getErrorMessage,
  getErrorMessageWithWaitTime,
  // Retry utilities
  withRetry,
  isRetryableError,
  // Type guards
  isAppError,
  // Rate limit parsing
  parseRateLimitWaitTime,
  parseRateLimitFromHeaders,
  // Error normalization
  normalizeError,
  categorizeError,
  createErrorFromResponse,
  // Fetch wrappers
  fetchWithErrorHandling,
  fetchWithRetry,
  // Service singleton
  errorHandlingService,
} from './errorHandling';
export type { RetryOptions, RateLimitResponse } from './errorHandling';

// Beautify Services
export {
  // Completeness Detector
  GENERATION_MARKER,
  STRUCTURAL_ELEMENTS,
  hasGenerationMarker,
  detectMissingStructuralElements,
  detectTruncationIssues,
  detectCompleteness,
  completenessDetector,
  // Beautify Service
  beautifyWebsiteStream,
  ensureGenerationMarker,
  beautifyService,
  // Beautify Prompts
  COMPLETION_PROMPT,
  ENHANCEMENT_PROMPT,
  ORIGINAL_PROMPT_CONTEXT_TEXT,
  ORIGINAL_PROMPT_UNAVAILABLE_TEXT,
  REFERENCE_IMAGE_CONTEXT_TEXT,
  REFERENCE_IMAGE_UNAVAILABLE_TEXT,
  buildCompletionPrompt,
  buildEnhancementPrompt,
  beautifyPrompts,
} from './beautify';
export type {
  ReferenceImageMimeType,
  BeautifyStreamRequest,
  BeautifyEventType,
  BeautificationMode,
  BeautifyStreamEvent,
  StructuralElement,
  CompletenessResult,
  BeautifyOptions,
  BeautifyLoadingStage,
  BeautifyDialogResult,
  ComparisonMode,
  ViewportMode,
} from './beautify';
