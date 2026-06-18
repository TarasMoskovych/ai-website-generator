/**
 * Types Index
 * Re-exports all types for convenient importing
 */

// Auth types
export type { AuthenticatedUser, AuthState } from './auth';

// Website types
export type {
  GeneratedWebsite,
  CreateWebsiteData,
  UpdateWebsiteData,
} from './website';

// Generation types
export type {
  GenerationStage,
  GenerationState,
  GenerationResult,
} from './generation';
export { initialGenerationState } from './generation';

// Input types
export type {
  TextInputState,
  ScreenshotInputState,
  InputState,
  InputMode,
} from './input';
export { initialTextInputState, initialScreenshotInputState } from './input';

// Error types
export type { ErrorCode, AppError } from './error';
export { ERROR_CODES, ERROR_MESSAGES, createAppError } from './error';
