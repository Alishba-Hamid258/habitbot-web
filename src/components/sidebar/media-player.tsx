'use client';

import React, { useState, useEffect } from 'react';
import { Headphones, Check, Loader2, Play, Volume2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { extractYouTubeId } from '@/lib/utils';
import { toast } from 'sonner';
import { getActiveUser, getActiveMediaUrl, saveActiveMedia } from '@/lib/auth-storage';

type PlayerSize = 'compact' | 'normal' | 'large';

const DEFAULT_FOCUS_VIDEOS = [
  { title: '🎧 Lofi Beats', id: '5qap5aO4i9A', url: 'https://www.youtube.com/watch?v=5qap5aO4i9A' },
  { title: '🌧️ Heavy Rain', id: 'mPZkdNFkNps', url: 'https://www.youtube.com/watch?v=mPZkdNFkNps' },
  { title: '🌌 Synthwave', id: '4xDzrJKXOOY', url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY' },
  { title: '☕ Coffee Cafe', id: 'lTRiuFIWV54', url: 'https://www.youtube.com/watch?v=lTRiuFIWV54' },
];

export function MediaPlayer() {
  const [videoUrl, setVideoUrl] = useState('');
  const [activeVideoId, setActiveVideoId] = useState('5qap5aO4i9A');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [playerSize, setPlayerSize] = useState<PlayerSize>('normal');
  const [autoplayKey, setAutoplayKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<number>(1);

  const syncMediaFromStorage = () => {
    const active = getActiveUser();
    if (active) {
      setUserId(active.id);
      const url = getActiveMediaUrl(active.id);
      if (url) {
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

    setActiveVideoId(vidId);
    setIsPlaying(true);
    setAutoplayKey((k) => k + 1);
    saveActiveMedia(userId, videoUrl, `Custom Focus Track (${videoUrl})`);
    setShowCustomInput(false);
    toast.success('Custom focus soundtrack loaded! 🎵');
  };

  const handleSelectPreset = (v: typeof DEFAULT_FOCUS_VIDEOS[0]) => {
    setActiveVideoId(v.id);
    setIsPlaying(true);
    setAutoplayKey((k) => k + 1);
    saveActiveMedia(userId, v.url, v.title);
    toast.info(`Switched focus track: ${v.title}`);
  };

  // Height mappings for each size to guarantee play button is totally free of title overlay
  const heightClasses = {
    compact: 'h-48',
    normal: 'h-60',
    large: 'h-72',
  };

  return (
    <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-2.5">
      {/* Header with Size Pill Adjuster & Custom Option */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
          <Headphones className="w-3.5 h-3.5 text-cyan-400" />
          <span>Focus Sound & Media</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Size Switcher Pills */}
          <div className="flex items-center bg-slate-950/70 p-0.5 rounded-md border border-white/5 text-[10px]">
            <button
              type="button"
              onClick={() => setPlayerSize('compact')}
              title="Compact Size"
              className={`px-1.5 py-0.5 rounded transition-colors ${
                playerSize === 'compact' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              S
            </button>
            <button
              type="button"
              onClick={() => setPlayerSize('normal')}
              title="Normal Height (Recommended)"
              className={`px-1.5 py-0.5 rounded transition-colors ${
                playerSize === 'normal' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              M
            </button>
            <button
              type="button"
              onClick={() => setPlayerSize('large')}
              title="Large Height"
              className={`px-1.5 py-0.5 rounded transition-colors ${
                playerSize === 'large' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              L
            </button>
          </div>

          <button
            onClick={() => setShowCustomInput(!showCustomInput)}
            className="text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline font-medium ml-1"
          >
            {showCustomInput ? 'Hide' : '+ Custom URL'}
          </button>
        </div>
      </div>

      {/* Preset Quick Selectors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
        {DEFAULT_FOCUS_VIDEOS.map((v) => (
          <button
            key={v.id}
            onClick={() => handleSelectPreset(v)}
            className={`py-1 px-1 rounded text-[10px] font-medium truncate transition-colors border ${
              activeVideoId === v.id
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40 shadow-sm'
                : 'bg-slate-950/40 text-slate-400 border-white/5 hover:text-slate-200'
            }`}
          >
            {v.title}
          </button>
        ))}
      </div>

      {/* Custom URL Input Box */}
      {showCustomInput && (
        <form onSubmit={handleSetCustomUrl} className="flex gap-1.5 pt-1">
          <Input
            type="text"
            placeholder="Paste YouTube link or ID..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="h-7 text-[11px] bg-slate-950/80 border-white/10 text-white placeholder:text-slate-500"
          />
          <Button size="sm" type="submit" className="h-7 px-2.5 gradient-button text-xs shrink-0">
            <Check className="w-3 h-3" />
          </Button>
        </form>
      )}

      {/* Embedded Iframe Player with Adjusted Height to Prevent Title Overlap */}
      <div
        className={`relative w-full rounded-xl overflow-hidden border border-white/10 bg-black shadow-lg transition-all duration-300 flex items-center justify-center ${heightClasses[playerSize]}`}
      >
        {mounted ? (
          <iframe
            key={`${activeVideoId}-${autoplayKey}`}
            src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=${isPlaying ? 1 : 0}&rel=0&modestbranding=1&playsinline=1`}
            title="HabitBot Focus Soundtrack"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Loading soundtrack...</span>
          </div>
        )}
      </div>

      {/* 1-Tap Play Direct Audio Action Button */}
      {!isPlaying && (
        <Button
          size="sm"
          type="button"
          onClick={() => {
            setIsPlaying(true);
            setAutoplayKey((k) => k + 1);
            toast.success('Focus audio started! 🎧');
          }}
          className="w-full h-7 text-[11px] font-semibold bg-gradient-to-r from-purple-600/60 to-cyan-600/60 hover:from-purple-600 hover:to-cyan-600 border border-purple-500/30 text-white rounded-lg flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Play className="w-3 h-3 fill-white" />
          <span>Click to Play Focus Audio</span>
        </Button>
      )}
    </div>
  );
}
