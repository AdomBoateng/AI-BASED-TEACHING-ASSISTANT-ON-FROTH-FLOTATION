'use client';

import { useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { VideoPlayer } from './VideoPlayer';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sparkles } from 'lucide-react';
import type { Message } from '@/types';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { PracticeEvalCard, PracticeCompletedCard } from '@/components/mode/PracticeModeUI';
import { ReviewEvalCard, ReviewCompletedCard } from '@/components/mode/ReviewModeUI';

interface AIResponseProps {
  message: Message;
}

export function AIResponse({ message }: AIResponseProps) {
  const currentVideoResponse = useChatStore((s) => s.currentVideoResponse);
  const [showTranscript, setShowTranscript] = useState(false);

  // Only show the video player for the latest assistant message that has a video
  const showVideo =
    message.responseFormat === 'video' &&
    message.videoUrl &&
    currentVideoResponse?.videoUrl === message.videoUrl;

  // ── Mode-session message type flags ──────────────────────────────────────
  const isPracticeEval     = message.messageType === 'evaluation' && message.mode === 'practice';
  const isReviewEval       = message.messageType === 'evaluation' && message.mode === 'review';
  const isPracticeComplete = message.messageType === 'completed'  && message.mode === 'practice';
  const isReviewComplete   = message.messageType === 'completed'  && message.mode === 'review';
  const isModePrompt       = message.messageType === 'prompt';
  const isModeMessage      = isPracticeEval || isReviewEval || isPracticeComplete || isReviewComplete || isModePrompt;

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
              audioUrl={message.audioUrl ?? undefined}
              subtitles={currentVideoResponse?.subtitles ?? []}
              duration={currentVideoResponse?.duration ?? 0}
            />
            {/* Transcript toggle (hidden by default) */}
            {message.content && (
              <div className="bg-card/50 border-t border-border/30 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Transcript</p>
                  <button
                    className="text-xs text-primary underline"
                    onClick={() => setShowTranscript((s) => !s)}
                  >
                    {showTranscript ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showTranscript && <MarkdownRenderer content={message.content} />}
              </div>
            )}
          </div>
        ) : isModeMessage ? (
          // ── Mode-session messages (practice / review) ───────────────────
          <>
            {/* Practice evaluation card */}
            {isPracticeEval && message.evaluation && (
              <PracticeEvalCard
                evaluation={message.evaluation as import('@/types').PracticeEvaluation}
                step={message.step ?? 1}
                totalSteps={message.totalSteps ?? 3}
              />
            )}

            {/* Review evaluation card */}
            {isReviewEval && message.evaluation && (
              <ReviewEvalCard
                evaluation={message.evaluation as import('@/types').ReviewEvaluation}
                step={message.step ?? 1}
                totalSteps={message.totalSteps ?? 10}
                nextDifficulty={message.nextDifficulty}
              />
            )}

            {/* Practice completed summary */}
            {isPracticeComplete && (
              <PracticeCompletedCard
                keyLearningPoints={message.keyLearningPoints ?? []}
                summary={message.content}
              />
            )}

            {/* Review completed */}
            {isReviewComplete && (
              <ReviewCompletedCard totalSteps={message.totalSteps ?? 10} />
            )}

            {/* Mode prompt (scenario / question text) — tinted bubble */}
            {isModePrompt && (() => {
              // For review mode, parse out MCQ options and render them cleanly one-per-line
              if (message.mode === 'review') {
                const lines = message.content.split('\n');
                const optionRegex = /^\*{0,2}([A-D])[.)]\*{0,2}\s+(.+)/i;
                const questionLines: string[] = [];
                const optionLines: { letter: string; text: string }[] = [];
                for (const line of lines) {
                  const match = line.trim().match(optionRegex);
                  if (match) {
                    optionLines.push({ letter: match[1].toUpperCase(), text: match[2].trim() });
                  } else {
                    if (optionLines.length === 0) questionLines.push(line);
                  }
                }
                const hasOptions = optionLines.length > 0;
                return (
                  <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3 shadow-sm space-y-3">
                    <MarkdownRenderer content={questionLines.join('\n').trim()} />
                    {hasOptions && (
                      <div className="flex flex-col gap-2 pt-1 border-t border-amber-500/10">
                        {optionLines.map(({ letter, text }) => (
                          <div key={letter} className="flex items-start gap-2 text-sm text-foreground/90">
                            <span className="font-bold text-amber-400/80 flex-shrink-0 w-5">{letter}.</span>
                            <span>{text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <div className={
                  message.mode === 'practice'
                    ? 'rounded-xl bg-emerald-500/5 border border-emerald-500/20 px-4 py-3 shadow-sm'
                    : 'rounded-xl bg-card border border-border/30 px-4 py-3 shadow-sm'
                }>
                  <MarkdownRenderer content={message.content} />
                </div>
              );
            })()}
          </>
        ) : (
          // ── Standard text response (learn mode) ────────────────────────
          <div className="rounded-xl bg-card border border-border/30 px-4 py-3 shadow-sm">
            <MarkdownRenderer content={message.content} />
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground/50 pl-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {message.timestamp instanceof Date
            ? message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}