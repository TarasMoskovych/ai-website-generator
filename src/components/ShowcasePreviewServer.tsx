/**
 * ShowcasePreviewServer Component (Server Component)
 *
 * Fetches and renders a preview of community showcased websites for the Login page.
 * This is an async server component that fetches data using getShowcasePreviewServer()
 * and renders up to 6 ShowcaseWebsiteCard components.
 *
 * On fetch failure, renders an empty state section instead of failing the entire page.
 *
 * Requirements:
 * - 2.3: Fetch and pre-render community showcase preview with up to 6 showcased websites
 * - 2.5: Render empty state message on fetch failure instead of failing the page
 */

import Link from 'next/link';
import { getShowcasePreviewServer } from '@/lib/serverData';
import { ShowcaseWebsiteCard } from '@/components/ShowcaseWebsiteCard';
import { GlobeIcon, ArrowRightIcon } from '@/components/icons';
import type { ShowcasedWebsite } from '@/types/website';

/**
 * Section header with title and "View All" link
 */
function SectionHeader() {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <GlobeIcon className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Community Showcase</h2>
      </div>
      <Link
        href="/showcase"
        className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
      >
        View All
        <ArrowRightIcon className="h-4 w-4" />
      </Link>
    </div>
  );
}

/**
 * Empty state shown when no websites are available or fetch fails
 */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 px-6 rounded-2xl bg-background border border-border">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
        <GlobeIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground max-w-md mx-auto">{message}</p>
    </div>
  );
}

/**
 * ShowcasePreviewServer - Async server component
 *
 * Fetches showcase preview data on the server and renders up to 6 cards.
 * Handles fetch failures gracefully by showing an empty state message.
 */
export async function ShowcasePreviewServer() {
  let websites: ShowcasedWebsite[] = [];
  let fetchFailed = false;

  try {
    const data = await getShowcasePreviewServer();
    // Map ShowcasedWebsiteServer to ShowcasedWebsite (structurally identical)
    websites = data.map((item) => ({
      id: item.id,
      title: item.title,
      thumbnailUrl: item.thumbnailUrl,
      creatorName: item.creatorName,
      showcasedAt: item.showcasedAt,
    }));
  } catch {
    fetchFailed = true;
  }

  return (
    <section className="bg-muted/50 dark:bg-muted/20 py-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <SectionHeader />

        {fetchFailed ? (
          <EmptyState message="Showcase websites could not be loaded. Please try again later." />
        ) : websites.length === 0 ? (
          <EmptyState message="Be the first to share your creation! Generate a website and click &quot;Share&quot; to feature it here." />
        ) : (
          <div className="flex flex-wrap justify-center gap-6">
            {websites.map((website) => (
              <div key={website.id} className="w-[calc(50%-0.75rem)] sm:w-[calc(33.333%-1rem)]">
                <ShowcaseWebsiteCard website={website} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default ShowcasePreviewServer;
