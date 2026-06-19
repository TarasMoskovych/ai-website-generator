/**
 * UserProfileMenu Component
 * Displays a dropdown menu with user email and sign out option on profile click
 *
 * Requirements:
 * - 15.3: Display dropdown menu with user's email and sign out option when clicking on profile
 *
 * This component:
 * 1. Shows user avatar/name that triggers the dropdown
 * 2. Displays dropdown with user email and sign out button
 * 3. Handles click outside to close the dropdown
 * 4. Provides keyboard navigation (Escape to close)
 * 5. Uses accessible patterns for dropdown menus
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AuthenticatedUser } from '@/types';

/**
 * UserProfileMenu props
 */
export interface UserProfileMenuProps {
  /** The authenticated user to display */
  user: AuthenticatedUser;
  /** Callback when sign out is requested */
  onSignOut: () => void;
  /** Whether sign out is in progress */
  isSigningOut?: boolean;
}

/**
 * ChevronDown icon
 */
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * LogOut icon
 */
function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

/**
 * Mail icon
 */
function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

/**
 * Get initials from display name for default avatar
 */
function getInitials(displayName: string): string {
  const names = displayName.trim().split(/\s+/);
  if (names.length === 0 || !names[0]) {
    return '?';
  }
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

/**
 * Default avatar component showing user initials
 */
function DefaultAvatar({
  displayName,
  className,
}: {
  displayName: string;
  className?: string;
}) {
  const initials = getInitials(displayName);

  return (
    <div
      className={`
        flex items-center justify-center
        rounded-full
        bg-primary text-primary-foreground
        font-semibold text-sm
        ${className ?? ''}
      `}
      aria-label={`Avatar for ${displayName}`}
    >
      {initials}
    </div>
  );
}

/**
 * User avatar component with fallback to default
 */
function UserAvatar({
  user,
  className,
}: {
  user: AuthenticatedUser;
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  if (!user.photoURL || imageError) {
    return <DefaultAvatar displayName={user.displayName} className={className} />;
  }

  return (
    <Image
      src={user.photoURL}
      alt={`${user.displayName}'s profile picture`}
      width={32}
      height={32}
      className={`rounded-full object-cover ${className ?? ''}`}
      onError={handleImageError}
      referrerPolicy="no-referrer"
      unoptimized // Google profile images are already optimized and have strict CORS
    />
  );
}

/**
 * UserProfileMenu component
 * Displays user profile with dropdown menu for email and sign out
 */
export function UserProfileMenu({
  user,
  onSignOut,
  isSigningOut = false,
}: UserProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSignOut = useCallback(() => {
    setIsOpen(false);
    onSignOut();
  }, [onSignOut]);

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile trigger button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="User menu"
        className="
          flex items-center gap-2
          rounded-md px-2 py-1.5
          text-sm font-medium
          text-foreground
          hover:bg-accent hover:text-accent-foreground
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          transition-colors
        "
      >
        <UserAvatar user={user} className="h-8 w-8" />
        <span
          className="
            hidden md:inline
            max-w-[150px] truncate
          "
          title={user.displayName}
        >
          {user.displayName}
        </span>
        <ChevronDownIcon
          className={`
            h-4 w-4
            text-muted-foreground
            transition-transform duration-200
            ${isOpen ? 'rotate-180' : ''}
          `}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu-button"
          className="
            absolute right-0 top-full mt-2
            w-64 min-w-[200px]
            rounded-md border border-border
            bg-popover text-popover-foreground
            shadow-lg
            py-1
            z-50
            animate-in fade-in-0 zoom-in-95
          "
        >
          {/* User info section */}
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-3">
              <UserAvatar user={user} className="h-10 w-10" />
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium text-foreground truncate"
                  title={user.displayName}
                >
                  {user.displayName}
                </p>
                <p
                  className="text-xs text-muted-foreground truncate flex items-center gap-1"
                  title={user.email}
                >
                  <MailIcon className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{user.email}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {/* Sign out button */}
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="
                w-full flex items-center gap-2
                px-3 py-2
                text-sm text-foreground
                hover:bg-accent hover:text-accent-foreground
                focus-visible:bg-accent focus-visible:text-accent-foreground
                focus-visible:outline-none
                disabled:pointer-events-none disabled:opacity-50
                transition-colors
              "
            >
              <LogOutIcon className="h-4 w-4" />
              <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfileMenu;
