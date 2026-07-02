/**
 * Login Page (Server Component)
 * Public landing page with server-rendered static content and client-side auth
 *
 * Requirements:
 * - 2.1: Server-render hero section, features grid, and footer as static HTML
 * - 2.3: Fetch and pre-render community showcase preview with up to 6 showcased websites
 * - 2.4: Separate static markup from interactive auth logic via AuthCard client component
 * - 2.5: Render empty state on showcase fetch failure instead of failing the page
 *
 * Component hierarchy:
 * /page.tsx (Server Component - async)
 * ├── <HeroSection> (Server - static HTML: logo, title, description)
 * │   └── <AuthCard> (Client Component - auth state, sign-in, redirect)
 * ├── <FeaturesGrid> (Server - static HTML)
 * ├── <ShowcasePreviewServer> (Server - fetches data)
 * └── <AppFooter> (Client Component)
 */

import { AuthCard } from '@/components/auth';
import { AppFooter } from '@/components/layout';
import { ShowcasePreviewServer } from '@/components/ShowcasePreviewServer';

/**
 * HeroSection - Server-rendered static content with auth card slot
 * Renders logo, title, description as static HTML.
 * The AuthCard is a client component composed within this server layout.
 */
function HeroSection() {
  return (
    <section className="relative flex-1 flex flex-col items-center justify-center px-4 py-16 bg-gradient-to-b from-background via-background to-primary/5">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        {/* Logo/Branding */}
        <div className="text-center">
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25"
            aria-hidden="true"
          >
            <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-foreground text-4xl font-bold tracking-tight">
            AI Website Generator
          </h1>
          <p className="text-muted-foreground mt-4 text-lg">
            Generate complete websites from text descriptions or screenshots using AI.
          </p>
        </div>

        {/* Sign-in Card (Client Component) */}
        <AuthCard />

        {/* Features highlight */}
        <FeaturesGrid />
      </div>
    </section>
  );
}

/**
 * FeaturesGrid - Server-rendered static feature highlights
 * Pure presentational component with no interactivity.
 */
function FeaturesGrid() {
  return (
    <div className="grid grid-cols-3 gap-4 pt-4">
      <div className="text-center">
        <div
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </div>
        <h3 className="text-foreground text-sm font-medium">Text to Website</h3>
        <p className="text-muted-foreground mt-1 text-xs">Describe your vision</p>
      </div>
      <div className="text-center">
        <div
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-foreground text-sm font-medium">Screenshot to Code</h3>
        <p className="text-muted-foreground mt-1 text-xs">Upload a design</p>
      </div>
      <div className="text-center">
        <div
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
            />
          </svg>
        </div>
        <h3 className="text-foreground text-sm font-medium">Download &amp; Share</h3>
        <p className="text-muted-foreground mt-1 text-xs">Export your sites</p>
      </div>
    </div>
  );
}

/**
 * LoginPage - Async Server Component
 * Renders the landing page with server-rendered static content.
 * Auth logic is isolated in the AuthCard client component.
 * Showcase preview is fetched server-side by ShowcasePreviewServer.
 */
export default async function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero Section with Auth Card */}
      <HeroSection />

      {/* Community Showcase Section (Server Component - fetches data) */}
      <ShowcasePreviewServer />

      {/* Footer */}
      <AppFooter />
    </main>
  );
}
