import Anthropic from '@anthropic-ai/sdk';

/**
 * Claude API Configuration
 *
 * This module sets up the Anthropic SDK client for AI-powered website generation.
 * It uses Claude 3.5 Haiku as the model for cost-effective text and vision processing.
 */

// Validate API key is present
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    'Warning: ANTHROPIC_API_KEY is not set. Claude API calls will fail.'
  );
}

/**
 * Anthropic client instance configured with API key from environment variables.
 * This client is used for all Claude API interactions including text and vision generation.
 */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Claude model constant
 * Using Claude Haiku 4.5 - fastest and most cost-effective model with vision capabilities
 * See: https://docs.anthropic.com/en/docs/models-overview
 */
export const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Maximum tokens for Claude API response
 * Set to 16384 to allow for complete HTML and CSS generation,
 * especially for complex screenshot-based generation
 */
export const MAX_TOKENS = 16384;

/**
 * Response structure from Claude API generation functions
 */
export interface ClaudeResponse {
  /** The generated content (HTML, CSS, title) */
  content: string;
  /** Token usage information for cost tracking */
  usage: {
    /** Number of input tokens used */
    inputTokens: number;
    /** Number of output tokens generated */
    outputTokens: number;
  };
}

/**
 * System prompt for text-based website generation
 * Instructs Claude to generate semantic HTML5, accessible, responsive CSS with BEM naming
 */
export const TEXT_GENERATION_PROMPT = `You are a website generator. Given a description, generate complete HTML and CSS code for a website.

Requirements:
- Generate semantic HTML5 using proper elements (header, nav, main, section, article, aside, footer)
- Ensure accessibility: use ARIA labels where needed, proper heading hierarchy, alt text for images, sufficient color contrast
- Use CSS Grid and/or Flexbox for layouts
- Make the design fully responsive with mobile-first approach and media queries
- Follow BEM (Block Element Modifier) naming convention for CSS classes
- Include viewport meta tag and other necessary meta tags
- Do not include any JavaScript
- Include dark theme support using CSS custom properties and prefers-color-scheme media query

CSS Guidelines (BEM):
- Blocks: .card, .header, .navigation
- Elements: .card__title, .card__image, .navigation__item
- Modifiers: .card--featured, .button--primary, .navigation__item--active

Dark Theme Guidelines:
- Define CSS custom properties (--color-bg, --color-text, --color-primary, etc.)
- Use :root for light theme defaults
- Use @media (prefers-color-scheme: dark) for dark theme overrides
- Ensure WCAG AA contrast ratios in both themes

IMPORTANT: You MUST output the code in exactly this format with BOTH html and css code blocks:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Title</title>
</head>
<body>
    <!-- Your HTML content here -->
</body>
</html>
\`\`\`

\`\`\`css
/* Your complete CSS styles here - DO NOT reference external stylesheets */
:root {
    /* CSS variables */
}

/* All styles must be included in this block */
\`\`\`

Title: [concise title 3-100 characters that summarizes the website's purpose]

CRITICAL: Do NOT use <link rel="stylesheet" href="..."> - all CSS must be in the css code block above.`;

/**
 * System prompt for screenshot-based website generation
 * Instructs Claude to analyze the screenshot and replicate the design
 */
export const SCREENSHOT_GENERATION_PROMPT = `You are a website generator. Analyze this screenshot and generate HTML and CSS code that replicates the design as closely as possible.

Requirements:
- Generate semantic HTML5 using proper elements (header, nav, main, section, article, aside, footer)
- Ensure accessibility: use ARIA labels where needed, proper heading hierarchy, alt text for images, sufficient color contrast
- Match the layout, colors, and typography from the screenshot
- Use CSS Grid and/or Flexbox for layouts
- Make the design fully responsive with mobile-first approach and media queries
- Follow BEM (Block Element Modifier) naming convention for CSS classes
- Include viewport meta tag and other necessary meta tags
- Do not include any JavaScript
- Include dark theme support using CSS custom properties and prefers-color-scheme media query

CSS Guidelines (BEM):
- Blocks: .card, .header, .navigation
- Elements: .card__title, .card__image, .navigation__item
- Modifiers: .card--featured, .button--primary, .navigation__item--active

Dark Theme Guidelines:
- Define CSS custom properties (--color-bg, --color-text, --color-primary, etc.)
- Use :root for light theme defaults (matching the screenshot colors)
- Use @media (prefers-color-scheme: dark) for dark theme variant
- Ensure WCAG AA contrast ratios in both themes

IMPORTANT: You MUST output the code in exactly this format with BOTH html and css code blocks:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Title</title>
</head>
<body>
    <!-- Your HTML content here -->
</body>
</html>
\`\`\`

\`\`\`css
/* Your complete CSS styles here - DO NOT reference external stylesheets */
:root {
    /* CSS variables */
}

/* All styles must be included in this block */
\`\`\`

Title: [concise title 3-100 characters based on the website's apparent purpose]

CRITICAL: Do NOT use <link rel="stylesheet" href="..."> - all CSS must be in the css code block above.`;

export default anthropic;
