import { vi } from 'vitest';
import type { AuthenticatedUser } from '@/types/auth';

// ============================================================================
// Firebase Auth Mocks
// ============================================================================

export const mockUser: AuthenticatedUser = {
  uid: 'mock-user-uid-123',
  email: 'mockuser@example.com',
  displayName: 'Mock User',
  photoURL: 'https://example.com/mock-photo.jpg',
};

export const mockGoogleProvider = {
  providerId: 'google.com',
  setCustomParameters: vi.fn(),
};

export const mockAuth = {
  currentUser: null as AuthenticatedUser | null,
  onAuthStateChanged: vi.fn((callback: (user: AuthenticatedUser | null) => void) => {
    // Immediately call with current user state
    callback(mockAuth.currentUser);
    // Return unsubscribe function
    return vi.fn();
  }),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
};

// ============================================================================
// Firebase Firestore Mocks
// ============================================================================

export const mockTimestamp = {
  now: vi.fn(() => ({
    toDate: () => new Date(),
    seconds: Math.floor(Date.now() / 1000),
    nanoseconds: 0,
  })),
  fromDate: vi.fn((date: Date) => ({
    toDate: () => date,
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
  })),
};

export const mockDoc = vi.fn();
export const mockCollection = vi.fn();
export const mockGetDoc = vi.fn();
export const mockGetDocs = vi.fn();
export const mockSetDoc = vi.fn();
export const mockUpdateDoc = vi.fn();
export const mockDeleteDoc = vi.fn();
export const mockAddDoc = vi.fn();
export const mockQuery = vi.fn();
export const mockWhere = vi.fn();
export const mockOrderBy = vi.fn();
export const mockLimit = vi.fn();
export const mockStartAfter = vi.fn();

export const mockFirestore = {
  doc: mockDoc,
  collection: mockCollection,
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  addDoc: mockAddDoc,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  limit: mockLimit,
  startAfter: mockStartAfter,
};

// ============================================================================
// Firebase Storage Mocks
// ============================================================================

export const mockRef = vi.fn();
export const mockUploadBytes = vi.fn();
export const mockGetDownloadURL = vi.fn();
export const mockDeleteObject = vi.fn();

export const mockStorage = {
  ref: mockRef,
  uploadBytes: mockUploadBytes,
  getDownloadURL: mockGetDownloadURL,
  deleteObject: mockDeleteObject,
};

// ============================================================================
// Reset All Mocks
// ============================================================================

export function resetAllFirebaseMocks() {
  // Reset auth
  mockAuth.currentUser = null;
  mockAuth.onAuthStateChanged.mockClear();
  mockAuth.signInWithPopup.mockClear();
  mockAuth.signOut.mockClear();

  // Reset firestore
  mockDoc.mockClear();
  mockCollection.mockClear();
  mockGetDoc.mockClear();
  mockGetDocs.mockClear();
  mockSetDoc.mockClear();
  mockUpdateDoc.mockClear();
  mockDeleteDoc.mockClear();
  mockAddDoc.mockClear();
  mockQuery.mockClear();
  mockWhere.mockClear();
  mockOrderBy.mockClear();
  mockLimit.mockClear();
  mockStartAfter.mockClear();
  mockTimestamp.now.mockClear();
  mockTimestamp.fromDate.mockClear();

  // Reset storage
  mockRef.mockClear();
  mockUploadBytes.mockClear();
  mockGetDownloadURL.mockClear();
  mockDeleteObject.mockClear();
}

// ============================================================================
// Mock Document Snapshot Factory
// ============================================================================

export function createMockDocSnapshot<T>(
  id: string,
  data: T | undefined,
  exists: boolean = true
) {
  return {
    id,
    exists: () => exists,
    data: () => data,
    ref: { id, path: `websites/${id}` },
  };
}

// ============================================================================
// Mock Query Snapshot Factory
// ============================================================================

export function createMockQuerySnapshot<T>(docs: Array<{ id: string; data: T }>) {
  return {
    docs: docs.map(({ id, data }) => createMockDocSnapshot(id, data)),
    size: docs.length,
    empty: docs.length === 0,
    forEach: (callback: (doc: ReturnType<typeof createMockDocSnapshot>) => void) => {
      docs.forEach(({ id, data }) => callback(createMockDocSnapshot(id, data)));
    },
  };
}
