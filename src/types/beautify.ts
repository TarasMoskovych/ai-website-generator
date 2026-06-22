/**
 * Beautify Types
 * Defines types for the website beautification process
 *
 * @description Types and interfaces for the beautify feature including
 * API requests, streaming events, completeness detection, and options.
 */

/**
 * Allowed MIME types for reference images
 * Validates: Requirement 4.7 - Reference image MIME type validation
 */
export type ReferenceImageMimeType = 'image/png' | 'image/jpeg' | 'image/webp';

/**
 * Request body interface for beautification API
 * Validates: Requirement 4.4 - API accepts JSON body with required and optional fields
 */
export interface BeautifyStreamRequest {
  /** Firestore document ID of the website (required) */
  websiteId: string;
  /** Current HTML content (required) */
  html: string;
  /** Current CSS content (required) */
  css: string;
  /** Original text prompt (optional, fetched from DB if not provided) */
  originalPrompt?: string;
  /** Base64-encoded reference image (optional) */
  referenceImage?: string;
  /** MIME type of reference image (required if referenceImage is provided) */
  referenceImageMimeType?: ReferenceImageMimeType;
}

/**
 * SSE event types emitted by the beautification API
 * - start: Beautification process has started
 * - mode: Indicates the beautification mode (complete or enhance)
 * - text: Streaming content chunk from Claude API
 * - done: Beautification completed with final result
 * - error: An error occurred during beautification
 */
export type BeautifyEventType = 'start' | 'mode' | 'text' | 'done' | 'error';

/**
 * Beautification mode determined by completeness detection
 * - complete: Website is incomplete, will be completed before enhancement
 * - enhance: Website is complete, will receive visual enhancements only
 */
export type BeautificationMode = 'complete' | 'enhance';

/**
 * Stream event interface for beautification SSE responses
 * Validates: Requirement 4.5 - API returns validation error events
 */
export interface BeautifyStreamEvent {
  /** Type of the event */
  type: BeautifyEventType;
  /** Streaming content chunk (for 'text' events) */
  content?: string;
  /** Beautification mode (for 'mode' events) */
  mode?: BeautificationMode;
  /** List of completeness issues detected (for 'mode' events when mode is 'complete') */
  issues?: string[];
  /** Final beautification result (for 'done' events) */
  result?: {
    html: string;
    css: string;
  };
  /** Error message (for 'error' events) */
  error?: string;
}

/**
 * Structural elements that constitute a complete webpage
 */
export type StructuralElement = 'header' | 'main' | 'footer';

/**
 * Result of completeness detection analysis
 * Used by CompletenessDetector to classify website state
 */
export interface CompletenessResult {
  /** Whether the website is structurally complete */
  isComplete: boolean;
  /** Classification for display purposes */
  status: 'complete' | 'incomplete';
  /** List of detected issues (empty if complete) */
  issues: string[];
  /** Whether the generation marker was found in HTML */
  hasGenerationMarker: boolean;
  /** Missing structural elements (header, main, footer) */
  missingElements: StructuralElement[];
  /** Truncation issues detected (unclosed tags, cut-off text, incomplete CSS) */
  truncationIssues: string[];
}

/**
 * Options passed to the BeautifyService for website beautification
 */
export interface BeautifyOptions {
  /** Current HTML content to beautify */
  html: string;
  /** Current CSS content to beautify */
  css: string;
  /** Original text prompt for context (optional) */
  originalPrompt?: string | null;
  /** Base64-encoded reference image for style guidance (optional) */
  referenceImage?: string;
  /** MIME type of the reference image */
  referenceImageMimeType?: string;
  /** Result from completeness detection */
  completenessResult: CompletenessResult;
}

/**
 * Stages of the beautification loading overlay
 */
export type BeautifyLoadingStage = 'analyzing' | 'completing' | 'enhancing' | 'finalizing';

/**
 * Result from the beautify options dialog
 */
export interface BeautifyDialogResult {
  /** Whether to use a reference image */
  useReferenceImage: boolean;
  /** Base64 encoded image data (if using reference) */
  referenceImage?: string;
  /** MIME type of the reference image */
  referenceImageMimeType?: ReferenceImageMimeType;
}

/**
 * Comparison mode for the preview comparison component
 */
export type ComparisonMode = 'side-by-side' | 'overlay';

/**
 * Viewport mode for preview iframes
 */
export type ViewportMode = 'desktop' | 'tablet' | 'mobile';
