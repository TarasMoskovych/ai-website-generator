/**
 * Services Index
 * Re-exports all services for convenient importing
 */

// Auth Service
export {
  signInWithGoogle,
  signOut,
  getCurrentUser,
  onAuthStateChange,
  default as authService,
} from './authService';
export type { AuthService } from './authService';
