'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { apiClient } from '@/services/api';
import toast from 'react-hot-toast';
import { useState } from 'react';

export function NewChat() {
  const [isLoading, setIsLoading] = useState(false);
  const setCurrentConversation = useChatStore((state) => state.setCurrentConversation);
  const addConversation = useChatStore((state) => state.addConversation);
  const setMessages = useChatStore((state) => state.setMessages);

  const handleNewChat = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.createConversation('New Conversation');

      if (response.success && response.data) {
        addConversation(response.data);
        setCurrentConversation(response.data.id);
        setMessages([]);
        toast.success('New conversation created!');
      } else {
        // Fallback: Create conversation locally without backend
        const newId = `conv-${Date.now()}`;
        const newConversation = {
          id: newId,
          title: 'New Conversation',
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
        };
        
        addConversation(newConversation);
        setCurrentConversation(newId);
        setMessages([]);
        toast.success('New conversation created! (Offline mode)');
      }
    } catch (error) {
      console.error('[v0] Error creating conversation:', error);
      
      // Fallback: Create conversation locally when API is unavailable
      const newId = `conv-${Date.now()}`;
      const newConversation = {
        id: newId,
        title: 'New Conversation',
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
      };
      
      addConversation(newConversation);
      setCurrentConversation(newId);
      setMessages([]);
      toast.success('New conversation created! (Offline mode)');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleNewChat}
      disabled={isLoading}
      className="w-full gap-2"
      variant="outline"
    >
      <Plus className="h-4 w-4" />
      {isLoading ? 'Creating...' : 'New Chat'}
    </Button>
  );
}
