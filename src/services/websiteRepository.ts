/**
 * Website Repository Service
 * Handles CRUD operations for website documents in Firebase Firestore
 *
 * Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 6.1, 23.2, 23.3, 23.6, 23.10
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GeneratedWebsite, CreateWebsiteData, UpdateWebsiteData, ShowcasedWebsite } from '@/types/website';

/**
 * Firestore collection name for websites
 */
const WEBSITES_COLLECTION = 'websites';

/**
 * Default page size for pagination
 */
const DEFAULT_PAGE_SIZE = 12;

/**
 * Paginated result interface
 */
export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Options for getAllByUser query
 */
export interface GetAllByUserOptions {
  page?: number;
  pageSize?: number;
}

/**
 * Options for getShowcasedWebsites query
 */
export interface GetShowcasedOptions {
  page?: number;
  pageSize?: number;
}

/**
 * Website Repository Service Interface
 */
export interface WebsiteRepositoryService {
  save(userId: string, website: CreateWebsiteData, creatorName: string): Promise<GeneratedWebsite>;
  getById(id: string): Promise<GeneratedWebsite | null>;
  getAllByUser(userId: string, options?: GetAllByUserOptions): Promise<PaginatedResult<GeneratedWebsite>>;
  update(id: string, updates: UpdateWebsiteData): Promise<void>;
  delete(id: string): Promise<void>;
  toggleShowcase(id: string, isShowcased: boolean): Promise<void>;
  getShowcasedWebsites(options?: GetShowcasedOptions): Promise<PaginatedResult<ShowcasedWebsite>>;
}

/**
 * Converts Firestore document data to GeneratedWebsite
 */
function documentToWebsite(
  id: string,
  data: DocumentData
): GeneratedWebsite {
  return {
    id,
    userId: data.userId,
    title: data.title,
    html: data.html,
    css: data.css,
    thumbnailUrl: data.thumbnailUrl || data.thumbnail || '', // Support both field names
    inputType: data.inputType || data.sourceType, // Support both field names
    originalPrompt: data.originalPrompt ?? null,
    isPublic: data.isPublic ?? true,
    isShowcased: data.isShowcased ?? false,
    showcasedAt: data.showcasedAt instanceof Timestamp
      ? data.showcasedAt.toDate().toISOString()
      : data.showcasedAt || null,
    creatorName: data.creatorName || 'Anonymous',
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : data.createdAt,
    updatedAt: data.updatedAt instanceof Timestamp
      ? data.updatedAt.toDate().toISOString()
      : data.updatedAt,
  };
}

/**
 * Converts Firestore document data to ShowcasedWebsite (minimal data)
 */
function documentToShowcasedWebsite(
  id: string,
  data: DocumentData
): ShowcasedWebsite {
  return {
    id,
    title: data.title,
    thumbnailUrl: data.thumbnailUrl || data.thumbnail || '',
    creatorName: data.creatorName || 'Anonymous',
    showcasedAt: data.showcasedAt instanceof Timestamp
      ? data.showcasedAt.toDate().toISOString()
      : data.showcasedAt,
  };
}

/**
 * Saves a new website to Firestore
 *
 * Requirement 5.1: Persist website data to Firebase Firestore including all required fields
 * Requirement 5.3: Assign a unique identifier to the website
 *
 * @param userId - Firebase Auth UID of the owner
 * @param website - Website data to save (without id, userId, timestamps)
 * @param creatorName - Display name of the creator for showcase attribution
 * @returns Promise resolving to the saved website with generated ID
 * @throws Error if persistence fails
 */
export async function save(
  userId: string,
  website: CreateWebsiteData,
  creatorName: string = 'Anonymous'
): Promise<GeneratedWebsite> {
  try {
    const now = Timestamp.now();

    const websiteData = {
      userId,
      title: website.title,
      html: website.html,
      css: website.css,
      thumbnailUrl: website.thumbnailUrl,
      inputType: website.inputType,
      originalPrompt: website.originalPrompt ?? null,
      isPublic: website.isPublic ?? true,
      isShowcased: false,
      showcasedAt: null,
      creatorName,
      createdAt: now,
      updatedAt: now,
    };

    // Add document to Firestore (generates unique ID)
    const docRef = await addDoc(collection(db, WEBSITES_COLLECTION), websiteData);

    // Return the complete website with generated ID
    return {
      id: docRef.id,
      userId,
      title: website.title,
      html: website.html,
      css: website.css,
      thumbnailUrl: website.thumbnailUrl,
      inputType: website.inputType,
      originalPrompt: website.originalPrompt ?? null,
      isPublic: website.isPublic ?? true,
      isShowcased: false,
      showcasedAt: null,
      creatorName,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString(),
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to save website: ${error.message}`);
    }
    throw new Error('Failed to save website: An unknown error occurred');
  }
}

/**
 * Retrieves a website by its ID
 *
 * @param id - Firestore document ID
 * @returns Promise resolving to the website or null if not found
 * @throws Error if retrieval fails
 */
export async function getById(id: string): Promise<GeneratedWebsite | null> {
  try {
    const docRef = doc(db, WEBSITES_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return documentToWebsite(docSnap.id, docSnap.data());
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to retrieve website: ${error.message}`);
    }
    throw new Error('Failed to retrieve website: An unknown error occurred');
  }
}

/**
 * Retrieves all websites for a user with pagination
 *
 * Requirement 5.4: Only allow users to access their own websites based on authenticated user's ID
 * Requirement 6.1: Retrieve and display only websites belonging to the authenticated user
 *
 * @param userId - Firebase Auth UID to filter by
 * @param options - Pagination options (page, pageSize)
 * @returns Promise resolving to paginated result
 * @throws Error if retrieval fails
 */
export async function getAllByUser(
  userId: string,
  options: GetAllByUserOptions = {}
): Promise<PaginatedResult<GeneratedWebsite>> {
  try {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = options;

    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(100, pageSize));

    // Get total count for pagination info
    const countQuery = query(
      collection(db, WEBSITES_COLLECTION),
      where('userId', '==', userId)
    );
    const countSnapshot = await getCountFromServer(countQuery);
    const totalCount = countSnapshot.data().count;

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / validPageSize);

    // If requesting a page beyond available data, return empty result
    if (validPage > totalPages && totalPages > 0) {
      return {
        items: [],
        totalCount,
        page: validPage,
        pageSize: validPageSize,
        totalPages,
      };
    }

    // Build query with ordering (newest first) and pagination
    // For pages after the first, we need to skip documents
    const offset = (validPage - 1) * validPageSize;

    let websitesQuery;

    if (offset === 0) {
      // First page - simple query
      websitesQuery = query(
        collection(db, WEBSITES_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(validPageSize)
      );
    } else {
      // For pagination, we need to fetch all documents up to the offset
      // and then use startAfter with the last document
      const skipQuery = query(
        collection(db, WEBSITES_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(offset)
      );
      const skipSnapshot = await getDocs(skipQuery);

      if (skipSnapshot.docs.length < offset) {
        // Not enough documents to reach this page
        return {
          items: [],
          totalCount,
          page: validPage,
          pageSize: validPageSize,
          totalPages,
        };
      }

      const lastDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];

      websitesQuery = query(
        collection(db, WEBSITES_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(validPageSize)
      );
    }

    const querySnapshot = await getDocs(websitesQuery);

    const items: GeneratedWebsite[] = querySnapshot.docs.map(
      (docSnap: QueryDocumentSnapshot<DocumentData>) =>
        documentToWebsite(docSnap.id, docSnap.data())
    );

    return {
      items,
      totalCount,
      page: validPage,
      pageSize: validPageSize,
      totalPages,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to retrieve websites: ${error.message}`);
    }
    throw new Error('Failed to retrieve websites: An unknown error occurred');
  }
}

/**
 * Updates a website's fields
 *
 * @param id - Firestore document ID
 * @param updates - Partial website data to update
 * @returns Promise that resolves when update is complete
 * @throws Error if update fails
 */
export async function update(
  id: string,
  updates: UpdateWebsiteData
): Promise<void> {
  try {
    const docRef = doc(db, WEBSITES_COLLECTION, id);

    // Check if document exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Website not found');
    }

    // Update with new timestamp
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to update website: ${error.message}`);
    }
    throw new Error('Failed to update website: An unknown error occurred');
  }
}

/**
 * Toggles the showcase status of a website
 *
 * Requirement 23.2: Update isShowcased field to true and record showcasedAt timestamp
 * Requirement 23.3: Update isShowcased field to false
 *
 * @param id - Firestore document ID
 * @param isShowcased - Whether to showcase the website
 * @returns Promise that resolves when update is complete
 * @throws Error if update fails
 */
export async function toggleShowcase(
  id: string,
  isShowcased: boolean
): Promise<void> {
  try {
    const docRef = doc(db, WEBSITES_COLLECTION, id);

    // Check if document exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Website not found');
    }

    // Update showcase status
    const updateData: Record<string, unknown> = {
      isShowcased,
      updatedAt: Timestamp.now(),
    };

    // Set showcasedAt timestamp when enabling showcase
    if (isShowcased) {
      updateData.showcasedAt = Timestamp.now();
    } else {
      updateData.showcasedAt = null;
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to update showcase status: ${error.message}`);
    }
    throw new Error('Failed to update showcase status: An unknown error occurred');
  }
}

/**
 * Retrieves showcased websites for public display
 *
 * Requirement 23.6: Provide dedicated /showcase page with pagination (12 per page)
 * Requirement 23.7: Sort by showcasedAt descending (newest first)
 * Requirement 23.10: Only include websites where isPublic AND isShowcased are true
 *
 * @param options - Pagination options (page, pageSize)
 * @returns Promise resolving to paginated result of showcased websites
 * @throws Error if retrieval fails
 */
export async function getShowcasedWebsites(
  options: GetShowcasedOptions = {}
): Promise<PaginatedResult<ShowcasedWebsite>> {
  try {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = options;

    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(100, pageSize));

    // Get total count for pagination info
    // Note: Firestore requires a composite index for this query
    const countQuery = query(
      collection(db, WEBSITES_COLLECTION),
      where('isPublic', '==', true),
      where('isShowcased', '==', true)
    );
    const countSnapshot = await getCountFromServer(countQuery);
    const totalCount = countSnapshot.data().count;

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / validPageSize);

    // If no showcased websites or requesting beyond available pages
    if (totalCount === 0 || (validPage > totalPages && totalPages > 0)) {
      return {
        items: [],
        totalCount,
        page: validPage,
        pageSize: validPageSize,
        totalPages: totalPages || 0,
      };
    }

    // Build query with ordering by showcasedAt (newest first)
    const offset = (validPage - 1) * validPageSize;

    let showcaseQuery;

    if (offset === 0) {
      // First page - simple query
      showcaseQuery = query(
        collection(db, WEBSITES_COLLECTION),
        where('isPublic', '==', true),
        where('isShowcased', '==', true),
        orderBy('showcasedAt', 'desc'),
        limit(validPageSize)
      );
    } else {
      // For pagination, fetch documents to skip
      const skipQuery = query(
        collection(db, WEBSITES_COLLECTION),
        where('isPublic', '==', true),
        where('isShowcased', '==', true),
        orderBy('showcasedAt', 'desc'),
        limit(offset)
      );
      const skipSnapshot = await getDocs(skipQuery);

      if (skipSnapshot.docs.length < offset) {
        return {
          items: [],
          totalCount,
          page: validPage,
          pageSize: validPageSize,
          totalPages,
        };
      }

      const lastDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];

      showcaseQuery = query(
        collection(db, WEBSITES_COLLECTION),
        where('isPublic', '==', true),
        where('isShowcased', '==', true),
        orderBy('showcasedAt', 'desc'),
        startAfter(lastDoc),
        limit(validPageSize)
      );
    }

    const querySnapshot = await getDocs(showcaseQuery);

    const items: ShowcasedWebsite[] = querySnapshot.docs.map(
      (docSnap: QueryDocumentSnapshot<DocumentData>) =>
        documentToShowcasedWebsite(docSnap.id, docSnap.data())
    );

    return {
      items,
      totalCount,
      page: validPage,
      pageSize: validPageSize,
      totalPages,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to retrieve showcased websites: ${error.message}`);
    }
    throw new Error('Failed to retrieve showcased websites: An unknown error occurred');
  }
}

/**
 * Deletes a website from Firestore
 *
 * Requirement 5.5: Delete website permanently from Firestore
 *
 * @param id - Firestore document ID
 * @returns Promise that resolves when deletion is complete
 * @throws Error if deletion fails
 */
export async function deleteWebsite(id: string): Promise<void> {
  try {
    const docRef = doc(db, WEBSITES_COLLECTION, id);

    // Check if document exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Website not found');
    }

    await deleteDoc(docRef);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to delete website: ${error.message}`);
    }
    throw new Error('Failed to delete website: An unknown error occurred');
  }
}

/**
 * Default WebsiteRepositoryService implementation
 */
const websiteRepository: WebsiteRepositoryService = {
  save,
  getById,
  getAllByUser,
  update,
  delete: deleteWebsite,
  toggleShowcase,
  getShowcasedWebsites,
};

export default websiteRepository;
