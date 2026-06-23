/**
 * Generation Page
 * Protected route for creating new websites via text or screenshot input
 *
 * Requirements:
 * - 9.1: Display labeled options for text input and screenshot upload with icons
 * - 9.2: Display text input mode as the default active mode
 * - 9.4: Display a text area for entering the website description when text mode is selected
 * - 9.5: Display file upload area with drag-and-drop support when screenshot mode is selected
 * - 8.1: Display visible loading indicator with animated element during generation
 * - 8.2: Display status messages indicating current generation stage
 * - 8.3: Display visible cancel button during generation
 * - 8.4: Stop generation within 5 seconds when cancel is activated
 * - 8.5: Preserve user input on cancel or error
 *
 * This page:
 * 1. Is wrapped with ProtectedRoute to require authentication
 * 2. Displays InputModeSelector to switch between text and screenshot modes
 * 3. Shows TextInput when text mode is selected
 * 4. Shows ScreenshotUpload when screenshot mode is selected
 * 5. Validates input before allowing submission
 * 6. Shows confirmation dialog when switching modes with existing content
 * 7. Shows LoadingIndicator during website generation
 * 8. Handles cancel functionality to abort generation
 * 9. Preserves input on cancel or error for retry
 *
 * SSE Stream Handling Note (Requirement 10.2):
 * This page uses inline SSE streaming logic rather than the useSSEStream hook because:
 * 1. The page requires result accumulation (final HTML/CSS/title object) which the hook doesn't support
 * 2. Generation stage detection logic (detecting '```css', 'Title:' patterns) runs during streaming
 * 3. Timer management is tightly coupled with generation state and post-processing
 * 4. Complex post-streaming workflow (save, thumbnail, navigate) is deeply integrated
 * 5. Two separate generation paths (text/screenshot) would each need distinct hook configs
 * Using the hook would add excessive complexity without meaningful code reduction.
 */

'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute, useAuth } from '@/components/auth';
import { AppHeader, AppFooter } from '@/components/layout';
import { InputModeSelector } from '@/components/InputModeSelector';
import { TextInput } from '@/components/TextInput';
import { ScreenshotUpload } from '@/components/ScreenshotUpload';
import { ModeSwitchConfirmDialog } from '@/components/common/ModeSwitchConfirmDialog';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { validateTextInput, validateScreenshotInput } from '@/services/validation';
import { InputMode, GenerationStage } from '@/types';
import { getErrorMessage, isAppError } from '@/services/errorHandling';
import { save as saveWebsite } from '@/services/websiteRepository';
import { generateThumbnail, getPlaceholderThumbnail } from '@/services/thumbnailService';
import { CreateWebsiteData } from '@/types/website';
import { createParser } from 'eventsource-parser';

/**
 * Generation page content component
 * Contains the actual page content, separated from the ProtectedRoute wrapper
 */
function GeneratePageContent() {
  // Router for navigation after successful generation
  const router = useRouter();

  // Auth context to get current user and authentication utilities
  const { user, getIdToken } = useAuth();

  // Input mode state (Requirement 9.2: text mode is default)
  const [activeMode, setActiveMode] = useState<InputMode>('text');

  // Text input state
  const [textValue, setTextValue] = useState('');
  const [textError, setTextError] = useState<string | undefined>(undefined);

  // Screenshot input state
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | undefined>(undefined);
  const [isValidatingScreenshot, setIsValidatingScreenshot] = useState(false);

  // Mode switch confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingMode, setPendingMode] = useState<InputMode | null>(null);

  // Generation state (Requirements 8.1, 8.2, 8.3, 8.4, 8.5)
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<GenerationStage>('processing_input');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [generationError, setGenerationError] = useState<string | undefined>(undefined);

  // Refs for cancel and timer functionality
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  /**
   * Check if current input has content (at least one non-whitespace character)
   * Used to determine if confirmation dialog should be shown when switching modes
   * Requirement 9.7: Show confirmation when current input contains at least one non-whitespace character
   */
  const hasContent = useMemo(() => {
    if (activeMode === 'text') {
      return textValue.trim().length > 0;
    }
    return screenshotFile !== null;
  }, [activeMode, textValue, screenshotFile]);

  /**
   * Cleanup timer on unmount
   */
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Start the elapsed time timer
   */
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    setElapsedTime(0);

    timerIntervalRef.current = setInterval(() => {
      setElapsedTime(Date.now() - startTimeRef.current);
    }, 100);
  }, []);

  /**
   * Stop the elapsed time timer
   */
  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  /**
   * Handle cancel generation
   * Requirement 8.4: Stop generation within 5 seconds when cancel is activated
   * Requirement 8.5: Preserve user input on cancel
   */
  const handleCancelGeneration = useCallback(() => {
    // Abort the fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Stop the timer
    stopTimer();

    // Reset generation state (input is preserved - Requirement 8.5)
    setIsGenerating(false);
    setGenerationStage('processing_input');
    setElapsedTime(0);
  }, [stopTimer]);

  /**
   * Dismiss generation error
   */
  const handleDismissError = useCallback(() => {
    setGenerationError(undefined);
  }, []);

  // State for streaming content preview
  const [streamingContent, setStreamingContent] = useState('');

  /**
   * Convert file to base64 string
   */
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  /**
   * Call the generate API with text input using streaming
   */
  const generateFromText = useCallback(
    async (description: string, signal: AbortSignal): Promise<{ html: string; css: string; title: string }> => {
      const token = await getIdToken();

      const response = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'text',
          description,
        }),
        signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Generation failed');
      }

      // Process the SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get stream reader');
      }

      const decoder = new TextDecoder();
      let result: { html: string; css: string; title: string } | null = null;

      // Reset streaming content
      setStreamingContent('');

      // Create SSE parser using eventsource-parser library
      const parser = createParser({
        onEvent: (event) => {
          const eventType = event.event;
          const eventData = event.data;

          if (!eventType || !eventData) return;

          try {
            const data = JSON.parse(eventData);

            switch (eventType) {
              case 'start':
                setGenerationStage('generating_html');
                break;
              case 'text':
                if (data.content) {
                  setStreamingContent((prev) => prev + data.content);
                  if (data.content.includes('```css')) {
                    setGenerationStage('generating_css');
                  } else if (data.content.includes('Title:')) {
                    setGenerationStage('finalizing');
                  }
                }
                break;
              case 'done':
                if (data.result) {
                  result = data.result;
                }
                break;
              case 'error':
                throw new Error(data.error || 'Generation failed');
            }
          } catch (e) {
            if (!(e instanceof SyntaxError)) {
              throw e;
            }
          }
        },
      });

      // Read and parse the stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Consume any remaining buffered data
          parser.reset({ consume: true });
          break;
        }

        parser.feed(decoder.decode(value, { stream: true }));
      }

      if (!result) {
        throw new Error('No result received from stream');
      }

      return result;
    },
    [getIdToken]
  );

  /**
   * Call the generate API with screenshot input using streaming
   */
  const generateFromScreenshot = useCallback(
    async (file: File, signal: AbortSignal): Promise<{ html: string; css: string; title: string }> => {
      const token = await getIdToken();
      const base64Image = await fileToBase64(file);

      const response = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'screenshot',
          image: base64Image,
          mimeType: file.type,
        }),
        signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Generation failed');
      }

      // Process the SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get stream reader');
      }

      const decoder = new TextDecoder();
      let result: { html: string; css: string; title: string } | null = null;

      // Reset streaming content
      setStreamingContent('');

      // Create SSE parser using eventsource-parser library
      const parser = createParser({
        onEvent: (event) => {
          const eventType = event.event;
          const eventData = event.data;

          if (!eventType || !eventData) return;

          try {
            const data = JSON.parse(eventData);

            switch (eventType) {
              case 'start':
                setGenerationStage('generating_html');
                break;
              case 'text':
                if (data.content) {
                  setStreamingContent((prev) => prev + data.content);
                  if (data.content.includes('```css')) {
                    setGenerationStage('generating_css');
                  } else if (data.content.includes('Title:')) {
                    setGenerationStage('finalizing');
                  }
                }
                break;
              case 'done':
                if (data.result) {
                  result = data.result;
                }
                break;
              case 'error':
                throw new Error(data.error || 'Generation failed');
            }
          } catch (e) {
            if (!(e instanceof SyntaxError)) {
              throw e;
            }
          }
        },
      });

      // Read and parse the stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Consume any remaining buffered data
          parser.reset({ consume: true });
          break;
        }

        parser.feed(decoder.decode(value, { stream: true }));
      }

      if (!result) {
        throw new Error('No result received from stream');
      }

      return result;
    },
    [getIdToken, fileToBase64]
  );

  /**
   * Handle the generation process
   * Requirements 8.1, 8.2, 8.3, 8.4, 8.5
   */
  const handleGenerate = useCallback(
    async (type: 'text' | 'screenshot') => {
      // Clear previous error
      setGenerationError(undefined);

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Start generation
      setIsGenerating(true);
      setGenerationStage('processing_input');
      startTimer();

      try {
        // Simulate stage progression while API is processing
        // The API doesn't provide real-time stage updates, so we simulate them
        const stageTimeout1 = setTimeout(() => {
          if (!signal.aborted) {
            setGenerationStage('generating_html');
          }
        }, 2000);

        const stageTimeout2 = setTimeout(() => {
          if (!signal.aborted) {
            setGenerationStage('generating_css');
          }
        }, 5000);

        const stageTimeout3 = setTimeout(() => {
          if (!signal.aborted) {
            setGenerationStage('finalizing');
          }
        }, 8000);

        let result;
        if (type === 'text') {
          result = await generateFromText(textValue, signal);
        } else {
          if (!screenshotFile) {
            throw new Error('No screenshot file selected');
          }
          result = await generateFromScreenshot(screenshotFile, signal);
        }

        // Clear stage timeouts
        clearTimeout(stageTimeout1);
        clearTimeout(stageTimeout2);
        clearTimeout(stageTimeout3);

        // Stop timer
        stopTimer();

        // Task 20.3: Save to repository and navigate to preview
        // Requirement 5.1: Persist website data to Firebase Firestore
        // Requirement 1.4: Return a Generated_Website object with all required fields

        // Verify user is authenticated
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Generate thumbnail for the website
        // Requirement 5.2: Generate and store a thumbnail preview
        // Requirement 5.7: Handle thumbnail generation failures with placeholder
        let thumbnailUrl: string;
        try {
          const thumbnailResult = await generateThumbnail(result.html, result.css);
          thumbnailUrl = thumbnailResult.success ? thumbnailResult.dataUrl : getPlaceholderThumbnail();
        } catch {
          // Use placeholder if thumbnail generation fails
          thumbnailUrl = getPlaceholderThumbnail();
        }

        // Prepare website data for saving
        // Note: API returns { success, html, css, title } directly (not wrapped in data)
        const websiteData: CreateWebsiteData = {
          title: result.title || 'Untitled Website',
          html: result.html,
          css: result.css,
          thumbnailUrl,
          inputType: type,
          originalPrompt: type === 'text' ? textValue : null,
          isPublic: true,
        };

        // Save to Firestore with creator name
        const savedWebsite = await saveWebsite(user.uid, websiteData, user.displayName || 'Anonymous');

        // Reset generation state
        setIsGenerating(false);
        setGenerationStage('processing_input');
        setElapsedTime(0);

        // Navigate to the website preview page
        router.push(`/website/${savedWebsite.id}`);
      } catch (error) {
        // Stop timer
        stopTimer();

        // Handle abort (cancel) - input is preserved (Requirement 8.5)
        if (error instanceof Error && error.name === 'AbortError') {
          setIsGenerating(false);
          setGenerationStage('processing_input');
          setElapsedTime(0);
          // Input is already preserved - no need to do anything
          return;
        }

        // Handle other errors - preserve input (Requirement 8.5, 12.4)
        setIsGenerating(false);
        setGenerationStage('processing_input');
        setElapsedTime(0);

        // Set error message for display
        if (isAppError(error)) {
          setGenerationError(getErrorMessage(error.code));
        } else if (error instanceof Error) {
          setGenerationError(error.message);
        } else {
          setGenerationError('An unexpected error occurred');
        }
      }
    },
    [
      textValue,
      screenshotFile,
      generateFromText,
      generateFromScreenshot,
      startTimer,
      stopTimer,
      user,
      router,
    ]
  );

  /**
   * Handle mode change request
   * Shows confirmation dialog if there's existing content
   * Requirements 9.7, 9.8, 9.9
   */
  const handleModeChangeRequest = useCallback(
    (newMode: InputMode) => {
      // If same mode or no content, switch directly
      if (newMode === activeMode) {
        return;
      }

      if (hasContent) {
        // Show confirmation dialog (Requirement 9.7)
        setPendingMode(newMode);
        setShowConfirmDialog(true);
      } else {
        // No content, switch directly
        setActiveMode(newMode);
        // Clear any errors when switching
        setTextError(undefined);
        setScreenshotError(undefined);
      }
    },
    [activeMode, hasContent]
  );

  /**
   * Handle mode switch confirmation
   * Clears current input and switches to new mode
   * Requirement 9.8: Clear previous input and activate selected mode on confirm
   */
  const handleConfirmModeSwitch = useCallback(() => {
    if (pendingMode) {
      // Clear current input
      setTextValue('');
      setScreenshotFile(null);
      setTextError(undefined);
      setScreenshotError(undefined);
      setIsValidatingScreenshot(false);

      // Switch to new mode
      setActiveMode(pendingMode);
    }

    // Close dialog
    setShowConfirmDialog(false);
    setPendingMode(null);
  }, [pendingMode]);

  /**
   * Handle mode switch cancellation
   * Keeps current input and mode unchanged
   * Requirement 9.9: Retain current input and keep original mode on cancel
   */
  const handleCancelModeSwitch = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingMode(null);
  }, []);

  /**
   * Handle text input change
   */
  const handleTextChange = useCallback((value: string) => {
    setTextValue(value);
    // Clear error when user starts typing
    setTextError(undefined);
  }, []);

  /**
   * Handle text submission
   * Validates input before allowing submission and starts generation
   */
  const handleTextSubmit = useCallback(() => {
    const result = validateTextInput(textValue);

    if (!result.valid) {
      setTextError(result.error);
      return;
    }

    // Clear any previous error
    setTextError(undefined);

    // Start generation
    handleGenerate('text');
  }, [textValue, handleGenerate]);

  /**
   * Handle screenshot file selection
   * Validates the file asynchronously
   */
  const handleFileSelect = useCallback(async (file: File) => {
    setScreenshotFile(file);
    setScreenshotError(undefined);
    setIsValidatingScreenshot(true);

    try {
      // Validate the file
      const result = await validateScreenshotInput(file);
      if (!result.valid) {
        setScreenshotError(result.error);
      }
    } finally {
      setIsValidatingScreenshot(false);
    }
  }, []);

  /**
   * Handle screenshot submission
   * Validates input before allowing submission and starts generation
   */
  const handleScreenshotSubmit = useCallback(async () => {
    if (!screenshotFile) {
      setScreenshotError('Please select an image file');
      return;
    }

    // Re-validate before submission
    const result = await validateScreenshotInput(screenshotFile);

    if (!result.valid) {
      setScreenshotError(result.error);
      return;
    }

    // Clear any previous error
    setScreenshotError(undefined);

    // Start generation
    handleGenerate('screenshot');
  }, [screenshotFile, handleGenerate]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-primary/5">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-8 relative">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Page header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Generate a Website
            </h1>
            <p className="text-muted-foreground">
              Describe your website or upload a screenshot to generate HTML and CSS code
            </p>
          </div>

          {/* Generation error message (Requirement 12.4: preserve input on error) */}
          {generationError && (
            <ErrorMessage
              message={generationError}
              onDismiss={handleDismissError}
              onRetry={() => handleGenerate(activeMode)}
            />
          )}

          {/* Loading indicator during generation (Requirements 8.1, 8.2, 8.3) */}
          {isGenerating ? (
            <div className="flex justify-center py-8">
              <LoadingIndicator
                stage={generationStage}
                elapsedTime={elapsedTime}
                onCancel={handleCancelGeneration}
                streamingContent={streamingContent}
              />
            </div>
          ) : (
            /* Input mode selector and input areas */
            <div className="space-y-6">
              <InputModeSelector
                activeMode={activeMode}
                onModeChange={handleModeChangeRequest}
                hasContent={hasContent}
                disabled={isGenerating}
              />

              {/* Input area based on active mode */}
              <div className="mt-6">
                {activeMode === 'text' ? (
                  <TextInput
                    value={textValue}
                    onChange={handleTextChange}
                    onSubmit={handleTextSubmit}
                    disabled={isGenerating}
                    error={textError}
                  />
                ) : (
                  <ScreenshotUpload
                    file={screenshotFile}
                    onFileSelect={handleFileSelect}
                    onSubmit={handleScreenshotSubmit}
                    disabled={isGenerating || isValidatingScreenshot}
                    error={screenshotError}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mode switch confirmation dialog */}
      <ModeSwitchConfirmDialog
        isOpen={showConfirmDialog}
        targetMode={pendingMode ?? 'text'}
        onConfirm={handleConfirmModeSwitch}
        onCancel={handleCancelModeSwitch}
      />

      {/* Footer */}
      <AppFooter />
    </div>
  );
}

/**
 * Generation page component
 * Wrapped with ProtectedRoute to require authentication
 */
export default function GeneratePage() {
  return (
    <ProtectedRoute>
      <GeneratePageContent />
    </ProtectedRoute>
  );
}
