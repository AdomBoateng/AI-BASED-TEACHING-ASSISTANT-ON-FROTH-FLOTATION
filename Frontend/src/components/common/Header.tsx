// FILE PATH: src/components/common/Header.tsx
// STICKY version with proper z-index

'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Menu, Moon, Sun } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useChatStore } from '@/store/chatStore';

export function Header() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const currentSessionId = useChatStore((state) => state.currentSessionId);
  const sessions = useChatStore((state) => state.sessions);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  return (
    // STICKY with high z-index, backdrop blur for glass effect
    <header className="sticky top-0 z-40 flex-shrink-0 border-b border-border/40 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
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