'use client';

import { useChatStore } from '@/store/chatStore';
import { VideoPlayer } from './VideoPlayer';
import { Avatar } from '@/components/ui/avatar';
import { Sparkles } from 'lucide-react';

interface AIResponseProps {
  messageId: string;
}

export function AIResponse({ messageId }: AIResponseProps) {
  const currentVideoResponse = useChatStore((state) => state.currentVideoResponse);

  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <div className="bg-accent text-accent-foreground flex items-center justify-center w-full h-full">
          <Sparkles className="h-4 w-4" />
        </div>
      </Avatar>

      <div className="flex flex-1 flex-col gap-2 max-w-2xl">
        {currentVideoResponse ? (
          <div className="rounded-lg border border-border overflow-hidden">
            <VideoPlayer
              videoUrl={currentVideoResponse.videoUrl}
              subtitles={currentVideoResponse.subtitles}
              duration={currentVideoResponse.duration}
            />
          </div>
        ) : (
          <div className="rounded-lg bg-card p-4 text-card-foreground">
            <p className="text-sm">Generating response...</p>
          </div>
        )}
      </div>
    </div>
  );
}
