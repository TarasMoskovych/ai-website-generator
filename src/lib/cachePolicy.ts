/**
 * Cache staleness policy for server-rendered pages.
 *
 * Determines whether to serve stale cached content or attempt a fresh
 * server render based on cache age and revalidation outcome.
 *
 * Requirements: 6.3, 6.4, 6.5
 */

const STALENESS_LIMIT_SECONDS = 86400; // 24 hours

/**
 * Determines whether stale cached content should be served or a fresh
 * server render should be attempted.
 *
 * - When cacheAgeSeconds < 86400 (24 hours) and revalidation failed,
 *   returns 'serve-stale' to continue serving previously cached content.
 * - When cacheAgeSeconds >= 86400 (24 hours), returns 'attempt-fresh'
 *   regardless of revalidation outcome, forcing a new server render.
 *
 * This is a pure function with no side effects or external dependencies.
 */
export function shouldServeStaleCacheContent(
  cacheAgeSeconds: number,
  revalidationSuccess: boolean,
): 'serve-stale' | 'attempt-fresh' {
  if (cacheAgeSeconds >= STALENESS_LIMIT_SECONDS) {
    return 'attempt-fresh';
  }

  if (!revalidationSuccess) {
    return 'serve-stale';
  }

  return 'attempt-fresh';
}
