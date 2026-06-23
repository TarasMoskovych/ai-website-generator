/**
 * ShowcaseLink Component
 * Navigation link to the Community Showcase page
 *
 * Requirements:
 * - 10.2: Move ShowcaseLink component to src/components/layout/ShowcaseLink.tsx
 * - 10.3: Render navigation link to /showcase with globe icon and responsive text display
 *
 * Additional Requirements from dashboard-showcase-link spec:
 * - 1.1: Display visible link in dashboard header
 * - 1.2: Text clearly identifies destination
 * - 1.3: Include visual icon (globe)
 * - 1.5: Secondary/link styling
 * - 2.1: Navigate to /showcase
 * - 2.2: Open in same tab
 * - 3.1: Keyboard accessible
 * - 3.2: Descriptive accessible name
 * - 3.3: Visible focus indicator
 * - 4.1-4.3: Responsive text/icon display
 * - 4.4: Minimum touch target size (44x44px for WCAG compliance)
 */

import { GlobeIcon } from '@/components/icons';

/**
 * ShowcaseLink component
 * Navigation link to the Community Showcase page
 */
export function ShowcaseLink() {
  return (
    <a
      href="/showcase"
      className="
        inline-flex items-center justify-center gap-2
        rounded-md px-3 py-2
        min-h-[44px] min-w-[44px]
        text-sm font-medium
        text-muted-foreground
        hover:bg-accent hover:text-accent-foreground
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
        transition-colors
      "
      aria-label="Navigate to Community Showcase"
    >
      <GlobeIcon className="h-4 w-4" />
      <span className="hidden sm:inline">Community Showcase</span>
    </a>
  );
}
