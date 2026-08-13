'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Library, BookOpen, Film, Video, ExternalLink, Play, Check, Sparkles, AlertCircle, Upload, FileAudio, FileVideo, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { extractYouTubeId } from '@/lib/utils';
import { toast } from 'sonner';

import { getActiveUser, getActiveMediaUrl, saveActiveMedia } from '@/lib/auth-storage';

type LibraryTab = 'books' | 'theater' | 'customPlayer';

const BOOKS = [
  {
    title: 'The Power of Habit',
    author: 'Charles Duhigg',
    category: 'Habit Loops',
    desc: 'Why we do what we do in life and business. Explores the cue, routine, and reward cycle.',
    link: 'https://archive.org/details/the-power-of-habit-charles-duhigg',
    icon: '🔄',
  },
  {
    title: 'Think and Grow Rich',
    author: 'Napoleon Hill',
    category: 'Mindset & Drive',
    desc: 'The timeless classic on developing unstoppable mental desire and goal persistence.',
    link: 'https://archive.org/details/thinkandgrowrich00hill',
    icon: '💰',
  },
  {
    title: 'As a Man Thinketh',
    author: 'James Allen',
    category: 'Thought Architecture',
    desc: 'A philosophical masterpiece on how daily thoughts sculpt character and circumstance.',
    link: 'https://www.gutenberg.org/ebooks/4507',
    icon: '🧠',
  },
  {
    title: 'The Science of Getting Rich',
    author: 'Wallace D. Wattles',
    category: 'Focused Action',
    desc: 'The foundational mental science behind purposeful achievement and high performance.',
    link: 'https://www.gutenberg.org/ebooks/59832',
    icon: '📈',
  },
  {
    title: 'The Power of Concentration',
    author: 'Theron Q. Dumont',
    category: 'Deep Attention',
    desc: 'Practical exercises to train and strengthen your focus muscle against distractions.',
    link: 'https://www.gutenberg.org/ebooks/49214',
    icon: '🎯',
  },
  {
    title: 'Deep Work',
    author: 'Cal Newport',
    category: 'Flow State',
    desc: 'Rules for focused success in a distracted world. Master intense, high-value output.',
    link: 'https://openlibrary.org/works/OL17841393W/Deep_Work',
    icon: '🧪',
  },
];

const MASTERCLASSES = [
  {
    title: 'Atomic Habits Animated Summary',
    speaker: 'James Clear Insights',
    url: 'https://www.youtube.com/watch?v=PZ7lDrwYdZc',
    id: 'PZ7lDrwYdZc',
  },
  {
    title: 'Deep Work Masterclass',
    speaker: 'Cal Newport Principles',
    url: 'https://www.youtube.com/watch?v=3E7hkPZ-HTk',
    id: '3E7hkPZ-HTk',
  },
  {
    title: 'The Science of Habits & Neuroplasticity',
    speaker: 'Behavioral Science',
    url: 'https://www.youtube.com/watch?v=Wcs2PFz5q6g',
    id: 'Wcs2PFz5q6g',
  },
  {
    title: 'Forget Big Change (Tiny Habits)',
    speaker: 'BJ Fogg, PhD',
    url: 'https://www.youtube.com/watch?v=AdKUJxjn-R8',
    id: 'AdKUJxjn-R8',
  },
  {
    title: 'Optimal Daily Routine Design',
    speaker: 'High Performance Coaching',
    url: 'https://www.youtube.com/watch?v=S9DdUhLLdlM',
    id: 'S9DdUhLLdlM',
  },
];

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<LibraryTab>('books');
  const [customUrl, setCustomUrl] = useState('');
  const [activeVideoId, setActiveVideoId] = useState('TURbeWK2wwg');
  const [userId, setUserId] = useState<number>(1);

  // Local device media file state for large player
  const [localMedia, setLocalMedia] = useState<{
    url: string;
    name: string;
    isVideo: boolean;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const syncMedia = () => {
    const active = getActiveUser();
    if (active) {
      setUserId(active.id);
      const url = getActiveMediaUrl(active.id);
      if (url && !url.startsWith('blob:') && !url.startsWith('device:')) {
        setCustomUrl(url);
        const vidId = extractYouTubeId(url);
        if (vidId) setActiveVideoId(vidId);
      }
    }
  };

  useEffect(() => {
    syncMedia();
    window.addEventListener('habitbot_media_updated', syncMedia);
    return () => window.removeEventListener('habitbot_media_updated', syncMedia);
  }, []);

  const handleApplyCustomVideo = (e: React.FormEvent) => {
    e.preventDefault();
    const vidId = extractYouTubeId(customUrl);
    if (!vidId) {
      toast.error('Please enter a valid YouTube video link or 11-digit ID.');
      return;
    }

    setLocalMedia(null);
    setActiveVideoId(vidId);
    saveActiveMedia(userId, customUrl, `Focus Study Stream (${vidId})`);
    toast.success('Custom focus video loaded! Synced with persistent sidebar.');
  };

  const handleDeviceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video');
    const objectUrl = URL.createObjectURL(file);

    setLocalMedia({
      url: objectUrl,
      name: file.name,
      isVideo,
    });
    saveActiveMedia(userId, `device://${file.name}`, `Device Media: ${file.name}`);
    toast.success(`Loaded "${file.name}" from your device! 🎧`, { icon: isVideo ? '🎬' : '🎵' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Hidden File Input for Device Files */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDeviceUpload}
        accept="audio/*,video/*"
        className="hidden"
      />

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Library className="w-5 h-5 text-primary" /> Library & Resources
        </h1>
        <p className="text-xs text-muted-foreground">Free literature, behavioral masterclasses, and focus media player</p>
      </div>

      {/* Sub Tabs Bar */}
      <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-lg border border-border/50 max-w-fit">
        <button
          onClick={() => setActiveTab('books')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'books'
              ? 'bg-background text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Books</span>
        </button>

        <button
          onClick={() => setActiveTab('theater')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'theater'
              ? 'bg-background text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Masterclasses</span>
        </button>

        <button
          onClick={() => setActiveTab('customPlayer')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'customPlayer'
              ? 'bg-background text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Media Player</span>
        </button>
      </div>

      {/* TAB 1: ESSENTIAL BOOKS */}
      {activeTab === 'books' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="text-xs font-medium text-foreground">Recommended Literature (Free Online Reading)</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {BOOKS.map((b, i) => (
              <div
                key={i}
                className="p-3.5 bg-card hover:bg-muted/30 border border-border rounded-xl transition-colors space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{b.icon}</span>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{b.title}</h3>
                        <p className="text-[11px] text-muted-foreground">{b.author}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-md font-semibold">
                      {b.category}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{b.desc}</p>
                </div>

                <div className="pt-2 border-t border-border flex justify-end">
                  <a
                    href={b.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:bg-primary/10 px-3 py-1 rounded-md transition-colors cursor-pointer"
                  >
                    <span>Read Free Online</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* TAB 2: MASTERY THEATER */}
      {activeTab === 'theater' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="text-xs font-medium text-foreground">Behavioral Lectures & Summaries</div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {MASTERCLASSES.map((v, i) => (
              <div
                key={i}
                className="p-2.5 bg-card border border-border rounded-xl space-y-2 group transition-colors"
              >
                <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${v.id}?rel=0&modestbranding=1&playsinline=1`}
                    title={v.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                <div>
                  <h4 className="text-xs font-medium text-foreground truncate">{v.title}</h4>
                  <p className="text-[10px] text-muted-foreground">{v.speaker}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* TAB 3: CUSTOM MEDIA PLAYER */}
      {activeTab === 'customPlayer' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="p-4 bg-card rounded-xl border border-border space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Video className="w-4 h-4 text-primary" />
                  <span>Focus Media Player</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Paste a YouTube URL or load audio/video files directly from your computer.
                </p>
              </div>

              {/* Upload Local File Button */}
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 h-8 rounded-md flex items-center gap-1.5 shrink-0 font-medium shadow-none cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Load Device File</span>
              </Button>
            </div>

            <form onSubmit={handleApplyCustomVideo} className="flex gap-2">
              <Input
                type="text"
                placeholder="https://www.youtube.com/watch?v=... or video ID"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="flex-1 bg-background border-border text-foreground text-xs rounded-md h-8 px-3"
              />
              <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-4 h-8 rounded-md font-medium cursor-pointer">
                Load & Play
              </Button>
            </form>

            {/* Video / Audio Player Display */}
            <div className="space-y-2 pt-1">
              <div className="relative aspect-video max-w-2xl mx-auto rounded-xl overflow-hidden border border-border bg-black shadow-xs flex items-center justify-center">
                {localMedia ? (
                  localMedia.isVideo ? (
                    <video
                      src={localMedia.url}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="space-y-3 text-center p-6 bg-card w-full h-full flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-center">
                        <FileAudio className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-foreground">{localMedia.name}</h4>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">Playing Local Audio</p>
                      </div>
                      <audio src={localMedia.url} controls autoPlay className="w-full max-w-md" />
                    </div>
                  )
                ) : (
                  activeVideoId && (
                    <iframe
                      src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                      title="Focus Stream"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )
                )}
              </div>

              <div className="text-center text-xs text-muted-foreground">
                Synced with sidebar media widget.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
