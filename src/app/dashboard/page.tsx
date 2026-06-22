/**
 * Dashboard Page
 * Displays a list of user's generated websites in a grid layout with pagination
 *
 * Requirements:
 * - 6.1: Retrieve and display only the Generated_Websites belonging to the authenticated user
 * - 6.2: Display each Generated_Website with its thumbnail, title, creation date, and input type indicator
 * - 6.4: When a user clicks on a Generated_Website entry, navigate to the preview page
 * - 6.5: Display 12 websites per page with pagination controls showing page numbers and next/previous navigation buttons
 * - 6.6: Display empty state message with CTA when no websites exist
 * - 6.7: Display error message with retry on fetch failure
 * - 7.1: Display a confirmation dialog that identifies the website by title and provides confirm and cancel options
 * - 7.2: Permanently remove the Generated_Website when user confirms deletion
 * - 7.3: Dismiss the confirmation dialog and retain the website data unchanged when user cancels
 * - 7.4: Display an error message indicating the failure reason and retain the website data if deletion fails
 * - 7.5: Update to remove the deleted website from the list within 1 second without requiring a page refresh
 *
 * This page:
 * 1. Is protected - requires authentication
 * 2. Fetches user's websites from repository on mount
 * 3. Displays websites in a responsive grid using WebsiteCard components
 * 4. Shows loading spinner while fetching
 * 5. Handles navigation to individual website preview pages
 * 6. Integrates Pagination component for multi-page navigation
 * 7. Shows empty state with visible call-to-action when user has no websites
 * 8. Shows error message with retry functionality on fetch failure
 * 9. Handles website deletion with confirmation dialog, error handling, and list updates
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute, useAuth } from '@/components/auth';
import { AppHeader } from '@/components/layout';
import { WebsiteCard } from '@/components/WebsiteCard';
import { Pagination } from '@/components/Pagination';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import websiteRepository from '@/services/websiteRepository';
import type { GeneratedWebsite } from '@/types/website';

/**
 * Page size constant (Requirement 6.5: 12 items per page)
 */
const PAGE_SIZE = 12;

/**
 * Loading spinner component for the dashboard
 */
function LoadingSpinner() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm">Loading your websites...</p>
      </div>
    </div>
  );
}

/**
 * Dashboard page content component
 * Handles data fetching, website list rendering, and pagination
 */
function DashboardContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [websites, setWebsites] = useState<GeneratedWebsite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state (Requirement 6.5)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Deletion state (Requirements 7.1-7.5)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [websiteToDelete, setWebsiteToDelete] = useState<GeneratedWebsite | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /**
   * Fetch user's websites with pagination
   * Requirement 6.1: Retrieve websites belonging to the authenticated user
   * Requirement 6.5: Display 12 websites per page with pagination controls
   */
  const fetchWebsites = useCallback(async (page: number) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await websiteRepository.getAllByUser(user.uid, {
        page,
        pageSize: PAGE_SIZE,
      });
      setWebsites(result.items);
      setTotalPages(result.totalPages);
      setCurrentPage(page);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load websites';
      setError(message);
      console.error('Error fetching websites:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Fetch websites on mount and when user changes
   */
  useEffect(() => {
    fetchWebsites(1);
  }, [fetchWebsites]);

  /**
   * Handle page change from Pagination component
   * Requirement 6.5: Fetch pages on navigation
   */
  const handlePageChange = useCallback((page: number) => {
    fetchWebsites(page);
    // Scroll to top of the page for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchWebsites]);

  /**
   * Handle website card click - navigate to preview page
   * Requirement 6.4: Navigate to the preview page for that website
   */
  const handleWebsiteClick = useCallback(
    (id: string) => {
      router.push(`/website/${id}`);
    },
    [router]
  );

  /**
   * Handle beautify button click - navigate to preview page with beautify parameter
   * Requirement 6.3 (beautify): Navigate to the website preview page and automatically trigger beautification
   * Requirement 6.4 (beautify): Pass a `beautify=true` query parameter to trigger automatic beautification
   */
  const handleBeautify = useCallback(
    (id: string) => {
      router.push(`/website/${id}?beautify=true`);
    },
    [router]
  );

  /**
   * Handle website deletion - open confirmation dialog
   * Requirement 7.1: Display a confirmation dialog that identifies the website by title
   */
  const handleDelete = useCallback((id: string) => {
    const website = websites.find((w) => w.id === id);
    if (website) {
      setWebsiteToDelete(website);
      setDeleteDialogOpen(true);
      setDeleteError(null);
    }
  }, [websites]);

  /**
   * Handle deletion confirmation
   * Requirement 7.2: Permanently remove the website when confirmed
   * Requirement 7.5: Update the list without page refresh within 1 second
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!websiteToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await websiteRepository.delete(websiteToDelete.id);

      // Update local state to remove the deleted website without page refresh
      // Requirement 7.5: Update list within 1 second without page refresh
      setWebsites((prev) => prev.filter((w) => w.id !== websiteToDelete.id));

      // If current page becomes empty after deletion, go to previous page
      const remainingOnPage = websites.length - 1;
      if (remainingOnPage === 0 && currentPage > 1) {
        fetchWebsites(currentPage - 1);
      } else if (remainingOnPage > 0) {
        // Refetch to get correct pagination and potentially fill the page
        fetchWebsites(currentPage);
      }

      // Close dialog
      setDeleteDialogOpen(false);
      setWebsiteToDelete(null);
    } catch (err) {
      // Requirement 7.4: Display error message and retain website data on failure
      const message = err instanceof Error ? err.message : 'Failed to delete website';
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  }, [websiteToDelete, websites.length, currentPage, fetchWebsites]);

  /**
   * Handle deletion cancellation
   * Requirement 7.3: Dismiss dialog and retain website data unchanged
   */
  const handleCancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setWebsiteToDelete(null);
    setDeleteError(null);
  }, []);

  /**
   * Handle title edit
   * Updates the website title via the repository
   */
  const handleTitleEdit = useCallback(
    async (id: string, newTitle: string) => {
      try {
        await websiteRepository.update(id, { title: newTitle });
        // Update local state to reflect the change
        setWebsites((prev) =>
          prev.map((website) =>
            website.id === id ? { ...website, title: newTitle } : website
          )
        );
      } catch (err) {
        console.error('Error updating title:', err);
        // Could add error toast here
      }
    },
    []
  );

  // Show loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Show error state
  // Requirement 6.7: Display error message with retry on fetch failure
  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 px-4">
        <div className="w-full max-w-md">
          <ErrorMessage
            message={error}
            onDismiss={() => setError(null)}
            onRetry={() => fetchWebsites(currentPage)}
          />
        </div>
        <p className="text-muted-foreground text-sm text-center mt-2">
          There was a problem loading your websites. Please try again.
        </p>
      </div>
    );
  }

  // Show empty state
  // Requirement 6.6: Display empty state message with CTA when no websites exist
  if (websites.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 px-4">
        {/* Empty state illustration */}
        <div
          className="
            flex h-24 w-24 items-center justify-center
            rounded-full bg-muted
          "
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-12 w-12 text-muted-foreground"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
        </div>

        {/* Empty state message */}
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-foreground">
            No websites yet
          </h2>
          <p className="text-muted-foreground text-sm mt-2">
            You haven&apos;t created any websites yet. Get started by generating your first website with AI - just describe what you want or upload a screenshot!
          </p>
        </div>

        {/* Call-to-action button (Requirement 6.6: visible CTA to create new website) */}
        <a
          href="/generate"
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Create Your First Website
        </a>
      </div>
    );
  }

  // Render website grid with pagination
  // Requirement 6.2: Display websites with thumbnail, title, date, and input type
  // Requirement 6.5: Display pagination controls
  return (
    <div className="flex flex-col gap-8">
      {/* Website grid */}
      <div
        className="
          grid gap-6
          grid-cols-1
          sm:grid-cols-2
          lg:grid-cols-3
          xl:grid-cols-4
        "
      >
        {websites.map((website) => (
          <WebsiteCard
            key={website.id}
            website={website}
            onClick={handleWebsiteClick}
            onDelete={handleDelete}
            onTitleEdit={handleTitleEdit}
            onBeautify={handleBeautify}
          />
        ))}
      </div>

      {/* Pagination controls (Requirement 6.5) */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      {/* Delete confirmation dialog (Requirements 7.1, 7.3) */}
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        websiteTitle={websiteToDelete?.title ?? ''}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
        error={deleteError}
      />
    </div>
  );
}

/**
 * Dashboard page component
 * Protected route that displays user's generated websites
 */
export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-primary/5">
        {/* Decorative background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        </div>

        {/* Header with user profile */}
        <AppHeader user={user} />

        {/* Main content */}
        <main className="flex-1 relative">
          <div className="container mx-auto px-4 py-8">
            {/* Page header */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">My Websites</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Manage and view your generated websites
                </p>
              </div>
              <a
                href="/generate"
                className="
                  inline-flex items-center justify-center gap-2
                  rounded-md bg-primary px-4 py-2
                  text-sm font-medium text-primary-foreground
                  hover:bg-primary/90
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  transition-colors
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                New Website
              </a>
            </div>

            {/* Website grid */}
            <DashboardContent />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
