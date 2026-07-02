/**
 * Login Page Server Sections - Unit Tests
 *
 * Tests that verify the Login page server component renders correctly:
 * - Hero section renders title, description, and logo without JS
 * - Features grid renders three feature cards
 * - Showcase preview renders up to 6 items with mock data
 * - Showcase preview shows empty state on fetch failure
 * - AuthCard renders sign-in button and handles errors
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.5
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { ShowcasedWebsiteServer } from '@/lib/serverData';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Mock next/image to render as a regular img
vi.mock('next/image', () => ({
  default: ({ src, alt, fill, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src as string} alt={alt} {...props} />
  ),
}));

// Mock next/link to render as a regular anchor
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode }) => (
    <a href={href as string} {...props}>{children}</a>
  ),
}));

// Mock the auth context
const mockSignInWithGoogle = vi.fn();
const mockClearError = vi.fn();
let mockAuthState = {
  user: null as null | { uid: string },
  loading: false,
  isLoading: false,
  error: null as string | null,
  signInWithGoogle: mockSignInWithGoogle,
  signOut: vi.fn(),
  clearError: mockClearError,
  getIdToken: vi.fn(),
};

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => mockAuthState,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/auth/ProtectedRoute', () => ({
  getAndClearRedirectUrl: () => null,
  storeRedirectUrl: vi.fn(),
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock getShowcasePreviewServer from serverData
const mockGetShowcasePreviewServer = vi.fn();
vi.mock('@/lib/serverData', () => ({
  getShowcasePreviewServer: (...args: unknown[]) => mockGetShowcasePreviewServer(...args),
}));

// Mock AppFooter (client component)
vi.mock('@/components/layout', () => ({
  AppFooter: () => <footer data-testid="app-footer">Footer</footer>,
}));

// Mock ShowcasePreviewServer for page-level tests (async server component can't render in jsdom)
let mockShowcaseContent: React.ReactNode = null;
vi.mock('@/components/ShowcasePreviewServer', () => ({
  ShowcasePreviewServer: () => mockShowcaseContent,
  default: () => mockShowcaseContent,
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function createMockShowcaseItem(id: string, overrides?: Partial<ShowcasedWebsiteServer>): ShowcasedWebsiteServer {
  return {
    id,
    title: `Website ${id}`,
    thumbnailUrl: `https://example.com/thumb-${id}.png`,
    creatorName: `Creator ${id}`,
    showcasedAt: '2024-06-01T12:00:00Z',
    ...overrides,
  };
}

// Import page component after mocks
import LoginPage from './page';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Login Page - Server Sections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetShowcasePreviewServer.mockResolvedValue([]);
    mockShowcaseContent = <div data-testid="showcase-preview-mock">Showcase section</div>;
    mockAuthState = {
      user: null,
      loading: false,
      isLoading: false,
      error: null,
      signInWithGoogle: mockSignInWithGoogle,
      signOut: vi.fn(),
      clearError: mockClearError,
      getIdToken: vi.fn(),
    };
  });

  describe('Hero Section (Requirement 2.1)', () => {
    it('renders the application title', async () => {
      const element = await LoginPage();
      render(element);

      expect(screen.getByRole('heading', { level: 1, name: /ai website generator/i })).toBeInTheDocument();
    });

    it('renders the application description', async () => {
      const element = await LoginPage();
      render(element);

      expect(screen.getByText(/generate complete websites from text descriptions or screenshots using ai/i)).toBeInTheDocument();
    });

    it('renders the logo icon', async () => {
      const element = await LoginPage();
      const { container } = render(element);

      // Logo container has aria-hidden and contains an SVG
      const logoContainer = container.querySelector('[aria-hidden="true"]');
      expect(logoContainer).toBeInTheDocument();
      const svg = logoContainer!.querySelector('svg') || logoContainer!.closest('div')?.querySelector('svg');
      // The first aria-hidden div with an SVG is the logo
      expect(container.querySelector('[aria-hidden="true"] svg')).toBeInTheDocument();
    });

    it('renders the page within a main element', async () => {
      const element = await LoginPage();
      const { container } = render(element);

      const main = container.querySelector('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveClass('min-h-screen');
    });
  });

  describe('Features Grid (Requirement 2.1)', () => {
    it('renders three feature cards', async () => {
      const element = await LoginPage();
      render(element);

      expect(screen.getByText('Text to Website')).toBeInTheDocument();
      expect(screen.getByText('Screenshot to Code')).toBeInTheDocument();
      expect(screen.getByText('Download & Share')).toBeInTheDocument();
    });

    it('renders feature descriptions', async () => {
      const element = await LoginPage();
      render(element);

      expect(screen.getByText('Describe your vision')).toBeInTheDocument();
      expect(screen.getByText('Upload a design')).toBeInTheDocument();
      expect(screen.getByText('Export your sites')).toBeInTheDocument();
    });

    it('renders feature icons with aria-hidden for accessibility', async () => {
      const element = await LoginPage();
      const { container } = render(element);

      // Find the features grid (3-column grid)
      const grid = container.querySelector('.grid.grid-cols-3');
      expect(grid).toBeInTheDocument();

      // Each feature card has a decorative icon container with aria-hidden
      const iconContainers = grid!.querySelectorAll('[aria-hidden="true"]');
      expect(iconContainers.length).toBe(3);
    });
  });

  describe('Showcase Preview - Success (Requirement 2.3)', () => {
    it('renders showcase section in the page layout', async () => {
      const element = await LoginPage();
      render(element);

      expect(screen.getByTestId('showcase-preview-mock')).toBeInTheDocument();
    });

    it('renders up to 6 showcase items when ShowcasePreviewServer fetches data', async () => {
      // Test the ShowcasePreviewServer component directly by importing and awaiting it
      const { ShowcasePreviewServer: ActualShowcasePreviewServer } = await vi.importActual<typeof import('@/components/ShowcasePreviewServer')>('@/components/ShowcasePreviewServer');

      const mockItems = Array.from({ length: 6 }, (_, i) =>
        createMockShowcaseItem(`item-${i + 1}`)
      );
      mockGetShowcasePreviewServer.mockResolvedValue(mockItems);

      const element = await ActualShowcasePreviewServer();
      render(element);

      // All 6 website titles should be visible
      for (let i = 1; i <= 6; i++) {
        expect(screen.getByText(`Website item-${i}`)).toBeInTheDocument();
      }
    });

    it('renders creator names for each showcase item', async () => {
      const { ShowcasePreviewServer: ActualShowcasePreviewServer } = await vi.importActual<typeof import('@/components/ShowcasePreviewServer')>('@/components/ShowcasePreviewServer');

      const mockItems = [
        createMockShowcaseItem('1', { creatorName: 'Alice' }),
        createMockShowcaseItem('2', { creatorName: 'Bob' }),
      ];
      mockGetShowcasePreviewServer.mockResolvedValue(mockItems);

      const element = await ActualShowcasePreviewServer();
      render(element);

      expect(screen.getByText('by Alice')).toBeInTheDocument();
      expect(screen.getByText('by Bob')).toBeInTheDocument();
    });

    it('renders the Community Showcase section heading', async () => {
      const { ShowcasePreviewServer: ActualShowcasePreviewServer } = await vi.importActual<typeof import('@/components/ShowcasePreviewServer')>('@/components/ShowcasePreviewServer');

      mockGetShowcasePreviewServer.mockResolvedValue([createMockShowcaseItem('1')]);

      const element = await ActualShowcasePreviewServer();
      render(element);

      expect(screen.getByRole('heading', { name: /community showcase/i })).toBeInTheDocument();
    });

    it('renders a View All link to the showcase page', async () => {
      const { ShowcasePreviewServer: ActualShowcasePreviewServer } = await vi.importActual<typeof import('@/components/ShowcasePreviewServer')>('@/components/ShowcasePreviewServer');

      mockGetShowcasePreviewServer.mockResolvedValue([createMockShowcaseItem('1')]);

      const element = await ActualShowcasePreviewServer();
      render(element);

      const viewAllLink = screen.getByRole('link', { name: /view all/i });
      expect(viewAllLink).toHaveAttribute('href', '/showcase');
    });
  });

  describe('Showcase Preview - Failure (Requirement 2.5)', () => {
    it('shows empty state message when fetch fails', async () => {
      const { ShowcasePreviewServer: ActualShowcasePreviewServer } = await vi.importActual<typeof import('@/components/ShowcasePreviewServer')>('@/components/ShowcasePreviewServer');

      mockGetShowcasePreviewServer.mockRejectedValue(new Error('Network error'));

      const element = await ActualShowcasePreviewServer();
      render(element);

      expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
    });

    it('does not fail the entire page render on fetch failure', async () => {
      // For the full page, ShowcasePreviewServer is mocked, so the page still renders
      mockShowcaseContent = <div data-testid="showcase-fallback">Empty state</div>;

      const element = await LoginPage();
      render(element);

      // Hero section still renders
      expect(screen.getByRole('heading', { level: 1, name: /ai website generator/i })).toBeInTheDocument();
      // Features still render
      expect(screen.getByText('Text to Website')).toBeInTheDocument();
      // Showcase section renders (mocked, but present)
      expect(screen.getByTestId('showcase-fallback')).toBeInTheDocument();
    });

    it('shows empty state when no websites are returned', async () => {
      const { ShowcasePreviewServer: ActualShowcasePreviewServer } = await vi.importActual<typeof import('@/components/ShowcasePreviewServer')>('@/components/ShowcasePreviewServer');

      mockGetShowcasePreviewServer.mockResolvedValue([]);

      const element = await ActualShowcasePreviewServer();
      render(element);

      expect(screen.getByText(/be the first to share/i)).toBeInTheDocument();
    });
  });

  describe('AuthCard - Sign-in and Errors (Requirement 2.2)', () => {
    it('renders the sign-in button', async () => {
      const element = await LoginPage();
      render(element);

      expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
    });

    it('renders the sign-in heading', async () => {
      const element = await LoginPage();
      render(element);

      expect(screen.getByText(/sign in to get started/i)).toBeInTheDocument();
    });

    it('displays auth error when sign-in fails', async () => {
      mockSignInWithGoogle.mockRejectedValue(new Error('Auth failed'));

      const element = await LoginPage();
      render(element);

      // Click sign-in
      const button = screen.getByRole('button', { name: /sign in with google/i });
      await act(async () => {
        fireEvent.click(button);
      });

      // Error should appear
      const errorAlert = await screen.findByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(screen.getByText('Auth failed')).toBeInTheDocument();
    });

    it('allows dismissing auth errors', async () => {
      mockSignInWithGoogle.mockRejectedValue(new Error('Dismissed error'));

      const element = await LoginPage();
      render(element);

      // Trigger error
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
      });

      // Wait for error
      const errorAlert = await screen.findByRole('alert');
      expect(errorAlert).toBeInTheDocument();

      // Dismiss error
      const dismissButton = screen.getByRole('button', { name: /dismiss error/i });
      fireEvent.click(dismissButton);

      expect(mockClearError).toHaveBeenCalled();
    });
  });
});
