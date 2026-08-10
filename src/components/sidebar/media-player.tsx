'use client';

import React, { useState, useEffect } from 'react';
import { Headphones, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { extractYouTubeId } from '@/lib/utils';
import { toast } from 'sonner';
import { getActiveUser, getActiveMediaUrl, saveActiveMedia } from '@/lib/auth-storage';

const DEFAULT_FOCUS_VIDEOS = [
  { title: '🎧 Lofi Beats', id: 'jfKfPfyJRdk', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
  { title: '🌧️ Heavy Rain', id: 'mPZkdNFkNps', url: 'https://www.youtube.com/watch?v=mPZkdNFkNps' },
  { title: '🌌 Synthwave', id: '4xDzrJKXOOY', url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY' },
];

export function MediaPlayer() {
  const [videoUrl, setVideoUrl] = useState('');
  const [activeVideoId, setActiveVideoId] = useState('jfKfPfyJRdk');
  const [showCustomInput, setShowCustomInput] = useState(false);
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
      toast.error('Invalid YouTube video link. Please enter a valid URL.');
      return;
    }

    setActiveVideoId(vidId);
    saveActiveMedia(userId, videoUrl, `Custom Focus Track (${videoUrl})`);
    setShowCustomInput(false);
    toast.success('Custom focus soundtrack synced & saved to history! 🎵');
  };

  const handleSelectPreset = (v: typeof DEFAULT_FOCUS_VIDEOS[0]) => {
    setActiveVideoId(v.id);
    saveActiveMedia(userId, v.url, v.title);
    toast.info(`Switched focus track: ${v.title}`);
  };

  return (
    <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
          <Headphones className="w-3.5 h-3.5 text-cyan-400" />
          <span>Focus Sound & Media</span>
        </div>
        <button
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline"
        >
          {showCustomInput ? 'Hide' : '+ Custom URL'}
        </button>
      </div>

      {/* Preset Quick Selectors */}
      <div className="grid grid-cols-3 gap-1">
        {DEFAULT_FOCUS_VIDEOS.map((v) => (
          <button
            key={v.id}
            onClick={() => handleSelectPreset(v)}
            className={`py-1 px-1.5 rounded text-[10px] font-medium truncate transition-colors border ${
              activeVideoId === v.id
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
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
            placeholder="Paste YouTube link..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="h-7 text-[11px] bg-slate-950/80 border-white/10 text-white"
          />
          <Button size="sm" type="submit" className="h-7 px-2 gradient-button text-xs">
            <Check className="w-3 h-3" />
          </Button>
        </form>
      )}

      {/* Embedded Iframe Player */}
      <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black/50 shadow-inner flex items-center justify-center">
        {mounted ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?enablejsapi=1`}
            title="HabitBot Focus Audio"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Loading player...</span>
          </div>
        )}
      </div>
    </div>
  );
}
