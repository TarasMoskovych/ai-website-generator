/**
 * Code Extraction Service
 *
 * This module provides functionality for extracting HTML, CSS, and title
 * from Claude API responses. It parses markdown code blocks and extracts
 * the relevant code sections.
 *
 * Supports both complete and truncated responses (e.g., from streaming
 * where the response may be cut off before closing backticks).
 */

/**
 * Result of successful code extraction
 */
export interface ExtractionSuccess {
  success: true;
  html: string;
  css: string;
  title: string;
  /** Indicates if the response was truncated (incomplete code blocks) */
  truncated?: boolean;
}

/**
 * Result of failed code extraction
 */
export interface ExtractionFailure {
  success: false;
  error: string;
}

/**
 * Result type for code extraction
 */
export type ExtractionResult = ExtractionSuccess | ExtractionFailure;

/**
 * Regular expressions for parsing code blocks and title
 * Includes both complete (with closing backticks) and truncated (without closing) patterns
 */
// Complete code blocks with closing backticks
const HTML_CODE_BLOCK_REGEX = /```html\s*([\s\S]*?)```/i;
const CSS_CODE_BLOCK_REGEX = /```css\s*([\s\S]*?)```/i;

// Truncated code blocks - captures content after opening marker until end or next code block
// This handles cases where streaming is cut off before closing backticks
const HTML_TRUNCATED_REGEX = /```html\s*([\s\S]*?)(?=```(?:css|$)|$)/i;
const CSS_TRUNCATED_REGEX = /```css\s*([\s\S]*?)(?=```(?:html|$)|$)/i;

const TITLE_REGEX = /Title:\s*(.+?)(?:\n|$)/i;

/**
 * Default title format when no title can be extracted
 */
const DEFAULT_TITLE_PREFIX = 'Untitled Website';

/**
 * Title constraints
 */
const TITLE_MIN_LENGTH = 3;
const TITLE_MAX_LENGTH = 100;

/**
 * Extracts HTML, CSS, and title from a Claude API response.
 *
 * The response is expected to contain markdown code blocks with `html` and `css`
 * language markers, and a title line in the format "Title: [title here]".
 *
 * This function handles both complete responses (with closing backticks) and
 * truncated responses from streaming where the output may be cut off mid-generation.
 *
 * @param response - The raw text response from Claude API
 * @returns ExtractionResult indicating success with extracted content or failure with error
 *
 * @example
 * ```typescript
 * const response = `\`\`\`html
 * <html>...</html>
 * \`\`\`
 *
 * \`\`\`css
 * body { ... }
 * \`\`\`
 *
 * Title: My Website`;
 *
 * const result = extractCodeFromResponse(response);
 * if (result.success) {
 *   console.log(result.html, result.css, result.title);
 * }
 * ```
 */
export function extractCodeFromResponse(response: string): ExtractionResult {
  if (!response || typeof response !== 'string') {
    return {
      success: false,
      error: 'Invalid response: empty or not a string',
    };
  }

  // Try to extract HTML with complete code block first
  let htmlMatch = response.match(HTML_CODE_BLOCK_REGEX);
  let truncated = false;

  // If complete extraction fails, try truncated pattern
  if (!htmlMatch?.[1]?.trim()) {
    htmlMatch = response.match(HTML_TRUNCATED_REGEX);
    if (htmlMatch?.[1]?.trim()) {
      truncated = true;
    }
  }

  const html = htmlMatch?.[1]?.trim() || '';

  // Try to extract CSS with complete code block first
  let cssMatch = response.match(CSS_CODE_BLOCK_REGEX);

  // If complete extraction fails, try truncated pattern
  if (!cssMatch?.[1]?.trim()) {
    cssMatch = response.match(CSS_TRUNCATED_REGEX);
    if (cssMatch?.[1]?.trim()) {
      truncated = true;
    }
  }

  let css = cssMatch?.[1]?.trim() || '';

  // If no separate CSS block, try to extract inline styles from HTML
  if (!css && html) {
    css = extractInlineStyles(html);
  }

  // Validate that we have at least HTML content
  if (!html) {
    return {
      success: false,
      error: 'Failed to extract HTML code from response',
    };
  }

  // Extract title
  const title = extractTitle(response);

  return {
    success: true,
    html,
    css,
    title,
    truncated,
  };
}

/**
 * Extracts inline <style> content from HTML when no separate CSS block exists.
 * This handles cases where all CSS is embedded within the HTML.
 *
 * @param html - The HTML content to extract styles from
 * @returns The extracted CSS or empty string if not found
 */
function extractInlineStyles(html: string): string {
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  return styleMatch?.[1]?.trim() || '';
}

/**
 * Extracts and validates the title from the response.
 * Falls back to a default title if extraction fails or title is invalid.
 *
 * @param response - The raw text response from Claude API
 * @returns The extracted title or a default title with timestamp
 */
function extractTitle(response: string): string {
  const titleMatch = response.match(TITLE_REGEX);
  let title = titleMatch?.[1]?.trim() || '';

  // Validate title length
  if (title.length < TITLE_MIN_LENGTH || title.length > TITLE_MAX_LENGTH) {
    // If title is too long, truncate it
    if (title.length > TITLE_MAX_LENGTH) {
      title = title.substring(0, TITLE_MAX_LENGTH - 3) + '...';
    } else {
      // If title is too short or empty, use default
      title = generateDefaultTitle();
    }
  }

  return title;
}

/**
 * Generates a default title with the current timestamp.
 *
 * @returns Default title in format "Untitled Website [ISO timestamp]"
 */
function generateDefaultTitle(): string {
  const timestamp = new Date().toISOString();
  return `${DEFAULT_TITLE_PREFIX} ${timestamp}`;
}

/**
 * Extracts only HTML from a response.
 * Useful when you only need the HTML portion.
 *
 * @param response - The raw text response from Claude API
 * @returns The extracted HTML or empty string if not found
 */
export function extractHtmlFromResponse(response: string): string {
  const match = response.match(HTML_CODE_BLOCK_REGEX);
  return match?.[1]?.trim() || '';
}

/**
 * Extracts only CSS from a response.
 * Useful when you only need the CSS portion.
 *
 * @param response - The raw text response from Claude API
 * @returns The extracted CSS or empty string if not found
 */
export function extractCssFromResponse(response: string): string {
  const match = response.match(CSS_CODE_BLOCK_REGEX);
  return match?.[1]?.trim() || '';
}

/**
 * Extracts only the title from a response.
 * Useful when you only need the title portion.
 *
 * @param response - The raw text response from Claude API
 * @returns The extracted title or default title if not found
 */
export function extractTitleFromResponse(response: string): string {
  return extractTitle(response);
}

export default extractCodeFromResponse;
