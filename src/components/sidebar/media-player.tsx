'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Headphones, Check, Loader2, Play, Volume2, Sparkles, Upload, FileAudio, FileVideo, X, Link as LinkIcon, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { extractYouTubeId } from '@/lib/utils';
import { toast } from 'sonner';
import { getActiveUser, getActiveMediaUrl, saveActiveMedia } from '@/lib/auth-storage';

type PlayerSize = 'compact' | 'normal' | 'large';

const DEFAULT_FOCUS_VIDEOS = [
  { title: '🎧 Lofi Nasheed', id: 'oKxaKT6Kb-A', url: 'https://www.youtube.com/watch?v=oKxaKT6Kb-A' },
  { title: '🌧️ Heavy Rain', id: 'mPZkdNFkNps', url: 'https://www.youtube.com/watch?v=mPZkdNFkNps' },
  { title: '🌌 Synthwave', id: '4xDzrJKXOOY', url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY' },
  { title: '☕ Coffee Cafe', id: 'lTRiuFIWV54', url: 'https://www.youtube.com/watch?v=lTRiuFIWV54' },
];

export function MediaPlayer() {
  const [videoUrl, setVideoUrl] = useState('');
  const [activeVideoId, setActiveVideoId] = useState('oKxaKT6Kb-A');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [playerSize, setPlayerSize] = useState<PlayerSize>('normal');
  const [autoplayKey, setAutoplayKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<number>(1);

  // Local device media file state
  const [localMedia, setLocalMedia] = useState<{
    url: string;
    name: string;
    isVideo: boolean;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const syncMediaFromStorage = () => {
    const active = getActiveUser();
    if (active) {
      setUserId(active.id);
      const url = getActiveMediaUrl(active.id);
      if (url && !url.startsWith('blob:') && !url.startsWith('device:')) {
        const vidId = extractYouTubeId(url);
        if (vidId) {
          setActiveVideoId(vidId);
          setVideoUrl(url);
        }
      }
    }
  };

  useEffect(() => {
    setMounted(true);
    syncMediaFromStorage();

    window.addEventListener('habitbot_media_updated', syncMediaFromStorage);
    return () => window.removeEventListener('habitbot_media_updated', syncMediaFromStorage);
  }, []);

  const handleSetCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const vidId = extractYouTubeId(videoUrl);
    if (!vidId) {
      toast.error('Invalid YouTube link or ID. Paste a full link or 11-digit video ID.');
      return;
    }

    setLocalMedia(null);
    setActiveVideoId(vidId);
    setIsPlaying(true);
    setAutoplayKey((k) => k + 1);
    saveActiveMedia(userId, videoUrl, `Custom Focus Track (${videoUrl})`);
    setShowCustomInput(false);
    toast.success('Custom focus soundtrack loaded! 🎵');
  };

  const handleSelectPreset = (v: typeof DEFAULT_FOCUS_VIDEOS[0]) => {
    setLocalMedia(null);
    setActiveVideoId(v.id);
    setIsPlaying(true);
    setAutoplayKey((k) => k + 1);
    saveActiveMedia(userId, v.url, v.title);
    toast.info(`Switched focus track: ${v.title}`);
  };

  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video');
    const objectUrl = URL.createObjectURL(file);

    setLocalMedia({
      url: objectUrl,
      name: file.name,
      isVideo,
    });
    setIsPlaying(true);
    saveActiveMedia(userId, `device://${file.name}`, `Device Media: ${file.name}`);
    toast.success(`Loaded "${file.name}" from your device! 🎧`, { icon: isVideo ? '🎬' : '🎵' });
  };

  const heightClasses = {
    compact: 'h-48',
    normal: 'h-60',
    large: 'h-72',
  };

  return (
    <div className="p-3.5 bg-card rounded-xl border border-border space-y-3 transition-colors">
      {/* Hidden File Input for Device Audio/Video */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLocalFileUpload}
        accept="audio/*,video/*"
        className="hidden"
      />

      {/* Row 1: Header Brand & Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Headphones className="w-3.5 h-3.5 text-primary" />
          <span>Focus Audio</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Upload Device File Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload audio/video from device"
            className="px-2 py-0.5 rounded-md bg-muted hover:bg-secondary text-[11px] font-medium text-foreground border border-border flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Upload className="w-3 h-3" />
            <span>Upload</span>
          </button>

          {/* Toggle Custom URL */}
          <button
            type="button"
            onClick={() => setShowCustomInput(!showCustomInput)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 border transition-colors cursor-pointer ${
              showCustomInput
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted hover:bg-secondary text-foreground border-border'
            }`}
          >
            <LinkIcon className="w-3 h-3" />
            <span>{showCustomInput ? 'Close' : 'URL'}</span>
          </button>
        </div>
      </div>

      {/* Row 2: Preset Quick Selectors & Size Adjuster Controls */}
      <div className="flex items-center justify-between gap-1.5 pt-0.5">
        <div className="grid grid-cols-4 gap-1 flex-1">
          {DEFAULT_FOCUS_VIDEOS.map((v) => (
            <button
              key={v.id}
              onClick={() => handleSelectPreset(v)}
              className={`py-1 px-1 rounded-md text-[10px] font-medium truncate text-center transition-colors cursor-pointer border ${
                !localMedia && activeVideoId === v.id
                  ? 'bg-primary/10 text-primary border-primary/30 font-semibold'
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/40'
              }`}
            >
              {v.title}
            </button>
          ))}
        </div>

        {/* Size Switcher */}
        <div className="flex items-center bg-muted/60 p-0.5 rounded-md shrink-0 text-[10px] border border-border/50">
          {(['compact', 'normal', 'large'] as PlayerSize[]).map((sz, idx) => {
            const labels = ['S', 'M', 'L'];
            return (
              <button
                key={sz}
                type="button"
                onClick={() => setPlayerSize(sz)}
                title={`${sz.toUpperCase()} player height`}
                className={`px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                  playerSize === sz
                    ? 'bg-background text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {labels[idx]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom URL Input Box */}
      {showCustomInput && (
        <form onSubmit={handleSetCustomUrl} className="flex gap-1.5 pt-0.5">
          <Input
            type="text"
            placeholder="Paste YouTube link or video ID..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="h-8 text-xs bg-background border-border text-foreground rounded-md px-2.5"
          />
          <Button size="sm" type="submit" className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded-md font-medium shrink-0">
            <Check className="w-3 h-3" />
          </Button>
        </form>
      )}

      {/* Media Display Container */}
      <div
        className={`relative w-full rounded-lg overflow-hidden border border-border bg-black transition-all duration-200 flex items-center justify-center ${heightClasses[playerSize]}`}
      >
        {localMedia ? (
          /* LOCAL DEVICE MEDIA PLAYER (AUDIO/VIDEO) */
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-zinc-950 text-white">
            {localMedia.isVideo ? (
              <video
                src={localMedia.url}
                controls
                autoPlay
                className="w-full h-full object-contain rounded-md"
              />
            ) : (
              <div className="space-y-2.5 w-full max-w-[240px]">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <FileAudio className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate">{localMedia.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">Local Audio File</div>
                </div>
                <audio src={localMedia.url} controls autoPlay className="w-full h-8" />
              </div>
            )}

            <button
              type="button"
              onClick={() => setLocalMedia(null)}
              className="absolute top-2 right-2 p-1 bg-black/80 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded border border-white/10 transition-colors"
              title="Return to YouTube Streams"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* YOUTUBE EMBEDDED PLAYER */
          mounted ? (
            <iframe
              key={`${activeVideoId}-${autoplayKey}`}
              src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=${isPlaying ? 1 : 0}&rel=0&modestbranding=1&playsinline=1`}
              title="HabitBot Focus Audio"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Loading audio...</span>
            </div>
          )
        )}
      </div>

      {/* 1-Tap Play Direct Audio Action Button */}
      {!isPlaying && !localMedia && (
        <Button
          size="sm"
          type="button"
          onClick={() => {
            setIsPlaying(true);
            setAutoplayKey((k) => k + 1);
            toast.success('Focus audio started');
          }}
          className="w-full h-8 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-md flex items-center justify-center gap-1.5 shadow-none cursor-pointer"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Play Audio</span>
        </Button>
      )}
    </div>
  );
}
