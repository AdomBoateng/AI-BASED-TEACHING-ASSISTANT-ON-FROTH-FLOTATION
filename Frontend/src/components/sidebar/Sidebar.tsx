'use client';

import { ConversationList } from './ConversationList';
import { NewChat } from './NewChat';
import { SidebarMenu } from './SidebarMenu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GraduationCap, PanelLeftClose } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

export function Sidebar() {
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">

      {/* ── Brand header with collapse button ─────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border/40">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25 flex-shrink-0">
          <GraduationCap className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground leading-none">Meraki</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Froth Flotation Tutor</p>
        </div>
        {/* Collapse button — closes the sidebar */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="flex-shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* ── New chat ──────────────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2">
        <NewChat />
      </div>

      {/* ── Section label ─────────────────────────────────────────────────── */}
      <div className="px-4 pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Recent Sessions
        </p>
      </div>

      {/* ── Conversation list ─────────────────────────────────────────────── */}
      <ScrollArea className="flex-1 px-2">
        <ConversationList />
      </ScrollArea>

      {/* ── Bottom menu ───────────────────────────────────────────────────── */}
      <div className="border-t border-border/40 px-3 py-3">
        <SidebarMenu />
      </div>
    </div>
  );
}