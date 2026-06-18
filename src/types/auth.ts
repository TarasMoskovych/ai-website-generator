/**
 * Authentication Types
 * Defines types for user authentication state and user information
 */

/**
 * Represents an authenticated user from Firebase Auth
 */
export interface AuthenticatedUser {
  /** Firebase Auth UID */
  uid: string;
  /** User's email address */
  email: string;
  /** User's display name from Google */
  displayName: string;
  /** User's profile photo URL from Google */
  photoURL: string | null;
}

/**
 * Authentication state for the application
 */
export interface AuthState {
  /** Current authenticated user, or null if not authenticated */
  user: AuthenticatedUser | null;
  /** Whether authentication state is being loaded */
  loading: boolean;
  /** Error message if authentication failed */
  error: string | null;
}
