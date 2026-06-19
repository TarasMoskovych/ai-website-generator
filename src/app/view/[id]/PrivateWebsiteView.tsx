/**
 * Private Website View Component
 * Client component that handles authentication for private websites
 *
 * Requirement 16.7: If a Generated_Website has public visibility disabled,
 * require authentication and verify ownership before rendering
 *
 * This component:
 * 1. Checks if the user is authenticated
 * 2. Verifies the authenticated user owns the website
 * 3. Shows appropriate error states for unauthenticated or unauthorized access
 * 4. Renders the website if authorization passes
 */

'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth';

/**
 * Props for PrivateWebsiteView
 */
interface PrivateWebsiteViewProps {
  /** The website ID */
  websiteId: string;
  /** The user ID of the website owner */
  ownerId: string;
  /** The website HTML content */
  html: string;
  /** The website CSS content */
  css: string;
  /** The website title (reserved for future use in page title) */
  title: string;
}

/**
 * Access denied icon component
 */
function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/**
 * Loading spinner component
 */
function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm">Verifying access...</p>
      </div>
    </div>
  );
}

/**
 * Access denied component for unauthenticated users
 */
function AccessDeniedUnauthenticated({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <div
        className="flex h-24 w-24 items-center justify-center rounded-full bg-muted"
        aria-hidden="true"
      >
        <LockIcon className="h-12 w-12 text-muted-foreground" />
      </div>

      <div className="text-center max-w-md">
        <h1 className="text-2xl font-semibold text-foreground">
          Private Website
        </h1>
        <p className="text-muted-foreground mt-2">
          This website is private and requires authentication to view.
          Please sign in to continue.
        </p>
      </div>

      <button
        type="button"
        onClick={onSignIn}
        className="
          inline-flex items-center justify-center gap-2
          rounded-md bg-primary px-6 py-3
          text-base font-medium text-primary-foreground
          hover:bg-primary/90
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          focus-visible:ring-offset-2 focus-visible:ring-offset-background
          transition-colors
        "
      >
        Sign in to view
      </button>
    </div>
  );
}

/**
 * Access denied component for unauthorized users (authenticated but not owner)
 */
function AccessDeniedUnauthorized({ onGoBack }: { onGoBack: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <div
        className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10"
        aria-hidden="true"
      >
        <LockIcon className="h-12 w-12 text-destructive" />
      </div>

      <div className="text-center max-w-md">
        <h1 className="text-2xl font-semibold text-foreground">
          Access Denied
        </h1>
        <p className="text-muted-foreground mt-2">
          This website is private and can only be viewed by its owner.
          You don&apos;t have permission to access this content.
        </p>
      </div>

      <button
        type="button"
        onClick={onGoBack}
        className="
          inline-flex items-center justify-center gap-2
          rounded-md bg-primary px-6 py-3
          text-base font-medium text-primary-foreground
          hover:bg-primary/90
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          focus-visible:ring-offset-2 focus-visible:ring-offset-background
          transition-colors
        "
      >
        Go to Dashboard
      </button>
    </div>
  );
}

/**
 * Private website view component
 * Handles authentication and authorization for private websites
 *
 * Requirement 16.7: Require authentication and verify ownership for private websites
 */
export function PrivateWebsiteView({
  websiteId,
  ownerId,
  html,
  css,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  title,
}: PrivateWebsiteViewProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  /**
   * Determine authorization status
   * - null: still checking auth state
   * - false: not authorized (unauthenticated or not owner)
   * - true: authorized (authenticated and is owner)
   */
  const isAuthorized = authLoading
    ? null
    : user
      ? user.uid === ownerId
      : false;

  /**
   * Whether the user is authenticated
   */
  const isAuthenticated = !authLoading && user !== null;

  /**
   * Handle sign in - redirect to login with return URL
   */
  const handleSignIn = () => {
    // Store the current URL to redirect back after login
    const returnUrl = `/view/${websiteId}`;
    // Redirect to login page with return URL
    router.push(`/?returnTo=${encodeURIComponent(returnUrl)}`);
  };

  /**
   * Handle go back - navigate to dashboard or home
   */
  const handleGoBack = () => {
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/');
    }
  };

  // Show loading while checking auth state
  if (authLoading || isAuthorized === null) {
    return <LoadingSpinner />;
  }

  // Show access denied for unauthenticated users
  if (!isAuthenticated) {
    return <AccessDeniedUnauthenticated onSignIn={handleSignIn} />;
  }

  // Show access denied for authenticated but unauthorized users
  if (!isAuthorized) {
    return <AccessDeniedUnauthorized onGoBack={handleGoBack} />;
  }

  // User is authenticated and authorized - render the website
  // Requirement 16.1: Render as full-page standalone website without app UI
  // Requirement 16.3: Include proper HTML document structure with CSS in style tag
  return (
    <>
      {/* Inject the generated CSS into the page */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Full-page wrapper that overlays the entire viewport */}
      <div
        className="view-page-wrapper"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          overflow: 'auto',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Render the generated HTML content */}
        <div
          className="view-page-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </>
  );
}
