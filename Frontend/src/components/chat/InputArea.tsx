'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { useChat } from '@/hooks/use-chat';
import { VoiceInput } from './VoiceInput';

export function InputArea() {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isLoadingMessage } = useChat();

  const handleSend = async () => {
    const text = message.trim();
    if (!text || isLoadingMessage) return;
    setMessage('');
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await sendMessage(text, 'learn');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-grow textarea
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const handleVoiceTranscript = (transcript: string) => {
    setMessage((prev) => (prev ? `${prev} ${transcript}` : transcript).trim());
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 shadow-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          {/* Voice input */}
          <div className="flex-shrink-0 self-end pb-0.5">
            <VoiceInput onRecordingComplete={handleVoiceTranscript} />
          </div>

          {/* Text input */}
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about froth flotation…"
            disabled={isLoadingMessage}
            rows={1}
            className="flex-1 resize-none border-0 bg-transparent p-1 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60 min-h-[36px] max-h-[160px] leading-relaxed"
          />

          {/* Send button */}
          <div className="flex-shrink-0 self-end pb-0.5">
            <Button
              onClick={handleSend}
              disabled={!message.trim() || isLoadingMessage}
              size="icon"
              className="h-8 w-8 rounded-lg"
            >
              {isLoadingMessage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <p className="mt-1.5 text-center text-[11px] text-muted-foreground/50">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}