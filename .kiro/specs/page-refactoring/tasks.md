# Implementation Plan: Page Refactoring

## Overview

This implementation plan refactors large page components in the ai-website-generator project by:
1. Extracting inline components to separate reusable files
2. Creating custom hooks (useAutoSave, useBeautifyWorkflow)
3. Rewriting the useSSEStream hook to use eventsource-parser library
4. Reducing all large page files to under 300-400 lines while maintaining functionality

The implementation follows a layered approach: utilities → shared components → hooks → page refactoring.

## Tasks

- [x] 1. Create utilities and shared infrastructure
  - [x] 1.1 Create sanitizeFilename utility function
    - Create `src/utils/filename.ts` with sanitizeFilename function
    - Transform input: lowercase, remove invalid chars, replace spaces with hyphens, collapse consecutive hyphens, truncate to 50 chars
    - Return 'website' fallback for empty results
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 1.2 Write property test for sanitizeFilename
    - **Property 1: sanitizeFilename Transformation Invariants**
    - Create `src/utils/filename.test.ts` with fast-check property tests
    - Test: output contains only [a-z0-9-], no consecutive hyphens, max 50 chars, non-empty
    - **Validates: Requirements 3.3, 3.4**

- [x] 2. Create shared UI components
  - [x] 2.1 Create LoadingSpinner component
    - Create `src/components/common/LoadingSpinner.tsx`
    - Accept optional `message` prop (max 100 chars, default "Loading...")
    - Accept optional `fullScreen` prop for viewport height control
    - Render 40x40px spinner with primary color theme
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.2 Write unit tests for LoadingSpinner
    - Create tests for default message, custom message, message truncation
    - Test fullScreen height class application
    - Test spinner dimensions
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 2.3 Create WebsiteNotFound component
    - Create `src/components/common/WebsiteNotFound.tsx`
    - Accept optional `onNavigateBack` callback prop
    - Render icon, heading, description, and navigation button
    - Export WebsiteNotFoundProps interface
    - Default navigation to /dashboard when callback not provided
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.4 Write unit tests for WebsiteNotFound
    - Test all elements render correctly
    - Test callback invocation when provided
    - Test default navigation behavior
    - Test keyboard accessibility
    - _Requirements: 2.2, 2.3, 2.5_

  - [x] 2.5 Create WebsiteCardSkeleton component
    - Create `src/components/common/WebsiteCardSkeleton.tsx`
    - Render animated skeleton placeholder matching WebsiteCard dimensions
    - Use animate-pulse class for skeleton animation
    - _Requirements: 11.3, 11.4_

  - [x] 2.6 Update common components barrel export
    - Update `src/components/common/index.ts` with LoadingSpinner, WebsiteNotFound, WebsiteCardSkeleton exports
    - _Requirements: 1.6, 2.6_

- [ ] 3. Checkpoint - Verify shared components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create auth and layout components
  - [x] 4.1 Create GoogleSignInButton component
    - Create `src/components/auth/GoogleSignInButton.tsx`
    - Accept onClick, isLoading, and optional disabled props
    - Include GoogleIcon SVG internally
    - Render accessible button with loading state and aria-busy attribute
    - _Requirements: 9.1, 9.2_

  - [x] 4.2 Update auth components barrel export
    - Update `src/components/auth/index.ts` with GoogleSignInButton export
    - _Requirements: 9.2_

  - [x] 4.3 Create ShowcaseLink component
    - Create `src/components/layout/ShowcaseLink.tsx`
    - Render navigation link to /showcase with globe icon
    - Responsive text display (hidden on mobile)
    - Minimum 44x44px touch target for WCAG compliance
    - _Requirements: 10.2, 10.3_

  - [x] 4.4 Update layout components barrel export
    - Update `src/components/layout/index.ts` with ShowcaseLink export
    - _Requirements: 10.4_

- [x] 5. Create feature-specific components
  - [x] 5.1 Create ShowcaseWebsiteCard component
    - Create `src/components/ShowcaseWebsiteCard.tsx`
    - Accept website prop of type ShowcasedWebsite
    - Render card with thumbnail, title, creator name
    - Link to /view/{id} with target="_blank"
    - Use Next.js Image component with fallback to globe icon
    - _Requirements: 11.1, 11.2_

  - [x] 5.2 Create ShowcasePreview component
    - Create `src/components/ShowcasePreview.tsx`
    - Use useShowcaseWebsites hook with pageSize of 6
    - Include internal ShowcaseCard component
    - Handle loading skeleton and empty states
    - _Requirements: 9.3, 9.4_

- [ ] 6. Checkpoint - Verify all components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Rewrite useSSEStream hook with eventsource-parser
  - [x] 7.1 Rewrite useSSEStream hook implementation
    - Delete existing implementation and create new at `src/hooks/useSSEStream.ts`
    - Import createParser from eventsource-parser
    - Call parser.feed(decodedChunk) for each stream chunk
    - Call parser.reset({ consume: true }) on stream completion
    - Accept onEvent, onTextChunk, onResult callbacks
    - Expose result state initialized to null
    - Maintain existing return interface: isStreaming, error, streamingContent, start, cancel
    - Maintain abort behavior: cancel() doesn't set error state
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 12.1, 12.2, 12.3, 12.4_

  - [x] 7.2 Write property test for useSSEStream parser completion
    - **Property 2: useSSEStream Parser Completion**
    - Test parser.reset({ consume: true }) is called on stream completion
    - **Validates: Requirements 4.5, 12.3**

  - [x] 7.3 Write property test for useSSEStream callback invocations
    - **Property 3: useSSEStream Callback Invocations**
    - Test onEvent invoked for every parsed event
    - Test onTextChunk invoked for text events with content
    - Test onResult invoked when done event has result
    - Test result state updated from done event
    - **Validates: Requirements 4.6, 4.7, 4.8, 4.9**

  - [x] 7.4 Write property test for useSSEStream cancel behavior
    - **Property 4: useSSEStream Cancel Behavior**
    - Test cancel() sets isStreaming=false immediately
    - Test cancel() does NOT set error state
    - **Validates: Requirements 4.11**

  - [x] 7.5 Update useSSEStream unit tests
    - Update `src/hooks/useSSEStream.test.ts` for eventsource-parser implementation
    - Verify createParser usage
    - Verify parser.reset({ consume: true }) on completion
    - Test onTextChunk, onResult callbacks and result state
    - Maintain existing behavior coverage
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 8. Create useAutoSave hook
  - [x] 8.1 Create useAutoSave hook implementation
    - Create `src/hooks/useAutoSave.ts`
    - Accept generic type parameter for values
    - Accept config: currentValues, originalValues, onSave callback, delay (100-30000ms)
    - Return hasUnsavedChanges, isSaving, saveError, lastSaved, save function
    - Use deep equality comparison (JSON.stringify)
    - Implement debounced save with configurable delay
    - Reset timeout on value changes
    - Serialize concurrent saves (wait for current to complete)
    - Clean up timeout on unmount
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [x] 8.2 Write property test for useAutoSave debounced save behavior
    - **Property 5: useAutoSave Debounced Save Behavior**
    - Create `src/hooks/useAutoSave.test.ts`
    - Test save invoked once after delay from last change
    - Test save receives most recent values
    - Test no save when values return to original before delay
    - **Validates: Requirements 5.4, 5.7**

  - [x] 8.3 Write property test for useAutoSave success state
    - **Property 6: useAutoSave Success State**
    - Test lastSaved updated on successful save
    - Test hasUnsavedChanges set to false
    - Test saveError cleared
    - **Validates: Requirements 5.5**

  - [x] 8.4 Write property test for useAutoSave error state
    - **Property 7: useAutoSave Error State**
    - Test saveError set on failed save
    - Test hasUnsavedChanges remains true
    - Test lastSaved not updated
    - **Validates: Requirements 5.6**

  - [x] 8.5 Write property test for useAutoSave save serialization
    - **Property 8: useAutoSave Save Serialization**
    - Test saves are never concurrent
    - Test waits for current save before new save
    - **Validates: Requirements 5.8**

- [ ] 9. Checkpoint - Verify hooks implementation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Create useBeautifyWorkflow hook
  - [x] 10.1 Create useBeautifyWorkflow hook implementation
    - Create `src/hooks/useBeautifyWorkflow.ts`
    - Accept config: websiteId, currentHtml, currentCss, originalPrompt
    - Manage states: isBeautifying, beautifyStage, streamingContent, beautifiedHtml, beautifiedCss, beautifyError
    - Manage dialog states: showBeautifyOptions, showPreviewComparison, showSaveOptions
    - Use useSSEStream internally for stream processing
    - Handle stage transitions: analyzing → completing/enhancing → finalizing
    - Expose: openOptionsDialog, startBeautify, cancelBeautify
    - Expose dialog handlers: handleConfirm, handleAccept, handleReject, handleRetry, handleDismiss
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12, 6.13, 6.14, 6.15_

  - [x] 10.2 Write property test for useBeautifyWorkflow cancel behavior
    - **Property 9: useBeautifyWorkflow Cancel Behavior**
    - Create `src/hooks/useBeautifyWorkflow.test.ts`
    - Test cancelBeautify aborts request
    - Test isBeautifying set to false
    - Test beautifyError not set on cancel
    - **Validates: Requirements 6.6**

  - [x] 10.3 Write property test for useBeautifyWorkflow state machine
    - **Property 10: useBeautifyWorkflow State Machine**
    - Test stage transitions: analyzing → completing/enhancing → finalizing
    - Test beautifiedHtml/beautifiedCss populated on success
    - Test showPreviewComparison set true on success
    - Test beautifyError set on failure
    - **Validates: Requirements 6.13, 6.14, 6.15**

  - [x] 10.4 Write unit tests for useBeautifyWorkflow
    - Test initial state values
    - Test dialog state management
    - Test all handler functions
    - _Requirements: 6.3, 6.4, 6.7, 6.8, 6.9, 6.10, 6.11_

- [ ] 11. Checkpoint - Verify all hooks complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Refactor Website page
  - [x] 12.1 Refactor Website page to use extracted components and hooks
    - Update `src/app/website/[id]/page.tsx`
    - Import LoadingSpinner from src/components/common
    - Import WebsiteNotFound from src/components/common
    - Import sanitizeFilename from src/utils/filename
    - Import and use useAutoSave hook (2000ms delay)
    - Import and use useBeautifyWorkflow hook
    - Remove inline component definitions
    - Maintain all existing functionality
    - Target: under 400 lines
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 12.2 Verify Website page line count and functionality
    - Verify file is under 400 lines
    - Verify iframe preview with viewport mode switching works
    - Verify HTML/CSS editing with live preview works
    - Verify download functionality works
    - Verify showcase toggle works
    - Verify beautification workflow works
    - Verify fullscreen preview mode works
    - Verify unsaved changes warning works
    - _Requirements: 7.6, 7.7_

- [x] 13. Refactor Generate page
  - [x] 13.1 Refactor Generate page to use useSSEStream hook
    - Update `src/app/generate/page.tsx`
    - Remove SSE-specific code from generateFromText function
    - Remove SSE-specific code from generateFromScreenshot function
    - Use useSSEStream hook for both generation methods
    - Pass stage detection via onTextChunk callback (detect '```css' and 'Title:')
    - Receive results via onResult callback or result state
    - Target: under 400 lines
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 12.5_

  - [x] 13.2 Verify Generate page line count and functionality
    - Verify file is under 400 lines
    - Verify mode switching between text and screenshot works
    - Verify input validation before generation
    - Verify cancel button stops generation within 5 seconds
    - Verify navigation to preview page after success
    - Verify error display preserves input for retry
    - _Requirements: 8.6, 8.7, 8.8_

- [ ] 14. Checkpoint - Verify core page refactoring
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Refactor Login page
  - [x] 15.1 Refactor Login page to use extracted components
    - Update `src/app/page.tsx`
    - Import LoadingSpinner from src/components/common
    - Import GoogleSignInButton from src/components/auth
    - Import ShowcasePreview from src/components
    - Remove inline component definitions (GoogleIcon, GoogleSignInButton, ErrorAlert, ShowcaseCard, CommunityShowcase)
    - Target: under 300 lines
    - _Requirements: 9.5, 9.6, 9.7, 9.8_

  - [x] 15.2 Verify Login page line count and functionality
    - Verify file is under 300 lines
    - Verify Google OAuth sign-in works
    - Verify error display with dismiss works
    - Verify redirect after authentication
    - Verify Community Showcase preview displays
    - _Requirements: 9.8, 9.9_

- [x] 16. Refactor Dashboard page
  - [x] 16.1 Refactor Dashboard page to use extracted components
    - Update `src/app/dashboard/page.tsx`
    - Import LoadingSpinner from src/components/common
    - Import ShowcaseLink from src/components/layout
    - Remove inline LoadingSpinner and ShowcaseLink definitions
    - Target: under 350 lines
    - _Requirements: 10.1, 10.4, 10.5_

  - [x] 16.2 Verify Dashboard page line count and functionality
    - Verify file is under 350 lines
    - Verify website grid with WebsiteCard works
    - Verify pagination works
    - Verify delete confirmation dialog works
    - Verify empty state displays
    - Verify error state with retry works
    - _Requirements: 10.5, 10.6_

- [x] 17. Refactor Showcase page
  - [x] 17.1 Refactor Showcase page to use extracted components
    - Update `src/app/showcase/page.tsx`
    - Import ShowcaseWebsiteCard from src/components
    - Import WebsiteCardSkeleton from src/components/common
    - Remove inline WebsiteCard, WebsiteCardSkeleton, EmptyState definitions
    - Target: under 200 lines
    - _Requirements: 11.5, 11.6, 11.7_

  - [x] 17.2 Verify Showcase page line count and functionality
    - Verify file is under 200 lines
    - Verify website grid works
    - Verify pagination works
    - Verify empty state displays
    - Verify error state with retry works
    - Verify results count displays
    - _Requirements: 11.7, 11.8_

- [ ] 18. Final verification and cleanup
  - [ ] 18.1 Verify no manual SSE parsing remains
    - Search codebase for string splitting on newlines for SSE parsing
    - Search for regex matching 'event:' or 'data:' prefixes
    - Verify all SSE handling uses eventsource-parser
    - _Requirements: 12.5, 12.6_

  - [ ] 18.2 Verify all existing tests pass
    - Run full test suite
    - Ensure useBeautifySave.test.ts passes
    - Ensure useShowcaseWebsites.test.ts passes
    - Ensure useWebsites.test.ts passes
    - Ensure WebsiteCard.test.tsx passes
    - _Requirements: 13.6_

  - [ ] 18.3 Verify all line count targets met
    - website/[id]/page.tsx: < 400 lines
    - generate/page.tsx: < 400 lines
    - page.tsx (Login): < 300 lines
    - dashboard/page.tsx: < 350 lines
    - showcase/page.tsx: < 200 lines
    - _Requirements: 7.6, 8.6, 9.8, 10.5, 11.7_

- [ ] 19. Final checkpoint - Complete verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based test tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties from the design
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout; all implementations follow TypeScript patterns
- Follow Next.js breaking changes guidance in node_modules/next/dist/docs/ for any router-related code
- Use eventsource-parser library consistently for all SSE parsing (no manual line-based parsing)
- Deep equality comparison uses JSON.stringify for the useAutoSave hook

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "2.3", "2.5"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.6", "4.1", "4.3", "5.1", "5.2"] },
    { "id": 3, "tasks": ["4.2", "4.4", "7.1"] },
    { "id": 4, "tasks": ["7.2", "7.3", "7.4", "7.5", "8.1"] },
    { "id": 5, "tasks": ["8.2", "8.3", "8.4", "8.5", "10.1"] },
    { "id": 6, "tasks": ["10.2", "10.3", "10.4"] },
    { "id": 7, "tasks": ["12.1", "13.1", "15.1", "16.1", "17.1"] },
    { "id": 8, "tasks": ["12.2", "13.2", "15.2", "16.2", "17.2"] },
    { "id": 9, "tasks": ["18.1", "18.2", "18.3"] }
  ]
}
```
