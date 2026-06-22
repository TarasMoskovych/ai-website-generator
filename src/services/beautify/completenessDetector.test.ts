/**
 * CompletenessDetector Tests
 *
 * Unit tests for the completeness detection service.
 * Tests cover generation marker detection and completeness classification.
 *
 * Validates: Requirements 1.2, 1.3
 */

import { describe, it, expect } from 'vitest';
import {
  GENERATION_MARKER,
  hasGenerationMarker,
  detectCompleteness,
} from './completenessDetector';

describe('CompletenessDetector', () => {
  describe('GENERATION_MARKER constant', () => {
    it('should be the correct marker string', () => {
      expect(GENERATION_MARKER).toBe('<!-- GENERATION_COMPLETE -->');
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

    it('should classify as incomplete when generation marker is absent', () => {
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

      expect(result.isComplete).toBe(false);
      expect(result.status).toBe('incomplete');
      expect(result.hasGenerationMarker).toBe(false);
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
    });

    it('should handle HTML with only whitespace', () => {
      const result = detectCompleteness('   \n\t  ', '');

      expect(result.isComplete).toBe(false);
      expect(result.status).toBe('incomplete');
      expect(result.hasGenerationMarker).toBe(false);
    });
  });
});
