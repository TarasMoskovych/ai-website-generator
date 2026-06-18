/**
 * Auth Service
 * Handles Google authentication using Firebase Auth
 * Implements signInWithGoogle, signOut, getCurrentUser, and onAuthStateChange
 *
 * Requirements: 13.2, 13.3, 13.5, 13.6
 */

import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { AuthenticatedUser } from '@/types';

/**
 * AuthService interface for Google sign-in operations
 */
export interface AuthService {
  signInWithGoogle(): Promise<AuthenticatedUser>;
  signOut(): Promise<void>;
  getCurrentUser(): AuthenticatedUser | null;
  onAuthStateChange(callback: (user: AuthenticatedUser | null) => void): () => void;
}

/**
 * Converts a Firebase User to an AuthenticatedUser
 */
function mapFirebaseUserToAuthenticatedUser(user: User): AuthenticatedUser {
  return {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? '',
    photoURL: user.photoURL,
  };
}

/**
 * Signs in the user with Google OAuth via Firebase Authentication
 * Uses popup-based authentication flow
 *
 * Requirement 13.2: Initiate Google OAuth flow via Firebase Authentication
 * Requirement 13.3: Create or update user session on success
 * Requirement 13.5: Persist authentication session across browser sessions
 *
 * @returns Promise resolving to the authenticated user
 * @throws Error if authentication fails
 */
export async function signInWithGoogle(): Promise<AuthenticatedUser> {
  try {
    // Set persistence to local to persist across browser sessions (Requirement 13.5)
    await setPersistence(auth, browserLocalPersistence);

    // Initiate Google OAuth popup (Requirement 13.2)
    const result = await signInWithPopup(auth, googleProvider);

    // Map Firebase user to AuthenticatedUser (Requirement 13.3)
    return mapFirebaseUserToAuthenticatedUser(result.user);
  } catch (error) {
    // Re-throw with a more descriptive message
    if (error instanceof Error) {
      throw new Error(`Google sign-in failed: ${error.message}`);
    }
    throw new Error('Google sign-in failed: An unknown error occurred');
  }
}

/**
 * Signs out the currently authenticated user
 * Terminates the user session
 *
 * Requirement 13.6: Terminate user session on sign out
 *
 * @returns Promise that resolves when sign out is complete
 * @throws Error if sign out fails
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Sign out failed: ${error.message}`);
    }
    throw new Error('Sign out failed: An unknown error occurred');
  }
}

/**
 * Gets the current authenticated user synchronously
 *
 * @returns The current authenticated user or null if not authenticated
 */
export function getCurrentUser(): AuthenticatedUser | null {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  return mapFirebaseUserToAuthenticatedUser(user);
}

/**
 * Subscribes to authentication state changes
 * The callback is called whenever the user signs in or out
 *
 * Requirement 13.5: Persist authentication session (observer fires on session restoration)
 *
 * @param callback Function to call when auth state changes
 * @returns Unsubscribe function to stop listening for changes
 */
export function onAuthStateChange(
  callback: (user: AuthenticatedUser | null) => void
): () => void {
  return onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      callback(mapFirebaseUserToAuthenticatedUser(firebaseUser));
    } else {
      callback(null);
    }
  });
}

/**
 * Default AuthService implementation
 */
const authService: AuthService = {
  signInWithGoogle,
  signOut,
  getCurrentUser,
  onAuthStateChange,
};

export default authService;
