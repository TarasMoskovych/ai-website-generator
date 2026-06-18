/**
 * ThemeProvider Context Component
 * Provides theme management for light/dark/system theme modes
 *
 * Requirements:
 * - 19.1: Detect system color scheme preference and apply on initial load
 * - 19.2: Provide theme toggle functionality
 * - 19.3: Persist theme preference in localStorage
 *
 * This component:
 * 1. Creates a ThemeContext with theme state and resolved theme
 * 2. Detects system color scheme preference using matchMedia
 * 3. Persists theme preference in localStorage
 * 4. Applies appropriate class ('light' or 'dark') to document root
 * 5. Listens for system preference changes
 */

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

/** Theme options */
export type Theme = 'light' | 'dark' | 'system';

/** The actual resolved theme (what's currently displayed) */
export type ResolvedTheme = 'light' | 'dark';

/**
 * Theme context value interface
 * Provides theme state and theme actions
 */
export interface ThemeContextValue {
  /** The current theme setting ('light', 'dark', or 'system') */
  theme: Theme;
  /** The actual theme being displayed (resolved from system if set to 'system') */
  resolvedTheme: ResolvedTheme;
  /** Set the theme preference */
  setTheme: (theme: Theme) => void;
}

/**
 * ThemeProvider props
 */
export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Default theme to use if none is stored (defaults to 'system') */
  defaultTheme?: Theme;
  /** localStorage key for persisting theme preference (defaults to 'theme') */
  storageKey?: string;
}

/**
 * Theme context
 * Provides theme state and actions to child components
 */
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/** Default localStorage key for theme preference */
const DEFAULT_STORAGE_KEY = 'theme';

/** Default theme when none is stored */
const DEFAULT_THEME: Theme = 'system';

/**
 * Get the system's color scheme preference
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get the stored theme from localStorage
 */
function getStoredTheme(storageKey: string): Theme | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return null;
  } catch {
    // localStorage might not be available (e.g., private browsing)
    return null;
  }
}

/**
 * Resolve the actual theme from the theme setting
 */
function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

/**
 * Apply the theme class to the document root
 */
function applyThemeToDocument(resolvedTheme: ResolvedTheme): void {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  // Remove both classes first
  root.classList.remove('light', 'dark');
  // Add the resolved theme class
  root.classList.add(resolvedTheme);
}

/**
 * ThemeProvider component
 * Wraps the application and provides theme context
 *
 * Features:
 * - Detects system color scheme preference
 * - Persists theme preference in localStorage
 * - Applies theme class to document root
 * - Listens for system preference changes when set to 'system'
 */
export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME,
  storageKey = DEFAULT_STORAGE_KEY,
}: ThemeProviderProps) {
  // Initialize theme from localStorage or default
  const [theme, setThemeState] = useState<Theme>(() => {
    // During SSR, use default theme
    if (typeof window === 'undefined') {
      return defaultTheme;
    }
    return getStoredTheme(storageKey) ?? defaultTheme;
  });

  // Track the resolved theme (actual theme being displayed)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    return resolveTheme(theme);
  });

  /**
   * Update the theme preference
   * Persists to localStorage and applies to document
   */
  const setTheme = useCallback(
    (newTheme: Theme): void => {
      setThemeState(newTheme);

      // Persist to localStorage
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch {
        // localStorage might not be available
      }

      // Resolve and apply the theme
      const resolved = resolveTheme(newTheme);
      setResolvedTheme(resolved);
      applyThemeToDocument(resolved);
    },
    [storageKey]
  );

  /**
   * Initialize theme on mount
   * This handles the case where the inline script in layout.tsx
   * has already applied a theme class
   */
  useEffect(() => {
    const stored = getStoredTheme(storageKey);
    const initialTheme = stored ?? defaultTheme;
    const resolved = resolveTheme(initialTheme);

    setThemeState(initialTheme);
    setResolvedTheme(resolved);
    applyThemeToDocument(resolved);
  }, [defaultTheme, storageKey]);

  /**
   * Listen for system preference changes
   * Only active when theme is set to 'system'
   */
  useEffect(() => {
    if (theme !== 'system') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (event: MediaQueryListEvent): void => {
      const newResolved: ResolvedTheme = event.matches ? 'dark' : 'light';
      setResolvedTheme(newResolved);
      applyThemeToDocument(newResolved);
    };

    // Add event listener
    mediaQuery.addEventListener('change', handleChange);

    // Cleanup on unmount or when theme changes
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme]);

  /**
   * Memoized context value to prevent unnecessary re-renders
   */
  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
  );
}

/**
 * useTheme hook
 * Provides access to theme context
 *
 * @throws Error if used outside of ThemeProvider
 * @returns ThemeContextValue with theme state and setTheme function
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeProvider;
