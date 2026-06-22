/**
 * useBeautifySave Hook Tests
 *
 * Tests for the "Save as New" and "Replace Original" logic for beautified websites.
 *
 * Requirements tested:
 * - 8.3: Update existing website document when "Replace Original" is selected
 * - 8.4: Create new website document with beautified content
 * - 8.5: Append " (Beautified)" to title when "Save as New" is selected
 * - 8.6: Navigate to newly created website's preview page
 *
 * Property-Based Tests:
 * - Property 17: Save as New Title Transformation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import {
  useBeautifySave,
  createBeautifiedTitle,
  BEAUTIFIED_TITLE_SUFFIX,
  type UseBeautifySaveOptions,
} from './useBeautifySave';
import type { GeneratedWebsite } from '@/types/website';

// Mock dependencies
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

let mockUser: { uid: string; displayName: string | null } | null = {
  uid: 'test-user-123',
  displayName: 'Test User',
};

vi.mock('@/components/auth', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

const mockSaveWebsite = vi.fn();
const mockUpdateWebsite = vi.fn();

vi.mock('@/services/websiteRepository', () => ({
  save: (...args: unknown[]) => mockSaveWebsite(...args),
  update: (...args: unknown[]) => mockUpdateWebsite(...args),
}));

const mockGenerateThumbnail = vi.fn();
const mockGetPlaceholderThumbnail = vi.fn();

vi.mock('@/services/thumbnailService', () => ({
  generateThumbnail: (...args: unknown[]) => mockGenerateThumbnail(...args),
  getPlaceholderThumbnail: () => mockGetPlaceholderThumbnail(),
}));

describe('useBeautifySave', () => {
  // Sample test data
  const mockOriginalWebsite: GeneratedWebsite = {
    id: 'website-123',
    userId: 'test-user-123',
    title: 'My Website',
    html: '<h1>Original</h1>',
    css: 'h1 { color: red; }',
    thumbnailUrl: 'data:image/png;base64,original',
    inputType: 'text',
    originalPrompt: 'Create a simple website',
    isPublic: true,
    isShowcased: false,
    showcasedAt: null,
    creatorName: 'Test User',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const beautifiedHtml = '<h1>Beautified</h1><p>Enhanced content</p>';
  const beautifiedCss = 'h1 { color: blue; transition: all 0.3s; }';
  const newThumbnailUrl = 'data:image/png;base64,newthumbnail';

  const defaultOptions: UseBeautifySaveOptions = {
    originalWebsite: mockOriginalWebsite,
    beautifiedHtml,
    beautifiedCss,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset the mock user
    mockUser = {
      uid: 'test-user-123',
      displayName: 'Test User',
    };

    // Default mock implementations
    mockGenerateThumbnail.mockResolvedValue({
      success: true,
      dataUrl: newThumbnailUrl,
    });
    mockGetPlaceholderThumbnail.mockReturnValue('data:image/png;base64,placeholder');
    mockSaveWebsite.mockResolvedValue({
      ...mockOriginalWebsite,
      id: 'new-website-456',
      title: `${mockOriginalWebsite.title}${BEAUTIFIED_TITLE_SUFFIX}`,
      html: beautifiedHtml,
      css: beautifiedCss,
      thumbnailUrl: newThumbnailUrl,
    });
    mockUpdateWebsite.mockResolvedValue(undefined);
  });

  describe('createBeautifiedTitle', () => {
    /**
     * Requirement 8.5: Append " (Beautified)" to title when "Save as New" is selected
     */
    it('appends " (Beautified)" suffix to the original title', () => {
      const result = createBeautifiedTitle('My Website');
      expect(result).toBe('My Website (Beautified)');
    });

    it('handles empty title', () => {
      const result = createBeautifiedTitle('');
      expect(result).toBe(' (Beautified)');
    });

    it('handles title with special characters', () => {
      const result = createBeautifiedTitle("User's Website & More!");
      expect(result).toBe("User's Website & More! (Beautified)");
    });

    it('handles title that already has (Beautified) suffix', () => {
      // This should still append another suffix - the UI should prevent double beautification
      const result = createBeautifiedTitle('My Website (Beautified)');
      expect(result).toBe('My Website (Beautified) (Beautified)');
    });
  });

  describe('handleReplaceOriginal', () => {
    /**
     * Requirement 8.3: Update existing website document when "Replace Original" is selected
     */
    it('updates the existing website with beautified content', async () => {
      const { result } = renderHook(() => useBeautifySave(defaultOptions));

      await act(async () => {
        await result.current.handleReplaceOriginal();
      });

      expect(mockUpdateWebsite).toHaveBeenCalledWith(mockOriginalWebsite.id, {
        html: beautifiedHtml,
        css: beautifiedCss,
        thumbnailUrl: newThumbnailUrl,
      });
    });

    it('generates a new thumbnail for the beautified content', async () => {
      const { result } = renderHook(() => useBeautifySave(defaultOptions));

      await act(async () => {
        await result.current.handleReplaceOriginal();
      });

      expect(mockGenerateThumbnail).toHaveBeenCalledWith(beautifiedHtml, beautifiedCss);
    });

    it('uses placeholder thumbnail if generation fails', async () => {
      mockGenerateThumbnail.mockResolvedValue({ success: false, error: 'Failed' });

      const { result } = renderHook(() => useBeautifySave(defaultOptions));

      await act(async () => {
        await result.current.handleReplaceOriginal();
      });

      expect(mockGetPlaceholderThumbnail).toHaveBeenCalled();
      expect(mockUpdateWebsite).toHaveBeenCalledWith(
        mockOriginalWebsite.id,
        expect.objectContaining({
          thumbnailUrl: 'data:image/png;base64,placeholder',
        })
      );
    });

    it('calls onSuccess callback after successful update', async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useBeautifySave({ ...defaultOptions, onSuccess })
      );

      await act(async () => {
        await result.current.handleReplaceOriginal();
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it('calls onOriginalUpdated callback with new content', async () => {
      const onOriginalUpdated = vi.fn();
      const { result } = renderHook(() =>
        useBeautifySave({ ...defaultOptions, onOriginalUpdated })
      );

      await act(async () => {
        await result.current.handleReplaceOriginal();
      });

      expect(onOriginalUpdated).toHaveBeenCalledWith(beautifiedHtml, beautifiedCss);
    });

    it('throws error if update fails', async () => {
      const error = new Error('Update failed');
      mockUpdateWebsite.mockRejectedValue(error);

      const { result } = renderHook(() => useBeautifySave(defaultOptions));

      await expect(
        act(async () => {
          await result.current.handleReplaceOriginal();
        })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('handleSaveAsNew', () => {
    /**
     * Requirement 8.4: Create new website document with beautified content
     */
    it('creates a new website document with beautified content', async () => {
      const { result } = renderHook(() => useBeautifySave(defaultOptions));

      await act(async () => {
        await result.current.handleSaveAsNew();
      });

      expect(mockSaveWebsite).toHaveBeenCalledWith(
        mockUser.uid,
        expect.objectContaining({
          html: beautifiedHtml,
          css: beautifiedCss,
          thumbnailUrl: newThumbnailUrl,
        }),
        mockUser.displayName
      );
    });

    /**
     * Requirement 8.5: Append " (Beautified)" to title when "Save as New" is selected
     */
    it('appends " (Beautified)" to the original title', async () => {
      const { result } = renderHook(() => useBeautifySave(defaultOptions));

      await act(async () => {
        await result.current.handleSaveAsNew();
      });

      expect(mockSaveWebsite).toHaveBeenCalledWith(
        mockUser.uid,
        expect.objectContaining({
          title: `${mockOriginalWebsite.title}${BEAUTIFIED_TITLE_SUFFIX}`,
        }),
        mockUser.displayName
      );
    });

    /**
     * Requirement 8.6: Navigate to newly created website's preview page
     */
    it('navigates to the new website preview page after save', async () => {
      const { result } = renderHook(() => useBeautifySave(defaultOptions));

      await act(async () => {
        await result.current.handleSaveAsNew();
      });

      expect(mockPush).toHaveBeenCalledWith('/website/new-website-456');
    });

    it('preserves original website properties', async () => {
      const { result } = renderHook(() => useBeautifySave(defaultOptions));

      await act(async () => {
        await result.current.handleSaveAsNew();
      });

      expect(mockSaveWebsite).toHaveBeenCalledWith(
        mockUser.uid,
        expect.objectContaining({
          inputType: mockOriginalWebsite.inputType,
          originalPrompt: mockOriginalWebsite.originalPrompt,
          isPublic: mockOriginalWebsite.isPublic,
        }),
        mockUser.displayName
      );
    });

    it('generates a new thumbnail for the beautified content', async () => {
      const { result } = renderHook(() => useBeautifySave(defaultOptions));

      await act(async () => {
        await result.current.handleSaveAsNew();
      });

      expect(mockGenerateThumbnail).toHaveBeenCalledWith(beautifiedHtml, beautifiedCss);
    });

    it('uses placeholder thumbnail if generation fails', async () => {
      mockGenerateThumbnail.mockRejectedValue(new Error('Thumbnail generation failed'));

      const { result } = renderHook(() => useBeautifySave(defaultOptions));

      await act(async () => {
        await result.current.handleSaveAsNew();
      });

      expect(mockSaveWebsite).toHaveBeenCalledWith(
        mockUser.uid,
        expect.objectContaining({
          thumbnailUrl: 'data:image/png;base64,placeholder',
        }),
        mockUser.displayName
      );
    });

    it('calls onSuccess callback before navigation', async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useBeautifySave({ ...defaultOptions, onSuccess })
      );

      await act(async () => {
        await result.current.handleSaveAsNew();
      });

      expect(onSuccess).toHaveBeenCalled();
      // Verify onSuccess was called before navigation
      const onSuccessCallOrder = onSuccess.mock.invocationCallOrder[0];
      const pushCallOrder = mockPush.mock.invocationCallOrder[0];
      expect(onSuccessCallOrder).toBeLessThan(pushCallOrder);
    });

    it('throws error if save fails', async () => {
      const error = new Error('Save failed');
      mockSaveWebsite.mockRejectedValue(error);

      const { result } = renderHook(() => useBeautifySave(defaultOptions));

      await expect(
        act(async () => {
          await result.current.handleSaveAsNew();
        })
      ).rejects.toThrow('Save failed');

      // Should not navigate on error
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('uses "Anonymous" as creator name if displayName is not available', async () => {
      // Mock user without displayName
      mockUser = { uid: 'test-user-123', displayName: null };

      const { result } = renderHook(() => useBeautifySave(defaultOptions));

      await act(async () => {
        await result.current.handleSaveAsNew();
      });

      expect(mockSaveWebsite).toHaveBeenCalledWith(
        'test-user-123',
        expect.any(Object),
        'Anonymous'
      );
    });
  });

  describe('title transformation property', () => {
    /**
     * Property 17: Save as New Title Transformation
     * For any website title when "Save as New" is selected, the new website's title
     * SHALL be the original title with " (Beautified)" appended.
     * Validates: Requirements 8.5
     */
    const testCases = [
      { original: 'Simple Title', expected: 'Simple Title (Beautified)' },
      { original: 'Website 123', expected: 'Website 123 (Beautified)' },
      { original: 'My Awesome Site!', expected: 'My Awesome Site! (Beautified)' },
      { original: '日本語タイトル', expected: '日本語タイトル (Beautified)' },
      { original: 'Title with emoji 🎉', expected: 'Title with emoji 🎉 (Beautified)' },
      { original: '   Whitespace   ', expected: '   Whitespace    (Beautified)' },
    ];

    testCases.forEach(({ original, expected }) => {
      it(`transforms "${original}" to "${expected}"`, async () => {
        const options: UseBeautifySaveOptions = {
          originalWebsite: { ...mockOriginalWebsite, title: original },
          beautifiedHtml,
          beautifiedCss,
        };

        const { result } = renderHook(() => useBeautifySave(options));

        await act(async () => {
          await result.current.handleSaveAsNew();
        });

        expect(mockSaveWebsite).toHaveBeenCalledWith(
          mockUser.uid,
          expect.objectContaining({ title: expected }),
          mockUser.displayName
        );
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
     * Feature: website-beautify, Property 17: Save as New Title Transformation
     *
     * *For any* original title, "Save as New" SHALL append " (Beautified)" suffix.
     * The transformation must be deterministic and preserve the original title
     * as a prefix of the result.
     *
     * **Validates: Requirements 8.5**
     */
    it('title transformation appends suffix for any string (Property 17)', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary strings to represent website titles
          // Include edge cases: empty strings, special characters, unicode
          fc.string({ minLength: 0, maxLength: 500 }),
          (originalTitle) => {
            // Apply the title transformation
            const transformedTitle = createBeautifiedTitle(originalTitle);

            // Property 1: Result should end with the BEAUTIFIED_TITLE_SUFFIX
            expect(transformedTitle.endsWith(BEAUTIFIED_TITLE_SUFFIX)).toBe(true);

            // Property 2: Result should start with the original title
            expect(transformedTitle.startsWith(originalTitle)).toBe(true);

            // Property 3: Result length should equal original length plus suffix length
            expect(transformedTitle.length).toBe(
              originalTitle.length + BEAUTIFIED_TITLE_SUFFIX.length
            );

            // Property 4: Result should be exactly the concatenation
            expect(transformedTitle).toBe(`${originalTitle}${BEAUTIFIED_TITLE_SUFFIX}`);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: website-beautify, Property 17: Title transformation with Unicode
     *
     * *For any* Unicode string (including emojis, CJK characters, RTL text),
     * the transformation SHALL correctly append " (Beautified)" suffix.
     *
     * **Validates: Requirements 8.5**
     */
    it('title transformation handles Unicode strings correctly (Property 17)', () => {
      fc.assert(
        fc.property(
          // Generate strings with full Unicode range including composite graphemes
          fc.string({ minLength: 0, maxLength: 200, unit: 'grapheme-composite' }),
          (originalTitle) => {
            const transformedTitle = createBeautifiedTitle(originalTitle);

            // The suffix should always be appended correctly
            expect(transformedTitle).toBe(`${originalTitle}${BEAUTIFIED_TITLE_SUFFIX}`);

            // Verify the suffix is present
            expect(transformedTitle.endsWith(BEAUTIFIED_TITLE_SUFFIX)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: website-beautify, Property 17: Title transformation preserves content
     *
     * The original title can be recovered by removing the suffix,
     * proving that the transformation is non-destructive.
     *
     * **Validates: Requirements 8.5**
     */
    it('original title is recoverable from transformed title (Property 17)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 500 }),
          (originalTitle) => {
            const transformedTitle = createBeautifiedTitle(originalTitle);

            // Extract the original by removing the suffix
            const recoveredTitle = transformedTitle.slice(
              0,
              transformedTitle.length - BEAUTIFIED_TITLE_SUFFIX.length
            );

            // The recovered title should match the original exactly
            expect(recoveredTitle).toBe(originalTitle);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: website-beautify, Property 17: handleSaveAsNew applies title transformation
     *
     * *For any* original website title, when "Save as New" is selected via the hook,
     * the saved website SHALL have a title that is the original with " (Beautified)" appended.
     *
     * **Validates: Requirements 8.5**
     */
    it('handleSaveAsNew applies correct title transformation (Property 17)', async () => {
      // Test with a variety of generated titles to verify hook integration
      const sampleTitles = fc.sample(fc.string({ minLength: 1, maxLength: 100 }), 100);

      for (const originalTitle of sampleTitles) {
        // Clear mocks before each iteration
        mockSaveWebsite.mockClear();

        // Set up the mock to return a website with the expected title
        const expectedTitle = createBeautifiedTitle(originalTitle);
        mockSaveWebsite.mockResolvedValueOnce({
          ...mockOriginalWebsite,
          id: 'new-website-456',
          title: expectedTitle,
          html: beautifiedHtml,
          css: beautifiedCss,
          thumbnailUrl: newThumbnailUrl,
        });

        const options: UseBeautifySaveOptions = {
          originalWebsite: { ...mockOriginalWebsite, title: originalTitle },
          beautifiedHtml,
          beautifiedCss,
        };

        const { result } = renderHook(() => useBeautifySave(options));

        await act(async () => {
          await result.current.handleSaveAsNew();
        });

        // Verify the title was transformed correctly
        expect(mockSaveWebsite).toHaveBeenCalledWith(
          mockUser?.uid,
          expect.objectContaining({
            title: expectedTitle,
          }),
          mockUser?.displayName
        );
      }
    });

    /**
     * Feature: website-beautify, Property 17: Idempotent suffix constant
     *
     * The BEAUTIFIED_TITLE_SUFFIX constant is consistent and non-empty.
     * This ensures the transformation always produces a meaningful result.
     *
     * **Validates: Requirements 8.5**
     */
    it('BEAUTIFIED_TITLE_SUFFIX is consistent and non-empty (Property 17)', () => {
      // The suffix should never be empty
      expect(BEAUTIFIED_TITLE_SUFFIX.length).toBeGreaterThan(0);

      // The suffix should be exactly " (Beautified)"
      expect(BEAUTIFIED_TITLE_SUFFIX).toBe(' (Beautified)');

      // Running the transformation multiple times with same input yields same result
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 100 }),
          (title) => {
            const result1 = createBeautifiedTitle(title);
            const result2 = createBeautifiedTitle(title);
            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
