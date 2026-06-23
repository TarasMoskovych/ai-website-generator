/**
 * ShowcaseWebsiteCard Component
 * Displays a card for a showcased website with thumbnail, title, and creator name
 *
 * Requirements:
 * - 11.1: Create ShowcaseWebsiteCard component at src/components/ShowcaseWebsiteCard.tsx
 * - 11.2: Accept website prop of type ShowcasedWebsite and render card with thumbnail, title, and creator name with link to public view
 *
 * Design Decisions:
 * - Links to /view/{id} with target="_blank"
 * - Uses Next.js Image component for optimized thumbnail loading
 * - Falls back to globe icon when no thumbnail
 * - Hover effects for interactivity
 */

import Link from 'next/link';
import Image from 'next/image';
import { GlobeIcon } from '@/components/icons';
import type { ShowcasedWebsite } from '@/types/website';

/**
 * ShowcaseWebsiteCard component props
 */
export interface ShowcaseWebsiteCardProps {
  /** Website data to display */
  website: ShowcasedWebsite;
}

/**
 * ShowcaseWebsiteCard component
 * Renders a card for a showcased website with thumbnail, title, and creator
 */
export function ShowcaseWebsiteCard({ website }: ShowcaseWebsiteCardProps) {
  return (
    <Link
      href={`/view/${website.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block w-full"
    >
      <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted transition-all group-hover:border-primary/50 group-hover:shadow-md">
        {website.thumbnailUrl ? (
          <Image
            src={website.thumbnailUrl}
            alt={`Preview of ${website.title}`}
            fill
            className="object-cover object-top transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <GlobeIcon className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
      </div>
      <div className="mt-3">
        <h3 className="font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {website.title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          by {website.creatorName}
        </p>
      </div>
    </Link>
  );
}

export default ShowcaseWebsiteCard;
