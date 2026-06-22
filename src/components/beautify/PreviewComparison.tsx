/**
 * PreviewComparison Component
 * Displays original and beautified website versions for comparison
 *
 * Requirements:
 * - 7.1: Display two side-by-side iframe previews
 * - 7.2: Label left preview as "Original" and right as "Beautified"
 * - 7.3: Synchronize scrolling between both previews
 * - 7.4: Provide viewport mode controls (desktop, tablet, mobile) for both previews
 * - 7.5: Display "Accept Changes" button
 * - 7.6: Display "Reject Changes" button
 * - 7.7: Update code editor on accept
 * - 7.8: Close and return to normal preview mode on accept
 * - 7.9: Preserve original HTML/CSS on reject
 * - 7.10: Toggle between side-by-side and overlay comparison modes
 *
 * This component:
 * 1. Renders two iframe previews with synchronized scrolling
 * 2. Supports side-by-side and overlay comparison modes
 * 3. Provides viewport mode controls for responsive testing
 * 4. Includes accessible controls with keyboard navigation
 * 5. Uses Tailwind CSS for styling
 * 6. Follows existing component patterns in the codebase
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VIEWPORT_DIMENSIONS } from '@/lib/constants';
import { sanitize } from '@/services/htmlSanitizer';
import type { ComparisonMode, ViewportMode } from '@/types/beautify';

/**
 * PreviewComparison props following the design specification
 */
export interface PreviewComparisonProps {
  /** Original HTML content */
  originalHtml: string;
  /** Original CSS content */
  originalCss: string;
  /** Beautified HTML content */
  beautifiedHtml: string;
  /** Beautified CSS content */
  beautifiedCss: string;
  /** Handler when user accepts changes */
  onAccept: () => void;
  /** Handler when user rejects changes */
  onReject: () => void;
}

/**
 * Desktop monitor icon
 */
function DesktopIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  );
}

/**
 * Tablet icon
 */
function TabletIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <line x1="12" x2="12.01" y1="18" y2="18" />
    </svg>
  );
}

/**
 * Mobile phone icon
 */
function MobileIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <line x1="12" x2="12.01" y1="18" y2="18" />
    </svg>
  );
}

/**
 * Side-by-side comparison icon
 */
function SideBySideIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <line x1="12" x2="12" y1="3" y2="21" />
    </svg>
  );
}

/**
 * Overlay comparison icon
 */
function OverlayIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <line x1="9" x2="9" y1="3" y2="21" />
      <path d="M9 12h12" />
    </svg>
  );
}

/**
 * Check icon for accept button
 */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/**
 * X icon for reject button
 */
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/**
 * Viewport mode configuration
 */
interface ViewportOption {
  value: ViewportMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  dimensions: { width: number; height: number };
}

/**
 * Available viewport options
 */
const viewportOptions: ViewportOption[] = [
  {
    value: 'desktop',
    label: 'Desktop',
    icon: DesktopIcon,
    dimensions: VIEWPORT_DIMENSIONS.desktop,
  },
  {
    value: 'tablet',
    label: 'Tablet',
    icon: TabletIcon,
    dimensions: VIEWPORT_DIMENSIONS.tablet,
  },
  {
    value: 'mobile',
    label: 'Mobile',
    icon: MobileIcon,
    dimensions: VIEWPORT_DIMENSIONS.mobile,
  },
];

/**
 * Build HTML document for iframe rendering
 */
function buildIframeContent(html: string, css: string): string {
  const sanitizedHtml = sanitize(html);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
    }
    ${css}
  </style>
</head>
<body>
  ${sanitizedHtml}
</body>
</html>`;
}

/**
 * PreviewComparison component
 * Displays original and beautified versions for comparison with synchronized scrolling
 *
 * @example
 * <PreviewComparison
 *   originalHtml={originalHtml}
 *   originalCss={originalCss}
 *   beautifiedHtml={beautifiedHtml}
 *   beautifiedCss={beautifiedCss}
 *   onAccept={() => handleAccept()}
 *   onReject={() => handleReject()}
 * />
 */
export function PreviewComparison({
  originalHtml,
  originalCss,
  beautifiedHtml,
  beautifiedCss,
  onAccept,
  onReject,
}: PreviewComparisonProps) {
  // State
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('side-by-side');
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop');
  const [sliderPosition, setSliderPosition] = useState(50); // Percentage for overlay mode
  const [isDragging, setIsDragging] = useState(false);

  // Refs for iframes
  const originalIframeRef = useRef<HTMLIFrameElement>(null);
  const beautifiedIframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Ref to track if we're currently syncing scroll to prevent infinite loops
  const isSyncingScroll = useRef(false);

  // Get current viewport dimensions
  const currentDimensions = useMemo(() => {
    return VIEWPORT_DIMENSIONS[viewportMode];
  }, [viewportMode]);

  // Build iframe contents
  const originalContent = useMemo(
    () => buildIframeContent(originalHtml, originalCss),
    [originalHtml, originalCss]
  );

  const beautifiedContent = useMemo(
    () => buildIframeContent(beautifiedHtml, beautifiedCss),
    [beautifiedHtml, beautifiedCss]
  );

  /**
   * Write content to an iframe
   */
  const writeToIframe = useCallback((iframe: HTMLIFrameElement | null, content: string) => {
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(content);
      doc.close();
    }
  }, []);

  /**
   * Synchronize scrolling between iframes (Requirement 7.3)
   */
  const handleScroll = useCallback((sourceIframe: HTMLIFrameElement, targetIframe: HTMLIFrameElement) => {
    if (isSyncingScroll.current) return;

    const sourceDoc = sourceIframe.contentDocument || sourceIframe.contentWindow?.document;
    const targetDoc = targetIframe.contentDocument || targetIframe.contentWindow?.document;

    if (!sourceDoc || !targetDoc) return;

    const sourceScrollElement = sourceDoc.scrollingElement || sourceDoc.documentElement;
    const targetScrollElement = targetDoc.scrollingElement || targetDoc.documentElement;

    isSyncingScroll.current = true;
    targetScrollElement.scrollTop = sourceScrollElement.scrollTop;
    targetScrollElement.scrollLeft = sourceScrollElement.scrollLeft;

    // Reset sync flag after a small delay
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  }, []);

  /**
   * Setup scroll synchronization on iframes
   */
  const setupScrollSync = useCallback(() => {
    const originalIframe = originalIframeRef.current;
    const beautifiedIframe = beautifiedIframeRef.current;

    if (!originalIframe || !beautifiedIframe) return;

    const originalDoc = originalIframe.contentDocument || originalIframe.contentWindow?.document;
    const beautifiedDoc = beautifiedIframe.contentDocument || beautifiedIframe.contentWindow?.document;

    if (!originalDoc || !beautifiedDoc) return;

    const handleOriginalScroll = () => {
      if (originalIframe && beautifiedIframe) {
        handleScroll(originalIframe, beautifiedIframe);
      }
    };

    const handleBeautifiedScroll = () => {
      if (beautifiedIframe && originalIframe) {
        handleScroll(beautifiedIframe, originalIframe);
      }
    };

    originalDoc.addEventListener('scroll', handleOriginalScroll);
    beautifiedDoc.addEventListener('scroll', handleBeautifiedScroll);

    return () => {
      originalDoc.removeEventListener('scroll', handleOriginalScroll);
      beautifiedDoc.removeEventListener('scroll', handleBeautifiedScroll);
    };
  }, [handleScroll]);

  /**
   * Ref to store cleanup function for scroll sync listeners
   */
  const scrollCleanupRef = useRef<(() => void) | null>(null);

  /**
   * Initialize iframes and setup scroll sync
   */
  useEffect(() => {
    writeToIframe(originalIframeRef.current, originalContent);
    writeToIframe(beautifiedIframeRef.current, beautifiedContent);

    // Setup scroll sync after a short delay to ensure iframes are ready
    const timeoutId = setTimeout(() => {
      // Cleanup previous scroll listeners before setting up new ones
      if (scrollCleanupRef.current) {
        scrollCleanupRef.current();
      }
      scrollCleanupRef.current = setupScrollSync() || null;
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      // Cleanup scroll listeners on unmount
      if (scrollCleanupRef.current) {
        scrollCleanupRef.current();
        scrollCleanupRef.current = null;
      }
    };
  }, [originalContent, beautifiedContent, writeToIframe, setupScrollSync]);

  /**
   * Re-setup scroll sync when viewport or comparison mode changes
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Cleanup previous scroll listeners before setting up new ones
      if (scrollCleanupRef.current) {
        scrollCleanupRef.current();
      }
      scrollCleanupRef.current = setupScrollSync() || null;
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [viewportMode, comparisonMode, setupScrollSync]);

  /**
   * Handle overlay slider drag
   */
  const handleSliderMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  /**
   * Handle mouse move for slider
   */
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  /**
   * Handle keyboard navigation for slider
   */
  const handleSliderKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = 5;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderPosition((prev) => Math.max(0, prev - step));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderPosition((prev) => Math.min(100, prev + step));
    }
  }, []);

  /**
   * Handle viewport mode change (Requirement 7.4)
   */
  const handleViewportChange = useCallback((mode: ViewportMode) => {
    setViewportMode(mode);
  }, []);

  /**
   * Handle comparison mode toggle (Requirement 7.10)
   */
  const handleComparisonModeChange = useCallback((mode: ComparisonMode) => {
    setComparisonMode(mode);
  }, []);

  /**
   * Render side-by-side comparison view
   */
  const renderSideBySide = () => (
    <div className="flex flex-1 gap-4 p-4 overflow-hidden">
      {/* Original preview */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-2 flex items-center justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            Original
          </span>
        </div>
        <div className="flex-1 relative overflow-hidden rounded-lg border border-border bg-white shadow-sm">
          <div className="absolute inset-0 flex items-center justify-center overflow-auto">
            <iframe
              ref={originalIframeRef}
              title="Original Website Preview"
              className="border-0"
              sandbox="allow-same-origin"
              style={{
                width: currentDimensions.width,
                height: currentDimensions.height,
                maxWidth: '100%',
                maxHeight: '100%',
              }}
            />
          </div>
        </div>
      </div>

      {/* Beautified preview */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-2 flex items-center justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Beautified
          </span>
        </div>
        <div className="flex-1 relative overflow-hidden rounded-lg border border-border bg-white shadow-sm">
          <div className="absolute inset-0 flex items-center justify-center overflow-auto">
            <iframe
              ref={beautifiedIframeRef}
              title="Beautified Website Preview"
              className="border-0"
              sandbox="allow-same-origin"
              style={{
                width: currentDimensions.width,
                height: currentDimensions.height,
                maxWidth: '100%',
                maxHeight: '100%',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * Render overlay comparison view with slider
   */
  const renderOverlay = () => (
    <div
      ref={containerRef}
      className="flex-1 relative m-4 overflow-hidden rounded-lg border border-border bg-white shadow-sm"
    >
      {/* Beautified (full width, behind) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <iframe
          ref={beautifiedIframeRef}
          title="Beautified Website Preview"
          className="border-0"
          sandbox="allow-same-origin"
          style={{
            width: currentDimensions.width,
            height: currentDimensions.height,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        />
      </div>

      {/* Original (clipped by slider position) */}
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <iframe
          ref={originalIframeRef}
          title="Original Website Preview"
          className="border-0"
          sandbox="allow-same-origin"
          style={{
            width: currentDimensions.width,
            height: currentDimensions.height,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        />
      </div>

      {/* Slider handle */}
      <div
        ref={sliderRef}
        role="slider"
        aria-label="Comparison slider"
        aria-valuenow={sliderPosition}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        className={`
          absolute top-0 bottom-0 w-1
          bg-primary cursor-ew-resize
          transition-colors
          hover:bg-primary/80
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-ring focus-visible:ring-offset-2
          ${isDragging ? 'bg-primary/80' : ''}
        `}
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        onMouseDown={handleSliderMouseDown}
        onKeyDown={handleSliderKeyDown}
      >
        {/* Slider handle grip */}
        <div
          className={`
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-8 h-8 rounded-full
            bg-primary border-2 border-background
            shadow-lg
            flex items-center justify-center
            ${isDragging ? 'scale-110' : ''}
            transition-transform
          `}
        >
          <div className="flex gap-0.5">
            <div className="w-0.5 h-3 rounded-full bg-primary-foreground/70" />
            <div className="w-0.5 h-3 rounded-full bg-primary-foreground/70" />
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-2 left-2 pointer-events-none">
        <span className="inline-flex items-center gap-2 rounded-full bg-background/90 backdrop-blur-sm px-3 py-1 text-sm font-medium text-foreground shadow-sm">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          Original
        </span>
      </div>
      <div className="absolute top-2 right-2 pointer-events-none">
        <span className="inline-flex items-center gap-2 rounded-full bg-background/90 backdrop-blur-sm px-3 py-1 text-sm font-medium text-foreground shadow-sm">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Beautified
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        {/* Left: Comparison mode toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground mr-2">Compare:</span>
          <div
            className="flex items-center gap-1 rounded-md bg-muted p-1"
            role="radiogroup"
            aria-label="Comparison mode"
          >
            <button
              type="button"
              role="radio"
              aria-checked={comparisonMode === 'side-by-side'}
              onClick={() => handleComparisonModeChange('side-by-side')}
              className={`
                flex items-center gap-1.5 rounded px-2 py-1
                text-sm font-medium
                transition-colors
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-ring focus-visible:ring-offset-1
                ${
                  comparisonMode === 'side-by-side'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              <SideBySideIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Side by Side</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={comparisonMode === 'overlay'}
              onClick={() => handleComparisonModeChange('overlay')}
              className={`
                flex items-center gap-1.5 rounded px-2 py-1
                text-sm font-medium
                transition-colors
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-ring focus-visible:ring-offset-1
                ${
                  comparisonMode === 'overlay'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              <OverlayIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Overlay</span>
            </button>
          </div>
        </div>

        {/* Center: Viewport controls (Requirement 7.4) */}
        <div
          className="flex items-center gap-1"
          role="radiogroup"
          aria-label="Viewport size"
        >
          {viewportOptions.map((option) => {
            const OptionIcon = option.icon;
            const isActive = viewportMode === option.value;

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                aria-label={`${option.label} (${option.dimensions.width}×${option.dimensions.height})`}
                onClick={() => handleViewportChange(option.value)}
                className={`
                  flex items-center gap-1.5 rounded-md px-2.5 py-1.5
                  text-sm font-medium
                  transition-colors
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-ring focus-visible:ring-offset-2
                  ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }
                `}
              >
                <OptionIcon className="h-4 w-4" />
                <span className="hidden md:inline">{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Action buttons (Requirements 7.5, 7.6) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReject}
            className="
              inline-flex items-center gap-1.5
              rounded-md px-3 py-1.5
              text-sm font-medium
              bg-secondary text-secondary-foreground
              hover:bg-secondary/80
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring focus-visible:ring-offset-2
              transition-colors
            "
            aria-label="Reject changes and keep original"
          >
            <XIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Reject</span>
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="
              inline-flex items-center gap-1.5
              rounded-md px-3 py-1.5
              text-sm font-medium
              bg-primary text-primary-foreground
              hover:bg-primary/90
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring focus-visible:ring-offset-2
              transition-colors
            "
            aria-label="Accept beautified changes"
          >
            <CheckIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Accept</span>
          </button>
        </div>
      </div>

      {/* Preview area */}
      {comparisonMode === 'side-by-side' ? renderSideBySide() : renderOverlay()}

      {/* Dimensions indicator */}
      <div className="flex items-center justify-center py-2 border-t border-border bg-card">
        <span className="text-xs text-muted-foreground">
          {currentDimensions.width} × {currentDimensions.height}px
        </span>
      </div>
    </div>
  );
}

export default PreviewComparison;
