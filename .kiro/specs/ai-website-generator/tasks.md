# Implementation Plan: AI Website Generator

## Overview

This implementation plan covers building a full-stack AI-powered website generator using Next.js 16 (App Router), React 19, Firebase (Auth, Firestore, Storage), and Claude API. The plan follows an incremental approach: project setup → authentication → core generation → persistence → UI features → polish.

## Tasks

- [x] 1. Project Setup and Core Infrastructure
  - [x] 1.1 Initialize Next.js 16 project with TypeScript and Tailwind CSS
    - Create Next.js project with App Router
    - Configure TypeScript with strict mode
    - Set up Tailwind CSS with dark theme support
    - Configure ESLint and Prettier
    - _Requirements: 19.1, 19.4_

  - [x] 1.2 Create project directory structure and type definitions
    - Create directories: `app/`, `components/`, `services/`, `lib/`, `types/`, `tests/`
    - Define core TypeScript interfaces: `AuthenticatedUser`, `GeneratedWebsite`, `GenerationState`, `InputState`, `AppError`
    - Define error codes enum and validation constants
    - _Requirements: 1.4, 12.3_

  - [x] 1.3 Set up Firebase configuration and initialization
    - Install Firebase SDK packages
    - Create `lib/firebase.ts` with Firebase app initialization
    - Configure Firebase Auth, Firestore, and Storage exports
    - Set up environment variables for Firebase config
    - _Requirements: 5.1, 13.2_

  - [x] 1.4 Create Firestore security rules and indexes
    - Write `firestore.rules` for user data isolation
    - Create `firestore.indexes.json` for userId + createdAt compound index
    - (Removed) storage.rules no longer needed - thumbnails stored in Firestore
    - _Requirements: 5.4, 6.1, 19.1_

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Authentication System
  - [x] 3.1 Create AuthService for Google sign-in
    - Implement `signInWithGoogle()` using Firebase Auth with Google provider
    - Implement `signOut()` to terminate user session
    - Implement `getCurrentUser()` to get current auth state
    - Implement `onAuthStateChange()` for auth state subscription
    - _Requirements: 13.2, 13.3, 13.5, 13.6_

  - [ ]\* 3.2 Write property test for authentication state persistence
    - **Property 20: Authentication State Persistence**
    - **Validates: Requirements 13.5**

  - [x] 3.3 Create AuthProvider context component
    - Create React context for auth state
    - Implement provider with useReducer for auth state management
    - Handle loading, authenticated, and error states
    - Subscribe to Firebase auth state changes
    - _Requirements: 13.3, 13.5_

  - [x] 3.4 Create ProtectedRoute component
    - Implement route protection wrapper
    - Redirect unauthenticated users to login page
    - Store intended destination for post-auth redirect
    - Validate auth state on each route access
    - _Requirements: 14.1, 14.2, 14.3, 14.5_

  - [ ]\* 3.5 Write property test for protected route access control
    - **Property 21: Protected Route Access Control**
    - **Validates: Requirements 14.1, 14.2**

  - [ ]\* 3.6 Write property test for post-authentication redirect
    - **Property 22: Post-Authentication Redirect**
    - **Validates: Requirements 14.3**

  - [x] 3.7 Create Login page with Google Sign-In button
    - Create `app/page.tsx` as public login page
    - Implement GoogleSignInButton component
    - Handle auth success/error callbacks
    - Display error messages for failed authentication
    - _Requirements: 13.1, 13.4, 14.4_

  - [ ]\* 3.8 Write unit tests for AuthService
    - Test sign-in flow with mocked Firebase
    - Test sign-out flow
    - Test session persistence
    - Test error handling

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Input Validation Services
  - [x] 5.1 Create TextInputValidator service
    - Implement `validateTextInput()` method
    - Check minimum length (10 characters)
    - Check maximum length (10,000 characters)
    - Return ValidationResult with error messages
    - _Requirements: 1.1, 1.6_

  - [ ]\* 5.2 Write property test for text input validation boundaries
    - **Property 1: Text Input Validation Boundaries**
    - **Validates: Requirements 1.1, 1.6**

  - [x] 5.3 Create ScreenshotInputValidator service
    - Implement `validateScreenshotInput()` method
    - Validate MIME type (PNG, JPEG, WebP only)
    - Validate file size (max 10MB)
    - Validate image dimensions (min 200x200)
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7, 2.8_

  - [ ]\* 5.4 Write property test for screenshot input validation
    - **Property 2: Screenshot Input Validation**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.6, 2.7, 2.8**

  - [x] 5.5 Create TitleValidator service
    - Implement `validateTitle()` method
    - Check minimum length (1 character)
    - Check maximum length (100 characters)
    - _Requirements: 11.5, 11.6_

  - [ ]\* 5.6 Write property test for title length validation
    - **Property 16: Title Length Validation**
    - **Validates: Requirements 11.5**

- [x] 6. Claude API Integration
  - [x] 6.1 Set up Anthropic SDK and Claude client
    - Install @anthropic-ai/sdk package
    - Create `lib/claude.ts` with Anthropic client initialization
    - Configure Claude 3.5 Haiku model constant
    - Set up API key from environment variables
    - _Requirements: 1.2, 2.4_

  - [x] 6.2 Implement text-based website generation
    - Create `generateWebsiteFromText()` function
    - Include system prompt with HTML5/BEM/accessibility requirements
    - Include dark theme generation instructions
    - Handle 60-second timeout with AbortSignal
    - _Requirements: 1.2, 1.8, 17.1-17.7, 18.1-18.4_

  - [x] 6.3 Implement screenshot-based website generation
    - Create `generateWebsiteFromImage()` function
    - Send image as base64 with vision capabilities
    - Include screenshot-specific system prompt
    - Handle timeout and error responses
    - _Requirements: 2.4, 2.5, 2.9, 17.1-17.7, 18.1-18.4_

  - [x] 6.4 Create code extraction service
    - Implement HTML/CSS extraction from Claude response
    - Parse markdown code blocks (`html, `css)
    - Extract title from response
    - Handle missing or malformed code blocks
    - _Requirements: 1.3, 1.7, 2.5_

  - [ ]\* 6.5 Write property test for code extraction round-trip
    - **Property 3: Code Extraction Round-Trip**
    - **Validates: Requirements 1.3, 1.7, 2.5**

  - [ ]\* 6.6 Write property test for generated website object completeness
    - **Property 4: Generated Website Object Completeness**
    - **Validates: Requirements 1.4**

  - [ ]\* 6.7 Write property test for generated title constraints
    - **Property 17: Generated Title Constraints**
    - **Validates: Requirements 11.1, 11.2, 11.3**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Website Generation API Route
  - [x] 8.1 Create generate API route with auth middleware
    - Create `app/api/generate/route.ts`
    - Implement POST handler for generation requests
    - Add authentication middleware to verify Firebase token
    - Handle both text and screenshot request types
    - _Requirements: 1.2, 2.4, 14.1_

  - [x] 8.2 Implement generation request handling and response formatting
    - Validate request body based on type (text/screenshot)
    - Call appropriate Claude generation function
    - Format response with GenerateResponse interface
    - Handle errors with GenerateErrorResponse
    - _Requirements: 1.3, 1.4, 1.5, 2.5, 2.9_

  - [ ]\* 8.3 Write integration tests for generate API route
    - Test text generation request flow
    - Test screenshot generation request flow
    - Test authentication requirement
    - Test error response handling

- [x] 9. HTML Sanitizer Service
  - [x] 9.1 Implement HTML sanitization for preview security
    - Create `services/htmlSanitizer.ts`
    - Remove script tags from HTML
    - Remove inline event handlers (onclick, onerror, onload, etc.)
    - Remove javascript: URLs
    - Preserve structural HTML elements and styling attributes
    - _Requirements: 3.6_

  - [ ]\* 9.2 Write property test for HTML sanitization security
    - **Property 5: HTML Sanitization Security**
    - **Validates: Requirements 3.6**

- [x] 10. Website Repository Service
  - [x] 10.1 Implement WebsiteRepository with Firestore CRUD operations
    - Create `services/websiteRepository.ts`
    - Implement `save()` to persist website to Firestore
    - Implement `getById()` to retrieve single website
    - Implement `getAllByUser()` with pagination
    - Implement `update()` for modifications
    - Implement `delete()` for removal
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 6.1_

  - [ ]\* 10.2 Write property test for website persistence round-trip
    - **Property 8: Website Persistence Round-Trip**
    - **Validates: Requirements 5.1, 10.6**

  - [ ]\* 10.3 Write property test for unique identifier generation
    - **Property 9: Unique Identifier Generation**
    - **Validates: Requirements 5.3**

  - [ ]\* 10.4 Write property test for user data isolation
    - **Property 19: User Data Isolation**
    - **Validates: Requirements 5.4, 6.1**

  - [x] 10.5 Implement thumbnail generation for Firestore storage
    - Create `generateThumbnail()` method in thumbnailService.ts
    - Generate thumbnail from preview (320x240)
    - Convert to base64 data URL for Firestore storage
    - Return base64 data URL
    - Handle generation failures with placeholder
    - _Requirements: 5.2, 5.7_

  - [x] 10.6 Implement website list sorting and pagination
    - Query websites sorted by createdAt descending
    - Implement page size of 12 items
    - Calculate total pages
    - Return PaginatedResult
    - _Requirements: 6.3, 6.5_

  - [ ]\* 10.7 Write property test for website list sorting
    - **Property 10: Website List Sorting**
    - **Validates: Requirements 6.3**

  - [ ]\* 10.8 Write property test for pagination correctness
    - **Property 11: Pagination Correctness**
    - **Validates: Requirements 6.5**

  - [ ]\* 10.9 Write property test for deletion removes website
    - **Property 12: Deletion Removes Website**
    - **Validates: Requirements 7.2**

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Download Service
  - [x] 12.1 Implement single file download generation
    - Create `services/downloadService.ts`
    - Implement `generateSingleFile()` method
    - Embed CSS in style element within HTML head
    - Return Blob for download
    - _Requirements: 4.2_

  - [ ]\* 12.2 Write property test for single file download generation
    - **Property 6: Single File Download Generation**
    - **Validates: Requirements 4.2**

  - [x] 12.3 Implement ZIP archive download generation
    - Install JSZip package
    - Implement `generateZipArchive()` method
    - Create index.html with link to styles.css
    - Create styles.css with CSS content
    - Return Blob for download
    - _Requirements: 4.3_

  - [ ]\* 12.4 Write property test for ZIP archive download generation
    - **Property 7: ZIP Archive Download Generation**
    - **Validates: Requirements 4.3**

  - [ ]\* 12.5 Write property test for code editor modifications preserved in download
    - **Property 18: Code Editor Modifications Preserved in Download**
    - **Validates: Requirements 10.5**

- [x] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Theme System
  - [x] 14.1 Create ThemeProvider and theme context
    - Create `components/layout/ThemeProvider.tsx`
    - Implement theme context with light/dark/system options
    - Detect system color scheme preference
    - Persist theme preference in localStorage
    - Apply theme class to document root
    - _Requirements: 19.1, 19.2, 19.3_

  - [x] 14.2 Create ThemeToggle component
    - Create `components/layout/ThemeToggle.tsx`
    - Display toggle button in header
    - Support light/dark/system options
    - Update theme context on selection
    - _Requirements: 19.2, 19.3_

  - [x] 14.3 Configure Tailwind CSS dark theme
    - Set up dark mode variant in tailwind.config
    - Define color palette for light and dark themes
    - Ensure WCAG AA contrast compliance
    - _Requirements: 19.4, 19.5_

- [x] 15. UI Components - Core
  - [x] 15.1 Create AppHeader component with user profile
    - Create `components/layout/AppHeader.tsx`
    - Display user profile picture and name
    - Include theme toggle button
    - Include sign out button
    - Handle missing profile picture with default avatar
    - _Requirements: 15.1, 15.2, 15.4_

  - [x] 15.2 Create UserProfileMenu component
    - Create `components/auth/UserProfileMenu.tsx`
    - Display dropdown on profile click
    - Show user email and sign out option
    - _Requirements: 15.3_

  - [x] 15.3 Create ErrorMessage component
    - Create `components/ErrorMessage.tsx`
    - Display error message with dismiss button
    - Include optional retry button
    - Style for visibility without being intrusive
    - _Requirements: 12.1, 12.3, 12.5_

  - [x] 15.4 Create LoadingIndicator component
    - Create `components/LoadingIndicator.tsx`
    - Display animated loading indicator
    - Show current generation stage
    - Display elapsed time
    - Include cancel button
    - _Requirements: 8.1, 8.2, 8.3, 8.6_

- [x] 16. UI Components - Input
  - [x] 16.1 Create InputModeSelector component
    - Create `components/InputModeSelector.tsx`
    - Display text and screenshot mode options with icons
    - Highlight active mode visually
    - Handle mode change events
    - _Requirements: 9.1, 9.3, 9.6_

  - [ ]\* 16.2 Write property test for input mode exclusivity
    - **Property 14: Input Mode Exclusivity**
    - **Validates: Requirements 9.6**

  - [x] 16.3 Create TextInput component
    - Create `components/TextInput.tsx`
    - Display textarea for description input
    - Show character count and limit
    - Display validation errors inline
    - Include submit button
    - _Requirements: 9.4, 1.1, 1.6_

  - [x] 16.4 Create ScreenshotUpload component
    - Create `components/ScreenshotUpload.tsx`
    - Implement drag-and-drop file upload area
    - Implement click-to-browse functionality
    - Display image preview after selection
    - Show validation errors
    - _Requirements: 9.5, 2.1, 2.2, 2.3_

  - [x] 16.5 Create mode switch confirmation dialog
    - Create confirmation dialog component
    - Display when switching modes with existing content
    - Provide confirm and cancel options
    - Clear input on confirm, retain on cancel
    - _Requirements: 9.7, 9.8, 9.9_

  - [ ]\* 16.6 Write property test for mode switch confirmation trigger
    - **Property 15: Mode Switch Confirmation Trigger**
    - **Validates: Requirements 9.7**

  - [ ]\* 16.7 Write property test for input preservation on cancel or error
    - **Property 13: Input Preservation on Cancel or Error**
    - **Validates: Requirements 8.5, 12.4**

- [x] 17. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. UI Components - Preview and Editor
  - [x] 18.1 Create PreviewRenderer component with viewport modes
    - Create `components/PreviewRenderer.tsx`
    - Render website in isolated iframe
    - Implement viewport mode selector (desktop/tablet/mobile)
    - Apply viewport dimensions on selection
    - Default to desktop mode
    - Sanitize HTML before rendering
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 18.2 Create CodeEditor component with Monaco
    - Install Monaco Editor package
    - Create `components/CodeEditor.tsx`
    - Implement tabs for HTML and CSS
    - Enable syntax highlighting
    - Support dark theme
    - Debounce preview updates on edit
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 19.6_

  - [x] 18.3 Create DownloadDialog component
    - Create `components/DownloadDialog.tsx`
    - Display format options (single HTML/ZIP)
    - Trigger download on selection
    - Show loading state during generation
    - Handle timeout errors
    - _Requirements: 4.1, 4.4, 4.5, 4.6_

  - [x] 18.4 Create DeleteConfirmDialog component
    - Create `components/DeleteConfirmDialog.tsx`
    - Display website title in confirmation
    - Provide confirm and cancel buttons
    - _Requirements: 7.1, 7.3_

- [x] 19. UI Components - Website Management
  - [x] 19.1 Create WebsiteCard component
    - Create `components/WebsiteCard.tsx`
    - Display thumbnail, title, date, input type
    - Enable inline title editing
    - Include delete button
    - _Requirements: 6.2, 11.4, 11.7_

  - [x] 19.2 Create Pagination component
    - Create `components/Pagination.tsx`
    - Display page numbers
    - Include next/previous buttons
    - Handle page change events
    - _Requirements: 6.5_

- [x] 20. Page Implementation - Generation
  - [x] 20.1 Create generation page with input modes
    - Create `app/generate/page.tsx` as protected route
    - Integrate InputModeSelector component
    - Integrate TextInput and ScreenshotUpload components
    - Handle input validation before submission
    - _Requirements: 9.1, 9.2, 9.4, 9.5_

  - [x] 20.2 Implement generation flow with loading states
    - Handle generate button click
    - Show LoadingIndicator during generation
    - Implement cancel functionality
    - Preserve input on cancel or error
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 20.3 Implement generation success flow
    - Receive generated website from API
    - Save to repository automatically
    - Navigate to website preview page
    - _Requirements: 5.1, 1.4_

- [x] 21. Page Implementation - Dashboard
  - [x] 21.1 Create dashboard page with website list
    - Create `app/dashboard/page.tsx` as protected route
    - Fetch user's websites from repository
    - Display WebsiteCard components in grid
    - Implement loading state
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 21.2 Implement pagination for website list
    - Integrate Pagination component
    - Fetch pages on navigation
    - Display 12 items per page
    - _Requirements: 6.5_

  - [x] 21.3 Implement empty state and error handling
    - Display empty state message with CTA
    - Display error message with retry on fetch failure
    - _Requirements: 6.6, 6.7_

  - [x] 21.4 Implement website deletion flow
    - Show DeleteConfirmDialog on delete click
    - Call repository delete on confirm
    - Update list without page refresh
    - Handle deletion errors
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 22. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 23. Page Implementation - Website Preview
  - [x] 23.1 Create website preview/editor page
    - Create `app/website/[id]/page.tsx` as protected route
    - Fetch website data by ID
    - Integrate PreviewRenderer component
    - Integrate CodeEditor component
    - _Requirements: 3.1, 10.1_

  - [x] 23.2 Implement code editing and preview sync
    - Update preview on code changes (1s debounce)
    - Display syntax error indicators
    - _Requirements: 10.3, 10.4_

  - [x] 23.3 Implement save and download functionality
    - Auto-save modifications to repository
    - Integrate DownloadDialog component
    - Ensure downloads include editor modifications
    - _Requirements: 10.5, 10.6, 10.7, 4.1_

  - [x] 23.4 Handle preview rendering errors
    - Display error message for invalid HTML/CSS
    - Provide access to code editor for fixes
    - _Requirements: 3.7_

- [x] 24. Page Implementation - Public View
  - [x] 24.1 Create public website view page
    - Create `app/view/[id]/page.tsx` as public route
    - Fetch website data by ID
    - Render full-page website without app UI
    - Include proper HTML document structure
    - Set meta tags including title
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x] 24.2 Implement 404 handling and visibility checks
    - Display 404 page for non-existent websites
    - Check public visibility flag
    - Require auth for private websites
    - _Requirements: 16.5, 16.6, 16.7_

- [x] 25. Error Handling Integration
  - [x] 25.1 Implement global error handling utilities
    - Create error handling utilities
    - Map API errors to user-friendly messages
    - Implement retry logic (max 3 attempts)
    - Handle rate limiting with wait times
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ]\* 25.2 Write unit tests for error handling
    - Test network error handling
    - Test rate limit error handling
    - Test timeout error handling
    - Test retry logic

- [x] 26. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 27. Testing Infrastructure Setup
  - [x] 27.1 Set up testing framework with Vitest and fast-check
    - Install Vitest, @testing-library/react, fast-check
    - Configure Vitest for Next.js
    - Set up test utilities and mocks
    - Create test scripts in package.json
    - _Requirements: Testing Strategy_

  - [ ]\* 27.2 Write remaining integration tests
    - Test end-to-end generation flow
    - Test dashboard interactions
    - Test preview page functionality
    - Test download functionality

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation follows the tech stack: Next.js 16, React 19, Tailwind CSS, Firebase, Claude API, Monaco Editor, JSZip
- All 22 correctness properties from the design document are covered by property test tasks
- Firebase security rules should be deployed before testing persistence features

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "3.1", "5.1", "5.3", "5.5"] },
    { "id": 3, "tasks": ["3.2", "3.3", "5.2", "5.4", "5.6", "6.1"] },
    { "id": 4, "tasks": ["3.4", "6.2", "6.3"] },
    { "id": 5, "tasks": ["3.5", "3.6", "3.7", "6.4"] },
    { "id": 6, "tasks": ["3.8", "6.5", "6.6", "6.7", "8.1", "9.1"] },
    { "id": 7, "tasks": ["8.2", "9.2", "10.1"] },
    { "id": 8, "tasks": ["8.3", "10.2", "10.3", "10.4", "10.5"] },
    { "id": 9, "tasks": ["10.6", "12.1"] },
    { "id": 10, "tasks": ["10.7", "10.8", "10.9", "12.2", "12.3"] },
    { "id": 11, "tasks": ["12.4", "12.5", "14.1"] },
    { "id": 12, "tasks": ["14.2", "14.3", "15.1"] },
    { "id": 13, "tasks": ["15.2", "15.3", "15.4", "16.1"] },
    { "id": 14, "tasks": ["16.2", "16.3", "16.4"] },
    { "id": 15, "tasks": ["16.5", "16.6", "16.7", "18.1"] },
    { "id": 16, "tasks": ["18.2", "18.3", "18.4", "19.1"] },
    { "id": 17, "tasks": ["19.2", "20.1"] },
    { "id": 18, "tasks": ["20.2", "21.1"] },
    { "id": 19, "tasks": ["20.3", "21.2", "21.3"] },
    { "id": 20, "tasks": ["21.4", "23.1"] },
    { "id": 21, "tasks": ["23.2", "23.3", "24.1"] },
    { "id": 22, "tasks": ["23.4", "24.2", "25.1"] },
    { "id": 23, "tasks": ["25.2", "27.1"] },
    { "id": 24, "tasks": ["27.2"] }
  ]
}
```
