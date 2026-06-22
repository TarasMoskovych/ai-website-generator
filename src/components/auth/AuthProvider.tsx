/**
 * AuthProvider Context Component
 * Provides authentication state management throughout the application
 *
 * Requirements:
 * - 13.3: Create or update user session on successful authentication
 * - 13.5: Persist authentication session across browser sessions
 * - 5.1, 5.2, 5.3: Provide getIdToken function for Firebase ID token retrieval
 *
 * This component:
 * 1. Creates an AuthContext with user state
 * 2. Uses onAuthStateChange from authService.ts to subscribe to Firebase auth state changes
 * 3. Provides signInWithGoogle and signOut functions through context
 * 4. Handles loading state while auth state is being determined
 * 5. Handles error state for auth failures
 * 6. Provides getIdToken utility for authenticated API calls
 */

'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { AuthenticatedUser, AuthState } from '@/types';
import {
  signInWithGoogle as authSignInWithGoogle,
  signOut as authSignOut,
  onAuthStateChange,
} from '@/services/authService';
import { auth } from '@/lib/firebase';

/**
 * Auth context value interface
 * Provides auth state and auth actions
 */
interface AuthContextValue extends AuthState {
  /** Sign in with Google OAuth */
  signInWithGoogle: () => Promise<void>;
  /** Sign out the current user */
  signOut: () => Promise<void>;
  /** Clear any auth errors */
  clearError: () => void;
  /**
   * Get the current user's Firebase ID token
   * @throws Error with message "User not authenticated" if no user is signed in
   * @returns Promise resolving to the ID token string
   */
  getIdToken: () => Promise<string>;
}

/**
 * Auth action types for the reducer
 */
type AuthAction =
  | { type: 'AUTH_STATE_CHANGED'; payload: AuthenticatedUser | null }
  | { type: 'AUTH_LOADING' }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

/**
 * Initial auth state
 * Starts with loading=true since we need to determine initial auth state
 */
const initialAuthState: AuthState = {
  user: null,
  loading: true,
  error: null,
};

/**
 * Auth state reducer
 * Handles state transitions for authentication
 */
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_STATE_CHANGED':
      return {
        ...state,
        user: action.payload,
        loading: false,
        error: null,
      };
    case 'AUTH_LOADING':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

/**
 * Auth context
 * Provides authentication state and actions to child components
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * AuthProvider props
 */
export interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider component
 * Wraps the application and provides authentication context
 *
 * Features:
 * - Subscribes to Firebase auth state changes on mount
 * - Provides signInWithGoogle and signOut functions
 * - Manages loading state during auth operations
 * - Handles and surfaces auth errors
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  /**
   * Subscribe to Firebase auth state changes
   * This handles session persistence (Requirement 13.5)
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      dispatch({ type: 'AUTH_STATE_CHANGED', payload: user });
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Sign in with Google OAuth
   * Sets loading state and handles errors
   */
  const signInWithGoogle = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_LOADING' });
      await authSignInWithGoogle();
      // Note: We don't dispatch AUTH_STATE_CHANGED here because
      // the onAuthStateChange listener will handle it automatically
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw error; // Re-throw so callers can handle it if needed
    }
  }, []);

  /**
   * Sign out the current user
   * Sets loading state and handles errors
   */
  const signOut = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_LOADING' });
      await authSignOut();
      // Note: We don't dispatch AUTH_STATE_CHANGED here because
      // the onAuthStateChange listener will handle it automatically
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign out failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw error; // Re-throw so callers can handle it if needed
    }
  }, []);

  /**
   * Clear any auth errors
   */
  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  /**
   * Get the current user's Firebase ID token
   * Used for authenticating API requests
   *
   * Requirement 5.1: Export getIdToken function returning Promise<string>
   * Requirement 5.2: Throw error if no user is authenticated
   *
   * @throws Error with message "User not authenticated" if no user is signed in
   * @returns Promise resolving to the Firebase ID token string
   */
  const getIdToken = useCallback(async (): Promise<string> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    return currentUser.getIdToken();
  }, []);

  /**
   * Memoized context value to prevent unnecessary re-renders
   */
  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      loading: state.loading,
      error: state.error,
      signInWithGoogle,
      signOut,
      clearError,
      getIdToken,
    }),
    [state.user, state.loading, state.error, signInWithGoogle, signOut, clearError, getIdToken]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

/**
 * useAuth hook
 * Provides access to authentication context
 *
 * @throws Error if used outside of AuthProvider
 * @returns AuthContextValue with auth state and actions
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthProvider;
