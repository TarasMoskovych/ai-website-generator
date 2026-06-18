/**
 * Download Service
 * Handles generation of downloadable website files
 * Supports single HTML file with embedded CSS and ZIP archive formats
 *
 * Requirements: 4.2, 4.3
 */

/**
 * DownloadService interface for generating downloadable website files
 */
export interface DownloadService {
  generateSingleFile(html: string, css: string, title: string): Promise<Blob>;
  generateZipArchive(html: string, css: string, title: string): Promise<Blob>;
}

/**
 * Regular expressions for detecting HTML structure
 */
const HTML_DOCTYPE_REGEX = /^\s*<!DOCTYPE\s+html>/i;
const HTML_TAG_REGEX = /<html[\s>]/i;
const HEAD_TAG_REGEX = /<head[\s>]/i;
const BODY_TAG_REGEX = /<body[\s>]/i;
const CLOSING_HEAD_REGEX = /<\/head>/i;

/**
 * Checks if the HTML content has a complete document structure
 * (DOCTYPE, html, head, and body tags)
 */
function hasCompleteHtmlStructure(html: string): boolean {
  return (
    HTML_DOCTYPE_REGEX.test(html) &&
    HTML_TAG_REGEX.test(html) &&
    HEAD_TAG_REGEX.test(html) &&
    BODY_TAG_REGEX.test(html)
  );
}

/**
 * Creates a style element with the provided CSS
 */
function createStyleElement(css: string): string {
  if (!css.trim()) {
    return '';
  }
  return `<style>\n${css}\n  </style>`;
}

/**
 * Escapes HTML special characters in a string for use as text content
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Creates a complete HTML document structure with embedded CSS
 * Used when input HTML is just body content
 */
function createCompleteDocument(bodyContent: string, css: string, title: string): string {
  const styleElement = createStyleElement(css);
  const escapedTitle = escapeHtml(title);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedTitle}</title>
  ${styleElement}
</head>
<body>
${bodyContent}
</body>
</html>`;
}

/**
 * Injects CSS into an existing HTML document's head section
 * Inserts the style element before the closing </head> tag
 */
function injectCssIntoDocument(html: string, css: string): string {
  if (!css.trim()) {
    return html;
  }

  const styleElement = createStyleElement(css);

  // If the HTML has a closing </head> tag, insert the style before it
  if (CLOSING_HEAD_REGEX.test(html)) {
    return html.replace(CLOSING_HEAD_REGEX, `${styleElement}\n</head>`);
  }

  // If there's a <body> tag but no </head>, insert before <body>
  if (BODY_TAG_REGEX.test(html)) {
    return html.replace(BODY_TAG_REGEX, (match) => `${styleElement}\n${match}`);
  }

  // Fallback: prepend the style to the HTML
  return `${styleElement}\n${html}`;
}

/**
 * Generates a single HTML file with embedded CSS
 *
 * Handles two cases:
 * 1. HTML has complete structure (DOCTYPE, html, head, body) - injects CSS into head
 * 2. HTML is just body content - wraps in complete document structure
 *
 * Requirement 4.2: Generate downloadable HTML file with CSS embedded in a style element
 *
 * @param html - The HTML content (either complete document or body content)
 * @param css - The CSS content to embed
 * @param title - The website title for the document
 * @returns Promise resolving to a Blob containing the complete HTML file
 */
export async function generateSingleFile(
  html: string,
  css: string,
  title: string
): Promise<Blob> {
  let finalHtml: string;

  if (hasCompleteHtmlStructure(html)) {
    // HTML already has complete structure, inject CSS into head
    finalHtml = injectCssIntoDocument(html, css);
  } else {
    // HTML is just body content, create complete document
    finalHtml = createCompleteDocument(html, css, title);
  }

  // Create and return a Blob with text/html MIME type
  return new Blob([finalHtml], { type: 'text/html;charset=utf-8' });
}

/**
 * Generates a ZIP archive with separate HTML and CSS files
 *
 * Creates:
 * - index.html with link to styles.css
 * - styles.css with CSS content
 *
 * Requirement 4.3: Generate downloadable ZIP archive with separate index.html and styles.css
 *
 * @param html - The HTML content
 * @param css - The CSS content
 * @param title - The website title
 * @returns Promise resolving to a Blob containing the ZIP archive
 */
export async function generateZipArchive(
  html: string,
  css: string,
  title: string
): Promise<Blob> {
  // Dynamic import of JSZip to keep it out of the initial bundle
  const JSZip = (await import('jszip')).default;

  const zip = new JSZip();
  const escapedTitle = escapeHtml(title);

  let indexHtml: string;

  if (hasCompleteHtmlStructure(html)) {
    // Inject link to external stylesheet in the head
    const linkElement = '<link rel="stylesheet" href="styles.css">';
    if (CLOSING_HEAD_REGEX.test(html)) {
      indexHtml = html.replace(CLOSING_HEAD_REGEX, `${linkElement}\n</head>`);
    } else if (BODY_TAG_REGEX.test(html)) {
      indexHtml = html.replace(BODY_TAG_REGEX, (match) => `${linkElement}\n${match}`);
    } else {
      indexHtml = `${linkElement}\n${html}`;
    }
  } else {
    // Create complete document with link to external stylesheet
    indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedTitle}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
${html}
</body>
</html>`;
  }

  // Add files to the ZIP archive
  zip.file('index.html', indexHtml);
  zip.file('styles.css', css);

  // Generate the ZIP blob
  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Triggers a browser download for a Blob
 *
 * @param blob - The Blob to download
 * @param filename - The filename for the download
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * DownloadService class implementation
 */
export class DownloadServiceImpl implements DownloadService {
  async generateSingleFile(html: string, css: string, title: string): Promise<Blob> {
    return generateSingleFile(html, css, title);
  }

  async generateZipArchive(html: string, css: string, title: string): Promise<Blob> {
    return generateZipArchive(html, css, title);
  }
}

/**
 * Default DownloadService instance
 */
export const downloadService: DownloadService = new DownloadServiceImpl();

export default downloadService;
