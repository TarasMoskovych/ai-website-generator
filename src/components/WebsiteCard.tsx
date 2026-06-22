/**
 * WebsiteCard Component
 * Displays a card for a generated website with thumbnail, title, date, and input type
 *
 * Requirements:
 * - 6.2: Display each Generated_Website with its thumbnail, title, creation date, and input type indicator
 * - 6.1 (beautify): Display a Beautify_Button alongside existing action buttons on hover
 * - 6.2 (beautify): Display a sparkle or wand icon consistent with the preview page button
 * - 11.4: Display an edit control for each Generated_Website title that allows inline editing
 * - 11.7: When a user submits a valid edited title, persist the updated title and display a confirmation indicator
 * - 12.1, 12.2, 12.3: Import icons from shared Icons module instead of defining inline
 *
 * This component:
 * 1. Displays website thumbnail image
 * 2. Shows title with inline editing capability
 * 3. Displays creation date formatted for readability
 * 4. Shows input type indicator (text or screenshot)
 * 5. Includes delete button
 * 6. Includes beautify button (visible on hover)
 * 7. Accessible with proper ARIA attributes and keyboard navigation
 * 8. Supports dark mode with WCAG AA compliant colors
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { GeneratedWebsite } from '@/types';
import { VALIDATION } from '@/lib/constants';
import {
  GlobeIcon,
  TextIcon,
  ImageIcon,
  EditIcon,
  CheckIcon,
  XIcon,
  TrashIcon,
  SparklesIcon,
} from '@/components/icons';

/**
 * WebsiteCard props
 * Based on the design document interface
 */
export interface WebsiteCardProps {
  /** The website data to display */
  website: GeneratedWebsite;
  /** Callback when the delete button is clicked */
  onDelete: (id: string) => void;
  /** Callback when the title is edited */
  onTitleEdit: (id: string, newTitle: string) => void;
  /** Callback when the card is clicked (for navigation) */
  onClick?: (id: string) => void;
  /** Callback when the beautify button is clicked */
  onBeautify?: (id: string) => void;
}

/**
 * Format a date string for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  // If less than 7 days ago, show relative time
  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  }

  // Otherwise, show formatted date
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * WebsiteCard component
 * Displays a card for a generated website
 *
 * @example
 * <WebsiteCard
 *   website={website}
 *   onDelete={(id) => handleDelete(id)}
 *   onTitleEdit={(id, newTitle) => handleTitleEdit(id, newTitle)}
 *   onClick={(id) => router.push(`/website/${id}`)}
 *   onBeautify={(id) => router.push(`/website/${id}?beautify=true`)}
 * />
 */
export function WebsiteCard({
  website,
  onDelete,
  onTitleEdit,
  onClick,
  onBeautify,
}: WebsiteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(website.title);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const InputTypeIcon = website.inputType === 'text' ? TextIcon : ImageIcon;
  const inputTypeLabel = website.inputType === 'text' ? 'Text description' : 'Screenshot';

  /**
   * Focus input when editing starts
   */
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  /**
   * Show save confirmation briefly after successful save
   */
  useEffect(() => {
    if (showSaveConfirmation) {
      const timer = setTimeout(() => {
        setShowSaveConfirmation(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSaveConfirmation]);

  /**
   * Start editing the title
   */
  const handleStartEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditedTitle(website.title);
    setTitleError(null);
  }, [website.title]);

  /**
   * Cancel editing and revert changes
   */
  const handleCancelEditing = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsEditing(false);
    setEditedTitle(website.title);
    setTitleError(null);
  }, [website.title]);

  /**
   * Validate and save the edited title
   */
  const handleSaveTitle = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();

    const trimmedTitle = editedTitle.trim();

    // Validate title length (Requirement 11.5)
    if (trimmedTitle.length < VALIDATION.TITLE.MIN_LENGTH) {
      setTitleError(`Title must be at least ${VALIDATION.TITLE.MIN_LENGTH} character`);
      return;
    }

    if (trimmedTitle.length > VALIDATION.TITLE.MAX_LENGTH) {
      setTitleError(`Title must not exceed ${VALIDATION.TITLE.MAX_LENGTH} characters`);
      return;
    }

    // Only save if title has changed
    if (trimmedTitle !== website.title) {
      onTitleEdit(website.id, trimmedTitle);
      setShowSaveConfirmation(true);
    }

    setIsEditing(false);
    setTitleError(null);
  }, [editedTitle, website.id, website.title, onTitleEdit]);

  /**
   * Handle keyboard events in title input
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEditing();
    }
  }, [handleSaveTitle, handleCancelEditing]);

  /**
   * Handle title input change
   */
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTitle(e.target.value);
    setTitleError(null);
  }, []);

  /**
   * Handle delete button click
   */
  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(website.id);
  }, [website.id, onDelete]);

  /**
   * Handle beautify button click
   * Requirement 6.1, 6.3 (beautify): Trigger beautification workflow
   */
  const handleBeautifyClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBeautify) {
      onBeautify(website.id);
    }
  }, [website.id, onBeautify]);

  /**
   * Handle card click (for navigation)
   */
  const handleCardClick = useCallback(() => {
    if (!isEditing && onClick) {
      onClick(website.id);
    }
  }, [isEditing, onClick, website.id]);

  /**
   * Handle card keyboard interaction
   */
  const handleCardKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isEditing && onClick) {
      e.preventDefault();
      onClick(website.id);
    }
  }, [isEditing, onClick, website.id]);

  return (
    <article
      className={`
        group relative
        flex flex-col
        rounded-lg border
        border-border
        bg-card
        overflow-hidden
        shadow-sm
        transition-all duration-200
        hover:shadow-md
        hover:border-muted-foreground/30
        ${onClick && !isEditing ? 'cursor-pointer' : ''}
      `}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={onClick && !isEditing ? 0 : undefined}
      role={onClick ? 'button' : 'article'}
      aria-label={`Website: ${website.title}`}
    >
      {/* Thumbnail */}
      <div
        className="
          relative
          aspect-[4/3]
          w-full
          overflow-hidden
          bg-muted
        "
      >
        {website.thumbnailUrl ? (
          <img
            src={website.thumbnailUrl}
            alt={`Thumbnail for ${website.title}`}
            className="
              h-full w-full
              object-cover object-top
              transition-transform duration-200
              group-hover:scale-105
            "
          />
        ) : (
          <div
            className="
              flex h-full w-full
              items-center justify-center
              text-muted-foreground
            "
            aria-label="No thumbnail available"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-12 w-12"
              aria-hidden="true"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
        )}

        {/* Input type badge */}
        <div
          className="
            absolute top-2 left-2
            flex items-center gap-1
            rounded-full
            bg-background/90
            backdrop-blur-sm
            px-2 py-1
            text-xs font-medium
            text-muted-foreground
          "
          title={`Generated from ${inputTypeLabel.toLowerCase()}`}
        >
          <InputTypeIcon className="h-3 w-3" />
          <span className="sr-only">{inputTypeLabel}</span>
        </div>

        {/* Shared/Showcase badge - Requirement 23.12 */}
        {website.isShowcased && (
          <div
            className="
              absolute top-2 left-10
              flex items-center gap-1
              rounded-full
              bg-green-100 dark:bg-green-900/50
              px-2 py-1
              text-xs font-medium
              text-green-700 dark:text-green-400
            "
            title="Shared to showcase"
          >
            <GlobeIcon className="h-3 w-3" />
            <span>Shared</span>
          </div>
        )}

        {/* Action buttons container - visible on hover */}
        <div
          className="
            absolute top-2 right-2
            flex items-center gap-1
            opacity-0
            transition-opacity duration-200
            group-hover:opacity-100
          "
        >
          {/* Beautify button - Requirement 6.1, 6.2 (beautify) */}
          {onBeautify && (
            <button
              type="button"
              onClick={handleBeautifyClick}
              className="
                flex items-center justify-center
                rounded-full
                bg-background/90
                backdrop-blur-sm
                p-1.5
                text-muted-foreground
                transition-all duration-200
                hover:bg-primary/10
                hover:text-primary
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
              "
              aria-label={`Beautify ${website.title}`}
              title="Beautify website"
            >
              <SparklesIcon className="h-4 w-4" />
            </button>
          )}

          {/* Delete button */}
          <button
            type="button"
            onClick={handleDeleteClick}
            className="
              flex items-center justify-center
              rounded-full
              bg-background/90
              backdrop-blur-sm
              p-1.5
              text-muted-foreground
              transition-all duration-200
              hover:bg-destructive
              hover:text-destructive-foreground
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
            "
            aria-label={`Delete ${website.title}`}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-3">
        {/* Title (with inline editing) */}
        <div className="flex items-start gap-2">
          {isEditing ? (
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={editedTitle}
                  onChange={handleTitleChange}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  maxLength={VALIDATION.TITLE.MAX_LENGTH}
                  className={`
                    flex-1
                    rounded-md
                    border
                    bg-background
                    px-2 py-1
                    text-sm font-medium
                    text-foreground
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    ${titleError ? 'border-destructive' : 'border-input'}
                  `}
                  aria-label="Edit website title"
                  aria-invalid={!!titleError}
                  aria-describedby={titleError ? 'title-error' : undefined}
                />
                <button
                  type="button"
                  onClick={handleSaveTitle}
                  className="
                    flex-shrink-0
                    rounded-md p-1
                    text-primary
                    hover:bg-primary/10
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                  "
                  aria-label="Save title"
                >
                  <CheckIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  className="
                    flex-shrink-0
                    rounded-md p-1
                    text-muted-foreground
                    hover:bg-muted
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                  "
                  aria-label="Cancel editing"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
              {titleError && (
                <p
                  id="title-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {titleError}
                </p>
              )}
            </div>
          ) : (
            <>
              <h3
                className="
                  flex-1
                  text-sm font-medium
                  text-foreground
                  truncate
                "
                title={website.title}
              >
                {website.title}
              </h3>
              {/* Edit button */}
              <button
                type="button"
                onClick={handleStartEditing}
                className="
                  flex-shrink-0
                  rounded-md p-1
                  text-muted-foreground
                  opacity-0
                  transition-opacity duration-200
                  hover:bg-muted
                  hover:text-foreground
                  focus-visible:opacity-100
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  group-hover:opacity-100
                "
                aria-label={`Edit title for ${website.title}`}
              >
                <EditIcon className="h-3.5 w-3.5" />
              </button>
              {/* Save confirmation indicator */}
              {showSaveConfirmation && (
                <span
                  className="
                    flex-shrink-0
                    flex items-center gap-1
                    text-xs text-primary
                    animate-in fade-in duration-200
                  "
                  role="status"
                  aria-live="polite"
                >
                  <CheckIcon className="h-3 w-3" />
                  Saved
                </span>
              )}
            </>
          )}
        </div>

        {/* Date */}
        <p
          className="
            text-xs
            text-muted-foreground
          "
        >
          {formatDate(website.createdAt)}
        </p>
      </div>
    </article>
  );
}

export default WebsiteCard;
