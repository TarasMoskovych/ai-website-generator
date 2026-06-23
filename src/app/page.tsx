/**
 * Login Page
 * Public landing page with Google Sign-In functionality
 *
 * Requirements:
 * - 13.1: Display login page with "Sign in with Google" button for unauthenticated users
 * - 13.4: Display error message if authentication fails and allow retry
 * - 14.4: Login page shall be accessible to unauthenticated users
 * - 23.4: Display Community Showcase section below sign-in form
 * - 23.5: Display up to 6 showcased websites as preview with View All link
 *
 * Features:
 * - Google Sign-In button with accessible design
 * - Error handling for failed authentication
 * - Redirect to intended destination after successful login
 * - Loading state during authentication
 * - Community Showcase preview section
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getAndClearRedirectUrl, GoogleSignInButton } from '@/components/auth';
import { AppFooter } from '@/components/layout';
import { ShowcasePreview } from '@/components/ShowcasePreview';

/**
 * ErrorAlert component
 * Displays authentication error messages with dismiss functionality
 */
interface ErrorAlertProps {
  message: string;
  onDismiss: () => void;
}

function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
    >
      <svg
        className="h-5 w-5 shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
          clipRule="evenodd"
        />
      </svg>
      <div className="flex-1">
        <p className="text-sm font-medium">Authentication failed</p>
        <p className="mt-1 text-sm opacity-90">{message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-md p-1 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        aria-label="Dismiss error"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  );
}



/**
 * Login page component
 * Main public landing page with Google Sign-In functionality
 */
export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, signInWithGoogle, error: authError, clearError } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Combine auth context error with local error state
  const displayError = localError || authError;

  /**
   * Redirect authenticated users to their intended destination
   * Requirement 14.3: Redirect to originally requested page after authentication
   */
  useEffect(() => {
    if (user && !authLoading) {
      // Get the stored redirect URL or default to dashboard
      const redirectUrl = getAndClearRedirectUrl() || '/dashboard';
      router.replace(redirectUrl);
    }
  }, [user, authLoading, router]);

  /**
   * Handle Google Sign-In
   * Requirement 13.2: Initiate Google OAuth flow
   * Requirement 13.3: Redirect on success
   * Requirement 13.4: Display error on failure
   */
  const handleSignIn = useCallback(async () => {
    setIsSigningIn(true);
    setLocalError(null);
    clearError();

    try {
      await signInWithGoogle();
      // Redirect will happen via useEffect when user state updates
    } catch (error) {
      // Error is also set in auth context, but we can add local handling
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
      setLocalError(message);
    } finally {
      setIsSigningIn(false);
    }
  }, [signInWithGoogle, clearError]);

  /**
   * Handle error dismissal
   */
  const handleDismissError = useCallback(() => {
    setLocalError(null);
    clearError();
  }, [clearError]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
            aria-label="Loading"
          />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </main>
    );
  }

  // If user is already authenticated, show a brief loading state while redirecting
  if (user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
            aria-label="Redirecting"
          />
          <p className="text-muted-foreground text-sm">Redirecting...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero Section - Login */}
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

          {/* Sign-in Card */}
          <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 shadow-xl">
            <h2 className="text-card-foreground mb-6 text-center text-xl font-semibold">
              Sign in to get started
            </h2>

            {/* Error Message */}
            {displayError && (
              <div className="mb-6">
                <ErrorAlert message={displayError} onDismiss={handleDismissError} />
              </div>
            )}

            {/* Google Sign-In Button */}
            <GoogleSignInButton onClick={handleSignIn} isLoading={isSigningIn} />

            {/* Privacy/Terms notice */}
            <p className="text-muted-foreground mt-6 text-center text-xs">
              By signing in, you agree to our terms of service and privacy policy.
            </p>
          </div>

          {/* Features highlight */}
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
              <h3 className="text-foreground text-sm font-medium">Download & Share</h3>
              <p className="text-muted-foreground mt-1 text-xs">Export your sites</p>
            </div>
          </div>
        </div>
      </section>

      {/* Community Showcase Section - Different Background */}
      <ShowcasePreview />

      {/* Footer */}
      <AppFooter />
    </main>
  );
}
