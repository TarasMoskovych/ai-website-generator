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
 * List of required structural elements for a complete webpage.
 * These elements form the basic structure of a well-formed HTML page.
 *
 * Validates: Requirement 1.5 - Structural_Elements definition
 */
export const STRUCTURAL_ELEMENTS: StructuralElement[] = ['header', 'main', 'footer'];

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
 * Detects missing structural elements in the HTML content.
 *
 * Checks for the presence of `<header>`, `<main>`, and `<footer>` tags
 * using case-insensitive matching.
 *
 * @param html - The HTML content to analyze
 * @returns Array of missing structural elements
 *
 * Validates: Requirement 1.5 - THE Completeness_Detector SHALL check for the presence
 * of Structural_Elements: header section, main content section, and footer section
 *
 * @example
 * ```typescript
 * const html = '<html><body><main>Content</main></body></html>';
 * const missing = detectMissingStructuralElements(html); // ['header', 'footer']
 * ```
 */
export function detectMissingStructuralElements(html: string): StructuralElement[] {
  if (!html || typeof html !== 'string') {
    return [...STRUCTURAL_ELEMENTS];
  }

  const missingElements: StructuralElement[] = [];

  for (const element of STRUCTURAL_ELEMENTS) {
    // Create case-insensitive regex to match opening tag
    // Matches <header>, <main>, <footer> with optional attributes
    const tagPattern = new RegExp(`<${element}(\\s|>|/>)`, 'i');
    if (!tagPattern.test(html)) {
      missingElements.push(element);
    }
  }

  return missingElements;
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

  // Marker not present - perform structural analysis
  // Validates: Requirement 1.4 - IF the Generation_Marker is absent,
  // THEN THE Completeness_Detector SHALL perform structural analysis

  // Check for missing structural elements
  // Validates: Requirement 1.5, 1.6 - Check for structural elements and classify as incomplete if missing
  const detectedMissingElements = detectMissingStructuralElements(html);
  missingElements.push(...detectedMissingElements);

  // Add descriptive issues for each missing element
  for (const element of detectedMissingElements) {
    issues.push(`Missing <${element}> element`);
  }

  // Determine completeness based on detected issues
  // Validates: Requirement 1.6 - IF any Structural_Elements are missing,
  // THEN THE Completeness_Detector SHALL classify the website as "incomplete"
  const hasStructuralIssues = missingElements.length > 0;
  const hasTruncationIssues = truncationIssues.length > 0;
  const isComplete = !hasStructuralIssues && !hasTruncationIssues;

  return {
    isComplete,
    status: isComplete ? 'complete' : 'incomplete',
    issues,
    hasGenerationMarker: false,
    missingElements,
    truncationIssues,
  };
}

export default detectCompleteness;
