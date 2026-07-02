/**
 * Server-Side Data Fetching
 *
 * Provides server-only data fetching functions using Firebase Admin SDK.
 * These functions are cached with unstable_cache for 60-second revalidation.
 *
 * Requirements: 1.1, 1.2, 2.3, 6.1, 6.2
 */

import { unstable_cache } from 'next/cache';
import { getAdminDb } from './firebaseAdmin';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ShowcasedWebsiteServer {
  id: string;
  title: string;
  thumbnailUrl: string;
  creatorName: string;
  showcasedAt: string;
}

export interface PaginatedShowcaseResult {
  items: ShowcasedWebsiteServer[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Raw document interface (what Firestore stores) ───────────────────────────

export interface WebsiteDocument {
  id: string;
  title?: string;
  thumbnailUrl?: string;
  creatorName?: string;
  isPublic?: boolean;
  isShowcased?: boolean;
  showcasedAt?: { toDate(): Date } | string | null;
  [key: string]: unknown;
}

// ─── Pure filtering/sorting logic (exported for property testing) ─────────────

/**
 * Filters and sorts an array of website documents to return only valid
 * showcased items in descending showcasedAt order.
 *
 * This pure function is extracted from the Firestore query logic so that
 * it can be property-tested independently (Task 1.3).
 *
 * @param documents - Array of raw website documents
 * @param page - 1-based page number
 * @param pageSize - Number of items per page
 * @returns Paginated result with only public, showcased items in correct order
 */
export function filterAndSortShowcasedWebsites(
  documents: WebsiteDocument[],
  page: number,
  pageSize: number
): PaginatedShowcaseResult {
  // Validate pagination parameters
  const validPage = Math.max(1, page);
  const validPageSize = Math.max(1, Math.min(100, pageSize));

  // Filter: only public AND showcased items with valid showcasedAt
  const filtered = documents.filter(
    (doc) =>
      doc.isPublic === true &&
      doc.isShowcased === true &&
      doc.showcasedAt != null
  );

  // Sort by showcasedAt descending
  const sorted = [...filtered].sort((a, b) => {
    const dateA = resolveDate(a.showcasedAt);
    const dateB = resolveDate(b.showcasedAt);
    return dateB.getTime() - dateA.getTime();
  });

  const totalCount = sorted.length;
  const totalPages = Math.ceil(totalCount / validPageSize);

  // Paginate
  const offset = (validPage - 1) * validPageSize;
  const paginatedItems = sorted.slice(offset, offset + validPageSize);

  // Map to ShowcasedWebsiteServer interface
  const items: ShowcasedWebsiteServer[] = paginatedItems.map((doc) => ({
    id: doc.id,
    title: doc.title || '',
    thumbnailUrl: doc.thumbnailUrl || '',
    creatorName: doc.creatorName || 'Anonymous',
    showcasedAt: resolveDate(doc.showcasedAt).toISOString(),
  }));

  return {
    items,
    totalCount,
    page: validPage,
    pageSize: validPageSize,
    totalPages,
  };
}

/**
 * Resolves a showcasedAt value (Firestore Timestamp or ISO string) to a Date.
 */
function resolveDate(value: { toDate(): Date } | string | null | undefined): Date {
  if (value == null) return new Date(0);
  if (typeof value === 'string') return new Date(value);
  if (typeof value === 'object' && 'toDate' in value) return value.toDate();
  return new Date(0);
}

// ─── Cached server-side data fetching functions ──────────────────────────────

const WEBSITES_COLLECTION = 'websites';

/**
 * Fetches showcased websites from Firestore using Admin SDK.
 * Cached with unstable_cache for 60-second revalidation.
 *
 * Requirement 1.2: First page of 12 showcased websites, isPublic AND isShowcased true, sorted by showcasedAt desc.
 * Requirement 6.1: 60-second revalidation interval.
 */
export const getShowcasedWebsitesServer = unstable_cache(
  async (page: number, pageSize: number): Promise<PaginatedShowcaseResult> => {
    const db = getAdminDb();

    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(100, pageSize));

    // Get total count
    const collectionRef = db.collection(WEBSITES_COLLECTION);
    const countSnapshot = await collectionRef
      .where('isPublic', '==', true)
      .where('isShowcased', '==', true)
      .count()
      .get();
    const totalCount = countSnapshot.data().count;

    const totalPages = Math.ceil(totalCount / validPageSize);

    // If no results or requesting beyond available pages
    if (totalCount === 0 || (validPage > totalPages && totalPages > 0)) {
      return {
        items: [],
        totalCount,
        page: validPage,
        pageSize: validPageSize,
        totalPages: totalPages || 0,
      };
    }

    // Query with ordering and pagination
    const offset = (validPage - 1) * validPageSize;
    const snapshot = await collectionRef
      .where('isPublic', '==', true)
      .where('isShowcased', '==', true)
      .orderBy('showcasedAt', 'desc')
      .offset(offset)
      .limit(validPageSize)
      .get();

    const items: ShowcasedWebsiteServer[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        thumbnailUrl: data.thumbnailUrl || '',
        creatorName: data.creatorName || 'Anonymous',
        showcasedAt: data.showcasedAt?.toDate
          ? data.showcasedAt.toDate().toISOString()
          : data.showcasedAt || new Date(0).toISOString(),
      };
    });

    return {
      items,
      totalCount,
      page: validPage,
      pageSize: validPageSize,
      totalPages,
    };
  },
  ['showcased-websites'],
  { revalidate: 60, tags: ['showcase'] }
);

/**
 * Fetches showcase preview (up to 6 items) for the Login page.
 * Same cache tag as full showcase for consistent revalidation.
 *
 * Requirement 2.3: Up to 6 showcased websites sorted by showcasedAt descending.
 * Requirement 6.2: Same 60-second revalidation as full showcase.
 */
export const getShowcasePreviewServer = unstable_cache(
  async (): Promise<ShowcasedWebsiteServer[]> => {
    const db = getAdminDb();

    const snapshot = await db
      .collection(WEBSITES_COLLECTION)
      .where('isPublic', '==', true)
      .where('isShowcased', '==', true)
      .orderBy('showcasedAt', 'desc')
      .limit(6)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        thumbnailUrl: data.thumbnailUrl || '',
        creatorName: data.creatorName || 'Anonymous',
        showcasedAt: data.showcasedAt?.toDate
          ? data.showcasedAt.toDate().toISOString()
          : data.showcasedAt || new Date(0).toISOString(),
      };
    });
  },
  ['showcase-preview'],
  { revalidate: 60, tags: ['showcase'] }
);
