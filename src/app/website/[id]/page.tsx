/**
 * Website Preview/Editor Page
 * Protected route for viewing and editing a generated website
 *
 * Requirements:
 * - 3.1: Display website in isolated iframe within 2 seconds
 * - 10.1: Provide a code editor panel with separate tabs for HTML and CSS code
 * - 10.5: Preserve user modifications when downloading the website
 * - 10.6: Auto-save modifications to the repository
 * - 10.7: Display error message if saving modifications fails
 * - 4.1: Present download format options
 * - 5.3: Initiate beautification request when Beautify button is clicked
 * - 5.5: Display BeautifyLoadingOverlay during beautification process
 * - 5.7: Display PreviewComparison on beautification completion
 * - 5.8: Show SaveOptionsDialog on accept
 *
 * This page:
 * 1. Is protected - requires authentication
 * 2. Fetches website data by ID from repository
 * 3. Displays PreviewRenderer and CodeEditor components side by side
 * 4. Allows editing HTML and CSS with live preview updates
 * 5. Auto-saves modifications to the repository
 * 6. Provides download functionality with the edited content
 * 7. Provides beautification workflow with streaming, comparison, and save options
 */

'use client';

import { useState, useEffect, useCallback, useRef, use, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ProtectedRoute, useAuth } from '@/components/auth';
import { AppHeader, AppFooter } from '@/components/layout';
import { PreviewRenderer } from '@/components/PreviewRenderer';
import { CodeEditor } from '@/components/CodeEditor';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { DownloadDialog, type DownloadFormat } from '@/components/DownloadDialog';
import {
  BeautifyButton,
  BeautifyOptionsDialog,
  BeautifyLoadingOverlay,
  PreviewComparison,
  SaveOptionsDialog,
  BeautifyErrorDisplay,
} from '@/components/beautify';
import {
  ArrowLeftIcon,
  DownloadIcon,
  CheckIcon,
  CodeIcon,
  PanelRightIcon,
  MaximizeIcon,
  MinimizeIcon,
  GlobeIcon,
} from '@/components/icons';
import websiteRepository from '@/services/websiteRepository';
import { generateSingleFile, generateZipArchive, downloadBlob } from '@/services/downloadService';
import { sanitize } from '@/services/htmlSanitizer';
import { useBeautifySave } from '@/hooks/useBeautifySave';
import { getBeautifyError } from '@/lib/beautifyErrors';
import type { GeneratedWebsite } from '@/types/website';
import type { ViewportMode } from '@/lib/constants';
import type { BeautifyDialogResult, BeautifyLoadingStage, BeautifyStreamEvent } from '@/types/beautify';
import type { BeautifyError } from '@/lib/beautifyErrors';
import { createParser } from 'eventsource-parser';

/**
 * Auto-save debounce delay in milliseconds
 * Requirement 10.6: Auto-save modifications to repository
 */
const AUTO_SAVE_DELAY = 2000;

/**
 * Page props with dynamic route parameters
 */
interface WebsitePageProps {
  params: Promise<{ id: string }>;
}

/**
 * Loading spinner component
 */
function LoadingSpinner() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm">Loading website...</p>
      </div>
    </div>
  );
}

/**
 * Not found component when website doesn't exist
 */
function WebsiteNotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 px-4">
      <div
        className="flex h-24 w-24 items-center justify-center rounded-full bg-muted"
        aria-hidden="true"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-12 w-12 text-muted-foreground"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6" />
          <path d="m9 9 6 6" />
        </svg>
      </div>

      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold text-foreground">
          Website not found
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          The website you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
        </p>
      </div>

      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className="
          inline-flex items-center justify-center gap-2
          rounded-md bg-primary px-6 py-3
          text-base font-medium text-primary-foreground
          hover:bg-primary/90
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          focus-visible:ring-offset-2 focus-visible:ring-offset-background
          transition-colors
        "
      >
        Back to Dashboard
      </button>
    </div>
  );
}

/**
 * Sanitizes a filename by removing invalid characters
 */
function sanitizeFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50) || 'website';
}

/**
 * Website preview/editor content component
 * Contains the main page content with preview and editor
 */
function WebsitePageContent({ websiteId }: { websiteId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user, getIdToken } = useAuth();

  // Website data state
  const [website, setWebsite] = useState<GeneratedWebsite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Editor state - local copies of HTML and CSS for editing
  const [editedHtml, setEditedHtml] = useState('');
  const [editedCss, setEditedCss] = useState('');
  const [activeTab, setActiveTab] = useState<'html' | 'css'>('html');

  // Preview state
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop');

  // Code panel collapse state
  const [isCodePanelCollapsed, setIsCodePanelCollapsed] = useState(false);

  // Fullscreen preview state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Save state - tracks modifications and save status
  // Requirement 10.6: Auto-save modifications to repository
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Download dialog state
  // Requirement 4.1: Present download format options
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);

  // Showcase state
  // Requirement 23.1: "Share to Showcase" toggle
  const [isShowcased, setIsShowcased] = useState(false);
  const [isTogglingShowcase, setIsTogglingShowcase] = useState(false);

  // Beautify state
  // Requirement 5.1: Display a Beautify_Button in the action toolbar
  // Requirement 5.4: Display loading spinner and be disabled while beautification is in progress
  const [isBeautifying, setIsBeautifying] = useState(false);

  // Beautify workflow state
  // Requirement 5.3: Handle beautification workflow
  const [showBeautifyOptions, setShowBeautifyOptions] = useState(false);
  const [beautifyStage, setBeautifyStage] = useState<BeautifyLoadingStage>('analyzing');
  const [beautifyStreamingContent, setBeautifyStreamingContent] = useState('');
  const [isBeautifyPreviewExpanded, setIsBeautifyPreviewExpanded] = useState(false);
  const [beautifiedHtml, setBeautifiedHtml] = useState('');
  const [beautifiedCss, setBeautifiedCss] = useState('');
  const [showPreviewComparison, setShowPreviewComparison] = useState(false);
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [beautifyError, setBeautifyError] = useState<BeautifyError | null>(null);

  // Abort controller for beautify cancellation
  const beautifyAbortControllerRef = useRef<AbortController | null>(null);

  // Refs for auto-save debouncing
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const originalHtmlRef = useRef<string>('');
  const originalCssRef = useRef<string>('');

  // Ref to track if auto-beautify from query param has been triggered
  // Requirement 6.5: Auto-trigger beautification when beautify=true parameter is present
  const autoBeautifyTriggeredRef = useRef<boolean>(false);

  /**
   * Fetch website data by ID
   */
  const fetchWebsite = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const result = await websiteRepository.getById(websiteId);

      if (!result) {
        setNotFound(true);
        return;
      }

      // Verify the user owns this website
      if (result.userId !== user.uid) {
        setNotFound(true);
        return;
      }

      setWebsite(result);
      setEditedHtml(result.html);
      setEditedCss(result.css);
      setIsShowcased(result.isShowcased);
      // Store original values to detect changes
      originalHtmlRef.current = result.html;
      originalCssRef.current = result.css;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load website';
      setError(message);
      console.error('Error fetching website:', err);
    } finally {
      setIsLoading(false);
    }
  }, [websiteId, user]);

  /**
   * Fetch website on mount and when dependencies change
   */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial data fetch is intentional
    fetchWebsite();
  }, [fetchWebsite]);

  /**
   * Save modifications to the repository
   * Requirement 10.6: Auto-save modifications to repository
   * Requirement 10.7: Display error message if saving modifications fails
   */
  const saveModifications = useCallback(async (html: string, css: string) => {
    if (!website) return;

    // Only save if there are actual changes
    if (html === originalHtmlRef.current && css === originalCssRef.current) {
      setHasUnsavedChanges(false);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await websiteRepository.update(website.id, {
        html,
        css,
      });

      // Update original values after successful save
      originalHtmlRef.current = html;
      originalCssRef.current = css;
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save modifications';
      setSaveError(message);
      console.error('Error saving modifications:', err);
    } finally {
      setIsSaving(false);
    }
  }, [website]);

  /**
   * Debounced auto-save effect
   * Triggers save after AUTO_SAVE_DELAY of inactivity
   */
  useEffect(() => {
    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Check if there are unsaved changes
    const hasChanges =
      editedHtml !== originalHtmlRef.current ||
      editedCss !== originalCssRef.current;

    if (hasChanges && website) {
      setHasUnsavedChanges(true);

      // Set up debounced auto-save
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveModifications(editedHtml, editedCss);
      }, AUTO_SAVE_DELAY);
    }

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [editedHtml, editedCss, website, saveModifications]);

  /**
   * Save before navigating away
   * Requirement 10.6: Save modifications when navigating away from the editor
   */
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // Modern browsers ignore custom messages but require returnValue
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  /**
   * Handle HTML changes from editor
   * Requirement 10.3: Update preview within 1 second (debounced in CodeEditor)
   */
  const handleHtmlChange = useCallback((html: string) => {
    setEditedHtml(html);
  }, []);

  /**
   * Handle CSS changes from editor
   * Requirement 10.3: Update preview within 1 second (debounced in CodeEditor)
   */
  const handleCssChange = useCallback((css: string) => {
    setEditedCss(css);
  }, []);

  /**
   * Handle tab change in code editor
   */
  const handleTabChange = useCallback((tab: 'html' | 'css') => {
    setActiveTab(tab);
  }, []);

  /**
   * Handle viewport mode change
   */
  const handleViewportChange = useCallback((mode: ViewportMode) => {
    setViewportMode(mode);
  }, []);

  /**
   * Handle back navigation to dashboard
   * Save any pending changes before navigating
   */
  const handleBackClick = useCallback(async () => {
    // Save any pending changes before navigating
    if (hasUnsavedChanges && website) {
      await saveModifications(editedHtml, editedCss);
    }
    router.push('/dashboard');
  }, [router, hasUnsavedChanges, website, editedHtml, editedCss, saveModifications]);

  /**
   * Handle download button click - opens the download dialog
   * Requirement 4.1: Present download format options
   */
  const handleDownloadClick = useCallback(() => {
    setShowDownloadDialog(true);
  }, []);

  /**
   * Handle closing the download dialog
   */
  const handleDownloadDialogClose = useCallback(() => {
    setShowDownloadDialog(false);
  }, []);

  /**
   * Handle showcase toggle
   * Requirement 23.1-23.3: Toggle showcase status
   */
  const handleShowcaseToggle = useCallback(async () => {
    if (!website || isTogglingShowcase) return;

    setIsTogglingShowcase(true);

    try {
      const newShowcaseStatus = !isShowcased;
      await websiteRepository.toggleShowcase(website.id, newShowcaseStatus);
      setIsShowcased(newShowcaseStatus);
    } catch (err) {
      console.error('Error toggling showcase:', err);
      // Optionally show an error message to the user
    } finally {
      setIsTogglingShowcase(false);
    }
  }, [website, isShowcased, isTogglingShowcase]);

  /**
   * Handle beautify button click - opens the BeautifyOptionsDialog
   * Requirement 5.1: Display a Beautify_Button in the action toolbar
   * Requirement 5.3: Initiate a beautification request when clicked
   * Requirement 0.1.1: Display options dialog before starting beautification
   */
  const handleBeautifyClick = useCallback(() => {
    if (!website || isBeautifying) return;
    setShowBeautifyOptions(true);
  }, [website, isBeautifying]);

  /**
   * Handle beautify options dialog confirmation
   * Starts the beautification process with streaming
   * Requirement 5.3: Handle beautification request with current HTML/CSS
   * Requirement 5.5: Show BeautifyLoadingOverlay during process
   */
  const handleBeautifyConfirm = useCallback(async (options: BeautifyDialogResult) => {
    if (!website) return;

    // Close options dialog and start beautifying
    setShowBeautifyOptions(false);
    setIsBeautifying(true);
    setBeautifyStage('analyzing');
    setBeautifyStreamingContent('');
    setBeautifyError(null);

    // Create abort controller for cancellation
    const abortController = new AbortController();
    beautifyAbortControllerRef.current = abortController;

    try {
      // Get auth token
      const token = await getIdToken();

      // Prepare request body
      const requestBody: Record<string, unknown> = {
        websiteId: website.id,
        html: editedHtml,
        css: editedCss,
      };

      // Add reference image if provided
      if (options.useReferenceImage && options.referenceImage) {
        requestBody.referenceImage = options.referenceImage;
        requestBody.referenceImageMimeType = options.referenceImageMimeType;
      }

      // Make streaming request to beautify API
      const response = await fetch('/api/beautify/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Beautification failed');
      }

      // Process the SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get stream reader');
      }

      const decoder = new TextDecoder();
      // Use wrapper object to allow mutation inside closure
      const resultRef: { value: { html: string; css: string } | null } = { value: null };

      // Create SSE parser using eventsource-parser library
      const parser = createParser({
        onEvent: (event) => {
          const eventType = event.event;
          const eventData = event.data;

          if (!eventType || !eventData) return;

          try {
            const data: BeautifyStreamEvent = JSON.parse(eventData);

            switch (eventType) {
              case 'start':
                setBeautifyStage('analyzing');
                break;
              case 'mode':
                // Update stage based on mode
                if (data.mode === 'complete') {
                  setBeautifyStage('completing');
                } else {
                  setBeautifyStage('enhancing');
                }
                break;
              case 'text':
                if (data.content) {
                  setBeautifyStreamingContent((prev) => prev + data.content);
                  // Update stage based on content
                  if (data.content.includes('```css')) {
                    setBeautifyStage('finalizing');
                  }
                }
                break;
              case 'done':
                if (data.result) {
                  resultRef.value = data.result;
                }
                break;
              case 'error':
                throw new Error(data.error || 'Beautification failed');
            }
          } catch (e) {
            if (!(e instanceof SyntaxError)) {
              throw e;
            }
          }
        },
      });

      // Read and parse the stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Consume any remaining buffered data
          parser.reset({ consume: true });
          break;
        }

        parser.feed(decoder.decode(value, { stream: true }));
      }

      if (!resultRef.value) {
        throw new Error('No result received from stream');
      }

      // Success - store beautified content and show comparison
      setBeautifiedHtml(resultRef.value.html);
      setBeautifiedCss(resultRef.value.css);
      setIsBeautifying(false);
      setShowPreviewComparison(true);
    } catch (err) {
      // Handle cancellation
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled - reset state silently
        setIsBeautifying(false);
        setBeautifyStreamingContent('');
        return;
      }

      // Show error to user
      const beautifyErr = getBeautifyError(err instanceof Error ? err : String(err));
      setBeautifyError(beautifyErr);
      setIsBeautifying(false);
    } finally {
      beautifyAbortControllerRef.current = null;
    }
  }, [website, editedHtml, editedCss, getIdToken]);

  /**
   * Handle beautify cancellation
   * Requirement 9.4: Provide cancel button to abort beautification
   * Requirement 9.5: Abort ongoing API request within 5 seconds
   */
  const handleBeautifyCancel = useCallback(() => {
    if (beautifyAbortControllerRef.current) {
      beautifyAbortControllerRef.current.abort();
      beautifyAbortControllerRef.current = null;
    }
    setIsBeautifying(false);
    setBeautifyStreamingContent('');
  }, []);

  /**
   * Handle preview comparison accept
   * Requirement 7.5: Display "Accept Changes" button that applies beautified version
   * Requirement 7.7: Update code editor with beautified HTML and CSS
   */
  const handlePreviewAccept = useCallback(() => {
    setShowPreviewComparison(false);
    setShowSaveOptions(true);
  }, []);

  /**
   * Handle preview comparison reject
   * Requirement 7.6: Display "Reject Changes" button that discards beautified version
   * Requirement 7.9: Preserve original HTML/CSS on reject
   */
  const handlePreviewReject = useCallback(() => {
    setShowPreviewComparison(false);
    // Reset beautified content
    setBeautifiedHtml('');
    setBeautifiedCss('');
  }, []);

  /**
   * Handle save dialog close (revert to original)
   */
  const handleSaveOptionsClose = useCallback(() => {
    setShowSaveOptions(false);
    // Reset beautified content
    setBeautifiedHtml('');
    setBeautifiedCss('');
  }, []);

  /**
   * Handle beautify error retry
   * Requirement 10.6: Provide "Try Again" button
   */
  const handleBeautifyRetry = useCallback(() => {
    setBeautifyError(null);
    setShowBeautifyOptions(true);
  }, []);

  /**
   * Handle beautify error dismiss
   * Requirement 10.7: Provide "Dismiss" button to return to normal preview mode
   */
  const handleBeautifyErrorDismiss = useCallback(() => {
    setBeautifyError(null);
  }, []);

  /**
   * Handle when original website is updated after "Replace Original"
   * This updates the local editor state with the beautified content
   */
  const handleOriginalUpdated = useCallback((html: string, css: string) => {
    setEditedHtml(html);
    setEditedCss(css);
    originalHtmlRef.current = html;
    originalCssRef.current = css;
    setHasUnsavedChanges(false);
    setLastSaved(new Date());
    // Reset beautified content
    setBeautifiedHtml('');
    setBeautifiedCss('');
  }, []);

  /**
   * useBeautifySave hook - provides save handlers for beautified content
   * Requirements 8.3, 8.4, 8.5, 8.6
   */
  const { handleReplaceOriginal, handleSaveAsNew } = useBeautifySave({
    originalWebsite: website!,
    beautifiedHtml,
    beautifiedCss,
    onSuccess: () => {
      setShowSaveOptions(false);
    },
    onOriginalUpdated: handleOriginalUpdated,
  });

  /**
   * Handle beautify=true query parameter
   * Requirement 6.5: Auto-trigger beautification when beautify=true parameter is present
   *
   * When the preview page receives the beautify=true parameter (from WebsiteCard navigation),
   * automatically initiate beautification after the website loads.
   * Clear the query parameter from URL after triggering to prevent re-triggering on refresh.
   */
  useEffect(() => {
    // Check if beautify=true parameter is present
    const shouldBeautify = searchParams.get('beautify') === 'true';

    // Only trigger if:
    // 1. beautify=true is in the URL
    // 2. Website has loaded (not loading anymore)
    // 3. Website data exists
    // 4. We haven't already triggered auto-beautify
    // 5. Not currently beautifying
    if (
      shouldBeautify &&
      !isLoading &&
      website &&
      !autoBeautifyTriggeredRef.current &&
      !isBeautifying
    ) {
      // Mark as triggered to prevent re-triggering
      autoBeautifyTriggeredRef.current = true;

      // Clear the beautify parameter from URL to prevent re-triggering on refresh
      // Use router.replace to avoid adding to browser history
      router.replace(pathname, { scroll: false });

      // Trigger beautification after a short delay to ensure UI is stable
      // This gives the page time to fully render before opening the dialog
      setTimeout(() => {
        handleBeautifyClick();
      }, 100);
    }
  }, [searchParams, pathname, router, isLoading, website, isBeautifying, handleBeautifyClick]);

  /**
   * Handle download format selection
   * Requirement 10.5: Preserve user modifications when downloading
   * Uses the edited HTML and CSS, not the original
   */
  const handleDownload = useCallback(async (format: DownloadFormat) => {
    if (!website) return;

    const title = website.title;
    const filename = sanitizeFilename(title);

    try {
      if (format === 'single') {
        // Requirement 4.2: Generate downloadable HTML file with CSS embedded
        const blob = await generateSingleFile(editedHtml, editedCss, title);
        downloadBlob(blob, `${filename}.html`);
      } else {
        // Requirement 4.3: Generate downloadable ZIP archive
        const blob = await generateZipArchive(editedHtml, editedCss, title);
        downloadBlob(blob, `${filename}.zip`);
      }
    } catch (err) {
      console.error('Download error:', err);
      throw err; // Re-throw so DownloadDialog can handle it
    }
  }, [website, editedHtml, editedCss]);

  // Show loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 px-4">
        <div className="w-full max-w-md">
          <ErrorMessage
            message={error}
            onDismiss={() => setError(null)}
            onRetry={fetchWebsite}
          />
        </div>
        <p className="text-muted-foreground text-sm text-center mt-2">
          There was a problem loading the website. Please try again.
        </p>
      </div>
    );
  }

  // Show not found state
  if (notFound || !website) {
    return <WebsiteNotFound />;
  }

  // Render preview and editor layout
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Page header with website title, save status, and actions */}
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3 shrink-0 relative z-20 min-h-[60px]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackClick}
            className="
              inline-flex items-center justify-center
              rounded-md p-2
              text-muted-foreground
              hover:bg-accent hover:text-accent-foreground
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              transition-colors
            "
            aria-label="Back to dashboard"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-foreground line-clamp-1">
              {website.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Created {new Date(website.createdAt).toLocaleDateString()}</span>
              {/* Save status indicator */}
              {isSaving && (
                <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
                  Saving...
                </span>
              )}
              {!isSaving && hasUnsavedChanges && (
                <span className="text-yellow-600 dark:text-yellow-500">
                  Unsaved changes
                </span>
              )}
              {!isSaving && !hasUnsavedChanges && lastSaved && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-500">
                  <CheckIcon className="h-3 w-3" />
                  Saved
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Save error notification */}
          {saveError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
              <span>Save failed</span>
              <button
                type="button"
                onClick={() => saveModifications(editedHtml, editedCss)}
                className="font-medium underline hover:no-underline"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => setSaveError(null)}
                className="ml-1 text-destructive/70 hover:text-destructive"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          {/* Showcase toggle button */}
          <button
            type="button"
            onClick={handleShowcaseToggle}
            disabled={isTogglingShowcase}
            className={`
              inline-flex items-center justify-center gap-2
              rounded-md px-3 py-2
              text-sm font-medium
              border
              transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              focus-visible:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isShowcased
                ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                : 'bg-muted border-border text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }
            `}
            title={isShowcased ? 'Remove from showcase' : 'Share to showcase'}
          >
            {isTogglingShowcase ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <GlobeIcon className="h-4 w-4" />
            )}
            {isShowcased ? 'Shared' : 'Share'}
          </button>

          {/* Preview button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="
              inline-flex items-center justify-center gap-2
              rounded-md bg-muted px-4 py-2
              text-sm font-medium text-foreground
              hover:bg-muted/80
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              focus-visible:ring-offset-2
              transition-colors
            "
          >
            <MaximizeIcon className="h-4 w-4" />
            Preview
          </button>

          {/* Beautify button */}
          {/* Requirement 5.1: Display BeautifyButton in action toolbar alongside existing buttons */}
          {/* Requirement 5.2: Display sparkle/wand icon to indicate enhancement functionality */}
          {/* Requirement 5.3: Initiate beautification request when clicked */}
          {/* Requirement 5.4: Display loading spinner and be disabled while in progress */}
          <BeautifyButton
            onClick={handleBeautifyClick}
            isLoading={isBeautifying}
            disabled={!website || hasUnsavedChanges}
            variant="secondary"
          />

          {/* Download button */}
          <button
            type="button"
            onClick={handleDownloadClick}
            className="
              inline-flex items-center justify-center gap-2
              rounded-md bg-primary px-4 py-2
              text-sm font-medium text-primary-foreground
              hover:bg-primary/90
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              focus-visible:ring-offset-2
              transition-colors
            "
          >
            <DownloadIcon className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>

      {/* Main content area with preview and editor */}
      <div className="flex flex-1 overflow-hidden">
        {/* Preview panel - left side */}
        <div className="flex-1 border-r border-border">
          <PreviewRenderer
            html={editedHtml}
            css={editedCss}
            viewportMode={viewportMode}
            onViewportChange={handleViewportChange}
          />
        </div>

        {/* Code panel toggle button (visible when collapsed) */}
        {isCodePanelCollapsed && (
          <button
            type="button"
            onClick={() => setIsCodePanelCollapsed(false)}
            className="
              flex items-center justify-center
              w-10 bg-muted/50 border-l border-border
              hover:bg-muted
              transition-colors
            "
            aria-label="Expand code panel"
            title="Show code editor"
          >
            <div className="flex flex-col items-center gap-2">
              <CodeIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground [writing-mode:vertical-rl] rotate-180">
                Code
              </span>
            </div>
          </button>
        )}

        {/* Code editor panel - right side (collapsible) */}
        <div
          className={`
            flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden
            ${isCodePanelCollapsed ? 'w-0' : 'w-[500px] min-w-[400px] max-w-[600px]'}
          `}
        >
          <div className="h-full w-[500px] flex flex-col">
            {/* Panel header with collapse button */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <CodeIcon className="h-4 w-4" />
                Code Editor
              </span>
              <button
                type="button"
                onClick={() => setIsCodePanelCollapsed(true)}
                className="
                  p-1.5 rounded-md
                  text-muted-foreground hover:text-foreground
                  hover:bg-muted
                  transition-colors
                "
                aria-label="Collapse code panel"
                title="Hide code editor"
              >
                <PanelRightIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Code editor */}
            <div className="flex-1 overflow-hidden">
              <CodeEditor
                html={editedHtml}
                css={editedCss}
                onHtmlChange={handleHtmlChange}
                onCssChange={handleCssChange}
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen preview modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-[100] bg-background"
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen preview"
        >
          {/* Fullscreen header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-background border-b border-border">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="
                  inline-flex items-center justify-center
                  rounded-md p-2
                  text-muted-foreground
                  hover:bg-accent hover:text-accent-foreground
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  transition-colors
                "
                aria-label="Exit fullscreen preview"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {website.title}
                </h2>
                <span className="text-xs text-muted-foreground">
                  Fullscreen Preview
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="
                inline-flex items-center justify-center gap-2
                px-4 py-2 rounded-md
                text-sm font-medium
                bg-primary text-primary-foreground
                hover:bg-primary/90
                transition-colors
              "
            >
              <MinimizeIcon className="h-4 w-4" />
              Exit Fullscreen
            </button>
          </div>

          {/* Fullscreen iframe */}
          <iframe
            srcDoc={`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${editedCss}</style>
</head>
<body>${sanitize(editedHtml)}</body>
</html>`}
            className="w-full h-full pt-14"
            sandbox="allow-same-origin"
            title="Fullscreen website preview"
          />
        </div>
      )}

      {/* Download dialog */}
      <DownloadDialog
        isOpen={showDownloadDialog}
        onClose={handleDownloadDialogClose}
        onDownload={handleDownload}
        websiteTitle={website.title}
      />

      {/* Beautify Options Dialog */}
      {/* Requirement 0.1.1: Display options dialog before starting beautification */}
      <BeautifyOptionsDialog
        isOpen={showBeautifyOptions}
        onClose={() => setShowBeautifyOptions(false)}
        onConfirm={handleBeautifyConfirm}
      />

      {/* Beautify Loading Overlay */}
      {/* Requirement 5.5: Display loading overlay with status messages during beautification */}
      {/* Requirement 5.6: Show the detected Beautification_Mode */}
      <BeautifyLoadingOverlay
        stage={beautifyStage}
        isVisible={isBeautifying}
        streamingContent={beautifyStreamingContent}
        isPreviewExpanded={isBeautifyPreviewExpanded}
        onTogglePreview={() => setIsBeautifyPreviewExpanded(!isBeautifyPreviewExpanded)}
        onCancel={handleBeautifyCancel}
      />

      {/* Preview Comparison */}
      {/* Requirement 5.7: Display PreviewComparison on beautification completion */}
      {showPreviewComparison && (
        <div
          className="fixed inset-0 z-50 bg-background"
          role="dialog"
          aria-modal="true"
          aria-label="Compare original and beautified versions"
        >
          <PreviewComparison
            originalHtml={editedHtml}
            originalCss={editedCss}
            beautifiedHtml={beautifiedHtml}
            beautifiedCss={beautifiedCss}
            onAccept={handlePreviewAccept}
            onReject={handlePreviewReject}
          />
        </div>
      )}

      {/* Save Options Dialog */}
      {/* Requirement 5.8: Show SaveOptionsDialog on accept */}
      <SaveOptionsDialog
        isOpen={showSaveOptions}
        originalTitle={website.title}
        onClose={handleSaveOptionsClose}
        onReplaceOriginal={handleReplaceOriginal}
        onSaveAsNew={handleSaveAsNew}
      />

      {/* Beautify Error Display */}
      {/* Requirements 10.1-10.7: Display error messages with recovery options */}
      {beautifyError && (
        <BeautifyErrorDisplay
          error={beautifyError}
          onRetry={handleBeautifyRetry}
          onDismiss={handleBeautifyErrorDismiss}
        />
      )}
    </div>
  );
}

/**
 * Website preview/editor page component
 * Protected route that displays website preview and code editor
 */
export default function WebsitePage({ params }: WebsitePageProps) {
  // In Next.js 16, params is a Promise that needs to be unwrapped
  const resolvedParams = use(params);
  const websiteId = resolvedParams.id;

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-primary/5">
        {/* Decorative background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        </div>

        {/* Header with user profile */}
        <AppHeader />

        {/* Main content */}
        <main className="flex-1 relative z-10">
          {/* Suspense boundary required for useSearchParams hook */}
          {/* Requirement 6.5: Handle beautify=true query parameter */}
          <Suspense fallback={<LoadingSpinner />}>
            <WebsitePageContent websiteId={websiteId} />
          </Suspense>
        </main>

        {/* Footer */}
        <AppFooter />
      </div>
    </ProtectedRoute>
  );
}
