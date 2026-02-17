'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { VoiceInput } from './VoiceInput';
import { Send } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { apiClient } from '@/services/api';
import toast from 'react-hot-toast';

export function InputArea() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const currentConversationId = useChatStore((state) => state.currentConversationId);
  const addMessage = useChatStore((state) => state.addMessage);
  const setIsGeneratingVideo = useChatStore((state) => state.setIsGeneratingVideo);
  const setVideoResponse = useChatStore((state) => state.setVideoResponse);

  const handleSendMessage = async () => {
    if (!message.trim() || !currentConversationId) {
      toast.error('Please enter a message');
      return;
    }

    setIsLoading(true);
    setIsGeneratingVideo(true);

    try {
      // Add user message to store
      const userMessage = {
        id: Date.now().toString(),
        conversationId: currentConversationId,
        role: 'user' as const,
        content: message,
        timestamp: new Date(),
      };

      addMessage(userMessage);

      // Send to API
      const response = await apiClient.sendMessage({
        conversationId: currentConversationId,
        message: message.trim(),
      });

      if (response.success && response.data) {
        // Add AI message
        const aiMessage = {
          id: response.data.messageId,
          conversationId: currentConversationId,
          role: 'assistant' as const,
          content: 'Video response',
          timestamp: new Date(),
        };

        addMessage(aiMessage);

        // Set video response
        setVideoResponse({
          videoUrl: response.data.videoResponse.videoUrl,
          duration: response.data.videoResponse.duration,
          subtitles: response.data.videoResponse.subtitles,
          status: 'ready',
        });

        toast.success('Response received!');
      } else {
        toast.error(response.error?.message || 'Failed to send message');
      }
    } catch (error) {
      toast.error('Failed to send message');
      console.error(error);
    } finally {
      setMessage('');
      setIsLoading(false);
      setIsGeneratingVideo(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="border-t border-border bg-card p-4">
      <div className="flex gap-2">
        <VoiceInput
          onRecordingComplete={(audioUrl) => {
            setMessage(audioUrl);
          }}
        />

        <Input
          placeholder="Type your question or click the microphone to record..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          className="flex-1"
        />

        <Button
          onClick={handleSendMessage}
          disabled={isLoading || !message.trim()}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          Send
        </Button>
      </div>
    </div>
  );
}
