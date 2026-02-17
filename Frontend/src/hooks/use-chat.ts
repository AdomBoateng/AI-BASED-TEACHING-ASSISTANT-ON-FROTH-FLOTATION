'use client';

import { useCallback } from 'react';
const uuidv4 = () => crypto.randomUUID();
import toast from 'react-hot-toast';
import { useChatStore } from '@/store/chatStore';
import { useUserStore } from '@/store/userStore';
import { apiClient } from '@/services/api';
import type { Message, TutorMode } from '@/types';

export function useChat() {
  const {
    currentSessionId,
    sessions,
    messages,
    isLoadingMessage,
    isGeneratingVideo,
    currentVideoResponse,
    error,
    createSession,
    setCurrentSession,
    deleteSession,
    addMessage,
    setIsLoadingMessage,
    setIsGeneratingVideo,
    setVideoResponse,
    setError,
    updateSession,
  } = useChatStore();

  const isAuthenticated = useUserStore((s) => s.isAuthenticated);

  // ── Start a brand new session ─────────────────────────────────────────────
  const startNewSession = useCallback(
    (firstMessage?: string, mode: TutorMode = 'learn') => {
      const session = createSession(firstMessage, mode);
      return session;
    },
    [createSession]
  );

  // ── Send a message ────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string, mode: TutorMode = 'learn') => {
      if (!text.trim()) return;
      if (!isAuthenticated) {
        toast.error('Please log in to continue.');
        return;
      }

      // If no session yet, create one automatically
      let sessionId = currentSessionId;
      if (!sessionId) {
        const session = createSession(text, mode);
        sessionId = session.id;
      }

      // Optimistic: add user message immediately
      const userMsg: Message = {
        id: uuidv4(),
        sessionId,
        role: 'user',
        content: text.trim(),
        responseFormat: 'text',
        mode,
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

        const { response, response_format, video_url } = res.data;

        // If video, show generating state
        if (response_format === 'video') {
          setIsGeneratingVideo(true);
        }

        const aiMsg: Message = {
          id: uuidv4(),
          sessionId,
          role: 'assistant',
          content: response,
          responseFormat: response_format,
          videoUrl: video_url ?? null,
          mode,
          timestamp: new Date(),
        };
        addMessage(aiMsg);

        // Wire up video response for the player
        if (response_format === 'video' && video_url) {
          setVideoResponse({
            videoUrl: video_url,
            status: 'ready',
            subtitles: [],
          });
        } else {
          setVideoResponse(null);
        }

        // Update session preview
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
      createSession,
      addMessage,
      setIsLoadingMessage,
      setIsGeneratingVideo,
      setVideoResponse,
      setError,
      updateSession,
    ]
  );

  // ── Toggle video preference for current session ───────────────────────────
  const toggleVideoPreference = useCallback(
    async (prefersVideo: boolean) => {
      if (!currentSessionId) return;
      const res = await apiClient.setVideoPreference(currentSessionId, prefersVideo);
      if (res.success) {
        updateSession(currentSessionId, { prefersVideo });
      }
    },
    [currentSessionId, updateSession]
  );

  const currentSession = sessions.find((s) => s.id === currentSessionId) ?? null;

  return {
    // State
    sessions,
    currentSession,
    currentSessionId,
    messages,
    isLoadingMessage,
    isGeneratingVideo,
    currentVideoResponse,
    error,

    // Actions
    startNewSession,
    sendMessage,
    toggleVideoPreference,
    setCurrentSession,
    deleteSession,
  };
}