# Implementation Plan: Server-Side Rendering Migration

## Overview

This plan migrates the AI Website Generator from client-side rendering to server-side rendering using Next.js App Router server components. The migration follows an incremental approach: first building the server-side data layer, then converting individual pages (Showcase, Login, Dashboard, Website Preview) while preserving all existing functionality. Interactive parts are extracted into `'use client'` components composed within server-rendered layouts. Streaming with Suspense is used for auth-protected pages.

## Tasks

- [x] 1. Create server-side data layer and cache infrastructure
  - [x] 1.1 Create `src/lib/serverData.ts` with Firebase Admin SDK data fetching functions
    - Add `getFirestore` import from `firebase-admin/firestore` to `src/lib/firebaseAdmin.ts` (or export the admin app for Firestore access)
    - Create `src/lib/serverData.ts` with `ShowcasedWebsiteServer` and `PaginatedShowcaseResult` interfaces
    - Implement `getShowcasedWebsitesServer` using `unstable_cache` with key `['showcased-websites']`, revalidate 60s, tags `['showcase']`
    - Query Firestore for documents where `isPublic === true` AND `isShowcased === true`, sorted by `showcasedAt` descending, with pagination (page, pageSize)
    - Implement `getShowcasePreviewServer` using `unstable_cache` with key `['showcase-preview']`, revalidate 60s, tags `['showcase']`
    - Return up to 6 showcased websites sorted by `showcasedAt` descending
    - _Requirements: 1.1, 1.2, 2.3, 6.1, 6.2_

  - [x] 1.2 Create `src/lib/cachePolicy.ts` with staleness boundary logic
    - Implement a `shouldServeStaleCacheContent(cacheAgeSeconds: number, revalidationSuccess: boolean): 'serve-stale' | 'attempt-fresh'` function
    - When `cacheAgeSeconds < 86400` and revalidation failed → return `'serve-stale'`
    - When `cacheAgeSeconds >= 86400` → return `'attempt-fresh'` regardless of previous cache
    - Export the function for use in error handling and for property testing
    - _Requirements: 6.3, 6.4, 6.5_

  - [x] 1.3 Write property test for showcase query filtering and sorting logic (Property 1)
    - **Property 1: Showcase query returns only valid public showcased items in correct order**
    - **Validates: Requirements 1.2, 2.3**
    - Create `src/lib/serverData.test.ts`
    - Use `fast-check` to generate arbitrary arrays of website objects with random `isPublic`, `isShowcased`, `showcasedAt` values
    - Pass through the filtering/sorting logic extracted from `getShowcasedWebsitesServer`
    - Assert result contains only items where `isPublic === true` AND `isShowcased === true`
    - Assert result is sorted by `showcasedAt` descending
    - Assert result length ≤ pageSize
    - Minimum 100 iterations

  - [x] 1.4 Write property test for cache staleness policy (Property 2)
    - **Property 2: Cache staleness policy correctly enforces 24-hour boundary**
    - **Validates: Requirements 6.4**
    - Create `src/lib/cachePolicy.test.ts`
    - Use `fast-check` to generate random `cacheAge` (0–172800 seconds) and `revalidationSuccess` (boolean)
    - Assert: when `cacheAge < 86400` and revalidation failed → decision is `'serve-stale'`
    - Assert: when `cacheAge >= 86400` → decision is `'attempt-fresh'`
    - Minimum 100 iterations

- [x] 2. Convert Showcase Page to server-side rendering
  - [x] 2.1 Create server-rendered Showcase page component
    - Rewrite `src/app/showcase/page.tsx` as an async server component (remove `'use client'` directive)
    - Call `getShowcasedWebsitesServer(1, 12)` for initial data
    - Render the page header, description, website grid with `ShowcaseWebsiteCard` components, and footer as server-rendered HTML
    - Export `metadata` object with title "Community Showcase | AI Website Generator" and SEO description
    - Add route segment config `export const revalidate = 60`
    - Keep empty state and error handling (try/catch around the fetch, render error UI with retry button on failure)
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 6.1_

  - [x] 2.2 Extract `ShowcasePagination` client component
    - Create `src/app/showcase/ShowcasePagination.tsx` with `'use client'` directive
    - Accept `ShowcasePaginationProps` (initialPage, initialTotalPages, initialTotalCount, pageSize)
    - Implement client-side page fetching using existing `useShowcaseWebsites` hook for subsequent pages
    - On page change: fetch new page data, replace grid content, call `window.scrollTo({ top: 0, behavior: 'smooth' })`
    - Display skeleton cards (`WebsiteCardSkeleton`) while loading a new page
    - _Requirements: 1.3, 1.6, 5.1_

  - [x] 2.3 Create `src/app/showcase/error.tsx` error boundary
    - Add `'use client'` directive
    - Accept `error` and `reset` props
    - Render error message and retry button that calls `reset()`
    - _Requirements: 1.5_

  - [x] 2.4 Write unit tests for Showcase page server component
    - Create `src/app/showcase/page.test.tsx`
    - Test that metadata export contains correct title and description
    - Test that the server component renders the website grid with mock data
    - Test error state renders error message and retry button
    - Test empty state renders appropriate message
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [~] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Convert Login Page static content to server rendering
  - [x] 4.1 Rewrite Login page as a mixed server/client component
    - Rewrite `src/app/page.tsx` as an async server component (remove `'use client'` directive)
    - Server-render the hero section (logo, title, description), features grid, and footer as static HTML
    - Server-render the showcase preview section by calling `getShowcasePreviewServer()`
    - Wrap showcase preview fetch in try/catch; render empty state message on failure instead of failing the whole page
    - _Requirements: 2.1, 2.3, 2.4, 2.5_

  - [x] 4.2 Extract `AuthCard` client component
    - Create `src/app/(login)/AuthCard.tsx` (or `src/components/auth/AuthCard.tsx`) with `'use client'` directive
    - Move Google Sign-In button, auth state management (`useAuth`), error display with dismiss, and redirect logic into this component
    - Accept no props — manages its own state via `useAuth()` hook and `useRouter()`
    - _Requirements: 2.2, 2.4_

  - [x] 4.3 Create `ShowcasePreviewServer` server component
    - Create `src/components/ShowcasePreviewServer.tsx` as a server component
    - Fetch showcase preview data using `getShowcasePreviewServer()` from `src/lib/serverData.ts`
    - Render up to 6 `ShowcaseWebsiteCard` components with the server-fetched data
    - On fetch failure, render an empty state section (not an error page)
    - _Requirements: 2.3, 2.5_

  - [x] 4.4 Write unit tests for Login page server sections
    - Update `src/app/page.test.tsx`
    - Test hero section renders title, description, and logo without JS
    - Test features grid renders three feature cards
    - Test showcase preview renders up to 6 items with mock data
    - Test showcase preview shows empty state on fetch failure
    - Test AuthCard renders sign-in button and handles errors
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [ ] 5. Implement streaming with Suspense for Dashboard page
  - [x] 5.1 Rewrite Dashboard page with server-rendered shell and Suspense
    - Rewrite `src/app/dashboard/page.tsx` as a server component (remove top-level `'use client'`)
    - Server-render: `AppHeader`, navigation, page heading, layout container, and `AppFooter` as static HTML in the initial response
    - Wrap the data-dependent content area in `<Suspense fallback={<DashboardSkeleton />}>`
    - The inner content remains a client component (`DashboardContent`) that uses `useAuth()` and `useWebsites()` hooks
    - _Requirements: 3.1, 3.2_

  - [x] 5.2 Create `DashboardSkeleton` loading component
    - Create `src/app/dashboard/DashboardSkeleton.tsx`
    - Render a grid of placeholder skeleton cards matching the dashboard layout
    - Used as the Suspense fallback for immediate visual feedback
    - _Requirements: 3.2_

  - [x] 5.3 Create `src/app/dashboard/error.tsx` error boundary
    - Add `'use client'` directive
    - Accept `error` and `reset` props
    - Render error message with retry mechanism in the content area
    - _Requirements: 3.3_

  - [~] 5.4 Write unit tests for Dashboard streaming shell
    - Test that the static shell (header, nav, footer) renders in the server response
    - Test that DashboardSkeleton renders placeholder cards
    - Test error boundary renders retry mechanism
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 6. Implement streaming with Suspense for Website Preview page
  - [x] 6.1 Rewrite Website Preview page with server-rendered shell and Suspense
    - Rewrite `src/app/website/[id]/page.tsx` to render layout shell and toolbar as static HTML in the initial server response
    - Wrap the data-dependent content (`WebsitePageContent`) in `<Suspense fallback={<PreviewSkeleton />}>`
    - Keep `WebsitePageContent` as a `'use client'` component with all existing interactive logic
    - _Requirements: 3.4, 3.5_

  - [x] 6.2 Create `PreviewSkeleton` loading component
    - Create `src/app/website/[id]/PreviewSkeleton.tsx`
    - Render skeleton placeholders for the editor and preview panels
    - Used as the Suspense fallback
    - _Requirements: 3.5_

  - [x] 6.3 Create `src/app/website/[id]/error.tsx` error boundary
    - Add `'use client'` directive
    - Accept `error` and `reset` props
    - Render error message with retry mechanism
    - _Requirements: 3.6_

  - [~] 6.4 Write unit tests for Website Preview streaming shell
    - Test that the static layout shell and toolbar render in the server response
    - Test that PreviewSkeleton renders editor and preview placeholders
    - Test error boundary renders retry mechanism
    - _Requirements: 3.4, 3.5, 3.6_

- [~] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Verify Generate Page remains client-only and ensure feature parity
  - [~] 8.1 Confirm Generate Page retains `'use client'` directive
    - Verify `src/app/generate/page.tsx` still has `'use client'` at the top
    - Ensure no server-side data fetching is introduced
    - Add a smoke test confirming the directive is present
    - _Requirements: 3.7_

  - [~] 8.2 Verify feature parity across all migrated pages
    - Ensure Showcase pagination works without full page reload with smooth scrolling
    - Ensure Login page Google Sign-In flow, error display/dismiss, and redirect work correctly
    - Ensure Dashboard retains deletion with confirmation, navigation, inline title editing, beautify, and showcase toggling
    - Ensure Website Preview retains code editing, live preview, beautification, download, and auto-save
    - Verify no hydration mismatches by checking client components render correctly after server HTML delivery
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [~] 8.3 Write integration tests for feature parity
    - Test Showcase pagination client interaction
    - Test Dashboard actions (delete, navigate, edit, beautify, showcase toggle) still function
    - Test Website Preview features (code edit, preview, download, auto-save)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [~] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `/view/[id]` page already uses SSR and serves as a reference implementation
- The project uses `unstable_cache` (not `use cache`) per the design decision about Next.js 16 without `cacheComponents: true`
- Always consult `node_modules/next/dist/docs/` for current Next.js API guidance before writing implementation code

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "2.1", "4.3"] },
    { "id": 2, "tasks": ["2.2", "2.3", "4.1", "4.2"] },
    { "id": 3, "tasks": ["2.4", "4.4", "5.2", "6.2"] },
    { "id": 4, "tasks": ["5.1", "5.3", "6.1", "6.3"] },
    { "id": 5, "tasks": ["5.4", "6.4", "8.1"] },
    { "id": 6, "tasks": ["8.2"] },
    { "id": 7, "tasks": ["8.3"] }
  ]
}
```
