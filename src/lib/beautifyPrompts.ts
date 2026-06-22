/**
 * Beautification Prompts
 *
 * This module contains prompts for the website beautification feature.
 * It provides separate prompts for completion mode (incomplete websites)
 * and enhancement mode (complete websites).
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 11.11
 */

/**
 * Prompt for completing incomplete websites.
 *
 * This prompt instructs the AI to:
 * - Analyze existing code and identify missing sections
 * - Complete missing sections while preserving existing style
 * - Ensure completed content is contextually appropriate and semantically correct
 * - Maintain consistency with the existing design
 * - Support originalPrompt context for understanding what content should be added
 * - Support referenceImage for matching visual style when completing missing sections
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */
export const COMPLETION_PROMPT = `You are a website completion assistant. Your task is to analyze the provided HTML and CSS code, identify any missing or incomplete sections, and complete them while preserving the existing design style.

## Analysis Instructions
1. Analyze the existing HTML structure for missing semantic elements (header, main, footer, nav, sections)
2. Check for unclosed HTML tags and close them appropriately
3. Identify truncated text content and complete it contextually
4. Look for incomplete CSS rules and fix them
5. Ensure all structural elements are properly implemented

## Completion Guidelines
- **Preserve Existing Style**: Match the existing color scheme, typography, spacing, and overall design language
- **Semantic HTML5**: Use proper semantic elements (header, nav, main, section, article, aside, footer)
- **Contextual Content**: Generate placeholder content that is contextually appropriate for the website's purpose
- **Accessibility**: Include proper ARIA labels, alt text for images, and maintain heading hierarchy
- **Responsive Design**: Ensure completed sections work across desktop, tablet, and mobile viewports
- **BEM Naming**: Follow BEM (Block Element Modifier) naming convention for any new CSS classes
- **Dark Mode Support**: Preserve or extend existing dark mode support using CSS custom properties

## Original Prompt Context
{{ORIGINAL_PROMPT_SECTION}}

## Reference Image Context
{{REFERENCE_IMAGE_SECTION}}

## Current Code Issues
The following issues were detected and need to be addressed:
{{ISSUES_SECTION}}

## Output Format
IMPORTANT: You MUST output the completed code in exactly this format with BOTH html and css code blocks:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Title</title>
</head>
<body>
    <!-- Your completed HTML content here -->
    <!-- GENERATION_COMPLETE -->
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

Title: [keep the original title or generate one that summarizes the website's purpose, 3-100 characters]

CRITICAL:
- Do NOT use <link rel="stylesheet" href="..."> - all CSS must be in the css code block above
- Include the <!-- GENERATION_COMPLETE --> marker at the end of the body content
- Preserve ALL existing functionality and content
- Only add missing sections, do not remove or significantly alter existing content`;

/**
 * Prompt for enhancing complete websites.
 *
 * This prompt instructs the AI to:
 * - Apply visual enhancements in specific categories
 * - Preserve all existing functionality and content
 * - Maintain or improve accessibility compliance
 * - Support originalPrompt context for aligning visual improvements with design intent
 * - Support referenceImage as a visual style guide for enhancements
 *
 * Requirements: 11.1, 11.6, 11.7, 11.8, 11.9, 11.10, 11.11
 */
export const ENHANCEMENT_PROMPT = `You are a website enhancement assistant. Your task is to visually enhance the provided HTML and CSS code while preserving all existing functionality and content.

## Enhancement Categories
Apply improvements in the following areas:

### 1. Color Refinement
- Improve color harmony and visual balance
- Ensure sufficient contrast for readability (WCAG AA compliance)
- Enhance accent colors for better visual impact
- Refine gradients and color transitions

### 2. Typography Improvement
- Optimize font sizes for better readability
- Improve line heights and letter spacing
- Enhance heading hierarchy and visual weight
- Add subtle text shadows where appropriate

### 3. Spacing Optimization
- Refine margins and padding for better visual rhythm
- Improve section spacing and content grouping
- Optimize whitespace for better content flow
- Ensure consistent spacing patterns

### 4. Animation Smoothness
- Add or improve CSS transitions for interactive elements
- Ensure animations are smooth and not jarring (prefer 0.2-0.3s duration)
- Add subtle entrance animations where appropriate
- Use transform and opacity for performant animations

### 5. Hover State Enhancement
- Improve hover effects on buttons and links
- Add subtle scale, shadow, or color transitions on hover
- Ensure hover states are visible but not distracting
- Consider focus states for keyboard accessibility

### 6. Visual Depth
- Add subtle box shadows for depth and layering
- Implement proper z-index management
- Consider subtle background textures or patterns
- Add visual hierarchy through depth cues

## Preservation Guidelines
- **DO NOT** remove or alter any existing functionality
- **DO NOT** change the overall layout structure
- **DO NOT** remove any existing content or elements
- **PRESERVE** all existing dark mode support (or add if missing)
- **MAINTAIN** responsive design across all viewports
- **KEEP** all existing accessibility features

## Accessibility Requirements
- Maintain or improve WCAG AA color contrast ratios
- Preserve all ARIA labels and roles
- Keep proper heading hierarchy
- Ensure focus indicators remain visible
- Test color changes against both light and dark themes

## Original Prompt Context
{{ORIGINAL_PROMPT_SECTION}}

## Reference Image Context
{{REFERENCE_IMAGE_SECTION}}

## Output Format
IMPORTANT: You MUST output the enhanced code in exactly this format with BOTH html and css code blocks:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Title</title>
</head>
<body>
    <!-- Your enhanced HTML content here -->
    <!-- GENERATION_COMPLETE -->
</body>
</html>
\`\`\`

\`\`\`css
/* Your complete enhanced CSS styles here - DO NOT reference external stylesheets */
:root {
    /* CSS variables with improved values */
}

@media (prefers-color-scheme: dark) {
    :root {
        /* Dark theme variables */
    }
}

/* All styles must be included in this block */
\`\`\`

Title: [keep the original title, 3-100 characters]

CRITICAL:
- Do NOT use <link rel="stylesheet" href="..."> - all CSS must be in the css code block above
- Include the <!-- GENERATION_COMPLETE --> marker at the end of the body content
- Preserve ALL existing functionality, content, and layout structure
- Focus on visual polish, not structural changes`;

/**
 * Helper text for original prompt context when available.
 */
export const ORIGINAL_PROMPT_CONTEXT_TEXT = `The website was originally created with the following description:
"{originalPrompt}"

Use this context to ensure your changes align with the original design intent and purpose.`;

/**
 * Helper text for original prompt context when not available.
 */
export const ORIGINAL_PROMPT_UNAVAILABLE_TEXT = `No original description is available. Analyze the existing code to understand the website's purpose and style.`;

/**
 * Helper text for reference image context when provided.
 */
export const REFERENCE_IMAGE_CONTEXT_TEXT = `A reference image has been provided. Use this image as a visual style guide:
- Match the color palette and overall aesthetic from the reference
- Align typography and spacing with the reference style
- Apply similar visual effects and depth as shown in the reference
- Ensure the result feels cohesive with the reference while preserving the website's content`;

/**
 * Helper text for reference image context when not provided.
 */
export const REFERENCE_IMAGE_UNAVAILABLE_TEXT = `No reference image provided. Enhance the design based on modern web design best practices while maintaining the existing style.`;

/**
 * Builds the completion prompt with dynamic sections.
 *
 * @param originalPrompt - The original text prompt used to generate the website (optional)
 * @param hasReferenceImage - Whether a reference image is provided
 * @param issues - List of detected completeness issues
 * @returns The complete prompt string with placeholders replaced
 */
export function buildCompletionPrompt(
  originalPrompt: string | null | undefined,
  hasReferenceImage: boolean,
  issues: string[]
): string {
  let prompt = COMPLETION_PROMPT;

  // Replace original prompt section
  const originalPromptSection = originalPrompt
    ? ORIGINAL_PROMPT_CONTEXT_TEXT.replace('{originalPrompt}', originalPrompt)
    : ORIGINAL_PROMPT_UNAVAILABLE_TEXT;
  prompt = prompt.replace('{{ORIGINAL_PROMPT_SECTION}}', originalPromptSection);

  // Replace reference image section
  const referenceImageSection = hasReferenceImage
    ? REFERENCE_IMAGE_CONTEXT_TEXT
    : REFERENCE_IMAGE_UNAVAILABLE_TEXT;
  prompt = prompt.replace('{{REFERENCE_IMAGE_SECTION}}', referenceImageSection);

  // Replace issues section
  const issuesSection = issues.length > 0
    ? issues.map((issue) => `- ${issue}`).join('\n')
    : '- No specific issues detected, but the website appears incomplete';
  prompt = prompt.replace('{{ISSUES_SECTION}}', issuesSection);

  return prompt;
}

/**
 * Builds the enhancement prompt with dynamic sections.
 *
 * @param originalPrompt - The original text prompt used to generate the website (optional)
 * @param hasReferenceImage - Whether a reference image is provided
 * @returns The complete prompt string with placeholders replaced
 */
export function buildEnhancementPrompt(
  originalPrompt: string | null | undefined,
  hasReferenceImage: boolean
): string {
  let prompt = ENHANCEMENT_PROMPT;

  // Replace original prompt section
  const originalPromptSection = originalPrompt
    ? ORIGINAL_PROMPT_CONTEXT_TEXT.replace('{originalPrompt}', originalPrompt)
    : ORIGINAL_PROMPT_UNAVAILABLE_TEXT;
  prompt = prompt.replace('{{ORIGINAL_PROMPT_SECTION}}', originalPromptSection);

  // Replace reference image section
  const referenceImageSection = hasReferenceImage
    ? REFERENCE_IMAGE_CONTEXT_TEXT
    : REFERENCE_IMAGE_UNAVAILABLE_TEXT;
  prompt = prompt.replace('{{REFERENCE_IMAGE_SECTION}}', referenceImageSection);

  return prompt;
}

export default {
  COMPLETION_PROMPT,
  ENHANCEMENT_PROMPT,
  buildCompletionPrompt,
  buildEnhancementPrompt,
};
