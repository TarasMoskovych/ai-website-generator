import { vi } from 'vitest';

// ============================================================================
// Next.js Navigation Mocks
// ============================================================================

export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

export const mockPathname = vi.fn(() => '/');
export const mockSearchParams = {
  get: vi.fn(),
  getAll: vi.fn(),
  has: vi.fn(),
  keys: vi.fn(),
  values: vi.fn(),
  entries: vi.fn(),
  forEach: vi.fn(),
  toString: vi.fn(() => ''),
};

export const mockUseRouter = vi.fn(() => mockRouter);
export const mockUsePathname = vi.fn(() => mockPathname());
export const mockUseSearchParams = vi.fn(() => mockSearchParams);
export const mockUseParams = vi.fn(() => ({}));

// ============================================================================
// Next.js Image Mock
// ============================================================================

export const MockNextImage = vi.fn(
  ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => {
    // Return a simple img element for testing
    return `<img src="${src}" alt="${alt}" data-testid="next-image" />`;
  }
);

// ============================================================================
// Next.js Link Mock
// ============================================================================

export const MockNextLink = vi.fn(
  ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => {
    return `<a href="${href}" data-testid="next-link">${children}</a>`;
  }
);

// ============================================================================
// Reset All Next.js Mocks
// ============================================================================

export function resetAllNextMocks() {
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.refresh.mockClear();
  mockRouter.back.mockClear();
  mockRouter.forward.mockClear();
  mockRouter.prefetch.mockClear();

  mockPathname.mockClear();
  mockSearchParams.get.mockClear();
  mockSearchParams.getAll.mockClear();
  mockSearchParams.has.mockClear();
  mockSearchParams.toString.mockClear();

  mockUseRouter.mockClear();
  mockUsePathname.mockClear();
  mockUseSearchParams.mockClear();
  mockUseParams.mockClear();
}
