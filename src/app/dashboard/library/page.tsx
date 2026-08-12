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
        <h1 className="text-lg font-bold text-[#202124] dark:text-[#e8eaed] flex items-center gap-2">
          <Library className="w-5 h-5 text-[#1a73e8]" /> Behavioral Mastery Library
        </h1>
        <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">Curated free literature, habit masterclasses, and distraction-free custom media player</p>
      </div>

      {/* Sub Tabs Bar */}
      <div className="flex items-center gap-1 p-1 bg-[#f1f3f4] dark:bg-[#2d2e30] rounded-full max-w-fit">
        <button
          onClick={() => setActiveTab('books')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'books'
              ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#394457] dark:text-[#8ab4f8] font-semibold'
              : 'text-[#5f6368] hover:text-[#202124] dark:text-[#9aa0a6] dark:hover:text-[#e8eaed]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>📖 Essential Books</span>
        </button>

        <button
          onClick={() => setActiveTab('theater')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'theater'
              ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#394457] dark:text-[#8ab4f8] font-semibold'
              : 'text-[#5f6368] hover:text-[#202124] dark:text-[#9aa0a6] dark:hover:text-[#e8eaed]'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>🎥 Mastery Theater</span>
        </button>

        <button
          onClick={() => setActiveTab('customPlayer')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'customPlayer'
              ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#394457] dark:text-[#8ab4f8] font-semibold'
              : 'text-[#5f6368] hover:text-[#202124] dark:text-[#9aa0a6] dark:hover:text-[#e8eaed]'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>🎬 Custom Player</span>
        </button>
      </div>

      {/* TAB 1: ESSENTIAL BOOKS */}
      {activeTab === 'books' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="text-xs font-medium text-[#202124] dark:text-[#e8eaed]">📖 The Habit Blueprint (100% Free Online Reading)</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {BOOKS.map((b, i) => (
              <div
                key={i}
                className="p-4 bg-white hover:bg-[#f8f9fa] dark:bg-[#1e1e1e] dark:hover:bg-[#252629] border border-[#dadce0] dark:border-[#3c4043] rounded-2xl transition-colors space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{b.icon}</span>
                      <div>
                        <h3 className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">{b.title}</h3>
                        <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">by {b.author}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#394457] dark:text-[#8ab4f8] px-2 py-0.5 rounded-full font-semibold">
                      {b.category}
                    </span>
                  </div>

                  <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-2 leading-relaxed">{b.desc}</p>
                </div>

                <div className="pt-2 border-t border-[#dadce0] dark:border-[#3c4043] flex justify-end">
                  <a
                    href={b.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1a73e8] hover:bg-[#e8f0fe] dark:text-[#8ab4f8] dark:hover:bg-[#394457] px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
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
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="text-xs font-medium text-[#202124] dark:text-[#e8eaed]">🎥 High-Impact Behavioral Lectures & Animations</div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {MASTERCLASSES.map((v, i) => (
              <div
                key={i}
                className="p-3 bg-white dark:bg-[#1e1e1e] border border-[#dadce0] dark:border-[#3c4043] rounded-2xl space-y-2 group transition-colors"
              >
                <div className="relative aspect-video rounded-xl overflow-hidden border border-[#dadce0] dark:border-[#3c4043] bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${v.id}?rel=0&modestbranding=1&playsinline=1`}
                    title={v.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                <div>
                  <h4 className="text-xs font-medium text-[#202124] dark:text-[#e8eaed] truncate">{v.title}</h4>
                  <p className="text-[10px] text-[#5f6368] dark:text-[#9aa0a6]">{v.speaker}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* TAB 3: CUSTOM MEDIA PLAYER WITH LOCAL DEVICE UPLOAD */}
      {activeTab === 'customPlayer' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="p-5 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-[#202124] dark:text-[#e8eaed] flex items-center gap-2">
                  <Video className="w-4 h-4 text-[#1a73e8]" />
                  <span>Distraction-Free Focus Media Player</span>
                </div>
                <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-1">
                  Paste any YouTube study stream OR upload music and video files directly from your computer/phone!
                </p>
              </div>

              {/* Upload Local File Button */}
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#1e8e3e] hover:bg-[#137333] text-white text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shrink-0 font-medium shadow-none cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Device Audio / Video</span>
              </Button>
            </div>

            <form onSubmit={handleApplyCustomVideo} className="flex gap-2">
              <Input
                type="text"
                placeholder="https://www.youtube.com/watch?v=... OR 11-digit video ID"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="flex-1 bg-[#f8f9fa] dark:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] text-xs rounded-full px-4"
              />
              <Button type="submit" size="sm" className="bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs px-5 rounded-full font-medium shadow-none cursor-pointer">
                Load & Play
              </Button>
            </form>

            {/* Video / Audio Player Display */}
            <div className="space-y-2 pt-2">
              <div className="relative aspect-video max-w-2xl mx-auto rounded-2xl overflow-hidden border border-[#dadce0] dark:border-[#3c4043] bg-black shadow-md flex items-center justify-center">
                {localMedia ? (
                  localMedia.isVideo ? (
                    <video
                      src={localMedia.url}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="space-y-4 text-center p-6 bg-gradient-to-b from-[#f8f9fa] to-[#e8eaed] dark:from-[#1e1e1e] dark:to-[#121212] w-full h-full flex flex-col items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-[#e6f4ea] text-[#1e8e3e] flex items-center justify-center shadow-none">
                        <FileAudio className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">{localMedia.name}</h4>
                        <p className="text-xs text-[#1e8e3e] font-mono mt-0.5">Playing Local Audio File from Device</p>
                      </div>
                      <audio src={localMedia.url} controls autoPlay className="w-full max-w-md" />
                    </div>
                  )
                ) : (
                  activeVideoId && (
                    <iframe
                      src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                      title="Custom Focus Stream"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )
                )}
              </div>

              <div className="text-center text-xs text-[#1e8e3e] font-medium">
                ✅ Active in Global Workspace — Keep your focus soundtrack running while you work!
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
