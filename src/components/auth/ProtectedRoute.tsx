/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 *
 * Requirements:
 * - 14.1: Require authentication for accessing protected routes
 * - 14.2: Redirect unauthenticated users to login page
 * - 14.3: Redirect to originally requested page after authentication
 * - 14.5: Validate auth state on each route access
 *
 * This component:
 * 1. Uses the useAuth hook to check authentication state
 * 2. Shows a loading indicator while auth state is being determined
 * 3. Redirects to login page if user is not authenticated
 * 4. Stores the intended destination in sessionStorage for post-auth redirect
 * 5. Renders children if user is authenticated
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

/**
 * Session storage key for storing the redirect URL
 * Used to redirect back to the intended page after login
 */
const REDIRECT_URL_KEY = 'auth_redirect_url';

/**
 * ProtectedRoute props interface
 */
export interface ProtectedRouteProps {
  /** Content to render when authenticated */
  children: React.ReactNode;
  /** Optional fallback content to show while loading */
  fallback?: React.ReactNode;
}

/**
 * Default loading fallback component
 * Shows a centered loading spinner
 */
function DefaultLoadingFallback(): React.ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Store the intended redirect URL in sessionStorage
 * This allows the login page to redirect back after successful auth
 *
 * @param url - The URL to store for post-auth redirect
 */
export function storeRedirectUrl(url: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(REDIRECT_URL_KEY, url);
  }
}

/**
 * Retrieve and clear the stored redirect URL from sessionStorage
 * Returns null if no redirect URL is stored
 *
 * @returns The stored redirect URL or null
 */
export function getAndClearRedirectUrl(): string | null {
  if (typeof window !== 'undefined') {
    const url = sessionStorage.getItem(REDIRECT_URL_KEY);
    if (url) {
      sessionStorage.removeItem(REDIRECT_URL_KEY);
    }
    return url;
  }
  return null;
}

/**
 * ProtectedRoute component
 * Protects routes by checking authentication state and redirecting if needed
 *
 * @param props - Component props
 * @returns Protected content or redirect
 */
export function ProtectedRoute({
  children,
  fallback,
}: ProtectedRouteProps): React.ReactElement | null {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // Use ref to track if redirect has been initiated without triggering re-renders
  const hasInitiatedRedirect = useRef(false);

  /**
   * Handle redirect for unauthenticated users
   * Requirement 14.2: Redirect unauthenticated users to login page
   * Requirement 14.3: Store intended destination for post-auth redirect
   * Requirement 14.5: Validate auth state on each route access
   */
  useEffect(() => {
    // Wait for auth state to be determined
    if (loading) {
      return;
    }

    // If authenticated, reset the redirect flag
    if (user) {
      hasInitiatedRedirect.current = false;
      return;
    }

    // If not authenticated and haven't already initiated redirect
    if (!hasInitiatedRedirect.current) {
      // Store the current path for post-auth redirect (Requirement 14.3)
      storeRedirectUrl(pathname);
      // Mark that we've initiated the redirect to prevent multiple redirects
      hasInitiatedRedirect.current = true;
      // Redirect to login page (Requirement 14.2)
      router.replace('/');
    }
  }, [user, loading, pathname, router]);

  // Show loading state while determining auth state
  if (loading) {
    return <>{fallback ?? <DefaultLoadingFallback />}</>;
  }

  // If not authenticated, show fallback while redirecting
  if (!user) {
    return <>{fallback ?? <DefaultLoadingFallback />}</>;
  }

  // User is authenticated, render children (Requirement 14.1)
  return <>{children}</>;
}

export default ProtectedRoute;
