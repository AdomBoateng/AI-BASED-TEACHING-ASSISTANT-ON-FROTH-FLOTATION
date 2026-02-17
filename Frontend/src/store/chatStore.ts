import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Message, Conversation, VideoResponse } from '@/types';

export interface ChatState {
  // Current conversation
  currentConversationId: string | null;
  messages: Message[];
  conversations: Conversation[];

  // Loading states
  isLoadingMessage: boolean;
  isGeneratingVideo: boolean;
  currentVideoResponse: VideoResponse | null;
  error: string | null;

  // Actions
  setCurrentConversation: (id: string | null) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  setIsLoadingMessage: (isLoading: boolean) => void;
  setIsGeneratingVideo: (isGenerating: boolean) => void;
  setVideoResponse: (response: VideoResponse | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  deleteConversation: (id: string) => void;
  setError: (error: string | null) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      currentConversationId: null,
      messages: [],
      conversations: [],
      isLoadingMessage: false,
      isGeneratingVideo: false,
      currentVideoResponse: null,
      error: null,

      setCurrentConversation: (id) =>
        set({ currentConversationId: id }),

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),

      setMessages: (messages) =>
        set({ messages }),

      clearMessages: () =>
        set({ messages: [], currentConversationId: null }),

      setIsLoadingMessage: (isLoading) =>
        set({ isLoadingMessage: isLoading }),

      setIsGeneratingVideo: (isGenerating) =>
        set({ isGeneratingVideo: isGenerating }),

      setVideoResponse: (response) =>
        set({ currentVideoResponse: response }),

      setConversations: (conversations) =>
        set({ conversations }),

      addConversation: (conversation) =>
        set((state) => ({
          conversations: [conversation, ...state.conversations],
        })),

      deleteConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
        })),

      setError: (error) =>
        set({ error }),
    }),
    {
      name: 'meraki-chat-store',
      partialize: (state) => ({
        conversations: state.conversations,
      }),
    }
  )
);
