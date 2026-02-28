'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
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

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

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

    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const handleVoiceTranscript = (transcript: string) => {
    setMessage((prev) =>
      (prev ? `${prev} ${transcript}` : transcript).trim()
    );
    textareaRef.current?.focus();
  };

  return (
    <div className="flex-shrink-0 border-t border-border/50 bg-background/95 backdrop-blur px-4 py-3">
      <div className="mx-auto max-w-3xl">

        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">

          <VoiceInput onRecordingComplete={handleVoiceTranscript} />

          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about froth flotation…"
            disabled={isLoadingMessage}
            rows={1}
            className="
              flex-1 resize-none bg-transparent text-sm text-foreground
              placeholder:text-muted-foreground/60
              border-0 outline-none ring-0 shadow-none
              leading-6 py-1 px-2
              min-h-[28px] max-h-[160px]
              disabled:opacity-50
            "
          />

          <Button
            onClick={handleSend}
            disabled={!message.trim() || isLoadingMessage}
            size="icon"
            className="h-8 w-8 rounded-lg flex-shrink-0"
          >
            {isLoadingMessage
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />
            }
          </Button>
        </div>

        <p className="mt-1.5 text-center text-[11px] text-muted-foreground/50">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}