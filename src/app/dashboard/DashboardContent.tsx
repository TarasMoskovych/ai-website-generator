/**
 * DashboardContent Client Component
 * Contains all interactive dashboard logic: auth check, data fetching,
 * website CRUD operations, and pagination.
 *
 * This component is wrapped in a Suspense boundary in the server-rendered
 * dashboard page shell.
 *
 * Requirements:
 * - 3.1: Rendered inside Suspense after static shell is delivered
 * - 3.2: Replaces DashboardSkeleton once data is available
 * - 6.1: Retrieve and display only the Generated_Websites belonging to the authenticated user
 * - 6.2: Display each Generated_Website with its thumbnail, title, creation date, and input type indicator
 * - 6.4: When a user clicks on a Generated_Website entry, navigate to the preview page
 * - 6.5: Display 12 websites per page with pagination controls
 * - 6.6: Display empty state message with CTA when no websites exist
 * - 6.7: Display error message with retry on fetch failure
 * - 7.1-7.5: Deletion with confirmation dialog, error handling, and list updates
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute, useAuth } from '@/components/auth';
import { WebsiteCard } from '@/components/WebsiteCard';
import { Pagination } from '@/components/Pagination';
import { ErrorMessage, LoadingSpinner } from '@/components/common';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { PlusIcon } from '@/components/icons';
import { useWebsites } from '@/hooks/useWebsites';
import websiteRepository from '@/services/websiteRepository';
import type { GeneratedWebsite } from '@/types/website';

/**
 * Page size constant (Requirement 6.5: 12 items per page)
 */
const PAGE_SIZE = 12;

/**
 * Inner dashboard content that handles data fetching and rendering
 */
function DashboardInnerContent() {
  const router = useRouter();
  const { user } = useAuth();

  // Use useWebsites hook for fetching user websites (Requirement 7.1)
  const {
    items: websites,
    isLoading,
    error,
    currentPage,
    totalPages,
    fetchPage,
    refresh,
  } = useWebsites(user?.uid ?? '', { pageSize: PAGE_SIZE });

  // Deletion state (Requirements 7.1-7.5)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [websiteToDelete, setWebsiteToDelete] = useState<GeneratedWebsite | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /**
   * Handle page change from Pagination component
   * Requirement 6.5: Fetch pages on navigation
   */
  const handlePageChange = useCallback((page: number) => {
    fetchPage(page);
    // Scroll to top of the page for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchPage]);

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

      // Refresh the current page to update the list
      // If current page becomes empty after deletion, go to previous page
      const remainingOnPage = websites.length - 1;
      if (remainingOnPage === 0 && currentPage > 1) {
        fetchPage(currentPage - 1);
      } else {
        // Refresh current page to get correct pagination
        refresh();
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
  }, [websiteToDelete, websites.length, currentPage, fetchPage, refresh]);

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
        // Refresh to get the updated data
        refresh();
      } catch (err) {
        console.error('Error updating title:', err);
      }
    },
    [refresh]
  );

  // Show loading state
  if (isLoading) {
    return <LoadingSpinner message="Loading your websites..." />;
  }

  // Show error state
  // Requirement 6.7: Display error message with retry on fetch failure
  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 px-4">
        <div className="w-full max-w-md">
          <ErrorMessage
            message={error}
            onDismiss={() => refresh()}
            onRetry={() => refresh()}
          />
        </div>
        <p className="text-muted-foreground text-sm text-center mt-2">
          There was a problem loading your websites. Please try again.
        </p>
      </div>
    );
  }

  // Show empty state (Requirement 6.6: Display empty state message with CTA when no websites exist)
  if (websites.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 px-4">
        {/* Empty state illustration */}
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted" aria-hidden="true">
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
          <h2 className="text-xl font-semibold text-foreground">No websites yet</h2>
          <p className="text-muted-foreground text-sm mt-2">
            You haven&apos;t created any websites yet. Get started by generating your first website with AI - just describe what you want or upload a screenshot!
          </p>
        </div>
        {/* Call-to-action button */}
        <a
          href="/generate"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Create Your First Website
        </a>
      </div>
    );
  }

  // Render website grid with pagination (Requirements 6.2, 6.5)
  return (
    <div className="flex flex-col gap-8">
      {/* Website grid */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
      {/* Pagination controls */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
      {/* Delete confirmation dialog */}
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
 * DashboardContent component
 * Wraps the inner content with ProtectedRoute for auth protection
 */
export function DashboardContent() {
  return (
    <ProtectedRoute>
      <DashboardInnerContent />
    </ProtectedRoute>
  );
}

export default DashboardContent;
