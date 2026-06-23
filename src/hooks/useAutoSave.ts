/**
 * useAutoSave Custom Hook
 * Provides debounced auto-save functionality with state tracking
 *
 * Requirements:
 * - 5.1: Located at src/hooks/useAutoSave.ts
 * - 5.2: Accept generic type parameter and config options
 * - 5.3: Return hasUnsavedChanges, isSaving, saveError, lastSaved, save function
 * - 5.4: Trigger save after delay when values differ from original
 * - 5.5: Update lastSaved and hasUnsavedChanges on successful save
 * - 5.6: Set saveError on failed save, retain hasUnsavedChanges
 * - 5.7: Reset timeout on value changes
 * - 5.8: Serialize concurrent saves
 * - 5.9: Clean up timeout on unmount
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Configuration for useAutoSave hook
 * Requirement 5.2: Accept generic type parameter and config options
 */
export interface UseAutoSaveConfig<T> {
  /** Current values to track */
  currentValues: T;
  /** Original values to compare against */
  originalValues: T;
  /** Async save callback */
  onSave: (values: T) => Promise<void>;
  /** Debounce delay in milliseconds (100-30000) */
  delay: number;
}

/**
 * Return type for useAutoSave hook
 * Requirement 5.3: Return state and manual save function
 */
export interface UseAutoSaveReturn {
  /** Whether current values differ from original */
  hasUnsavedChanges: boolean;
  /** Whether save is in progress */
  isSaving: boolean;
  /** Error message from last failed save, or null */
  saveError: string | null;
  /** Timestamp of last successful save, or null */
  lastSaved: Date | null;
  /** Manual save function */
  save: () => Promise<void>;
}

/**
 * Deep equality comparison using JSON.stringify
 * Used to determine if values have changed
 */
function deepEqual<T>(a: T, b: T): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    // If serialization fails, assume not equal
    return false;
  }
}

/**
 * Clamps a value between min and max
 */
function clampDelay(delay: number): number {
  return Math.min(30000, Math.max(100, delay));
}

/**
 * Hook providing debounced auto-save functionality with state tracking
 *
 * @param config - Configuration with current/original values, save callback, and delay
 * @returns Object with save state and manual save function
 *
 * @example
 * ```tsx
 * function Editor() {
 *   const [html, setHtml] = useState(website.html);
 *   const [css, setCss] = useState(website.css);
 *
 *   const { hasUnsavedChanges, isSaving, saveError, lastSaved, save } = useAutoSave({
 *     currentValues: { html, css },
 *     originalValues: { html: website.html, css: website.css },
 *     onSave: async (values) => {
 *       await websiteRepository.update(website.id, values);
 *     },
 *     delay: 2000,
 *   });
 *
 *   return (
 *     <div>
 *       {hasUnsavedChanges && <span>Unsaved changes</span>}
 *       {isSaving && <span>Saving...</span>}
 *       {saveError && <span>Error: {saveError}</span>}
 *       {lastSaved && <span>Last saved: {lastSaved.toLocaleTimeString()}</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAutoSave<T>(config: UseAutoSaveConfig<T>): UseAutoSaveReturn {
  const { currentValues, originalValues, onSave, delay } = config;

  // State
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  // Track original values in state to avoid reading refs during render
  const [trackedOriginalValues, setTrackedOriginalValues] = useState<T>(originalValues);

  // Refs for managing save operations
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef<T | null>(null);
  const onSaveRef = useRef(onSave);
  const originalValuesRef = useRef(originalValues);

  // Clamp delay to valid range
  const clampedDelay = clampDelay(delay);

  // Sync refs in effect
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Sync original values only when they actually change (using deep comparison)
  const originalValuesJson = JSON.stringify(originalValues);
  useEffect(() => {
    originalValuesRef.current = originalValues;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing with prop changes
    setTrackedOriginalValues(originalValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Using JSON string for deep comparison
  }, [originalValuesJson]);

  // Compute hasUnsavedChanges using deep equality comparison (using state instead of ref)
  const hasUnsavedChanges = !deepEqual(currentValues, trackedOriginalValues);

  /**
   * Executes the save operation
   * Handles serialization of concurrent saves
   * Requirement 5.8: Wait for current save before starting new one
   */
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- Complex async logic with refs requires manual memoization
  const executeSave = useCallback(async (values: T): Promise<void> => {
    // If already saving, queue this save for later
    // Requirement 5.8: Serialize concurrent saves
    if (isSavingRef.current) {
      pendingSaveRef.current = values;
      return;
    }

    // Mark as saving
    isSavingRef.current = true;
    setIsSaving(true);
    setSaveError(null);

    try {
      await onSaveRef.current(values);

      // Requirement 5.5: Update lastSaved on success
      setLastSaved(new Date());

      // Update original values ref and state after successful save
      originalValuesRef.current = values;
      setTrackedOriginalValues(values);
    } catch (err) {
      // Requirement 5.6: Set saveError on failure
      const message = err instanceof Error ? err.message : 'Failed to save';
      setSaveError(message);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);

      // If there's a pending save, execute it
      // Requirement 5.8: Handle queued saves
      if (pendingSaveRef.current !== null) {
        const pendingValues = pendingSaveRef.current;
        pendingSaveRef.current = null;

        // Only save if pending values differ from what was just saved
        if (!deepEqual(pendingValues, originalValuesRef.current)) {
          await executeSave(pendingValues);
        }
      }
    }
  }, []);

  /**
   * Manual save function
   * Requirement 5.3: Expose manual save function
   */
  const save = useCallback(async (): Promise<void> => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Only save if there are changes
    if (!deepEqual(config.currentValues, originalValuesRef.current)) {
      await executeSave(config.currentValues);
    }
  }, [config.currentValues, executeSave]);

  /**
   * Debounced auto-save effect
   * Requirement 5.4: Trigger save after delay when values differ
   * Requirement 5.7: Reset timeout on value changes
   */
  useEffect(() => {
    // Requirement 5.7: Clear any existing timeout (reset on value changes)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Only set up auto-save if there are unsaved changes
    if (!deepEqual(currentValues, originalValuesRef.current)) {
      // Requirement 5.4: Set up debounced auto-save
      timeoutRef.current = setTimeout(() => {
        executeSave(currentValues);
      }, clampedDelay);
    }

    // Requirement 5.9: Cleanup timeout on unmount or dependencies change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [currentValues, clampedDelay, executeSave]);

  return {
    hasUnsavedChanges,
    isSaving,
    saveError,
    lastSaved,
    save,
  };
}

export default useAutoSave;
