/**
 * ShowcasePreview Component
 * Displays a preview of community showcased websites for the login page
 *
 * Requirements:
 * - 9.3: Create ShowcasePreview component at src/components/ShowcasePreview.tsx
 * - 9.4: Use useShowcaseWebsites hook with pageSize of 6
 *
 * Features:
 * - Internal ShowcaseCard component for individual website cards
 * - Loading skeleton state
 * - Empty state with CTA message
 * - Responsive grid layout (2 columns on mobile, 3 on desktop)
 */

'use client';

import type { ReactElement } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useShowcaseWebsites } from '@/hooks/useShowcaseWebsites';
import { GlobeIcon, ArrowRightIcon } from '@/components/icons';
import type { ShowcasedWebsite } from '@/types/website';

/**
 * Internal ShowcaseCard component for displaying a single showcased website
 */
interface ShowcaseCardProps {
  website: ShowcasedWebsite;
}

function ShowcaseCard({ website }: ShowcaseCardProps) {
  return (
    <Link
      href={`/view/${website.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block w-full"
    >
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm transition-all group-hover:border-white/40 group-hover:shadow-lg group-hover:shadow-primary/10">
        {website.thumbnailUrl ? (
          <Image
            src={website.thumbnailUrl}
            alt={`Preview of ${website.title}`}
            fill
            className="object-cover object-top transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <GlobeIcon className="h-8 w-8 text-white/30" />
          </div>
        )}
      </div>
      <div className="mt-3">
        <h3 className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {website.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          by {website.creatorName}
        </p>
      </div>
    </Link>
  );
}

/**
 * Loading skeleton state component
 */
function LoadingSkeleton() {
  return (
    <div className="flex flex-wrap justify-center gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="w-[calc(50%-0.75rem)] sm:w-[calc(33.333%-1rem)] animate-pulse">
          <div className="aspect-video bg-muted rounded-xl" />
          <div className="mt-3 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state component with CTA message
 */
function EmptyState() {
  return (
    <div className="text-center py-12 px-6 rounded-2xl bg-background border border-border">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
        <GlobeIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground max-w-md mx-auto">
        Be the first to share your creation! Generate a website and click &quot;Share&quot; to feature it here.
      </p>
    </div>
  );
}

/**
 * Section header component with title and View All link
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
 * ShowcasePreview component
 * Displays a preview of community showcased websites for the login page
 * Uses useShowcaseWebsites hook with pageSize of 6
 *
 * Requirements:
 * - 9.3: ShowcasePreview contains CommunityShowcase and ShowcaseCard components
 * - 9.4: Uses useShowcaseWebsites hook with pageSize of 6
 */
export function ShowcasePreview(): ReactElement {
  const { items: websites, isLoading } = useShowcaseWebsites({ pageSize: 6 });

  // Loading state
  if (isLoading) {
    return (
      <section className="bg-muted/50 dark:bg-muted/20 py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <SectionHeader />
          <LoadingSkeleton />
        </div>
      </section>
    );
  }

  // Empty state
  if (websites.length === 0) {
    return (
      <section className="bg-muted/50 dark:bg-muted/20 py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <SectionHeader />
          <EmptyState />
        </div>
      </section>
    );
  }

  // Websites grid
  return (
    <section className="bg-muted/50 dark:bg-muted/20 py-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <SectionHeader />
        <div className="flex flex-wrap justify-center gap-6">
          {websites.map((website) => (
            <div key={website.id} className="w-[calc(50%-0.75rem)] sm:w-[calc(33.333%-1rem)]">
              <ShowcaseCard website={website} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
