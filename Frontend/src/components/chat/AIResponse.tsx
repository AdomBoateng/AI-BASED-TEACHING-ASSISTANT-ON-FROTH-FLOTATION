'use client';

import { useChatStore } from '@/store/chatStore';
import { VideoPlayer } from './VideoPlayer';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sparkles } from 'lucide-react';
import type { Message } from '@/types';

interface AIResponseProps {
  message: Message;
}

export function AIResponse({ message }: AIResponseProps) {
  const currentVideoResponse = useChatStore((s) => s.currentVideoResponse);

  // Only show the video player for the latest assistant message that has a video
  const showVideo =
    message.responseFormat === 'video' &&
    message.videoUrl &&
    currentVideoResponse?.videoUrl === message.videoUrl;

  return (
    <div className="flex gap-3 group">
      {/* Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-primary/20">
        <AvatarFallback className="bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 max-w-2xl min-w-0">
        {showVideo ? (
          // ── Video response ──────────────────────────────────────────────
          <div className="rounded-xl border border-border/50 overflow-hidden shadow-md">
            <VideoPlayer
              videoUrl={message.videoUrl!}
              subtitles={currentVideoResponse?.subtitles ?? []}
              duration={currentVideoResponse?.duration ?? 0}
            />
            {/* Transcript below video */}
            {message.content && (
              <div className="bg-card/50 border-t border-border/30 px-4 py-3">
                <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">
                  Transcript
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            )}
          </div>
        ) : (
          // ── Text response ───────────────────────────────────────────────
          <div className="rounded-xl bg-card border border-border/30 px-4 py-3 shadow-sm">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[11px] text-muted-foreground/50 pl-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}