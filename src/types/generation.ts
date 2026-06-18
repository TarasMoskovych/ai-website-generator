/**
 * Generation Types
 * Defines types for the website generation process
 */

/**
 * Stages of the website generation process
 */
export type GenerationStage =
  | 'processing_input'
  | 'generating_html'
  | 'generating_css'
  | 'finalizing';

/**
 * State of the generation process
 */
export interface GenerationState {
  /** Whether generation is currently in progress */
  isGenerating: boolean;
  /** Current stage of generation, or null if not generating */
  stage: GenerationStage | null;
  /** Progress percentage (0-100) */
  progress: number;
  /** Time elapsed since generation started in milliseconds */
  elapsedTime: number;
  /** Error message if generation failed */
  error: string | null;
}

/**
 * Result of a successful website generation
 */
export interface GenerationResult {
  /** Generated HTML code */
  html: string;
  /** Generated CSS code */
  css: string;
  /** Generated or extracted title */
  title: string;
}

/**
 * Initial state for generation
 */
export const initialGenerationState: GenerationState = {
  isGenerating: false,
  stage: null,
  progress: 0,
  elapsedTime: 0,
  error: null,
};
