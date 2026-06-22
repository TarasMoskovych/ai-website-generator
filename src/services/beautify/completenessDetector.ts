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
 * Common HTML tags that require closing tags.
 * Used for detecting unclosed tags as truncation indicators.
 */
const COMMON_TAGS_REQUIRING_CLOSE = [
  'div',
  'p',
  'span',
  'section',
  'article',
  'aside',
  'nav',
  'header',
  'footer',
  'main',
  'ul',
  'ol',
  'li',
  'table',
  'tr',
  'td',
  'th',
  'thead',
  'tbody',
  'form',
  'button',
  'a',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'html',
  'head',
  'body',
  'title',
  'style',
  'script',
];

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
 * Detects truncation issues in HTML and CSS content.
 *
 * Checks for:
 * 1. Unclosed HTML tags (opening tags without matching closing tags)
 * 2. Cut-off text (incomplete HTML entities like `&#` or `&amp` without semicolon)
 * 3. Incomplete CSS rules (open braces without closing braces, rules ending mid-property)
 *
 * @param html - The HTML content to analyze
 * @param css - The CSS content to analyze
 * @returns Array of descriptive issue strings
 *
 * Validates: Requirement 1.7 - THE Completeness_Detector SHALL check for obvious truncation
 * indicators: unclosed HTML tags, cut-off text ending mid-word, or incomplete CSS rules
 *
 * @example
 * ```typescript
 * const issues = detectTruncationIssues('<div><p>Hello', '');
 * // issues: ['Unclosed <div> tag detected', 'Unclosed <p> tag detected']
 * ```
 */
export function detectTruncationIssues(html: string, css: string): string[] {
  const issues: string[] = [];

  // Check HTML truncation issues
  if (html && typeof html === 'string') {
    // 1. Detect unclosed HTML tags
    const unclosedTags = detectUnclosedHtmlTags(html);
    for (const tag of unclosedTags) {
      issues.push(`Unclosed <${tag}> tag detected`);
    }

    // 2. Detect cut-off text (incomplete HTML entities)
    const incompleteEntities = detectIncompleteHtmlEntities(html);
    for (const entity of incompleteEntities) {
      issues.push(`Incomplete HTML entity detected: ${entity}`);
    }

    // 3. Detect text ending mid-sentence (obvious truncation at end of document)
    if (detectTruncatedTextAtEnd(html)) {
      issues.push('Content appears to be truncated mid-sentence');
    }
  }

  // Check CSS truncation issues
  if (css && typeof css === 'string') {
    const cssIssues = detectIncompleteCssRules(css);
    issues.push(...cssIssues);
  }

  return issues;
}

/**
 * Detects unclosed HTML tags by counting opening and closing tags.
 *
 * @param html - The HTML content to analyze
 * @returns Array of tag names that are unclosed
 */
function detectUnclosedHtmlTags(html: string): string[] {
  const unclosedTags: string[] = [];

  for (const tag of COMMON_TAGS_REQUIRING_CLOSE) {
    // Count opening tags (case-insensitive)
    // Match <tag>, <tag attr="value">, but not self-closing <tag/>
    const openingPattern = new RegExp(`<${tag}(?:\\s[^>]*)?(?<!/)>`, 'gi');
    const closingPattern = new RegExp(`</${tag}\\s*>`, 'gi');

    const openingMatches = html.match(openingPattern) || [];
    const closingMatches = html.match(closingPattern) || [];

    // If there are more opening tags than closing tags, it's unclosed
    if (openingMatches.length > closingMatches.length) {
      unclosedTags.push(tag);
    }
  }

  return unclosedTags;
}

/**
 * Detects incomplete HTML entities (e.g., `&#` or `&amp` without semicolon).
 *
 * @param html - The HTML content to analyze
 * @returns Array of incomplete entity patterns found
 */
function detectIncompleteHtmlEntities(html: string): string[] {
  const incompleteEntities: string[] = [];

  // Pattern for incomplete numeric entities: &#123 (missing semicolon)
  const incompleteNumericPattern = /&#\d+(?!;)(?=\s|$|<)/g;
  const numericMatches = html.match(incompleteNumericPattern);
  if (numericMatches) {
    incompleteEntities.push(...numericMatches);
  }

  // Pattern for incomplete hex entities: &#x1F (missing semicolon)
  const incompleteHexPattern = /&#x[0-9a-fA-F]+(?!;)(?=\s|$|<)/g;
  const hexMatches = html.match(incompleteHexPattern);
  if (hexMatches) {
    incompleteEntities.push(...hexMatches);
  }

  // Pattern for incomplete named entities at end of content: &amp (missing semicolon)
  // Only flag if it looks like a truncated named entity at the very end
  const incompleteNamedPattern = /&[a-zA-Z]+(?!;)$/;
  const namedMatch = html.match(incompleteNamedPattern);
  if (namedMatch) {
    // Verify it's likely an entity by checking against common entity names
    const commonEntities = ['amp', 'lt', 'gt', 'quot', 'nbsp', 'copy', 'reg', 'trade'];
    const potentialEntity = namedMatch[0].slice(1).toLowerCase();
    // Only flag if it's a partial match of a known entity
    const isLikelyEntity = commonEntities.some(
      (entity) => entity.startsWith(potentialEntity) || potentialEntity.startsWith(entity)
    );
    if (isLikelyEntity) {
      incompleteEntities.push(namedMatch[0]);
    }
  }

  return incompleteEntities;
}

/**
 * Detects if the HTML content appears to be truncated mid-sentence at the end.
 *
 * @param html - The HTML content to analyze
 * @returns true if content appears truncated
 */
function detectTruncatedTextAtEnd(html: string): boolean {
  // Strip HTML tags to get text content at the end
  const strippedText = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (strippedText.length < 10) {
    return false;
  }

  // Get the last 50 characters to analyze
  const lastPart = strippedText.slice(-50).trim();

  // Check if it ends mid-word (ends with a letter and no punctuation)
  // A truncated document often ends with an incomplete word
  const endsWithLetterPattern = /[a-zA-Z]$/;
  const endsWithPunctuation = /[.!?;:,\-\u2013\u2014'")\]}>]$/;

  // If it ends with a letter and not punctuation, could be truncated
  // But we need to be careful - this is a heuristic
  if (endsWithLetterPattern.test(lastPart) && !endsWithPunctuation.test(lastPart)) {
    // Additional check: if the last word is very short (1-2 chars), likely truncated
    const words = lastPart.split(/\s+/);
    const lastWord = words[words.length - 1];
    // Very short words at end might indicate truncation (e.g., "The quick br")
    if (lastWord && lastWord.length <= 2 && /^[a-zA-Z]+$/.test(lastWord)) {
      return true;
    }
  }

  return false;
}

/**
 * Detects incomplete CSS rules (unclosed braces, mid-property truncation).
 *
 * @param css - The CSS content to analyze
 * @returns Array of descriptive CSS issue strings
 */
function detectIncompleteCssRules(css: string): string[] {
  const issues: string[] = [];

  // Count opening and closing braces
  const openBraces = (css.match(/{/g) || []).length;
  const closeBraces = (css.match(/}/g) || []).length;

  if (openBraces > closeBraces) {
    issues.push(`CSS has ${openBraces - closeBraces} unclosed brace(s)`);
  }

  // Check for rule ending mid-property (e.g., "color: re" or "margin: 10")
  // This happens when CSS is truncated mid-declaration
  const trimmedCss = css.trim();
  if (trimmedCss.length > 0) {
    // Check if CSS ends without a closing brace or semicolon after a property
    const endsWithIncompleteProperty = /:\s*[^;{}]+$/;
    if (endsWithIncompleteProperty.test(trimmedCss)) {
      // Verify it's not a complete property (should end with ; or })
      const lastBlock = trimmedCss.slice(trimmedCss.lastIndexOf('{'));
      if (lastBlock && !lastBlock.endsWith('}')) {
        issues.push('CSS appears truncated mid-property');
      }
    }

    // Check if CSS ends with just a property name and colon
    const endsWithPropertyName = /[a-zA-Z-]+:\s*$/;
    if (endsWithPropertyName.test(trimmedCss)) {
      issues.push('CSS property value appears to be missing');
    }
  }

  return issues;
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
 * @param css - The CSS content to analyze
 * @returns CompletenessResult with classification and detected issues
 *
 * Validates: Requirements 1.2, 1.3, 1.7, 1.8 - Generation marker detection, classification,
 * and truncation detection
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
  let truncationIssues: string[] = [];

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

  // Check for truncation indicators
  // Validates: Requirement 1.7 - THE Completeness_Detector SHALL check for obvious truncation
  // indicators: unclosed HTML tags, cut-off text ending mid-word, or incomplete CSS rules
  truncationIssues = detectTruncationIssues(html, css);
  issues.push(...truncationIssues);

  // Determine completeness based on detected issues
  // Validates: Requirement 1.6 - IF any Structural_Elements are missing,
  // THEN THE Completeness_Detector SHALL classify the website as "incomplete"
  // Validates: Requirement 1.8 - IF truncation indicators are detected,
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
