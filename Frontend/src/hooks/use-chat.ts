'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useChatStore, newId } from '@/store/chatStore';
import { useUserStore } from '@/store/userStore';
import { apiClient } from '@/services/api';
import { parseVTT, getVideoDurationFromSubtitles } from '@/lib/vtt-parser';
import {
  PRACTICE_SESSION_TYPES,
  REVIEW_SESSION_TYPES,
} from '@/lib/constants';
import type {
  Message,
  TutorMode,
  ActiveModeSession,
  PracticeEvaluation,
  ReviewEvaluation,
} from '@/types';

// ─── Label lookups derived from constants (Fix #10 — no inline duplication) ──
const PRACTICE_LABELS = Object.fromEntries(
  PRACTICE_SESSION_TYPES.map((t) => [t.value, t.label])
);
const REVIEW_LABELS = Object.fromEntries(
  REVIEW_SESSION_TYPES.map((t) => [t.value, t.label])
);

function getModeSessionTitle(
  mode: 'practice' | 'review',
  sessionType: string
): string {
  if (mode === 'practice') {
    return `Practice — ${PRACTICE_LABELS[sessionType] ?? sessionType}`;
  }
  return `Review — ${REVIEW_LABELS[sessionType] ?? sessionType}`;
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
    async (text: string, mode: TutorMode = 'learn', isRetry = false) => {
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

      // Only add a new user message when not retrying (retry reuses existing)
      if (!isRetry) {
        const userMsg: Message = {
          id: newId(),
          sessionId,
          role: 'user',
          content: text.trim(),
          responseFormat: 'text',
          mode: 'learn',
          timestamp: new Date(),
        };
        addMessage(userMsg);
      }

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
          id: newId(),
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
        // ✅ Fix #5: mark the last user message as failed so UI can show retry
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

  // ── Retry last failed learn message ───────────────────────────────────────
  // ✅ Fix #5: find the last user message and re-send it without duplicating it
  const retryLastMessage = useCallback(async () => {
    const userMessages = messages.filter((m) => m.role === 'user');
    if (!userMessages.length) return;
    const last = userMessages[userMessages.length - 1];
    setError(null);
    await sendMessage(last.content, last.mode ?? 'learn', true);
  }, [messages, sendMessage, setError]);

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

      let sessionId = currentSessionId;
      if (!sessionId) {
        const session = await startNewSession(undefined, mode);
        if (!session) return null;
        sessionId = session.id;
      }

      setIsStartingModeSession(true);
      setError(null);

      try {
        await apiClient.switchSessionMode(sessionId, mode);

        // ✅ Fix #6: meaningful session title instead of "New session"
        updateSession(sessionId, {
          currentMode: mode,
          title: getModeSessionTitle(mode, sessionType),
        });
        clearMessages();

        const res = await apiClient.startModeSession({
          session_id: sessionId,
          mode,
          session_type: sessionType,
          difficulty,
        });

        if (!res.success || !res.data) {
          throw new Error(res.error?.message ?? 'Failed to start mode session');
        }

        const { mode_session_id, prompt, response_format, video_url, audio_url } = res.data;

        const totalSteps = mode === 'practice' ? 3 : 10;

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

        const promptMsg: Message = {
          id: newId(),
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

        if (response_format === 'video' && video_url) {
          setIsGeneratingVideo(true);
          setVideoResponse({ videoUrl: video_url, audioUrl: audio_url ?? undefined, subtitles: [], duration: 0 });
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
      clearMessages,
    ]
  );

  // ── Send answer in Practice or Review mode ─────────────────────────────────
  const sendModeMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // ✅ Fix #3: guard — if session is completed, refuse and prompt user
      if (!activeModeSession) {
        toast.error('No active session. Please start a new one.');
        return;
      }
      if (activeModeSession.completed) {
        toast('Session complete! Start a new session to continue.', { icon: '✅' });
        return;
      }
      if (!currentSessionId) return;

      const { modeSessionId, mode, currentStep, totalSteps } = activeModeSession;

      const userMsg: Message = {
        id: newId(),
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
          const evalMsg: Message = {
            id: newId(),
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
            const nextStep = currentStep + 1;
            updateActiveModeSession({ currentStep: nextStep });

            const nextMsg: Message = {
              id: newId(),
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

            if (data.next_delivery?.response_format === 'video' && data.next_delivery.video_url) {
              setVideoResponse({
                videoUrl: data.next_delivery.video_url,
                audioUrl: data.next_delivery.audio_url ?? undefined,
                subtitles: [],
                duration: 0,
              });
            }
          } else if (data.type === 'completed') {
            // ✅ Fix #3: mark completed so subsequent sends are blocked
            updateActiveModeSession({ completed: true });
            setActiveModeSession({ ...activeModeSession, completed: true });

            const completedMsg: Message = {
              id: newId(),
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
          const evalMsg: Message = {
            id: newId(),
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
              id: newId(),
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
            // ✅ Fix #3: mark completed
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

        clearMessages();
        setActiveModeSession(null);

        updateSession(currentSessionId, {
          currentMode: newMode,
          prefersVideo: newMode === 'review' ? false : currentSession?.prefersVideo ?? false,
        });

        const modeToasts: Record<TutorMode, string> = {
          learn:    '📖 Learn mode. Ask me anything',
          practice: '🔬 Practice mode. Get hands-on experience',
          review:   '📋 Review mode. Test your knowledge',
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
      if (!currentSessionId) { toast.error('No active session'); return; }
      try {
        const res = await apiClient.setVideoPreference(currentSessionId, prefersVideo);
        if (res.success) {
          updateSession(currentSessionId, { prefersVideo });
          toast.success(prefersVideo ? '🎥 Video mode enabled' : '📝 Text mode enabled');
        } else {
          throw new Error(res.error?.message ?? 'Failed to toggle video mode');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to toggle video mode');
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
      clearMessages(); // ✅ Fix #8: clear so UI is clean after ending
      if (currentSessionId) {
        await apiClient.switchSessionMode(currentSessionId, 'learn');
        updateSession(currentSessionId, { currentMode: 'learn' });
      }
    } catch {
      // silent
    }
  }, [activeModeSession, currentSessionId, setActiveModeSession, clearMessages, updateSession]);

  // ── Unified session type switcher (Fix #2 — replaces two near-identical fns)
  // Works for both practice and review: ends the current mode session and
  // immediately starts a fresh one with the new type, carrying over difficulty.
  const switchSessionType = useCallback(
    async (newSessionType: string) => {
      if (!activeModeSession) return;
      if (newSessionType === activeModeSession.sessionType) return;
      if (!currentSessionId) return;

      const { mode, difficulty, totalSteps, modeSessionId } = activeModeSession;

      setIsStartingModeSession(true);
      setError(null);

      try {
        // 1. End current session silently
        await apiClient.endModeSession(modeSessionId);

        // 2. Clear screen
        clearMessages();

        // 3. Start fresh, carry over difficulty
        const res = await apiClient.startModeSession({
          session_id: currentSessionId,
          mode,
          session_type: newSessionType,
          difficulty: difficulty as 'Basic' | 'Intermediate' | 'Advanced',
        });

        if (!res.success || !res.data) {
          throw new Error(res.error?.message ?? 'Failed to switch session type');
        }

        const { mode_session_id, prompt, response_format, video_url, audio_url } = res.data;

        const newActiveSess: ActiveModeSession = {
          modeSessionId: mode_session_id,
          mode,
          sessionType: newSessionType,
          difficulty,
          currentStep: 1,
          totalSteps: mode === 'practice' ? 3 : totalSteps,
          completed: false,
        };
        setActiveModeSession(newActiveSess);

        // ✅ Fix #6: update session title to reflect new type
        updateSession(currentSessionId, {
          title: getModeSessionTitle(mode, newSessionType),
        });

        const promptMsg: Message = {
          id: newId(),
          sessionId: currentSessionId,
          role: 'assistant',
          content: prompt,
          responseFormat: response_format,
          videoUrl: video_url ?? null,
          audioUrl: audio_url ?? null,
          mode,
          messageType: 'prompt',
          step: 1,
          totalSteps: mode === 'practice' ? 3 : totalSteps,
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

        const labels = mode === 'practice' ? PRACTICE_LABELS : REVIEW_LABELS;
        toast.success(`Switched to ${labels[newSessionType] ?? newSessionType}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to switch session type';
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
      updateSession,
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
    retryLastMessage,   // ✅ Fix #5
    startModeSession,
    switchMode,
    endModeSession,
    switchSessionType,  // ✅ Fix #2 — unified, replaces switchReviewType + switchPracticeType
    toggleVideoPreference,
    setCurrentSession,
    deleteSession,
  };
}