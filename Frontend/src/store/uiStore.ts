import { create } from 'zustand';

export interface UIState {
  sidebarOpen: boolean;
  showVideoPlayer: boolean;
  showSubtitles: boolean;
  isRecording: boolean;
  recordingDuration: number;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setShowVideoPlayer: (show: boolean) => void;
  setShowSubtitles: (show: boolean) => void;
  setIsRecording: (recording: boolean) => void;
  setRecordingDuration: (duration: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  showVideoPlayer: false,
  showSubtitles: true,
  isRecording: false,
  recordingDuration: 0,

  toggleSidebar: () =>
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
    })),

  setSidebarOpen: (open) =>
    set({ sidebarOpen: open }),

  setShowVideoPlayer: (show) =>
    set({ showVideoPlayer: show }),

  setShowSubtitles: (show) =>
    set({ showSubtitles: show }),

  setIsRecording: (recording) =>
    set({ isRecording: recording }),

  setRecordingDuration: (duration) =>
    set({ recordingDuration: duration }),
}));
