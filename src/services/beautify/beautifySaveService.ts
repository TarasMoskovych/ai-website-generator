/**
 * Beautify Save Service
 *
 * This module provides the save operations for beautified websites.
 * It handles both "Replace Original" and "Save as New" scenarios.
 *
 * Validates: Requirements 8.3, 8.4, 8.5
 *
 * @description Implements save operations for beautified content with
 * atomic updates and proper error handling.
 */

import { update as updateWebsite, save as saveWebsite, getById } from '@/services/websiteRepository';
import { generateThumbnail, getPlaceholderThumbnail } from '@/services/thumbnailService';
import type { UpdateWebsiteData, CreateWebsiteData, GeneratedWebsite } from '@/types/website';

/**
 * Result of a save operation
 */
export interface SaveResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Error message if operation failed */
  error?: string;
  /** The saved/updated website data (if successful) */
  website?: GeneratedWebsite;
}

/**
 * Options for the replace original operation
 */
export interface ReplaceOriginalOptions {
  /** Website document ID to update */
  websiteId: string;
  /** Beautified HTML content */
  html: string;
  /** Beautified CSS content */
  css: string;
}

/**
 * Options for the save as new operation
 */
export interface SaveAsNewOptions {
  /** Original website document ID (to copy metadata from) */
  originalWebsiteId: string;
  /** User ID for the new website */
  userId: string;
  /** Beautified HTML content */
  html: string;
  /** Beautified CSS content */
  css: string;
  /** Original title (will have " (Beautified)" appended) */
  originalTitle: string;
  /** Creator name for the new website */
  creatorName?: string;
}

/**
 * Generates a thumbnail for the given HTML/CSS content.
 * Falls back to placeholder if generation fails.
 *
 * @param html - HTML content
 * @param css - CSS content
 * @returns Promise resolving to the thumbnail data URL
 */
async function generateThumbnailSafe(html: string, css: string): Promise<string> {
  try {
    const result = await generateThumbnail(html, css);
    return result.success ? result.dataUrl : getPlaceholderThumbnail();
  } catch {
    return getPlaceholderThumbnail();
  }
}

/**
 * Replaces the original website with beautified content.
 *
 * This function performs an atomic update operation:
 * 1. Generates a new thumbnail from the beautified content
 * 2. Updates the existing website document with beautified HTML/CSS and new thumbnail
 *
 * Validates: Requirement 8.3 - Update existing website document when "Replace Original" is selected
 *
 * @param options - Replace original options including websiteId, html, and css
 * @returns Promise resolving to SaveResult with success/error state
 *
 * @example
 * ```typescript
 * const result = await replaceOriginal({
 *   websiteId: 'abc123',
 *   html: '<html>...</html>',
 *   css: 'body { ... }',
 * });
 *
 * if (result.success) {
 *   console.log('Website updated successfully');
 * } else {
 *   console.error('Failed to update:', result.error);
 * }
 * ```
 */
export async function replaceOriginal(options: ReplaceOriginalOptions): Promise<SaveResult> {
  const { websiteId, html, css } = options;

  try {
    // Validate inputs
    if (!websiteId || typeof websiteId !== 'string') {
      return {
        success: false,
        error: 'Invalid website ID',
      };
    }

    if (!html || typeof html !== 'string') {
      return {
        success: false,
        error: 'Invalid HTML content',
      };
    }

    if (!css || typeof css !== 'string') {
      return {
        success: false,
        error: 'Invalid CSS content',
      };
    }

    // Generate new thumbnail from beautified content
    const thumbnailUrl = await generateThumbnailSafe(html, css);

    // Prepare update data (atomic update)
    const updateData: UpdateWebsiteData = {
      html,
      css,
      thumbnailUrl,
    };

    // Update the website document in Firestore
    await updateWebsite(websiteId, updateData);

    // Fetch the updated website to return
    const updatedWebsite = await getById(websiteId);

    if (!updatedWebsite) {
      return {
        success: false,
        error: 'Failed to retrieve updated website',
      };
    }

    return {
      success: true,
      website: updatedWebsite,
    };
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      // Check for not found error
      if (error.message.includes('not found')) {
        return {
          success: false,
          error: 'Website not found. It may have been deleted.',
        };
      }

      // Check for permission error
      if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        return {
          success: false,
          error: 'You do not have permission to update this website.',
        };
      }

      return {
        success: false,
        error: `Failed to save changes: ${error.message}`,
      };
    }

    return {
      success: false,
      error: 'Failed to save changes. Please try again.',
    };
  }
}

/**
 * Saves the beautified content as a new website.
 *
 * This function creates a new website document:
 * 1. Copies relevant metadata from the original website
 * 2. Generates a new thumbnail from the beautified content
 * 3. Creates a new website document with title suffixed by " (Beautified)"
 *
 * Validates: Requirement 8.4, 8.5 - Create new website document when "Save as New" is selected
 *
 * @param options - Save as new options
 * @returns Promise resolving to SaveResult with success/error state and new website data
 *
 * @example
 * ```typescript
 * const result = await saveAsNew({
 *   originalWebsiteId: 'abc123',
 *   userId: 'user456',
 *   html: '<html>...</html>',
 *   css: 'body { ... }',
 *   originalTitle: 'My Website',
 * });
 *
 * if (result.success && result.website) {
 *   console.log('New website ID:', result.website.id);
 *   // Navigate to new website
 * }
 * ```
 */
export async function saveAsNew(options: SaveAsNewOptions): Promise<SaveResult> {
  const { originalWebsiteId, userId, html, css, originalTitle, creatorName = 'Anonymous' } = options;

  try {
    // Validate inputs
    if (!originalWebsiteId || typeof originalWebsiteId !== 'string') {
      return {
        success: false,
        error: 'Invalid original website ID',
      };
    }

    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        error: 'Invalid user ID',
      };
    }

    if (!html || typeof html !== 'string') {
      return {
        success: false,
        error: 'Invalid HTML content',
      };
    }

    if (!css || typeof css !== 'string') {
      return {
        success: false,
        error: 'Invalid CSS content',
      };
    }

    // Fetch original website to copy metadata
    const originalWebsite = await getById(originalWebsiteId);

    if (!originalWebsite) {
      return {
        success: false,
        error: 'Original website not found.',
      };
    }

    // Generate new thumbnail from beautified content
    const thumbnailUrl = await generateThumbnailSafe(html, css);

    // Create new title with " (Beautified)" suffix
    // Validates: Requirement 8.5
    const newTitle = `${originalTitle} (Beautified)`;

    // Prepare new website data
    const createData: CreateWebsiteData = {
      title: newTitle,
      html,
      css,
      thumbnailUrl,
      inputType: originalWebsite.inputType,
      originalPrompt: originalWebsite.originalPrompt,
      isPublic: originalWebsite.isPublic,
    };

    // Save the new website document
    const newWebsite = await saveWebsite(userId, createData, creatorName);

    return {
      success: true,
      website: newWebsite,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: `Failed to create new website: ${error.message}`,
      };
    }

    return {
      success: false,
      error: 'Failed to create new website. Please try again.',
    };
  }
}

/**
 * BeautifySaveService interface for dependency injection
 */
export interface BeautifySaveService {
  replaceOriginal: typeof replaceOriginal;
  saveAsNew: typeof saveAsNew;
}

/**
 * Default BeautifySaveService implementation
 */
export const beautifySaveService: BeautifySaveService = {
  replaceOriginal,
  saveAsNew,
};

export default beautifySaveService;
