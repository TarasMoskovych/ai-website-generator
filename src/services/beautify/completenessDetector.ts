/**
 * Completeness Detector Service
 *
 * This module provides functionality for detecting whether a generated website
 * is structurally complete or requires completion before beautification.
 *
 * Detection is based on:
 * 1. Presence of the generation marker (`<!-- GENERATION_COMPLETE -->`)
 * 2. Structural elements (header, main, footer)
 * 3. Truncation indicators (unclosed tags, cut-off text)
 *
 * @description Analyzes HTML/CSS to determine website completeness for
 * the beautification process.
 *
 * Validates: Requirements 1.2, 1.3 - Generation marker detection and classification
 */

import type { CompletenessResult, StructuralElement } from '@/types/beautify';

/**
 * Generation marker constant that indicates a website was fully generated.
 * When present, the website is considered complete.
 *
 * Validates: Requirement 1.2 - Check for presence of Generation_Marker
 */
export const GENERATION_MARKER = '<!-- GENERATION_COMPLETE -->';

/**
 * Checks if the HTML content contains the generation marker.
 *
 * The generation marker (`<!-- GENERATION_COMPLETE -->`) indicates that
 * the website was fully generated and is structurally complete.
 *
 * @param html - The HTML content to analyze
 * @returns true if the generation marker is present, false otherwise
 *
 * Validates: Requirement 1.2 - THE Completeness_Detector SHALL check for the presence
 * of a Generation_Marker in the HTML
 *
 * @example
 * ```typescript
 * const html = '<html><!-- GENERATION_COMPLETE --><body>...</body></html>';
 * const hasMarker = hasGenerationMarker(html); // true
 * ```
 */
export function hasGenerationMarker(html: string): boolean {
  if (!html || typeof html !== 'string') {
    return false;
  }
  return html.includes(GENERATION_MARKER);
}

/**
 * Detects website completeness by analyzing HTML and CSS content.
 *
 * The detection process follows this order:
 * 1. Check for generation marker - if present, website is complete
 * 2. Check for structural elements (header, main, footer)
 * 3. Check for truncation indicators
 *
 * @param html - The HTML content to analyze
 * @param css - The CSS content to analyze (currently unused, reserved for future)
 * @returns CompletenessResult with classification and detected issues
 *
 * Validates: Requirements 1.2, 1.3 - Generation marker detection and classification
 *
 * @example
 * ```typescript
 * const result = detectCompleteness('<html><!-- GENERATION_COMPLETE -->...</html>', '');
 * // result.isComplete === true
 * // result.status === 'complete'
 * // result.hasGenerationMarker === true
 * ```
 */
export function detectCompleteness(html: string, css: string): CompletenessResult {
  const issues: string[] = [];
  const missingElements: StructuralElement[] = [];
  const truncationIssues: string[] = [];

  // Check for generation marker first
  // Validates: Requirement 1.2, 1.3 - If marker is present, classify as complete
  const markerPresent = hasGenerationMarker(html);

  if (markerPresent) {
    // Generation marker found - website is complete
    // Validates: Requirement 1.3 - IF the Generation_Marker is present,
    // THEN THE Completeness_Detector SHALL classify the website as "complete"
    return {
      isComplete: true,
      status: 'complete',
      issues: [],
      hasGenerationMarker: true,
      missingElements: [],
      truncationIssues: [],
    };
  }

  // Marker not present - will be extended in subsequent tasks to perform
  // structural analysis and truncation detection
  // For now, mark as incomplete when marker is absent
  return {
    isComplete: false,
    status: 'incomplete',
    issues,
    hasGenerationMarker: false,
    missingElements,
    truncationIssues,
  };
}

export default detectCompleteness;
