# Implementation Plan: App Footer Copyright

## Overview

This plan implements the AppFooter component that displays copyright information, GitHub and LinkedIn social links with call-to-action text. The component follows the established patterns from AppHeader.tsx, uses TypeScript with JSDoc documentation, Tailwind CSS with theme-aware CSS variables, and proper accessibility attributes.

The implementation is organized into:
1. Core component implementation with icon components
2. Layout integration and export setup
3. Unit tests for verification

## Tasks

- [ ] 1. Create AppFooter component with icons
  - [x] 1.1 Create GitHubIcon and LinkedInIcon inline SVG components
    - Create icon components following the pattern in AppHeader.tsx (LogOutIcon, SparklesIcon)
    - Use `aria-hidden="true"` for decorative icons
    - Accept `className` prop for styling flexibility
    - _Requirements: 1.2, 1.3, 4.3, 4.4_

  - [x] 1.2 Implement AppFooter component structure
    - Create `src/components/layout/AppFooter.tsx`
    - Define `AppFooterProps` interface with optional `className` prop
    - Use semantic `<footer>` element with `role="contentinfo"`
    - Add JSDoc documentation referencing requirements
    - Compute current year dynamically using `new Date().getFullYear()`
    - _Requirements: 1.1, 4.5, 6.1_

  - [~] 1.3 Implement copyright section
    - Display copyright symbol, current year, and developer name "Taras Moskovych"
    - Use theme-aware text color classes (`text-muted-foreground`)
    - _Requirements: 1.1, 3.1, 3.3_

  - [~] 1.4 Implement social links with CTAs
    - Create GitHub link to `https://github.com/TarasMoskovych/ai-webstite-generator`
    - Create LinkedIn link to `https://www.linkedin.com/in/taras-moskovych/`
    - Add `target="_blank"` for new tab behavior
    - Add `rel="noopener noreferrer"` for security
    - Add descriptive `aria-label` attributes for accessibility
    - Display "Star on GitHub" and "Connect on LinkedIn" call-to-action text
    - Use theme-aware hover styles and transitions
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4_

  - [~] 1.5 Implement responsive design
    - Ensure proper layout on mobile (320px+) using Tailwind responsive classes
    - Stack elements vertically on mobile, horizontal on larger screens
    - Ensure touch-friendly link targets (min 44x44px) using padding
    - Use `flex` layout with responsive gap and direction
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 2. Integrate with layout system
  - [~] 2.1 Export AppFooter from layout barrel
    - Add `export { AppFooter } from './AppFooter';` to `src/components/layout/index.ts`
    - Add `export type { AppFooterProps } from './AppFooter';`
    - _Requirements: 6.2_

  - [~] 2.2 Add AppFooter to dashboard layout
    - Import AppFooter in the dashboard page or layout
    - Position footer after main content area
    - Ensure footer is NOT fixed/sticky (flows with content)
    - _Requirements: 2.1, 6.3, 6.4_

- [~] 3. Checkpoint - Verify component renders correctly
  - Ensure the build passes with no TypeScript errors
  - Verify footer appears on dashboard page
  - Verify footer does NOT appear on /view/[id] routes (ViewLayout excludes it by design)
  - Ask the user if questions arise

- [ ] 4. Write unit tests
  - [~] 4.1 Create test file and setup
    - Create `src/components/layout/__tests__/AppFooter.test.tsx`
    - Set up imports for vitest, testing-library, and AppFooter component
    - _Requirements: All_

  - [~] 4.2 Write copyright display tests
    - Test that current year is displayed in copyright
    - Test that developer name "Taras Moskovych" is displayed
    - _Requirements: 1.1_

  - [~] 4.3 Write social links tests
    - Test GitHub link has correct href
    - Test GitHub link has `target="_blank"`
    - Test GitHub link has `rel="noopener noreferrer"`
    - Test GitHub link has descriptive aria-label
    - Test LinkedIn link has correct href
    - Test LinkedIn link has `target="_blank"`
    - Test LinkedIn link has `rel="noopener noreferrer"`
    - Test LinkedIn link has descriptive aria-label
    - _Requirements: 1.2, 1.3, 4.1, 4.2, 4.3, 4.4_

  - [~] 4.4 Write call-to-action text tests
    - Test "Star on GitHub" text is displayed
    - Test "Connect on LinkedIn" text is displayed
    - _Requirements: 1.4, 1.5_

  - [~] 4.5 Write accessibility and semantic tests
    - Test footer uses semantic `<footer>` element
    - Test footer has `role="contentinfo"`
    - Test icons have `aria-hidden="true"`
    - _Requirements: 4.5_

  - [~] 4.6 Write className prop test
    - Test that custom className is applied to footer element
    - _Requirements: Component API_

- [~] 5. Final checkpoint - Ensure all tests pass
  - Run `npm run test` to verify all tests pass
  - Run `npm run lint` to verify no linting errors
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property-based tests are NOT included because the design document explicitly states they do not apply to this presentational component with static content
- The component uses Vitest + React Testing Library for unit tests (existing project pattern)
- The footer is automatically excluded from /view/[id] routes because ViewLayout does not include layout components

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "1.4", "1.5"] },
    { "id": 3, "tasks": ["2.1", "2.2"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "4.4", "4.5", "4.6"] }
  ]
}
```
