/**
 * WebsitePageContent - Client component for the Website Preview/Editor page
 * Contains all interactive logic: auth check, data fetching, code editing,
 * live preview, beautification, download, and auto-save.
 *
 * Requirements: 3.4, 3.5, 5.4
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ProtectedRoute, useAuth } from '@/components/auth';
import { AppHeader, AppFooter } from '@/components/layout';
import { PreviewRenderer } from '@/components/PreviewRenderer';
import { CodeEditor } from '@/components/CodeEditor';
import { ErrorMessage, LoadingSpinner, WebsiteNotFound } from '@/components/common';
import { DownloadDialog, type DownloadFormat } from '@/components/DownloadDialog';
import {
  BeautifyButton, BeautifyOptionsDialog, BeautifyLoadingOverlay,
  PreviewComparison, SaveOptionsDialog, BeautifyErrorDisplay,
} from '@/components/beautify';
import {
  ArrowLeftIcon, DownloadIcon, CheckIcon, CodeIcon,
  PanelRightIcon, MaximizeIcon, MinimizeIcon, GlobeIcon,
} from '@/components/icons';
import websiteRepository from '@/services/websiteRepository';
import { generateSingleFile, generateZipArchive, downloadBlob } from '@/services/downloadService';
import { sanitize } from '@/services/htmlSanitizer';
import { useBeautifySave } from '@/hooks/useBeautifySave';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useBeautifyWorkflow } from '@/hooks/useBeautifyWorkflow';
import { sanitizeFilename } from '@/utils/filename';
import type { GeneratedWebsite } from '@/types/website';
import type { ViewportMode } from '@/lib/constants';

const AUTO_SAVE_DELAY = 2000;

interface WebsitePageContentProps {
  websiteId: string;
}

function WebsitePageInner({ websiteId }: WebsitePageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user } = useAuth();

  const [website, setWebsite] = useState<GeneratedWebsite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editedHtml, setEditedHtml] = useState('');
  const [editedCss, setEditedCss] = useState('');
  const [activeTab, setActiveTab] = useState<'html' | 'css'>('html');
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop');
  const [isCodePanelCollapsed, setIsCodePanelCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [isShowcased, setIsShowcased] = useState(false);
  const [isTogglingShowcase, setIsTogglingShowcase] = useState(false);

  const [originalHtml, setOriginalHtml] = useState('');
  const [originalCss, setOriginalCss] = useState('');
  const autoBeautifyTriggeredRef = useRef(false);

  const fetchWebsite = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const result = await websiteRepository.getById(websiteId);
      if (!result || result.userId !== user.uid) {
        setNotFound(true);
        return;
      }
      setWebsite(result);
      setEditedHtml(result.html);
      setEditedCss(result.css);
      setIsShowcased(result.isShowcased);
      setOriginalHtml(result.html);
      setOriginalCss(result.css);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load website');
    } finally {
      setIsLoading(false);
    }
  }, [websiteId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Data fetching requires state updates
    void fetchWebsite();
  }, [fetchWebsite]);

  const handleSaveModifications = useCallback(async (values: { html: string; css: string }) => {
    if (!website) return;
    await websiteRepository.update(website.id, values);
    setOriginalHtml(values.html);
    setOriginalCss(values.css);
  }, [website]);

  const { hasUnsavedChanges, isSaving, saveError, lastSaved, save: saveModifications } = useAutoSave({
    currentValues: { html: editedHtml, css: editedCss },
    originalValues: { html: originalHtml, css: originalCss },
    onSave: handleSaveModifications,
    delay: AUTO_SAVE_DELAY,
  });

  const beautify = useBeautifyWorkflow({
    websiteId,
    currentHtml: editedHtml,
    currentCss: editedCss,
    originalPrompt: website?.originalPrompt ?? null,
  });

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleBackClick = useCallback(async () => {
    if (hasUnsavedChanges && website) await saveModifications();
    router.push('/dashboard');
  }, [router, hasUnsavedChanges, website, saveModifications]);

  const handleShowcaseToggle = useCallback(async () => {
    if (!website || isTogglingShowcase) return;
    setIsTogglingShowcase(true);
    try {
      const newStatus = !isShowcased;
      await websiteRepository.toggleShowcase(website.id, newStatus);
      setIsShowcased(newStatus);
    } catch (err) {
      console.error('Error toggling showcase:', err);
    } finally {
      setIsTogglingShowcase(false);
    }
  }, [website, isShowcased, isTogglingShowcase]);

  const handleBeautifyClick = useCallback(() => {
    if (website && !beautify.isBeautifying) beautify.openOptionsDialog();
  }, [website, beautify]);

  const handleOriginalUpdated = useCallback((html: string, css: string) => {
    setEditedHtml(html);
    setEditedCss(css);
    setOriginalHtml(html);
    setOriginalCss(css);
  }, []);

  const { handleReplaceOriginal, handleSaveAsNew } = useBeautifySave({
    originalWebsite: website!,
    beautifiedHtml: beautify.beautifiedHtml,
    beautifiedCss: beautify.beautifiedCss,
    onSuccess: () => beautify.handleDismiss(),
    onOriginalUpdated: handleOriginalUpdated,
  });

  useEffect(() => {
    if (searchParams.get('beautify') === 'true' && !isLoading && website && !autoBeautifyTriggeredRef.current && !beautify.isBeautifying) {
      autoBeautifyTriggeredRef.current = true;
      router.replace(pathname, { scroll: false });
      setTimeout(handleBeautifyClick, 100);
    }
  }, [searchParams, pathname, router, isLoading, website, beautify.isBeautifying, handleBeautifyClick]);

  const handleDownload = useCallback(async (format: DownloadFormat) => {
    if (!website) return;
    const filename = sanitizeFilename(website.title);
    const blob = format === 'single'
      ? await generateSingleFile(editedHtml, editedCss, website.title)
      : await generateZipArchive(editedHtml, editedCss, website.title);
    downloadBlob(blob, `${filename}.${format === 'single' ? 'html' : 'zip'}`);
  }, [website, editedHtml, editedCss]);

  if (isLoading) return <LoadingSpinner message="Loading website..." />;
  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 px-4">
        <div className="w-full max-w-md">
          <ErrorMessage message={error} onDismiss={() => setError(null)} onRetry={fetchWebsite} />
        </div>
      </div>
    );
  }
  if (notFound || !website) return <WebsiteNotFound />;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3 shrink-0 relative z-20 min-h-[60px]">
        <div className="flex items-center gap-3">
          <button type="button" onClick={handleBackClick} className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors" aria-label="Back to dashboard">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-foreground line-clamp-1">{website.title}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Created {new Date(website.createdAt).toLocaleDateString()}</span>
              {isSaving && <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500"><span className="h-2 w-2 animate-pulse rounded-full bg-current" />Saving...</span>}
              {!isSaving && hasUnsavedChanges && <span className="text-yellow-600 dark:text-yellow-500">Unsaved changes</span>}
              {!isSaving && !hasUnsavedChanges && lastSaved && <span className="flex items-center gap-1 text-green-600 dark:text-green-500"><CheckIcon className="h-3 w-3" />Saved</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
              <span>Save failed</span>
              <button type="button" onClick={() => saveModifications()} className="font-medium underline hover:no-underline">Retry</button>
            </div>
          )}
          <button type="button" onClick={handleShowcaseToggle} disabled={isTogglingShowcase} className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium border transition-colors disabled:opacity-50 ${isShowcased ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400' : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'}`} title={isShowcased ? 'Remove from showcase' : 'Share to showcase'}>
            {isTogglingShowcase ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <GlobeIcon className="h-4 w-4" />}
            {isShowcased ? 'Shared' : 'Share'}
          </button>
          <button type="button" onClick={() => setIsFullscreen(true)} className="inline-flex items-center justify-center gap-2 rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors">
            <MaximizeIcon className="h-4 w-4" />Preview
          </button>
          <BeautifyButton onClick={handleBeautifyClick} isLoading={beautify.isBeautifying} disabled={!website || hasUnsavedChanges} variant="secondary" />
          <button type="button" onClick={() => setShowDownloadDialog(true)} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <DownloadIcon className="h-4 w-4" />Download
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 border-r border-border">
          <PreviewRenderer html={editedHtml} css={editedCss} viewportMode={viewportMode} onViewportChange={setViewportMode} />
        </div>
        {isCodePanelCollapsed && (
          <button type="button" onClick={() => setIsCodePanelCollapsed(false)} className="flex items-center justify-center w-10 bg-muted/50 border-l border-border hover:bg-muted transition-colors" aria-label="Expand code panel">
            <div className="flex flex-col items-center gap-2">
              <CodeIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground [writing-mode:vertical-rl] rotate-180">Code</span>
            </div>
          </button>
        )}
        <div className={`flex-shrink-0 transition-all duration-300 overflow-hidden ${isCodePanelCollapsed ? 'w-0' : 'w-[500px] min-w-[400px] max-w-[600px]'}`}>
          <div className="h-full w-[500px] flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
              <span className="text-sm font-medium text-foreground flex items-center gap-2"><CodeIcon className="h-4 w-4" />Code Editor</span>
              <button type="button" onClick={() => setIsCodePanelCollapsed(true)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Collapse code panel">
                <PanelRightIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CodeEditor html={editedHtml} css={editedCss} onHtmlChange={setEditedHtml} onCssChange={setEditedCss} activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen preview */}
      {isFullscreen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-background" role="dialog" aria-modal="true">
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 bg-background border-b border-border">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setIsFullscreen(false)} className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent transition-colors" aria-label="Exit fullscreen">
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{website.title}</h2>
                <span className="text-xs text-muted-foreground">Fullscreen Preview</span>
              </div>
            </div>
            <button type="button" onClick={() => setIsFullscreen(false)} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <MinimizeIcon className="h-4 w-4" />Exit Fullscreen
            </button>
          </div>
          <iframe srcDoc={`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${editedCss}</style></head><body>${sanitize(editedHtml)}</body></html>`} className="w-full h-full pt-[72px]" sandbox="allow-same-origin" title="Fullscreen preview" />
        </div>,
        document.body
      )}

      {/* Dialogs */}
      <DownloadDialog isOpen={showDownloadDialog} onClose={() => setShowDownloadDialog(false)} onDownload={handleDownload} websiteTitle={website.title} />
      <BeautifyOptionsDialog isOpen={beautify.showBeautifyOptions} onClose={beautify.handleDismiss} onConfirm={beautify.handleConfirm} />
      <BeautifyLoadingOverlay stage={beautify.beautifyStage ?? 'analyzing'} isVisible={beautify.isBeautifying} streamingContent={beautify.streamingContent} isPreviewExpanded={false} onTogglePreview={() => {}} onCancel={beautify.cancelBeautify} />
      {beautify.showPreviewComparison && (
        <div className="fixed inset-0 z-50 bg-background" role="dialog" aria-modal="true">
          <PreviewComparison originalHtml={editedHtml} originalCss={editedCss} beautifiedHtml={beautify.beautifiedHtml} beautifiedCss={beautify.beautifiedCss} onAccept={beautify.handleAccept} onReject={beautify.handleReject} />
        </div>
      )}
      <SaveOptionsDialog isOpen={beautify.showSaveOptions} originalTitle={website.title} onClose={beautify.handleDismiss} onReplaceOriginal={handleReplaceOriginal} onSaveAsNew={handleSaveAsNew} />
      {beautify.beautifyError && <BeautifyErrorDisplay error={beautify.beautifyError} onRetry={beautify.handleRetry} onDismiss={beautify.handleDismiss} />}
    </div>
  );
}

/**
 * WebsitePageContent wraps the inner component with ProtectedRoute
 * and the app layout (header/footer).
 */
export function WebsitePageContent({ websiteId }: WebsitePageContentProps) {
  return (
    <ProtectedRoute>
      <AppHeader />
      <main className="flex-1 relative z-10">
        <WebsitePageInner websiteId={websiteId} />
      </main>
      <AppFooter />
    </ProtectedRoute>
  );
}
