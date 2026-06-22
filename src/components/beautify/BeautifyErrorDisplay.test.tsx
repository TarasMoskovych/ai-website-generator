/**
 * BeautifyErrorDisplay Component Tests
 *
 * Tests for the error recovery UI component used during beautification errors.
 *
 * Requirements tested:
 * - 10.1: Display user-friendly network error message
 * - 10.2: Display user-friendly timeout error message
 * - 10.3: Display user-friendly authentication error message
 * - 10.4: Display user-friendly rate limit error message
 * - 10.5: Display user-friendly parse error message
 * - 10.6: Provide "Try Again" button for retryable errors
 * - 10.7: Provide "Dismiss" button to return to normal preview mode
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BeautifyErrorDisplay } from './BeautifyErrorDisplay';
import { createBeautifyError } from '@/lib/beautifyErrors';
import type { BeautifyError } from '@/lib/beautifyErrors';

describe('BeautifyErrorDisplay', () => {
  const mockOnRetry = vi.fn();
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a portal root for the overlay
    const portalRoot = document.createElement('div');
    portalRoot.setAttribute('id', 'portal-root');
    document.body.appendChild(portalRoot);
  });

  afterEach(() => {
    // Clean up portal root
    const portalRoot = document.getElementById('portal-root');
    if (portalRoot) {
      document.body.removeChild(portalRoot);
    }
    // Clean up body overflow style
    document.body.style.overflow = '';
  });

  describe('Error Message Display', () => {
    it('displays network error message (Requirement 10.1)', () => {
      const error = createBeautifyError('BEAUTIFY_NETWORK_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          variant="inline"
        />
      );

      expect(screen.getByText('Unable to connect. Please check your internet connection.')).toBeInTheDocument();
    });

    it('displays timeout error message (Requirement 10.2)', () => {
      const error = createBeautifyError('BEAUTIFY_TIMEOUT_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          variant="inline"
        />
      );

      expect(screen.getByText('Beautification timed out. The website may be too complex. Please try again.')).toBeInTheDocument();
    });

    it('displays authentication error message (Requirement 10.3)', () => {
      const error = createBeautifyError('BEAUTIFY_AUTH_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          variant="inline"
        />
      );

      expect(screen.getByText('Session expired. Please refresh the page and try again.')).toBeInTheDocument();
    });

    it('displays rate limit error message (Requirement 10.4)', () => {
      const error = createBeautifyError('BEAUTIFY_RATE_LIMIT_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          variant="inline"
        />
      );

      expect(screen.getByText('Service is busy. Please wait a moment and try again.')).toBeInTheDocument();
    });

    it('displays parse error message (Requirement 10.5)', () => {
      const error = createBeautifyError('BEAUTIFY_PARSE_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          variant="inline"
        />
      );

      expect(screen.getByText('Failed to process beautified content. Please try again.')).toBeInTheDocument();
    });

    it('displays suggested action when available', () => {
      const error = createBeautifyError('BEAUTIFY_NETWORK_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          variant="inline"
        />
      );

      expect(screen.getByText(/Suggested action:/)).toBeInTheDocument();
      expect(screen.getByText(/Check your internet connection and try again./)).toBeInTheDocument();
    });

    it('displays retry after time for rate limit errors', () => {
      const error = createBeautifyError('BEAUTIFY_RATE_LIMIT_ERROR', undefined, undefined, 30);

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          variant="inline"
        />
      );

      expect(screen.getByText(/Please wait 30 seconds before retrying./)).toBeInTheDocument();
    });
  });

  describe('Retry Button (Requirement 10.6)', () => {
    it('shows retry button for retryable errors', () => {
      const error = createBeautifyError('BEAUTIFY_NETWORK_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          variant="inline"
        />
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('does not show retry button for non-retryable errors', () => {
      const error = createBeautifyError('BEAUTIFY_VALIDATION_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          variant="inline"
        />
      );

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', () => {
      const error = createBeautifyError('BEAUTIFY_NETWORK_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          variant="inline"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('disables retry button when isRetrying is true', () => {
      const error = createBeautifyError('BEAUTIFY_NETWORK_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          isRetrying={true}
          variant="inline"
        />
      );

      const retryButton = screen.getByRole('button', { name: /retrying/i });
      expect(retryButton).toBeDisabled();
    });

    it('shows loading spinner when retrying', () => {
      const error = createBeautifyError('BEAUTIFY_NETWORK_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          isRetrying={true}
          variant="inline"
        />
      );

      expect(screen.getByText('Retrying...')).toBeInTheDocument();
    });

    it('disables retry button when retryAfter is set', () => {
      const error = createBeautifyError('BEAUTIFY_RATE_LIMIT_ERROR', undefined, undefined, 30);

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          variant="inline"
        />
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeDisabled();
    });
  });

  describe('Dismiss Button (Requirement 10.7)', () => {
    it('shows dismiss button', () => {
      const error = createBeautifyError('BEAUTIFY_NETWORK_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          variant="inline"
        />
      );

      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    });

    it('calls onDismiss when dismiss button is clicked', () => {
      const error = createBeautifyError('BEAUTIFY_NETWORK_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          variant="inline"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('disables dismiss button when retrying', () => {
      const error = createBeautifyError('BEAUTIFY_NETWORK_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          isRetrying={true}
          variant="inline"
        />
      );

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      expect(dismissButton).toBeDisabled();
    });
  });

  describe('Auth Error Special Handling', () => {
    it('shows refresh page button for auth errors', () => {
      const error = createBeautifyError('BEAUTIFY_AUTH_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          variant="inline"
        />
      );

      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    });

    it('does not show retry button for auth errors (not retryable)', () => {
      const error = createBeautifyError('BEAUTIFY_AUTH_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          variant="inline"
        />
      );

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });
  });

  describe('Overlay Variant', () => {
    it('renders in overlay mode by default', () => {
      const error = createBeautifyError('BEAUTIFY_NETWORK_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      // Check for alertdialog role which is used in overlay mode
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('calls onDismiss when backdrop is clicked', () => {
      const error = createBeautifyError('BEAUTIFY_NETWORK_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      // Click on the backdrop (parent of alertdialog)
      const backdrop = document.querySelector('[aria-hidden="true"]');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when Escape key is pressed', () => {
      const error = createBeautifyError('BEAUTIFY_NETWORK_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('prevents body scroll when overlay is open', () => {
      const error = createBeautifyError('BEAUTIFY_NETWORK_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');
    });
  });

  describe('Inline Variant', () => {
    it('renders in inline mode when specified', () => {
      const error = createBeautifyError('BEAUTIFY_NETWORK_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          variant="inline"
        />
      );

      // Check for alert role which is used in inline mode
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('does not prevent body scroll in inline mode', () => {
      const error = createBeautifyError('BEAUTIFY_NETWORK_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          variant="inline"
        />
      );

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for overlay', () => {
      const error = createBeautifyError('BEAUTIFY_NETWORK_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'beautify-error-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'beautify-error-message');
    });

    it('has proper ARIA attributes for inline', () => {
      const error = createBeautifyError('BEAUTIFY_NETWORK_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          variant="inline"
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-labelledby', 'beautify-error-title');
      expect(alert).toHaveAttribute('aria-describedby', 'beautify-error-message');
    });

    it('displays the error title', () => {
      const error = createBeautifyError('BEAUTIFY_NETWORK_ERROR');

      render(
        <BeautifyErrorDisplay
          error={error}
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
          variant="inline"
        />
      );

      expect(screen.getByText('Beautification Failed')).toBeInTheDocument();
    });
  });

  describe('Different Error Categories', () => {
    const testCases: Array<{
      code: Parameters<typeof createBeautifyError>[0];
      category: string;
      isRetryable: boolean;
    }> = [
      { code: 'BEAUTIFY_NETWORK_ERROR', category: 'network', isRetryable: true },
      { code: 'BEAUTIFY_TIMEOUT_ERROR', category: 'network', isRetryable: true },
      { code: 'BEAUTIFY_AI_ERROR', category: 'ai', isRetryable: true },
      { code: 'BEAUTIFY_RATE_LIMIT_ERROR', category: 'ai', isRetryable: true },
      { code: 'BEAUTIFY_PARSE_ERROR', category: 'ai', isRetryable: true },
      { code: 'BEAUTIFY_VALIDATION_ERROR', category: 'validation', isRetryable: false },
      { code: 'BEAUTIFY_MISSING_FIELDS', category: 'validation', isRetryable: false },
      { code: 'BEAUTIFY_INVALID_IMAGE_TYPE', category: 'validation', isRetryable: false },
      { code: 'BEAUTIFY_IMAGE_TOO_LARGE', category: 'validation', isRetryable: false },
      { code: 'BEAUTIFY_AUTH_ERROR', category: 'general', isRetryable: false },
      { code: 'BEAUTIFY_CANCELLED', category: 'general', isRetryable: false },
      { code: 'BEAUTIFY_UNKNOWN_ERROR', category: 'general', isRetryable: true },
    ];

    testCases.forEach(({ code, isRetryable }) => {
      it(`handles ${code} error correctly`, () => {
        const error = createBeautifyError(code);

        render(
          <BeautifyErrorDisplay
            error={error}
            onRetry={mockOnRetry}
            onDismiss={mockOnDismiss}
            variant="inline"
          />
        );

        // Error message should be displayed
        expect(screen.getByText(error.message)).toBeInTheDocument();

        // Retry button should be present only for retryable errors
        const retryButton = screen.queryByRole('button', { name: /try again/i });
        if (isRetryable) {
          expect(retryButton).toBeInTheDocument();
        } else {
          expect(retryButton).not.toBeInTheDocument();
        }
      });
    });
  });
});
