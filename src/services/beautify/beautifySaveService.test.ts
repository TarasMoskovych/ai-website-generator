/**
 * Tests for BeautifySaveService
 *
 * Unit tests for the beautify save operations including
 * "Replace Original" and "Save as New" functionality.
 *
 * Validates: Requirements 8.3, 8.4, 8.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { replaceOriginal, saveAsNew } from './beautifySaveService';

// Mock the websiteRepository
vi.mock('@/services/websiteRepository', () => ({
  update: vi.fn(),
  save: vi.fn(),
  getById: vi.fn(),
}));

// Mock the thumbnailService
vi.mock('@/services/thumbnailService', () => ({
  generateThumbnail: vi.fn(),
  getPlaceholderThumbnail: vi.fn(() => 'data:image/png;base64,placeholder'),
}));

// Import mocked modules
import * as websiteRepository from '@/services/websiteRepository';
import * as thumbnailService from '@/services/thumbnailService';

describe('beautifySaveService', () => {
  const mockWebsite = {
    id: 'test-website-id',
    userId: 'test-user-id',
    title: 'Test Website',
    html: '<html>Original</html>',
    css: 'body { color: black; }',
    thumbnailUrl: 'data:image/png;base64,original',
    inputType: 'text' as const,
    originalPrompt: 'A test website',
    isPublic: true,
    isShowcased: false,
    showcasedAt: null,
    creatorName: 'Test User',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const beautifiedHtml = '<html>Beautified</html>';
  const beautifiedCss = 'body { color: blue; }';
  const newThumbnailUrl = 'data:image/png;base64,newthumbnail';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('replaceOriginal', () => {
    /**
     * Requirement 8.3: Update existing website document when "Replace Original" is selected
     */
    it('should update existing website with beautified content', async () => {
      // Setup mocks
      vi.mocked(thumbnailService.generateThumbnail).mockResolvedValue({
        success: true,
        dataUrl: newThumbnailUrl,
      });
      vi.mocked(websiteRepository.update).mockResolvedValue(undefined);
      vi.mocked(websiteRepository.getById).mockResolvedValue({
        ...mockWebsite,
        html: beautifiedHtml,
        css: beautifiedCss,
        thumbnailUrl: newThumbnailUrl,
      });

      // Execute
      const result = await replaceOriginal({
        websiteId: 'test-website-id',
        html: beautifiedHtml,
        css: beautifiedCss,
      });

      // Verify
      expect(result.success).toBe(true);
      expect(websiteRepository.update).toHaveBeenCalledWith('test-website-id', {
        html: beautifiedHtml,
        css: beautifiedCss,
        thumbnailUrl: newThumbnailUrl,
      });
      expect(result.website).toBeDefined();
      expect(result.website?.html).toBe(beautifiedHtml);
      expect(result.website?.css).toBe(beautifiedCss);
    });

    /**
     * Test that thumbnail is regenerated with beautified content
     */
    it('should regenerate thumbnail from beautified content', async () => {
      vi.mocked(thumbnailService.generateThumbnail).mockResolvedValue({
        success: true,
        dataUrl: newThumbnailUrl,
      });
      vi.mocked(websiteRepository.update).mockResolvedValue(undefined);
      vi.mocked(websiteRepository.getById).mockResolvedValue({
        ...mockWebsite,
        thumbnailUrl: newThumbnailUrl,
      });

      await replaceOriginal({
        websiteId: 'test-website-id',
        html: beautifiedHtml,
        css: beautifiedCss,
      });

      expect(thumbnailService.generateThumbnail).toHaveBeenCalledWith(
        beautifiedHtml,
        beautifiedCss
      );
    });

    /**
     * Test that placeholder is used when thumbnail generation fails
     */
    it('should use placeholder thumbnail when generation fails', async () => {
      vi.mocked(thumbnailService.generateThumbnail).mockResolvedValue({
        success: false,
        dataUrl: 'data:image/png;base64,placeholder',
        error: 'Generation failed',
      });
      vi.mocked(websiteRepository.update).mockResolvedValue(undefined);
      vi.mocked(websiteRepository.getById).mockResolvedValue(mockWebsite);

      const result = await replaceOriginal({
        websiteId: 'test-website-id',
        html: beautifiedHtml,
        css: beautifiedCss,
      });

      expect(result.success).toBe(true);
      expect(websiteRepository.update).toHaveBeenCalledWith('test-website-id', {
        html: beautifiedHtml,
        css: beautifiedCss,
        thumbnailUrl: 'data:image/png;base64,placeholder',
      });
    });

    /**
     * Test error handling for invalid websiteId
     */
    it('should return error for invalid websiteId', async () => {
      const result = await replaceOriginal({
        websiteId: '',
        html: beautifiedHtml,
        css: beautifiedCss,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid website ID');
      expect(websiteRepository.update).not.toHaveBeenCalled();
    });

    /**
     * Test error handling for invalid HTML
     */
    it('should return error for invalid HTML', async () => {
      const result = await replaceOriginal({
        websiteId: 'test-website-id',
        html: '',
        css: beautifiedCss,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid HTML content');
    });

    /**
     * Test error handling for invalid CSS
     */
    it('should return error for invalid CSS', async () => {
      const result = await replaceOriginal({
        websiteId: 'test-website-id',
        html: beautifiedHtml,
        css: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid CSS content');
    });

    /**
     * Test error handling when website is not found
     */
    it('should return error when website not found', async () => {
      vi.mocked(thumbnailService.generateThumbnail).mockResolvedValue({
        success: true,
        dataUrl: newThumbnailUrl,
      });
      vi.mocked(websiteRepository.update).mockRejectedValue(
        new Error('Website not found')
      );

      const result = await replaceOriginal({
        websiteId: 'nonexistent-id',
        html: beautifiedHtml,
        css: beautifiedCss,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Website not found. It may have been deleted.');
    });

    /**
     * Test error handling for permission errors
     */
    it('should return error for permission denied', async () => {
      vi.mocked(thumbnailService.generateThumbnail).mockResolvedValue({
        success: true,
        dataUrl: newThumbnailUrl,
      });
      vi.mocked(websiteRepository.update).mockRejectedValue(
        new Error('permission denied')
      );

      const result = await replaceOriginal({
        websiteId: 'test-website-id',
        html: beautifiedHtml,
        css: beautifiedCss,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('You do not have permission to update this website.');
    });
  });

  describe('saveAsNew', () => {
    /**
     * Requirement 8.5: Append " (Beautified)" to title when "Save as New" is selected
     */
    it('should create new website with "(Beautified)" suffix in title', async () => {
      const newWebsite = {
        ...mockWebsite,
        id: 'new-website-id',
        title: 'Test Website (Beautified)',
        html: beautifiedHtml,
        css: beautifiedCss,
        thumbnailUrl: newThumbnailUrl,
      };

      vi.mocked(websiteRepository.getById).mockResolvedValue(mockWebsite);
      vi.mocked(thumbnailService.generateThumbnail).mockResolvedValue({
        success: true,
        dataUrl: newThumbnailUrl,
      });
      vi.mocked(websiteRepository.save).mockResolvedValue(newWebsite);

      const result = await saveAsNew({
        originalWebsiteId: 'test-website-id',
        userId: 'test-user-id',
        html: beautifiedHtml,
        css: beautifiedCss,
        originalTitle: 'Test Website',
      });

      expect(result.success).toBe(true);
      expect(websiteRepository.save).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          title: 'Test Website (Beautified)',
          html: beautifiedHtml,
          css: beautifiedCss,
        }),
        'Anonymous'
      );
    });

    /**
     * Test that new website preserves metadata from original
     */
    it('should preserve original website metadata', async () => {
      const newWebsite = {
        ...mockWebsite,
        id: 'new-website-id',
        title: 'Test Website (Beautified)',
      };

      vi.mocked(websiteRepository.getById).mockResolvedValue(mockWebsite);
      vi.mocked(thumbnailService.generateThumbnail).mockResolvedValue({
        success: true,
        dataUrl: newThumbnailUrl,
      });
      vi.mocked(websiteRepository.save).mockResolvedValue(newWebsite);

      await saveAsNew({
        originalWebsiteId: 'test-website-id',
        userId: 'test-user-id',
        html: beautifiedHtml,
        css: beautifiedCss,
        originalTitle: 'Test Website',
      });

      expect(websiteRepository.save).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          inputType: mockWebsite.inputType,
          originalPrompt: mockWebsite.originalPrompt,
          isPublic: mockWebsite.isPublic,
        }),
        'Anonymous'
      );
    });

    /**
     * Test error handling when original website is not found
     */
    it('should return error when original website not found', async () => {
      vi.mocked(websiteRepository.getById).mockResolvedValue(null);

      const result = await saveAsNew({
        originalWebsiteId: 'nonexistent-id',
        userId: 'test-user-id',
        html: beautifiedHtml,
        css: beautifiedCss,
        originalTitle: 'Test Website',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Original website not found.');
      expect(websiteRepository.save).not.toHaveBeenCalled();
    });

    /**
     * Test custom creator name is passed
     */
    it('should use custom creator name when provided', async () => {
      const newWebsite = {
        ...mockWebsite,
        id: 'new-website-id',
        title: 'Test Website (Beautified)',
        creatorName: 'Custom Creator',
      };

      vi.mocked(websiteRepository.getById).mockResolvedValue(mockWebsite);
      vi.mocked(thumbnailService.generateThumbnail).mockResolvedValue({
        success: true,
        dataUrl: newThumbnailUrl,
      });
      vi.mocked(websiteRepository.save).mockResolvedValue(newWebsite);

      await saveAsNew({
        originalWebsiteId: 'test-website-id',
        userId: 'test-user-id',
        html: beautifiedHtml,
        css: beautifiedCss,
        originalTitle: 'Test Website',
        creatorName: 'Custom Creator',
      });

      expect(websiteRepository.save).toHaveBeenCalledWith(
        'test-user-id',
        expect.any(Object),
        'Custom Creator'
      );
    });

    /**
     * Test error handling for invalid inputs
     */
    it('should return error for invalid originalWebsiteId', async () => {
      const result = await saveAsNew({
        originalWebsiteId: '',
        userId: 'test-user-id',
        html: beautifiedHtml,
        css: beautifiedCss,
        originalTitle: 'Test Website',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid original website ID');
    });

    it('should return error for invalid userId', async () => {
      const result = await saveAsNew({
        originalWebsiteId: 'test-website-id',
        userId: '',
        html: beautifiedHtml,
        css: beautifiedCss,
        originalTitle: 'Test Website',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid user ID');
    });
  });
});
