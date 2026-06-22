# Implementation Plan: Code Deduplication Hooks

## Overview

This implementation plan refactors duplicated code patterns across the AI Website Generator codebase into reusable custom hooks and shared components. The refactoring follows a bottom-up approach: first creating the shared infrastructure (icons module, custom hooks), then refactoring each page/component to use the new shared code.

## Tasks

- [x] 1. Create Shared Icons Module
  - [x] 1.1 Create icons module with all shared icon components
    - Create `src/components/icons/index.ts`
    - Implement IconProps interface with optional className
    - Implement all 19 icon components: GlobeIcon, ChevronLeftIcon, ChevronRightIcon, ArrowLeftIcon, ArrowRightIcon, CheckIcon, XIcon, TrashIcon, EditIcon, TextIcon, ImageIcon, SparklesIcon, DownloadIcon, CodeIcon, PanelLeftIcon, PanelRightIcon, MaximizeIcon, MinimizeIcon, PlusIcon
    - Ensure all icons have aria-hidden="true" attribute
    - Use currentColor for stroke to inherit text color
    - Standardize SVG viewBox to "0 0 24 24"
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Write unit tests for Icons module
    - Create `src/components/icons/icons.test.tsx`
    - Test all icons are exported from the module
    - Test each icon accepts className prop
    - Test each icon has aria-hidden="true" attribute
    - _Requirements: 1.2, 1.3, 13.2_

  - [x] 1.3 Write property test for Icon Component Accessibility
    - **Property 1: Icon Component Accessibility**
    - **Validates: Requirements 1.2, 1.3**
    - For any icon component with any valid className string, verify aria-hidden="true" and className application

- [x] 2. Create useWebsites Custom Hook
  - [x] 2.1 Implement useWebsites hook
    - Create `src/hooks/useWebsites.ts`
    - Implement UseWebsitesOptions interface with optional pageSize (default: 12)
    - Implement UseWebsitesReturn interface with items, isLoading, error, currentPage, totalPages, fetchPage, refresh
    - Use websiteRepository.getAllByUser() for data fetching
    - Trigger initial fetch on mount when userId is truthy
    - Implement fetchPage to update currentPage and trigger fetch
    - Implement refresh to re-fetch current page
    - Handle error states with descriptive messages
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 2.2 Write unit tests for useWebsites hook
    - Create `src/hooks/useWebsites.test.ts`
    - Test hook accepts userId and optional pageSize with default of 12
    - Test initial fetch triggered on mount with correct userId
    - Test error state set when fetch fails
    - Test refresh re-fetches current page
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 13.2, 13.3_

  - [x] 2.3 Write property test for useWebsites Return Structure
    - **Property 2: useWebsites Return Structure**
    - **Validates: Requirements 2.3**
    - For any valid userId, verify hook returns all required fields with correct types

  - [x] 2.4 Write property test for useWebsites Pagination Behavior
    - **Property 3: useWebsites Pagination Behavior**
    - **Validates: Requirements 2.4**
    - For any valid page number, verify fetchPage updates currentPage and triggers fetch

- [~] 3. Checkpoint - Verify Icons and useWebsites
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create useShowcaseWebsites Custom Hook
  - [x] 4.1 Implement useShowcaseWebsites hook
    - Create `src/hooks/useShowcaseWebsites.ts`
    - Implement UseShowcaseWebsitesOptions interface with optional pageSize (default: 12)
    - Implement UseShowcaseWebsitesReturn interface with items, isLoading, error, currentPage, totalPages, totalCount, fetchPage, refresh
    - Use websiteRepository.getShowcasedWebsites() for data fetching
    - Automatically fetch first page on mount
    - Return totalCount for "X of Y websites" display
    - Handle error states with descriptive messages
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 4.2 Write unit tests for useShowcaseWebsites hook
    - Create `src/hooks/useShowcaseWebsites.test.ts`
    - Test hook accepts optional pageSize with default of 12
    - Test initial fetch triggered on mount
    - Test error handling works correctly
    - _Requirements: 3.1, 3.2, 3.5, 13.2, 13.3_

  - [x] 4.3 Write property test for useShowcaseWebsites Return Structure
    - **Property 4: useShowcaseWebsites Return Structure**
    - **Validates: Requirements 3.3**
    - For any invocation with valid options, verify hook returns all required fields including totalCount

  - [x] 4.4 Write property test for useShowcaseWebsites Pagination Behavior
    - **Property 5: useShowcaseWebsites Pagination Behavior**
    - **Validates: Requirements 3.4**
    - For any valid page number, verify fetchPage updates state correctly

- [x] 5. Create useSSEStream Custom Hook
  - [x] 5.1 Implement useSSEStream hook
    - Create `src/hooks/useSSEStream.ts`
    - Implement SSEEvent interface with type and data fields
    - Implement UseSSEStreamConfig interface with url, method, headers, body, onEvent
    - Implement UseSSEStreamReturn interface with isStreaming, error, streamingContent, start, cancel
    - Use AbortController for cancellation support
    - Parse SSE format: `event: {type}\ndata: {json}\n\n`
    - Handle buffer for incomplete lines during streaming
    - Distinguish between abort errors (no error state) and other errors
    - Accumulate streamingContent for live preview display
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 5.2 Write unit tests for useSSEStream hook
    - Create `src/hooks/useSSEStream.test.ts`
    - Test hook accepts config object with all required fields
    - Test start initiates fetch with correct config
    - Test cancel aborts ongoing fetch
    - Test abort doesn't set error state
    - _Requirements: 4.1, 4.3, 4.5, 4.7, 13.2, 13.3_

  - [x] 5.3 Write property test for useSSEStream Return Structure
    - **Property 6: useSSEStream Return Structure**
    - **Validates: Requirements 4.2**
    - For any valid SSEStreamConfig, verify hook returns all required fields

  - [x] 5.4 Write property test for SSE Event Parsing
    - **Property 7: SSE Event Parsing**
    - **Validates: Requirements 4.4**
    - For any valid SSE event format, verify correct parsing and onEvent callback invocation

- [x] 6. Enhance useFirebaseAuth Hook
  - [x] 6.1 Add getIdToken function to existing useAuth hook
    - Modify `src/components/auth/AuthProvider.tsx` or create `src/hooks/useFirebaseAuth.ts`
    - Implement getIdToken function that calls auth.currentUser?.getIdToken()
    - Throw Error with message "User not authenticated" if no user
    - Memoize function to maintain stable reference
    - Integrate into existing AuthContext
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 6.2 Write unit tests for getIdToken function
    - Test getIdToken returns token when user is authenticated
    - Test getIdToken throws "User not authenticated" when no user
    - _Requirements: 5.1, 5.2, 13.2, 13.3_

- [~] 7. Checkpoint - Verify All Custom Hooks
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Refactor WebsiteCard Component
  - [x] 8.1 Replace inline icons with Icons module imports in WebsiteCard
    - Update `src/components/WebsiteCard.tsx`
    - Remove inline icon definitions
    - Import GlobeIcon, TextIcon, ImageIcon, EditIcon, CheckIcon, XIcon, TrashIcon, SparklesIcon from Icons module
    - Verify all existing functionality is preserved
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 8.2 Write integration test for WebsiteCard component
    - Verify WebsiteCard renders correctly with new icon imports
    - Verify all interactive elements still function
    - _Requirements: 12.3, 13.1_

- [ ] 9. Refactor Dashboard Page
  - [x] 9.1 Replace website fetching logic with useWebsites hook in Dashboard
    - Update Dashboard page component
    - Import and use useWebsites hook for fetching user websites
    - Remove inline fetching logic and state management
    - Wire up items, isLoading, error, currentPage, totalPages, fetchPage, refresh
    - _Requirements: 7.1, 7.3_

  - [x] 9.2 Replace inline icons with Icons module imports in Dashboard
    - Remove inline icon definitions
    - Import icons from Icons module
    - _Requirements: 7.2_

  - [-] 9.3 Write integration test for Dashboard page
    - Verify Dashboard renders correctly with new hooks
    - Verify pagination, deletion, title editing, and beautify navigation work
    - _Requirements: 7.3, 7.4, 13.1_

- [ ] 10. Refactor Showcase Page
  - [x] 10.1 Replace website fetching logic with useShowcaseWebsites hook in Showcase
    - Update Showcase page component
    - Import and use useShowcaseWebsites hook
    - Remove inline fetching logic and state management
    - Wire up items, isLoading, error, currentPage, totalPages, totalCount, fetchPage
    - _Requirements: 8.1, 8.4_

  - [x] 10.2 Replace inline Pagination with shared Pagination component in Showcase
    - Remove inline Pagination component definition
    - Import Pagination from `src/components/Pagination.tsx`
    - Pass currentPage, totalPages, and onPageChange props
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 10.3 Replace inline icons with Icons module imports in Showcase
    - Remove inline ChevronLeftIcon and ChevronRightIcon definitions
    - Import icons from Icons module
    - _Requirements: 6.3, 8.2_

  - [-] 10.4 Write integration test for Showcase page
    - Verify Showcase renders correctly with new hooks and components
    - Verify pagination works correctly
    - _Requirements: 8.3, 8.4, 13.1_

- [~] 11. Checkpoint - Verify Dashboard and Showcase
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Refactor Home Page Community Showcase
  - [-] 12.1 Replace fetching logic with useShowcaseWebsites hook in CommunityShowcase
    - Update CommunityShowcase component on home page
    - Import and use useShowcaseWebsites hook with pageSize of 6
    - Remove inline fetching logic
    - _Requirements: 9.1, 9.3_

  - [-] 12.2 Replace inline icons with Icons module imports in CommunityShowcase
    - Remove inline icon definitions
    - Import icons from Icons module
    - _Requirements: 9.2_

  - [~] 12.3 Write integration test for CommunityShowcase component
    - Verify CommunityShowcase renders correctly
    - Verify pageSize of 6 is used
    - _Requirements: 9.3, 13.1_

- [ ] 13. Refactor Generate Page
  - [~] 13.1 Replace inline getIdToken with useAuth hook in Generate page
    - Update Generate page component
    - Import getIdToken from useAuth hook
    - Remove inline getIdToken function definition
    - _Requirements: 10.1_

  - [~] 13.2 Evaluate and optionally integrate useSSEStream hook in Generate page
    - Assess if useSSEStream integration adds excessive complexity
    - If feasible, replace inline SSE processing with useSSEStream hook
    - Ensure streaming preview and cancellation are preserved
    - If not feasible, document reasoning and keep current implementation
    - _Requirements: 10.2, 10.3_

  - [~] 13.3 Write integration test for Generate page
    - Verify Generate page renders correctly
    - Verify website generation with streaming preview works
    - Verify cancellation works
    - _Requirements: 10.3, 13.1_

- [ ] 14. Refactor Website Preview Page
  - [~] 14.1 Replace inline getIdToken with useAuth hook in Website Preview page
    - Update Website Preview page component
    - Import getIdToken from useAuth hook
    - Remove inline getIdToken function definition
    - _Requirements: 11.1_

  - [~] 14.2 Replace inline icons with Icons module imports in Website Preview page
    - Remove inline icon definitions
    - Import icons from Icons module
    - _Requirements: 11.2_

  - [~] 14.3 Evaluate and optionally integrate useSSEStream hook in Website Preview page
    - Assess if useSSEStream integration adds excessive complexity
    - If feasible, replace inline SSE processing for beautify with useSSEStream hook
    - Ensure beautify streaming is preserved
    - If not feasible, document reasoning and keep current implementation
    - _Requirements: 11.3_

  - [~] 14.4 Write integration test for Website Preview page
    - Verify Website Preview page renders correctly
    - Verify beautify streaming, code editing work
    - _Requirements: 11.4, 13.1_

- [ ] 15. Final Cleanup and Verification
  - [~] 15.1 Remove all duplicate code and verify no orphaned code remains
    - Search for any remaining inline icon definitions
    - Search for any remaining duplicate getIdToken functions
    - Search for any remaining duplicate fetching logic
    - Remove any dead code
    - _Requirements: 1.5, 5.4_

  - [~] 15.2 Run full test suite and verify all tests pass
    - Run all existing tests
    - Run all new hook tests
    - Verify no regressions
    - _Requirements: 13.1, 13.2, 13.3_

- [~] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript, so all implementations should use TypeScript
- Integration tests verify that refactored pages maintain identical behavior to pre-refactoring state
- useSSEStream integration in Generate and Website Preview pages is conditional based on complexity assessment

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "4.1", "5.1", "6.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "5.2", "5.3", "5.4", "6.2"] },
    { "id": 4, "tasks": ["8.1"] },
    { "id": 5, "tasks": ["8.2", "9.1", "9.2", "10.1", "10.2", "10.3"] },
    { "id": 6, "tasks": ["9.3", "10.4", "12.1", "12.2"] },
    { "id": 7, "tasks": ["12.3", "13.1", "13.2", "14.1", "14.2", "14.3"] },
    { "id": 8, "tasks": ["13.3", "14.4", "15.1"] },
    { "id": 9, "tasks": ["15.2"] }
  ]
}
```
