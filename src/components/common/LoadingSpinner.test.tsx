/**
 * LoadingSpinner Component Unit Tests
 *
 * Tests for the LoadingSpinner component that displays a centered
 * spinning indicator with optional message.
 *
 * Validates: Requirements 1.2, 1.3, 1.4
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('Message Rendering', () => {
    /**
     * Tests that the default message "Loading..." is rendered when no message prop is provided
     * Validates: Requirement 1.2
     */
    it('renders with default message "Loading..."', () => {
      render(<LoadingSpinner />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    /**
     * Tests that a custom message is rendered when provided
     * Validates: Requirement 1.2
     */
    it('renders with custom message', () => {
      render(<LoadingSpinner message="Loading website..." />);

      expect(screen.getByText('Loading website...')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    /**
     * Tests that messages longer than 100 characters are truncated
     * Validates: Requirement 1.2 (max 100 characters)
     */
    it('truncates message longer than 100 characters', () => {
      const longMessage = 'A'.repeat(150); // 150 characters
      render(<LoadingSpinner message={longMessage} />);

      const displayedMessage = screen.getByText('A'.repeat(100));
      expect(displayedMessage).toBeInTheDocument();

      // Verify the truncated message length
      expect(displayedMessage.textContent).toHaveLength(100);
    });

    /**
     * Tests that messages exactly 100 characters are not truncated
     * Validates: Requirement 1.2
     */
    it('does not truncate message of exactly 100 characters', () => {
      const exactMessage = 'B'.repeat(100);
      render(<LoadingSpinner message={exactMessage} />);

      const displayedMessage = screen.getByText(exactMessage);
      expect(displayedMessage).toBeInTheDocument();
      expect(displayedMessage.textContent).toHaveLength(100);
    });

    /**
     * Tests that messages shorter than 100 characters are rendered as-is
     * Validates: Requirement 1.2
     */
    it('renders short message without truncation', () => {
      const shortMessage = 'Short message';
      render(<LoadingSpinner message={shortMessage} />);

      expect(screen.getByText(shortMessage)).toBeInTheDocument();
    });
  });

  describe('FullScreen Height Class', () => {
    /**
     * Tests that fullScreen prop applies min-h-screen class when true
     * Validates: Requirement 1.4
     */
    it('applies fullScreen height class when prop is true', () => {
      const { container } = render(<LoadingSpinner fullScreen={true} />);

      const wrapperDiv = container.firstChild as HTMLElement;
      expect(wrapperDiv).toHaveClass('min-h-screen');
      expect(wrapperDiv).not.toHaveClass('min-h-[400px]');
    });

    /**
     * Tests that default height class is applied when fullScreen is false
     * Validates: Requirement 1.4
     */
    it('applies default height class when fullScreen is false', () => {
      const { container } = render(<LoadingSpinner fullScreen={false} />);

      const wrapperDiv = container.firstChild as HTMLElement;
      expect(wrapperDiv).toHaveClass('min-h-[400px]');
      expect(wrapperDiv).not.toHaveClass('min-h-screen');
    });

    /**
     * Tests that default height class is applied when fullScreen is undefined
     * Validates: Requirement 1.4
     */
    it('applies default height class when fullScreen is undefined', () => {
      const { container } = render(<LoadingSpinner />);

      const wrapperDiv = container.firstChild as HTMLElement;
      expect(wrapperDiv).toHaveClass('min-h-[400px]');
      expect(wrapperDiv).not.toHaveClass('min-h-screen');
    });
  });

  describe('Spinner Dimensions', () => {
    /**
     * Tests that the spinner has correct dimensions (40x40 pixels)
     * Validates: Requirement 1.3
     */
    it('spinner has correct dimensions (40x40)', () => {
      const { container } = render(<LoadingSpinner />);

      // Find the spinner element (div with animate-spin class)
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();

      // Verify the spinner has h-10 (40px) and w-10 (40px) classes
      expect(spinner).toHaveClass('h-10');
      expect(spinner).toHaveClass('w-10');
    });

    /**
     * Tests that the spinner has primary color border styling
     * Validates: Requirement 1.3
     */
    it('spinner has primary color theme styling', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('border-primary');
      expect(spinner).toHaveClass('border-t-transparent');
    });

    /**
     * Tests that the spinner has circular shape with border
     * Validates: Requirement 1.3
     */
    it('spinner has circular shape with border', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('rounded-full');
      expect(spinner).toHaveClass('border-4');
    });
  });

  describe('Layout Structure', () => {
    /**
     * Tests that the component renders a centered layout
     * Validates: Requirement 1.3
     */
    it('renders a centered layout', () => {
      const { container } = render(<LoadingSpinner />);

      const wrapperDiv = container.firstChild as HTMLElement;
      expect(wrapperDiv).toHaveClass('flex');
      expect(wrapperDiv).toHaveClass('items-center');
      expect(wrapperDiv).toHaveClass('justify-center');
    });

    /**
     * Tests that the message is rendered below the spinner
     * Validates: Requirement 1.3
     */
    it('renders message with muted foreground color', () => {
      render(<LoadingSpinner message="Test message" />);

      const message = screen.getByText('Test message');
      expect(message).toHaveClass('text-muted-foreground');
    });

    /**
     * Tests that spinner and message are in a flex column layout
     * Validates: Requirement 1.3
     */
    it('spinner and message are in flex column layout with gap', () => {
      const { container } = render(<LoadingSpinner />);

      const innerContainer = container.querySelector('.flex-col');
      expect(innerContainer).toBeInTheDocument();
      expect(innerContainer).toHaveClass('items-center');
      expect(innerContainer).toHaveClass('gap-4');
    });
  });
});
