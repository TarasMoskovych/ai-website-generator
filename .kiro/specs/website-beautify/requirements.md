# Requirements Document

## Introduction

The Website Beautify feature provides a single "Beautify" button that intelligently enhances generated websites. The feature serves two purposes: (1) for partially generated or incomplete websites, the AI detects missing content and completes it before applying beautification; (2) for complete websites, the AI enhances the visual design with better styling, smoother animations, and more polish. The system automatically determines which scenario applies based on completeness detection strategies and takes the appropriate action.

## Glossary

- **Beautify_Service**: The backend service responsible for analyzing website completeness and generating enhanced HTML/CSS code via the Claude API
- **Completeness_Detector**: The module that analyzes website HTML/CSS to determine if it is structurally complete or requires completion
- **Beautify_Button**: The UI control that triggers the beautification process
- **Beautify_API**: The streaming API endpoint (`/api/beautify/stream`) that processes beautification requests
- **Preview_Comparison**: The UI component that displays original and beautified versions side-by-side for user comparison
- **Website_Repository**: The Firebase Firestore service that persists website data
- **Generation_Marker**: The HTML comment `<!-- GENERATION_COMPLETE -->` that indicates a website was fully generated
- **Structural_Elements**: The core HTML sections (header, main content, footer) that constitute a complete webpage
- **Beautification_Mode**: Either "complete" (finish incomplete website then beautify) or "enhance" (enhance already complete website)
- **Original_Prompt**: The text description used to generate the website, stored for context during beautification

## Requirements

### Requirement 0: Original Prompt Storage

**User Story:** As a user, I want my original text description to be saved with my website, so that the AI can use it as context during beautification for better results.

#### Acceptance Criteria

1. WHEN a website is generated from a text description, THE Website_Repository SHALL store the original text prompt in a new `originalPrompt` field
2. THE `originalPrompt` field SHALL be a string with a maximum length of 10,000 characters (matching the existing input validation limit)
3. WHEN a website is generated from a screenshot, THE `originalPrompt` field SHALL be set to null or omitted
4. THE `originalPrompt` field SHALL be included when fetching website data from Firestore
5. WHEN the Beautify_API receives a beautification request, THE API SHALL fetch the `originalPrompt` from the website document if available
6. IF an `originalPrompt` exists, THEN THE Beautify_Service SHALL include the original prompt as context in the Claude API request
7. THE enhancement prompt SHALL instruct the AI to consider the original design intent from the prompt when making visual improvements
8. THE completion prompt SHALL use the original prompt to better understand what content should be added to incomplete sections

### Requirement 0.1: Reference Image Upload for Beautification

**User Story:** As a user, I want to optionally upload a reference image when beautifying my website, so that the AI can use it as visual guidance for improvements.

#### Acceptance Criteria

1. THE Beautify_Button click SHALL open a Beautify_Options_Dialog before starting beautification
2. THE Beautify_Options_Dialog SHALL display two options: "Quick Beautify" (no reference) and "Beautify with Reference Image"
3. WHEN "Quick Beautify" is selected, THE beautification SHALL proceed using only the stored `originalPrompt` (if available) and the current HTML/CSS
4. WHEN "Beautify with Reference Image" is selected, THE dialog SHALL display an image upload area with drag-and-drop support
5. THE image upload area SHALL accept PNG, JPG, JPEG, and WebP formats (matching existing screenshot validation)
6. THE image upload area SHALL validate that images do not exceed 10MB in size
7. THE image upload area SHALL display a preview of the selected image before confirmation
8. WHEN a reference image is uploaded and confirmed, THE Beautify_API request SHALL include the image as base64-encoded data
9. THE Beautify_Options_Dialog SHALL provide a "Cancel" button to close without starting beautification
10. IF a reference image is provided, THEN THE Beautify_Service SHALL send the image to the Claude API as visual context
11. THE beautification prompt SHALL instruct the AI to use the reference image as a style guide while preserving the website's existing content
12. THE reference image SHALL NOT be stored permanently; it is used only for the current beautification request

### Requirement 1: Website Completeness Detection

**User Story:** As a user, I want the system to automatically detect whether my website is incomplete or complete, so that the appropriate beautification action is taken without manual intervention.

#### Acceptance Criteria

1. WHEN a beautify request is received, THE Completeness_Detector SHALL analyze the HTML content for structural completeness within 2 seconds
2. THE Completeness_Detector SHALL check for the presence of a Generation_Marker (`<!-- GENERATION_COMPLETE -->`) in the HTML
3. IF the Generation_Marker is present, THEN THE Completeness_Detector SHALL classify the website as "complete"
4. IF the Generation_Marker is absent, THEN THE Completeness_Detector SHALL perform structural analysis
5. THE Completeness_Detector SHALL check for the presence of Structural_Elements: header section, main content section, and footer section
6. IF any Structural_Elements are missing, THEN THE Completeness_Detector SHALL classify the website as "incomplete"
7. THE Completeness_Detector SHALL check for obvious truncation indicators: unclosed HTML tags, cut-off text ending mid-word, or incomplete CSS rules
8. IF truncation indicators are detected, THEN THE Completeness_Detector SHALL classify the website as "incomplete"
9. WHEN structural analysis is complete, THE Completeness_Detector SHALL return both the classification ("complete" or "incomplete") and a list of detected issues

### Requirement 2: Incomplete Website Completion

**User Story:** As a user, I want incomplete websites to be automatically finished before beautification, so that I receive a fully functional and polished website.

#### Acceptance Criteria

1. WHEN the Completeness_Detector classifies a website as "incomplete", THE Beautify_Service SHALL first complete the missing sections
2. THE Beautify_Service SHALL send the existing HTML and CSS along with detected issues to the Claude API for completion
3. THE Beautify_Service SHALL instruct the AI to maintain consistency with the existing design style when completing missing sections
4. WHEN completing missing Structural_Elements, THE Beautify_Service SHALL ensure the completed sections follow semantic HTML5 practices
5. IF truncated HTML tags are detected, THEN THE Beautify_Service SHALL close all unclosed tags appropriately
6. IF truncated text is detected, THEN THE Beautify_Service SHALL complete the text content contextually
7. AFTER completion is finished, THE Beautify_Service SHALL proceed to apply visual enhancements to the complete website
8. THE Beautify_Service SHALL add the Generation_Marker to the completed HTML before returning the result

### Requirement 3: Complete Website Enhancement

**User Story:** As a user, I want my complete websites to be visually enhanced with better styling and polish, so that my websites look more professional.

#### Acceptance Criteria

1. WHEN the Completeness_Detector classifies a website as "complete", THE Beautify_Service SHALL apply visual enhancements only
2. THE Beautify_Service SHALL send the complete HTML and CSS to the Claude API with enhancement instructions
3. THE Beautify_Service SHALL request the following enhancement types: improved color harmony, refined typography, smoother transitions and animations, better spacing and alignment, enhanced hover states, and subtle shadows or depth effects
4. THE Beautify_Service SHALL preserve the original layout structure while enhancing visual elements
5. THE Beautify_Service SHALL maintain WCAG AA accessibility compliance in all enhancements
6. THE Beautify_Service SHALL ensure responsive design is preserved or improved across desktop, tablet, and mobile viewports
7. THE Beautify_Service SHALL preserve any existing dark mode support or add dark mode support if missing

### Requirement 4: Beautify API Endpoint

**User Story:** As a developer, I want a streaming API endpoint for beautification, so that users can see progress in real-time during the enhancement process.

#### Acceptance Criteria

1. THE Beautify_API SHALL expose a POST endpoint at `/api/beautify/stream`
2. THE Beautify_API SHALL require Firebase authentication via Bearer token in the Authorization header
3. IF authentication fails, THEN THE Beautify_API SHALL return a 401 status with an error event
4. THE Beautify_API SHALL accept a JSON body with: `websiteId` (string, required), `html` (string, required), `css` (string, required), `originalPrompt` (string, optional), `referenceImage` (string, optional, base64-encoded), and `referenceImageMimeType` (string, optional)
5. IF required fields are missing, THEN THE Beautify_API SHALL return a 400 status with a validation error event
6. IF `originalPrompt` is not provided in the request, THE Beautify_API SHALL attempt to fetch it from the website document using `websiteId`
7. IF `referenceImage` is provided, THE Beautify_API SHALL validate the mime type is one of: image/png, image/jpeg, image/webp
8. IF `referenceImage` validation fails, THEN THE Beautify_API SHALL return a 400 status with a validation error event
6. THE Beautify_API SHALL return Server-Sent Events (SSE) with Content-Type `text/event-stream`
7. THE Beautify_API SHALL emit the following event types: `start`, `mode` (with completeness detection result), `text` (streaming content chunks), `done` (with final result), and `error`
8. THE Beautify_API SHALL have a maximum duration of 120 seconds
9. IF the Claude API request times out, THEN THE Beautify_API SHALL emit an error event with a timeout message

### Requirement 5: Beautify Button on Website Preview Page

**User Story:** As a user, I want a Beautify button on the website preview page, so that I can enhance my website immediately after generation.

#### Acceptance Criteria

1. THE Website_Preview_Page SHALL display a Beautify_Button in the action toolbar alongside existing buttons (Preview, Download)
2. THE Beautify_Button SHALL display a sparkle or wand icon to indicate enhancement functionality
3. WHEN the Beautify_Button is clicked, THE Website_Preview_Page SHALL initiate a beautification request with the current HTML and CSS
4. WHILE beautification is in progress, THE Beautify_Button SHALL display a loading spinner and be disabled
5. WHILE beautification is in progress, THE Website_Preview_Page SHALL display a loading overlay with status messages
6. THE loading overlay SHALL show the detected Beautification_Mode ("Completing and enhancing..." or "Enhancing design...")
7. WHEN beautification completes successfully, THE Website_Preview_Page SHALL display the Preview_Comparison component
8. IF beautification fails, THEN THE Website_Preview_Page SHALL display an error message with a retry option

### Requirement 6: Beautify Button on Dashboard Website Cards

**User Story:** As a user, I want to beautify saved websites directly from my dashboard, so that I can enhance any of my existing websites without navigating to the preview page first.

#### Acceptance Criteria

1. WHEN hovering over a WebsiteCard, THE WebsiteCard SHALL display a Beautify_Button alongside existing action buttons (edit, delete)
2. THE Beautify_Button SHALL display a sparkle or wand icon consistent with the preview page button
3. WHEN the Beautify_Button is clicked, THE Dashboard SHALL navigate to the website preview page and automatically trigger beautification
4. THE Dashboard SHALL pass a `beautify=true` query parameter to trigger automatic beautification on page load
5. WHEN the preview page receives the `beautify=true` parameter, THE Website_Preview_Page SHALL automatically initiate beautification after the website loads

### Requirement 7: Before/After Comparison

**User Story:** As a user, I want to compare the original and beautified versions of my website, so that I can decide whether to accept or reject the changes.

#### Acceptance Criteria

1. WHEN beautification completes, THE Preview_Comparison SHALL display two side-by-side iframe previews
2. THE Preview_Comparison SHALL label the left preview as "Original" and the right preview as "Beautified"
3. THE Preview_Comparison SHALL synchronize scrolling between both previews when the user scrolls
4. THE Preview_Comparison SHALL provide viewport mode controls (desktop, tablet, mobile) that apply to both previews simultaneously
5. THE Preview_Comparison SHALL display an "Accept Changes" button that applies the beautified version
6. THE Preview_Comparison SHALL display a "Reject Changes" button that discards the beautified version
7. WHEN the user clicks "Accept Changes", THE Preview_Comparison SHALL update the code editor with the beautified HTML and CSS
8. WHEN the user clicks "Accept Changes", THE Preview_Comparison SHALL close and return to the normal preview mode
9. WHEN the user clicks "Reject Changes", THE Preview_Comparison SHALL close and preserve the original HTML and CSS
10. THE Preview_Comparison SHALL provide a toggle to switch between side-by-side and overlay comparison modes

### Requirement 8: Beautification Version Management

**User Story:** As a user, I want to choose whether to save the beautified version as a new website or overwrite the original, so that I can preserve my original work if desired.

#### Acceptance Criteria

1. WHEN the user accepts beautified changes, THE Preview_Comparison SHALL display a save options dialog
2. THE save options dialog SHALL provide two options: "Replace Original" and "Save as New"
3. WHEN "Replace Original" is selected, THE Website_Repository SHALL update the existing website document with beautified HTML, CSS, and regenerated thumbnail
4. WHEN "Save as New" is selected, THE Website_Repository SHALL create a new website document with beautified content
5. WHEN "Save as New" is selected, THE new website title SHALL be the original title with " (Beautified)" appended
6. WHEN "Save as New" is selected, THE Dashboard SHALL navigate to the newly created website's preview page
7. WHEN save completes successfully, THE Preview_Comparison SHALL display a success confirmation message
8. IF save fails, THEN THE Preview_Comparison SHALL display an error message and allow retry

### Requirement 9: Streaming Progress Display

**User Story:** As a user, I want to see real-time progress during beautification, so that I know the enhancement is actively working and can estimate completion time.

#### Acceptance Criteria

1. WHILE beautification is streaming, THE loading overlay SHALL display the raw streaming content in a collapsible preview area
2. THE streaming preview SHALL auto-scroll to show the latest content as it arrives
3. THE loading overlay SHALL display an elapsed time counter showing seconds since beautification started
4. THE loading overlay SHALL provide a cancel button to abort the beautification process
5. WHEN the cancel button is clicked, THE Beautify_Service SHALL abort the ongoing API request within 5 seconds
6. WHEN beautification is cancelled, THE Website_Preview_Page SHALL return to normal preview mode with original content preserved
7. THE loading overlay SHALL display stage indicators: "Analyzing completeness...", "Completing missing sections..." (if applicable), "Enhancing design...", "Finalizing..."

### Requirement 10: Error Handling and Recovery

**User Story:** As a user, I want clear error messages and recovery options when beautification fails, so that I can understand what went wrong and try again.

#### Acceptance Criteria

1. IF the Beautify_API returns a network error, THEN THE Website_Preview_Page SHALL display "Unable to connect. Please check your internet connection."
2. IF the Beautify_API returns a timeout error, THEN THE Website_Preview_Page SHALL display "Beautification timed out. The website may be too complex. Please try again."
3. IF the Beautify_API returns an authentication error, THEN THE Website_Preview_Page SHALL display "Session expired. Please refresh the page and try again."
4. IF the Claude API returns a rate limit error, THEN THE Website_Preview_Page SHALL display "Service is busy. Please wait a moment and try again."
5. IF the beautification result fails to parse, THEN THE Website_Preview_Page SHALL display "Failed to process beautified content. Please try again."
6. WHEN an error is displayed, THE error message component SHALL provide a "Try Again" button
7. WHEN an error is displayed, THE error message component SHALL provide a "Dismiss" button to return to normal preview mode
8. THE Website_Preview_Page SHALL preserve all user edits when beautification fails

### Requirement 11: Beautification Prompt Engineering

**User Story:** As a developer, I want well-designed prompts for the Claude API, so that beautification produces consistent, high-quality results.

#### Acceptance Criteria

1. THE Beautify_Service SHALL use separate prompts for completion mode and enhancement mode
2. THE completion prompt SHALL instruct the AI to analyze the existing code, identify missing sections, and complete them while preserving existing style
3. THE completion prompt SHALL specify that completed content must be contextually appropriate and semantically correct
4. IF an `originalPrompt` is available, THEN THE completion prompt SHALL include it to help the AI understand what content should be added
5. IF a `referenceImage` is provided, THEN THE completion prompt SHALL include the image and instruct the AI to match its visual style when completing missing sections
6. THE enhancement prompt SHALL specify the following enhancement categories: color refinement, typography improvement, spacing optimization, animation smoothness, hover state enhancement, and visual depth
7. THE enhancement prompt SHALL instruct the AI to preserve all existing functionality and content
8. THE enhancement prompt SHALL instruct the AI to maintain or improve accessibility compliance
9. IF an `originalPrompt` is available, THEN THE enhancement prompt SHALL include it to help the AI align visual improvements with the original design intent
10. IF a `referenceImage` is provided, THEN THE enhancement prompt SHALL include the image and instruct the AI to use it as a visual style guide for enhancements
11. BOTH prompts SHALL instruct the AI to return code in the same format as the generation prompts (HTML in ```html blocks, CSS in ```css blocks, title after "Title:")
12. THE Beautify_Service SHALL use the same code extraction logic as the generation service to parse results
