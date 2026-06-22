/**
 * CompletenessDetector Tests
 *
 * Unit tests for the completeness detection service.
 * Tests cover generation marker detection, structural element detection,
 * and completeness classification.
 *
 * Validates: Requirements 1.2, 1.3, 1.5, 1.6
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  GENERATION_MARKER,
  STRUCTURAL_ELEMENTS,
  hasGenerationMarker,
  detectMissingStructuralElements,
  detectCompleteness,
} from './completenessDetector';

describe('CompletenessDetector', () => {
  describe('GENERATION_MARKER constant', () => {
    it('should be the correct marker string', () => {
      expect(GENERATION_MARKER).toBe('<!-- GENERATION_COMPLETE -->');
    });
  });

  describe('STRUCTURAL_ELEMENTS constant', () => {
    /**
     * Validates: Requirement 1.5 - Structural_Elements definition
     */
    it('should contain header, main, and footer elements', () => {
      expect(STRUCTURAL_ELEMENTS).toContain('header');
      expect(STRUCTURAL_ELEMENTS).toContain('main');
      expect(STRUCTURAL_ELEMENTS).toContain('footer');
    });

    it('should contain exactly three elements', () => {
      expect(STRUCTURAL_ELEMENTS).toHaveLength(3);
    });
  });

  describe('detectMissingStructuralElements', () => {
    /**
     * Validates: Requirement 1.5 - THE Completeness_Detector SHALL check for the presence
     * of Structural_Elements: header section, main content section, and footer section
     */
    it('should return all elements as missing for empty HTML', () => {
      const missing = detectMissingStructuralElements('');
      expect(missing).toContain('header');
      expect(missing).toContain('main');
      expect(missing).toContain('footer');
      expect(missing).toHaveLength(3);
    });

    it('should return all elements as missing for null/undefined input', () => {
      expect(detectMissingStructuralElements(null as unknown as string)).toHaveLength(3);
      expect(detectMissingStructuralElements(undefined as unknown as string)).toHaveLength(3);
    });

    it('should return empty array when all structural elements are present', () => {
      const html = `
<html>
<body>
  <header>Header content</header>
  <main>Main content</main>
  <footer>Footer content</footer>
</body>
</html>`;
      const missing = detectMissingStructuralElements(html);
      expect(missing).toHaveLength(0);
    });

    it('should detect missing header element', () => {
      const html = `
<html>
<body>
  <main>Main content</main>
  <footer>Footer content</footer>
</body>
</html>`;
      const missing = detectMissingStructuralElements(html);
      expect(missing).toContain('header');
      expect(missing).not.toContain('main');
      expect(missing).not.toContain('footer');
    });

    it('should detect missing main element', () => {
      const html = `
<html>
<body>
  <header>Header content</header>
  <footer>Footer content</footer>
</body>
</html>`;
      const missing = detectMissingStructuralElements(html);
      expect(missing).toContain('main');
      expect(missing).not.toContain('header');
      expect(missing).not.toContain('footer');
    });

    it('should detect missing footer element', () => {
      const html = `
<html>
<body>
  <header>Header content</header>
  <main>Main content</main>
</body>
</html>`;
      const missing = detectMissingStructuralElements(html);
      expect(missing).toContain('footer');
      expect(missing).not.toContain('header');
      expect(missing).not.toContain('main');
    });

    it('should detect multiple missing elements', () => {
      const html = '<html><body><div>Only div</div></body></html>';
      const missing = detectMissingStructuralElements(html);
      expect(missing).toContain('header');
      expect(missing).toContain('main');
      expect(missing).toContain('footer');
      expect(missing).toHaveLength(3);
    });

    it('should handle case-insensitive tag matching', () => {
      const html = `
<html>
<body>
  <HEADER>Header content</HEADER>
  <MAIN>Main content</MAIN>
  <FOOTER>Footer content</FOOTER>
</body>
</html>`;
      const missing = detectMissingStructuralElements(html);
      expect(missing).toHaveLength(0);
    });

    it('should handle mixed case tag matching', () => {
      const html = `
<html>
<body>
  <Header>Header content</Header>
  <Main>Main content</Main>
  <Footer>Footer content</Footer>
</body>
</html>`;
      const missing = detectMissingStructuralElements(html);
      expect(missing).toHaveLength(0);
    });

    it('should detect self-closing structural elements', () => {
      const html = '<header/><main /><footer />';
      const missing = detectMissingStructuralElements(html);
      expect(missing).toHaveLength(0);
    });

    it('should detect structural elements with attributes', () => {
      const html = `
<header class="site-header" id="header">Header</header>
<main role="main" aria-label="content">Main</main>
<footer data-section="footer">Footer</footer>`;
      const missing = detectMissingStructuralElements(html);
      expect(missing).toHaveLength(0);
    });
  });

  describe('hasGenerationMarker', () => {
    /**
     * Validates: Requirement 1.2 - Check for presence of Generation_Marker
     */
    it('should return true when marker is present in HTML', () => {
      const html = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <h1>Hello World</h1>
  <!-- GENERATION_COMPLETE -->
</body>
</html>`;
      expect(hasGenerationMarker(html)).toBe(true);
    });

    it('should return true when marker is at the start of HTML', () => {
      const html = '<!-- GENERATION_COMPLETE --><html><body></body></html>';
      expect(hasGenerationMarker(html)).toBe(true);
    });

    it('should return true when marker is at the end of HTML', () => {
      const html = '<html><body></body></html><!-- GENERATION_COMPLETE -->';
      expect(hasGenerationMarker(html)).toBe(true);
    });

    it('should return true when marker appears multiple times', () => {
      const html = '<!-- GENERATION_COMPLETE --><html><!-- GENERATION_COMPLETE --></html>';
      expect(hasGenerationMarker(html)).toBe(true);
    });

    it('should return false when marker is not present', () => {
      const html = '<html><body><h1>No marker here</h1></body></html>';
      expect(hasGenerationMarker(html)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(hasGenerationMarker('')).toBe(false);
    });

    it('should return false for null/undefined input', () => {
      expect(hasGenerationMarker(null as unknown as string)).toBe(false);
      expect(hasGenerationMarker(undefined as unknown as string)).toBe(false);
    });

    it('should return false for partial marker', () => {
      const html = '<html><!-- GENERATION_COMPLET --></html>';
      expect(hasGenerationMarker(html)).toBe(false);
    });

    it('should return false for marker with different casing', () => {
      const html = '<html><!-- generation_complete --></html>';
      expect(hasGenerationMarker(html)).toBe(false);
    });

    it('should return false for marker with extra whitespace', () => {
      const html = '<html><!--  GENERATION_COMPLETE  --></html>';
      expect(hasGenerationMarker(html)).toBe(false);
    });
  });

  describe('detectCompleteness', () => {
    /**
     * Validates: Requirement 1.3 - IF the Generation_Marker is present,
     * THEN THE Completeness_Detector SHALL classify the website as "complete"
     */
    it('should classify as complete when generation marker is present', () => {
      const html = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <header><nav>Navigation</nav></header>
  <main><p>Content</p></main>
  <footer>Footer</footer>
  <!-- GENERATION_COMPLETE -->
</body>
</html>`;
      const css = 'body { margin: 0; }';

      const result = detectCompleteness(html, css);

      expect(result.isComplete).toBe(true);
      expect(result.status).toBe('complete');
      expect(result.hasGenerationMarker).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.missingElements).toHaveLength(0);
      expect(result.truncationIssues).toHaveLength(0);
    });

    it('should classify as complete regardless of missing structural elements when marker is present', () => {
      // This validates that the marker takes precedence over structural analysis
      const html = '<!-- GENERATION_COMPLETE --><div>Minimal content</div>';
      const css = '';

      const result = detectCompleteness(html, css);

      expect(result.isComplete).toBe(true);
      expect(result.status).toBe('complete');
      expect(result.hasGenerationMarker).toBe(true);
    });

    it('should classify as incomplete when generation marker is absent and structural elements are missing', () => {
      // HTML with all structural elements but no marker should be classified as complete
      // This test verifies incomplete classification for missing elements
      const html = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <div>Only a div, no structural elements</div>
</body>
</html>`;
      const css = 'body { margin: 0; }';

      const result = detectCompleteness(html, css);

      expect(result.isComplete).toBe(false);
      expect(result.status).toBe('incomplete');
      expect(result.hasGenerationMarker).toBe(false);
      expect(result.missingElements).toContain('header');
      expect(result.missingElements).toContain('main');
      expect(result.missingElements).toContain('footer');
    });

    /**
     * Validates: Requirement 1.5, 1.6 - Structural element detection
     */
    it('should classify as complete when all structural elements are present (no marker)', () => {
      const html = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <header><nav>Navigation</nav></header>
  <main><p>Content</p></main>
  <footer>Footer</footer>
</body>
</html>`;
      const css = 'body { margin: 0; }';

      const result = detectCompleteness(html, css);

      expect(result.isComplete).toBe(true);
      expect(result.status).toBe('complete');
      expect(result.hasGenerationMarker).toBe(false);
      expect(result.missingElements).toHaveLength(0);
    });

    it('should report missing header element when absent', () => {
      const html = `
<html>
<body>
  <main>Main content</main>
  <footer>Footer</footer>
</body>
</html>`;

      const result = detectCompleteness(html, '');

      expect(result.isComplete).toBe(false);
      expect(result.status).toBe('incomplete');
      expect(result.missingElements).toContain('header');
      expect(result.issues).toContain('Missing <header> element');
    });

    it('should report missing main element when absent', () => {
      const html = `
<html>
<body>
  <header>Header content</header>
  <footer>Footer</footer>
</body>
</html>`;

      const result = detectCompleteness(html, '');

      expect(result.isComplete).toBe(false);
      expect(result.status).toBe('incomplete');
      expect(result.missingElements).toContain('main');
      expect(result.issues).toContain('Missing <main> element');
    });

    it('should report missing footer element when absent', () => {
      const html = `
<html>
<body>
  <header>Header content</header>
  <main>Main content</main>
</body>
</html>`;

      const result = detectCompleteness(html, '');

      expect(result.isComplete).toBe(false);
      expect(result.status).toBe('incomplete');
      expect(result.missingElements).toContain('footer');
      expect(result.issues).toContain('Missing <footer> element');
    });

    it('should report all missing structural elements in issues', () => {
      const html = '<html><body><div>No structural elements</div></body></html>';

      const result = detectCompleteness(html, '');

      expect(result.missingElements).toHaveLength(3);
      expect(result.issues).toContain('Missing <header> element');
      expect(result.issues).toContain('Missing <main> element');
      expect(result.issues).toContain('Missing <footer> element');
    });

    it('should return proper result structure', () => {
      const html = '<!-- GENERATION_COMPLETE --><div>Test</div>';
      const css = 'div { color: red; }';

      const result = detectCompleteness(html, css);

      // Verify result has all expected properties
      expect(result).toHaveProperty('isComplete');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('hasGenerationMarker');
      expect(result).toHaveProperty('missingElements');
      expect(result).toHaveProperty('truncationIssues');

      // Verify types
      expect(typeof result.isComplete).toBe('boolean');
      expect(['complete', 'incomplete']).toContain(result.status);
      expect(Array.isArray(result.issues)).toBe(true);
      expect(typeof result.hasGenerationMarker).toBe('boolean');
      expect(Array.isArray(result.missingElements)).toBe(true);
      expect(Array.isArray(result.truncationIssues)).toBe(true);
    });

    it('should handle empty HTML input', () => {
      const result = detectCompleteness('', '');

      expect(result.isComplete).toBe(false);
      expect(result.status).toBe('incomplete');
      expect(result.hasGenerationMarker).toBe(false);
      expect(result.missingElements).toHaveLength(3);
    });

    it('should handle HTML with only whitespace', () => {
      const result = detectCompleteness('   \n\t  ', '');

      expect(result.isComplete).toBe(false);
      expect(result.status).toBe('incomplete');
      expect(result.hasGenerationMarker).toBe(false);
      expect(result.missingElements).toHaveLength(3);
    });
  });

  /**
   * Property-Based Tests
   *
   * These tests verify universal properties across generated inputs using fast-check.
   */
  describe('Property-Based Tests', () => {
    /**
     * Feature: website-beautify, Property 4: Generation marker implies complete classification
     *
     * *For any* HTML content containing the `<!-- GENERATION_COMPLETE -->` marker,
     * the Completeness_Detector SHALL classify it as "complete".
     *
     * **Validates: Requirements 1.2, 1.3**
     */
    it('generation marker implies complete classification (Property 4)', () => {
      fc.assert(
        fc.property(
          // Generate random HTML prefix (before the marker)
          fc.string({ minLength: 0, maxLength: 500 }),
          // Generate random HTML suffix (after the marker)
          fc.string({ minLength: 0, maxLength: 500 }),
          // Generate random CSS content
          fc.string({ minLength: 0, maxLength: 200 }),
          (htmlPrefix, htmlSuffix, css) => {
            // Construct HTML that contains the generation marker somewhere within it
            const htmlWithMarker = `${htmlPrefix}${GENERATION_MARKER}${htmlSuffix}`;

            // Call the completeness detector
            const result = detectCompleteness(htmlWithMarker, css);

            // Property assertion: Any HTML with the generation marker MUST be classified as complete
            expect(result.isComplete).toBe(true);
            expect(result.status).toBe('complete');
            expect(result.hasGenerationMarker).toBe(true);
            expect(result.issues).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
