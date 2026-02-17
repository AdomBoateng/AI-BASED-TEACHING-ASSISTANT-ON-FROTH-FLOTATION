'use client';

import { Sparkles } from 'lucide-react';

export function LoadingState() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-4 w-4 animate-spin" />
          <span className="text-sm">Generating your response...</span>
        </div>
      </div>
    </div>
  );
}
