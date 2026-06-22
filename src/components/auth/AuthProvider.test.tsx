/**
 * AuthProvider Tests - getIdToken Function
 *
 * Unit tests for the getIdToken function in the AuthProvider/useAuth hook.
 *
 * Tests cover:
 * - getIdToken returns token when user is authenticated
 * - getIdToken throws "User not authenticated" when no user
 *
 * Validates: Requirements 5.1, 5.2, 13.2, 13.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthProvider';

// Mock Firebase modules
const mockGetIdToken = vi.fn();
const mockOnAuthStateChanged = vi.fn();

// Store the auth state change callback for manual triggering
let authStateCallback: ((user: unknown) => void) | null = null;

vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

vi.mock('@/services/authService', () => ({
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn((callback: (user: unknown) => void) => {
    authStateCallback = callback;
    // Call immediately with null (unauthenticated state) by default
    callback(null);
    // Return unsubscribe function
    return vi.fn();
  }),
}));

// Helper to import and modify the mocked auth module
async function setMockCurrentUser(user: { getIdToken: () => Promise<string> } | null) {
  const firebaseModule = await import('@/lib/firebase');
  (firebaseModule.auth as { currentUser: unknown }).currentUser = user;
}

// Wrapper component for testing hooks
function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
  };
}

describe('AuthProvider - getIdToken Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIdToken.mockReset();
    authStateCallback = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Requirement 5.1: THE useFirebaseAuth_Hook SHALL export a getIdToken function
   * that returns a Promise resolving to the current user's Firebase ID token
   */
  describe('getIdToken returns token when user is authenticated', () => {
    it('returns the ID token when user is authenticated', async () => {
      const expectedToken = 'mock-firebase-id-token-12345';
      mockGetIdToken.mockResolvedValue(expectedToken);

      // Set up mock authenticated user
      await setMockCurrentUser({
        getIdToken: mockGetIdToken,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Wait for initial auth state to settle
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Call getIdToken and verify it returns the token
      let token: string | undefined;
      await act(async () => {
        token = await result.current.getIdToken();
      });

      expect(token).toBe(expectedToken);
      expect(mockGetIdToken).toHaveBeenCalledTimes(1);
    });

    it('calls Firebase getIdToken() on the current user', async () => {
      const expectedToken = 'another-mock-token-67890';
      mockGetIdToken.mockResolvedValue(expectedToken);

      await setMockCurrentUser({
        getIdToken: mockGetIdToken,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.getIdToken();
      });

      // Verify getIdToken was called on the user object
      expect(mockGetIdToken).toHaveBeenCalled();
    });

    it('returns different tokens on subsequent calls (token refresh scenario)', async () => {
      const firstToken = 'first-token-123';
      const secondToken = 'second-token-456';

      mockGetIdToken
        .mockResolvedValueOnce(firstToken)
        .mockResolvedValueOnce(secondToken);

      await setMockCurrentUser({
        getIdToken: mockGetIdToken,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let token1: string | undefined;
      let token2: string | undefined;

      await act(async () => {
        token1 = await result.current.getIdToken();
      });

      await act(async () => {
        token2 = await result.current.getIdToken();
      });

      expect(token1).toBe(firstToken);
      expect(token2).toBe(secondToken);
      expect(mockGetIdToken).toHaveBeenCalledTimes(2);
    });
  });

  /**
   * Requirement 5.2: IF no user is authenticated when getIdToken is called,
   * THEN THE getIdToken function SHALL throw an Error with message "User not authenticated"
   */
  describe('getIdToken throws "User not authenticated" when no user', () => {
    it('throws Error with message "User not authenticated" when currentUser is null', async () => {
      // Ensure no user is authenticated
      await setMockCurrentUser(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify getIdToken throws the expected error
      await expect(
        act(async () => {
          await result.current.getIdToken();
        })
      ).rejects.toThrow('User not authenticated');
    });

    it('throws Error with exact message "User not authenticated"', async () => {
      await setMockCurrentUser(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let thrownError: Error | undefined;

      try {
        await act(async () => {
          await result.current.getIdToken();
        });
      } catch (error) {
        thrownError = error as Error;
      }

      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError?.message).toBe('User not authenticated');
    });

    it('throws error immediately without calling Firebase getIdToken', async () => {
      await setMockCurrentUser(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      try {
        await act(async () => {
          await result.current.getIdToken();
        });
      } catch {
        // Expected to throw
      }

      // Firebase getIdToken should never be called when no user
      expect(mockGetIdToken).not.toHaveBeenCalled();
    });
  });

  /**
   * Additional edge case tests for robustness
   */
  describe('Edge Cases', () => {
    it('getIdToken is a function in the returned context', async () => {
      await setMockCurrentUser(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.getIdToken).toBe('function');
    });

    it('getIdToken returns a Promise', async () => {
      const expectedToken = 'test-token';
      mockGetIdToken.mockResolvedValue(expectedToken);

      await setMockCurrentUser({
        getIdToken: mockGetIdToken,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let promise: Promise<string> | undefined;

      await act(async () => {
        promise = result.current.getIdToken();
        // Verify it's a Promise before awaiting
        expect(promise).toBeInstanceOf(Promise);
        await promise;
      });
    });

    it('propagates errors from Firebase getIdToken', async () => {
      const firebaseError = new Error('Firebase token refresh failed');
      mockGetIdToken.mockRejectedValue(firebaseError);

      await setMockCurrentUser({
        getIdToken: mockGetIdToken,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.getIdToken();
        })
      ).rejects.toThrow('Firebase token refresh failed');
    });
  });
});
