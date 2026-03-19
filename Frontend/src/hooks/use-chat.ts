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
  const userPrefersVideo = useUserStore((s) => s.preferences.prefersVideo);

  const startNewSession = useCallback(
    (firstMessage?: string, mode: TutorMode = 'learn') => {
      const session = createSession(firstMessage, mode);
      return session;
    },
    [createSession]
  );

  const sendMessage = useCallback(
    async (text: string, mode: TutorMode = 'learn') => {
      if (!text.trim()) return;
      if (!isAuthenticated) {
        toast.error('Please log in to continue.');
        return;
      }

      let sessionId = currentSessionId;
      if (!sessionId) {
        const session = createSession(text, mode);
        sessionId = session.id;

        try {
          updateSession(sessionId, { prefersVideo: !!userPrefersVideo });
        } catch (e) {
          console.warn('[sendMessage] Failed to set initial session video pref:', e);
        }
      }

      const currentSession = sessions.find(s => s.id === sessionId);
      console.log('[sendMessage] Current session state:', {
        sessionId,
        prefersVideo: currentSession?.prefersVideo,
        mode: currentSession?.mode,
      });

      // ✅ FIX: Ensure backend session exists and is synced BEFORE sending message
      try {
        const getRes = await apiClient.getSession(sessionId);
        
        if (!getRes.success) {
          console.log('[sendMessage] Session not on backend, creating...');
          const createRes = await apiClient.createSession();
          
          if (createRes.success && createRes.data) {
            console.log('[sendMessage] Backend session created');

            const pref = !!currentSession?.prefersVideo;
            console.log('[sendMessage] Setting backend video preference to', pref);
            
            // ✅ CRITICAL: Wait for this to complete before continuing
            await apiClient.setVideoPreference(createRes.data.session_id, pref);
            console.log('[sendMessage] Video preference synced to backend');
          }
        } else {
          console.log('[sendMessage] Backend session exists:', getRes.data);
          
          if (getRes.data && getRes.data.prefers_video !== (!!currentSession?.prefersVideo)) {
            console.log('[sendMessage] Video preference mismatch, syncing...');
            await apiClient.setVideoPreference(sessionId, !!currentSession?.prefersVideo);
            console.log('[sendMessage] Video preference synced');
          }
        }
      } catch (err) {
        console.warn('[sendMessage] Session sync failed, continuing anyway:', err);
      }

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

        console.log('[sendMessage] Response details:', {
          response_format,
          has_video_url: !!video_url,
          has_audio_url: !!audio_url,
          has_subtitle_url: !!subtitle_url,
        });

        if (response_format === 'video') {
          console.log('[sendMessage] ✅ Video response received!');
          setIsGeneratingVideo(true);
        } else {
          console.log('[sendMessage] ⚠️ Text response (expected video?)');
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

          console.log('[sendMessage] Setting video response:', {
            videoUrl: video_url,
            subtitlesCount: subtitles.length,
            duration,
          });

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
      sessions,
      isAuthenticated,
      userPrefersVideo,
      createSession,
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
          const errorCode = res.error?.code;
          const errorMsg = res.error?.message || '';

          if (errorCode === '404' || errorMsg.includes('not found')) {
            console.log('[toggleVideoPreference] Session not found, creating...');
            
            const createRes = await apiClient.createSession();
            if (createRes.success && createRes.data) {
              console.log('[toggleVideoPreference] Backend session created:', createRes.data);
              
              // ✅ FIX: Wait for video preference to be set before continuing
              const retryRes = await apiClient.setVideoPreference(
                createRes.data.session_id,
                prefersVideo
              );
              
              console.log('[toggleVideoPreference] Video preference set:', retryRes);
              
              if (retryRes.success) {
                updateSession(currentSessionId, { prefersVideo });
                toast.success(prefersVideo ? '🎥 Video mode enabled' : '📝 Text mode enabled');
              } else {
                throw new Error(retryRes.error?.message ?? 'Failed after retry');
              }
            } else {
              throw new Error('Failed to create session on backend');
            }
          } else if (errorCode === '400' && errorMsg.includes('avatar')) {
            toast.error('⚠️ Please select an avatar to enable video mode');
          } else if (errorCode === '400' && errorMsg.includes('review')) {
            toast.error('Video mode is not available in review mode');
          } else {
            throw new Error(errorMsg || 'Failed to toggle video mode');
          }
        }
      } catch (err) {
        console.error('[toggleVideoPreference] Error:', err);
        const message = err instanceof Error ? err.message : 'Failed to toggle video mode';
        toast.error(message);
        
        updateSession(currentSessionId, { prefersVideo: !prefersVideo });
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
    currentVideoResponse,
    error,
    startNewSession,
    sendMessage,
    toggleVideoPreference,
    setCurrentSession,
    deleteSession,
  };
}