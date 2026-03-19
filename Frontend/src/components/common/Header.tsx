'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Menu, Moon, Sun, Video, FileText, Loader2 } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useChatStore } from '@/store/chatStore';
import { useChat } from '@/hooks/use-chat';
import { cn } from '@/lib/utils';

export function Header() {
  const [mounted, setMounted] = useState(false);
  const [isTogglingVideo, setIsTogglingVideo] = useState(false);
  
  const { theme, setTheme } = useTheme();
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const currentSessionId = useChatStore((state) => state.currentSessionId);
  const sessions = useChatStore((state) => state.sessions);
  const { toggleVideoPreference } = useChat();

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const prefersVideo = currentSession?.prefersVideo ?? false;

  const handleSetMode = async (videoMode: boolean) => {
    console.log('[Header] Setting mode to:', videoMode ? 'VIDEO' : 'TEXT');
    
    if (!currentSessionId) {
      console.log('[Header] No session ID, aborting');
      return;
    }

    if (prefersVideo === videoMode) {
      console.log('[Header] Already in this mode, ignoring');
      return;
    }

    setIsTogglingVideo(true);
    try {
      await toggleVideoPreference(videoMode);
      console.log('[Header] Mode changed successfully');
    } catch (err) {
      console.error('[Header] Mode change failed:', err);
    } finally {
      setIsTogglingVideo(false);
    }
  };

  return (
    <header className="flex-shrink-0 z-20 border-b border-border/40 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-between px-4 h-14">
        
        {/* Left side */}
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleSidebar}
            className="h-8 w-8"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-md">
              {currentSession?.title || 'Meraki'}
            </h2>
            <p className="text-xs text-muted-foreground">
              AI Learning Assistant
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Video Toggle - BETTER UX: Click icons directly */}
          {currentSession && (
            <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50">
              {/* Text Mode Button */}
              <button
                onClick={() => handleSetMode(false)}
                disabled={isTogglingVideo}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  !prefersVideo
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
                title="Text responses"
              >
                {isTogglingVideo && !prefersVideo ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                <span className="text-xs font-medium hidden sm:inline">Text</span>
              </button>

              {/* Video Mode Button */}
              <button
                onClick={() => handleSetMode(true)}
                disabled={isTogglingVideo}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  prefersVideo
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
                title="Video responses"
              >
                {isTogglingVideo && prefersVideo ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Video className="h-3.5 w-3.5" />
                )}
                <span className="text-xs font-medium hidden sm:inline">Video</span>
              </button>
            </div>
          )}

          {currentSession && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {currentSession.messageCount || 0} messages
            </span>
          )}

          {/* Theme toggle */}
          {mounted && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-8 w-8"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}