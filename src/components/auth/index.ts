/**
 * Auth Components Index
 * Re-exports auth components for convenient importing
 */

export { AuthProvider, useAuth } from './AuthProvider';
export type { AuthProviderProps } from './AuthProvider';

export {
  ProtectedRoute,
  storeRedirectUrl,
  getAndClearRedirectUrl,
} from './ProtectedRoute';
export type { ProtectedRouteProps } from './ProtectedRoute';
