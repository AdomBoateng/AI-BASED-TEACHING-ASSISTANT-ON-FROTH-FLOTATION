'use client';

import { useCallback } from 'react';
const uuidv4 = () => crypto.randomUUID();
import toast from 'react-hot-toast';
import { useChatStore } from '@/store/chatStore';
import { useUserStore } from '@/store/userStore';
import { apiClient } from '@/services/api';
import { parseVTT, getVideoDurationFromSubtitles } from '@/lib/vtt-parser';
import type {
  Message,
  TutorMode,
  ActiveModeSession,
  PracticeEvaluation,
  ReviewEvaluation,
} from '@/types';
import type { DeliveryBlock } from '@/types/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deliveryToVideoResponse(
  delivery: DeliveryBlock | undefined,
  subtitleUrl?: string | null
) {
  if (!delivery || delivery.response_format !== 'video' || !delivery.video_url) return null;
  const subtitles = subtitleUrl ? parseVTT(subtitleUrl) : [];
  const duration = getVideoDurationFromSubtitles(subtitles);
  return {
    videoUrl: delivery.video_url,
    audioUrl: delivery.audio_url ?? undefined,
    subtitles,
    duration,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChat() {
  const {
    currentSessionId,
    sessions,
    messages,
    isLoadingMessage,
    isGeneratingVideo,
    currentVideoResponse,
    isCreatingSession,
    isStartingModeSession,
    isSwitchingMode,
    activeModeSession,
    error,
    createSession,
    setCurrentSession,
    deleteSession,
    addMessage,
    setMessages,
    clearMessages,
    setIsLoadingMessage,
    setIsGeneratingVideo,
    setVideoResponse,
    setError,
    setIsCreatingSession,
    setActiveModeSession,
    setIsStartingModeSession,
    setIsSwitchingMode,
    updateActiveModeSession,
    updateSession,
  } = useChatStore();

  const isAuthenticated = useUserStore((s) => s.isAuthenticated);

  // ── Create backend session, then store locally ─────────────────────────────
  const startNewSession = useCallback(
    async (firstMessage?: string, mode: TutorMode = 'learn') => {
      if (!isAuthenticated) {
        toast.error('Please log in to continue.');
        return null;
      }

      setIsCreatingSession(true);
      setError(null);

      try {
        const res = await apiClient.createSession();
        if (!res.success || !res.data) {
          throw new Error(res.error?.message ?? 'Failed to create session');
        }
        const session = createSession(firstMessage, mode, res.data.session_id);
        return session;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create session';
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsCreatingSession(false);
      }
    },
    [isAuthenticated, createSession, setIsCreatingSession, setError]
  );

  // ── Learn mode message ─────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string, mode: TutorMode = 'learn') => {
      if (!text.trim()) return;
      if (!isAuthenticated) {
        toast.error('Please log in to continue.');
        return;
      }

      let sessionId = currentSessionId;
      if (!sessionId) {
        const session = await startNewSession(text, mode);
        if (!session) return;
        sessionId = session.id;
      }

      const userMsg: Message = {
        id: uuidv4(),
        sessionId,
        role: 'user',
        content: text.trim(),
        responseFormat: 'text',
        mode: 'learn',
        timestamp: new Date(),
      };
      addMessage(userMsg);

      setIsLoadingMessage(true);
      setIsGeneratingVideo(false);
      setError(null);

      try {
        const res = await apiClient.sendMessage({
          session_id: sessionId,
          mode: 'learn',
          message: text.trim(),
        });

        if (!res.success || !res.data) {
          throw new Error(res.error?.message ?? 'Failed to get response');
        }

        const { response, response_format, video_url, audio_url, subtitle_url } = res.data;

        if (response_format === 'video') setIsGeneratingVideo(true);

        const aiMsg: Message = {
          id: uuidv4(),
          sessionId,
          role: 'assistant',
          content: response,
          responseFormat: response_format,
          videoUrl: video_url ?? null,
          audioUrl: audio_url ?? null,
          mode: 'learn',
          timestamp: new Date(),
        };
        addMessage(aiMsg);

        if (response_format === 'video' && video_url) {
          const subtitles = subtitle_url ? parseVTT(subtitle_url) : [];
          const duration = getVideoDurationFromSubtitles(subtitles);
          setVideoResponse({ videoUrl: video_url, audioUrl: audio_url ?? undefined, subtitles, duration });
        } else {
          setVideoResponse(null);
        }

        updateSession(sessionId, { previewMessage: response.slice(0, 60) });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error';
        setError(message);
        toast.error(message);
      } finally {
        setIsLoadingMessage(false);
        setIsGeneratingVideo(false);
      }
    },
    [
      currentSessionId,
      isAuthenticated,
      startNewSession,
      addMessage,
      setIsLoadingMessage,
      setIsGeneratingVideo,
      setVideoResponse,
      setError,
      updateSession,
    ]
  );

  // ── Start a Practice or Review mode session ────────────────────────────────
  const startModeSession = useCallback(
    async (
      mode: 'practice' | 'review',
      sessionType: string,
      difficulty: 'Basic' | 'Intermediate' | 'Advanced' = 'Basic'
    ) => {
      if (!isAuthenticated) {
        toast.error('Please log in to continue.');
        return null;
      }

      // Ensure we have a chat session first
      let sessionId = currentSessionId;
      if (!sessionId) {
        const session = await startNewSession(undefined, mode);
        if (!session) return null;
        sessionId = session.id;
      }

      setIsStartingModeSession(true);
      setError(null);

      try {
        // 1. Update session mode on backend + clear screen for clean slate
        await apiClient.switchSessionMode(sessionId, mode);
        updateSession(sessionId, { currentMode: mode });
        clearMessages();

        // 2. Start the mode session
        const res = await apiClient.startModeSession({
          session_id: sessionId,
          mode,
          session_type: sessionType,
          difficulty,
        });

        if (!res.success || !res.data) {
          throw new Error(res.error?.message ?? 'Failed to start mode session');
        }

        const {
          mode_session_id,
          prompt,
          response_format,
          video_url,
          audio_url,
        } = res.data;

        const totalSteps = mode === 'practice' ? 3 : 10;

        // Store active mode session
        const activeSess: ActiveModeSession = {
          modeSessionId: mode_session_id,
          mode,
          sessionType,
          difficulty,
          currentStep: 1,
          totalSteps,
          completed: false,
        };
        setActiveModeSession(activeSess);

        // Add the opening prompt as an assistant message
        const promptMsg: Message = {
          id: uuidv4(),
          sessionId,
          role: 'assistant',
          content: prompt,
          responseFormat: response_format,
          videoUrl: video_url ?? null,
          audioUrl: audio_url ?? null,
          mode,
          messageType: 'prompt',
          step: 1,
          totalSteps,
          timestamp: new Date(),
        };
        addMessage(promptMsg);

        // Handle video for practice
        if (response_format === 'video' && video_url) {
          setIsGeneratingVideo(true);
          const subtitles: never[] = [];
          const duration = 0;
          setVideoResponse({ videoUrl: video_url, audioUrl: audio_url ?? undefined, subtitles, duration });
          setIsGeneratingVideo(false);
        } else {
          setVideoResponse(null);
        }

        toast.success(`${mode === 'practice' ? 'Practice' : 'Review'} session started!`);
        return activeSess;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start mode session';
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsStartingModeSession(false);
      }
    },
    [
      currentSessionId,
      isAuthenticated,
      startNewSession,
      updateSession,
      setIsStartingModeSession,
      setError,
      setActiveModeSession,
      addMessage,
      setIsGeneratingVideo,
      setVideoResponse,
    ]
  );

  // ── Send answer in Practice or Review mode ─────────────────────────────────
  const sendModeMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      if (!activeModeSession) {
        toast.error('No active mode session. Please start a practice or review session.');
        return;
      }
      if (!currentSessionId) return;

      const { modeSessionId, mode, currentStep, totalSteps } = activeModeSession;

      const userMsg: Message = {
        id: uuidv4(),
        sessionId: currentSessionId,
        role: 'user',
        content: text.trim(),
        responseFormat: 'text',
        mode,
        timestamp: new Date(),
      };
      addMessage(userMsg);

      setIsLoadingMessage(true);
      setError(null);

      try {
        const res = await apiClient.modeSessionTurn(modeSessionId, { message: text.trim() });

        if (!res.success || !res.data) {
          throw new Error(res.error?.message ?? 'Failed to get response');
        }

        const data = res.data;

        if (data.mode === 'practice') {
          // ── PRACTICE response ────────────────────────────────────────────
          const evalMsg: Message = {
            id: uuidv4(),
            sessionId: currentSessionId,
            role: 'assistant',
            content: data.evaluation.feedback,
            responseFormat: data.delivery?.response_format ?? 'text',
            videoUrl: data.delivery?.video_url ?? null,
            audioUrl: data.delivery?.audio_url ?? null,
            mode: 'practice',
            messageType: 'evaluation',
            evaluation: data.evaluation as PracticeEvaluation,
            step: currentStep,
            totalSteps,
            timestamp: new Date(),
          };
          addMessage(evalMsg);

          if (data.type === 'evaluation' && data.next_prompt) {
            // More steps remain — add the next guided question
            const nextStep = currentStep + 1;
            updateActiveModeSession({ currentStep: nextStep });

            const nextMsg: Message = {
              id: uuidv4(),
              sessionId: currentSessionId,
              role: 'assistant',
              content: data.next_prompt,
              responseFormat: data.next_delivery?.response_format ?? 'text',
              videoUrl: data.next_delivery?.video_url ?? null,
              audioUrl: data.next_delivery?.audio_url ?? null,
              mode: 'practice',
              messageType: 'prompt',
              step: nextStep,
              totalSteps,
              timestamp: new Date(),
            };
            addMessage(nextMsg);

            const videoRes = deliveryToVideoResponse(data.next_delivery);
            setVideoResponse(videoRes);
          } else if (data.type === 'completed') {
            // Scenario done
            updateActiveModeSession({ completed: true });
            setActiveModeSession({ ...activeModeSession, completed: true });

            const completedMsg: Message = {
              id: uuidv4(),
              sessionId: currentSessionId,
              role: 'assistant',
              content: data.summary ?? 'Practice scenario completed!',
              responseFormat: data.key_delivery?.response_format ?? 'text',
              videoUrl: data.key_delivery?.video_url ?? null,
              audioUrl: data.key_delivery?.audio_url ?? null,
              mode: 'practice',
              messageType: 'completed',
              keyLearningPoints: data.key_learning_points ?? [],
              timestamp: new Date(),
            };
            addMessage(completedMsg);
            toast.success('🎉 Practice scenario completed!');
          }
        } else if (data.mode === 'review') {
          // ── REVIEW response (text-only) ───────────────────────────────────
          const evalMsg: Message = {
            id: uuidv4(),
            sessionId: currentSessionId,
            role: 'assistant',
            content: data.evaluation.feedback,
            responseFormat: 'text',
            videoUrl: null,
            audioUrl: null,
            mode: 'review',
            messageType: 'evaluation',
            evaluation: data.evaluation as ReviewEvaluation,
            step: currentStep,
            totalSteps,
            nextDifficulty: data.next_difficulty,
            timestamp: new Date(),
          };
          addMessage(evalMsg);
          setVideoResponse(null);

          if (data.type === 'evaluation' && data.next_prompt) {
            const nextStep = currentStep + 1;
            updateActiveModeSession({
              currentStep: nextStep,
              difficulty: (data.next_difficulty as 'Basic' | 'Intermediate' | 'Advanced') ?? activeModeSession.difficulty,
            });

            const nextMsg: Message = {
              id: uuidv4(),
              sessionId: currentSessionId,
              role: 'assistant',
              content: data.next_prompt,
              responseFormat: 'text',
              videoUrl: null,
              audioUrl: null,
              mode: 'review',
              messageType: 'prompt',
              step: nextStep,
              totalSteps,
              timestamp: new Date(),
            };
            addMessage(nextMsg);
          } else if (data.type === 'completed') {
            updateActiveModeSession({ completed: true });
            setActiveModeSession({ ...activeModeSession, completed: true });
            toast.success('🎓 Review session completed!');
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error';
        setError(message);
        toast.error(message);
      } finally {
        setIsLoadingMessage(false);
      }
    },
    [
      activeModeSession,
      currentSessionId,
      addMessage,
      setIsLoadingMessage,
      setError,
      updateActiveModeSession,
      setActiveModeSession,
      setVideoResponse,
    ]
  );

  // ── Switch mode (learn ↔ practice ↔ review) ────────────────────────────────
  const switchMode = useCallback(
    async (newMode: TutorMode) => {
      if (!currentSessionId) return;

      const currentSession = sessions.find((s) => s.id === currentSessionId);
      if (currentSession?.currentMode === newMode) return;

      setIsSwitchingMode(true);
      try {
        const res = await apiClient.switchSessionMode(currentSessionId, newMode);
        if (!res.success) throw new Error(res.error?.message);

        // Clear messages for a clean slate in the new mode
        clearMessages();
        // Clear active mode session when switching away from practice/review
        setActiveModeSession(null);

        // If switching to review, enforce no-video
        updateSession(currentSessionId, {
          currentMode: newMode,
          prefersVideo: newMode === 'review' ? false : currentSession?.prefersVideo ?? false,
        });

        // Toast notification for the new mode
        const modeToasts: Record<TutorMode, string> = {
          learn:    '📖 Learn mode. Ask me anything',
          practice: '🔬 Practice mode. Ready when you start a session',
          review:   '📋 Review mode. Text only',
        };
        toast.success(modeToasts[newMode]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to switch mode';
        toast.error(message);
      } finally {
        setIsSwitchingMode(false);
      }
    },
    [currentSessionId, sessions, clearMessages, setActiveModeSession, setIsSwitchingMode, updateSession]
  );

  // ── Video preference toggle ────────────────────────────────────────────────
  const toggleVideoPreference = useCallback(
    async (prefersVideo: boolean) => {
      if (!currentSessionId) {
        toast.error('No active session');
        return;
      }

      try {
        const res = await apiClient.setVideoPreference(currentSessionId, prefersVideo);
        if (res.success) {
          updateSession(currentSessionId, { prefersVideo });
          toast.success(prefersVideo ? '🎥 Video mode enabled' : '📝 Text mode enabled');
        } else {
          throw new Error(res.error?.message ?? 'Failed to toggle video mode');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to toggle video mode';
        toast.error(message);
      }
    },
    [currentSessionId, updateSession]
  );

  // ── End a mode session manually ────────────────────────────────────────────
  const endModeSession = useCallback(async () => {
    if (!activeModeSession) return;
    try {
      await apiClient.endModeSession(activeModeSession.modeSessionId);
      setActiveModeSession(null);
      if (currentSessionId) {
        await apiClient.switchSessionMode(currentSessionId, 'learn');
        updateSession(currentSessionId, { currentMode: 'learn' });
      }
    } catch {
      // silent
    }
  }, [activeModeSession, currentSessionId, setActiveModeSession, updateSession]);

  // ── Switch review question type mid-session ───────────────────────────────
  // Ends the current review mode session silently and immediately starts a
  // fresh one with the new type, keeping the same difficulty and chat session.
  const switchReviewType = useCallback(
    async (newSessionType: string) => {
      if (!activeModeSession || activeModeSession.mode !== 'review') return;
      if (newSessionType === activeModeSession.sessionType) return;
      if (!currentSessionId) return;

      setIsStartingModeSession(true);
      setError(null);

      try {
        // 1. End the current mode session on the backend (silent — no toast)
        await apiClient.endModeSession(activeModeSession.modeSessionId);

        // 2. Clear screen for clean slate
        clearMessages();

        // 3. Start fresh with new type, carry over difficulty
        const res = await apiClient.startModeSession({
          session_id: currentSessionId,
          mode: 'review',
          session_type: newSessionType,
          difficulty: activeModeSession.difficulty as 'Basic' | 'Intermediate' | 'Advanced',
        });

        if (!res.success || !res.data) {
          throw new Error(res.error?.message ?? 'Failed to switch question type');
        }

        const { mode_session_id, prompt, response_format, video_url, audio_url } = res.data;

        const newActiveSess: ActiveModeSession = {
          modeSessionId: mode_session_id,
          mode: 'review',
          sessionType: newSessionType,
          difficulty: activeModeSession.difficulty,
          currentStep: 1,
          totalSteps: activeModeSession.totalSteps,
          completed: false,
        };
        setActiveModeSession(newActiveSess);

        // Add the first question as a prompt message
        const promptMsg: Message = {
          id: crypto.randomUUID(),
          sessionId: currentSessionId,
          role: 'assistant',
          content: prompt,
          responseFormat: response_format,
          videoUrl: video_url ?? null,
          audioUrl: audio_url ?? null,
          mode: 'review',
          messageType: 'prompt',
          step: 1,
          totalSteps: activeModeSession.totalSteps,
          timestamp: new Date(),
        };
        addMessage(promptMsg);
        setVideoResponse(null);

        // Find the label for the toast
        const REVIEW_LABELS: Record<string, string> = {
          mcq: 'Multiple Choice',
          fill_blank: 'Fill in the Blank',
          flashcard: 'Flashcard',
          short_answer: 'Short Answer',
        };
        toast.success(`Switched to ${REVIEW_LABELS[newSessionType] ?? newSessionType}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to switch question type';
        setError(message);
        toast.error(message);
      } finally {
        setIsStartingModeSession(false);
      }
    },
    [
      activeModeSession,
      currentSessionId,
      clearMessages,
      setActiveModeSession,
      setIsStartingModeSession,
      setError,
      addMessage,
      setVideoResponse,
    ]
  );

  // ── Switch practice topic mid-session ─────────────────────────────────────
  // Same logic as switchReviewType — ends current practice session silently
  // and starts a fresh one with the new topic, keeping the same difficulty.
  const switchPracticeType = useCallback(
    async (newSessionType: string) => {
      if (!activeModeSession || activeModeSession.mode !== 'practice') return;
      if (newSessionType === activeModeSession.sessionType) return;
      if (!currentSessionId) return;

      setIsStartingModeSession(true);
      setError(null);

      try {
        // 1. End current practice session silently
        await apiClient.endModeSession(activeModeSession.modeSessionId);

        // 2. Clear screen for clean slate
        clearMessages();

        // 3. Start fresh with new topic, carry over difficulty
        const res = await apiClient.startModeSession({
          session_id: currentSessionId,
          mode: 'practice',
          session_type: newSessionType,
          difficulty: activeModeSession.difficulty as 'Basic' | 'Intermediate' | 'Advanced',
        });

        if (!res.success || !res.data) {
          throw new Error(res.error?.message ?? 'Failed to switch practice topic');
        }

        const { mode_session_id, prompt, response_format, video_url, audio_url } = res.data;

        const newActiveSess: ActiveModeSession = {
          modeSessionId: mode_session_id,
          mode: 'practice',
          sessionType: newSessionType,
          difficulty: activeModeSession.difficulty,
          currentStep: 1,
          totalSteps: 3,
          completed: false,
        };
        setActiveModeSession(newActiveSess);

        // Add the opening scenario as a prompt message
        const promptMsg: Message = {
          id: crypto.randomUUID(),
          sessionId: currentSessionId,
          role: 'assistant',
          content: prompt,
          responseFormat: response_format,
          videoUrl: video_url ?? null,
          audioUrl: audio_url ?? null,
          mode: 'practice',
          messageType: 'prompt',
          step: 1,
          totalSteps: 3,
          timestamp: new Date(),
        };
        addMessage(promptMsg);

        if (response_format === 'video' && video_url) {
          setIsGeneratingVideo(true);
          setVideoResponse({ videoUrl: video_url, audioUrl: audio_url ?? undefined, subtitles: [], duration: 0 });
          setIsGeneratingVideo(false);
        } else {
          setVideoResponse(null);
        }

        const PRACTICE_LABELS: Record<string, string> = {
          flotation_basics:  'Flotation Basics',
          reagents:          'Reagents & Chemistry',
          process_variables: 'Process Variables',
          troubleshooting:   'Troubleshooting',
          surface_chemistry: 'Surface Chemistry',
        };
        toast.success(`Switched to ${PRACTICE_LABELS[newSessionType] ?? newSessionType}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to switch practice topic';
        setError(message);
        toast.error(message);
      } finally {
        setIsStartingModeSession(false);
      }
    },
    [
      activeModeSession,
      currentSessionId,
      clearMessages,
      setActiveModeSession,
      setIsStartingModeSession,
      setIsGeneratingVideo,
      setError,
      addMessage,
      setVideoResponse,
    ]
  );

  const currentSession = sessions.find((s) => s.id === currentSessionId) ?? null;

  return {
    sessions,
    currentSession,
    currentSessionId,
    messages,
    isLoadingMessage,
    isGeneratingVideo,
    isCreatingSession,
    isStartingModeSession,
    isSwitchingMode,
    activeModeSession,
    currentVideoResponse,
    error,
    startNewSession,
    sendMessage,
    sendModeMessage,
    startModeSession,
    switchMode,
    endModeSession,
    switchReviewType,
    switchPracticeType,
    toggleVideoPreference,
    setCurrentSession,
    deleteSession,
  };
}