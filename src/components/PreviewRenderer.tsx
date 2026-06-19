/**
 * PreviewRenderer Component
 * Renders generated website in an isolated iframe with responsive viewport modes
 *
 * Requirements:
 * - 3.1: Display website in isolated iframe within 2 seconds
 * - 3.2: Apply generated CSS within iframe scope
 * - 3.3: Support responsive preview modes (desktop: 1280x800, tablet: 768x1024, mobile: 375x667)
 * - 3.4: Default to desktop viewport and visually indicate active selection
 * - 3.5: Resize iframe on viewport selection within 500ms
 * - 3.6: Sanitize HTML before rendering (remove scripts, event handlers, javascript: URLs)
 * - 3.7: Display error message for invalid HTML/CSS and provide access to code editor for fixes
 *
 * Security:
 * - Uses sandbox attribute on iframe for additional isolation
 * - Sanitizes HTML using htmlSanitizer service before rendering
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VIEWPORT_DIMENSIONS, ViewportMode } from '@/lib/constants';
import { sanitize } from '@/services/htmlSanitizer';

/**
 * Represents a rendering error detected in the preview
 */
export interface RenderError {
  type: 'html' | 'css' | 'unknown';
  message: string;
}

/**
 * PreviewRenderer props
 * Based on the design document interface
 */
export interface PreviewRendererProps {
  /** Generated HTML code to render */
  html: string;
  /** Generated CSS code to apply */
  css: string;
  /** Current viewport mode */
  viewportMode: ViewportMode;
  /** Callback when viewport mode changes */
  onViewportChange: (mode: ViewportMode) => void;
  /** Optional callback when a rendering error is detected */
  onRenderError?: (error: RenderError | null) => void;
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
 * Alert/Warning triangle icon for error display
 */
function AlertTriangleIcon({ className }: { className?: string }) {
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
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  );
}

/**
 * Code/Editor icon
 */
function CodeIcon({ className }: { className?: string }) {
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
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

/**
 * Available viewport mode options
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
 * PreviewRenderer component
 * Displays a generated website in an isolated iframe with responsive viewport controls
 *
 * @example
 * // Basic usage with desktop mode
 * <PreviewRenderer
 *   html="<h1>Hello World</h1>"
 *   css="h1 { color: blue; }"
 *   viewportMode="desktop"
 *   onViewportChange={(mode) => setViewportMode(mode)}
 * />
 */
export function PreviewRenderer({
  html,
  css,
  viewportMode,
  onViewportChange,
  onRenderError,
}: PreviewRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [iframeError, setIframeError] = useState<RenderError | null>(null);

  /**
   * Get current viewport dimensions
   */
  const currentDimensions = useMemo(() => {
    return VIEWPORT_DIMENSIONS[viewportMode];
  }, [viewportMode]);

  /**
   * Validate HTML for common syntax errors
   * Returns an error message if invalid, null if valid
   */
  const htmlValidationError = useMemo((): string | null => {
    if (!html || html.trim().length === 0) {
      return null; // Empty HTML is valid (shows blank page)
    }

    // Check for severely malformed HTML that would prevent rendering
    // Count opening and closing tags for common structural elements
    const openBodyTags = (html.match(/<body\b/gi) || []).length;
    const closeBodyTags = (html.match(/<\/body>/gi) || []).length;

    if (openBodyTags > 1 || closeBodyTags > 1) {
      return 'Invalid HTML: Multiple body tags detected';
    }

    // Check for obviously broken HTML (unclosed angle brackets in text)
    const brokenAngleBrackets = html.match(/<[^>]*$/);
    if (brokenAngleBrackets) {
      return 'Invalid HTML: Unclosed tag detected';
    }

    return null;
  }, [html]);

  /**
   * Validate CSS for common syntax errors
   * Returns an error message if invalid, null if valid
   */
  const cssValidationError = useMemo((): string | null => {
    if (!css || css.trim().length === 0) {
      return null; // Empty CSS is valid
    }

    // Check for unbalanced braces
    const openBraces = (css.match(/{/g) || []).length;
    const closeBraces = (css.match(/}/g) || []).length;

    if (openBraces !== closeBraces) {
      return `Invalid CSS: Unbalanced braces (${openBraces} opening, ${closeBraces} closing)`;
    }

    // Check for unbalanced parentheses (common in functions like rgb(), url())
    const openParens = (css.match(/\(/g) || []).length;
    const closeParens = (css.match(/\)/g) || []).length;

    if (openParens !== closeParens) {
      return `Invalid CSS: Unbalanced parentheses`;
    }

    // Check for missing semicolons before closing braces (common error)
    // This pattern finds property:value} without semicolon
    const missingSemicolon = css.match(/[a-zA-Z0-9%#)'"]+\s*}/);
    if (missingSemicolon) {
      // Double-check it's not a comment or string
      const match = missingSemicolon[0];
      if (!match.includes('/*') && !match.includes('*/')) {
        return 'Invalid CSS: Possible missing semicolon before closing brace';
      }
    }

    return null;
  }, [css]);

  /**
   * Combined render error - either from validation or iframe runtime error
   */
  const renderError = useMemo((): RenderError | null => {
    // HTML validation error takes priority
    if (htmlValidationError) {
      return { type: 'html', message: htmlValidationError };
    }

    // CSS validation error next
    if (cssValidationError) {
      return { type: 'css', message: cssValidationError };
    }

    // Iframe runtime error
    if (iframeError) {
      return iframeError;
    }

    return null;
  }, [htmlValidationError, cssValidationError, iframeError]);

  /**
   * Notify parent of render error changes
   */
  useEffect(() => {
    onRenderError?.(renderError);
  }, [renderError, onRenderError]);

  /**
   * Build sanitized HTML document for iframe
   * Combines HTML and CSS into a complete document
   */
  const iframeContent = useMemo(() => {
    // Sanitize HTML to remove malicious elements
    const sanitizedHtml = sanitize(html);

    // Create a complete HTML document with embedded CSS
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Reset default styles */
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
    }
    /* User-generated CSS */
    ${css}
  </style>
</head>
<body>
  ${sanitizedHtml}
</body>
</html>`;
  }, [html, css]);

  /**
   * Calculate scale to fit iframe in container
   */
  const calculateScale = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth - 32; // Account for padding
    const containerHeight = container.clientHeight - 32;

    const { width: iframeWidth, height: iframeHeight } = currentDimensions;

    // Calculate scale to fit both width and height
    const scaleX = containerWidth / iframeWidth;
    const scaleY = containerHeight / iframeHeight;
    const newScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%

    setScale(newScale);
  }, [currentDimensions]);

  /**
   * Update scale when viewport mode or container size changes
   */
  useEffect(() => {
    calculateScale();

    // Add resize observer for container
    const resizeObserver = new ResizeObserver(() => {
      calculateScale();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [calculateScale, viewportMode]);

  /**
   * Write content to iframe when content changes
   * Also detects runtime errors during rendering
   */
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    setIsLoading(true);
    // Clear any previous iframe errors when content changes
    setIframeError(null);

    let iframeErrorHandler: ((event: ErrorEvent) => void) | null = null;
    let loadingTimer: ReturnType<typeof setTimeout> | null = null;

    // Write content to iframe document
    const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDocument) {
      try {
        iframeDocument.open();
        iframeDocument.write(iframeContent);
        iframeDocument.close();
      } catch {
        // Document write failed - this is rare but can happen
        // We'll let the browser handle it gracefully
      }

      // Listen for errors in the iframe (async errors from content)
      iframeErrorHandler = (event: ErrorEvent) => {
        const error: RenderError = {
          type: 'unknown',
          message: `Preview rendering error: ${event.message || 'Unknown error occurred'}`,
        };
        setIframeError(error);
      };

      // Add error listener to iframe window
      if (iframe.contentWindow) {
        iframe.contentWindow.addEventListener('error', iframeErrorHandler);
      }
    }

    // Mark loading complete after short delay for rendering
    loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => {
      if (loadingTimer) {
        clearTimeout(loadingTimer);
      }
      if (iframeErrorHandler && iframe.contentWindow) {
        iframe.contentWindow.removeEventListener('error', iframeErrorHandler);
      }
    };
  }, [iframeContent]);

  /**
   * Handle viewport mode selection
   */
  const handleViewportSelect = useCallback(
    (mode: ViewportMode) => {
      if (mode !== viewportMode) {
        onViewportChange(mode);
      }
    },
    [viewportMode, onViewportChange]
  );

  /**
   * Handle keyboard navigation for viewport selector
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, mode: ViewportMode) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleViewportSelect(mode);
      }
    },
    [handleViewportSelect]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Viewport selector toolbar */}
      <div
        className="flex items-center justify-between border-b border-border bg-card px-4 py-2"
        role="toolbar"
        aria-label="Preview viewport controls"
      >
        {/* Viewport mode buttons */}
        <div
          className="flex items-center gap-1"
          role="radiogroup"
          aria-label="Select viewport size"
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
                onClick={() => handleViewportSelect(option.value)}
                onKeyDown={(e) => handleKeyDown(e, option.value)}
                className={`
                  flex items-center gap-2 rounded-md px-3 py-1.5
                  text-sm font-medium
                  transition-all duration-200
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                  ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }
                `}
              >
                <OptionIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* Current dimensions display */}
        <div className="text-xs text-muted-foreground">
          {currentDimensions.width} × {currentDimensions.height}
        </div>
      </div>

      {/* Preview container */}
      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden bg-muted/50 p-4"
      >
        {/* Loading indicator */}
        {isLoading && !renderError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg
                className="h-5 w-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Loading preview...</span>
            </div>
          </div>
        )}

        {/* Render error overlay - Requirement 3.7 */}
        {renderError && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-background/95 p-6"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex max-w-md flex-col items-center gap-4 text-center">
              {/* Error icon */}
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangleIcon className="h-8 w-8 text-destructive" />
              </div>

              {/* Error title */}
              <h3 className="text-lg font-semibold text-foreground">
                Preview Cannot Be Rendered
              </h3>

              {/* Error message */}
              <p className="text-sm text-muted-foreground">
                {renderError.message}
              </p>

              {/* Error type indicator */}
              <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${
                  renderError.type === 'html'
                    ? 'bg-orange-500'
                    : renderError.type === 'css'
                    ? 'bg-blue-500'
                    : 'bg-gray-500'
                }`} />
                {renderError.type === 'html' && 'HTML Error'}
                {renderError.type === 'css' && 'CSS Error'}
                {renderError.type === 'unknown' && 'Rendering Error'}
              </div>

              {/* Help text pointing to code editor */}
              <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left">
                <CodeIcon className="h-5 w-5 flex-shrink-0 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Fix in Code Editor
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use the code editor panel on the right to correct the {renderError.type === 'html' ? 'HTML' : renderError.type === 'css' ? 'CSS' : 'code'} syntax errors.
                    The preview will automatically update once the issues are resolved.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Iframe wrapper with device frame appearance */}
        <div
          className="relative overflow-hidden rounded-lg border border-border bg-white shadow-lg transition-all duration-500"
          style={{
            width: currentDimensions.width * scale,
            height: currentDimensions.height * scale,
          }}
        >
          {/* Scaled iframe container */}
          <div
            className="origin-top-left"
            style={{
              width: currentDimensions.width,
              height: currentDimensions.height,
              transform: `scale(${scale})`,
            }}
          >
            <iframe
              ref={iframeRef}
              title="Website Preview"
              className="h-full w-full border-0"
              // Sandbox for security - allow same-origin for writing content
              sandbox="allow-same-origin"
              style={{
                width: currentDimensions.width,
                height: currentDimensions.height,
              }}
            />
          </div>
        </div>

        {/* Scale indicator */}
        {scale < 1 && (
          <div className="absolute bottom-2 right-2 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground">
            {Math.round(scale * 100)}%
          </div>
        )}
      </div>
    </div>
  );
}

export default PreviewRenderer;
