/**
 * Beautify Services Index
 * Re-exports all beautify-related services for convenient importing
 *
 * Validates: Requirements 2.1, 3.1, 8.3, 8.4, 8.5
 */

// Completeness Detector Service
export {
  GENERATION_MARKER,
  STRUCTURAL_ELEMENTS,
  hasGenerationMarker,
  detectMissingStructuralElements,
  detectTruncationIssues,
  detectCompleteness,
  default as completenessDetector,
} from './completenessDetector';

// Beautify Service
export {
  beautifyWebsiteStream,
  default as beautifyService,
} from './beautifyService';

// Beautify Save Service
export {
  replaceOriginal,
  saveAsNew,
  default as beautifySaveService,
} from './beautifySaveService';
export type {
  SaveResult,
  ReplaceOriginalOptions,
  SaveAsNewOptions,
  BeautifySaveService,
} from './beautifySaveService';

// Beautify Prompts
export {
  COMPLETION_PROMPT,
  ENHANCEMENT_PROMPT,
  ORIGINAL_PROMPT_CONTEXT_TEXT,
  ORIGINAL_PROMPT_UNAVAILABLE_TEXT,
  REFERENCE_IMAGE_CONTEXT_TEXT,
  REFERENCE_IMAGE_UNAVAILABLE_TEXT,
  buildCompletionPrompt,
  buildEnhancementPrompt,
  default as beautifyPrompts,
} from '@/lib/beautifyPrompts';

// Beautify Types
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
} from '@/types/beautify';
