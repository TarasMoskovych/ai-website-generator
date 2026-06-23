/**
 * useAutoSave Hook Tests
 *
 * Tests for the auto-save hook that provides debounced saving with state tracking.
 *
 * Requirements tested:
 * - 5.1: Located at src/hooks/useAutoSave.ts
 * - 5.2: Accept generic type parameter and config options
 * - 5.3: Return hasUnsavedChanges, isSaving, saveError, lastSaved, save function
 * - 5.4: Trigger save after delay when values differ from original
 * - 5.5: Update lastSaved and hasUnsavedChanges on successful save
 * - 5.6: Set saveError on failed save, retain hasUnsavedChanges
 * - 5.7: Reset timeout on value changes
 * - 5.8: Serialize concurrent saves
 * - 5.9: Clean up timeout on unmount
 *
 * Property-Based Tests:
 * - Property 5: useAutoSave Debounced Save Behavior
 * - Property 6: useAutoSave Success State
 * - Property 7: useAutoSave Error State
 * - Property 8: useAutoSave Save Serialization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave, type UseAutoSaveConfig } from './useAutoSave';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  /**
   * Requirement 5.3: Return hasUnsavedChanges, isSaving, saveError, lastSaved, save function
   */
  describe('initial state', () => {
    it('returns correct initial state when values match', () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const config: UseAutoSaveConfig<{ value: string }> = {
        currentValues: { value: 'test' },
        originalValues: { value: 'test' },
        onSave,
        delay: 1000,
      };

      const { result } = renderHook(() => useAutoSave(config));

      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.isSaving).toBe(false);
      expect(result.current.saveError).toBeNull();
      expect(result.current.lastSaved).toBeNull();
      expect(typeof result.current.save).toBe('function');
    });

    it('returns hasUnsavedChanges=true when values differ', () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const config: UseAutoSaveConfig<{ value: string }> = {
        currentValues: { value: 'changed' },
        originalValues: { value: 'original' },
        onSave,
        delay: 1000,
      };

      const { result } = renderHook(() => useAutoSave(config));

      expect(result.current.hasUnsavedChanges).toBe(true);
    });
  });

  /**
   * Requirement 5.4: Trigger save after delay when values differ from original
   */
  describe('debounced auto-save', () => {
    it('triggers save after delay when values change', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const initialConfig: UseAutoSaveConfig<{ value: string }> = {
        currentValues: { value: 'original' },
        originalValues: { value: 'original' },
        onSave,
        delay: 1000,
      };

      const { result, rerender } = renderHook(
        ({ config }) => useAutoSave(config),
        { initialProps: { config: initialConfig } }
      );

      // Change values
      const updatedConfig: UseAutoSaveConfig<{ value: string }> = {
        ...initialConfig,
        currentValues: { value: 'changed' },
      };
      rerender({ config: updatedConfig });

      // Save should not be called immediately
      expect(onSave).not.toHaveBeenCalled();

      // Advance time past the delay
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      // Save should be called
      expect(onSave).toHaveBeenCalledWith({ value: 'changed' });
    });

    it('does not trigger save when values return to original before delay', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const initialConfig: UseAutoSaveConfig<{ value: string }> = {
        currentValues: { value: 'original' },
        originalValues: { value: 'original' },
        onSave,
        delay: 1000,
      };

      const { rerender } = renderHook(
        ({ config }) => useAutoSave(config),
        { initialProps: { config: initialConfig } }
      );

      // Change values
      const changedConfig: UseAutoSaveConfig<{ value: string }> = {
        ...initialConfig,
        currentValues: { value: 'changed' },
      };
      rerender({ config: changedConfig });

      // Advance time partially
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Return to original values
      rerender({ config: initialConfig });

      // Advance past the original delay
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      // Save should NOT be called
      expect(onSave).not.toHaveBeenCalled();
    });

    it('clamps delay to minimum of 100ms', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const config: UseAutoSaveConfig<{ value: string }> = {
        currentValues: { value: 'changed' },
        originalValues: { value: 'original' },
        onSave,
        delay: 50, // Below minimum
      };

      renderHook(() => useAutoSave(config));

      // Should not save at 50ms
      await act(async () => {
        vi.advanceTimersByTime(50);
      });
      expect(onSave).not.toHaveBeenCalled();

      // Should save at 100ms (clamped minimum)
      await act(async () => {
        vi.advanceTimersByTime(50);
      });
      expect(onSave).toHaveBeenCalled();
    });

    it('clamps delay to maximum of 30000ms', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const config: UseAutoSaveConfig<{ value: string }> = {
        currentValues: { value: 'changed' },
        originalValues: { value: 'original' },
        onSave,
        delay: 50000, // Above maximum
      };

      renderHook(() => useAutoSave(config));

      // Should not save before 30000ms
      await act(async () => {
        vi.advanceTimersByTime(29999);
      });
      expect(onSave).not.toHaveBeenCalled();

      // Should save at 30000ms (clamped maximum)
      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(onSave).toHaveBeenCalled();
    });
  });

  /**
   * Requirement 5.5: Update lastSaved and hasUnsavedChanges on successful save
   */
  describe('successful save', () => {
    it('updates lastSaved on successful save', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const config: UseAutoSaveConfig<{ value: string }> = {
        currentValues: { value: 'changed' },
        originalValues: { value: 'original' },
        onSave,
        delay: 1000,
      };

      const { result } = renderHook(() => useAutoSave(config));

      // Trigger save and wait for async completion
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(result.current.lastSaved).toBeInstanceOf(Date);
    });

    it('sets hasUnsavedChanges to false after successful save', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const config: UseAutoSaveConfig<{ value: string }> = {
        currentValues: { value: 'changed' },
        originalValues: { value: 'original' },
        onSave,
        delay: 1000,
      };

      const { result } = renderHook(() => useAutoSave(config));

      expect(result.current.hasUnsavedChanges).toBe(true);

      // Trigger save and wait for async completion
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('clears previous saveError on successful save', async () => {
      // First save fails
      const onSave = vi.fn()
        .mockRejectedValueOnce(new Error('First save failed'))
        .mockResolvedValueOnce(undefined);

      const config: UseAutoSaveConfig<{ value: string }> = {
        currentValues: { value: 'changed' },
        originalValues: { value: 'original' },
        onSave,
        delay: 1000,
      };

      const { result, rerender } = renderHook(
        ({ config }) => useAutoSave(config),
        { initialProps: { config } }
      );

      // Trigger first save (fails)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(result.current.saveError).toBe('First save failed');

      // Change values to trigger another save
      const updatedConfig: UseAutoSaveConfig<{ value: string }> = {
        ...config,
        currentValues: { value: 'changed again' },
      };
      rerender({ config: updatedConfig });

      // Trigger second save (succeeds)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(result.current.saveError).toBeNull();
    });
  });

  /**
   * Requirement 5.6: Set saveError on failed save, retain hasUnsavedChanges
   */
  describe('failed save', () => {
    it('sets saveError on failed save', async () => {
      const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
      const config: UseAutoSaveConfig<{ value: string }> = {
        currentValues: { value: 'changed' },
        originalValues: { value: 'original' },
        onSave,
        delay: 1000,
      };

      const { result } = renderHook(() => useAutoSave(config));

      // Trigger save and wait for async completion
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(result.current.saveError).toBe('Save failed');
    });

    it('retains hasUnsavedChanges as true on failed save', async () => {
      const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
      const config: UseAutoSaveConfig<{ value: string }> = {
        currentValues: { value: 'changed' },
        originalValues: { value: 'original' },
        onSave,
        delay: 1000,
      };

      const { result } = renderHook(() => useAutoSave(config));

      // Trigger save and wait for async completion
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('does not update lastSaved on failed save', async () => {
      const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
      const config: UseAutoSaveConfig<{ value: string }> = {
        currentValues: { value: 'changed' },
        originalValues: { value: 'original' },
        onSave,
        delay: 1000,
      };

      const { result } = renderHook(() => useAutoSave(config));

      // Trigger save and wait for async completion
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(result.current.saveError).not.toBeNull();
      expect(result.current.lastSaved).toBeNull();
    });

    it('handles non-Error rejection reasons', async () => {
      const onSave = vi.fn().mockRejectedValue('String error');
      const config: UseAutoSaveConfig<{ value: string }> = {
        currentValues: { value: 'changed' },
        originalValues: { value: 'original' },
        onSave,
        delay: 1000,
      };

      const { result } = renderHook(() => useAutoSave(config));

      // Trigger save and wait for async completion
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(result.current.saveError).toBe('Failed to save');
    });
  });

  /**
   * Requirement 5.7: Reset timeout on value changes
   */
  describe('timeout reset', () => {
    it('resets timeout when values change', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const initialConfig: UseAutoSaveConfig<{ value: string }> = {
        currentValues: { value: 'original' },
        originalValues: { value: 'original' },
        onSave,
        delay: 1000,
      };

      const { rerender } = renderHook(
        ({ config }) => useAutoSave(config),
        { initialProps: { config: initialConfig } }
      );

      // First change
      const firstChange: UseAutoSaveConfig<{ value: string }> = {
        ...initialConfig,
        currentValues: { value: 'first' },
      };
      rerender({ config: firstChange });

      // Advance 800ms
      await act(async () => {
        vi.advanceTimersByTime(800);
      });

      // Second change - should reset timer
      const secondChange: UseAutoSaveConfig<{ value: string }> = {
        ...initialConfig,
        currentValues: { value: 'second' },
      };
      rerender({ config: secondChange });

      // Advance another 800ms (1600ms total, but only 800ms since last change)
      await act(async () => {
        vi.advanceTimersByTime(800);
      });

      // Save should NOT have been called yet
      expect(onSave).not.toHaveBeenCalled();

      // Advance remaining 200ms to complete new delay
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // Now save should be called with latest value
      expect(onSave).toHaveBeenCalledWith({ value: 'second' });
      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * Requirement 5.9: Clean up timeout on unmount
   */
  describe('cleanup', () => {
    it('clears timeout on unmount', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const config: UseAutoSaveConfig<{ value: string }> = {
        currentValues: { value: 'changed' },
        originalValues: { value: 'original' },
        onSave,
        delay: 1000,
      };

      const { unmount } = renderHook(() => useAutoSave(config));

      // Advance partially
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Unmount
      unmount();

      // Advance past the delay
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      // Save should NOT be called
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  /**
   * Manual save function
   */
  describe('manual save', () => {
    it('triggers immediate save when called', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const config: UseAutoSaveConfig<{ value: string }> = {
        currentValues: { value: 'changed' },
        originalValues: { value: 'original' },
        onSave,
        delay: 1000,
      };

      const { result } = renderHook(() => useAutoSave(config));

      // Call manual save
      await act(async () => {
        await result.current.save();
      });

      expect(onSave).toHaveBeenCalledWith({ value: 'changed' });
    });

    it('does not save when values match original', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const config: UseAutoSaveConfig<{ value: string }> = {
        currentValues: { value: 'original' },
        originalValues: { value: 'original' },
        onSave,
        delay: 1000,
      };

      const { result } = renderHook(() => useAutoSave(config));

      // Call manual save
      await act(async () => {
        await result.current.save();
      });

      expect(onSave).not.toHaveBeenCalled();
    });

    it('cancels pending auto-save when manual save is called', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const config: UseAutoSaveConfig<{ value: string }> = {
        currentValues: { value: 'changed' },
        originalValues: { value: 'original' },
        onSave,
        delay: 1000,
      };

      const { result } = renderHook(() => useAutoSave(config));

      // Advance partially
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Call manual save
      await act(async () => {
        await result.current.save();
      });

      // Advance past original timeout
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      // Should only have been called once (from manual save)
      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * Deep equality comparison
   */
  describe('deep equality', () => {
    it('detects changes in nested objects', () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const config: UseAutoSaveConfig<{ nested: { value: string } }> = {
        currentValues: { nested: { value: 'changed' } },
        originalValues: { nested: { value: 'original' } },
        onSave,
        delay: 1000,
      };

      const { result } = renderHook(() => useAutoSave(config));

      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('detects no changes when nested objects are equal', () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const config: UseAutoSaveConfig<{ nested: { value: string } }> = {
        currentValues: { nested: { value: 'same' } },
        originalValues: { nested: { value: 'same' } },
        onSave,
        delay: 1000,
      };

      const { result } = renderHook(() => useAutoSave(config));

      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('detects changes in arrays', () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const config: UseAutoSaveConfig<{ items: string[] }> = {
        currentValues: { items: ['a', 'b', 'c'] },
        originalValues: { items: ['a', 'b'] },
        onSave,
        delay: 1000,
      };

      const { result } = renderHook(() => useAutoSave(config));

      expect(result.current.hasUnsavedChanges).toBe(true);
    });
  });

  /**
   * Requirement 5.8: Serialize concurrent saves
   */
  describe('save serialization', () => {
    it('serializes concurrent saves', async () => {
      vi.useRealTimers(); // Use real timers for this test

      const saveOrder: number[] = [];
      let callNumber = 0;

      const onSave = vi.fn().mockImplementation(async () => {
        const thisCall = ++callNumber;
        // First save takes longer
        await new Promise((resolve) => setTimeout(resolve, thisCall === 1 ? 50 : 10));
        saveOrder.push(thisCall);
      });

      const initialConfig: UseAutoSaveConfig<{ value: number }> = {
        currentValues: { value: 1 },
        originalValues: { value: 0 },
        onSave,
        delay: 100,
      };

      const { result, rerender } = renderHook(
        ({ config }) => useAutoSave(config),
        { initialProps: { config: initialConfig } }
      );

      // Trigger first save using manual save
      await act(async () => {
        await result.current.save();
      });

      // While first save is in progress, trigger another
      const updatedConfig: UseAutoSaveConfig<{ value: number }> = {
        ...initialConfig,
        currentValues: { value: 2 },
        originalValues: { value: 1 }, // Update original so there's a change
      };
      rerender({ config: updatedConfig });

      // Trigger second save
      await act(async () => {
        await result.current.save();
      });

      // Wait a bit for both saves to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Both saves should complete in order
      expect(saveOrder).toEqual([1, 2]);

      vi.useFakeTimers(); // Restore fake timers
    });
  });

  /**
   * Property-Based Tests
   */
  describe('Property-Based Tests', () => {
    /**
     * Feature: page-refactoring, Property 5: useAutoSave Debounced Save Behavior
     *
     * *For any* sequence of value changes where the final values differ from original values:
     * 1. The save callback SHALL be invoked exactly once after the specified delay from the last change
     * 2. The save callback SHALL receive the most recent values at invocation time
     * 3. If values return to match original values before the delay expires, no save SHALL occur
     *
     * **Validates: Requirements 5.4, 5.7**
     */
    it('save is invoked with latest values after delay (Property 5)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a sequence of string changes
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
          fc.integer({ min: 100, max: 1000 }),
          async (valueSequence, delay) => {
            const onSave = vi.fn().mockResolvedValue(undefined);
            const originalValue = 'original';

            // Filter out values that match original
            const changedValues = valueSequence.filter((v) => v !== originalValue);
            if (changedValues.length === 0) return; // Skip if all values match original

            const finalValue = changedValues[changedValues.length - 1];

            const { rerender, unmount } = renderHook(
              ({ config }) => useAutoSave(config),
              {
                initialProps: {
                  config: {
                    currentValues: { value: originalValue },
                    originalValues: { value: originalValue },
                    onSave,
                    delay,
                  } as UseAutoSaveConfig<{ value: string }>,
                },
              }
            );

            // Apply all changes rapidly
            for (const value of changedValues) {
              rerender({
                config: {
                  currentValues: { value },
                  originalValues: { value: originalValue },
                  onSave,
                  delay,
                },
              });
            }

            // Advance time past the delay
            await act(async () => {
              await vi.advanceTimersByTimeAsync(delay + 100);
            });

            // Cleanup
            unmount();
            vi.runOnlyPendingTimers();

            // Save should be called with the final value
            expect(onSave).toHaveBeenLastCalledWith({ value: finalValue });
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * Feature: page-refactoring, Property 6: useAutoSave Success State
     *
     * *For any* successful save operation (Promise resolves), the useAutoSave hook SHALL:
     * 1. Update lastSaved to a Date representing the completion time
     * 2. Set hasUnsavedChanges to false
     * 3. Clear any previous saveError
     *
     * **Validates: Requirements 5.5**
     */
    it('successful save updates state correctly (Property 6)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 100, max: 500 }),
          async (value, delay) => {
            const onSave = vi.fn().mockResolvedValue(undefined);
            const config: UseAutoSaveConfig<{ value: string }> = {
              currentValues: { value },
              originalValues: { value: 'original' },
              onSave,
              delay,
            };

            const { result, unmount } = renderHook(() => useAutoSave(config));

            // Trigger save
            await act(async () => {
              await vi.advanceTimersByTimeAsync(delay);
            });

            // Property 1: lastSaved should be a Date
            expect(result.current.lastSaved).toBeInstanceOf(Date);
            // Property 2: hasUnsavedChanges should be false
            expect(result.current.hasUnsavedChanges).toBe(false);
            // Property 3: saveError should be null
            expect(result.current.saveError).toBeNull();

            unmount();
            vi.runOnlyPendingTimers();
          }
        ),
        { numRuns: 10 }
      );
    });

    /**
     * Feature: page-refactoring, Property 7: useAutoSave Error State
     *
     * *For any* failed save operation (Promise rejects), the useAutoSave hook SHALL:
     * 1. Set saveError to the error message extracted from the rejection
     * 2. Retain hasUnsavedChanges as true
     * 3. Not update lastSaved
     *
     * **Validates: Requirements 5.6**
     */
    it('failed save sets error state correctly (Property 7)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 100, max: 500 }),
          async (value, errorMessage, delay) => {
            const onSave = vi.fn().mockRejectedValue(new Error(errorMessage));
            const config: UseAutoSaveConfig<{ value: string }> = {
              currentValues: { value },
              originalValues: { value: 'original' },
              onSave,
              delay,
            };

            const { result, unmount } = renderHook(() => useAutoSave(config));

            // Trigger save
            await act(async () => {
              await vi.advanceTimersByTimeAsync(delay);
            });

            // Property 1: saveError should contain the error message
            expect(result.current.saveError).toBe(errorMessage);
            // Property 2: hasUnsavedChanges should remain true
            expect(result.current.hasUnsavedChanges).toBe(true);
            // Property 3: lastSaved should remain null
            expect(result.current.lastSaved).toBeNull();

            unmount();
            vi.runOnlyPendingTimers();
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
