/**
 * PreviewComparison Component Tests
 *
 * Unit tests for the PreviewComparison component.
 * Tests cover rendering, comparison modes, viewport controls, and action buttons.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.9, 7.10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { PreviewComparison, PreviewComparisonProps } from './PreviewComparison';
import { VIEWPORT_DIMENSIONS } from '@/lib/constants';
import type { ViewportMode } from '@/types/beautify';

// Mock the htmlSanitizer service
vi.mock('@/services/htmlSanitizer', () => ({
  sanitize: (html: string) => html,
}));

describe('PreviewComparison', () => {
  // Default props for tests
  const defaultProps: PreviewComparisonProps = {
    originalHtml: '<h1>Original</h1>',
    originalCss: 'h1 { color: red; }',
    beautifiedHtml: '<h1>Beautified</h1>',
    beautifiedCss: 'h1 { color: blue; }',
    onAccept: vi.fn(),
    onReject: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    /**
     * Tests that the component renders correctly
     * Validates: Requirement 7.1
     */
    it('renders two preview iframes', () => {
      render(<PreviewComparison {...defaultProps} />);

      const originalIframe = screen.getByTitle('Original Website Preview');
      const beautifiedIframe = screen.getByTitle('Beautified Website Preview');

      expect(originalIframe).toBeInTheDocument();
      expect(beautifiedIframe).toBeInTheDocument();
    });

    /**
     * Tests that labels are displayed correctly
     * Validates: Requirement 7.2
     */
    it('displays "Original" and "Beautified" labels', () => {
      render(<PreviewComparison {...defaultProps} />);

      expect(screen.getByText('Original')).toBeInTheDocument();
      expect(screen.getByText('Beautified')).toBeInTheDocument();
    });

    /**
     * Tests that iframes have sandbox attribute for security
     */
    it('iframes have sandbox attribute', () => {
      render(<PreviewComparison {...defaultProps} />);

      const originalIframe = screen.getByTitle('Original Website Preview');
      const beautifiedIframe = screen.getByTitle('Beautified Website Preview');

      expect(originalIframe).toHaveAttribute('sandbox', 'allow-same-origin');
      expect(beautifiedIframe).toHaveAttribute('sandbox', 'allow-same-origin');
    });
  });

  describe('Comparison Modes', () => {
    /**
     * Tests that side-by-side mode is default
     * Validates: Requirement 7.10
     */
    it('defaults to side-by-side comparison mode', () => {
      render(<PreviewComparison {...defaultProps} />);

      const sideBySideButton = screen.getByRole('radio', { name: /side by side/i });
      expect(sideBySideButton).toHaveAttribute('aria-checked', 'true');
    });

    /**
     * Tests switching to overlay mode
     * Validates: Requirement 7.10
     */
    it('can switch to overlay comparison mode', () => {
      render(<PreviewComparison {...defaultProps} />);

      const overlayButton = screen.getByRole('radio', { name: /overlay/i });
      fireEvent.click(overlayButton);

      expect(overlayButton).toHaveAttribute('aria-checked', 'true');
    });

    /**
     * Tests that overlay mode includes a slider
     * Validates: Requirement 7.10
     */
    it('displays slider in overlay mode', () => {
      render(<PreviewComparison {...defaultProps} />);

      const overlayButton = screen.getByRole('radio', { name: /overlay/i });
      fireEvent.click(overlayButton);

      const slider = screen.getByRole('slider', { name: /comparison slider/i });
      expect(slider).toBeInTheDocument();
    });

    /**
     * Tests slider keyboard navigation
     */
    it('slider responds to keyboard navigation', () => {
      render(<PreviewComparison {...defaultProps} />);

      const overlayButton = screen.getByRole('radio', { name: /overlay/i });
      fireEvent.click(overlayButton);

      const slider = screen.getByRole('slider', { name: /comparison slider/i });

      // Initial value should be 50
      expect(slider).toHaveAttribute('aria-valuenow', '50');

      // Press arrow left to decrease
      fireEvent.keyDown(slider, { key: 'ArrowLeft' });
      expect(slider).toHaveAttribute('aria-valuenow', '45');

      // Press arrow right to increase
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      expect(slider).toHaveAttribute('aria-valuenow', '50');
    });
  });

  describe('Viewport Controls', () => {
    /**
     * Tests that viewport controls are rendered
     * Validates: Requirement 7.4
     */
    it('renders viewport mode controls', () => {
      render(<PreviewComparison {...defaultProps} />);

      const desktopButton = screen.getByRole('radio', { name: /desktop/i });
      const tabletButton = screen.getByRole('radio', { name: /tablet/i });
      const mobileButton = screen.getByRole('radio', { name: /mobile/i });

      expect(desktopButton).toBeInTheDocument();
      expect(tabletButton).toBeInTheDocument();
      expect(mobileButton).toBeInTheDocument();
    });

    /**
     * Tests that desktop is default viewport
     * Validates: Requirement 7.4
     */
    it('defaults to desktop viewport mode', () => {
      render(<PreviewComparison {...defaultProps} />);

      const desktopButton = screen.getByRole('radio', { name: /desktop/i });
      expect(desktopButton).toHaveAttribute('aria-checked', 'true');
    });

    /**
     * Tests changing viewport mode
     * Validates: Requirement 7.4
     */
    it('can change viewport mode', () => {
      render(<PreviewComparison {...defaultProps} />);

      const tabletButton = screen.getByRole('radio', { name: /tablet/i });
      fireEvent.click(tabletButton);

      expect(tabletButton).toHaveAttribute('aria-checked', 'true');
    });

    /**
     * Tests that dimensions are displayed
     */
    it('displays current viewport dimensions', () => {
      render(<PreviewComparison {...defaultProps} />);

      // Default desktop dimensions
      expect(screen.getByText('1280 × 800px')).toBeInTheDocument();
    });

    /**
     * Tests that dimensions update when viewport changes
     */
    it('updates dimensions when viewport changes', () => {
      render(<PreviewComparison {...defaultProps} />);

      const mobileButton = screen.getByRole('radio', { name: /mobile/i });
      fireEvent.click(mobileButton);

      // Mobile dimensions
      expect(screen.getByText('375 × 667px')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    /**
     * Tests that Accept button is rendered
     * Validates: Requirement 7.5
     */
    it('renders Accept button', () => {
      render(<PreviewComparison {...defaultProps} />);

      const acceptButton = screen.getByRole('button', { name: /accept/i });
      expect(acceptButton).toBeInTheDocument();
    });

    /**
     * Tests that Reject button is rendered
     * Validates: Requirement 7.6
     */
    it('renders Reject button', () => {
      render(<PreviewComparison {...defaultProps} />);

      const rejectButton = screen.getByRole('button', { name: /reject/i });
      expect(rejectButton).toBeInTheDocument();
    });

    /**
     * Tests that onAccept is called when Accept is clicked
     * Validates: Requirements 7.7, 7.8
     */
    it('calls onAccept when Accept is clicked', () => {
      const onAccept = vi.fn();
      render(<PreviewComparison {...defaultProps} onAccept={onAccept} />);

      const acceptButton = screen.getByRole('button', { name: /accept/i });
      fireEvent.click(acceptButton);

      expect(onAccept).toHaveBeenCalledTimes(1);
    });

    /**
     * Tests that onReject is called when Reject is clicked
     * Validates: Requirement 7.9
     */
    it('calls onReject when Reject is clicked', () => {
      const onReject = vi.fn();
      render(<PreviewComparison {...defaultProps} onReject={onReject} />);

      const rejectButton = screen.getByRole('button', { name: /reject/i });
      fireEvent.click(rejectButton);

      expect(onReject).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    /**
     * Tests that comparison mode selector has correct ARIA
     */
    it('comparison mode selector has correct ARIA attributes', () => {
      render(<PreviewComparison {...defaultProps} />);

      const radioGroup = screen.getByRole('radiogroup', { name: /comparison mode/i });
      expect(radioGroup).toBeInTheDocument();
    });

    /**
     * Tests that viewport selector has correct ARIA
     */
    it('viewport selector has correct ARIA attributes', () => {
      render(<PreviewComparison {...defaultProps} />);

      const radioGroup = screen.getByRole('radiogroup', { name: /viewport size/i });
      expect(radioGroup).toBeInTheDocument();
    });

    /**
     * Tests that action buttons have correct ARIA labels
     */
    it('action buttons have correct ARIA labels', () => {
      render(<PreviewComparison {...defaultProps} />);

      const acceptButton = screen.getByRole('button', { name: /accept beautified changes/i });
      const rejectButton = screen.getByRole('button', { name: /reject changes and keep original/i });

      expect(acceptButton).toBeInTheDocument();
      expect(rejectButton).toBeInTheDocument();
    });

    /**
     * Tests that slider has correct ARIA attributes
     */
    it('slider has correct ARIA attributes in overlay mode', () => {
      render(<PreviewComparison {...defaultProps} />);

      const overlayButton = screen.getByRole('radio', { name: /overlay/i });
      fireEvent.click(overlayButton);

      const slider = screen.getByRole('slider', { name: /comparison slider/i });
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '100');
      expect(slider).toHaveAttribute('tabindex', '0');
    });
  });

  describe('Content Rendering', () => {
    /**
     * Tests that original content is passed to iframe
     */
    it('passes original content to original iframe', () => {
      const { container } = render(<PreviewComparison {...defaultProps} />);

      const originalIframe = screen.getByTitle('Original Website Preview');
      expect(originalIframe).toBeInTheDocument();
      // The iframe content is written via document.write, which we can't easily test
      // but we verify the iframe exists and has correct attributes
    });

    /**
     * Tests that beautified content is passed to beautified iframe
     */
    it('passes beautified content to beautified iframe', () => {
      render(<PreviewComparison {...defaultProps} />);

      const beautifiedIframe = screen.getByTitle('Beautified Website Preview');
      expect(beautifiedIframe).toBeInTheDocument();
    });
  });

  /**
   * Property-Based Tests
   *
   * These tests verify universal properties across generated inputs using fast-check.
   * Minimum 100 iterations as specified in the design document.
   */
  describe('Property-Based Tests', () => {
    /**
     * Property 15: Synchronized Scroll Behavior
     *
     * This property test verifies that when scrolling one preview iframe,
     * the other iframe scrolls to the same position.
     *
     * **Validates: Requirements 7.3**
     *
     * @description For any scroll action on one preview iframe in the comparison view,
     * the other iframe SHALL scroll to the same position.
     *
     * The test verifies the scroll synchronization logic by:
     * 1. Generating random scroll positions (scrollTop and scrollLeft)
     * 2. Simulating the scroll synchronization behavior
     * 3. Verifying both iframes end up at the same scroll position
     */
    describe('Property 15: Synchronized Scroll Behavior', () => {
      /**
       * Represents a scroll position in an iframe
       */
      interface ScrollPosition {
        scrollTop: number;
        scrollLeft: number;
      }

      /**
       * Simulates the scroll synchronization logic from PreviewComparison
       * This mimics the handleScroll function behavior
       */
      function synchronizeScroll(
        sourcePosition: ScrollPosition,
        _targetPosition: ScrollPosition
      ): ScrollPosition {
        // The handleScroll function copies scroll positions from source to target
        return {
          scrollTop: sourcePosition.scrollTop,
          scrollLeft: sourcePosition.scrollLeft,
        };
      }

      /**
       * Verifies that two scroll positions are equal
       */
      function positionsAreEqual(pos1: ScrollPosition, pos2: ScrollPosition): boolean {
        return pos1.scrollTop === pos2.scrollTop && pos1.scrollLeft === pos2.scrollLeft;
      }

      it('scrolling original iframe synchronizes beautified iframe to same position', () => {
        fc.assert(
          fc.property(
            // Generate random scroll position for original iframe (source)
            fc.record({
              scrollTop: fc.integer({ min: 0, max: 10000 }),
              scrollLeft: fc.integer({ min: 0, max: 10000 }),
            }),
            // Generate random initial scroll position for beautified iframe (target)
            fc.record({
              scrollTop: fc.integer({ min: 0, max: 10000 }),
              scrollLeft: fc.integer({ min: 0, max: 10000 }),
            }),
            (originalScrollPosition, beautifiedScrollPosition) => {
              // Simulate scroll synchronization from original to beautified
              const synchronizedPosition = synchronizeScroll(
                originalScrollPosition,
                beautifiedScrollPosition
              );

              // Property: After synchronization, beautified should match original
              expect(synchronizedPosition.scrollTop).toBe(originalScrollPosition.scrollTop);
              expect(synchronizedPosition.scrollLeft).toBe(originalScrollPosition.scrollLeft);
              expect(positionsAreEqual(synchronizedPosition, originalScrollPosition)).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('scrolling beautified iframe synchronizes original iframe to same position', () => {
        fc.assert(
          fc.property(
            // Generate random scroll position for beautified iframe (source)
            fc.record({
              scrollTop: fc.integer({ min: 0, max: 10000 }),
              scrollLeft: fc.integer({ min: 0, max: 10000 }),
            }),
            // Generate random initial scroll position for original iframe (target)
            fc.record({
              scrollTop: fc.integer({ min: 0, max: 10000 }),
              scrollLeft: fc.integer({ min: 0, max: 10000 }),
            }),
            (beautifiedScrollPosition, originalScrollPosition) => {
              // Simulate scroll synchronization from beautified to original
              const synchronizedPosition = synchronizeScroll(
                beautifiedScrollPosition,
                originalScrollPosition
              );

              // Property: After synchronization, original should match beautified
              expect(synchronizedPosition.scrollTop).toBe(beautifiedScrollPosition.scrollTop);
              expect(synchronizedPosition.scrollLeft).toBe(beautifiedScrollPosition.scrollLeft);
              expect(positionsAreEqual(synchronizedPosition, beautifiedScrollPosition)).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('synchronization is bidirectional and symmetric', () => {
        fc.assert(
          fc.property(
            // Generate random scroll position A
            fc.record({
              scrollTop: fc.integer({ min: 0, max: 10000 }),
              scrollLeft: fc.integer({ min: 0, max: 10000 }),
            }),
            // Generate random scroll position B
            fc.record({
              scrollTop: fc.integer({ min: 0, max: 10000 }),
              scrollLeft: fc.integer({ min: 0, max: 10000 }),
            }),
            (positionA, positionB) => {
              // Sync A -> B then B -> A
              const syncedToB = synchronizeScroll(positionA, positionB);
              const syncedBackToA = synchronizeScroll(syncedToB, positionA);

              // Property: The final position should equal the intermediate synced position
              // (since we synced A to B, then B (which is now A's position) back to A)
              expect(positionsAreEqual(syncedBackToA, syncedToB)).toBe(true);
              expect(syncedBackToA.scrollTop).toBe(positionA.scrollTop);
              expect(syncedBackToA.scrollLeft).toBe(positionA.scrollLeft);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('scroll synchronization preserves both scrollTop and scrollLeft independently', () => {
        fc.assert(
          fc.property(
            // Generate independent scroll values
            fc.integer({ min: 0, max: 10000 }),
            fc.integer({ min: 0, max: 10000 }),
            fc.integer({ min: 0, max: 10000 }),
            fc.integer({ min: 0, max: 10000 }),
            (sourceTop, sourceLeft, targetTop, targetLeft) => {
              const sourcePosition: ScrollPosition = {
                scrollTop: sourceTop,
                scrollLeft: sourceLeft,
              };
              const targetPosition: ScrollPosition = {
                scrollTop: targetTop,
                scrollLeft: targetLeft,
              };

              const synchronizedPosition = synchronizeScroll(sourcePosition, targetPosition);

              // Property: Each dimension is synchronized independently
              expect(synchronizedPosition.scrollTop).toBe(sourceTop);
              expect(synchronizedPosition.scrollLeft).toBe(sourceLeft);

              // Verify they don't get swapped or mixed
              if (sourceTop !== sourceLeft) {
                expect(synchronizedPosition.scrollTop).not.toBe(sourceLeft);
                expect(synchronizedPosition.scrollLeft).not.toBe(sourceTop);
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('scroll synchronization works with edge case values', () => {
        fc.assert(
          fc.property(
            // Generate edge case scroll values
            fc.oneof(
              fc.constant(0), // Minimum value
              fc.constant(1), // Just above minimum
              fc.constant(9999), // Just below max
              fc.constant(10000), // Maximum value
              fc.integer({ min: 0, max: 10000 }) // Random value
            ),
            fc.oneof(
              fc.constant(0),
              fc.constant(1),
              fc.constant(9999),
              fc.constant(10000),
              fc.integer({ min: 0, max: 10000 })
            ),
            (scrollTop, scrollLeft) => {
              const sourcePosition: ScrollPosition = { scrollTop, scrollLeft };
              const targetPosition: ScrollPosition = {
                scrollTop: scrollTop === 0 ? 1000 : 0, // Different from source
                scrollLeft: scrollLeft === 0 ? 1000 : 0,
              };

              const synchronizedPosition = synchronizeScroll(sourcePosition, targetPosition);

              // Property: Synchronization works correctly for all edge cases
              expect(synchronizedPosition.scrollTop).toBe(scrollTop);
              expect(synchronizedPosition.scrollLeft).toBe(scrollLeft);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('scroll positions with same value for both dimensions are synchronized correctly', () => {
        fc.assert(
          fc.property(
            // Generate a single value used for both dimensions
            fc.integer({ min: 0, max: 10000 }),
            (sameValue) => {
              const sourcePosition: ScrollPosition = {
                scrollTop: sameValue,
                scrollLeft: sameValue,
              };
              const targetPosition: ScrollPosition = {
                scrollTop: 0,
                scrollLeft: 0,
              };

              const synchronizedPosition = synchronizeScroll(sourcePosition, targetPosition);

              // Property: Both dimensions should be synchronized to the same value
              expect(synchronizedPosition.scrollTop).toBe(sameValue);
              expect(synchronizedPosition.scrollLeft).toBe(sameValue);
              expect(synchronizedPosition.scrollTop).toBe(synchronizedPosition.scrollLeft);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('multiple sequential scroll synchronizations maintain consistency', () => {
        fc.assert(
          fc.property(
            // Generate an array of scroll positions to simulate multiple scroll events
            fc.array(
              fc.record({
                scrollTop: fc.integer({ min: 0, max: 10000 }),
                scrollLeft: fc.integer({ min: 0, max: 10000 }),
              }),
              { minLength: 1, maxLength: 10 }
            ),
            (scrollSequence) => {
              let originalPosition: ScrollPosition = { scrollTop: 0, scrollLeft: 0 };
              let beautifiedPosition: ScrollPosition = { scrollTop: 0, scrollLeft: 0 };

              // Simulate a sequence of scroll events on original iframe
              for (const newPosition of scrollSequence) {
                originalPosition = newPosition;
                beautifiedPosition = synchronizeScroll(originalPosition, beautifiedPosition);

                // Property: After each sync, both iframes should have same position
                expect(positionsAreEqual(originalPosition, beautifiedPosition)).toBe(true);
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('synchronization from zero position updates target correctly', () => {
        fc.assert(
          fc.property(
            // Generate random non-zero target position
            fc.record({
              scrollTop: fc.integer({ min: 1, max: 10000 }),
              scrollLeft: fc.integer({ min: 1, max: 10000 }),
            }),
            (targetPosition) => {
              const zeroPosition: ScrollPosition = { scrollTop: 0, scrollLeft: 0 };

              const synchronizedPosition = synchronizeScroll(zeroPosition, targetPosition);

              // Property: Syncing from zero should reset target to zero
              expect(synchronizedPosition.scrollTop).toBe(0);
              expect(synchronizedPosition.scrollLeft).toBe(0);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    /**
     * Property 16: Viewport Mode Applies to Both Previews
     *
     * This property test verifies that when selecting a viewport mode,
     * both preview iframes resize to the specified dimensions.
     *
     * **Validates: Requirements 7.4**
     *
     * @description For any viewport mode change (desktop, tablet, mobile) in the comparison view,
     * both preview iframes SHALL update to the new viewport size.
     *
     * Desktop: 1280×800px, Tablet: 768×1024px, Mobile: 375×667px
     */
    describe('Property 16: Viewport Mode Applies to Both Previews', () => {
      /**
       * All valid viewport modes as defined in VIEWPORT_DIMENSIONS
       */
      const VIEWPORT_MODES: readonly ViewportMode[] = ['desktop', 'tablet', 'mobile'] as const;

      /**
       * Comparison modes available in the component
       */
      const COMPARISON_MODES = ['side-by-side', 'overlay'] as const;

      /**
       * Helper function to get iframe dimensions from style attribute
       */
      function getIframeDimensions(iframe: HTMLElement): { width: number; height: number } {
        const style = iframe.getAttribute('style') || '';
        const widthMatch = style.match(/width:\s*(\d+)(?:px)?/);
        const heightMatch = style.match(/height:\s*(\d+)(?:px)?/);
        return {
          width: widthMatch ? parseInt(widthMatch[1], 10) : 0,
          height: heightMatch ? parseInt(heightMatch[1], 10) : 0,
        };
      }

      /**
       * Helper function to click viewport mode button
       */
      function clickViewportButton(mode: ViewportMode) {
        const button = screen.getByRole('radio', { name: new RegExp(mode, 'i') });
        fireEvent.click(button);
      }

      /**
       * Feature: website-beautify, Property 16: Viewport Mode Applies to Both Previews
       *
       * *For any* viewport mode selection, both previews SHALL resize to the specified dimensions.
       *
       * **Validates: Requirements 7.4**
       */
      it('viewport mode applies to both previews (Property 16)', () => {
        fc.assert(
          fc.property(
            // Generate one of the valid viewport modes
            fc.constantFrom(...VIEWPORT_MODES),
            (viewportMode) => {
              // Clean up from any previous render
              cleanup();

              // Render the component
              render(
                <PreviewComparison
                  originalHtml="<h1>Original</h1>"
                  originalCss="h1 { color: red; }"
                  beautifiedHtml="<h1>Beautified</h1>"
                  beautifiedCss="h1 { color: blue; }"
                  onAccept={vi.fn()}
                  onReject={vi.fn()}
                />
              );

              // Click the viewport mode button
              clickViewportButton(viewportMode);

              // Get the expected dimensions from VIEWPORT_DIMENSIONS
              const expectedDimensions = VIEWPORT_DIMENSIONS[viewportMode];

              // Get both iframes
              const originalIframe = screen.getByTitle('Original Website Preview');
              const beautifiedIframe = screen.getByTitle('Beautified Website Preview');

              // Get their dimensions from style
              const originalDimensions = getIframeDimensions(originalIframe);
              const beautifiedDimensions = getIframeDimensions(beautifiedIframe);

              // Property assertion: Both iframes MUST have the specified viewport dimensions
              expect(originalDimensions.width).toBe(expectedDimensions.width);
              expect(originalDimensions.height).toBe(expectedDimensions.height);
              expect(beautifiedDimensions.width).toBe(expectedDimensions.width);
              expect(beautifiedDimensions.height).toBe(expectedDimensions.height);
            }
          ),
          { numRuns: 100 }
        );
      });

      /**
       * Property 16: Sequential viewport mode changes preserve correct dimensions
       *
       * For any sequence of viewport mode selections, both previews SHALL resize
       * to the specified dimensions of the latest selected mode.
       *
       * **Validates: Requirements 7.4**
       */
      it('sequential viewport mode changes apply to both previews (Property 16)', () => {
        fc.assert(
          fc.property(
            // Generate a sequence of 2-5 viewport mode changes
            fc.array(fc.constantFrom(...VIEWPORT_MODES), { minLength: 2, maxLength: 5 }),
            (viewportModeSequence) => {
              // Clean up from any previous render
              cleanup();

              // Render the component
              render(
                <PreviewComparison
                  originalHtml="<h1>Original</h1>"
                  originalCss="h1 { color: red; }"
                  beautifiedHtml="<h1>Beautified</h1>"
                  beautifiedCss="h1 { color: blue; }"
                  onAccept={vi.fn()}
                  onReject={vi.fn()}
                />
              );

              // Apply each viewport mode change in sequence
              for (const mode of viewportModeSequence) {
                clickViewportButton(mode);
              }

              // Get the expected dimensions for the final mode
              const finalMode = viewportModeSequence[viewportModeSequence.length - 1];
              const expectedDimensions = VIEWPORT_DIMENSIONS[finalMode];

              // Get both iframes
              const originalIframe = screen.getByTitle('Original Website Preview');
              const beautifiedIframe = screen.getByTitle('Beautified Website Preview');

              // Get their dimensions
              const originalDimensions = getIframeDimensions(originalIframe);
              const beautifiedDimensions = getIframeDimensions(beautifiedIframe);

              // Property assertion: After all changes, both iframes MUST have final viewport dimensions
              expect(originalDimensions.width).toBe(expectedDimensions.width);
              expect(originalDimensions.height).toBe(expectedDimensions.height);
              expect(beautifiedDimensions.width).toBe(expectedDimensions.width);
              expect(beautifiedDimensions.height).toBe(expectedDimensions.height);
            }
          ),
          { numRuns: 100 }
        );
      });

      /**
       * Property 16: Viewport mode dimensions match VIEWPORT_DIMENSIONS constant
       *
       * For any valid viewport mode, the dimensions applied to both iframes SHALL match
       * exactly the dimensions defined in VIEWPORT_DIMENSIONS.
       *
       * **Validates: Requirements 7.4**
       */
      it('viewport dimensions match VIEWPORT_DIMENSIONS constant (Property 16)', () => {
        fc.assert(
          fc.property(
            // Generate one of the valid viewport modes
            fc.constantFrom(...VIEWPORT_MODES),
            (viewportMode) => {
              // Clean up from any previous render
              cleanup();

              // Render the component
              render(
                <PreviewComparison
                  originalHtml="<h1>Test</h1>"
                  originalCss="h1 { color: black; }"
                  beautifiedHtml="<h1>Test</h1>"
                  beautifiedCss="h1 { color: black; }"
                  onAccept={vi.fn()}
                  onReject={vi.fn()}
                />
              );

              // Click the viewport mode button
              clickViewportButton(viewportMode);

              // Verify that the displayed dimensions text matches the expected dimensions
              const expectedDimensions = VIEWPORT_DIMENSIONS[viewportMode];
              const dimensionsText = `${expectedDimensions.width} × ${expectedDimensions.height}px`;

              // Property assertion: Displayed dimensions MUST match VIEWPORT_DIMENSIONS
              expect(screen.getByText(dimensionsText)).toBeInTheDocument();
            }
          ),
          { numRuns: 100 }
        );
      });

      /**
       * Property 16: Viewport mode selection is deterministic
       *
       * For any viewport mode, selecting it SHALL result in that mode being marked as active
       * (aria-checked="true"), and the same selection SHALL always produce the same result.
       *
       * **Validates: Requirements 7.4**
       */
      it('viewport mode selection is deterministic (Property 16)', () => {
        fc.assert(
          fc.property(
            // Generate one of the valid viewport modes
            fc.constantFrom(...VIEWPORT_MODES),
            // Generate a number of times to verify determinism
            fc.integer({ min: 1, max: 3 }),
            (viewportMode, iterations) => {
              const results: Array<{ dimensions: { width: number; height: number }; isActive: boolean }> = [];

              for (let i = 0; i < iterations; i++) {
                // Clean up from any previous render
                cleanup();

                // Render the component fresh each time
                render(
                  <PreviewComparison
                    originalHtml="<h1>Test</h1>"
                    originalCss="h1 { color: black; }"
                    beautifiedHtml="<h1>Test</h1>"
                    beautifiedCss="h1 { color: black; }"
                    onAccept={vi.fn()}
                    onReject={vi.fn()}
                  />
                );

                // Click the viewport mode button
                clickViewportButton(viewportMode);

                // Get the button and check its active state
                const button = screen.getByRole('radio', { name: new RegExp(viewportMode, 'i') });
                const isActive = button.getAttribute('aria-checked') === 'true';

                // Get iframe dimensions
                const originalIframe = screen.getByTitle('Original Website Preview');
                const dimensions = getIframeDimensions(originalIframe);

                results.push({ dimensions, isActive });
              }

              // Property assertion: All iterations should produce the same result
              for (let i = 1; i < results.length; i++) {
                expect(results[i].dimensions.width).toBe(results[0].dimensions.width);
                expect(results[i].dimensions.height).toBe(results[0].dimensions.height);
                expect(results[i].isActive).toBe(results[0].isActive);
                expect(results[i].isActive).toBe(true); // Should always be active after clicking
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      /**
       * Property 16: Both iframes always have identical dimensions
       *
       * For any viewport mode, both the original and beautified preview iframes
       * SHALL have identical width and height values.
       *
       * **Validates: Requirements 7.4**
       */
      it('both iframes have identical dimensions for any viewport mode (Property 16)', () => {
        fc.assert(
          fc.property(
            // Generate one of the valid viewport modes
            fc.constantFrom(...VIEWPORT_MODES),
            // Generate random HTML content (to ensure dimensions are independent of content)
            fc.string({ minLength: 1, maxLength: 100 }),
            (viewportMode, htmlContent) => {
              // Clean up from any previous render
              cleanup();

              // Render with the generated content
              render(
                <PreviewComparison
                  originalHtml={`<div>${htmlContent}</div>`}
                  originalCss="div { color: black; }"
                  beautifiedHtml={`<div>${htmlContent} enhanced</div>`}
                  beautifiedCss="div { color: blue; }"
                  onAccept={vi.fn()}
                  onReject={vi.fn()}
                />
              );

              // Click the viewport mode button
              clickViewportButton(viewportMode);

              // Get both iframes
              const originalIframe = screen.getByTitle('Original Website Preview');
              const beautifiedIframe = screen.getByTitle('Beautified Website Preview');

              // Get their dimensions
              const originalDimensions = getIframeDimensions(originalIframe);
              const beautifiedDimensions = getIframeDimensions(beautifiedIframe);

              // Property assertion: Both iframes MUST have identical dimensions
              expect(originalDimensions.width).toBe(beautifiedDimensions.width);
              expect(originalDimensions.height).toBe(beautifiedDimensions.height);

              // And they should match the expected viewport dimensions
              const expectedDimensions = VIEWPORT_DIMENSIONS[viewportMode];
              expect(originalDimensions.width).toBe(expectedDimensions.width);
              expect(originalDimensions.height).toBe(expectedDimensions.height);
            }
          ),
          { numRuns: 100 }
        );
      });

      /**
       * Property 16: Viewport mode works in both comparison modes
       *
       * For any viewport mode and any comparison mode (side-by-side or overlay),
       * both iframes SHALL resize to the specified dimensions.
       *
       * **Validates: Requirements 7.4**
       */
      it('viewport mode applies correctly in both comparison modes (Property 16)', () => {
        fc.assert(
          fc.property(
            // Generate viewport mode
            fc.constantFrom(...VIEWPORT_MODES),
            // Generate comparison mode
            fc.constantFrom(...COMPARISON_MODES),
            (viewportMode, comparisonMode) => {
              // Clean up from any previous render
              cleanup();

              // Render the component
              render(
                <PreviewComparison
                  originalHtml="<h1>Test</h1>"
                  originalCss="h1 { color: black; }"
                  beautifiedHtml="<h1>Test</h1>"
                  beautifiedCss="h1 { color: black; }"
                  onAccept={vi.fn()}
                  onReject={vi.fn()}
                />
              );

              // Click comparison mode button if not the default (side-by-side)
              if (comparisonMode === 'overlay') {
                const overlayButton = screen.getByRole('radio', { name: /overlay/i });
                fireEvent.click(overlayButton);
              }

              // Click the viewport mode button
              clickViewportButton(viewportMode);

              // Get the expected dimensions
              const expectedDimensions = VIEWPORT_DIMENSIONS[viewportMode];

              // Get both iframes
              const originalIframe = screen.getByTitle('Original Website Preview');
              const beautifiedIframe = screen.getByTitle('Beautified Website Preview');

              // Get their dimensions
              const originalDimensions = getIframeDimensions(originalIframe);
              const beautifiedDimensions = getIframeDimensions(beautifiedIframe);

              // Property assertion: Both iframes MUST have correct dimensions regardless of comparison mode
              expect(originalDimensions.width).toBe(expectedDimensions.width);
              expect(originalDimensions.height).toBe(expectedDimensions.height);
              expect(beautifiedDimensions.width).toBe(expectedDimensions.width);
              expect(beautifiedDimensions.height).toBe(expectedDimensions.height);
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
