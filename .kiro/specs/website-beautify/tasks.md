# Implementation Plan: Website Beautify Feature

## Overview

This implementation plan covers the Website Beautify feature, which provides intelligent website enhancement through a single "Beautify" button. The feature detects website completeness, handles incomplete websites by completing them first, then applies visual enhancements. It includes reference image support, real-time streaming progress, before/after comparison, and version management.

The implementation follows the existing Next.js App Router architecture with TypeScript, using the established patterns for SSE streaming, Firebase integration, and service-based architecture.

## Tasks

- [x] 1. Extend data models and types
  - [x] 1.1 Add `originalPrompt` field to GeneratedWebsite type
    - Update `src/types/website.ts` to add `originalPrompt: string | null` field
    - Update `CreateWebsiteData` and `UpdateWebsiteData` types accordingly
    - _Requirements: 0.1, 0.2, 0.3, 0.4_

  - [x] 1.2 Create beautify-specific types and interfaces
    - Create `src/types/beautify.ts` with `BeautifyStreamRequest`, `BeautifyStreamEvent`, `CompletenessResult`, `BeautifyOptions` interfaces
    - Define `BeautifyEventType` and `BeautificationMode` types
    - _Requirements: 4.4, 4.5, 4.7_

- [x] 2. Implement CompletenessDetector service
  - [x] 2.1 Create CompletenessDetector with generation marker detection
    - Create `src/services/beautify/completenessDetector.ts`
    - Implement `GENERATION_MARKER` constant (`<!-- GENERATION_COMPLETE -->`)
    - Implement marker detection logic that classifies as "complete" when marker present
    - _Requirements: 1.2, 1.3_

  - [x] 2.2 Write property test for generation marker detection (Property 4)
    - **Property 4: Generation Marker Implies Complete Classification**
    - **Validates: Requirements 1.2, 1.3**

  - [x] 2.3 Implement structural element detection
    - Add detection for header, main, and footer elements
    - Classify as incomplete when structural elements are missing
    - _Requirements: 1.5, 1.6_

  - [x] 2.4 Write property test for missing structural elements (Property 5)
    - **Property 5: Missing Structural Elements Implies Incomplete**
    - **Validates: Requirements 1.5, 1.6**

  - [x] 2.5 Implement truncation detection
    - Detect unclosed HTML tags, cut-off text, and incomplete CSS rules
    - _Requirements: 1.7, 1.8_

  - [x] 2.6 Write property test for truncation detection (Property 6)
    - **Property 6: Truncation Detection Implies Incomplete**
    - **Validates: Requirements 1.7, 1.8**

  - [x] 2.7 Implement the main `detectCompleteness` function
    - Combine marker detection, structural analysis, and truncation detection
    - Return `CompletenessResult` with classification and issues list
    - Ensure analysis completes within 2 seconds
    - _Requirements: 1.1, 1.9_

  - [x] 2.8 Write property test for completeness result format (Property 7)
    - **Property 7: Completeness Detection Returns Classification and Issues**
    - **Validates: Requirements 1.9**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement BeautifyService
  - [x] 4.1 Create beautify prompts
    - Create `src/lib/beautifyPrompts.ts` with `COMPLETION_PROMPT` and `ENHANCEMENT_PROMPT`
    - Include instructions for maintaining consistency, semantic HTML5, accessibility
    - Support originalPrompt and referenceImage context in prompts
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 11.11_

  - [x] 4.2 Create BeautifyService with streaming support
    - Create `src/services/beautify/beautifyService.ts`
    - Implement `beautifyWebsiteStream` async generator function
    - Support AbortSignal for cancellation
    - Emit proper stream events (start, mode, text, done, error)
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [-] 4.3 Implement completion mode logic
    - Handle incomplete websites by completing missing sections
    - Maintain existing design style, close unclosed tags, complete truncated text
    - Add generation marker to completed HTML
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 4.4 Write property test for generation marker in completed websites (Property 8)
    - **Property 8: Completed Websites Contain Generation Marker**
    - **Validates: Requirements 2.8**

  - [x] 4.5 Implement enhancement mode logic
    - Apply visual enhancements: color harmony, typography, animations, spacing, hover states, depth
    - Preserve layout structure, maintain WCAG AA accessibility, preserve responsive design
    - Support dark mode preservation/addition
    - _Requirements: 3.4, 3.5, 3.6, 3.7_

  - [x] 4.6 Create beautify service index file
    - Create `src/services/beautify/index.ts` to export all beautify services
    - _Requirements: 2.1, 3.1_

- [x] 5. Implement Beautify API endpoint
  - [x] 5.1 Create `/api/beautify/stream` route
    - Create `src/app/api/beautify/stream/route.ts`
    - Set `maxDuration = 120` seconds
    - Implement SSE response with Content-Type `text/event-stream`
    - _Requirements: 4.1, 4.9, 4.11_

  - [x] 5.2 Implement authentication middleware
    - Verify Firebase authentication via Bearer token
    - Return 401 status for invalid/missing authentication
    - _Requirements: 4.2, 4.3_

  - [x] 5.3 Write property test for authentication requirement (Property 9)
    - **Property 9: Authentication Required for API Access**
    - **Validates: Requirements 4.2, 4.3**

  - [x] 5.4 Implement request validation
    - Validate required fields: websiteId, html, css
    - Return 400 status for missing required fields
    - _Requirements: 4.4, 4.5_

  - [x] 5.5 Write property test for required fields validation (Property 10)
    - **Property 10: Required Fields Validation**
    - **Validates: Requirements 4.4, 4.5**

  - [x] 5.6 Implement reference image validation
    - Validate MIME type is image/png, image/jpeg, or image/webp
    - Return 400 status for invalid MIME type
    - _Requirements: 4.7, 4.8_

  - [x] 5.7 Write property test for MIME type validation (Property 11)
    - **Property 11: Reference Image MIME Type Validation**
    - **Validates: Requirements 4.7, 4.8**

  - [x] 5.8 Write property test for SSE response format (Property 12)
    - **Property 12: SSE Response Format**
    - **Validates: Requirements 4.9**

  - [x] 5.9 Implement originalPrompt fetching
    - Fetch originalPrompt from Firestore if not provided in request
    - Include originalPrompt in beautification context
    - _Requirements: 4.6, 0.5, 0.6_

  - [x] 5.10 Wire up completeness detection and beautification service
    - Call CompletenessDetector to analyze website
    - Call BeautifyService with appropriate mode
    - Stream events to client
    - _Requirements: 4.10_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Update website repository for originalPrompt storage
  - [x] 7.1 Update websiteRepository to store originalPrompt
    - Modify `src/services/websiteRepository.ts` to handle originalPrompt field
    - Update create and update methods to include originalPrompt
    - _Requirements: 0.1, 0.4_

  - [x] 7.2 Write property test for originalPrompt round-trip (Property 1)
    - **Property 1: Original Prompt Storage Round-Trip**
    - **Validates: Requirements 0.1, 0.4**

  - [x] 7.3 Write property test for originalPrompt length validation (Property 2)
    - **Property 2: Original Prompt Length Validation**
    - **Validates: Requirements 0.2**

  - [x] 7.4 Write property test for screenshot generation (Property 3)
    - **Property 3: Screenshot Generation Excludes Original Prompt**
    - **Validates: Requirements 0.3**

  - [x] 7.5 Update generation services to store originalPrompt
    - Modify text generation to store prompt in originalPrompt field
    - Modify screenshot generation to set originalPrompt to null
    - _Requirements: 0.1, 0.3_

- [ ] 8. Implement UI Components - BeautifyButton
  - [x] 8.1 Create BeautifyButton component
    - Create `src/components/beautify/BeautifyButton.tsx`
    - Support primary, secondary, and icon-only variants
    - Display sparkle/wand icon
    - Handle loading state with spinner
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [-] 8.2 Write unit tests for BeautifyButton
    - Test rendering, variants, loading state, disabled state
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 9. Implement UI Components - BeautifyOptionsDialog
  - [x] 9.1 Create BeautifyOptionsDialog component
    - Create `src/components/beautify/BeautifyOptionsDialog.tsx`
    - Display "Quick Beautify" and "Beautify with Reference Image" options
    - Include Cancel button
    - _Requirements: 0.1.1, 0.1.2, 0.1.3, 0.1.9_

  - [-] 9.2 Implement image upload with drag-and-drop
    - Support PNG, JPG, JPEG, WebP formats
    - Validate 10MB size limit
    - Show image preview before confirmation
    - _Requirements: 0.1.4, 0.1.5, 0.1.6, 0.1.7_

  - [x] 9.3 Write property test for image size validation (Property 13)
    - **Property 13: Image Upload Size Validation**
    - **Validates: Requirements 0.1.6**

  - [x] 9.4 Write property test for image format acceptance (Property 14)
    - **Property 14: Image Format Acceptance**
    - **Validates: Requirements 0.1.5**

- [ ] 10. Implement UI Components - BeautifyLoadingOverlay
  - [x] 10.1 Create BeautifyLoadingOverlay component
    - Create `src/components/beautify/BeautifyLoadingOverlay.tsx`
    - Display mode indicators: "Analyzing completeness...", "Completing missing sections...", "Enhancing design...", "Finalizing..."
    - Show elapsed time counter
    - _Requirements: 5.5, 5.6, 9.3, 9.7_

  - [-] 10.2 Implement streaming preview
    - Show raw streaming content in collapsible preview area
    - Auto-scroll to show latest content
    - _Requirements: 9.1, 9.2_

  - [x] 10.3 Implement cancel functionality
    - Provide cancel button
    - Abort ongoing request within 5 seconds
    - _Requirements: 9.4, 9.5_

  - [x] 10.4 Write property test for cancellation behavior (Property 18)
    - **Property 18: Cancellation Preserves Original Content**
    - **Validates: Requirements 9.6**

- [~] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement UI Components - PreviewComparison
  - [x] 12.1 Create PreviewComparison component
    - Create `src/components/beautify/PreviewComparison.tsx`
    - Display two side-by-side iframe previews
    - Label left as "Original" and right as "Beautified"
    - _Requirements: 7.1, 7.2_

  - [x] 12.2 Implement synchronized scrolling
    - Synchronize scroll position between both iframes
    - _Requirements: 7.3_

  - [x] 12.3 Write property test for synchronized scrolling (Property 15)
    - **Property 15: Synchronized Scroll Behavior**
    - **Validates: Requirements 7.3**

  - [x] 12.4 Implement viewport mode controls
    - Support desktop, tablet, mobile viewport modes
    - Apply to both previews simultaneously
    - _Requirements: 7.4_

  - [x] 12.5 Write property test for viewport mode (Property 16)
    - **Property 16: Viewport Mode Applies to Both Previews**
    - **Validates: Requirements 7.4**

  - [x] 12.6 Implement Accept/Reject functionality
    - Add "Accept Changes" and "Reject Changes" buttons
    - Update code editor on accept, preserve original on reject
    - _Requirements: 7.5, 7.6, 7.7, 7.8, 7.9_

  - [x] 12.7 Implement comparison mode toggle
    - Support side-by-side and overlay comparison modes
    - _Requirements: 7.10_

- [x] 13. Implement UI Components - SaveOptionsDialog
  - [x] 13.1 Create SaveOptionsDialog component
    - Create `src/components/beautify/SaveOptionsDialog.tsx`
    - Display "Replace Original" and "Save as New" options
    - Show success confirmation on save
    - Handle save errors with retry option
    - _Requirements: 8.1, 8.2, 8.3, 8.7, 8.8_

  - [x] 13.2 Implement "Replace Original" logic
    - Update existing website document with beautified content
    - Regenerate thumbnail
    - _Requirements: 8.3_

  - [x] 13.3 Implement "Save as New" logic
    - Create new website document with beautified content
    - Append " (Beautified)" to original title
    - Navigate to new website's preview page
    - _Requirements: 8.4, 8.5, 8.6_

  - [x] 13.4 Write property test for title transformation (Property 17)
    - **Property 17: Save as New Title Transformation**
    - **Validates: Requirements 8.5**

- [x] 14. Implement error handling
  - [x] 14.1 Create error message mapping
    - Map error types to user-friendly messages
    - Network error: "Unable to connect. Please check your internet connection."
    - Timeout: "Beautification timed out. The website may be too complex. Please try again."
    - Authentication: "Session expired. Please refresh the page and try again."
    - Rate limit: "Service is busy. Please wait a moment and try again."
    - Parse error: "Failed to process beautified content. Please try again."
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 14.2 Write property test for error message mapping (Property 19)
    - **Property 19: Error Type to Message Mapping**
    - **Validates: Requirements 10.1, 10.2, 10.3**

  - [x] 14.3 Implement error recovery UI
    - Add "Try Again" and "Dismiss" buttons
    - Preserve user edits on error
    - _Requirements: 10.6, 10.7, 10.8_

  - [x] 14.4 Write property test for user edits preservation (Property 20)
    - **Property 20: User Edits Preserved on Error**
    - **Validates: Requirements 10.8**

- [~] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Integrate BeautifyButton on Website Preview Page
  - [x] 16.1 Add BeautifyButton to preview page toolbar
    - Add BeautifyButton alongside Preview and Download buttons
    - _Requirements: 5.1_

  - [x] 16.2 Implement beautification flow on preview page
    - Connect BeautifyButton click to BeautifyOptionsDialog
    - Handle beautification request with current HTML/CSS
    - Show BeautifyLoadingOverlay during process
    - Display PreviewComparison on completion
    - Show SaveOptionsDialog on accept
    - _Requirements: 5.3, 5.5, 5.7, 5.8_

  - [x] 16.3 Handle `beautify=true` query parameter
    - Auto-trigger beautification when parameter present
    - _Requirements: 6.5_

- [x] 17. Integrate BeautifyButton on Dashboard WebsiteCard
  - [x] 17.1 Add BeautifyButton to WebsiteCard hover state
    - Show BeautifyButton alongside edit and delete buttons on hover
    - _Requirements: 6.1, 6.2_

  - [x] 17.2 Navigate to preview with beautify parameter
    - On click, navigate to preview page with `beautify=true` query parameter
    - _Requirements: 6.3, 6.4_

- [x] 18. Create beautify components index file
  - [x] 18.1 Create components index
    - Create `src/components/beautify/index.ts` to export all beautify components
    - _Requirements: 5.1, 7.1, 8.1, 9.1_

- [~] 19. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation follows existing patterns from `/api/generate/stream` for SSE streaming
- Code extraction logic should reuse the existing `codeExtractor.ts` pattern
- All components should follow the existing project structure under `src/components/`
- Firebase Admin SDK authentication follows the existing pattern in the generate route

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "7.1"] },
    { "id": 3, "tasks": ["2.4", "2.5", "7.2", "7.3", "7.4", "7.5"] },
    { "id": 4, "tasks": ["2.6", "2.7"] },
    { "id": 5, "tasks": ["2.8", "4.2"] },
    { "id": 6, "tasks": ["4.3", "4.5"] },
    { "id": 7, "tasks": ["4.4", "4.6"] },
    { "id": 8, "tasks": ["5.1"] },
    { "id": 9, "tasks": ["5.2", "5.4", "5.6"] },
    { "id": 10, "tasks": ["5.3", "5.5", "5.7", "5.8", "5.9"] },
    { "id": 11, "tasks": ["5.10"] },
    { "id": 12, "tasks": ["8.1", "9.1", "10.1"] },
    { "id": 13, "tasks": ["8.2", "9.2", "10.2", "10.3"] },
    { "id": 14, "tasks": ["9.3", "9.4", "10.4"] },
    { "id": 15, "tasks": ["12.1", "13.1", "14.1"] },
    { "id": 16, "tasks": ["12.2", "12.4", "12.6", "12.7", "13.2", "13.3", "14.2", "14.3"] },
    { "id": 17, "tasks": ["12.3", "12.5", "13.4", "14.4"] },
    { "id": 18, "tasks": ["16.1", "17.1", "18.1"] },
    { "id": 19, "tasks": ["16.2", "16.3", "17.2"] }
  ]
}
```
