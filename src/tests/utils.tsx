import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthenticatedUser } from '@/types/auth';
import { GeneratedWebsite } from '@/types/website';

// ============================================================================
// Test Data Factories
// ============================================================================

/**
 * Creates a mock authenticated user for testing
 */
export function createMockUser(overrides?: Partial<AuthenticatedUser>): AuthenticatedUser {
  return {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
    ...overrides,
  };
}

/**
 * Creates a mock generated website for testing
 */
export function createMockWebsite(overrides?: Partial<GeneratedWebsite>): GeneratedWebsite {
  const now = new Date().toISOString();
  return {
    id: 'website-123',
    userId: 'test-user-123',
    title: 'Test Website',
    html: '<html><body><h1>Hello World</h1></body></html>',
    css: 'body { margin: 0; }',
    thumbnailUrl: 'data:image/png;base64,mockThumbnail',
    inputType: 'text',
    originalPrompt: 'Create a test website',
    isPublic: true,
    isShowcased: false,
    showcasedAt: null,
    creatorName: 'Test User',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ============================================================================
// Custom Render Function
// ============================================================================

/**
 * Custom render function that wraps components with necessary providers
 */
function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  // Add providers here as needed (e.g., AuthProvider, ThemeProvider)
  return render(ui, { ...options });
}

export * from '@testing-library/react';
export { customRender as render };

// ============================================================================
// Firebase Mocks
// ============================================================================

export const mockFirebaseAuth = {
  currentUser: null as AuthenticatedUser | null,
  onAuthStateChanged: vi.fn((callback: (user: AuthenticatedUser | null) => void) => {
    callback(mockFirebaseAuth.currentUser);
    return vi.fn(); // Unsubscribe function
  }),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
};

export const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
};

// ============================================================================
// Mock Reset Helpers
// ============================================================================

/**
 * Resets all Firebase mocks to their initial state
 */
export function resetFirebaseMocks() {
  mockFirebaseAuth.currentUser = null;
  mockFirebaseAuth.onAuthStateChanged.mockClear();
  mockFirebaseAuth.signInWithPopup.mockClear();
  mockFirebaseAuth.signOut.mockClear();

  Object.values(mockFirestore).forEach((mock) => {
    if (typeof mock.mockClear === 'function') {
      mock.mockClear();
    }
  });
}

// ============================================================================
// Async Test Helpers
// ============================================================================

/**
 * Waits for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  { timeout = 1000, interval = 50 }: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Creates a delayed promise for testing async behavior
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
