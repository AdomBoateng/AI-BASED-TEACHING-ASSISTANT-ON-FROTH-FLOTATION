import { create } from 'zustand';
import { persist } from 'zustand/middleware';
const uuidv4 = () => crypto.randomUUID();
import type { Message, Session, VideoResponse, TutorMode } from '@/types';

export interface ChatState {
  // Sessions (maps to backend "sessions" table)
  sessions: Session[];
  currentSessionId: string | null;

  // Messages for current session
  messages: Message[];

  // Loading / video state
  isLoadingMessage: boolean;
  isGeneratingVideo: boolean;
  currentVideoResponse: VideoResponse | null;
  error: string | null;

  // Actions — sessions
  createSession: (firstMessage?: string, mode?: TutorMode) => Session;
  setCurrentSession: (id: string | null) => void;
  updateSession: (id: string, updates: Partial<Session>) => void;
  deleteSession: (id: string) => void;

  // Actions — messages
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;

  // Actions — UI state
  setIsLoadingMessage: (v: boolean) => void;
  setIsGeneratingVideo: (v: boolean) => void;
  setVideoResponse: (v: VideoResponse | null) => void;
  setError: (v: string | null) => void;

  // Legacy aliases (keeps existing components working)
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

      // ── Sessions ───────────────────────────────────────────────────────────
      createSession: (firstMessage, mode = 'learn') => {
        const session: Session = {
          id: uuidv4(),
          title: firstMessage
            ? firstMessage.slice(0, 40) + (firstMessage.length > 40 ? '…' : '')
            : 'New session',
          mode,
          prefersVideo: false,
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
        }));
        return session;
      },

      setCurrentSession: (id) =>
        set({ currentSessionId: id, messages: [], currentVideoResponse: null, error: null }),

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
            ? { currentSessionId: null, messages: [], currentVideoResponse: null }
            : {}),
        })),

      // ── Messages ──────────────────────────────────────────────────────────
      addMessage: (message) =>
        set((state) => {
          const newMessages = [...state.messages, message];
          // Keep session message count + preview in sync
          const sid = state.currentSessionId;
          return {
            messages: newMessages,
            sessions: state.sessions.map((s) =>
              s.id === sid
                ? {
                    ...s,
                    messageCount: newMessages.length,
                    previewMessage:
                      message.role === 'assistant' ? message.content.slice(0, 60) : s.previewMessage,
                    updatedAt: new Date(),
                  }
                : s
            ),
          };
        }),

      setMessages: (messages) => set({ messages }),
      clearMessages: () => set({ messages: [], currentVideoResponse: null }),

      // ── UI ────────────────────────────────────────────────────────────────
      setIsLoadingMessage: (v) => set({ isLoadingMessage: v }),
      setIsGeneratingVideo: (v) => set({ isGeneratingVideo: v }),
      setVideoResponse: (v) => set({ currentVideoResponse: v }),
      setError: (v) => set({ error: v }),

      // ── Legacy aliases ────────────────────────────────────────────────────
      get conversations() { return get().sessions; },
      get currentConversationId() { return get().currentSessionId; },
      setCurrentConversation: (id) => get().setCurrentSession(id),
      addConversation: (s) =>
        set((state) => ({ sessions: [s, ...state.sessions] })),
      deleteConversation: (id) => get().deleteSession(id),
      setConversations: (sessions) => set({ sessions }),
    }),
    {
      name: 'meraki-chat-store',
      partialize: (state) => ({ sessions: state.sessions }),
    }
  )
);