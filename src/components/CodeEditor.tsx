/**
 * CodeEditor Component
 * Provides a code editor panel with tabs for HTML and CSS editing
 *
 * Requirements:
 * - 10.1: Provide a code editor panel with separate tabs for HTML and CSS code
 * - 10.2: Provide syntax highlighting for HTML and CSS
 * - 10.3: Update preview within 1 second after user stops typing (debounced)
 * - 10.4: Display visual indicator of syntax error location
 * - 19.6: Code editor component SHALL support dark theme with appropriate syntax highlighting colors
 *
 * Uses Monaco Editor for:
 * - Syntax highlighting for HTML and CSS
 * - Dark/light theme support
 * - Built-in error detection with visual markers
 */

'use client';

import React, { useCallback, useRef, useEffect, useState } from 'react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useTheme } from '@/components/layout/ThemeProvider';
import { TIMEOUTS } from '@/lib/constants';

/**
 * CodeEditor component props
 */
export interface CodeEditorProps {
  /** The HTML code to display/edit */
  html: string;
  /** The CSS code to display/edit */
  css: string;
  /** Callback when HTML code changes (debounced) */
  onHtmlChange: (html: string) => void;
  /** Callback when CSS code changes (debounced) */
  onCssChange: (css: string) => void;
  /** Currently active tab */
  activeTab: 'html' | 'css';
  /** Callback when tab changes */
  onTabChange: (tab: 'html' | 'css') => void;
}

/**
 * Monaco marker interface for syntax errors
 */
interface MonacoMarker {
  startLineNumber: number;
  startColumn: number;
  message: string;
  severity: number;
}

/**
 * Syntax error information from Monaco markers
 */
interface SyntaxError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Warning icon for syntax errors
 */
function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/**
 * Tab button component for switching between HTML and CSS
 */
interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  errorCount?: number;
}

function TabButton({ label, isActive, onClick, errorCount = 0 }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-4 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
      }`}
      aria-selected={isActive}
      role="tab"
    >
      <span className="flex items-center gap-1.5">
        {label}
        {errorCount > 0 && (
          <span
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-medium text-white"
            aria-label={`${errorCount} syntax ${errorCount === 1 ? 'error' : 'errors'}`}
          >
            {errorCount}
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * CodeEditor component
 * Provides HTML and CSS editing with Monaco Editor
 */
export function CodeEditor({
  html,
  css,
  onHtmlChange,
  onCssChange,
  activeTab,
  onTabChange,
}: CodeEditorProps) {
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track syntax errors for each tab
  const [htmlErrors, setHtmlErrors] = useState<SyntaxError[]>([]);
  const [cssErrors, setCssErrors] = useState<SyntaxError[]>([]);

  // Determine Monaco theme based on app theme
  const monacoTheme = resolvedTheme === 'dark' ? 'vs-dark' : 'vs';

  // Get the current code and language based on active tab
  const currentCode = activeTab === 'html' ? html : css;
  const currentLanguage = activeTab;
  const currentOnChange = activeTab === 'html' ? onHtmlChange : onCssChange;
  const currentErrors = activeTab === 'html' ? htmlErrors : cssErrors;

  /**
   * Update syntax errors from Monaco markers
   */
  const updateMarkersForTab = useCallback((tab: 'html' | 'css') => {
    if (!monacoRef.current || !editorRef.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const markers = monacoRef.current.editor.getModelMarkers({ resource: model.uri });

    const errors: SyntaxError[] = markers
      .filter((marker: editor.IMarker) => marker.severity >= 4) // Error severity (4 = Warning, 8 = Error)
      .map((marker: editor.IMarker) => ({
        line: marker.startLineNumber,
        column: marker.startColumn,
        message: marker.message,
        severity: marker.severity >= 8 ? ('error' as const) : ('warning' as const),
      }));

    if (tab === 'html') {
      setHtmlErrors(errors);
    } else {
      setCssErrors(errors);
    }
  }, []);

  /**
   * Handle editor mount - store reference and set up marker listener
   */
  const handleEditorDidMount: OnMount = useCallback(
    (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Listen for marker changes to update error count
      // Using explicit type to satisfy TypeScript strict mode
      monaco.editor.onDidChangeMarkers((uris: readonly { toString(): string }[]) => {
        const model = editor.getModel();
        if (model && uris.some((uri) => uri.toString() === model.uri.toString())) {
          updateMarkersForTab(activeTab);
        }
      });

      // Initial marker check
      setTimeout(() => updateMarkersForTab(activeTab), 500);
    },
    [activeTab, updateMarkersForTab]
  );

  /**
   * Configure Monaco before mount
   */
  const handleBeforeMount = useCallback((monaco: Monaco) => {
    // Configure editor settings for better HTML/CSS editing
    monaco.languages.html.htmlDefaults.setOptions({
      format: {
        tabSize: 2,
        insertSpaces: true,
      },
    });

    // Enable CSS validation
    monaco.languages.css.cssDefaults.setOptions({
      validate: true,
      lint: {
        compatibleVendorPrefixes: 'warning',
        vendorPrefix: 'warning',
        duplicateProperties: 'warning',
        emptyRules: 'warning',
        importStatement: 'warning',
        unknownVendorSpecificProperties: 'warning',
        propertyIgnoredDueToDisplay: 'warning',
        important: 'warning',
        float: 'warning',
        idSelector: 'warning',
        unknownProperties: 'warning',
      },
    });
  }, []);

  /**
   * Handle code changes with debouncing
   * Debounces to 1 second as per requirement 10.3
   */
  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounced update
      debounceTimerRef.current = setTimeout(() => {
        currentOnChange(value ?? '');
        // Update markers after change
        setTimeout(() => updateMarkersForTab(activeTab), 100);
      }, TIMEOUTS.PREVIEW_UPDATE);
    },
    [currentOnChange, activeTab, updateMarkersForTab]
  );

  /**
   * Clean up debounce timer on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Update markers when tab changes
   */
  useEffect(() => {
    // Small delay to allow editor to switch content
    const timer = setTimeout(() => {
      updateMarkersForTab(activeTab);
    }, 200);
    return () => clearTimeout(timer);
  }, [activeTab, updateMarkersForTab]);

  /**
   * Handle tab switching
   */
  const handleHtmlTabClick = useCallback(() => {
    onTabChange('html');
  }, [onTabChange]);

  const handleCssTabClick = useCallback(() => {
    onTabChange('css');
  }, [onTabChange]);

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Tab bar */}
      <div
        className="flex border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
        role="tablist"
        aria-label="Code editor tabs"
      >
        <TabButton
          label="HTML"
          isActive={activeTab === 'html'}
          onClick={handleHtmlTabClick}
          errorCount={htmlErrors.length}
        />
        <TabButton
          label="CSS"
          isActive={activeTab === 'css'}
          onClick={handleCssTabClick}
          errorCount={cssErrors.length}
        />
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-hidden" role="tabpanel">
        <Editor
          height="100%"
          language={currentLanguage}
          value={currentCode}
          theme={monacoTheme}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          beforeMount={handleBeforeMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            padding: { top: 8, bottom: 8 },
            scrollbar: {
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            // Enable error squiggles and glyph margin for error indicators
            glyphMargin: true,
          }}
          loading={
            <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
              Loading editor...
            </div>
          }
        />
      </div>

      {/* Syntax error indicator panel */}
      {currentErrors.length > 0 && (
        <div
          className="border-t border-gray-200 bg-red-50 px-3 py-2 dark:border-gray-700 dark:bg-red-900/20"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2">
            <WarningIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500 dark:text-red-400" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-red-700 dark:text-red-300">
                {currentErrors.length} syntax {currentErrors.length === 1 ? 'issue' : 'issues'} found
              </p>
              <ul className="mt-1 max-h-20 overflow-y-auto text-xs text-red-600 dark:text-red-400">
                {currentErrors.slice(0, 3).map((error, index) => (
                  <li key={`${error.line}-${error.column}-${index}`} className="truncate">
                    Line {error.line}: {error.message}
                  </li>
                ))}
                {currentErrors.length > 3 && (
                  <li className="text-red-500 dark:text-red-400">
                    ...and {currentErrors.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CodeEditor;
