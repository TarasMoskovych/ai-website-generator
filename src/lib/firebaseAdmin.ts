/**
 * Firebase Admin SDK Configuration
 *
 * This module initializes Firebase Admin for server-side operations.
 * Used for verifying Firebase ID tokens in API routes.
 *
 * Requirements: 14.1 - Authentication required for protected routes
 */

import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore, Firestore } from 'firebase-admin/firestore';

// Cached instances
let adminApp: App | null = null;
let adminAuthInstance: Auth | null = null;
let adminFirestoreInstance: Firestore | null = null;

/**
 * Checks if Firebase Admin SDK credentials are configured.
 * Supports either full JSON or individual env vars.
 *
 * @returns true if credentials are available
 */
function hasFirebaseAdminCredentials(): boolean {
  // Option 1: Full service account JSON (recommended)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return true;
  }
  // Option 2: Individual env vars (legacy)
  return !!(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  );
}

/**
 * Parses the service account from environment variables.
 * Supports two configuration methods:
 *
 * 1. FIREBASE_SERVICE_ACCOUNT - Full JSON (recommended)
 *    Set this to the entire service account JSON file content
 *
 * 2. Individual env vars (legacy):
 *    - FIREBASE_ADMIN_PROJECT_ID
 *    - FIREBASE_ADMIN_CLIENT_EMAIL
 *    - FIREBASE_ADMIN_PRIVATE_KEY
 *
 * @returns ServiceAccount object for Firebase Admin
 * @throws Error if credentials are missing or invalid
 */
function getServiceAccount(): ServiceAccount {
  // Option 1: Full service account JSON (recommended for Vercel)
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
        throw new Error('Missing required fields in service account JSON');
      }
      return parsed as ServiceAccount;
    } catch (e) {
      throw new Error(
        `Failed to parse FIREBASE_SERVICE_ACCOUNT: ${e instanceof Error ? e.message : 'Invalid JSON'}`
      );
    }
  }

  // Option 2: Individual env vars (legacy)
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin SDK credentials are not configured. ' +
        'Set FIREBASE_SERVICE_ACCOUNT (recommended) or individual vars: ' +
        'FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY'
    );
  }

  // Handle escaped newlines in private key
  const decodedKey = privateKey.replace(/\\n/g, '\n');

  return {
    projectId,
    clientEmail,
    privateKey: decodedKey,
  } as ServiceAccount;
}

/**
 * Initialize Firebase Admin SDK (singleton pattern, lazy initialization)
 *
 * @returns The Firebase Admin App instance
 * @throws Error if credentials are not configured
 */
function getFirebaseAdminApp(): App {
  // Return existing app if already initialized
  if (adminApp) {
    return adminApp;
  }

  // Check for existing apps (in case of multiple module loads)
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  const serviceAccount = getServiceAccount();

  adminApp = initializeApp({
    credential: cert(serviceAccount),
  });

  return adminApp;
}

/**
 * Gets the Firebase Admin Auth instance for token verification.
 * Lazy initialization to avoid build-time errors when env vars are not set.
 *
 * @returns The Firebase Admin Auth instance
 * @throws Error if credentials are not configured
 */
export function getAdminAuth(): Auth {
  if (adminAuthInstance) {
    return adminAuthInstance;
  }

  const app = getFirebaseAdminApp();
  adminAuthInstance = getAuth(app);
  return adminAuthInstance;
}

/**
 * Gets the Firebase Admin Firestore instance for server-side data access.
 * Lazy initialization to avoid build-time errors when env vars are not set.
 *
 * @returns The Firebase Admin Firestore instance
 * @throws Error if credentials are not configured
 */
export function getAdminDb(): Firestore {
  if (adminFirestoreInstance) {
    return adminFirestoreInstance;
  }

  const app = getFirebaseAdminApp();
  adminFirestoreInstance = getAdminFirestore(app);
  return adminFirestoreInstance;
}

/**
 * Verifies a Firebase ID token and returns the decoded token.
 * This is the main function to use for authentication in API routes.
 *
 * @param idToken - The Firebase ID token to verify
 * @returns The decoded token with user information
 * @throws Error if verification fails or credentials are not configured
 */
export async function verifyIdToken(idToken: string) {
  const auth = getAdminAuth();
  return auth.verifyIdToken(idToken);
}

/**
 * Checks if Firebase Admin is properly configured.
 * Use this to gracefully handle missing credentials.
 *
 * @returns true if Firebase Admin can be initialized
 */
export function isFirebaseAdminConfigured(): boolean {
  return hasFirebaseAdminCredentials();
}

export default getFirebaseAdminApp;
