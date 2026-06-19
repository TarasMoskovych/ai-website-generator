import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Basic test to verify Vitest and fast-check are configured correctly
 */
describe('Test Framework Setup', () => {
  describe('Vitest', () => {
    it('should run basic assertions', () => {
      expect(1 + 1).toBe(2);
      expect('hello').toContain('ell');
      expect([1, 2, 3]).toHaveLength(3);
    });

    it('should support async tests', async () => {
      const result = await Promise.resolve(42);
      expect(result).toBe(42);
    });
  });

  describe('fast-check (Property-Based Testing)', () => {
    it('should run property tests with arbitrary strings', () => {
      fc.assert(
        fc.property(fc.string(), (s) => {
          // Property: string concatenation with itself doubles the length
          expect(s + s).toHaveLength(s.length * 2);
        })
      );
    });

    it('should run property tests with arbitrary integers', () => {
      fc.assert(
        fc.property(fc.integer(), fc.integer(), (a, b) => {
          // Property: addition is commutative
          expect(a + b).toBe(b + a);
        })
      );
    });

    it('should generate arrays with specific constraints', () => {
      fc.assert(
        fc.property(fc.array(fc.integer(), { minLength: 1, maxLength: 10 }), (arr) => {
          // Property: array length is within bounds
          expect(arr.length).toBeGreaterThanOrEqual(1);
          expect(arr.length).toBeLessThanOrEqual(10);
        })
      );
    });
  });

  describe('Jest DOM matchers', () => {
    it('should have access to jest-dom matchers', () => {
      // Create a simple DOM element to test jest-dom matchers
      const element = document.createElement('div');
      element.textContent = 'Hello World';
      document.body.appendChild(element);

      expect(element).toBeInTheDocument();
      expect(element).toHaveTextContent('Hello World');

      // Cleanup
      document.body.removeChild(element);
    });
  });
});
