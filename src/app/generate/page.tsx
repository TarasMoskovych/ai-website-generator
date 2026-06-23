/**
 * Generation Page
 * Protected route for creating new websites via text or screenshot input
 *
 * Requirements:
 * - 8.1, 8.2, 8.3, 8.4, 8.5: Loading indicator, stage messages, cancel, input preservation
 * - 9.1, 9.2, 9.4, 9.5: Mode selector with text/screenshot inputs
 *
 * Refactored to use useSSEStream hook for SSE stream handling (Requirements 8.1-8.8, 12.5)
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
import { useSSEStream, type SSEEvent } from '@/hooks/useSSEStream';

interface GenerationResult {
  html: string;
  css: string;
  title: string;
}

function GeneratePageContent() {
  const router = useRouter();
  const { user, getIdToken } = useAuth();

  // Input mode state (text mode is default per Requirement 9.2)
  const [activeMode, setActiveMode] = useState<InputMode>('text');
  const [textValue, setTextValue] = useState('');
  const [textError, setTextError] = useState<string | undefined>();
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | undefined>();
  const [isValidatingScreenshot, setIsValidatingScreenshot] = useState(false);

  // Mode switch dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingMode, setPendingMode] = useState<InputMode | null>(null);

  // Generation state
  const [generationStage, setGenerationStage] = useState<GenerationStage>('processing_input');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [generationError, setGenerationError] = useState<string | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);

  // Stream config state and trigger
  const [streamConfig, setStreamConfig] = useState<{
    url: string;
    headers: Record<string, string>;
    body: unknown;
  }>({ url: '/api/generate/stream', headers: {}, body: null });
  // Use ref for pendingStart to avoid setState in effect (lint: react-hooks/set-state-in-effect)
  const pendingStartRef = useRef(false);

  // Refs for timer and request management
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const resultRef = useRef<GenerationResult | null>(null);
  const isProcessingRef = useRef(false);

  // SSE event handlers
  const handleEvent = useCallback((event: SSEEvent) => {
    if (event.type === 'start') {
      setGenerationStage('generating_html');
    } else if (event.type === 'error') {
      const data = event.data as { error?: string };
      setGenerationError(data.error || 'Generation failed');
    }
  }, []);

  const handleTextChunk = useCallback((content: string) => {
    if (content.includes('```css')) {
      setGenerationStage('generating_css');
    } else if (content.includes('```html')) {
      setGenerationStage('generating_html');
    } else if (content.includes('Title:')) {
      setGenerationStage('finalizing');
    }
  }, []);

  const handleResult = useCallback((result: unknown) => {
    resultRef.current = result as GenerationResult;
  }, []);

  // useSSEStream hook
  const { isStreaming, error: streamError, streamingContent, start, cancel } = useSSEStream({
    url: streamConfig.url,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...streamConfig.headers },
    body: streamConfig.body,
    onEvent: handleEvent,
    onTextChunk: handleTextChunk,
    onResult: handleResult,
  });

  // Effect to start stream after config is updated
  useEffect(() => {
    if (pendingStartRef.current && streamConfig.body !== null && isGenerating) {
      pendingStartRef.current = false;
      start();
    }
  }, [streamConfig.body, isGenerating, start]);

  const hasContent = useMemo(() => {
    return activeMode === 'text' ? textValue.trim().length > 0 : screenshotFile !== null;
  }, [activeMode, textValue, screenshotFile]);

  // Timer management
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    setElapsedTime(0);
    timerRef.current = setInterval(() => setElapsedTime(Date.now() - startTimeRef.current), 100);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Process result when streaming completes
  useEffect(() => {
    const processResult = async () => {
      if (!isStreaming && resultRef.current && !isProcessingRef.current && isGenerating) {
        isProcessingRef.current = true;
        stopTimer();

        try {
          if (!user) throw new Error('User not authenticated');

          const result = resultRef.current;
          let thumbnailUrl: string;
          try {
            const thumb = await generateThumbnail(result.html, result.css);
            thumbnailUrl = thumb.success ? thumb.dataUrl : getPlaceholderThumbnail();
          } catch {
            thumbnailUrl = getPlaceholderThumbnail();
          }

          const websiteData: CreateWebsiteData = {
            title: result.title || 'Untitled Website',
            html: result.html,
            css: result.css,
            thumbnailUrl,
            inputType: activeMode,
            originalPrompt: activeMode === 'text' ? textValue : null,
            isPublic: true,
          };

          const saved = await saveWebsite(user.uid, websiteData, user.displayName || 'Anonymous');

          // Show completed state with checkmark before redirecting
          setGenerationStage('completed');

          // Brief delay to show the completion animation
          await new Promise(resolve => setTimeout(resolve, 800));

          setElapsedTime(0);
          setIsGenerating(false);
          resultRef.current = null;
          isProcessingRef.current = false;
          router.push(`/website/${saved.id}`);
        } catch (error) {
          isProcessingRef.current = false;
          setGenerationStage('processing_input');
          setElapsedTime(0);
          setIsGenerating(false);
          resultRef.current = null;
          setGenerationError(
            isAppError(error) ? getErrorMessage(error.code) : error instanceof Error ? error.message : 'An unexpected error occurred'
          );
        }
      }
    };
    processResult();
  }, [isStreaming, isGenerating, user, activeMode, textValue, router, stopTimer]);
  // Track if we've handled the current streamError to prevent re-triggering on retry
  const lastHandledErrorRef = useRef<string | null>(null);

  // Handle stream errors
  // Only process if this is a new error we haven't handled yet
  useEffect(() => {
    if (streamError && !isStreaming && isGenerating && streamError !== lastHandledErrorRef.current) {
      lastHandledErrorRef.current = streamError;
      stopTimer();
      setGenerationStage('processing_input');
      setElapsedTime(0);
      setIsGenerating(false);
      setGenerationError(streamError.includes('HTTP error') ? 'Generation failed' : streamError);
    }
    // Reset the handled error ref when streamError is cleared (new generation started)
    if (!streamError) {
      lastHandledErrorRef.current = null;
    }
  }, [streamError, isStreaming, isGenerating, stopTimer]);

  const handleCancelGeneration = useCallback(() => {
    cancel();
    stopTimer();
    setGenerationStage('processing_input');
    setElapsedTime(0);
    setIsGenerating(false);
    pendingStartRef.current = false;
    resultRef.current = null;
    isProcessingRef.current = false;
  }, [cancel, stopTimer]);

  const handleDismissError = useCallback(() => setGenerationError(undefined), []);

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleGenerate = useCallback(
    async (type: 'text' | 'screenshot') => {
      setGenerationError(undefined);
      resultRef.current = null;
      isProcessingRef.current = false;
      setGenerationStage('processing_input');
      setIsGenerating(true);
      startTimer();

      try {
        const token = await getIdToken();
        let body: unknown;

        if (type === 'text') {
          body = { type: 'text', description: textValue };
        } else {
          if (!screenshotFile) throw new Error('No screenshot file selected');
          body = { type: 'screenshot', image: await fileToBase64(screenshotFile), mimeType: screenshotFile.type };
        }

        // Update config and set pending start flag
        setStreamConfig({
          url: '/api/generate/stream',
          headers: { Authorization: `Bearer ${token}` },
          body,
        });
        pendingStartRef.current = true;
      } catch (error) {
        stopTimer();
        setGenerationStage('processing_input');
        setElapsedTime(0);
        setIsGenerating(false);
        setGenerationError(
          isAppError(error) ? getErrorMessage(error.code) : error instanceof Error ? error.message : 'An unexpected error occurred'
        );
      }
    },
    [textValue, screenshotFile, getIdToken, fileToBase64, startTimer, stopTimer]
  );

  const handleModeChangeRequest = useCallback(
    (newMode: InputMode) => {
      if (newMode === activeMode) return;
      if (hasContent) {
        setPendingMode(newMode);
        setShowConfirmDialog(true);
      } else {
        setActiveMode(newMode);
        setTextError(undefined);
        setScreenshotError(undefined);
      }
    },
    [activeMode, hasContent]
  );

  const handleConfirmModeSwitch = useCallback(() => {
    if (pendingMode) {
      setTextValue('');
      setScreenshotFile(null);
      setTextError(undefined);
      setScreenshotError(undefined);
      setIsValidatingScreenshot(false);
      setActiveMode(pendingMode);
    }
    setShowConfirmDialog(false);
    setPendingMode(null);
  }, [pendingMode]);

  const handleCancelModeSwitch = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingMode(null);
  }, []);

  const handleTextChange = useCallback((value: string) => {
    setTextValue(value);
    setTextError(undefined);
  }, []);

  const handleTextSubmit = useCallback(() => {
    const result = validateTextInput(textValue);
    if (!result.valid) {
      setTextError(result.error);
      return;
    }
    setTextError(undefined);
    handleGenerate('text');
  }, [textValue, handleGenerate]);

  const handleFileSelect = useCallback(async (file: File) => {
    setScreenshotFile(file);
    setScreenshotError(undefined);
    setIsValidatingScreenshot(true);
    try {
      const result = await validateScreenshotInput(file);
      if (!result.valid) setScreenshotError(result.error);
    } finally {
      setIsValidatingScreenshot(false);
    }
  }, []);

  const handleScreenshotSubmit = useCallback(async () => {
    if (!screenshotFile) {
      setScreenshotError('Please select an image file');
      return;
    }
    const result = await validateScreenshotInput(screenshotFile);
    if (!result.valid) {
      setScreenshotError(result.error);
      return;
    }
    setScreenshotError(undefined);
    handleGenerate('screenshot');
  }, [screenshotFile, handleGenerate]);

  const showLoading = isGenerating || isStreaming;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-primary/5">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-8 relative">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Generate a Website</h1>
            <p className="text-muted-foreground">
              Describe your website or upload a screenshot to generate HTML and CSS code
            </p>
          </div>

          {generationError && (
            <ErrorMessage message={generationError} onDismiss={handleDismissError} onRetry={() => handleGenerate(activeMode)} />
          )}

          {showLoading ? (
            <div className="flex justify-center py-8">
              <LoadingIndicator stage={generationStage} elapsedTime={elapsedTime} onCancel={handleCancelGeneration} streamingContent={streamingContent} />
            </div>
          ) : (
            <div className="space-y-6">
              <InputModeSelector activeMode={activeMode} onModeChange={handleModeChangeRequest} hasContent={hasContent} disabled={isGenerating} />
              <div className="mt-6">
                {activeMode === 'text' ? (
                  <TextInput value={textValue} onChange={handleTextChange} onSubmit={handleTextSubmit} disabled={isGenerating} error={textError} />
                ) : (
                  <ScreenshotUpload file={screenshotFile} onFileSelect={handleFileSelect} onSubmit={handleScreenshotSubmit} disabled={isGenerating || isValidatingScreenshot} error={screenshotError} />
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <ModeSwitchConfirmDialog isOpen={showConfirmDialog} targetMode={pendingMode ?? 'text'} onConfirm={handleConfirmModeSwitch} onCancel={handleCancelModeSwitch} />
      <AppFooter />
    </div>
  );
}

export default function GeneratePage() {
  return (
    <ProtectedRoute>
      <GeneratePageContent />
    </ProtectedRoute>
  );
}
