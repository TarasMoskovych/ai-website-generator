'use client';

/**
 * AuthCard Component
 * Self-contained client component for authentication UI on the Login page.
 *
 * Requirements:
 * - 2.2: Render Google Sign-In button, manage auth state, display errors with dismiss, redirect authenticated users
 * - 2.4: Separate interactive auth logic from static presentational markup
 *
 * Features:
 * - Google Sign-In button with loading state
 * - Authentication error display with dismiss functionality
 * - Automatic redirect to intended destination on successful login
 * - Loading states for auth check and sign-in process
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { getAndClearRedirectUrl } from './ProtectedRoute';
import { GoogleSignInButton } from './GoogleSignInButton';

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
 * AuthCard component
 * Self-contained authentication card with Google Sign-In, error handling, and redirect logic.
 * Accepts no props — manages its own state via useAuth() hook and useRouter().
 */
export function AuthCard() {
  const router = useRouter();
  const { user, loading: authLoading, signInWithGoogle, error: authError, clearError } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Combine auth context error with local error state
  const displayError = localError || authError;

  /**
   * Redirect authenticated users to their intended destination
   */
  useEffect(() => {
    if (user && !authLoading) {
      const redirectUrl = getAndClearRedirectUrl() || '/dashboard';
      router.replace(redirectUrl);
    }
  }, [user, authLoading, router]);

  /**
   * Handle Google Sign-In
   */
  const handleSignIn = useCallback(async () => {
    setIsSigningIn(true);
    setLocalError(null);
    clearError();

    try {
      await signInWithGoogle();
      // Redirect will happen via useEffect when user state updates
    } catch (error) {
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
      <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 shadow-xl">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
            aria-label="Loading"
          />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is already authenticated, show a brief loading state while redirecting
  if (user) {
    return (
      <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 shadow-xl">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
            aria-label="Redirecting"
          />
          <p className="text-muted-foreground text-sm">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
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
  );
}

export default AuthCard;
