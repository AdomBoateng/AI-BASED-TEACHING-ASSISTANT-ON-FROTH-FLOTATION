'use client';

import { useCallback } from 'react';
const uuidv4 = () => crypto.randomUUID();
import toast from 'react-hot-toast';
import { useChatStore } from '@/store/chatStore';
import { useUserStore } from '@/store/userStore';
import { apiClient } from '@/services/api';
import { parseVTT, getVideoDurationFromSubtitles } from '@/lib/vtt-parser';
import type { Message, TutorMode } from '@/types';

export function useChat() {
  const {
    currentSessionId,
    sessions,
    messages,
    isLoadingMessage,
    isGeneratingVideo,
    currentVideoResponse,
    isCreatingSession,
    error,
    createSession,
    setCurrentSession,
    deleteSession,
    addMessage,
    setIsLoadingMessage,
    setIsGeneratingVideo,
    setVideoResponse,
    setError,
    setIsCreatingSession,
    updateSession,
  } = useChatStore();

  const isAuthenticated = useUserStore((s) => s.isAuthenticated);

  /**
   * ✅ PROPER SOLUTION: Create session on backend FIRST, then store locally
   */
  const startNewSession = useCallback(
    async (firstMessage?: string, mode: TutorMode = 'learn') => {
      if (!isAuthenticated) {
        toast.error('Please log in to continue.');
        return null;
      }

      setIsCreatingSession(true);
      setError(null);

      try {
        console.log('[startNewSession] Creating backend session...');
        
        // ✅ Create session on backend FIRST
        const res = await apiClient.createSession();
        
        if (!res.success || !res.data) {
          throw new Error(res.error?.message ?? 'Failed to create session');
        }

        console.log('[startNewSession] Backend session created:', res.data);

        // ✅ Store session locally with backend ID
        const session = createSession(firstMessage, mode, res.data.session_id);
        
        console.log('[startNewSession] Session ready:', session.id);
        
        return session;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create session';
        console.error('[startNewSession] Error:', err);
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsCreatingSession(false);
      }
    },
    [isAuthenticated, createSession, setIsCreatingSession, setError]
  );

  const sendMessage = useCallback(
    async (text: string, mode: TutorMode = 'learn') => {
      if (!text.trim()) return;
      if (!isAuthenticated) {
        toast.error('Please log in to continue.');
        return;
      }

      // ✅ SIMPLIFIED: Session must already exist (created by startNewSession)
      let sessionId = currentSessionId;
      if (!sessionId) {
        console.log('[sendMessage] No session, creating one...');
        const session = await startNewSession(text, mode);
        if (!session) return;  // Failed to create session
        sessionId = session.id;
      }

      console.log('[sendMessage] Using session:', sessionId);

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
        console.log('[sendMessage] Sending message to backend...');

        const res = await apiClient.sendMessage({
          session_id: sessionId,
          mode: 'learn',
          message: text.trim(),
        });

        console.log('[sendMessage] API Response:', res);

        if (!res.success || !res.data) {
          throw new Error(res.error?.message ?? 'Failed to get response');
        }

        const { response, response_format, video_url, audio_url, subtitle_url } = res.data;

        console.log('[sendMessage] Response format:', response_format);

        if (response_format === 'video') {
          console.log('[sendMessage] ✅ Video response received!');
          setIsGeneratingVideo(true);
        }

        const aiMsg: Message = {
          id: uuidv4(),
          sessionId,
          role: 'assistant',
          content: response,
          responseFormat: response_format,
          videoUrl: video_url ?? null,
          audioUrl: audio_url ?? null,
          mode,
          timestamp: new Date(),
        };
        addMessage(aiMsg);

        if (response_format === 'video' && video_url) {
          const subtitles = subtitle_url ? parseVTT(subtitle_url) : [];
          const duration = getVideoDurationFromSubtitles(subtitles);

          setVideoResponse({
            videoUrl: video_url,
            audioUrl: audio_url ?? undefined,
            subtitles,
            duration,
          });
        } else {
          setVideoResponse(null);
        }

        updateSession(sessionId, { previewMessage: response.slice(0, 60) });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error';
        console.error('[sendMessage] Error:', err);
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

  const toggleVideoPreference = useCallback(
    async (prefersVideo: boolean) => {
      if (!currentSessionId) {
        toast.error('No active session');
        return;
      }

      console.log('[toggleVideoPreference] Toggling to:', prefersVideo);

      try {
        const res = await apiClient.setVideoPreference(currentSessionId, prefersVideo);
        
        console.log('[toggleVideoPreference] API response:', res);

        if (res.success) {
          updateSession(currentSessionId, { prefersVideo });
          toast.success(prefersVideo ? '🎥 Video mode enabled' : '📝 Text mode enabled');
        } else {
          throw new Error(res.error?.message ?? 'Failed to toggle video mode');
        }
      } catch (err) {
        console.error('[toggleVideoPreference] Error:', err);
        const message = err instanceof Error ? err.message : 'Failed to toggle video mode';
        toast.error(message);
      }
    },
    [currentSessionId, updateSession]
  );

  const currentSession = sessions.find((s) => s.id === currentSessionId) ?? null;

  return {
    sessions,
    currentSession,
    currentSessionId,
    messages,
    isLoadingMessage,
    isGeneratingVideo,
    isCreatingSession,  // ✅ NEW: Expose session creation state
    currentVideoResponse,
    error,
    startNewSession,
    sendMessage,
    toggleVideoPreference,
    setCurrentSession,
    deleteSession,
  };
}