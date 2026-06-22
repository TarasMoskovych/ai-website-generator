/**
 * useBeautifySave Hook
 * Provides save handlers for beautified website content
 *
 * Requirements:
 * - 8.3: Update existing website document when "Replace Original" is selected
 * - 8.4: Create new website document with beautified content when "Save as New" is selected
 * - 8.5: Append " (Beautified)" to title when "Save as New" is selected
 * - 8.6: Navigate to newly created website's preview page after "Save as New"
 * - 8.7: Display success confirmation message when save completes
 * - 8.8: Display error message and allow retry if save fails
 *
 * This hook provides:
 * 1. handleReplaceOriginal - Updates the existing website with beautified content
 * 2. handleSaveAsNew - Creates a new website with beautified content and " (Beautified)" suffix
 * 3. Handles thumbnail regeneration for saved websites
 * 4. Provides error handling with retry capability
 */

'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth';
import { save as saveWebsite, update as updateWebsite } from '@/services/websiteRepository';
import { generateThumbnail, getPlaceholderThumbnail } from '@/services/thumbnailService';
import type { CreateWebsiteData, GeneratedWebsite } from '@/types/website';

/**
 * Options for the useBeautifySave hook
 */
export interface UseBeautifySaveOptions {
  /** The original website being beautified (can be null while loading) */
  originalWebsite: GeneratedWebsite | null;
  /** The beautified HTML content */
  beautifiedHtml: string;
  /** The beautified CSS content */
  beautifiedCss: string;
  /** Callback when save completes successfully (before navigation for Save as New) */
  onSuccess?: () => void;
  /** Callback when the original website is updated (for Replace Original) */
  onOriginalUpdated?: (html: string, css: string) => void;
}

/**
 * Return type for the useBeautifySave hook
 */
export interface UseBeautifySaveReturn {
  /**
   * Handler for "Replace Original" option
   * Updates the existing website document with beautified HTML, CSS, and regenerated thumbnail
   * Requirement 8.3
   */
  handleReplaceOriginal: () => Promise<void>;

  /**
   * Handler for "Save as New" option
   * Creates a new website document with beautified content and " (Beautified)" suffix
   * Requirements 8.4, 8.5, 8.6
   */
  handleSaveAsNew: () => Promise<void>;
}

/**
 * Suffix appended to website titles when saving as new
 * Requirement 8.5: Append " (Beautified)" to title when "Save as New" is selected
 */
export const BEAUTIFIED_TITLE_SUFFIX = ' (Beautified)';

/**
 * Creates the beautified title by appending the suffix to the original title
 * Requirement 8.5
 *
 * @param originalTitle - The original website title
 * @returns The title with " (Beautified)" appended
 */
export function createBeautifiedTitle(originalTitle: string): string {
  return `${originalTitle}${BEAUTIFIED_TITLE_SUFFIX}`;
}

/**
 * Hook providing save handlers for beautified website content
 *
 * @param options - Configuration options for the hook
 * @returns Object with handleReplaceOriginal and handleSaveAsNew functions
 *
 * @example
 * ```tsx
 * const { handleReplaceOriginal, handleSaveAsNew } = useBeautifySave({
 *   originalWebsite: website,
 *   beautifiedHtml,
 *   beautifiedCss,
 *   onSuccess: () => setShowSaveDialog(false),
 * });
 *
 * <SaveOptionsDialog
 *   isOpen={showSaveDialog}
 *   originalTitle={website.title}
 *   onClose={handleClose}
 *   onReplaceOriginal={handleReplaceOriginal}
 *   onSaveAsNew={handleSaveAsNew}
 * />
 * ```
 */
export function useBeautifySave({
  originalWebsite,
  beautifiedHtml,
  beautifiedCss,
  onSuccess,
  onOriginalUpdated,
}: UseBeautifySaveOptions): UseBeautifySaveReturn {
  const router = useRouter();
  const { user } = useAuth();

  /**
   * Generates a thumbnail for the beautified website
   * Falls back to placeholder if generation fails
   */
  const generateThumbnailForContent = useCallback(
    async (html: string, css: string): Promise<string> => {
      try {
        const result = await generateThumbnail(html, css);
        return result.success ? result.dataUrl : getPlaceholderThumbnail();
      } catch {
        // Use placeholder if thumbnail generation fails
        return getPlaceholderThumbnail();
      }
    },
    []
  );

  /**
   * Handler for "Replace Original" option
   * Requirement 8.3: Update existing website document with beautified HTML, CSS, and regenerated thumbnail
   */
  const handleReplaceOriginal = useCallback(async (): Promise<void> => {
    // Guard against null website
    if (!originalWebsite) {
      throw new Error('Website not loaded');
    }

    // Generate new thumbnail for beautified content
    const thumbnailUrl = await generateThumbnailForContent(beautifiedHtml, beautifiedCss);

    // Update the existing website document
    await updateWebsite(originalWebsite.id, {
      html: beautifiedHtml,
      css: beautifiedCss,
      thumbnailUrl,
    });

    // Call callback to update local state if provided
    if (onOriginalUpdated) {
      onOriginalUpdated(beautifiedHtml, beautifiedCss);
    }

    // Call success callback
    if (onSuccess) {
      onSuccess();
    }
  }, [
    originalWebsite,
    beautifiedHtml,
    beautifiedCss,
    generateThumbnailForContent,
    onSuccess,
    onOriginalUpdated,
  ]);

  /**
   * Handler for "Save as New" option
   * Requirements:
   * - 8.4: Create new website document with beautified content
   * - 8.5: Append " (Beautified)" to original title
   * - 8.6: Navigate to newly created website's preview page
   */
  const handleSaveAsNew = useCallback(async (): Promise<void> => {
    // Verify user is authenticated
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Guard against null website
    if (!originalWebsite) {
      throw new Error('Website not loaded');
    }

    // Generate new thumbnail for beautified content
    const thumbnailUrl = await generateThumbnailForContent(beautifiedHtml, beautifiedCss);

    // Create title with " (Beautified)" suffix
    // Requirement 8.5
    const newTitle = createBeautifiedTitle(originalWebsite.title);

    // Prepare website data for the new document
    const websiteData: CreateWebsiteData = {
      title: newTitle,
      html: beautifiedHtml,
      css: beautifiedCss,
      thumbnailUrl,
      inputType: originalWebsite.inputType,
      originalPrompt: originalWebsite.originalPrompt,
      isPublic: originalWebsite.isPublic,
    };

    // Save to Firestore with creator name
    // Requirement 8.4: Create new website document
    const savedWebsite = await saveWebsite(
      user.uid,
      websiteData,
      user.displayName || 'Anonymous'
    );

    // Call success callback
    if (onSuccess) {
      onSuccess();
    }

    // Navigate to the newly created website's preview page
    // Requirement 8.6
    router.push(`/website/${savedWebsite.id}`);
  }, [
    user,
    originalWebsite,
    beautifiedHtml,
    beautifiedCss,
    generateThumbnailForContent,
    onSuccess,
    router,
  ]);

  return {
    handleReplaceOriginal,
    handleSaveAsNew,
  };
}

export default useBeautifySave;
