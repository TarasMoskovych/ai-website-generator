# Requirements Document

## Introduction

This document defines requirements for migrating the AI Website Generator application from client-side rendering (CSR) to server-side rendering (SSR) where applicable. The goal is to improve initial page load performance, SEO, and user experience by leveraging Next.js App Router server components for pages that display public or static content, while keeping interactive and auth-dependent pages as client components with appropriate streaming patterns.

Currently, the `/view/[id]` page already uses SSR. The remaining pages (`/`, `/showcase`, `/dashboard`, `/generate`, `/website/[id]`) all use `'use client'` directives. This migration targets pages where SSR provides meaningful performance and UX benefits without sacrificing interactivity.

## Glossary

- **Server_Component**: A React component that renders on the server, sends HTML to the client, and does not include client-side JavaScript for interactivity by default.
- **Client_Component**: A React component marked with `'use client'` that renders on the client and supports interactivity, browser APIs, and React hooks like useState and useEffect.
- **SSR**: Server-Side Rendering — the process of generating HTML on the server for each request before sending it to the client.
- **CSR**: Client-Side Rendering — the process of rendering content entirely in the browser using JavaScript.
- **Streaming**: A Next.js capability that progressively sends rendered HTML chunks to the client as they become available.
- **Showcase_Page**: The `/showcase` route that displays publicly showcased websites with pagination.
- **Login_Page**: The `/` route that displays the sign-in form and a community showcase preview.
- **Dashboard_Page**: The `/dashboard` route that displays the authenticated user's generated websites.
- **Generate_Page**: The `/generate` route that provides the website generation interface.
- **Website_Preview_Page**: The `/website/[id]` route that provides the website editor and preview interface.
- **Hydration**: The process where React attaches event listeners and state to server-rendered HTML on the client side.
- **LCP**: Largest Contentful Paint — a Core Web Vital measuring the time until the largest visible content element is rendered.
- **FCP**: First Contentful Paint — the time from navigation until the first content is rendered on screen.
- **Loading_Skeleton**: A placeholder UI element displayed while content is being loaded.

## Requirements

### Requirement 1: Convert Showcase Page to Server-Side Rendering

**User Story:** As a visitor, I want the showcase page to load with content already visible, so that I can see showcased websites immediately without waiting for client-side data fetching.

#### Acceptance Criteria

1. WHEN a user navigates to the Showcase_Page, THE Server_Component SHALL fetch showcased websites on the server and return pre-rendered HTML containing the website grid.
2. WHEN the Showcase_Page is server-rendered, THE Server_Component SHALL include the first page of 12 showcased websites that have both isPublic and isShowcased set to true, sorted by showcasedAt descending.
3. WHEN a user selects a page via pagination controls on the Showcase_Page, THE Client_Component SHALL fetch the requested page of results and replace the current grid content without a full page reload, then scroll to the top of the page.
4. WHILE the Showcase_Page is server-rendering, THE Server_Component SHALL generate metadata containing an HTML title element and a meta description tag describing the showcase content for SEO purposes.
5. IF the data fetch fails during server rendering of the Showcase_Page, THEN THE Server_Component SHALL display an error message and a visible retry button that reloads the page when activated.
6. WHILE the Client_Component is fetching a new page of results after a pagination interaction, THE Client_Component SHALL display placeholder skeleton cards in the grid area until the new results are rendered.

### Requirement 2: Convert Login Page Static Content to Server Rendering

**User Story:** As a visitor, I want the landing page to display its static content and showcase preview immediately, so that I perceive the page as fast-loading.

#### Acceptance Criteria

1. WHEN a user navigates to the Login_Page, THE Server_Component SHALL render the static hero section (application title, description, and logo), feature highlights grid, and page footer as server-rendered HTML without requiring client-side JavaScript execution.
2. WHEN the Login_Page is rendered, THE Client_Component SHALL render the Google Sign-In button, manage authentication state, display authentication errors with a dismiss option, and redirect authenticated users to their intended destination on the client side.
3. WHEN the Login_Page is rendered, THE Server_Component SHALL fetch and pre-render the community showcase preview section with up to 6 showcased websites sorted by showcasedAt descending.
4. THE Server_Component SHALL separate static presentational markup from interactive authentication logic by placing the Google Sign-In button, authentication state management, and redirect logic in a Client_Component composed within the server-rendered page layout.
5. IF the showcase data fetch fails during server rendering of the Login_Page, THEN THE Server_Component SHALL render the showcase section with an empty state message instead of failing the entire page render.

### Requirement 3: Implement Streaming with Suspense for Auth-Protected Pages

**User Story:** As an authenticated user, I want to see a meaningful page shell immediately while my personalized content loads, so that the page feels responsive.

#### Acceptance Criteria

1. WHEN an authenticated user navigates to the Dashboard_Page, THE Server_Component SHALL render the page header, navigation, and layout container as static HTML in the initial server response before any dynamic data fetch completes.
2. WHILE the Dashboard_Page website list data is being fetched from the server, THE Server_Component SHALL stream a Loading_Skeleton grid containing placeholder cards in place of the website grid until the data fetch completes and the rendered website cards replace the skeletons.
3. IF the Dashboard_Page data fetch fails after the layout shell has been rendered, THEN THE Server_Component SHALL display an error message with a retry mechanism in place of the Loading_Skeleton.
4. WHEN an authenticated user navigates to the Website_Preview_Page, THE Server_Component SHALL render the page layout shell and toolbar as static HTML in the initial server response before any dynamic data fetch completes.
5. WHILE the Website_Preview_Page website data is being fetched from the server, THE Server_Component SHALL display a Loading_Skeleton for the preview and code editor panels until the data fetch completes and the rendered content replaces the skeletons.
6. IF the Website_Preview_Page data fetch fails after the layout shell has been rendered, THEN THE Server_Component SHALL display an error message with a retry mechanism in place of the Loading_Skeleton.
7. THE Generate_Page SHALL remain as a Client_Component with a 'use client' directive because its functionality is entirely interactive with no server-fetchable initial data.

### Requirement 4: Improve Core Web Vitals Through SSR

**User Story:** As a product owner, I want server rendering to measurably improve page load metrics, so that users have a better experience and SEO improves.

#### Acceptance Criteria

1. WHEN the Showcase_Page is server-rendered, THE Server_Component SHALL produce a FCP that does not require waiting for client-side JavaScript execution to display content.
2. WHEN the Login_Page is server-rendered, THE Server_Component SHALL produce an LCP that includes the hero section content without requiring client-side hydration for static elements.
3. THE Server_Component SHALL reduce the total JavaScript bundle sent to the client for pages that contain server-rendered content compared to their fully client-rendered equivalents.
4. WHILE a page is being hydrated on the client, THE Client_Component SHALL remain visually stable with no layout shift caused by hydration mismatches.

### Requirement 5: Maintain Feature Parity During Migration

**User Story:** As a user, I want all existing functionality to continue working after the SSR migration, so that the migration does not introduce regressions.

#### Acceptance Criteria

1. WHEN a user interacts with the Showcase_Page pagination, THE Client_Component SHALL navigate between pages without a full page reload and scroll the viewport to the top using smooth scrolling.
2. WHEN a user clicks the Google Sign-In button on the Login_Page, THE Client_Component SHALL initiate the Google OAuth flow, redirect the user to the Dashboard_Page on success, and display a dismissible error alert with the failure reason on error.
3. WHEN an authenticated user performs any action on the Dashboard_Page, THE Client_Component SHALL handle website deletion with confirmation dialog, navigation to preview page on card click, inline title editing with persistence, beautify navigation, and showcase toggling with the same observable outcomes as the CSR implementation.
4. WHEN an authenticated user accesses the Website_Preview_Page, THE Client_Component SHALL provide HTML and CSS code editing with tab switching, live preview rendering with viewport mode selection, beautification workflow with options dialog and before/after comparison, download in single-file and zip formats, and auto-save that persists changes within 2 seconds of the last edit.
5. IF a server-rendered page encounters a hydration mismatch, THEN THE Client_Component SHALL re-render the affected component on the client side and display the fully interactive UI within 3 seconds without showing layout shifts or unstyled content to the user.

### Requirement 6: Implement Proper Caching Strategy for Server-Rendered Pages

**User Story:** As a developer, I want server-rendered pages to use appropriate caching, so that server load is manageable and pages remain fresh.

#### Acceptance Criteria

1. WHEN the Showcase_Page is server-rendered, THE Server_Component SHALL use a time-based revalidation strategy with a revalidation interval of 60 seconds, so that cached page data is refreshed at most every 60 seconds.
2. WHEN the Login_Page showcase preview is server-rendered, THE Server_Component SHALL apply the same 60-second revalidation interval as the full Showcase_Page.
3. WHILE serving cached content, THE Server_Component SHALL revalidate in the background so that subsequent requests receive updated data without blocking the current response.
4. IF a cache revalidation fails due to a network error or data fetch error, THEN THE Server_Component SHALL continue serving the previously cached content for up to 24 hours, after which the next request SHALL attempt a fresh server render rather than serving stale content.
5. IF the stale cache age exceeds 24 hours and a fresh server render also fails, THEN THE Server_Component SHALL display an error message indicating that content is temporarily unavailable.
