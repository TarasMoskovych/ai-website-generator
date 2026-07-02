/**
 * Website Preview/Editor Page - Server Component shell with Suspense streaming
 *
 * Renders a static layout shell immediately in the server response,
 * then streams the interactive content via Suspense.
 *
 * Requirements: 3.4, 3.5
 */

import { Suspense } from 'react';
import { PreviewSkeleton } from './PreviewSkeleton';
import { WebsitePageContent } from './WebsitePageContent';

interface WebsitePageProps {
  params: Promise<{ id: string }>;
}

export default async function WebsitePage({ params }: WebsitePageProps) {
  const { id: websiteId } = await params;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-primary/5">
      {/* Decorative background elements - static HTML rendered immediately */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Data-dependent content wrapped in Suspense for streaming */}
      <Suspense fallback={<PreviewSkeleton />}>
        <WebsitePageContent websiteId={websiteId} />
      </Suspense>
    </div>
  );
}
