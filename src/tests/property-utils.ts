import * as fc from 'fast-check';
import type { GeneratedWebsite } from '@/types/website';
import type { AuthenticatedUser } from '@/types/auth';

// ============================================================================
// Arbitrary Generators for Property-Based Testing
// ============================================================================

/**
 * Generates arbitrary text input within valid bounds (10-10,000 characters)
 */
export const validTextInputArb = fc.string({ minLength: 10, maxLength: 10_000 });

/**
 * Generates arbitrary text input that is too short (< 10 characters)
 */
export const tooShortTextInputArb = fc.string({ minLength: 0, maxLength: 9 });

/**
 * Generates arbitrary text input that is too long (> 10,000 characters)
 */
export const tooLongTextInputArb = fc.string({ minLength: 10_001, maxLength: 15_000 });

/**
 * Generates arbitrary valid title (1-100 characters)
 */
export const validTitleArb = fc.string({ minLength: 1, maxLength: 100 });

/**
 * Generates arbitrary title that is too long (> 100 characters)
 */
export const invalidTitleArb = fc.string({ minLength: 101, maxLength: 200 });

/**
 * Generates arbitrary empty string
 */
export const emptyStringArb = fc.constant('');

/**
 * Generates valid MIME types for screenshot input
 */
export const validMimeTypeArb = fc.constantFrom('image/png', 'image/jpeg', 'image/webp');

/**
 * Generates invalid MIME types
 */
export const invalidMimeTypeArb = fc.constantFrom(
  'image/gif',
  'image/bmp',
  'image/svg+xml',
  'application/pdf',
  'text/plain'
);

/**
 * Generates arbitrary file size within valid bounds (0-10MB)
 */
export const validFileSizeArb = fc.integer({ min: 1, max: 10 * 1024 * 1024 });

/**
 * Generates arbitrary file size that exceeds limit (> 10MB)
 */
export const invalidFileSizeArb = fc.integer({ min: 10 * 1024 * 1024 + 1, max: 50 * 1024 * 1024 });

/**
 * Generates valid image dimensions (>= 200x200)
 */
export const validDimensionsArb = fc.record({
  width: fc.integer({ min: 200, max: 4000 }),
  height: fc.integer({ min: 200, max: 4000 }),
});

/**
 * Generates invalid image dimensions (< 200 on either side)
 */
export const invalidDimensionsArb = fc.oneof(
  fc.record({
    width: fc.integer({ min: 1, max: 199 }),
    height: fc.integer({ min: 200, max: 4000 }),
  }),
  fc.record({
    width: fc.integer({ min: 200, max: 4000 }),
    height: fc.integer({ min: 1, max: 199 }),
  }),
  fc.record({
    width: fc.integer({ min: 1, max: 199 }),
    height: fc.integer({ min: 1, max: 199 }),
  })
);

/**
 * Generates arbitrary HTML content
 */
export const htmlContentArb = fc
  .array(
    fc.oneof(
      fc.constant('<html><body><h1>Test</h1></body></html>'),
      fc.constant('<div class="container"><p>Content</p></div>'),
      fc.constant('<header><nav><ul><li>Home</li></ul></nav></header>'),
      fc.string().map((s) => `<p>${s.replace(/[<>&"']/g, '')}</p>`)
    ),
    { minLength: 1, maxLength: 3 }
  )
  .map((parts) => parts.join('\n'));

/**
 * Generates arbitrary CSS content
 */
export const cssContentArb = fc
  .array(
    fc.oneof(
      fc.constant('body { margin: 0; }'),
      fc.constant('.container { max-width: 1200px; }'),
      fc.constant('h1 { color: #333; }'),
      fc
        .tuple(
          fc.stringMatching(/^[0-9a-f]{6}$/),
          fc.integer({ min: 0, max: 100 })
        )
        .map(([color, margin]) => `.class-${margin} { color: #${color}; margin: ${margin}px; }`)
    ),
    { minLength: 1, maxLength: 5 }
  )
  .map((rules) => rules.join('\n'));

/**
 * Generates an arbitrary authenticated user
 */
export const authenticatedUserArb: fc.Arbitrary<AuthenticatedUser> = fc.record({
  uid: fc.uuid(),
  email: fc.emailAddress(),
  displayName: fc.string({ minLength: 1, maxLength: 50 }),
  photoURL: fc.oneof(fc.webUrl(), fc.constant(null)),
});

/**
 * Generates an arbitrary generated website
 */
export const generatedWebsiteArb: fc.Arbitrary<GeneratedWebsite> = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  title: validTitleArb,
  html: htmlContentArb,
  css: cssContentArb,
  thumbnailUrl: fc.oneof(
    fc.constant('data:image/png;base64,test'),
    fc.constant('/placeholder-thumbnail.png')
  ),
  inputType: fc.constantFrom('text' as const, 'screenshot' as const),
  isPublic: fc.boolean(),
  isShowcased: fc.boolean(),
  showcasedAt: fc.oneof(
    fc.date().map((d) => d.toISOString()),
    fc.constant(null)
  ),
  creatorName: fc.string({ minLength: 1, maxLength: 50 }),
  createdAt: fc.date().map((d) => d.toISOString()),
  updatedAt: fc.date().map((d) => d.toISOString()),
});

/**
 * Generates arbitrary HTML with potentially malicious content for sanitization tests
 */
export const maliciousHtmlArb = fc.oneof(
  fc.constant('<script>alert("xss")</script>'),
  fc.constant('<img src="x" onerror="alert(1)">'),
  fc.constant('<a href="javascript:alert(1)">click</a>'),
  fc.constant('<div onclick="evil()">click</div>'),
  fc.constant('<iframe src="javascript:alert(1)"></iframe>'),
  fc.constant('<body onload="alert(1)">'),
  fc.string().map((s) => `<script>${s}</script>`),
  fc.string().map((s) => `<div onclick="${s}">test</div>`)
);

/**
 * Generates Claude API response format with code blocks
 */
export const claudeResponseArb = fc.tuple(htmlContentArb, cssContentArb, validTitleArb).map(
  ([html, css, title]) => `
Here is the generated website:

\`\`\`html
${html}
\`\`\`

\`\`\`css
${css}
\`\`\`

Title: ${title}
`
);

// ============================================================================
// Test Helpers for Property Testing
// ============================================================================

/**
 * Runs a property test with the specified arbitrary and property function
 */
export function runProperty<T>(
  name: string,
  arbitrary: fc.Arbitrary<T>,
  property: (value: T) => boolean | void,
  options?: fc.Parameters<[T]>
): void {
  fc.assert(fc.property(arbitrary, property), {
    numRuns: 100,
    ...options,
  });
}

/**
 * Runs an async property test
 */
export async function runAsyncProperty<T>(
  name: string,
  arbitrary: fc.Arbitrary<T>,
  property: (value: T) => Promise<boolean | void>,
  options?: fc.Parameters<[T]>
): Promise<void> {
  await fc.assert(fc.asyncProperty(arbitrary, property), {
    numRuns: 100,
    ...options,
  });
}
