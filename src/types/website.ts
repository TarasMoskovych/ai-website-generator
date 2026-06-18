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
  /** ISO 8601 timestamp of creation */
  createdAt: string;
  /** ISO 8601 timestamp of last update */
  updatedAt: string;
}

/**
 * Data required to create a new website (without auto-generated fields)
 */
export type CreateWebsiteData = Omit<GeneratedWebsite, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

/**
 * Data that can be updated on an existing website
 */
export type UpdateWebsiteData = Partial<Pick<GeneratedWebsite, 'title' | 'html' | 'css' | 'thumbnailUrl' | 'isPublic'>>;
