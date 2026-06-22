/**
 * Beautify Services Index
 * Re-exports all beautify-related services for convenient importing
 */

// Completeness Detector Service
export {
  GENERATION_MARKER,
  hasGenerationMarker,
  detectCompleteness,
  default as completenessDetector,
} from './completenessDetector';
