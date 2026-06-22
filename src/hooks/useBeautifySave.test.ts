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
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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
});
