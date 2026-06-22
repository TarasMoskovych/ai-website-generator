/**
 * CompletenessDetector Tests
 *
 * Unit tests for the completeness detection service.
 * Tests cover generation marker detection, structural element detection,
 * truncation detection, and completeness classification.
 *
 * Validates: Requirements 1.2, 1.3, 1.5, 1.6, 1.7, 1.8
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  GENERATION_MARKER,
  STRUCTURAL_ELEMENTS,
  hasGenerationMarker,
  detectMissingStructuralElements,
  detectTruncationIssues,
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

    /**
     * Validates: Requirement 1.7, 1.8 - Truncation detection and classification
     */
    describe('truncation detection', () => {
      it('should detect unclosed HTML tags and classify as incomplete', () => {
        const html = `<html>
<body>
  <header>Header</header>
  <main>
    <div>
      <p>Unclosed paragraph
  </main>
  <footer>Footer</footer>
</body>
</html>`;

        const result = detectCompleteness(html, '');

        expect(result.isComplete).toBe(false);
        expect(result.status).toBe('incomplete');
        expect(result.truncationIssues.length).toBeGreaterThan(0);
        expect(result.truncationIssues.some((issue) => issue.includes('Unclosed'))).toBe(true);
      });

      it('should detect incomplete CSS braces and classify as incomplete', () => {
        const html = `<html>
<body>
  <header>Header</header>
  <main>Main</main>
  <footer>Footer</footer>
</body>
</html>`;
        const css = `.container {
  display: flex;
  .nested {
    color: red;
`;

        const result = detectCompleteness(html, css);

        expect(result.isComplete).toBe(false);
        expect(result.status).toBe('incomplete');
        expect(result.truncationIssues.some((issue) => issue.includes('unclosed brace'))).toBe(
          true
        );
      });

      it('should detect CSS truncated mid-property and classify as incomplete', () => {
        const html = `<html>
<body>
  <header>Header</header>
  <main>Main</main>
  <footer>Footer</footer>
</body>
</html>`;
        const css = `.container {
  display: flex;
  color: re`;

        const result = detectCompleteness(html, css);

        expect(result.isComplete).toBe(false);
        expect(result.status).toBe('incomplete');
        expect(
          result.truncationIssues.some(
            (issue) => issue.includes('truncated mid-property') || issue.includes('unclosed brace')
          )
        ).toBe(true);
      });

      it('should classify as complete when all structural elements present and no truncation', () => {
        const html = `<!DOCTYPE html>
<html>
<body>
  <header><nav>Navigation</nav></header>
  <main><p>Content.</p></main>
  <footer>&copy; 2024</footer>
</body>
</html>`;
        const css = `.container { display: flex; }`;

        const result = detectCompleteness(html, css);

        expect(result.isComplete).toBe(true);
        expect(result.status).toBe('complete');
        expect(result.truncationIssues).toHaveLength(0);
      });
    });
  });

  describe('detectTruncationIssues', () => {
    /**
     * Validates: Requirement 1.7 - THE Completeness_Detector SHALL check for obvious truncation
     * indicators: unclosed HTML tags, cut-off text ending mid-word, or incomplete CSS rules
     */
    describe('unclosed HTML tags', () => {
      it('should detect single unclosed div tag', () => {
        const html = '<div>Content';
        const issues = detectTruncationIssues(html, '');

        expect(issues.some((issue) => issue.includes('Unclosed <div>'))).toBe(true);
      });

      it('should detect multiple unclosed tags', () => {
        const html = '<div><p><span>Content';
        const issues = detectTruncationIssues(html, '');

        expect(issues.some((issue) => issue.includes('Unclosed <div>'))).toBe(true);
        expect(issues.some((issue) => issue.includes('Unclosed <p>'))).toBe(true);
        expect(issues.some((issue) => issue.includes('Unclosed <span>'))).toBe(true);
      });

      it('should not flag properly closed tags', () => {
        const html = '<div><p>Content</p></div>';
        const issues = detectTruncationIssues(html, '');

        expect(issues.some((issue) => issue.includes('Unclosed <div>'))).toBe(false);
        expect(issues.some((issue) => issue.includes('Unclosed <p>'))).toBe(false);
      });

      it('should detect unclosed section and article tags', () => {
        const html = '<section><article>Content</section>';
        const issues = detectTruncationIssues(html, '');

        expect(issues.some((issue) => issue.includes('Unclosed <article>'))).toBe(true);
      });

      it('should handle nested tags correctly', () => {
        const html = '<div><div><div>Content</div></div></div>';
        const issues = detectTruncationIssues(html, '');

        expect(issues.some((issue) => issue.includes('Unclosed <div>'))).toBe(false);
      });

      it('should detect unclosed tags with attributes', () => {
        const html = '<div class="container" id="main"><p style="color: red">Content';
        const issues = detectTruncationIssues(html, '');

        expect(issues.some((issue) => issue.includes('Unclosed <div>'))).toBe(true);
        expect(issues.some((issue) => issue.includes('Unclosed <p>'))).toBe(true);
      });

      it('should not flag self-closing tags', () => {
        const html = '<div><br/><hr/><img src="test.jpg"/></div>';
        const issues = detectTruncationIssues(html, '');

        // br, hr, img are void elements and should not be in our check list
        expect(issues.some((issue) => issue.includes('Unclosed'))).toBe(false);
      });

      it('should handle case-insensitive tags', () => {
        const html = '<DIV><P>Content</P>';
        const issues = detectTruncationIssues(html, '');

        expect(issues.some((issue) => issue.includes('Unclosed <div>'))).toBe(true);
      });
    });

    describe('incomplete HTML entities', () => {
      it('should detect incomplete numeric entity', () => {
        const html = '<p>Character: &#123 is incomplete</p>';
        const issues = detectTruncationIssues(html, '');

        expect(issues.some((issue) => issue.includes('Incomplete HTML entity'))).toBe(true);
      });

      it('should detect incomplete hex entity', () => {
        const html = '<p>Character: &#x1F60 is incomplete</p>';
        const issues = detectTruncationIssues(html, '');

        expect(issues.some((issue) => issue.includes('Incomplete HTML entity'))).toBe(true);
      });

      it('should detect incomplete named entity at end', () => {
        const html = '<p>This is &amp';
        const issues = detectTruncationIssues(html, '');

        expect(issues.some((issue) => issue.includes('Incomplete HTML entity'))).toBe(true);
      });

      it('should not flag complete entities', () => {
        const html = '<p>&amp; &lt; &gt; &#123; &#x1F60A;</p>';
        const issues = detectTruncationIssues(html, '');

        expect(issues.some((issue) => issue.includes('Incomplete HTML entity'))).toBe(false);
      });
    });

    describe('truncated text detection', () => {
      it('should detect text truncated mid-word with short final word', () => {
        const html = '<p>The quick brown fox jumps over the la</p>';
        const issues = detectTruncationIssues(html, '');

        expect(issues.some((issue) => issue.includes('truncated mid-sentence'))).toBe(true);
      });

      it('should not flag text ending with punctuation', () => {
        const html = '<p>This is a complete sentence.</p>';
        const issues = detectTruncationIssues(html, '');

        expect(issues.some((issue) => issue.includes('truncated mid-sentence'))).toBe(false);
      });

      it('should not flag text ending with question mark', () => {
        const html = '<p>Is this a question?</p>';
        const issues = detectTruncationIssues(html, '');

        expect(issues.some((issue) => issue.includes('truncated mid-sentence'))).toBe(false);
      });

      it('should not flag very short content', () => {
        const html = '<p>Hi</p>';
        const issues = detectTruncationIssues(html, '');

        expect(issues.some((issue) => issue.includes('truncated mid-sentence'))).toBe(false);
      });
    });

    describe('incomplete CSS rules', () => {
      it('should detect unclosed CSS braces', () => {
        const css = '.container { display: flex;';
        const issues = detectTruncationIssues('', css);

        expect(issues.some((issue) => issue.includes('unclosed brace'))).toBe(true);
      });

      it('should detect multiple unclosed CSS braces', () => {
        const css = '.a { .b { .c {';
        const issues = detectTruncationIssues('', css);

        expect(issues.some((issue) => issue.includes('3 unclosed brace'))).toBe(true);
      });

      it('should detect CSS truncated mid-property', () => {
        const css = '.container { color: re';
        const issues = detectTruncationIssues('', css);

        expect(issues.some((issue) => issue.includes('truncated mid-property'))).toBe(true);
      });

      it('should detect CSS with missing property value', () => {
        const css = '.container { color: ';
        const issues = detectTruncationIssues('', css);

        expect(issues.some((issue) => issue.includes('missing'))).toBe(true);
      });

      it('should not flag complete CSS', () => {
        const css =
          '.container { display: flex; color: red; } .other { margin: 10px; padding: 5px; }';
        const issues = detectTruncationIssues('', css);

        expect(issues.some((issue) => issue.includes('unclosed brace'))).toBe(false);
        expect(issues.some((issue) => issue.includes('truncated'))).toBe(false);
      });

      it('should handle nested CSS rules (SCSS-like)', () => {
        const css = '.parent { .child { color: red; } }';
        const issues = detectTruncationIssues('', css);

        expect(issues.some((issue) => issue.includes('unclosed brace'))).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle empty HTML input', () => {
        const issues = detectTruncationIssues('', '');
        expect(Array.isArray(issues)).toBe(true);
      });

      it('should handle null/undefined HTML input', () => {
        const issues = detectTruncationIssues(null as unknown as string, '');
        expect(Array.isArray(issues)).toBe(true);
      });

      it('should handle empty CSS input', () => {
        const issues = detectTruncationIssues('<div></div>', '');
        expect(issues.some((issue) => issue.includes('CSS'))).toBe(false);
      });

      it('should handle null/undefined CSS input', () => {
        const issues = detectTruncationIssues('<div></div>', null as unknown as string);
        expect(Array.isArray(issues)).toBe(true);
      });

      it('should handle HTML with comments', () => {
        const html = '<div><!-- comment --><p>Content</p></div>';
        const issues = detectTruncationIssues(html, '');

        expect(issues.some((issue) => issue.includes('Unclosed'))).toBe(false);
      });

      it('should handle CSS with comments', () => {
        const css = '/* comment */ .container { display: flex; }';
        const issues = detectTruncationIssues('', css);

        expect(issues.some((issue) => issue.includes('unclosed brace'))).toBe(false);
      });
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

    /**
     * Feature: website-beautify, Property 5: Missing structural elements implies incomplete
     *
     * *For any* HTML content without the generation marker that is missing header, main,
     * or footer elements, the Completeness_Detector SHALL classify it as "incomplete".
     *
     * **Validates: Requirements 1.5, 1.6**
     */
    it('missing structural elements implies incomplete classification (Property 5)', () => {
      // Arbitrary generator for structural element inclusion (at least one must be missing)
      const structuralElementConfig = fc.record({
        includeHeader: fc.boolean(),
        includeMain: fc.boolean(),
        includeFooter: fc.boolean(),
      }).filter(
        // Ensure at least one element is missing (cannot all be true)
        config => !(config.includeHeader && config.includeMain && config.includeFooter)
      );

      fc.assert(
        fc.property(
          // Configuration for which structural elements to include
          structuralElementConfig,
          // Generate random content for inside elements
          fc.string({ minLength: 0, maxLength: 100 }),
          // Generate random body content (non-structural)
          fc.string({ minLength: 0, maxLength: 200 }),
          // Generate random CSS content
          fc.string({ minLength: 0, maxLength: 100 }),
          (config, innerContent, bodyContent, css) => {
            // Build HTML without the generation marker
            // Ensure the body content doesn't accidentally contain the marker or structural tags
            const safeBodyContent = bodyContent
              .replace(/GENERATION_COMPLETE/gi, '')
              .replace(/<\/?header/gi, '')
              .replace(/<\/?main/gi, '')
              .replace(/<\/?footer/gi, '');

            const safeInnerContent = innerContent
              .replace(/GENERATION_COMPLETE/gi, '')
              .replace(/<\/?header/gi, '')
              .replace(/<\/?main/gi, '')
              .replace(/<\/?footer/gi, '');

            // Construct HTML with only the specified structural elements
            let html = '<!DOCTYPE html><html><head><title>Test</title></head><body>';

            if (config.includeHeader) {
              html += `<header>${safeInnerContent}</header>`;
            }

            html += `<div>${safeBodyContent}</div>`;

            if (config.includeMain) {
              html += `<main>${safeInnerContent}</main>`;
            }

            if (config.includeFooter) {
              html += `<footer>${safeInnerContent}</footer>`;
            }

            html += '</body></html>';

            // Verify the HTML does NOT contain the generation marker
            expect(html.includes(GENERATION_MARKER)).toBe(false);

            // Call the completeness detector
            const result = detectCompleteness(html, css);

            // Property assertion: Any HTML without the marker and missing structural elements
            // MUST be classified as incomplete
            expect(result.isComplete).toBe(false);
            expect(result.status).toBe('incomplete');
            expect(result.hasGenerationMarker).toBe(false);

            // Verify that the missing elements are correctly reported
            const expectedMissingElements: string[] = [];
            if (!config.includeHeader) expectedMissingElements.push('header');
            if (!config.includeMain) expectedMissingElements.push('main');
            if (!config.includeFooter) expectedMissingElements.push('footer');

            // The missingElements array should contain exactly the elements that are missing
            expect(result.missingElements).toHaveLength(expectedMissingElements.length);
            for (const element of expectedMissingElements) {
              expect(result.missingElements).toContain(element);
            }

            // Verify issues array contains entries for missing elements
            for (const element of expectedMissingElements) {
              expect(result.issues).toContain(`Missing <${element}> element`);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
