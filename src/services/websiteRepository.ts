/**
 * Website Repository Service
 * Handles CRUD operations for website documents in Firebase Firestore
 *
 * Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 6.1
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
import { GeneratedWebsite, CreateWebsiteData, UpdateWebsiteData } from '@/types/website';

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
 * Website Repository Service Interface
 */
export interface WebsiteRepositoryService {
  save(userId: string, website: CreateWebsiteData): Promise<GeneratedWebsite>;
  getById(id: string): Promise<GeneratedWebsite | null>;
  getAllByUser(userId: string, options?: GetAllByUserOptions): Promise<PaginatedResult<GeneratedWebsite>>;
  update(id: string, updates: UpdateWebsiteData): Promise<void>;
  delete(id: string): Promise<void>;
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
    isPublic: data.isPublic ?? true,
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : data.createdAt,
    updatedAt: data.updatedAt instanceof Timestamp
      ? data.updatedAt.toDate().toISOString()
      : data.updatedAt,
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
 * @returns Promise resolving to the saved website with generated ID
 * @throws Error if persistence fails
 */
export async function save(
  userId: string,
  website: CreateWebsiteData
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
      isPublic: website.isPublic ?? true,
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
      isPublic: website.isPublic ?? true,
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
};

export default websiteRepository;
