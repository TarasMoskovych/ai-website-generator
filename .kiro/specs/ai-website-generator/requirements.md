# Requirements Document

## Introduction

This document defines the requirements for an AI-powered website generator application. The application allows users to generate complete websites by providing either a text description or a screenshot. The AI parses the input and produces HTML and CSS code. The application is built using Next.js and integrates with the Anthropic Claude API for AI-powered generation. Users authenticate via Google Sign-In through Firebase Authentication, and their generated websites are stored in Firebase Firestore. Users can view a list of their previously generated websites from the homepage.

## Glossary

- **Website_Generator**: The core AI service that processes user input and produces website code
- **Input_Handler**: The component responsible for accepting and validating user input (text or images)
- **Text_Input**: A natural language description of the desired website provided by the user
- **Screenshot_Input**: An image file uploaded by the user showing a website design to replicate
- **Generated_Website**: The output produced by the Website_Generator containing HTML and CSS code
- **Website_Repository**: The Firebase Firestore storage system that persists generated websites for later retrieval
- **Preview_Renderer**: The component that displays a live preview of the generated website
- **Homepage**: The main landing page displaying the list of previously generated websites
- **Auth_Handler**: The Firebase Authentication component responsible for user authentication via Google Sign-In
- **Authenticated_User**: A user who has successfully signed in via Google authentication

## Requirements

### Requirement 1: Text-Based Website Generation

**User Story:** As a user, I want to describe a website in natural language, so that the AI can generate HTML and CSS code matching my description.

#### Acceptance Criteria

1. WHEN a user submits a Text_Input, THE Input_Handler SHALL validate that the input is non-empty and contains at least 10 characters
2. WHEN a valid Text_Input is received, THE Website_Generator SHALL send the description to the Claude API for processing with a timeout of 60 seconds
3. WHEN the Claude API returns a response containing valid HTML and CSS code, THE Website_Generator SHALL extract the HTML and CSS code from the response
4. WHEN generation is complete, THE Website_Generator SHALL return a Generated_Website object containing the HTML, CSS, title, creation timestamp, and input type
5. IF the Claude API returns an error, THEN THE Website_Generator SHALL return an error message to the user indicating the nature of the failure
6. IF the Text_Input exceeds 10,000 characters, THEN THE Input_Handler SHALL reject the input with an error message indicating the character limit was exceeded
7. IF the Claude API response does not contain extractable HTML or CSS code, THEN THE Website_Generator SHALL return an error message indicating that generation failed to produce valid website code
8. IF the Claude API request times out after 60 seconds, THEN THE Website_Generator SHALL return an error message indicating the request timed out and allow the user to retry

### Requirement 2: Screenshot-Based Website Generation

**User Story:** As a user, I want to upload a screenshot of a website, so that the AI can generate HTML and CSS code replicating the design.

#### Acceptance Criteria

1. WHEN a user uploads a Screenshot_Input, THE Input_Handler SHALL validate the file is an image (PNG, JPG, JPEG, or WebP format)
2. WHEN a user uploads a Screenshot_Input, THE Input_Handler SHALL validate the file size does not exceed 10MB
3. WHEN a user uploads a Screenshot_Input, THE Input_Handler SHALL validate the image dimensions are at least 200x200 pixels
4. WHEN a valid Screenshot_Input is received, THE Website_Generator SHALL encode the image and send it to the Claude API with vision capabilities
5. WHEN the Claude API returns a response, THE Website_Generator SHALL extract the HTML and CSS code that replicates the screenshot design and return a Generated_Website object containing the HTML, CSS, and metadata
6. IF the uploaded file is not a valid image format, THEN THE Input_Handler SHALL reject the upload with an error message indicating the supported formats
7. IF the image file exceeds the size limit, THEN THE Input_Handler SHALL reject the upload with an error message indicating the maximum allowed size
8. IF the image dimensions are below the minimum requirement, THEN THE Input_Handler SHALL reject the upload with an error message indicating the minimum required dimensions
9. IF the Claude API returns an error, THEN THE Website_Generator SHALL return an error message to the user indicating the generation failed

### Requirement 3: Website Preview

**User Story:** As a user, I want to see a live preview of my generated website, so that I can verify it matches my expectations before saving or downloading.

#### Acceptance Criteria

1. WHEN a Generated_Website is produced, THE Preview_Renderer SHALL display the website in an isolated iframe within 2 seconds
2. WHILE the preview is displayed, THE Preview_Renderer SHALL apply the generated CSS within the iframe scope
3. THE Preview_Renderer SHALL support responsive preview modes with the following viewport dimensions: desktop (1280x800 pixels), tablet (768x1024 pixels), and mobile (375x667 pixels)
4. WHEN the preview is first displayed, THE Preview_Renderer SHALL default to the desktop viewport mode and visually indicate the active viewport selection
5. WHEN a user selects a viewport size, THE Preview_Renderer SHALL resize the iframe to match the selected dimensions within 500 milliseconds
6. THE Preview_Renderer SHALL sanitize the generated HTML before rendering by removing inline event handlers, script tags, and javascript: URLs while preserving structural HTML elements and styling attributes
7. IF the generated HTML or CSS contains syntax errors that prevent rendering, THEN THE Preview_Renderer SHALL display an error message indicating the preview cannot be rendered and provide access to the code editor for manual correction

### Requirement 4: Website Code Download

**User Story:** As a user, I want to download the generated website code, so that I can use it in my own projects.

#### Acceptance Criteria

1. WHEN a user requests to download a Generated_Website, THE Website_Generator SHALL present download format options for single HTML file with embedded CSS or separate HTML and CSS files in a ZIP archive
2. WHEN the user selects single HTML file format, THE Website_Generator SHALL generate a downloadable HTML file with CSS embedded in a style element
3. WHEN the user selects ZIP archive format, THE Website_Generator SHALL generate a downloadable ZIP archive containing separate index.html and styles.css files
4. WHEN the download is initiated, THE Website_Generator SHALL generate the files within 5 seconds
5. IF file generation exceeds 5 seconds, THEN THE Website_Generator SHALL display an error message indicating the timeout and offer a retry option
6. IF download file generation fails, THEN THE Website_Generator SHALL display an error message indicating the failure reason and allow the user to retry

### Requirement 5: Website Persistence

**User Story:** As a user, I want my generated websites to be saved automatically to my account, so that I can access them later from any device.

#### Acceptance Criteria

1. WHEN a Generated_Website is successfully created, THE Website_Repository SHALL persist the website data to Firebase Firestore including HTML, CSS, title, creation timestamp, input type (text or screenshot), and the authenticated user's ID
2. WHEN a Generated_Website is persisted, THE Website_Repository SHALL generate and store a thumbnail preview as a base64 data URL with dimensions of 320x240 pixels directly in the Firestore document
3. WHEN a Generated_Website is persisted, THE Website_Repository SHALL assign a unique identifier to the website
4. THE Website_Repository SHALL only allow users to access their own Generated_Websites based on the authenticated user's ID
5. IF persistence fails, THEN THE Website_Repository SHALL display an error message indicating the failure reason and provide a retry button for manual retry
6. THE Website_Repository SHALL retain Generated_Websites until explicitly deleted by the user
7. IF a thumbnail cannot be generated, THEN THE Website_Repository SHALL store a default placeholder thumbnail and complete the persistence operation

### Requirement 6: Homepage Website List

**User Story:** As an authenticated user, I want to see a list of my previously generated websites on the homepage, so that I can quickly access and manage them.

#### Acceptance Criteria

1. WHEN the Homepage loads for an authenticated user, THE Homepage SHALL retrieve and display only the Generated_Websites belonging to that user from Firebase Firestore for the current page
2. THE Homepage SHALL display each Generated_Website with its thumbnail, title, creation date, and input type indicator (text or screenshot)
3. THE Homepage SHALL sort Generated_Websites by creation date in descending order (newest first)
4. WHEN a user clicks on a Generated_Website entry, THE Homepage SHALL navigate to the preview page for that website
5. THE Homepage SHALL display 12 websites per page with pagination controls showing page numbers and next/previous navigation buttons
6. IF no Generated_Websites exist for the authenticated user, THEN THE Homepage SHALL display an empty state message with a visible call-to-action button or link to create a new website
7. IF the Website_Repository fails to retrieve Generated_Websites, THEN THE Homepage SHALL display an error message with a retry option

### Requirement 7: Website Deletion

**User Story:** As a user, I want to delete generated websites I no longer need, so that I can keep my list organized.

#### Acceptance Criteria

1. WHEN a user requests to delete a Generated_Website, THE Website_Repository SHALL display a confirmation dialog that identifies the website by title and provides confirm and cancel options
2. WHEN the user confirms deletion, THE Website_Repository SHALL permanently remove the Generated_Website including its HTML, CSS, thumbnail, title, and metadata
3. WHEN the user cancels the deletion request, THE Website_Repository SHALL dismiss the confirmation dialog and retain the website data unchanged
4. IF deletion fails, THEN THE Website_Repository SHALL display an error message indicating the failure reason and retain the website data
5. WHEN deletion is successful, THE Homepage SHALL update to remove the deleted website from the list within 1 second without requiring a page refresh

### Requirement 8: Generation Loading State

**User Story:** As a user, I want to see progress feedback during website generation, so that I know the system is working on my request.

#### Acceptance Criteria

1. WHEN website generation begins, THE Website_Generator SHALL display a visible loading indicator with an animated element to confirm active processing
2. WHILE generation is in progress, THE Website_Generator SHALL display status messages indicating the current generation stage (e.g., "Processing input", "Generating HTML", "Generating CSS")
3. WHILE generation is in progress, THE Website_Generator SHALL display a visible cancel button
4. WHEN a user activates the cancel button, THE Website_Generator SHALL stop the generation process within 5 seconds and return to the input state
5. WHEN a user cancels generation, THE Website_Generator SHALL preserve the user's original input (Text_Input or Screenshot_Input)
6. IF generation takes longer than 60 seconds, THEN THE Website_Generator SHALL display a message indicating that processing is taking longer than expected and generation is still in progress

### Requirement 9: Input Mode Selection

**User Story:** As a user, I want to easily switch between text and screenshot input modes, so that I can choose the best method for my needs.

#### Acceptance Criteria

1. THE Input_Handler SHALL display labeled options for text input and screenshot upload, where each option displays the mode name and a corresponding icon
2. WHEN the input page loads, THE Input_Handler SHALL display text input mode as the default active mode
3. THE Input_Handler SHALL visually distinguish the active input mode from the inactive mode using a highlighted border or background
4. WHEN a user selects text input mode, THE Input_Handler SHALL display a text area for entering the website description
5. WHEN a user selects screenshot input mode, THE Input_Handler SHALL display a file upload area with drag-and-drop support and a click-to-browse option
6. THE Input_Handler SHALL allow only one input mode to be active at a time
7. WHEN switching input modes and the current input contains at least one non-whitespace character, THE Input_Handler SHALL display a confirmation dialog warning that existing content will be cleared
8. IF the user confirms the mode switch in the confirmation dialog, THEN THE Input_Handler SHALL clear the previous input and activate the selected mode
9. IF the user cancels the mode switch in the confirmation dialog, THEN THE Input_Handler SHALL retain the current input and keep the original mode active

### Requirement 10: Generated Code Editing

**User Story:** As a user, I want to view and edit the generated HTML and CSS code, so that I can make manual adjustments before downloading.

#### Acceptance Criteria

1. WHEN viewing a Generated_Website, THE Preview_Renderer SHALL provide a code editor panel with separate tabs for HTML and CSS code
2. THE code editor SHALL provide syntax highlighting for HTML and CSS
3. WHEN a user modifies code in the editor, THE Preview_Renderer SHALL update the preview within 1 second after the user stops typing
4. IF the user enters invalid HTML or CSS syntax, THEN THE code editor SHALL display a visual indicator of the syntax error location without blocking preview updates
5. THE code editor SHALL preserve user modifications when downloading the website
6. WHEN a user saves modifications or navigates away from the editor, THE Website_Repository SHALL persist the user modifications to the Generated_Website
7. IF saving modifications fails, THEN THE Website_Repository SHALL display an error message and retain the unsaved modifications in the editor

### Requirement 11: Website Title Generation

**User Story:** As a user, I want the AI to generate appropriate titles for my websites, so that I can easily identify them in my list.

#### Acceptance Criteria

1. WHEN generating a website from Text_Input, THE Website_Generator SHALL extract or generate a title that summarizes the website's purpose or content in 3 to 100 characters
2. WHEN generating a website from Screenshot_Input, THE Website_Generator SHALL analyze visible text and layout elements in the image and generate a title that summarizes the website's purpose or content in 3 to 100 characters
3. IF the Website_Generator cannot extract or generate a title, THEN THE Website_Generator SHALL assign a default title in the format "Untitled Website [creation timestamp]"
4. THE Homepage SHALL display an edit control for each Generated_Website title that allows inline editing
5. WHEN a user edits a title, THE Input_Handler SHALL validate that the title contains between 1 and 100 characters before submission
6. IF a user submits an edited title that fails validation, THEN THE Input_Handler SHALL display an error message indicating the title length requirements
7. WHEN a user submits a valid edited title, THE Website_Repository SHALL persist the updated title and display a confirmation indicator

### Requirement 12: Error Handling and Recovery

**User Story:** As a user, I want clear error messages and recovery options when something goes wrong, so that I can resolve issues and continue using the application.

#### Acceptance Criteria

1. IF an API request fails due to network issues, THEN THE Website_Generator SHALL display an error message indicating connectivity failure and a manual retry button that allows the user to reattempt the request up to 3 times
2. IF the Claude API rate limit is exceeded, THEN THE Website_Generator SHALL inform the user that the rate limit has been reached and display the estimated wait time in minutes as provided by the API response
3. IF an unexpected error occurs, THEN THE Website_Generator SHALL log the error details and display an error message that describes what operation failed and suggests a recovery action without exposing technical details
4. IF an error occurs during website generation, THEN THE Website_Generator SHALL preserve the user's text input or uploaded screenshot in the input form to allow immediate retry without re-entering data
5. WHEN an error message is displayed, THE Website_Generator SHALL include a dismiss button allowing the user to close the message

### Requirement 13: Google Authentication

**User Story:** As a user, I want to sign in with my Google account, so that I can securely access and manage my generated websites across devices.

#### Acceptance Criteria

1. WHEN an unauthenticated user accesses the application, THE Auth_Handler SHALL display a login page with a "Sign in with Google" button
2. WHEN a user clicks the "Sign in with Google" button, THE Auth_Handler SHALL initiate the Google OAuth flow via Firebase Authentication
3. WHEN Google authentication succeeds, THE Auth_Handler SHALL create or update the user session and redirect the user to the Homepage
4. IF Google authentication fails, THEN THE Auth_Handler SHALL display an error message indicating the authentication failed and allow the user to retry
5. THE Auth_Handler SHALL persist the authentication session so users remain signed in across browser sessions until they explicitly sign out
6. WHEN an authenticated user clicks the sign out button, THE Auth_Handler SHALL terminate the user session and redirect to the login page

### Requirement 14: Protected Routes

**User Story:** As a user, I want my generated websites to be private and accessible only when I'm signed in, so that my work is secure.

#### Acceptance Criteria

1. THE application SHALL require authentication for accessing the Homepage, generation page, and website preview pages
2. IF an unauthenticated user attempts to access a protected route, THEN THE Auth_Handler SHALL redirect the user to the login page
3. AFTER successful authentication, THE Auth_Handler SHALL redirect the user to their originally requested page
4. THE login page SHALL be accessible to unauthenticated users
5. THE Auth_Handler SHALL validate the user's authentication state on each protected route access

### Requirement 15: User Profile Display

**User Story:** As an authenticated user, I want to see my profile information in the application header, so that I know which account I'm using.

#### Acceptance Criteria

1. WHEN an authenticated user views any protected page, THE application header SHALL display the user's Google profile picture and display name
2. THE application header SHALL display a sign out button accessible from any protected page
3. WHEN a user clicks on their profile picture or name, THE application SHALL display a dropdown menu with the user's email and a sign out option
4. IF the user's profile picture is unavailable, THEN THE application header SHALL display a default avatar with the user's initial

### Requirement 16: Public Website View

**User Story:** As a user, I want to view my generated website as a standalone full-page site and share the link with others, so that I can showcase my generated websites.

#### Acceptance Criteria

1. WHEN a user navigates to /view/[id], THE application SHALL render the Generated_Website's HTML and CSS as a full-page standalone website without any application UI elements
2. THE public view page SHALL be accessible without authentication to allow sharing with others
3. THE public view page SHALL include proper HTML document structure with the generated HTML in the body and CSS in a style tag
4. THE public view page SHALL set appropriate meta tags including the website title
5. IF the requested website ID does not exist, THEN THE application SHALL display a 404 error page
6. THE Website_Repository SHALL store a public visibility flag for each Generated_Website that defaults to true
7. IF a Generated_Website has public visibility disabled, THEN THE public view page SHALL require authentication and verify ownership before rendering

### Requirement 17: Generated Website Quality Standards

**User Story:** As a user, I want my generated websites to follow modern web development best practices, so that they are professional, accessible, and maintainable.

#### Acceptance Criteria

1. THE Website_Generator SHALL instruct Claude to generate HTML using semantic HTML5 elements (header, nav, main, section, article, aside, footer) for proper document structure
2. THE Website_Generator SHALL instruct Claude to generate accessible HTML including proper heading hierarchy (h1-h6), ARIA labels where appropriate, alt text placeholders for images, and sufficient color contrast considerations
3. THE Website_Generator SHALL instruct Claude to use CSS Grid and/or Flexbox for all layout structures
4. THE Website_Generator SHALL instruct Claude to generate responsive CSS using mobile-first approach with appropriate media queries for tablet and desktop breakpoints
5. THE Website_Generator SHALL instruct Claude to follow BEM (Block Element Modifier) naming convention for all CSS class names
6. THE Website_Generator SHALL instruct Claude to include the viewport meta tag and other necessary HTML5 meta tags in the generated HTML
7. THE Website_Generator SHALL NOT include any JavaScript in the generated website code

### Requirement 18: Dark Theme Support for Generated Websites

**User Story:** As a user, I want my generated websites to include dark theme support, so that they provide a modern user experience with theme preference detection.

#### Acceptance Criteria

1. THE Website_Generator SHALL instruct Claude to generate CSS that includes both light and dark color schemes using CSS custom properties (variables)
2. THE Website_Generator SHALL instruct Claude to include a prefers-color-scheme media query that automatically applies the dark theme when the user's system preference is set to dark mode
3. THE generated CSS SHALL define color variables for backgrounds, text, borders, and accent colors that change based on the active theme
4. THE generated dark theme SHALL maintain sufficient color contrast for accessibility (WCAG AA compliance)

### Requirement 19: Dark Theme Support for Application

**User Story:** As a user, I want the AI Website Generator application itself to support dark theme, so that I can use the app comfortably in low-light environments.

#### Acceptance Criteria

1. THE application SHALL detect the user's system color scheme preference and apply the corresponding theme on initial load
2. THE application SHALL provide a theme toggle button in the header that allows users to switch between light and dark themes
3. WHEN a user manually selects a theme, THE application SHALL persist the preference in local storage and apply it on subsequent visits
4. THE application dark theme SHALL use a consistent color palette across all pages and components
5. THE application SHALL ensure all UI elements maintain sufficient color contrast in both light and dark themes
6. THE code editor component SHALL support dark theme with appropriate syntax highlighting colors

### Requirement 20: Real-Time Streaming Generation

**User Story:** As a user, I want to see the website code being generated in real-time, so that I can monitor progress and know the system is actively working.

#### Acceptance Criteria

1. WHEN website generation begins for text input, THE Website_Generator SHALL stream the response from Claude API in real-time
2. WHEN website generation begins for screenshot input, THE Website_Generator SHALL stream the response from Claude API in real-time
3. WHILE streaming is in progress, THE loading indicator SHALL display a collapsible output preview panel showing the content as it is received
4. THE output preview panel SHALL display statistics including line count and character count
5. THE output preview panel SHALL be expanded by default and allow the user to collapse/expand it
6. THE streaming preview SHALL show the last 500 characters of generated content to provide context without overwhelming the UI
7. THE generation stage indicator SHALL update automatically based on content patterns (e.g., detecting CSS block start, title extraction)
8. IF the streaming response is truncated (incomplete code blocks without closing backticks), THE code extractor SHALL attempt to extract usable HTML and CSS content from the partial response
9. WHEN extracting from truncated responses, THE code extractor SHALL also extract inline CSS from `<style>` tags within the HTML if no separate CSS block is found

### Requirement 21: Code Panel Collapse/Expand

**User Story:** As a user, I want to collapse and expand the code editor panel, so that I can focus on the preview when needed.

#### Acceptance Criteria

1. THE website preview/editor page SHALL display a header above the code editor panel with a collapse button
2. WHEN a user clicks the collapse button, THE code panel SHALL animate closed and the preview panel SHALL expand to fill the available space
3. WHEN the code panel is collapsed, THE application SHALL display a vertical tab with a code icon and "Code" label
4. WHEN a user clicks the vertical tab, THE code panel SHALL animate open and restore its previous width
5. THE collapse/expand animation SHALL complete within 300 milliseconds

### Requirement 22: Fullscreen Preview Mode

**User Story:** As a user, I want to view the generated website in fullscreen mode, so that I can see exactly how it will look at full browser size.

#### Acceptance Criteria

1. THE preview panel SHALL display a fullscreen button (maximize icon) in the top-right corner
2. WHEN a user clicks the fullscreen button, THE application SHALL display the generated website in a fullscreen modal overlay
3. THE fullscreen preview SHALL render the website without any viewport constraints at full browser size
4. THE fullscreen modal SHALL display the website title and an "Exit Fullscreen" button in a header bar
5. WHEN a user clicks "Exit Fullscreen", THE application SHALL close the modal and return to the preview/editor view
6. THE fullscreen preview SHALL use the same sanitized HTML rendering as the regular preview for security

### Requirement 23: Public Website Showcase

**User Story:** As a user, I want to share my generated websites publicly so that other users can discover and get inspired by my creations.

#### Acceptance Criteria

1. THE website preview/editor page SHALL display a "Share to Showcase" toggle or button that allows the user to make their website publicly visible
2. WHEN a user enables public sharing, THE Website_Repository SHALL update the website's `isShowcased` field to true and record the `showcasedAt` timestamp
3. WHEN a user disables public sharing, THE Website_Repository SHALL update the website's `isShowcased` field to false
4. THE login page SHALL display a "Community Showcase" section below the sign-in form showing recently shared public websites
5. THE Community Showcase section on the login page SHALL display up to 6 showcased websites as a preview with a "View All" link
6. THE application SHALL provide a dedicated /showcase page displaying all showcased websites with pagination (12 per page)
7. THE showcase pages SHALL sort websites by the date they were showcased in descending order (newest first)
8. WHEN a visitor clicks on a showcased website, THE application SHALL open the public view page (/view/[id]) in a new browser tab
9. THE showcased website cards SHALL display the thumbnail, title, and creator's display name for attribution
10. IF no showcased websites exist, THE Community Showcase section SHALL display a message encouraging users to share their creations
11. THE Website_Repository SHALL only include websites where both `isPublic` is true AND `isShowcased` is true in the showcase query
12. THE dashboard page SHALL display a visual indicator (e.g., globe icon or "Shared" badge) on websites that are currently showcased
13. THE /showcase page SHALL be accessible without authentication to allow discovery by visitors
