/**
 * Feature Parity Integration Tests
 *
 * Tests that verify client components retain full functionality after
 * the SSR migration. These tests validate that interactive features
 * still function correctly when composed within server-rendered shells.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { GeneratedWebsite, ShowcasedWebsite } from '@/types/website';

// ─── Shared mock state (must be declared before vi.mock) ─────────────────────

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockScrollTo = vi.fn();

// Showcase pagination mock data
const showcaseMockItems: ShowcasedWebsite[] = [
  {
    id: 'sw-1',
    title: 'Showcase Website 1',
    thumbnailUrl: 'https://example.com/thumb1.png',
    creatorName: 'Creator 1',
    showcasedAt: '2024-01-15T00:00:00.000Z',
  },
  {
    id: 'sw-2',
    title: 'Showcase Website 2',
    thumbnailUrl: 'https://example.com/thumb2.png',
    creatorName: 'Creator 2',
    showcasedAt: '2024-01-14T00:00:00.000Z',
  },
];

// Dashboard mock data
const dashboardMockWebsites: GeneratedWebsite[] = [
  {
    id: 'web-1',
    userId: 'user-123',
    title: 'My First Website',
    html: '<h1>Hello</h1>',
    css: 'h1 { color: red; }',
    thumbnailUrl: 'https://example.com/thumb.png',
    inputType: 'text',
    originalPrompt: 'Make me a website',
    isPublic: true,
    isShowcased: false,
    showcasedAt: null,
    creatorName: 'Test User',
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
  },
  {
    id: 'web-2',
    userId: 'user-123',
    title: 'Second Website',
    html: '<h1>World</h1>',
    css: 'h1 { color: blue; }',
    thumbnailUrl: 'https://example.com/thumb2.png',
    inputType: 'screenshot',
    originalPrompt: null,
    isPublic: true,
    isShowcased: true,
    showcasedAt: '2024-01-14T00:00:00.000Z',
    creatorName: 'Test User',
    createdAt: '2024-01-14T00:00:00.000Z',
    updatedAt: '2024-01-14T00:00:00.000Z',
  },
];

// Website preview mock data
const previewMockWebsite: GeneratedWebsite = {
  id: 'preview-1',
  userId: 'user-123',
  title: 'Preview Test Website',
  html: '<h1>Hello World</h1>',
  css: 'h1 { color: red; }',
  thumbnailUrl: 'https://example.com/thumb.png',
  inputType: 'text',
  originalPrompt: 'Create a simple website',
  isPublic: true,
  isShowcased: false,
  showcasedAt: null,
  creatorName: 'Test User',
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
};

// Mocked function handles
const mockShowcaseFetchPage = vi.fn().mockResolvedValue(undefined);
const mockDeleteFn = vi.fn().mockResolvedValue(undefined);
const mockUpdateFn = vi.fn().mockResolvedValue(undefined);
const mockToggleShowcaseFn = vi.fn().mockResolvedValue(undefined);
const mockGetByIdFn = vi.fn().mockResolvedValue(previewMockWebsite);

// ─── Top-level vi.mock declarations ─────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/website/preview-1',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src as string} alt={alt} {...props} />
  ),
}));

vi.mock('@/hooks/useShowcaseWebsites', () => ({
  useShowcaseWebsites: () => ({
    items: showcaseMockItems,
    isLoading: false,
    error: null,
    currentPage: 2,
    totalPages: 3,
    totalCount: 36,
    fetchPage: mockShowcaseFetchPage,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/components/ShowcaseWebsiteCard', () => ({
  ShowcaseWebsiteCard: ({ website }: { website: ShowcasedWebsite }) => (
    <div data-testid={`showcase-card-${website.id}`}>{website.title}</div>
  ),
}));

vi.mock('@/components/common/WebsiteCardSkeleton', () => ({
  WebsiteCardSkeleton: () => <div data-testid="website-card-skeleton">Skeleton</div>,
}));

vi.mock('@/components/Pagination', () => ({
  Pagination: ({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) => (
    <div data-testid="pagination">
      <span data-testid="current-page">{currentPage}</span>
      <span data-testid="total-pages">{totalPages}</span>
      <button data-testid="next-page-btn" onClick={() => onPageChange(currentPage + 1)}>
        Next
      </button>
      <button data-testid="prev-page-btn" onClick={() => onPageChange(currentPage - 1)}>
        Previous
      </button>
    </div>
  ),
}));

// Stable user object reference to prevent effect re-runs
const stableUser = { uid: 'user-123', email: 'test@test.com', displayName: 'Test User', photoURL: null };
const stableAuthReturn = {
  user: stableUser,
  loading: false,
  error: null,
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  clearError: vi.fn(),
};

vi.mock('@/components/auth', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => stableAuthReturn,
}));

vi.mock('@/hooks/useWebsites', () => ({
  useWebsites: () => ({
    items: dashboardMockWebsites,
    isLoading: false,
    error: null,
    currentPage: 1,
    totalPages: 1,
    fetchPage: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/services/websiteRepository', () => ({
  default: {
    delete: (...args: unknown[]) => mockDeleteFn(...args),
    update: (...args: unknown[]) => mockUpdateFn(...args),
    toggleShowcase: (...args: unknown[]) => mockToggleShowcaseFn(...args),
    getAllByUser: vi.fn().mockResolvedValue({ items: [], totalPages: 0, totalItems: 0 }),
    getById: (...args: unknown[]) => mockGetByIdFn(...args),
    getShowcasedWebsites: vi.fn().mockResolvedValue({ items: [], totalPages: 0, totalCount: 0 }),
  },
}));

vi.mock('@/components/layout', () => ({
  AppHeader: () => <header data-testid="app-header">Header</header>,
  AppFooter: () => <footer data-testid="app-footer">Footer</footer>,
  ShowcaseLink: () => <a href="/showcase" data-testid="showcase-link">Community Showcase</a>,
}));

vi.mock('@/components/DeleteConfirmDialog', () => ({
  DeleteConfirmDialog: ({
    isOpen,
    websiteTitle,
    onConfirm,
    onCancel,
    isLoading,
    error,
  }: {
    isOpen: boolean;
    websiteTitle: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading: boolean;
    error: string | null;
  }) =>
    isOpen ? (
      <div data-testid="delete-dialog">
        <p data-testid="delete-title">{websiteTitle}</p>
        <button data-testid="confirm-delete" onClick={onConfirm}>
          Confirm Delete
        </button>
        <button data-testid="cancel-delete" onClick={onCancel}>
          Cancel
        </button>
        {isLoading && <span data-testid="delete-loading">Deleting...</span>}
        {error && <span data-testid="delete-error">{error}</span>}
      </div>
    ) : null,
}));

vi.mock('@/components/common', () => ({
  ErrorMessage: ({ message }: { message: string }) => (
    <div data-testid="error-message">{message}</div>
  ),
  LoadingSpinner: ({ message }: { message?: string }) => (
    <div data-testid="loading-spinner">{message}</div>
  ),
  WebsiteNotFound: () => <div data-testid="not-found">Not Found</div>,
}));

vi.mock('@/hooks/useBeautifyWorkflow', () => ({
  useBeautifyWorkflow: () => ({
    isBeautifying: false,
    showBeautifyOptions: false,
    showPreviewComparison: false,
    showSaveOptions: false,
    beautifyStage: null,
    beautifyError: null,
    beautifiedHtml: '',
    beautifiedCss: '',
    streamingContent: '',
    openOptionsDialog: vi.fn(),
    handleConfirm: vi.fn(),
    handleDismiss: vi.fn(),
    handleAccept: vi.fn(),
    handleReject: vi.fn(),
    handleRetry: vi.fn(),
    cancelBeautify: vi.fn(),
  }),
}));

vi.mock('@/hooks/useBeautifySave', () => ({
  useBeautifySave: () => ({
    handleReplaceOriginal: vi.fn(),
    handleSaveAsNew: vi.fn(),
  }),
}));

vi.mock('@/services/downloadService', () => ({
  generateSingleFile: vi.fn().mockResolvedValue(new Blob(['<html></html>'])),
  generateZipArchive: vi.fn().mockResolvedValue(new Blob(['zip-content'])),
  downloadBlob: vi.fn(),
}));

vi.mock('@/services/htmlSanitizer', () => ({
  sanitize: (html: string) => html,
}));

vi.mock('@/components/CodeEditor', () => ({
  CodeEditor: ({
    html,
    css,
    onHtmlChange,
    onCssChange,
    activeTab,
    onTabChange,
  }: {
    html: string;
    css: string;
    onHtmlChange: (val: string) => void;
    onCssChange: (val: string) => void;
    activeTab: 'html' | 'css';
    onTabChange: (tab: 'html' | 'css') => void;
  }) => (
    <div data-testid="code-editor">
      <button data-testid="html-tab" onClick={() => onTabChange('html')}>
        HTML
      </button>
      <button data-testid="css-tab" onClick={() => onTabChange('css')}>
        CSS
      </button>
      <textarea
        data-testid="code-textarea"
        value={activeTab === 'html' ? html : css}
        onChange={(e) =>
          activeTab === 'html'
            ? onHtmlChange(e.target.value)
            : onCssChange(e.target.value)
        }
      />
    </div>
  ),
}));

vi.mock('@/components/PreviewRenderer', () => ({
  PreviewRenderer: ({
    html,
    css,
    viewportMode,
    onViewportChange,
  }: {
    html: string;
    css: string;
    viewportMode: string;
    onViewportChange: (mode: string) => void;
  }) => (
    <div data-testid="preview-renderer">
      <span data-testid="preview-html">{html}</span>
      <span data-testid="preview-css">{css}</span>
      <span data-testid="viewport-mode">{viewportMode}</span>
      <button data-testid="change-viewport" onClick={() => onViewportChange('mobile')}>
        Mobile
      </button>
    </div>
  ),
}));

vi.mock('@/components/DownloadDialog', () => ({
  DownloadDialog: ({
    isOpen,
    onClose,
    onDownload,
    websiteTitle,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onDownload: (format: string) => void;
    websiteTitle: string;
  }) =>
    isOpen ? (
      <div data-testid="download-dialog">
        <span data-testid="download-title">{websiteTitle}</span>
        <button data-testid="download-single" onClick={() => onDownload('single')}>
          Single File
        </button>
        <button data-testid="download-zip" onClick={() => onDownload('zip')}>
          ZIP
        </button>
        <button data-testid="close-download" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

vi.mock('@/components/beautify', () => ({
  BeautifyButton: ({
    onClick,
    isLoading,
    disabled,
  }: {
    onClick: () => void;
    isLoading: boolean;
    disabled: boolean;
  }) => (
    <button data-testid="beautify-btn" onClick={onClick} disabled={disabled || isLoading}>
      Beautify
    </button>
  ),
  BeautifyOptionsDialog: () => null,
  BeautifyLoadingOverlay: () => null,
  PreviewComparison: () => null,
  SaveOptionsDialog: () => null,
  BeautifyErrorDisplay: () => null,
}));

// ─── Setup ───────────────────────────────────────────────────────────────────

Object.defineProperty(window, 'scrollTo', {
  value: mockScrollTo,
  writable: true,
});

// ─── Imports after mocks ─────────────────────────────────────────────────────

import { ShowcasePagination } from '@/app/showcase/ShowcasePagination';
import { DashboardContent } from '@/app/dashboard/DashboardContent';
import { WebsitePageContent } from '@/app/website/[id]/WebsitePageContent';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Showcase Pagination Client Interaction
// Validates: Requirement 5.1
// ═══════════════════════════════════════════════════════════════════════════════

describe('Showcase Pagination - Feature Parity (Requirement 5.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderShowcasePagination() {
    return render(
      <ShowcasePagination
        initialPage={1}
        initialTotalPages={3}
        initialTotalCount={36}
        pageSize={12}
      />
    );
  }

  it('renders pagination controls', () => {
    renderShowcasePagination();
    expect(screen.getByTestId('pagination')).toBeInTheDocument();
  });

  it('calls fetchPage when user changes page via pagination', async () => {
    renderShowcasePagination();

    const nextBtn = screen.getByTestId('next-page-btn');
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    expect(mockShowcaseFetchPage).toHaveBeenCalledWith(2);
  });

  it('scrolls to top with smooth behavior after page change', async () => {
    renderShowcasePagination();

    const nextBtn = screen.getByTestId('next-page-btn');
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    expect(mockScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('displays client-rendered grid after navigation', async () => {
    renderShowcasePagination();

    const nextBtn = screen.getByTestId('next-page-btn');
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    // After navigation, the client grid should be visible with showcase cards
    expect(screen.getByTestId('showcase-card-sw-1')).toBeInTheDocument();
    expect(screen.getByTestId('showcase-card-sw-2')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Dashboard Actions - Feature Parity
// Validates: Requirement 5.3
// ═══════════════════════════════════════════════════════════════════════════════

describe('Dashboard Actions - Feature Parity (Requirement 5.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders website cards for all user websites', async () => {
    render(<DashboardContent />);

    await waitFor(() => {
      expect(screen.getByText('My First Website')).toBeInTheDocument();
      expect(screen.getByText('Second Website')).toBeInTheDocument();
    });
  });

  it('navigates to preview page when website card is clicked', async () => {
    render(<DashboardContent />);

    await waitFor(() => {
      expect(screen.getByText('My First Website')).toBeInTheDocument();
    });

    const card = screen.getByRole('button', { name: /website: my first website/i });
    fireEvent.click(card);

    expect(mockPush).toHaveBeenCalledWith('/website/web-1');
  });

  it('opens delete confirmation dialog when delete is triggered', async () => {
    render(<DashboardContent />);

    await waitFor(() => {
      expect(screen.getByText('My First Website')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole('button', { name: /delete my first website/i });
    fireEvent.click(deleteBtn);

    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('delete-title')).toHaveTextContent('My First Website');
  });

  it('calls delete when confirm is clicked in the dialog', async () => {
    render(<DashboardContent />);

    await waitFor(() => {
      expect(screen.getByText('My First Website')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole('button', { name: /delete my first website/i });
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByTestId('confirm-delete');
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(mockDeleteFn).toHaveBeenCalledWith('web-1');
  });

  it('navigates to beautify when beautify action is triggered', async () => {
    render(<DashboardContent />);

    await waitFor(() => {
      expect(screen.getByText('My First Website')).toBeInTheDocument();
    });

    const beautifyBtn = screen.getByRole('button', { name: /beautify my first website/i });
    fireEvent.click(beautifyBtn);

    expect(mockPush).toHaveBeenCalledWith('/website/web-1?beautify=true');
  });

  it('supports inline title editing with persistence', async () => {
    render(<DashboardContent />);

    await waitFor(() => {
      expect(screen.getByText('My First Website')).toBeInTheDocument();
    });

    const editBtn = screen.getByRole('button', { name: /edit title for my first website/i });
    fireEvent.click(editBtn);

    const input = screen.getByRole('textbox', { name: /edit website title/i });
    expect(input).toHaveValue('My First Website');

    fireEvent.change(input, { target: { value: 'Updated Title' } });
    const saveBtn = screen.getByRole('button', { name: /save title/i });
    fireEvent.click(saveBtn);

    expect(mockUpdateFn).toHaveBeenCalledWith('web-1', { title: 'Updated Title' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: Website Preview Features - Feature Parity
// Validates: Requirement 5.4
// ═══════════════════════════════════════════════════════════════════════════════

describe('Website Preview Features - Feature Parity (Requirement 5.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetByIdFn.mockResolvedValue({ ...previewMockWebsite });
  });

  async function renderAndWaitForLoad() {
    const result = render(<WebsitePageContent websiteId="preview-1" />);
    await waitFor(() => {
      expect(screen.getByText('Preview Test Website')).toBeInTheDocument();
    });
    return result;
  }

  it('loads and displays the website for editing', async () => {
    const { unmount } = await renderAndWaitForLoad();

    expect(screen.getByTestId('code-editor')).toBeInTheDocument();
    expect(screen.getByTestId('preview-renderer')).toBeInTheDocument();

    unmount();
  });

  it('supports HTML code editing in the code editor', async () => {
    const { unmount } = await renderAndWaitForLoad();

    // Verify preview-renderer exists before editing
    expect(screen.getByTestId('preview-renderer')).toBeInTheDocument();

    const textarea = screen.getByTestId('code-textarea');
    // Use synchronous act - async act would wait for the auto-save timer
    act(() => {
      fireEvent.change(textarea, { target: { value: '<h1>Updated</h1>' } });
    });

    expect(screen.getByTestId('preview-html')).toHaveTextContent('<h1>Updated</h1>');

    unmount();
  });

  it('supports CSS code editing with tab switching', async () => {
    const { unmount } = await renderAndWaitForLoad();

    const cssTab = screen.getByTestId('css-tab');
    fireEvent.click(cssTab);

    const textarea = screen.getByTestId('code-textarea');
    fireEvent.change(textarea, { target: { value: 'h1 { color: blue; }' } });

    expect(screen.getByTestId('preview-css')).toHaveTextContent('h1 { color: blue; }');

    unmount();
  });

  it('opens download dialog and supports download actions', async () => {
    const { unmount } = await renderAndWaitForLoad();

    const downloadBtn = screen.getByRole('button', { name: /download/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(screen.getByTestId('download-dialog')).toBeInTheDocument();
    });

    expect(screen.getByTestId('download-title')).toHaveTextContent('Preview Test Website');

    unmount();
  });

  it('triggers single file download from dialog', async () => {
    const downloadService = await import('@/services/downloadService');

    const { unmount } = await renderAndWaitForLoad();

    const downloadBtn = screen.getByRole('button', { name: /download/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(screen.getByTestId('download-dialog')).toBeInTheDocument();
    });

    const singleBtn = screen.getByTestId('download-single');
    await act(async () => {
      fireEvent.click(singleBtn);
    });

    expect(downloadService.generateSingleFile).toHaveBeenCalled();
    expect(downloadService.downloadBlob).toHaveBeenCalled();

    unmount();
  });

  it('auto-save detects unsaved changes when code is edited', async () => {
    const { unmount } = await renderAndWaitForLoad();

    const textarea = screen.getByTestId('code-textarea');
    fireEvent.change(textarea, { target: { value: '<h1>Auto-save test</h1>' } });

    // The component should show an "Unsaved changes" indicator
    await waitFor(() => {
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });

    unmount();
  });

  it('supports showcase toggle from the preview page', async () => {
    const { unmount } = await renderAndWaitForLoad();

    // Click the Share button (showcase toggle)
    const shareBtn = screen.getByRole('button', { name: /share/i });
    await act(async () => {
      fireEvent.click(shareBtn);
    });

    await waitFor(() => {
      expect(mockToggleShowcaseFn).toHaveBeenCalledWith('preview-1', true);
    });

    unmount();
  });
});
