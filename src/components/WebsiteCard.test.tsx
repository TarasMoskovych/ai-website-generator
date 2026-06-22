/**
 * WebsiteCard Component Integration Tests
 *
 * Tests that verify WebsiteCard renders correctly with new icon imports
 * and all interactive elements function properly.
 *
 * Validates: Requirements 12.3, 13.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WebsiteCard, WebsiteCardProps } from './WebsiteCard';
import type { GeneratedWebsite } from '@/types';

// Mock website data
const createMockWebsite = (overrides?: Partial<GeneratedWebsite>): GeneratedWebsite => ({
  id: 'test-website-id',
  userId: 'test-user-id',
  title: 'Test Website',
  html: '<html><body>Test</body></html>',
  css: 'body { margin: 0; }',
  thumbnailUrl: 'data:image/png;base64,test',
  inputType: 'text',
  originalPrompt: 'Test prompt',
  isPublic: false,
  isShowcased: false,
  showcasedAt: null,
  creatorName: 'Test User',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('WebsiteCard Integration Tests', () => {
  // Default props for tests
  const defaultProps: WebsiteCardProps = {
    website: createMockWebsite(),
    onDelete: vi.fn(),
    onTitleEdit: vi.fn(),
    onClick: vi.fn(),
    onBeautify: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Icon Rendering with Shared Icons Module', () => {
    /**
     * Tests that icons are rendered from the shared Icons module
     * Validates: Requirements 12.1, 12.2, 12.3
     */
    it('renders TextIcon for text input type', () => {
      render(
        <WebsiteCard {...defaultProps} website={createMockWebsite({ inputType: 'text' })} />
      );

      // Find the input type badge with the TextIcon
      const inputTypeBadge = screen.getByTitle(/generated from text/i);
      expect(inputTypeBadge).toBeInTheDocument();

      // Verify the SVG icon is rendered with aria-hidden
      const svg = inputTypeBadge.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    /**
     * Tests that ImageIcon is rendered for screenshot input type
     * Validates: Requirements 12.1, 12.2, 12.3
     */
    it('renders ImageIcon for screenshot input type', () => {
      render(
        <WebsiteCard {...defaultProps} website={createMockWebsite({ inputType: 'screenshot' })} />
      );

      const inputTypeBadge = screen.getByTitle(/generated from screenshot/i);
      expect(inputTypeBadge).toBeInTheDocument();

      const svg = inputTypeBadge.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    /**
     * Tests that GlobeIcon is rendered for showcased websites
     * Validates: Requirements 12.1, 12.2, 12.3
     */
    it('renders GlobeIcon for showcased websites', () => {
      render(
        <WebsiteCard {...defaultProps} website={createMockWebsite({ isShowcased: true })} />
      );

      const showcaseBadge = screen.getByTitle(/shared to showcase/i);
      expect(showcaseBadge).toBeInTheDocument();

      const svg = showcaseBadge.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    /**
     * Tests that SparklesIcon is rendered in the beautify button
     * Validates: Requirements 12.1, 12.2, 12.3
     */
    it('renders SparklesIcon in beautify button', () => {
      render(<WebsiteCard {...defaultProps} />);

      const beautifyButton = screen.getByLabelText(/beautify/i);
      expect(beautifyButton).toBeInTheDocument();

      const svg = beautifyButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    /**
     * Tests that TrashIcon is rendered in the delete button
     * Validates: Requirements 12.1, 12.2, 12.3
     */
    it('renders TrashIcon in delete button', () => {
      render(<WebsiteCard {...defaultProps} />);

      const deleteButton = screen.getByLabelText(/delete/i);
      expect(deleteButton).toBeInTheDocument();

      const svg = deleteButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    /**
     * Tests that EditIcon is rendered in edit button
     * Validates: Requirements 12.1, 12.2, 12.3
     */
    it('renders EditIcon in edit title button', () => {
      render(<WebsiteCard {...defaultProps} />);

      const editButton = screen.getByLabelText(/edit title/i);
      expect(editButton).toBeInTheDocument();

      const svg = editButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    /**
     * Tests that CheckIcon and XIcon are rendered when editing
     * Validates: Requirements 12.1, 12.2, 12.3
     */
    it('renders CheckIcon and XIcon when editing title', async () => {
      render(<WebsiteCard {...defaultProps} />);

      // Click the edit button to start editing
      const editButton = screen.getByLabelText(/edit title/i);
      fireEvent.click(editButton);

      // Verify save button with CheckIcon
      const saveButton = screen.getByLabelText(/save title/i);
      expect(saveButton).toBeInTheDocument();
      const saveSvg = saveButton.querySelector('svg');
      expect(saveSvg).toHaveAttribute('aria-hidden', 'true');

      // Verify cancel button with XIcon
      const cancelButton = screen.getByLabelText(/cancel editing/i);
      expect(cancelButton).toBeInTheDocument();
      const cancelSvg = cancelButton.querySelector('svg');
      expect(cancelSvg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Interactive Elements Functionality', () => {
    /**
     * Tests that clicking the card triggers onClick
     * Validates: Requirement 13.1
     */
    it('triggers onClick when card is clicked', () => {
      render(<WebsiteCard {...defaultProps} />);

      const card = screen.getByRole('button', { name: /website: test website/i });
      fireEvent.click(card);

      expect(defaultProps.onClick).toHaveBeenCalledWith('test-website-id');
    });

    /**
     * Tests that delete button triggers onDelete
     * Validates: Requirement 13.1
     */
    it('triggers onDelete when delete button is clicked', () => {
      render(<WebsiteCard {...defaultProps} />);

      const deleteButton = screen.getByLabelText(/delete test website/i);
      fireEvent.click(deleteButton);

      expect(defaultProps.onDelete).toHaveBeenCalledWith('test-website-id');
      // Should not trigger card onClick
      expect(defaultProps.onClick).not.toHaveBeenCalled();
    });

    /**
     * Tests that beautify button triggers onBeautify
     * Validates: Requirement 13.1
     */
    it('triggers onBeautify when beautify button is clicked', () => {
      render(<WebsiteCard {...defaultProps} />);

      const beautifyButton = screen.getByLabelText(/beautify test website/i);
      fireEvent.click(beautifyButton);

      expect(defaultProps.onBeautify).toHaveBeenCalledWith('test-website-id');
      // Should not trigger card onClick
      expect(defaultProps.onClick).not.toHaveBeenCalled();
    });

    /**
     * Tests that title editing workflow functions correctly
     * Validates: Requirement 13.1
     */
    it('allows editing and saving title', async () => {
      render(<WebsiteCard {...defaultProps} />);

      // Click edit button
      const editButton = screen.getByLabelText(/edit title/i);
      fireEvent.click(editButton);

      // Find the input field and change the title
      const input = screen.getByLabelText(/edit website title/i);
      expect(input).toHaveValue('Test Website');

      fireEvent.change(input, { target: { value: 'New Title' } });

      // Click save button
      const saveButton = screen.getByLabelText(/save title/i);
      fireEvent.click(saveButton);

      expect(defaultProps.onTitleEdit).toHaveBeenCalledWith('test-website-id', 'New Title');
    });

    /**
     * Tests that title editing can be cancelled
     * Validates: Requirement 13.1
     */
    it('allows cancelling title edit', async () => {
      render(<WebsiteCard {...defaultProps} />);

      // Click edit button
      const editButton = screen.getByLabelText(/edit title/i);
      fireEvent.click(editButton);

      // Find the input field and change the title
      const input = screen.getByLabelText(/edit website title/i);
      fireEvent.change(input, { target: { value: 'Changed Title' } });

      // Click cancel button
      const cancelButton = screen.getByLabelText(/cancel editing/i);
      fireEvent.click(cancelButton);

      // Should not trigger onTitleEdit
      expect(defaultProps.onTitleEdit).not.toHaveBeenCalled();

      // Original title should still be displayed
      expect(screen.getByText('Test Website')).toBeInTheDocument();
    });

    /**
     * Tests that Enter key saves the title
     * Validates: Requirement 13.1
     */
    it('saves title when Enter key is pressed', async () => {
      render(<WebsiteCard {...defaultProps} />);

      // Click edit button
      const editButton = screen.getByLabelText(/edit title/i);
      fireEvent.click(editButton);

      // Find the input field and change the title
      const input = screen.getByLabelText(/edit website title/i);
      fireEvent.change(input, { target: { value: 'New Title' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(defaultProps.onTitleEdit).toHaveBeenCalledWith('test-website-id', 'New Title');
    });

    /**
     * Tests that Escape key cancels the edit
     * Validates: Requirement 13.1
     */
    it('cancels edit when Escape key is pressed', async () => {
      render(<WebsiteCard {...defaultProps} />);

      // Click edit button
      const editButton = screen.getByLabelText(/edit title/i);
      fireEvent.click(editButton);

      // Find the input field and press Escape
      const input = screen.getByLabelText(/edit website title/i);
      fireEvent.change(input, { target: { value: 'Changed Title' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      // Should not trigger onTitleEdit
      expect(defaultProps.onTitleEdit).not.toHaveBeenCalled();

      // Original title should still be displayed
      expect(screen.getByText('Test Website')).toBeInTheDocument();
    });

    /**
     * Tests that card can be accessed via keyboard
     * Validates: Requirement 13.1
     */
    it('supports keyboard navigation', () => {
      render(<WebsiteCard {...defaultProps} />);

      const card = screen.getByRole('button', { name: /website: test website/i });

      // Card should be focusable
      expect(card).toHaveAttribute('tabIndex', '0');

      // Press Enter should trigger onClick
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(defaultProps.onClick).toHaveBeenCalledWith('test-website-id');
    });
  });

  describe('Component Rendering', () => {
    /**
     * Tests that the component renders correctly with all data
     * Validates: Requirement 12.3
     */
    it('renders website title correctly', () => {
      render(<WebsiteCard {...defaultProps} />);

      expect(screen.getByText('Test Website')).toBeInTheDocument();
    });

    /**
     * Tests that thumbnail is rendered
     * Validates: Requirement 12.3
     */
    it('renders thumbnail image', () => {
      render(<WebsiteCard {...defaultProps} />);

      const thumbnail = screen.getByAltText(/thumbnail for test website/i);
      expect(thumbnail).toBeInTheDocument();
      expect(thumbnail).toHaveAttribute('src', 'data:image/png;base64,test');
    });

    /**
     * Tests that placeholder is shown when no thumbnail
     * Validates: Requirement 12.3
     */
    it('renders placeholder when no thumbnail', () => {
      render(
        <WebsiteCard {...defaultProps} website={createMockWebsite({ thumbnailUrl: '' })} />
      );

      const placeholder = screen.getByLabelText(/no thumbnail available/i);
      expect(placeholder).toBeInTheDocument();
    });

    /**
     * Tests that creation date is displayed
     * Validates: Requirement 12.3
     */
    it('renders creation date', () => {
      const today = new Date();
      render(
        <WebsiteCard {...defaultProps} website={createMockWebsite({ createdAt: today.toISOString() })} />
      );

      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    /**
     * Tests that beautify button is not rendered when onBeautify is not provided
     * Validates: Requirement 12.3
     */
    it('does not render beautify button when onBeautify is not provided', () => {
      render(
        <WebsiteCard {...defaultProps} onBeautify={undefined} />
      );

      expect(screen.queryByLabelText(/beautify/i)).not.toBeInTheDocument();
    });
  });

  describe('Title Validation', () => {
    /**
     * Tests that empty title shows error
     * Validates: Requirement 13.1
     */
    it('shows error for empty title', async () => {
      render(<WebsiteCard {...defaultProps} />);

      // Click edit button
      const editButton = screen.getByLabelText(/edit title/i);
      fireEvent.click(editButton);

      // Clear the input and try to save
      const input = screen.getByLabelText(/edit website title/i);
      fireEvent.change(input, { target: { value: '' } });

      const saveButton = screen.getByLabelText(/save title/i);
      fireEvent.click(saveButton);

      // Should show validation error
      expect(screen.getByRole('alert')).toHaveTextContent(/title must be at least/i);
      expect(defaultProps.onTitleEdit).not.toHaveBeenCalled();
    });
  });

  describe('Save Confirmation', () => {
    /**
     * Tests that save confirmation is shown after successful save
     * Validates: Requirement 13.1
     */
    it('shows save confirmation after editing title', async () => {
      render(<WebsiteCard {...defaultProps} />);

      // Click edit button
      const editButton = screen.getByLabelText(/edit title/i);
      fireEvent.click(editButton);

      // Find the input field and change the title
      const input = screen.getByLabelText(/edit website title/i);
      fireEvent.change(input, { target: { value: 'New Title' } });

      // Click save button
      const saveButton = screen.getByLabelText(/save title/i);
      fireEvent.click(saveButton);

      // Should show "Saved" confirmation
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });
  });
});
