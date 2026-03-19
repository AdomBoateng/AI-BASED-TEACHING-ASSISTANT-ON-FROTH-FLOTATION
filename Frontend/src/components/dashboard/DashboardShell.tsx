'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Header } from '@/components/common/Header';
import { AvatarSelector } from '@/components/common/AvatarSelector';
import { useUIStore } from '@/store/uiStore';
import { useUserStore } from '@/store/userStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { apiClient } from '@/services/api';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [checkingAvatar, setCheckingAvatar] = useState(true);
  
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
    if (isMobile) setSidebarOpen(false);
  }, []); // eslint-disable-line

  // Check if user has avatar
  useEffect(() => {
    const checkAvatar = async () => {
      console.log('[DashboardShell] Checking for avatar...');
      
      try {
        const res = await apiClient.getUserProfile();
        console.log('[DashboardShell] getUserProfile response:', res);
        
        if (res.success && res.data) {
          console.log('[DashboardShell] User data:', res.data);
          const hasAvatar = !!res.data.avatar_id;
          console.log('[DashboardShell] Has avatar?', hasAvatar, 'Avatar ID:', res.data.avatar_id);
          
          setShowAvatarSelector(!hasAvatar);
          console.log('[DashboardShell] Show avatar selector?', !hasAvatar);
          
          useUserStore.setState({ user: res.data });
        } else {
          console.error('[DashboardShell] API call failed:', res.error);
          // Show selector anyway if API fails
          setShowAvatarSelector(true);
        }
      } catch (err) {
        console.error('[DashboardShell] Failed to check avatar:', err);
        // Show selector anyway if error
        setShowAvatarSelector(true);
      } finally {
        setCheckingAvatar(false);
        console.log('[DashboardShell] Avatar check complete');
      }
    };

    if (mounted) {
      checkAvatar();
    }
  }, [mounted]);

  console.log('[DashboardShell] Render state:', {
    mounted,
    checkingAvatar,
    showAvatarSelector,
    sidebarOpen,
  });

  if (!mounted || checkingAvatar) {
    console.log('[DashboardShell] Not rendering yet...', { mounted, checkingAvatar });
    return null;
  }

  const sidebarWidth = isMobile ? 0 : sidebarOpen ? 240 : 64;

  return (
    <>
      <div className="flex h-dvh bg-background overflow-hidden">

        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR */}
        <aside
          style={{
            width: isMobile ? 240 : sidebarOpen ? 240 : 64,
            transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
          }}
          className="
            fixed top-0 left-0 h-dvh z-30
            border-r border-border/40 bg-sidebar
            overflow-hidden
            transition-all duration-300 ease-in-out
          "
        >
          <Sidebar />
        </aside>

        {/* MAIN */}
        <main
          style={{ marginLeft: sidebarWidth }}
          className="
            flex flex-1 flex-col h-dvh
            transition-all duration-300 ease-in-out
            min-w-0
          "
        >
          <Header />

          {/* Content area */}
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            {children}
          </div>
        </main>

      </div>

      {/* Avatar Selector Modal - DEBUG: Always show state */}
      {console.log('[DashboardShell] Rendering AvatarSelector with open=', showAvatarSelector)}
      <AvatarSelector
        open={showAvatarSelector}
        onClose={() => {
          console.log('[DashboardShell] Avatar selector closed');
          setShowAvatarSelector(false);
        }}
      />
    </>
  );
}