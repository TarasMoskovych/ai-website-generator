/**
 * Public Website View Layout
 * This layout provides a clean HTML document structure for public website viewing
 * without any application UI elements (no AuthProvider, ThemeProvider, or app header)
 *
 * Requirements:
 * - 16.1: Render without any application UI elements
 * - 16.2: Public route - no authentication required
 * - 16.3: Include proper HTML document structure
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Website View',
  description: 'View generated website',
};

/**
 * Minimal layout for public website viewing
 * Just passes through children without adding any app UI
 */
export default function ViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout intentionally does not wrap children with any providers
  // or UI elements to allow the generated website to render full-page
  return <>{children}</>;
}
