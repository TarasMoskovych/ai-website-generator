/**
 * Public Website View Page
 * Public route that renders a generated website as a full-page standalone site
 *
 * Requirements:
 * - 16.1: Render the Generated_Website's HTML and CSS as a full-page standalone
 *         website without any application UI elements
 * - 16.2: The public view page SHALL be accessible without authentication to
 *         allow sharing with others
 * - 16.3: Include proper HTML document structure with the generated HTML in the
 *         body and CSS in a style tag
 * - 16.4: Set appropriate meta tags including the website title
 * - 16.5: If the requested website ID does not exist, display a 404 error page
 * - 16.6: Store a public visibility flag for each Generated_Website (defaults to true)
 * - 16.7: If a Generated_Website has public visibility disabled, require authentication
 *         and verify ownership before rendering
 *
 * This page:
 * 1. Is PUBLIC for websites with isPublic=true - no authentication required
 * 2. For private websites (isPublic=false), requires authentication and ownership
 * 3. Fetches website data by ID from the repository
 * 4. Renders the website full-page without app header/footer
 * 5. Uses proper HTML document structure with title and meta tags
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getById } from '@/services/websiteRepository';
import { PrivateWebsiteView } from './PrivateWebsiteView';

/**
 * Page props with dynamic route parameters
 */
interface ViewPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Generate metadata for the page including the website title
 * Requirement 16.4: Set appropriate meta tags including the website title
 */
export async function generateMetadata({ params }: ViewPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const websiteId = resolvedParams.id;

  try {
    const website = await getById(websiteId);

    if (!website) {
      return {
        title: 'Website Not Found',
        description: 'The requested website could not be found.',
      };
    }

    // For private websites, don't expose the title in metadata
    if (!website.isPublic) {
      return {
        title: 'Private Website',
        description: 'This website requires authentication to view.',
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    return {
      title: website.title,
      description: `Generated website: ${website.title}`,
      // Open Graph meta tags for better sharing
      openGraph: {
        title: website.title,
        description: `Generated website: ${website.title}`,
        type: 'website',
      },
      // Prevent search engines from indexing user-generated content by default
      robots: {
        index: false,
        follow: false,
      },
    };
  } catch {
    return {
      title: 'Error',
      description: 'An error occurred while loading the website.',
    };
  }
}

/**
 * Renders the public website content
 * Requirement 16.1: Render as full-page standalone website without app UI
 * Requirement 16.3: Include proper HTML document structure with CSS in style tag
 */
function PublicWebsiteContent({ html, css }: { html: string; css: string }) {
  return (
    <>
      {/* Inject the generated CSS into the page */}
      {/* Requirement 16.3: CSS in a style tag */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Full-page wrapper that overlays the entire viewport */}
      {/* This ensures the generated website displays without any app UI */}
      <div
        className="view-page-wrapper"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          overflow: 'auto',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Render the generated HTML content */}
        <div
          className="view-page-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </>
  );
}

/**
 * Public website view page component
 * Renders the generated website as a full-page standalone site
 *
 * Requirement 16.1: Render as full-page standalone website without app UI
 * Requirement 16.2: Accessible without authentication (for public websites)
 * Requirement 16.5: Display 404 for non-existent websites
 * Requirement 16.6: Check public visibility flag
 * Requirement 16.7: Require auth for private websites
 */
export default async function ViewPage({ params }: ViewPageProps) {
  const resolvedParams = await params;
  const websiteId = resolvedParams.id;

  // Fetch website data by ID
  let website;
  try {
    website = await getById(websiteId);
  } catch (error) {
    console.error('Error fetching website for public view:', error);
    notFound();
  }

  // Requirement 16.5: If the requested website ID does not exist, display 404
  if (!website) {
    notFound();
  }

  // Requirement 16.6 & 16.7: Check public visibility flag
  // If website is private (isPublic=false), require authentication and ownership
  if (!website.isPublic) {
    // For private websites, render a client component that handles auth
    return (
      <PrivateWebsiteView
        websiteId={websiteId}
        ownerId={website.userId}
        html={website.html}
        css={website.css}
        title={website.title}
      />
    );
  }

  // Requirement 16.2: Public websites are accessible without authentication
  // Render the website as a full-page using dangerouslySetInnerHTML
  // The page is rendered without any app UI elements (header, footer, etc.)
  return <PublicWebsiteContent html={website.html} css={website.css} />;
}
