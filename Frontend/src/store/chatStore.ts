import { create } from 'zustand';
import { persist } from 'zustand/middleware';
const uuidv4 = () => crypto.randomUUID();
import type { Message, Session, VideoResponse, TutorMode, ActiveModeSession } from '@/types';

export interface ChatState {
  sessions: Session[];
  currentSessionId: string | null;
  messages: Message[];
  isLoadingMessage: boolean;
  isGeneratingVideo: boolean;
  currentVideoResponse: VideoResponse | null;
  error: string | null;
  isCreatingSession: boolean;

  // ── Mode session tracking ──────────────────────────────────────────────────
  // Holds the active practice / review session. Null when in learn mode.
  activeModeSession: ActiveModeSession | null;
  // True while we're waiting for /mode-sessions/start to return
  isStartingModeSession: boolean;

  createSession: (firstMessage?: string, mode?: TutorMode, backendSessionId?: string) => Session;
  setCurrentSession: (id: string | null) => void;
  updateSession: (id: string, updates: Partial<Session>) => void;
  deleteSession: (id: string) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  setIsLoadingMessage: (v: boolean) => void;
  setIsGeneratingVideo: (v: boolean) => void;
  setVideoResponse: (v: VideoResponse | null) => void;
  setError: (v: string | null) => void;
  setIsCreatingSession: (v: boolean) => void;

  // Mode session actions
  setActiveModeSession: (v: ActiveModeSession | null) => void;
  setIsStartingModeSession: (v: boolean) => void;
  updateActiveModeSession: (updates: Partial<ActiveModeSession>) => void;

  // Legacy aliases
  conversations: Session[];
  currentConversationId: string | null;
  setCurrentConversation: (id: string | null) => void;
  addConversation: (session: Session) => void;
  deleteConversation: (id: string) => void;
  setConversations: (sessions: Session[]) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      messages: [],
      isLoadingMessage: false,
      isGeneratingVideo: false,
      currentVideoResponse: null,
      error: null,
      isCreatingSession: false,
      activeModeSession: null,
      isStartingModeSession: false,

      createSession: (firstMessage, mode = 'learn', backendSessionId) => {
        const session: Session = {
          id: backendSessionId || uuidv4(),
          title: firstMessage
            ? firstMessage.slice(0, 40) + (firstMessage.length > 40 ? '…' : '')
            : 'New session',
          mode,
          currentMode: mode,
          prefersVideo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          messageCount: 0,
        };
        set((state) => ({
          sessions: [session, ...state.sessions],
          currentSessionId: session.id,
          messages: [],
          currentVideoResponse: null,
          error: null,
          activeModeSession: null,
        }));
        return session;
      },

      setCurrentSession: (id) =>
        set({
          currentSessionId: id,
          messages: [],
          currentVideoResponse: null,
          error: null,
          activeModeSession: null,
        }),

      updateSession: (id, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s
          ),
        })),

      deleteSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          ...(state.currentSessionId === id
            ? {
                currentSessionId: null,
                messages: [],
                currentVideoResponse: null,
                activeModeSession: null,
              }
            : {}),
        })),

      addMessage: (message) =>
        set((state) => {
          const newMessages = [...state.messages, message];
          const sid = state.currentSessionId;
          return {
            messages: newMessages,
            sessions: state.sessions.map((s) =>
              s.id === sid
                ? {
                    ...s,
                    messageCount: newMessages.length,
                    previewMessage:
                      message.role === 'assistant'
                        ? message.content.slice(0, 60)
                        : s.previewMessage,
                    updatedAt: new Date(),
                  }
                : s
            ),
          };
        }),

      setMessages: (messages) => set({ messages }),
      clearMessages: () => set({ messages: [], currentVideoResponse: null }),

      setIsLoadingMessage: (v) => set({ isLoadingMessage: v }),
      setIsGeneratingVideo: (v) => set({ isGeneratingVideo: v }),
      setVideoResponse: (v) => set({ currentVideoResponse: v }),
      setError: (v) => set({ error: v }),
      setIsCreatingSession: (v) => set({ isCreatingSession: v }),

      setActiveModeSession: (v) => set({ activeModeSession: v }),
      setIsStartingModeSession: (v) => set({ isStartingModeSession: v }),
      updateActiveModeSession: (updates) =>
        set((state) =>
          state.activeModeSession
            ? { activeModeSession: { ...state.activeModeSession, ...updates } }
            : {}
        ),

      // Legacy aliases
      get conversations() {
        return get().sessions;
      },
      get currentConversationId() {
        return get().currentSessionId;
      },
      setCurrentConversation: (id) => get().setCurrentSession(id),
      addConversation: (s) => set((state) => ({ sessions: [s, ...state.sessions] })),
      deleteConversation: (id) => get().deleteSession(id),
      setConversations: (sessions) => set({ sessions }),
    }),
    {
      name: 'meraki-chat-store',
      partialize: (state) => ({ sessions: state.sessions }),
    }
  )
);