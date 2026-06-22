# Implementation Plan: Dashboard Showcase Link

## Overview

This implementation adds a Community Showcase navigation link to the dashboard page, enabling authenticated users to discover community-shared websites. The implementation follows the existing dashboard patterns and design system, adding the link between the page title and "New Website" button with full accessibility and responsive support.

## Tasks

- [x] 1. Implement ShowcaseLink component in dashboard page
  - [x] 1.1 Add GlobeIcon component to dashboard page
    - Create SVG icon component matching the showcase page pattern
    - Include `aria-hidden="true"` attribute for accessibility
    - Use consistent sizing with `className` prop support
    - _Requirements: 1.3, 3.4_

  - [x] 1.2 Add ShowcaseLink component to dashboard page
    - Create link component using Next.js Link or anchor element
    - Set `href="/showcase"` for navigation to showcase route
    - Apply secondary/link styling with `text-muted-foreground`
    - Include hover states with `hover:bg-accent hover:text-accent-foreground`
    - Add focus styles with `focus-visible:ring-2 focus-visible:ring-ring`
    - Set `aria-label="Navigate to Community Showcase"` for screen readers
    - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.2, 3.1, 3.2, 3.3_

  - [x] 1.3 Implement responsive text behavior for ShowcaseLink
    - Add full "Community Showcase" text visible on screens ≥640px (`hidden sm:inline`)
    - Add screen-reader-only text for mobile (`sr-only sm:hidden` or accessible via aria-label)
    - Ensure icon is always visible across all viewport sizes
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 1.4 Add touch target sizing for mobile accessibility
    - Apply `min-h-[44px] min-w-[44px]` for WCAG touch target compliance
    - Include adequate padding with `px-3 py-2`
    - Ensure comfortable touch interaction on mobile devices
    - _Requirements: 4.4_

- [x] 2. Integrate ShowcaseLink into dashboard page header
  - [x] 2.1 Update page header layout structure
    - Modify the header flex container to accommodate three elements
    - Add `flex-wrap` and `gap-4` for responsive layout
    - Separate title section from action buttons section
    - _Requirements: 1.4_

  - [x] 2.2 Position ShowcaseLink between title and New Website button
    - Create action buttons container with `flex items-center gap-2`
    - Place ShowcaseLink before the "New Website" button in DOM order
    - Maintain visual hierarchy with secondary styling for showcase link
    - _Requirements: 1.4, 1.5_

- [x] 3. Checkpoint - Verify component rendering and layout
  - Ensure all components render correctly
  - Verify positioning matches design specification
  - Ask the user if questions arise

- [x] 4. Write tests for ShowcaseLink component
  - [x] 4.1 Write unit tests for component rendering
    - Test that link is visible in dashboard header (Req 1.1)
    - Test that text identifies destination as Community Showcase (Req 1.2)
    - Test that globe icon is present (Req 1.3)
    - Test that link has correct secondary styling (Req 1.5)
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [x] 4.2 Write unit tests for navigation behavior
    - Test that link has `href="/showcase"` (Req 2.1)
    - Test that link does not have `target="_blank"` (Req 2.2)
    - _Requirements: 2.1, 2.2_

  - [x] 4.3 Write unit tests for accessibility
    - Test keyboard focusability via Tab key (Req 3.1)
    - Test accessible name is present for screen readers (Req 3.2)
    - Test focus-visible ring class is applied (Req 3.3)
    - Test icon has `aria-hidden="true"` (Req 3.4)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.4 Write unit tests for responsive behavior
    - Test icon and text visible at desktop size (Req 4.1)
    - Test icon and text visible at tablet size (Req 4.2)
    - Test icon visible with accessible text at mobile (Req 4.3)
    - Test minimum touch target sizing classes (Req 4.4)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 5. Checkpoint - Verify layout positioning
  - [~] 5.1 Verify DOM order in dashboard header
    - Confirm link appears between title section and New Website button
    - Test that page structure matches design specification
    - _Requirements: 1.4_

  - [~] 5.2 Write integration test for dashboard page
    - Test authenticated user sees showcase link on dashboard
    - Test navigation flow from dashboard to showcase page
    - _Requirements: 1.1, 2.3_

- [~] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation is contained within `src/app/dashboard/page.tsx` only
- No new dependencies are required - uses existing Next.js Link, Tailwind CSS, and SVG patterns
- Property-based testing is not used for this feature as all requirements test specific UI states and behaviors, not universal properties
- The GlobeIcon pattern should match the existing icon pattern used in the dashboard page

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2"] },
    { "id": 4, "tasks": ["4.1", "4.2", "4.3", "4.4"] },
    { "id": 5, "tasks": ["5.1", "5.2"] }
  ]
}
```
