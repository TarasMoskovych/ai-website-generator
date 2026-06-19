/**
 * Thumbnail Service
 * Generates thumbnail previews for generated websites
 *
 * Requirements: 5.2, 5.7
 */

import html2canvas from 'html2canvas';
import { THUMBNAIL_DIMENSIONS } from '@/lib/constants';

/**
 * Default placeholder thumbnail as a base64 data URL
 * A simple gray background with centered text
 */
const PLACEHOLDER_THUMBNAIL = generatePlaceholderThumbnail();

/**
 * Generates a simple placeholder thumbnail as base64 data URL
 */
function generatePlaceholderThumbnail(): string {
  // Create a canvas for the placeholder
  if (typeof document === 'undefined') {
    // Server-side: return a minimal data URL
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAADwCAYAAABxLb1rAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDUgNzkuMTYzNDk5LCAyMDE4LzA4LzEzLTE2OjQwOjIyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDI0LTAxLTAxVDAwOjAwOjAwKzAwOjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDI0LTAxLTAxVDAwOjAwOjAwKzAwOjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyNC0wMS0wMVQwMDowMDowMCswMDowMCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDowMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAwIiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6MDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAwIiBkYzpmb3JtYXQ9ImltYWdlL3BuZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyI+IDx4bXBNTTpIaXN0b3J5PiA8cmRmOlNlcT4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNyZWF0ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6MDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAwIiBzdEV2dDp3aGVuPSIyMDI0LTAxLTAxVDAwOjAwOjAwKzAwOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+AAAI8klEQVR4nO3dW5LbOBAFUHm/+19ysoCZxLYoEiDQ3efMr6tKJigS6EaT/fr169evBYAf+L/fBwDwu7z7fQAA/wYBBKRMvwXe7/dZj/O2X79+XX8AeJgpAfx+v3evH//8c64/AJwrhgEhVwLgaQKAV7sNoO/3+9d+BPz5M0/9/PP/ADw0dAX49Wvux79/z+b9Hf7pn33o6wPwYtMD+PwO7/uPbvd/9+n//PPXb/75fz/6dwB4u+EA/vU7+O93gF7fof/u8M+//++vPxrCz3f8AN5uOID/+x3gE38HMOJ7ff/8OeC5ho8CfV1xm3GU5/v/c98fDN31HvA0A88z/Bj0kSEEYMTQU+Cqv/P1l92nwAL4Gy8BoE0A8GQAEIBR39e9ADzF8BXg6wrgq/6u0QOAJwEwVgcAIVf8nqrfB+Dh7G8F1gDAlNu8Fbg3gM//+3X3gYAnq1oH8NzXB+CKJx8CrQCAdwQweAAA';
  }

  const canvas = document.createElement('canvas');
  canvas.width = THUMBNAIL_DIMENSIONS.width;
  canvas.height = THUMBNAIL_DIMENSIONS.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }

  // Draw gradient background
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#e2e8f0');
  gradient.addColorStop(1, '#94a3b8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw centered text
  ctx.fillStyle = '#64748b';
  ctx.font = '16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('No Preview', canvas.width / 2, canvas.height / 2);

  return canvas.toDataURL('image/png');
}

/**
 * Thumbnail generation options
 */
export interface ThumbnailOptions {
  /** Width of the thumbnail (default: 320) */
  width?: number;
  /** Height of the thumbnail (default: 240) */
  height?: number;
  /** Background color (default: #ffffff) */
  backgroundColor?: string;
}

/**
 * Result of thumbnail generation
 */
export interface ThumbnailResult {
  /** Whether thumbnail generation was successful */
  success: boolean;
  /** Base64 data URL of the thumbnail */
  dataUrl: string;
  /** Error message if generation failed */
  error?: string;
}

/**
 * Generates a thumbnail from HTML and CSS content
 *
 * Requirement 5.2: Generate and store a thumbnail preview as a base64 data URL
 * Requirement 5.7: Handle thumbnail generation failures with placeholder
 *
 * @param html - The HTML content to render
 * @param css - The CSS content to apply
 * @param options - Optional configuration for thumbnail generation
 * @returns Promise resolving to ThumbnailResult with base64 data URL
 */
export async function generateThumbnail(
  html: string,
  css: string,
  options: ThumbnailOptions = {}
): Promise<ThumbnailResult> {
  const {
    width = THUMBNAIL_DIMENSIONS.width,
    height = THUMBNAIL_DIMENSIONS.height,
    backgroundColor = '#ffffff',
  } = options;

  // Check if we're in a browser environment
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return {
      success: false,
      dataUrl: PLACEHOLDER_THUMBNAIL,
      error: 'Thumbnail generation requires a browser environment',
    };
  }

  try {
    // Create a container element for rendering
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = `${width * 4}px`; // Render at 4x for better quality
    container.style.height = `${height * 4}px`;
    container.style.overflow = 'hidden';
    container.style.backgroundColor = backgroundColor;

    // Create an iframe for isolated rendering
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';

    container.appendChild(iframe);
    document.body.appendChild(container);

    // Wait for iframe to be ready
    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      // Set a minimal src to trigger load
      iframe.srcdoc = '<!DOCTYPE html><html><head></head><body></body></html>';
    });

    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) {
      throw new Error('Could not access iframe document');
    }

    // Build the complete HTML document with embedded CSS
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            /* Reset and base styles */
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              width: 100%;
              height: 100%;
              overflow: hidden;
              background-color: ${backgroundColor};
            }
            /* Scale content to fit */
            body {
              transform: scale(0.25);
              transform-origin: top left;
              width: 400%;
              height: 400%;
            }
            /* User CSS */
            ${css}
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    // Write the content to the iframe
    iframeDoc.open();
    iframeDoc.write(fullHtml);
    iframeDoc.close();

    // Wait for content to render
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Wait for images to load
    const images = iframeDoc.querySelectorAll('img');
    if (images.length > 0) {
      await Promise.all(
        Array.from(images).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
              } else {
                img.onload = () => resolve();
                img.onerror = () => resolve(); // Continue even if image fails
              }
            })
        )
      );
    }

    // Allow additional time for fonts and styles to apply
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Use html2canvas to capture the iframe content
    const canvas = await html2canvas(iframeDoc.body, {
      width: width * 4,
      height: height * 4,
      background: backgroundColor,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    // Create a smaller canvas for the final thumbnail
    const thumbnailCanvas = document.createElement('canvas');
    thumbnailCanvas.width = width;
    thumbnailCanvas.height = height;
    const ctx = thumbnailCanvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not create canvas context');
    }

    // Draw the captured content scaled down
    ctx.drawImage(canvas, 0, 0, width, height);

    // Convert to base64 data URL
    const dataUrl = thumbnailCanvas.toDataURL('image/png');

    // Cleanup
    document.body.removeChild(container);

    return {
      success: true,
      dataUrl,
    };
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    return {
      success: false,
      dataUrl: PLACEHOLDER_THUMBNAIL,
      error: error instanceof Error ? error.message : 'Unknown error during thumbnail generation',
    };
  }
}

/**
 * Gets the placeholder thumbnail data URL
 *
 * @returns Base64 data URL of the placeholder thumbnail
 */
export function getPlaceholderThumbnail(): string {
  return PLACEHOLDER_THUMBNAIL;
}

/**
 * Validates if a string is a valid base64 data URL for an image
 *
 * @param dataUrl - The string to validate
 * @returns true if valid base64 image data URL
 */
export function isValidThumbnailDataUrl(dataUrl: string): boolean {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return false;
  }

  // Check if it starts with a valid image data URL prefix
  const validPrefixes = [
    'data:image/png;base64,',
    'data:image/jpeg;base64,',
    'data:image/webp;base64,',
  ];

  return validPrefixes.some((prefix) => dataUrl.startsWith(prefix));
}

/**
 * ThumbnailService interface for dependency injection
 */
export interface ThumbnailService {
  generateThumbnail(html: string, css: string, options?: ThumbnailOptions): Promise<ThumbnailResult>;
  getPlaceholderThumbnail(): string;
  isValidThumbnailDataUrl(dataUrl: string): boolean;
}

/**
 * Default ThumbnailService implementation
 */
export const thumbnailService: ThumbnailService = {
  generateThumbnail,
  getPlaceholderThumbnail,
  isValidThumbnailDataUrl,
};

export default thumbnailService;
