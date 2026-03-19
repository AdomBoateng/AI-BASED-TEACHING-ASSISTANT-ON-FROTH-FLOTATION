'use client';

import { useState, useRef, useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { Subtitle } from '@/types';
import { SubtitleDisplay } from './SubtitleDisplay';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface VideoPlayerProps {
  videoUrl: string;
  audioUrl?: string;
  subtitles: Subtitle[];
  duration: number;
}

export function VideoPlayer({ videoUrl, subtitles, duration }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(duration);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState<Subtitle | null>(null);
  const [showControls, setShowControls] = useState(false);

  // Update duration when video metadata loads
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const dur = video.duration * 1000; // Convert to ms
      setVideoDuration(dur);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, []);

  // Autoplay removed to preserve audio playback — user will start playback manually

  // Track playback and find current subtitle
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime * 1000; // Convert to ms
      setCurrentTime(time);

      // Find current subtitle
      const current = subtitles.find(
        (sub) => time >= sub.startTime && time <= sub.endTime
      );
      setCurrentSubtitle(current || null);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', () => setIsPlaying(true));
    video.addEventListener('pause', () => setIsPlaying(false));
    video.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', () => setIsPlaying(true));
      video.removeEventListener('pause', () => setIsPlaying(false));
      video.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, [subtitles]);

  // Clickable progress bar seek handler
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const timeMs = pct * (videoDuration || duration || 0);
    if (videoRef.current) {
      videoRef.current.currentTime = timeMs / 1000;
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
    setIsMuted(vol === 0);
  };

  const handleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        const vol = volume || 0.5;
        videoRef.current.volume = vol;
        setVolume(vol);
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const handleTimelineChange = (newTime: number[]) => {
    const time = newTime[0];
    if (videoRef.current) {
      videoRef.current.currentTime = time / 1000; // Convert ms to seconds
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full bg-black rounded-lg overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full aspect-video"
        preload="metadata"
        onClick={handlePlayPause}
      />

        {/* Thin persistent progress bar (click to seek) */}
        <div
          className="absolute left-0 right-0 bottom-0 h-1 bg-white/10 cursor-pointer"
          onClick={handleProgressClick}
          role="presentation"
        >
          <div
            className="h-1 bg-primary transition-all"
            style={{ width: videoDuration ? `${Math.min(100, (currentTime / videoDuration) * 100)}%` : '0%' }}
          />
        </div>

      {/* Subtitles */}
      {currentSubtitle && (
        <SubtitleDisplay text={currentSubtitle.text} />
      )}

      {/* Controls Overlay */}
      <div className={`
        absolute bottom-0 left-0 right-0 
        bg-gradient-to-t from-black/90 to-transparent 
        p-4 transition-opacity duration-300
        ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}
      `}>
        {/* Timeline */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-white/90 tabular-nums min-w-[40px]">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={videoDuration}
            step={100}
            onValueChange={handleTimelineChange}
            className="flex-1"
          />
          <span className="text-xs text-white/90 tabular-nums min-w-[40px] text-right">
            {formatTime(videoDuration)}
          </span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Play/Pause */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePlayPause}
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            {/* Volume */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleMute}
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>

            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.05}
              onValueChange={handleVolumeChange}
              className="w-20"
            />
          </div>

          {/* Fullscreen */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFullscreen}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}