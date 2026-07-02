'use client';

import { useEffect } from 'react';

export default function ShowcaseError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('Showcase error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <p className="text-destructive mb-4">
        Something went wrong loading the showcase.
      </p>
      <button
        onClick={() => unstable_retry()}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
