/**
 * Website Types
 * Defines types for generated website data
 */

/**
 * Represents a generated website stored in Firestore
 */
export interface GeneratedWebsite {
  /** Firestore document ID */
  id: string;
  /** Firebase Auth UID (owner) */
  userId: string;
  /** Website title (1-100 characters) */
  title: string;
  /** Generated HTML code */
  html: string;
  /** Generated CSS code */
  css: string;
  /** Base64 data URL for thumbnail or placeholder */
  thumbnailUrl: string;
  /** How the website was generated */
  inputType: 'text' | 'screenshot';
  /** Whether the website is publicly viewable */
  isPublic: boolean;
  /** Whether the website is featured in the public showcase */
  isShowcased: boolean;
  /** ISO 8601 timestamp when the website was added to showcase (null if not showcased) */
  showcasedAt: string | null;
  /** Display name of the creator for showcase attribution */
  creatorName: string;
  /** ISO 8601 timestamp of creation */
  createdAt: string;
  /** ISO 8601 timestamp of last update */
  updatedAt: string;
}

/**
 * Represents a showcased website with minimal data for display
 */
export interface ShowcasedWebsite {
  /** Firestore document ID */
  id: string;
  /** Website title */
  title: string;
  /** Base64 data URL for thumbnail */
  thumbnailUrl: string;
  /** Display name of the creator */
  creatorName: string;
  /** ISO 8601 timestamp when showcased */
  showcasedAt: string;
}

/**
 * Data required to create a new website (without auto-generated fields)
 */
export type CreateWebsiteData = Omit<GeneratedWebsite, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'isShowcased' | 'showcasedAt' | 'creatorName'>;

/**
 * Data that can be updated on an existing website
 */
export type UpdateWebsiteData = Partial<Pick<GeneratedWebsite, 'title' | 'html' | 'css' | 'thumbnailUrl' | 'isPublic' | 'isShowcased' | 'showcasedAt'>>;
